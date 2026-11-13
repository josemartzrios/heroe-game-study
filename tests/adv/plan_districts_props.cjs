// Ataque previo al plan 2026-11-12-ciudad-distritos: fija con fast-check propiedades de migrate()/load()/fresh() del
// motor ACTUAL (engine.html, tal como está en juego_estudio.html) que la migración por distritos debe conservar.
// Las funciones viven dentro de la IIFE del motor: se extrae su texto del HTML construido y se evalúa en una ventana jsdom
// de juego_estudio.html (mismo código, sin reescribirlo). Al final, arranques completos del juego con guardados hostiles.
//  Q1 migrate nunca lanza y devuelve tipos válidos (xp/sesión/días/topics/qs/boss/stats/city) con guardados aleatorios
//  Q2 conservación: un guardado válido conserva xp, topics, qs, boss, virtudes, stats y nombre
//  Q3 idempotencia: migrate(JSON(migrate(x))) == migrate(x)
//  Q4 __proto__ en topics/qs/boss/days/stats/hero no cambia prototipos ni contamina Object.prototype
//  Q5 load() con texto crudo arbitrario (fuzz) nunca lanza y devuelve null o un estado válido
//  Q6 el nombre del héroe recortado sigue siendo UTF-16 bien formado
// Uso: node tests/adv/plan_districts_props.cjs [RUNS=3000] [SEED=20261112] [FUZZ=100000]   (sale con 1 si algo falla)
const fc = require('fast-check');
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const RUNS = +(process.argv[2] || 3000), SEED = +(process.argv[3] || 20261112), FUZZ = +(process.argv[4] || 100000);
const KEY = 'estudio_isw_v1';
const html = fs.readFileSync(path.join(__dirname, '..', '..', 'juego_estudio.html'), 'utf8');
const results = [];
let inputs = 0;
const ok = (name, cond, extra) => results.push([cond ? 'PASS' : 'FAIL', name, cond ? '' : (extra || '')]);
const safeStr = (x) => { try { return JSON.stringify(x).slice(0, 400); } catch (e) { return String(x); } };
function prop(name, arb, pred, runs) {
  const n = runs || RUNS;
  const r = fc.check(fc.property(arb, (x) => { inputs++; return pred(x); }), { numRuns: n, seed: SEED, endOnFailure: false });
  ok(name + ' (' + n + ' ejecuciones, semilla ' + SEED + ')', !r.failed,
    r.failed ? 'contraejemplo=' + safeStr(r.counterexample) + ' error=' + String(r.errorInstance && r.errorInstance.message || r.error).slice(0, 300) : '');
}
function canon(x) {
  if (Array.isArray(x)) return x.map(canon);
  if (x && typeof x === 'object') { const o = {}; Object.keys(x).sort().forEach((k) => { o[k] = canon(x[k]); }); return o; }
  return x;
}
const same = (a, b) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));

// ---------- extracción del motor ----------
function engineHarness() {
  const vc = new VirtualConsole();
  const errors = [];
  vc.on('jsdomError', (e) => errors.push(String(e.message || e)));
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.test/', virtualConsole: vc,
    beforeParse(w) { w.scrollTo = () => {}; w.HTMLCanvasElement.prototype.getContext = function () { return new Proxy({ canvas: this }, { get(o, k) { return k in o ? o[k] : () => {}; }, set(o, k, v) { o[k] = v; return true; } }); }; },
  });
  const w = dom.window;
  const grab = (startRe, endStr) => {
    const i = html.search(startRe); if (i < 0) throw new Error('no encontrado: ' + startRe);
    const j = html.indexOf(endStr, i); if (j < 0) throw new Error('sin fin: ' + endStr);
    return html.slice(i, j + endStr.length);
  };
  const dayFns = grab(/function dayStr\(d\)/, 'function today() { return dayStr(new Date()); }');
  // desde CITY_DATA (inyección /*__CITY__*/) hasta el cierre de load(): CityMove, CityStory, CityInput, fresh, migrate, load
  // fin = la línea `function save() {` que sigue a load() (no depende del cuerpo de load)
  const core = grab(/var CITY_DATA = /, '\n  function save() {').replace(/\n  function save\(\) \{$/, '');
  if (!/function migrate\(o\)/.test(core) || !/function load\(\)/.test(core)) throw new Error('extracción incompleta');
  const api = w.eval('(function () { "use strict"; var KEY = ' + JSON.stringify(KEY) + ';\n' + dayFns + '\n' + core +
    '\nreturn { fresh: fresh, migrate: migrate, load: load, CITY_DATA: CITY_DATA }; })()');
  return { w, api, errors };
}

