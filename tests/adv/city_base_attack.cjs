// Ataque a la base que reutilizará Ciudad Núcleo (spec 2026-11-11): batalla (R.battle, battleOver, vBattleHud, finish),
// bancos de M02 (quizPool, battleItems, rondas scenario/error) y migrate() con un campo `city` arbitrario.
// Uso: node tests/adv/city_base_attack.cjs [FUZZ_N=320] [SEED=20261111]   (sale con 1 si algo falla)
const { isMainThread, parentPort } = require('worker_threads');
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const path = require('path');
const L = require('./lib.cjs');
const html = fs.readFileSync(path.join(__dirname, '..', '..', 'juego_estudio.html'), 'utf8');
const KEY = 'estudio_isw_v1';

// ---------- arranque con canvas falso, rAF manual y reloj movible ----------
function boot(raw, opts = {}) {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => errors.push('jsdomError: ' + (e.detail && e.detail.stack ? String(e.detail.stack).split('\n').slice(0, 2).join(' ') : (e.detail || e.message))));
  vc.on('error', (...a) => errors.push('console.error: ' + a.map(String).join(' ')));
  const clock = opts.clock || null;
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.test/', virtualConsole: vc,
    beforeParse(w) {
      if (raw != null) w.localStorage.setItem(KEY, raw);
      w.scrollTo = () => {};
      w.__CITY_TEST__ = true;
      if (opts.cityWorld) {
        w.__CITY_WORLD__ = { create(canvas, D, o) { w.__fakeOpts = o; return Promise.resolve({ resize() {}, setPaused() {}, dissolve() {}, encounter() { return Promise.resolve(); }, dispose() {} }); } };
      }
      const fake = (el) => new Proxy({ canvas: el }, { get(t, k) { if (k in t) return t[k]; if (k === 'measureText') return () => ({ width: 0 }); return () => {}; }, set(t, k, v) { t[k] = v; return true; } });
      w.HTMLCanvasElement.prototype.getContext = function () { return fake(this); };
      const q = [];
      w.requestAnimationFrame = (cb) => { q.push(cb); return q.length; };
      w.cancelAnimationFrame = () => { q.length = 0; };
      w.__raf = (ms) => { q.splice(0).forEach((cb) => cb(ms)); };
      if (clock) {
        const RD = w.Date;
        class FD extends RD {
          constructor(...a) { if (a.length === 0) super(RD.now() + clock.ms); else super(...a); }
          static now() { return RD.now() + clock.ms; }
        }
        w.Date = FD;
      }
    },
  });
  return { dom, w: dom.window, d: dom.window.document, errors };
}
const fresh = (o = {}) => JSON.stringify(Object.assign({ v: 1, xp: 0, days: { last: null, count: 0 }, session: 1, lastActive: 0, topics: {}, qs: {}, boss: {},
  hero: { name: 'Zed', look: { skin: 1, suit: 1, head: 1, eyes: 1, emblem: 1, cape: 0, hand: 0 }, welcomed: true },
  stats: { learnTopics: [], cleared: 0, roundsNoPower: 0, bossFailed: {} } }, o));
const st = (w) => JSON.parse(w.localStorage.getItem(KEY));
const click = L.click;
const dstr = (dt) => dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
const todayW = (w) => dstr(new w.Date());
const sumA = (s) => Object.values(s.qs).reduce((n, r) => n + r.a, 0);
const histN = (s, mid, tops) => tops.reduce((n, t) => n + (s.topics[mid + ':' + t] || []).length, 0);
const hud = (d) => { const h = d.querySelector('.hearts'), b = d.querySelector('.hpbar'); if (!h || !b) return null;
  const en = +(/Energía (-?\d+) de \d+/.exec(h.getAttribute('aria-label')) || [])[1], hp = +(/villano (-?\d+) de 4/.exec(b.getAttribute('aria-label')) || [])[1]; return { en, hp }; };
const VIL = { bit: { topics: ['T01', 'T02', 'T03'] }, silicio: { topics: ['T04', 'T05', 'T10'] },
  kernel: { topics: ['T06', 'T07', 'T08', 'T09'] }, eco: { topics: ['T12', 'T13', 'T14', 'T15', 'T16'] } };
/* Entra a la batalla por el gancho del motor (la ciudad 3D se prueba en tests/city_engine.cjs): síncrono, sin mundo */
function enterBattle(w, d, vid) {
  const R = w.__CITY_ROUND__;
  R.startRound({ kind: 'battle', title: 'Batalla', mid: 'M02', back: { name: 'city' }, villain: { id: vid, name: vid }, city: { kind: 'battle', id: vid } }, R.battleItems({ mod: 'M02', topics: VIL[vid].topics, n: 8 }));
  return !!d.querySelector('.hearts');
}
function ans(w, d, right) {
  const q = L.findQ(w, d); if (!q) throw new Error('pregunta no encontrada');
  const ct = L.norm(L.correctText(q));
  const t = right ? L.optBtn(d, L.correctText(q)) : [...d.querySelectorAll('.opt')].find((b) => !b.disabled && L.norm(b.querySelector('span:last-child').textContent) !== ct);
  if (!t) throw new Error('sin opción objetivo');
  click(w, t); return q;
}
const nextB = (w, d) => { const n = d.querySelector('#nextbtn'); if (n) click(w, n); return !!n; };
const isResults = (d) => !!d.querySelector('#xpc') && !d.querySelector('.prompt');
const won = (d) => { const g = d.querySelector('.gtitle'); return !!g && /¡Victoria!/.test(g.textContent); };

// ---------- conducción aleatoria de una batalla (doble clic, teclas rápidas, botones viejos, poderes) ----------
function chaosBattle(env, r, vid, maxActs = 400) {
  const { w, d } = env; const viol = []; let acts = 0, last = hud(d), stale = null;
  while (!isResults(d) && acts++ < maxActs) {
    const a = r.int(0, 9), opts = [...d.querySelectorAll('.opt')];
    if (a === 0 && opts.length) { stale = r.pick(opts); click(w, stale); }
    else if (a === 1 && stale) click(w, stale);
    else if (a === 2) L.key(w, String(r.int(1, 5)));
    else if (a === 3) { if (d.activeElement && d.activeElement.blur) d.activeElement.blur(); L.key(w, 'Enter'); }
    else if (a === 4) { const n = d.querySelector('#nextbtn'); if (n) { click(w, n); click(w, n); } }
    else if (a === 5) { const p = r.pick([...d.querySelectorAll('[data-act="power"]')].concat([null])); if (p) { click(w, p); click(w, p); } }
    else if (a === 6) { const y = d.querySelector(r.bool() ? '[data-act="regenyes"]' : '[data-act="regenno"]'); if (y) click(w, y); }
    else if (a === 7 && opts.length) { const o = r.pick(opts); click(w, o); click(w, o); L.key(w, '1'); }
    else if (a === 8) { const q = L.findQ(w, d); if (q && !d.querySelector('.fb')) { const t = L.optBtn(d, L.correctText(q)); if (t && !t.disabled) click(w, t); } }
    else { const n = d.querySelector('#nextbtn'); if (n) click(w, n); }
    const h = hud(d); if (h) { last = h;
      if (!(h.en >= 0 && h.en <= 3)) viol.push('energía fuera de rango: ' + h.en);
      if (!(h.hp >= 0 && h.hp <= 4)) viol.push('vida fuera de rango: ' + h.hp); }
  }
  if (!isResults(d)) viol.push('la batalla NO terminó tras ' + maxActs + ' acciones');
  return { viol, last, acts };
}
function checkBattleEnd(env, s0, vid, last) {
  const { w, d } = env, s = st(w), bad = [];
  const big = d.querySelector('.big'), m = big && /^(\d+)\/(\d+)$/.exec(big.textContent);
  if (!m) return ['sin marcador en resultados'];
  const n = +m[2], okN = +m[1];
  if (sumA(s) - sumA(s0) !== n) bad.push('S.qs.a creció ' + (sumA(s) - sumA(s0)) + ' pero la ronda tuvo ' + n);
  if (histN(s, 'M02', VIL[vid].topics) - histN(s0, 'M02', VIL[vid].topics) !== n) bad.push('historial creció ' + (histN(s, 'M02', VIL[vid].topics) - histN(s0, 'M02', VIL[vid].topics)) + ' vs ' + n);
  const otherKeys = Object.keys(s.topics).filter((k) => !VIL[vid].topics.map((t) => 'M02:' + t).includes(k) && JSON.stringify(s.topics[k]) !== JSON.stringify(s0.topics[k]));
  if (otherKeys.length) bad.push('se tocaron temas ajenos al villano: ' + otherKeys);
  if (s.xp - s0.xp !== Number(d.querySelector('#xpc').dataset.xp)) bad.push('XP guardado ' + (s.xp - s0.xp) + ' != mostrado ' + d.querySelector('#xpc').dataset.xp);
  const W = won(d), B = (s.city && s.city.beaten || {})[vid];
  if (W && B !== todayW(w)) bad.push('Victoria pero beaten=' + B);
  if (!W && B === todayW(w) && (s0.city && s0.city.beaten || {})[vid] !== B) bad.push('Derrota pero se marcó vencido');
  if (W && last && last.hp !== 0) bad.push('Victoria con vida del villano ' + last.hp + ' (solo se gana con vida 0)');
  if (!W && last && last.hp === 0) bad.push('Derrota con vida del villano 0');
  if (!W && last && last.en !== 0) bad.push('Derrota con energía ' + last.en + ' (solo se pierde con energía 0)');
  if (okN > n || n < 1) bad.push('marcador imposible ' + big.textContent);
  return bad;
}

// ---------- extracción de funciones puras reales del HTML (sin tocar producción) ----------
function fnSrc(name) {
  const i = html.indexOf('function ' + name + '('); if (i < 0) throw new Error('no existe ' + name);
  let j = html.indexOf('{', i), depth = 0, k = j;
  for (; k < html.length; k++) { if (html[k] === '{') depth++; else if (html[k] === '}' && --depth === 0) break; }
  return html.slice(i, k + 1);
}
function pureLib(MODULES, rand) {
  const src = ['shuffle', 'sample', 'mod', 'ofType', 'quizPool', 'itemsFor', 'bossPool', 'battleItems'].map(fnSrc).join('\n');
  const M = Object.create(Math); M.random = rand;
  return new Function('MODULES', 'Math', src + '\nreturn { shuffle, sample, mod, ofType, quizPool, itemsFor, battleItems };')(MODULES, M);
}
const CREATURES = { bit: ['T01', 'T02', 'T03'], silicio: ['T04', 'T05', 'T10'], kernel: ['T06', 'T07', 'T08', 'T09'],
  eco: ['T12', 'T13', 'T14', 'T15', 'T16'], huerfano: ['T11', 'T17', 'T18', 'T19', 'T20'], alucina: ['T21', 'T22', 'T23'] };