// ---------- generadores ----------
const HOSTILE = ['__proto__', 'constructor', 'prototype', 'toString', 'hasOwnProperty', 'valueOf', 'length', '0', '', 'M08:T04', 'M02:T01', 'M02', 'M08', 'M99'];
const anyKey = fc.oneof(fc.constantFrom(...HOSTILE), fc.string({ maxLength: 8 }));
const junk = fc.letrec((tie) => ({
  v: fc.oneof({ depthSize: 'small' },
    fc.constant(null), fc.boolean(), fc.double(), fc.integer(), fc.constantFrom(NaN, Infinity, -Infinity, -0, 1e308, -1, 1.5, '1', '', 'x'),
    fc.string({ maxLength: 6 }), fc.array(tie('v'), { maxLength: 3 }), fc.dictionary(anyKey, tie('v'), { maxKeys: 3 })),
})).v;
const validDate = fc.date({ min: new Date('2020-01-01'), max: new Date('2026-11-01'), noInvalidDate: true }).map((d) => d.toISOString().slice(0, 10));
const tkey = fc.oneof(fc.constantFrom('M08:T04', 'M02:T01', 'M01:T15', 'constructor', 'toString', 'hasOwnProperty'),
  fc.tuple(fc.integer({ min: 1, max: 11 }), fc.integer({ min: 1, max: 30 })).map(([m, t]) => 'M' + String(m).padStart(2, '0') + ':T' + String(t).padStart(2, '0')));
const qkey = fc.oneof(fc.constantFrom('constructor', 'valueOf', 'M08-001'), fc.tuple(fc.integer({ min: 1, max: 11 }), fc.integer({ min: 1, max: 400 })).map(([m, n]) => 'M' + String(m).padStart(2, '0') + '-' + String(n).padStart(3, '0')));
const bkey = fc.constantFrom('M01', 'M02', 'M03', 'M04', 'M05', 'M06', 'M07', 'M08', 'M09', 'M10', 'M11', 'constructor', 'toString');
const score = fc.constantFrom(0, 0.5, 1);
const validQs = fc.integer({ min: 0, max: 1000 }).chain((a) => fc.record({ a: fc.constant(a), c: fc.integer({ min: 0, max: a }), q: fc.boolean(), g: fc.integer({ min: 0, max: 50 }), gs: fc.integer({ min: -1, max: 20 }) }));
const heroName = fc.string({ maxLength: 20, unit: 'grapheme' }).filter((s) => s.length <= 20);
const validSave = fc.record({
  v: fc.constant(1),
  xp: fc.oneof(fc.integer({ min: 0, max: 2e9 }), fc.double({ min: 0, max: 1e12, noNaN: true }).map((x) => Math.abs(x))),
  days: fc.record({ last: fc.oneof(fc.constant(null), validDate), count: fc.integer({ min: 0, max: 5000 }) }),
  session: fc.integer({ min: 0, max: 1e6 }), lastActive: fc.integer({ min: 0, max: 1.8e12 }),
  topics: fc.dictionary(tkey, fc.array(score, { maxLength: 10 }), { maxKeys: 12 }),
  qs: fc.dictionary(qkey, validQs, { maxKeys: 12 }),
  boss: fc.dictionary(bkey, fc.record({ best: fc.integer({ min: 0, max: 20 }), passed: fc.boolean() }), { maxKeys: 6 }),
  hero: fc.record({ name: heroName }),
  virtues: fc.dictionary(fc.constantFrom('constancia', 'valentia', 'enfoque', 'liderazgo'), fc.integer({ min: 1.6e12, max: 1.8e12 }), { maxKeys: 4 }),
  stats: fc.record({ learnTopics: fc.array(tkey, { maxLength: 6 }), cleared: fc.integer({ min: 0, max: 999 }), roundsNoPower: fc.integer({ min: 0, max: 999 }),
    bossFailed: fc.dictionary(fc.constantFrom('M01', 'M02', 'M08'), fc.constant(true), { maxKeys: 3 }) }),
});
// Guardado aleatorio: base válida con campos sustituidos por basura (y campos extra hostiles)
const mutatedSave = fc.tuple(validSave, fc.dictionary(fc.constantFrom('xp', 'days', 'session', 'lastActive', 'topics', 'qs', 'boss', 'hero', 'virtues', 'stats', 'city', 'world', '__proto__', 'constructor'), junk, { maxKeys: 5 }))
  .map(([b, m]) => Object.assign(b, m));

function validState(o) {
  const P = Object.prototype, isPlain = (x) => !!x && typeof x === 'object' && !Array.isArray(x) && Object.getPrototypeOf(x) === P;
  const nn = (x) => typeof x === 'number' && isFinite(x) && x >= 0;
  const errs = [];
  if (!nn(o.xp)) errs.push('xp=' + o.xp);
  if (!Number.isInteger(o.session) || o.session < 0) errs.push('session');
  if (!nn(o.lastActive)) errs.push('lastActive');
  if (!isPlain(o.days) || !(o.days.last === null || /^\d{4}-\d{2}-\d{2}$/.test(o.days.last)) || !Number.isInteger(o.days.count)) errs.push('days');
  for (const f of ['topics', 'qs', 'boss', 'virtues', 'hero', 'stats', 'city']) if (!isPlain(o[f])) errs.push(f + ' no plano o prototipo cambiado');
  if (isPlain(o.topics)) Object.keys(o.topics).forEach((k) => { const h = o.topics[k]; if (!Array.isArray(h) || h.length > 10 || h.some((x) => !(nn(x) && x <= 1))) errs.push('topics.' + k); });
  if (isPlain(o.qs)) Object.keys(o.qs).forEach((k) => { const r = o.qs[k]; if (!isPlain(r) || !Number.isInteger(r.a) || !Number.isInteger(r.c) || r.c > r.a || r.c < 0 || typeof r.q !== 'boolean' || !Number.isInteger(r.g) || !isFinite(r.gs)) errs.push('qs.' + k); });
  if (isPlain(o.boss)) Object.keys(o.boss).forEach((k) => { const b = o.boss[k]; if (!isPlain(b) || !Number.isInteger(b.best) || b.best < 0 || b.best > 20 || typeof b.passed !== 'boolean') errs.push('boss.' + k); });
  if (o.hero && (typeof o.hero.name !== 'string' || o.hero.name.length > 20)) errs.push('hero');
  if (!o.stats || !Array.isArray(o.stats.learnTopics) || !Number.isInteger(o.stats.cleared) || !Number.isInteger(o.stats.roundsNoPower)) errs.push('stats');
  if ('world' in o && Object.prototype.hasOwnProperty.call(o, 'world')) errs.push('world sin borrar');
  if (P.polluted !== undefined || Object.keys(P).length) errs.push('Object.prototype contaminado');
  return errs;
}
const wellFormed = (s) => !/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(^|[^\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(s);

(() => {
  const H = engineHarness();
  const { migrate, load, fresh } = H.api;
  const W = H.w;
  // JSON.parse de la ventana: así los objetos tienen el Object.prototype del motor (como en el navegador)
  const reparse = (x) => W.JSON.parse(JSON.stringify(x));
  const viaText = (txt) => W.JSON.parse(txt);
  const WP = W.Object.prototype;
  const plainW = (x) => !!x && typeof x === 'object' && !W.Array.isArray(x) && W.Object.getPrototypeOf(x) === WP;
  const validStateW = (o) => {
    const errs = validState(JSON.parse(JSON.stringify(o)));   // tipos y rangos
    for (const f of ['topics', 'qs', 'boss', 'virtues', 'hero', 'stats', 'days', 'city']) if (!plainW(o[f])) errs.push(f + ': prototipo distinto de Object.prototype (' + (o[f] && W.Object.getPrototypeOf(o[f]) === W.Array.prototype ? 'Array' : typeof o[f]) + ')');
    if (Object.keys(WP).length || WP.polluted !== undefined || 'a' in {} || 'best' in {}) errs.push('Object.prototype contaminado');
    return errs;
  };

  // ---- R: regresiones fijas (entradas mínimas exactas) ----
  // ATAQUE: __proto__ con arreglo en topics cambia el prototipo de S.topics a un Array (spec §5.5 lo pide arreglar)
  let o = migrate(viaText('{"v":1,"topics":{"__proto__":[1,1,1]}}'));
  ok('R1 topics.__proto__ = [1,1,1] no cambia el prototipo de topics', plainW(o.topics), 'prototipo=' + (W.Object.getPrototypeOf(o.topics) === W.Array.prototype ? 'Array' : String(W.Object.getPrototypeOf(o.topics))) + ' "0" in topics=' + ('0' in o.topics) + ' for-in=' + JSON.stringify((() => { const k = []; for (const x in o.topics) k.push(x); return k; })()));
  // ATAQUE: __proto__ con objeto en qs: S.qs hereda {a,c,q,g,gs}
  o = migrate(viaText('{"v":1,"qs":{"__proto__":{"a":3,"c":1}}}'));
  ok('R2 qs.__proto__ = {a:3} no cambia el prototipo de qs', plainW(o.qs), 'S.qs.a=' + o.qs.a + ' S.qs.q=' + o.qs.q);
  // ATAQUE: __proto__ con objeto en boss: S.boss hereda {best, passed}
  o = migrate(viaText('{"v":1,"boss":{"__proto__":{"best":20,"passed":true}}}'));
  ok('R3 boss.__proto__ = {passed:true} no cambia el prototipo de boss', plainW(o.boss), 'S.boss.passed=' + o.boss.passed + ' S.boss.best=' + o.boss.best);
  // ATAQUE: el recorte a 20 unidades parte un emoji y deja un sustituto suelto en el nombre
  o = migrate(viaText(JSON.stringify({ v: 1, hero: { name: 'a'.repeat(19) + '\u{1F680}' } })));
  ok('R4 nombre de 19 letras + emoji: recorte bien formado', wellFormed(o.hero.name), 'name=' + JSON.stringify(o.hero.name));
  // ATAQUE: guardado con v:"1" (texto) o v:2 se trata como inexistente: el siguiente save lo pisa sin respaldo
  W.localStorage.setItem(KEY, '{"v":"1","xp":5000}');
  ok('R5 v:"1" con xp 5000: load no devuelve null (o deja respaldo)', load() !== null || W.localStorage.getItem(KEY + '_bak') !== null, 'load()=null y sin ' + KEY + '_bak: el próximo save() destruye 5000 XP');

  // ---- Q1 robustez ----
  // ATAQUE: guardados aleatorios con campos basura y claves hostiles: nunca lanza, tipos válidos
  prop('Q1 migrate nunca lanza y devuelve un estado bien tipado', mutatedSave, (s) => {
    const errs = validStateW(migrate(reparse(s)));
    if (errs.length) throw new Error(errs.join('; '));
    return true;
  });
  // ATAQUE: objetos completamente arbitrarios con v:1 (sin base válida)
  prop('Q1b migrate con objeto arbitrario v:1 nunca lanza', fc.dictionary(anyKey, junk, { maxKeys: 12 }).map((x) => Object.assign(x, { v: 1 })), (s) => {
    const errs = validStateW(migrate(reparse(s)));
    if (errs.length) throw new Error(errs.join('; '));
    return true;
  });

  // ---- Q2 conservación ----
  // ATAQUE: migrate no debe perder ni alterar datos válidos (incluidas claves como "constructor" o "toString")
  prop('Q2 guardado válido: xp, topics, qs, boss, virtudes, stats, días y nombre se conservan', validSave, (s) => {
    const m = migrate(reparse(s));
    const lost = ['xp', 'topics', 'qs', 'boss', 'virtues', 'stats', 'days', 'session', 'lastActive'].filter((k) => !same(m[k], s[k]));
    if (m.hero.name !== s.hero.name) lost.push('hero.name');
    if (lost.length) throw new Error('perdido/alterado: ' + lost.join(',') + ' :: ' + lost.map((k) => safeStr(m[k])).join(' | '));
    return true;
  });
  // ATAQUE: el jefe M02 aprobado debe seguir aprobado y city.restored solo con taught suficiente (fuente de bossPassedOf)
  prop('Q2b boss.passed se conserva para cada módulo y city.restored.M02 implica boss.M02.passed', validSave, (s) => {
    const m = migrate(reparse(s));
    Object.keys(s.boss).forEach((k) => { if (m.boss[k].passed !== s.boss[k].passed) throw new Error('boss ' + k); });
    if (m.city.restored && m.city.restored.M02 && !(s.boss.M02 && s.boss.M02.passed)) throw new Error('restored sin jefe');
    return true;
  });

  // ---- Q3 idempotencia ----
  // ATAQUE: migrar lo ya migrado (recargar la página tras guardar) no cambia nada
  prop('Q3 migrate(JSON(migrate(x))) == migrate(x)', mutatedSave, (s) => {
    const a = migrate(reparse(s));
    const ja = JSON.stringify(a);
    const b = migrate(viaText(ja));
    if (!same(JSON.parse(ja), JSON.parse(JSON.stringify(b)))) throw new Error('no idempotente: ' + ja.slice(0, 200) + ' → ' + JSON.stringify(b).slice(0, 200));
    return true;
  });

  // ---- Q4 __proto__ ----
  // ATAQUE: __proto__ (propio, vía JSON.parse) en topics/qs/boss/days/stats/hero/virtues con valores de cualquier forma
  const protoTarget = fc.constantFrom('topics', 'qs', 'boss', 'days', 'stats', 'hero', 'virtues', 'stats.bossFailed', 'city', 'city.beaten');
  const protoVal = fc.oneof(junk, fc.array(score, { maxLength: 4 }), validQs, fc.record({ best: fc.integer({ min: 0, max: 20 }), passed: fc.boolean() }));
  prop('Q4 __proto__ en cualquier sección no cambia prototipos ni contamina', fc.tuple(validSave, protoTarget, protoVal), ([s, t, v]) => {
    const txt = JSON.stringify(s);
    const parts = t.split('.');
    // la sección elegida se sustituye por su mismo contenido con una clave "__proto__" propia al principio
    const o2 = JSON.parse(txt); let host = o2;
    for (let i = 0; i < parts.length - 1; i++) { if (!host[parts[i]] || typeof host[parts[i]] !== 'object' || Array.isArray(host[parts[i]])) host[parts[i]] = {}; host = host[parts[i]]; }
    const last = parts[parts.length - 1];
    const cur = host[last] && typeof host[last] === 'object' && !Array.isArray(host[last]) ? host[last] : {};
    const inner = JSON.stringify(cur);
    const withProto = inner === '{}' ? '{"__proto__":' + JSON.stringify(v) + '}' : inner.replace(/^\{/, '{"__proto__":' + JSON.stringify(v) + ',');
    host[last] = '__SLOT__';
    const finalTxt = JSON.stringify(o2).replace('"__SLOT__"', () => withProto);
    const m = migrate(viaText(finalTxt));
    const errs = validStateW(m);
    if (errs.length) throw new Error(t + ': ' + errs.join('; '));
    return true;
  });

  // ATAQUE: la clave propia "__proto__" sobrevive en S.topics/qs/boss y se vuelve a guardar; cualquier Object.assign,
  // spread o copia for-in del código nuevo (cityD, espejo) la convierte en cambio de prototipo (spec §5.5 pide saltarla)
  prop('Q4b migrate no conserva claves propias "__proto__" en topics/qs/boss (spec §5.5)', fc.tuple(fc.constantFrom('topics', 'qs', 'boss'), fc.oneof(fc.array(score, { maxLength: 3 }), validQs, fc.record({ best: fc.integer({ min: 0, max: 20 }), passed: fc.boolean() }))), ([sec, v]) => {
    const m = migrate(viaText('{"v":1,"' + sec + '":{"__proto__":' + JSON.stringify(v) + '}}'));
    if (Object.prototype.hasOwnProperty.call(m[sec], '__proto__')) {
      const copy = W.Object.assign({}, m[sec]);
      throw new Error(sec + ' conserva "__proto__" propio; Object.assign({}, S.' + sec + ') cambia el prototipo: ' + (W.Object.getPrototypeOf(copy) !== WP));
    }
    return true;
  });

  // ---- Q5 fuzz de load() ----
  // ATAQUE: texto crudo arbitrario, JSON truncado o mutado en localStorage: load nunca lanza
  const base = JSON.stringify({ v: 1, xp: 120, topics: { 'M08:T04': [1, 0] }, qs: { 'M08-001': { a: 2, c: 1, q: true, g: 0, gs: -1 } }, boss: { M02: { best: 18, passed: true } }, city: { prologue: true, d: { M02: { taught: { a01: true } } }, at: { x: 0, z: -60, yaw: 3 } } });
  const mutate = fc.tuple(fc.nat(base.length), fc.nat(base.length), fc.string({ maxLength: 12 }), fc.constantFrom('cut', 'ins', 'rep', 'proto')).map(([i, j, s, op]) => {
    const a = Math.min(i, j), b = Math.max(i, j);
    if (op === 'cut') return base.slice(0, a);
    if (op === 'ins') return base.slice(0, a) + s + base.slice(a);
    if (op === 'proto') return base.replace('"xp"', '"__proto__":' + JSON.stringify(s) + ',"xp"');
    return base.slice(0, a) + s + base.slice(b);
  });
  const rawArb = fc.oneof(fc.string({ maxLength: 60 }), fc.string({ maxLength: 40, unit: 'binary' }), mutate, mutate, fc.json({ maxDepth: 3 }), fc.json({ maxDepth: 2 }).map((j) => '{"v":1,"city":' + j + ',"topics":' + j + '}'));
  let fuzzBad = null, fuzzN = 0, fuzzNull = 0;
  const t0 = Date.now();
  fc.assert(fc.property(rawArb, (raw) => {
    fuzzN++; inputs++;
    W.localStorage.setItem(KEY, raw);
    let r;
    try { r = load(); } catch (e) { fuzzBad = fuzzBad || ('lanza con ' + JSON.stringify(raw).slice(0, 200) + ': ' + e.message); return true; }
    if (r === null) { fuzzNull++; return true; }
    const errs = validStateW(r);
    if (errs.length && !fuzzBad) fuzzBad = 'estado inválido con ' + JSON.stringify(raw).slice(0, 200) + ': ' + errs.join('; ');
    return true;
  }), { numRuns: FUZZ, seed: SEED });
  ok('Q5 fuzz load(): ' + fuzzN + ' entradas en ' + (Date.now() - t0) + ' ms (' + fuzzNull + ' → null), nunca lanza ni deja estado inválido', !fuzzBad, fuzzBad);
  // ATAQUE: JSON roto en localStorage → load() null sin respaldo: el save() siguiente borra la partida (plan Task 5 lo pide)
  W.localStorage.removeItem(KEY + '_bak');
  W.localStorage.setItem(KEY, '{"v":1,');
  load();
  ok('Q5b JSON roto deja respaldo en _bak antes de devolver null (spec §5.5; hoy no)', W.localStorage.getItem(KEY + '_bak') === '{"v":1,', 'sin _bak: el próximo save() destruye el guardado ilegible');

  // ---- Q6 nombre bien formado ----
  // ATAQUE: nombres con emojis/combinantes/RTL de cualquier largo: el recorte nunca deja sustitutos sueltos
  prop('Q6 hero.name recortado es UTF-16 bien formado y ≤ 20', fc.string({ maxLength: 40, unit: 'grapheme' }), (name) => {
    const m = migrate(viaText(JSON.stringify({ v: 1, hero: { name } })));
    if (m.hero.name.length > 20 || !wellFormed(m.hero.name)) throw new Error(JSON.stringify(m.hero.name));
    return true;
  });

  // ---- E: arranque completo del juego con guardados hostiles (pocos, son lentos) ----
  // ATAQUE: el juego entero arranca con __proto__ en topics/qs/boss y no lanza; guardar no pierde xp
  const hostileBoots = [
    '{"v":1,"xp":777,"topics":{"__proto__":[1,1,1],"M08:T04":[1]},"qs":{"__proto__":{"a":5,"c":5,"q":true}},"boss":{"__proto__":{"best":20,"passed":true}}}',
    '{"v":1,"xp":777,"boss":{"M02":{"best":19,"passed":true},"constructor":{"best":3,"passed":false}},"topics":{"constructor":[1],"toString":[0]}}',
    '{"v":1,"xp":777,"city":{"__proto__":{"run":true},"d":{"__proto__":{"beaten":{}}},"scene":"__proto__"}}',
  ];
  hostileBoots.forEach((raw, i) => {
    inputs++;
    const vc = new VirtualConsole(); const errs = [];
    vc.on('jsdomError', (e) => errs.push(String(e.message || e).slice(0, 160)));
    const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.test/', virtualConsole: vc,
      beforeParse(w) { w.localStorage.setItem(KEY, raw); w.scrollTo = () => {}; w.HTMLCanvasElement.prototype.getContext = function () { return new Proxy({ canvas: this }, { get(o, k) { return k in o ? o[k] : () => {}; }, set(o, k, v) { o[k] = v; return true; } }); }; } });
    const d = dom.window.document;
    const anyBtn = d.querySelectorAll('[data-act]').length;
    ok('E' + (i + 1) + ' arranque con guardado hostil sin errores y con inicio dibujado', !errs.length && anyBtn > 0, errs.join(' | ') + ' botones=' + anyBtn);
    dom.window.close();
  });

  ok('H harness sin errores de consola', !H.errors.length, H.errors.join(' | '));
  void fresh;
  H.w.close();

  const fails = results.filter((r) => r[0] === 'FAIL');
  results.forEach((r) => console.log(r[0] + '  ' + r[1] + (r[2] ? '\n      ' + r[2] : '')));
  console.log('\nentradas procesadas: ' + inputs + ' · ' + (results.length - fails.length) + ' PASS / ' + fails.length + ' FAIL');
  process.exit(fails.length ? 1 : 0);
})();