function qValid(q) {
  if (!q || typeof q.prompt !== 'string' || !q.prompt.trim()) return 'prompt vacío';
  if (q.type === 'tf') return typeof q.answer === 'boolean' ? null : 'tf sin answer booleano';
  if (!Array.isArray(q.options) || q.options.length < 2) return 'menos de 2 opciones';
  if (!Number.isInteger(q.answer) || q.answer < 0 || q.answer >= q.options.length) return 'answer fuera de rango ' + q.answer;
  const ns = q.options.map((o) => L.norm(String(o)));
  if (new Set(ns).size !== ns.length) return 'opciones duplicadas';
  return null;
}

// ---------- fuzzing de migrate() con `city` arbitrario ----------
function hostileValue(r, depth = 0) {
  const leaf = [null, true, false, 0, -0, -1, 1.5, 1e308, -1e308, 'NaN', 'Infinity', '', '2026-13-45', '9999-99-99', '<img src=x onerror=alert(1)>', '../../etc', '${7*7}', '{{7*7}}',
    '‮evil​', '\u0000', 'é', '👩‍👩‍👧‍👦', "' OR 1=1 --", [], {}, [1, [2, [3]]]];
  const k = r.int(0, depth > 4 ? 0 : 6);
  if (k <= 2) return r.pick(leaf);
  if (k === 3) return Array.from({ length: r.int(0, 6) }, () => hostileValue(r, depth + 1));
  if (k === 4) { let o = {}; const cur = o; for (let i = 0; i < r.int(1, 40); i++) { o.x = {}; o = o.x; } return cur; }
  const keys = ['prologue', 'at', 'run', 'beaten', 'repairs', 'taught', 'restored', 'powers', '__proto__', 'constructor', 'prototype', 'x', 'z', 'yaw', 'M02', 'planos', 'bit', 'toString', 'hasOwnProperty'];
  const o = {}; for (let i = 0; i < r.int(0, 8); i++) o[r.pick(keys)] = hostileValue(r, depth + 1); return o;
}
function cityCase(seed) {
  const r = L.rng(seed);
  const base = JSON.parse(fresh({ xp: r.pick([0, 300, 1000, 2500, 5000]) }));
  let city, rawCity = null;
  const mode = r.int(0, 9);
  if (mode === 0) city = { prologue: true, at: { x: 1, z: 2, yaw: 0.5 }, run: true, beaten: { bit: '2026-11-11' }, repairs: { r1: true }, taught: { a1: true }, restored: { M02: true }, powers: { planos: true } };
  else if (mode === 1) city = { at: { x: r.pick([1e308, -1e308, 'NaN', null, [], {}]), z: r.pick(['x', true, -0]), yaw: r.pick([1e9, -1e9]) }, beaten: hostileValue(r), repairs: hostileValue(r), taught: hostileValue(r) };
  else if (mode === 2) rawCity = '{"__proto__":{"polluted":true,"beaten":{"bit":"' + todayStr() + '"}},"constructor":{"prototype":{"polluted":1}}}';
  else if (mode === 3) city = 'x'.repeat(r.int(0, 200000));
  else if (mode === 4) { let a = []; const top = a; for (let i = 0; i < 2000; i++) { const n = []; a.push(n); a = n; } city = top; }
  else city = hostileValue(r);
  if (r.bool(0.3)) base.world = r.bool() ? hostileValue(r) : { at: 'M01', pos: {}, talked: {}, run: r.pick([1, 'yes', true]) };
  let raw = JSON.stringify(Object.assign(base, rawCity ? { city: '__RAW__' } : { city }));
  if (rawCity) raw = raw.replace('"__RAW__"', rawCity);
  return { seed, raw, mode, playRight: r.int(0, 255) };
}
function todayStr() { return dstr(new Date()); }

function runFuzzCase(c) {
  const out = { problems: [], ms: 0 };
  const t0 = Date.now(); let env;
  try {
    env = boot(c.raw); const { w, d } = env;
    if (w.eval('({}).polluted') !== undefined || w.eval('Object.prototype.beaten') !== undefined) out.problems.push('prototype pollution en Object.prototype');
    // una ronda quiz de M02 completa
    click(w, L.modBtn(d, 'M02'));
    const tb = [...d.querySelectorAll('[data-act="topic"]')]; if (!tb.length) throw new Error('M02 sin temas');
    click(w, tb[c.seed % tb.length]);
    click(w, L.btn(d, 'start', (b) => b.dataset.kind === 'quiz'));
    let n = 0; const s0 = st(w);
    while (d.querySelector('.prompt') && n < 20) { ans(w, d, (c.playRight >> (n % 8)) & 1); const rn = L.btn(d, 'regenno'); if (rn) click(w, rn); nextB(w, d); n++; }
    if (!isResults(d)) out.problems.push('la ronda no llegó a resultados (n=' + n + ')');
    const s = st(w);
    if (sumA(s) - sumA(s0) !== n) out.problems.push('qs.a creció ' + (sumA(s) - sumA(s0)) + ' con ' + n + ' respuestas');
    { const C = s.city, po = (x) => !!x && typeof x === 'object' && !Array.isArray(x) && Object.getPrototypeOf(x) === Object.prototype;
      const valid = po(C) && typeof C.prologue === 'boolean' && typeof C.run === 'boolean' && ['beaten', 'repairs', 'taught', 'restored', 'powers'].every((k) => po(C[k])) &&
        po(C.at) && Number.isFinite(C.at.x) && Number.isFinite(C.at.z) && Number.isFinite(C.at.yaw) && !Object.prototype.hasOwnProperty.call(C, 'polluted');
      if (!valid) out.problems.push('S.city no quedó normalizado tras la ronda: ' + JSON.stringify(C).slice(0, 80)); }
    // y una batalla del mundo actual con 1 respuesta (la lógica que se reutiliza)
    click(w, L.btn(d, 'home'));
    if (enterBattle(w, d, 'bit')) { ans(w, d, true); const h = hud(d); if (!h || h.hp !== 3) out.problems.push('batalla tras migrate: HUD ' + JSON.stringify(h)); click(w, L.btn(d, 'quit')); }
    else if ((st(w).city.beaten || {}).bit !== todayW(w)) out.problems.push('no se pudo iniciar batalla con bit no vencido hoy');
    out.problems.push(...env.errors.slice(0, 3));
  } catch (e) { out.problems.push('excepción: ' + String(e && e.message || e).slice(0, 200)); }
  if (env) try { env.w.close(); } catch (e) {}
  out.ms = Date.now() - t0;
  return out;
}

if (!isMainThread) {
  parentPort.on('message', ({ i, c }) => parentPort.postMessage({ i, res: runFuzzCase(c) }));
} else if (require.main !== module) {
  module.exports = { boot, fresh, st, enterBattle, ans, nextB, hud, isResults, won, cityCase, runFuzzCase, pureLib, todayW };
} else (async () => {
  const FUZZ_N = parseInt(process.argv[2] || '320', 10), SEED = parseInt(process.argv[3] || '20261111', 10);
  const results = []; const ok = (name, cond, extra) => results.push([cond ? 'PASS' : 'FAIL', name, extra || '']);
  const counts = { adv: 0, props: [], fuzz: 0 };
  const T = (name, fn) => { counts.adv++; try { fn(); } catch (e) { ok(name + ' (excepción)', false, e.stack.split('\n').slice(0, 2).join(' ')); } };
  const t0 = Date.now();
  let e, s, s0;
  const D0 = (await import('../../city/districts.mjs')).city;

  // ===================== 1. BATALLA =====================
  // ATAQUE: doble clic en la misma opción y luego en otra: una sola respuesta, energía baja como mucho 1
  T('B1', () => { e = boot(fresh()); enterBattle(e.w, e.d, 'bit'); s0 = st(e.w);
    const q = L.findQ(e.w, e.d), ct = L.norm(L.correctText(q)); const wrong = [...e.d.querySelectorAll('.opt')].find((b) => L.norm(b.querySelector('span:last-child').textContent) !== ct);
    click(e.w, wrong); click(e.w, wrong); const rb = L.optBtn(e.d, L.correctText(q)); if (rb) click(e.w, rb); L.key(e.w, '1'); L.key(e.w, '2');
    s = st(e.w); const h = hud(e.d);
    ok('B1 doble clic + otra opción + teclas: 1 respuesta, energía 2', sumA(s) - sumA(s0) === 1 && h.en === 2 && h.hp === 4, JSON.stringify(h) + ' a=' + (sumA(s) - sumA(s0)));
    ok('B1 sin errores', !e.errors.length, e.errors.join('|')); e.w.close(); });

  // ATAQUE: Enter x5 y doble clic en Siguiente tras el golpe final (finish repetido, roundsNoPower doble)
  T('B2', () => { e = boot(fresh()); enterBattle(e.w, e.d, 'bit'); s0 = st(e.w);
    for (let i = 0; i < 4; i++) { ans(e.w, e.d, true); if (i < 3) nextB(e.w, e.d); }
    const nb = e.d.querySelector('#nextbtn'); for (let i = 0; i < 5; i++) { L.key(e.w, 'Enter'); } click(e.w, nb); click(e.w, nb);
    s = st(e.w);
    ok('B2 golpe final + Enter x5: resultados una vez', isResults(e.d) && won(e.d) && s.stats.roundsNoPower - s0.stats.roundsNoPower === 1 && e.d.querySelector('.big').textContent === '4/4', 'rnp=' + s.stats.roundsNoPower + ' big=' + (e.d.querySelector('.big') || {}).textContent);
    ok('B2 vencido hoy', s.city.beaten.bit === todayW(e.w), JSON.stringify(s.city.beaten));
    e.w.close(); });

  // ATAQUE: perder en el último golpe (energía 1, villano con 1 de vida) => derrota, sin marcar vencido
  T('B3', () => { e = boot(fresh()); enterBattle(e.w, e.d, 'silicio'); s0 = st(e.w);
    ['right', 'wrong', 'right', 'wrong', 'right'].forEach((m) => { ans(e.w, e.d, m === 'right'); nextB(e.w, e.d); });
    const h = hud(e.d); ans(e.w, e.d, false); const h2 = hud(e.d); nextB(e.w, e.d); s = st(e.w);
    ok('B3 pre: vida 1, energía 1 antes del último golpe', h && h.hp === 1 && h.en === 1, JSON.stringify(h));
    ok('B3 último golpe fallado: derrota, energía 0, no vencido', isResults(e.d) && !won(e.d) && h2.en === 0 && !s.city.beaten.silicio, JSON.stringify(h2) + ' ' + JSON.stringify(s.city.beaten));
    ok('B3 progreso = 6 rondas', sumA(s) - sumA(s0) === 6 && histN(s, 'M02', VIL.silicio.topics) === 6, 'a=' + (sumA(s) - sumA(s0)));
    e.w.close(); });

  // ATAQUE: ganar en el último golpe (energía 1, vida 1 -> acierto)
  T('B4', () => { e = boot(fresh()); enterBattle(e.w, e.d, 'silicio');
    ['right', 'wrong', 'right', 'wrong', 'right'].forEach((m) => { ans(e.w, e.d, m === 'right'); nextB(e.w, e.d); });
    ans(e.w, e.d, true); nextB(e.w, e.d); s = st(e.w);
    ok('B4 último golpe acertado: victoria y vencido hoy', won(e.d) && s.city.beaten.silicio === todayW(e.w) && e.d.querySelector('.big').textContent === '4/6', (e.d.querySelector('.big') || {}).textContent);
    e.w.close(); });

  // ATAQUE: salir a mitad (2 aciertos), seguir pulsando teclas: nada se registra, no se marca vencido, se puede volver a pelear
  T('B5', () => { e = boot(fresh()); enterBattle(e.w, e.d, 'bit'); s0 = st(e.w);
    ans(e.w, e.d, true); nextB(e.w, e.d); ans(e.w, e.d, true);
    click(e.w, L.btn(e.d, 'quit')); ['1', '2', '3', '4', '1'].forEach((k) => L.key(e.w, k)); s = st(e.w);
    ok('B5 salir a mitad: 2 respuestas, no vencido, roundsNoPower intacto', sumA(s) - sumA(s0) === 2 && !s.city.beaten.bit && s.stats.roundsNoPower === s0.stats.roundsNoPower, 'a=' + (sumA(s) - sumA(s0)) + ' ' + JSON.stringify(s.city.beaten));
    ok('B5 tras salir ya no hay ronda y la vista es la ciudad', !e.d.querySelector('.prompt') && !e.d.querySelector('.arena'));
    ok('B5 nueva batalla empieza limpia (4/3)', enterBattle(e.w, e.d, 'bit') && (() => { const h = hud(e.d); return h && h.hp === 4 && h.en === 3; })(), JSON.stringify(hud(e.d)));
    ok('B5 sin errores', !e.errors.length, e.errors.join('|')); e.w.close(); });
  const enterBattle2 = enterBattle;

  // ATAQUE: recargar a mitad de batalla (3 aciertos = villano a 1): el progreso persiste, la batalla no, no hay vencido
  T('B6', () => { e = boot(fresh()); enterBattle(e.w, e.d, 'bit');
    for (let i = 0; i < 3; i++) { ans(e.w, e.d, true); nextB(e.w, e.d); }
    const raw = e.w.localStorage.getItem(KEY); e.w.close();
    const e2 = boot(raw); s = st(e2.w);
    ok('B6 recarga: 3 respuestas guardadas, sin vencido', sumA(s) === 3 && histN(s, 'M02', VIL.bit.topics) === 3 && !s.city.beaten.bit, JSON.stringify(s.city));
    const in2 = enterBattle(e2.w, e2.d, 'bit'); const h = hud(e2.d);
    ok('B6 tras recargar la batalla empieza de nuevo 4/3', in2 && h.hp === 4 && h.en === 3, JSON.stringify(h));
    ok('B6 sin errores', !e2.errors.length, e2.errors.join('|')); e2.w.close(); });

  // ATAQUE: escudo activo + fallo en el último golpe: ¿se gana una batalla con el villano vivo y una respuesta fallada al final?
  T('B7', () => { e = boot(fresh({ xp: 1000 })); enterBattle(e.w, e.d, 'kernel');
    const seq = [];
    // R R R W(escudo) W W? -> controlamos: 3 aciertos, 1 fallo con escudo, 1 fallo, último fallo
    ans(e.w, e.d, true); nextB(e.w, e.d); ans(e.w, e.d, true); nextB(e.w, e.d); ans(e.w, e.d, true); nextB(e.w, e.d);
    click(e.w, e.d.querySelector('[data-pw="shield"]')); click(e.w, e.d.querySelector('[data-pw="shield"]'));
    ans(e.w, e.d, false); seq.push(hud(e.d)); nextB(e.w, e.d);
    ans(e.w, e.d, false); seq.push(hud(e.d)); nextB(e.w, e.d);
    ans(e.w, e.d, false); seq.push(hud(e.d)); nextB(e.w, e.d);
    s = st(e.w);
    ok('B7 escudo: protege energía una vez', seq[0].en === 3 && seq[1].en === 2 && seq[2].en === 1, JSON.stringify(seq));
    ok('B7 con vida 1 la batalla sigue (el pool aporta preguntas, sin victoria por puntos)', !isResults(e.d) && seq[2].hp === 1);
    { let g = 0; while (!isResults(e.d) && g++ < 8) { ans(e.w, e.d, false); nextB(e.w, e.d); } s = st(e.w); }
    ok('B7 batalla terminó', isResults(e.d));
    ok('B7 (regla) victoria solo si la vida del villano llega a 0: acabar 3/6 fallando el último golpe NO debe marcar vencido', !won(e.d) && !s.city.beaten.kernel,
      'resultado=' + (e.d.querySelector('.gtitle') || {}).textContent + ' HUD final=' + JSON.stringify(seq[2]) + ' beaten=' + JSON.stringify(s.city.beaten) + ' big=' + (e.d.querySelector('.big') || {}).textContent);
    e.w.close(); });

  // ATAQUE: regeneración pendiente + teclas/poderes/Enter/salir; energía nunca pasa de 3 ni baja de 0
  T('B8', () => { e = boot(fresh({ xp: 2500 })); enterBattle(e.w, e.d, 'eco'); s0 = st(e.w);
    let pendSeen = false, guard = 0;
    while (!pendSeen && e.d.querySelector('.prompt') && guard++ < 6) {
      const q = L.findQ(e.w, e.d);
      if (q.type === 'tf') { ans(e.w, e.d, true); nextB(e.w, e.d); continue; }
      ans(e.w, e.d, false); pendSeen = !!L.btn(e.d, 'regenyes');
    }
    if (!pendSeen) { ok('B8 pre: no se alcanzó Regeneración (azar)', true); e.w.close(); return; }
    const a0 = sumA(st(e.w));
    ['1', '2', '3', '4', 'Enter', 'Enter'].forEach((k) => L.key(e.w, k)); [...e.d.querySelectorAll('[data-act="power"]')].forEach((b) => click(e.w, b));
    ok('B8 con Regeneración pendiente nada se registra', sumA(st(e.w)) === a0 && !!L.btn(e.d, 'regenyes'), 'a=' + sumA(st(e.w)) + ' vs ' + a0);
    click(e.w, L.btn(e.d, 'regenyes')); click(e.w, L.btn(e.d, 'regenyes') || e.d.body);
    const struck = [...e.d.querySelectorAll('.opt[disabled]')]; struck.forEach((b) => click(e.w, b));
    ok('B8 clic en la opción tachada no registra', sumA(st(e.w)) === a0);
    ans(e.w, e.d, true); const h = hud(e.d);
    ok('B8 acierto tras regen: energía ≤ 3, 1 respuesta más', h.en <= 3 && h.en >= 0 && sumA(st(e.w)) === a0 + 1, JSON.stringify(h));
    nextB(e.w, e.d); click(e.w, L.btn(e.d, 'quit'));
    ok('B8 salir tras regen: no vencido', !st(e.w).city.beaten.eco);
    ok('B8 sin errores', !e.errors.length, e.errors.join('|')); e.w.close(); });

  // ATAQUE: salir con Regeneración pendiente y volver a pelear: el estado pendiente no se arrastra
  T('B9', () => { e = boot(fresh({ xp: 2500 })); enterBattle(e.w, e.d, 'eco');
    let pend = false, g = 0; while (!pend && e.d.querySelector('.prompt') && g++ < 6) { const q = L.findQ(e.w, e.d); if (q.type === 'tf') { ans(e.w, e.d, true); nextB(e.w, e.d); continue; } ans(e.w, e.d, false); pend = !!L.btn(e.d, 'regenyes'); }
    click(e.w, L.btn(e.d, 'quit')); const okIn = enterBattle2(e.w, e.d, 'eco');
    const a0 = sumA(st(e.w)); L.key(e.w, '1');
    ok('B9 tras salir con regen pendiente, la nueva batalla acepta respuestas', okIn && (sumA(st(e.w)) === a0 + 1 || !!L.btn(e.d, 'regenyes')), 'a=' + sumA(st(e.w)) + ' vs ' + a0);
    ok('B9 sin errores', !e.errors.length, e.errors.join('|')); e.w.close(); });

  // ATAQUE: vencido hoy => sin batalla; el reloj salta al día siguiente => batalla disponible; vencido con fecha futura (reloj atrasado)
  counts.adv++;
  try {
    const clock = { ms: 0 }, tk = async () => { for (let i = 0; i < 6; i++) await new Promise((r) => setTimeout(r, 0)); };
    e = boot(fresh({ city: { beaten: { bit: todayStr() } } }), { clock, cityWorld: true });
    click(e.w, e.d.querySelector('[data-act="city"]')); await tk();
    const A = D0.districts.M02.creatures.find((c) => c.id === 'bit').area, tick = () => e.w.__fakeOpts.tick(16);
    e.w.__CITY_TEST_API__.teleport(A.x, A.z); tick();
    ok('B10 vencido hoy: la ciudad no ofrece "Enfrentar a Bit Errante"', e.d.querySelector('#city-act').hidden === true);
    clock.ms = 25 * 3600000; tick();
    ok('B10 cruzar medianoche DENTRO de la ciudad: la criatura de ayer vuelve sin salir', !e.d.querySelector('#city-act').hidden && /Enfrentar a Bit Errante/.test(e.d.querySelector('#city-act').textContent), e.d.querySelector('#city-act').textContent);
    ok('B10 sin errores', !e.errors.length, e.errors.join('|'));
    e.w.close();
  } catch (x) { ok('B10 (excepción)', false, x.stack.split('\n').slice(0, 2).join(' ')); }

  // ATAQUE: batalla iniciada a las 23:59:59 y ganada pasada la medianoche
  T('B11', () => { const clock = { ms: 0 }; const n = new Date(); const t = new Date(n.getFullYear(), n.getMonth(), n.getDate(), 23, 59, 59, 0);
    clock.ms = t.getTime() - Date.now(); e = boot(fresh(), { clock }); enterBattle(e.w, e.d, 'bit'); const d0 = todayW(e.w);
    ans(e.w, e.d, true); nextB(e.w, e.d); clock.ms += 5000;
    for (let i = 0; i < 3; i++) { ans(e.w, e.d, true); nextB(e.w, e.d); }
    s = st(e.w);
    ok('B11 medianoche: vencido = día nuevo (vuelve "mañana" de verdad)', s.city.beaten.bit === todayW(e.w) && d0 !== todayW(e.w), d0 + ' -> ' + s.city.beaten.bit);
    ok('B11 days.count coherente (no se rompe al cruzar el día)', s.days.count >= 1 && s.days.last === todayW(e.w), JSON.stringify(s.days));
    e.w.close(); });

  // ATAQUE: vencido con fecha futura (reloj del sistema retrocedido) y con basura
  T('B12', () => { e = boot(fresh({ city: { beaten: { bit: '2099-01-01', silicio: 12345, unico: { a: 1 }, cache: ['x'] } } }));
    ok('B12 vencido futuro/basura: se puede pelear y no rompe', enterBattle(e.w, e.d, 'bit') === true && !e.errors.length, e.errors.join('|')); e.w.close(); });

  // ATAQUE: sesiones caóticas (clics dobles, botones viejos, teclas, poderes, regen) en 4 villanos y 4 niveles
  {
    const N = 60; let broke = 0; const samples = [];
    for (let i = 0; i < N; i++) {
      counts.adv++;
      const r = L.rng(SEED + 7000 + i), vid = r.pick(Object.keys(VIL)), xp = r.pick([0, 450, 1000, 2500, 5000]);
      const env = boot(fresh({ xp }));
      try {
        if (!enterBattle(env.w, env.d, vid)) throw new Error('no entró');
        const s00 = st(env.w); const res = chaosBattle(env, r, vid);
        const bad = res.viol.concat(isResults(env.d) ? checkBattleEnd(env, s00, vid, res.last) : [], env.errors);
        if (bad.length) { broke++; if (samples.length < 4) samples.push('semilla=' + (SEED + 7000 + i) + ' ' + vid + ' xp=' + xp + ': ' + bad.slice(0, 2).join(' | ')); }
      } catch (er) { broke++; samples.push('semilla=' + (SEED + 7000 + i) + ' excepción ' + er.message); }
      env.w.close();
    }
    ok('B13 caos en batalla (' + N + ' sesiones): invariantes de vida/energía/fin/progreso/vencido', broke === 0, broke + ' rotas; ' + samples.join(' || '));
  }

  // ===================== 2. PROPIEDADES SOBRE M02 =====================
  const probe = boot(null); const MODULES = probe.w.eval('MODULES'); const M02 = MODULES.find((m) => m.id === 'M02');
  const TOPS = M02.topics.map((t) => t.id);
  const RUNS = 1000;
  {
    // P1: ronda quiz de cualquier tema de M02: ≥1 pregunta, ≤8, únicas, del tema, válidas
    const r = L.rng(SEED + 1); const lib = pureLib(MODULES, r); let fail = null;
    for (let i = 0; i < RUNS && !fail; i++) {
      const t = r.pick(TOPS), its = lib.itemsFor('quiz', lib.mod('M02'), t);
      const bad = !its.length ? 'vacía' : its.length > 8 ? '>8' : new Set(its.map((q) => q.id)).size !== its.length ? 'duplicadas' : its.find((q) => q.topic !== t) ? 'otro tema' : its.map(qValid).find(Boolean);
      if (bad) fail = t + ': ' + bad;
    }
    counts.props.push(['P1 quiz M02 ≥1 pregunta válida', RUNS, !fail]);
    ok('P1 quiz de cualquier tema de M02 (' + RUNS + ' ejec., semilla ' + (SEED + 1) + ')', !fail, fail);
    // P1b: y termina de verdad en la interfaz (≥200 rondas reales, respuestas y teclas al azar)
    const r2 = L.rng(SEED + 2); let failUI = null, runsUI = 0; const UI_RUNS = 230;
    let env = boot(fresh());
    for (let i = 0; i < UI_RUNS && !failUI; i++) {
      if (i % 40 === 0 && i) { env.w.close(); env = boot(fresh()); }
      const { w, d } = env; const t = TOPS[i % TOPS.length];
      click(w, L.btn(d, 'home')); click(w, L.modBtn(d, 'M02'));
      click(w, [...d.querySelectorAll('[data-act="topic"]')].find((b) => b.dataset.id === t));
      click(w, L.btn(d, 'start', (b) => b.dataset.kind === 'quiz'));
      const a0 = sumA(st(w)); let n = 0, acts = 0;
      if (!d.querySelector('.prompt')) { failUI = t + ': la ronda no mostró pregunta'; break; }
      while (!isResults(d) && acts++ < 200) {
        const k = r2.int(0, 3);
        if (k === 0) L.key(w, String(r2.int(1, 4))); else if (k === 1) { if (d.activeElement && d.activeElement.blur) d.activeElement.blur(); L.key(w, 'Enter'); }
        else if (k === 2) { const o = r2.pick([...d.querySelectorAll('.opt')].concat([null])); if (o) { click(w, o); click(w, o); } } else nextB(w, d);
        const rn = L.btn(d, 'regenno'); if (rn) click(w, rn);
      }
      n = isResults(d) ? +/\/(\d+)$/.exec(d.querySelector('.big').textContent)[1] : -1;
      if (!isResults(d)) failUI = t + ': no terminó en 200 acciones';
      else if (n < 1 || sumA(st(w)) - a0 !== n) failUI = t + ': n=' + n + ' a=' + (sumA(st(w)) - a0);
      else if (env.errors.length) failUI = t + ': ' + env.errors[0];
      runsUI++;
    }
    env.w.close();
    counts.props.push(['P1b quiz M02 termina en la interfaz', runsUI, !failUI]);
    ok('P1b quiz M02 termina en la interfaz con caos (' + runsUI + ' rondas)', !failUI, failUI);
  }
  {
    // P2: batalla con los temas de una criatura del spec: battleItems real con mod M02 da ≥6 únicas de sus temas (lo mínimo para que vida 4 / energía 3 termine)
    const r = L.rng(SEED + 3); const lib = pureLib(MODULES, r); let fail = null;
    for (let i = 0; i < RUNS && !fail; i++) {
      const cid = r.pick(Object.keys(CREATURES)), tops = CREATURES[cid];
      const its = lib.battleItems({ id: cid, mod: 'M02', topics: tops });
      const bad = its.length < 6 ? 'solo ' + its.length + ' preguntas' : new Set(its.map((q) => q.id)).size !== its.length ? 'duplicadas' : its.find((q) => !tops.includes(q.topic)) ? 'tema ajeno' : its.map(qValid).find(Boolean);
      if (bad) fail = cid + ': ' + bad;
    }
    counts.props.push(['P2 battleItems criatura M02 ≥6', RUNS, !fail]);
    ok('P2 battleItems(criatura M02) ≥6 únicas de sus temas (' + RUNS + ' ejec.)', !fail, fail);
    // P2b: regla del spec "8 preguntas mcq o tf de sus temas": la muestra de 8 sin repetir siempre se arma
    const r2 = L.rng(SEED + 4); const lib2 = pureLib(MODULES, r2); let fail2 = null; const pools = {};
    Object.entries(CREATURES).forEach(([cid, tops]) => { pools[cid] = tops.reduce((n, t) => n + lib2.ofType(M02, 'mcq', t).length + lib2.ofType(M02, 'tf', t).length, 0); });
    for (let i = 0; i < RUNS && !fail2; i++) {
      const cid = r2.pick(Object.keys(CREATURES)), tops = CREATURES[cid];
      const pool = [].concat(...tops.map((t) => lib2.ofType(M02, 'mcq', t).concat(lib2.ofType(M02, 'tf', t))));
      const s8 = lib2.sample(pool, 8);
      if (s8.length < 8 || new Set(s8.map((q) => q.id)).size !== 8) fail2 = cid + ': solo ' + s8.length;
      const covered = new Set(s8.map((q) => q.topic));
      if (!fail2 && tops.some((t) => !pool.some((q) => q.topic === t))) fail2 = cid + ': un tema sin mcq/tf';
    }
    counts.props.push(['P2b 8 mcq/tf por criatura', RUNS, !fail2]);
    ok('P2b 8 mcq/tf sin repetir por criatura (' + RUNS + ' ejec.) pools=' + JSON.stringify(pools), !fail2, fail2);
    // P2c: las 6 criaturas cubren los 23 temas de M02 exactamente una vez
    const all = [].concat(...Object.values(CREATURES));
    ok('P2c criaturas cubren T01..T23 una vez', all.length === TOPS.length && new Set(all).size === TOPS.length && TOPS.every((t) => all.includes(t)), all.length + ' vs ' + TOPS.length);
  }
  {
    // P3: ronda de 2 preguntas scenario/error de un tema de reto (temas con ≥2 de esas) siempre se arma y es respondible
    const r = L.rng(SEED + 5); const lib = pureLib(MODULES, r);
    const se = (t) => lib.ofType(M02, 'scenario', t).concat(lib.ofType(M02, 'error', t));
    const eligible = TOPS.filter((t) => se(t).length >= 2);
    let fail = null;
    if (!eligible.length) fail = 'ningún tema de M02 tiene ≥2 scenario/error';
    for (let i = 0; i < RUNS && !fail; i++) {
      const t = r.pick(eligible), two = lib.shuffle(se(t)).slice(0, 2);
      const bad = two.length !== 2 ? 'solo ' + two.length : two[0].id === two[1].id ? 'repetida' : two.find((q) => q.topic !== t || !['scenario', 'error'].includes(q.type)) ? 'tipo/tema' : two.map(qValid).find(Boolean);
      if (bad) fail = t + ': ' + bad;
    }
    counts.props.push(['P3 reto 2 scenario/error', RUNS, !fail]);
    ok('P3 reto de 2 scenario/error (' + RUNS + ' ejec.; temas elegibles ' + eligible.length + ': ' + eligible.join(',') + ')', !fail, fail);
    ok('P3b hay ≥10 temas elegibles para 10 retos con temas distintos', eligible.length >= 10, 'elegibles=' + eligible.length + ' (' + eligible.join(',') + ')');
  }
  probe.w.close();

  // ===================== 3. FUZZING migrate() + city =====================
  {
    const { runPool } = require('./runner.cjs');
    const cases = []; for (let i = 0; i < FUZZ_N; i++) cases.push(cityCase(SEED + 100000 + i));
    const res = await runPool(__filename, cases, { caseTimeout: 30000 });
    counts.fuzz = cases.length;
    const sig = new Map(); let fails = 0;
    res.forEach((r, i) => {
      const probs = r && r.problems ? r.problems : (r && r.errors) || ['sin resultado'];
      if (!probs.length) return; fails++;
      const k = 'modo ' + cases[i].mode + ' :: ' + String(probs[0]).replace(/\d{2,}/g, 'N').slice(0, 120);
      const prev = sig.get(k);
      if (!prev || cases[i].raw.length < prev.raw.length) sig.set(k, { raw: cases[i].raw, seed: cases[i].seed, probs, n: (prev ? prev.n : 0) + 1 }); else prev.n++;
    });
    const detail = [...sig.entries()].map(([k, v]) => '[x' + v.n + '] ' + k + ' semilla=' + v.seed + ' entrada(' + v.raw.length + ')=' + v.raw.slice(0, 300)).join('\n    ');
    ok('F1 migrate() con city arbitrario: ' + FUZZ_N + ' estados arrancan, juegan quiz M02 y batalla', fails === 0, fails + ' fallos\n    ' + detail);
  }

  const fails = results.filter((x) => x[0] === 'FAIL');
  results.forEach((x) => console.log(x.join(' | ')));
  console.log('\nResumen: adversariales=' + counts.adv + ' | propiedades=' + counts.props.map((p) => p[0] + '×' + p[1] + (p[2] ? ' ok' : ' FALLA')).join('; ') + ' | fuzz=' + counts.fuzz + ' estados | ' + ((Date.now() - t0) / 1000).toFixed(1) + ' s');
  console.log(fails.length ? 'FALLAS ' + fails.length : 'CITY BASE OK (' + results.length + ')');
  process.exitCode = fails.length ? 1 : 0;
})();
