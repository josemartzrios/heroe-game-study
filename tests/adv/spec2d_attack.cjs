// Ataque a los supuestos del spec 2026-11-12 (Ciudad Núcleo 2D) contra el código ACTUAL: línea base antes de implementarlo.
//  A) inventario de lectores de hero.look / hero.welcomed (riesgo de borrarlos en migrate()).
//  B) guardados hostiles en hero (look ausente/null/__proto__, welcomed no booleano, name hostil).
//  C) guardados hostiles en city (at enormes, ids basura) en el motor + propiedad sobre CityStory.normalizeCity.
//  D) propiedades de batalla (window.__CITY_ROUND__): energía en [0, 3], vida en [0, 4], victoria <=> vida 0,
//     derrota => energía 0, la ronda siempre termina; con Valentía guardada (el spec la convierte en energía 4).
//  E) movimiento relativo a pantalla (CityMove.step con camYaw = 0): nunca sale de bounds ni entra en una caja.
// Uso: node tests/adv/spec2d_attack.cjs [BATTLES=300] [SEED=20261112] [MOVE_STEPS=200000]   (sale con 1 si algo falla)
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const path = require('path');
const fc = require('fast-check');
const L = require('./lib.cjs');
const CityMove = require('../../city/move.js');
const CityStory = require('../../city/story.js');

const ROOT = path.join(__dirname, '..', '..');
const html = fs.readFileSync(path.join(ROOT, 'juego_estudio.html'), 'utf8');
const KEY = 'estudio_isw_v1';
const BATTLES = +(process.argv[2] || 300), SEED = +(process.argv[3] || 20261112), MOVE_STEPS = +(process.argv[4] || 200000);
console.log('semilla=' + SEED + ' batallas=' + BATTLES + ' pasos=' + MOVE_STEPS);

const results = [];
const ok = (name, cond, extra) => { results.push([cond ? 'PASS' : 'FAIL', name, cond ? '' : (extra || '')]); };
const tick = async (n = 3) => { for (let i = 0; i < n; i++) await new Promise((r) => setTimeout(r, 0)); };

function boot(raw, opts = {}) {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => errors.push('jsdomError: ' + (e.detail && e.detail.stack ? String(e.detail.stack).split('\n').slice(0, 2).join(' ') : (e.detail || e.message))));
  vc.on('error', (...a) => errors.push('console.error: ' + a.map(String).join(' ')));
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.test/', virtualConsole: vc,
    beforeParse(w) {
      if (raw != null) w.localStorage.setItem(KEY, raw);
      w.scrollTo = () => {}; w.Element.prototype.scrollIntoView = function () {};
      w.confirm = () => false; w.alert = () => {};
      w.__CITY_TEST__ = true;
      w.URL.createObjectURL = () => 'blob:x'; w.URL.revokeObjectURL = () => {};
      w.__TRIP_IMPORT__ = () => Promise.resolve({ THREE_FAKE: true });
      w.__CITY_WORLD__ = { create(canvas, D, sceneId, o) { w.__fakeOpts = o; w.__fakeScene = sceneId; return Promise.resolve({ resize() {}, setPaused() {}, dissolve() {}, encounter() { return Promise.resolve(); }, dispose() {} }); } };
      const fake = (el) => new Proxy({ canvas: el }, { get(t, k) { if (k in t) return t[k]; if (k === 'measureText') return () => ({ width: 0 }); return () => {}; }, set(t, k, v) { t[k] = v; return true; } });
      w.HTMLCanvasElement.prototype.getContext = function () { return fake(this); };
      w.requestAnimationFrame = () => 1; w.cancelAnimationFrame = () => {};
    },
  });
  return { dom, w: dom.window, d: dom.window.document, errors };
}
const base = (o = {}) => Object.assign({ v: 1, xp: 0, days: { last: null, count: 0 }, session: 1, lastActive: 0, topics: {}, qs: {}, boss: {},
  hero: { name: 'H', look: { skin: 0, suit: 0, head: 0, eyes: 0, emblem: 0, cape: 0, hand: 0 }, welcomed: true } }, o);
const saved = (w) => JSON.parse(w.localStorage.getItem(KEY));
const SLOTS = ['skin', 'suit', 'head', 'eyes', 'emblem', 'cape', 'hand'];
/* fuerza un save() del motor: reparación de 2 preguntas, respondo la primera */
function forceSave(w, d) {
  const R = w.__CITY_ROUND__;
  R.startRound({ kind: 'repair', title: 'R', mid: 'M02', back: { name: 'home' }, city: { kind: 'repair', id: 'r09', mid: 'M02' } }, R.repairItems('M02', 'T15'));
  const o = d.querySelector('.opt:not([disabled])'); if (o) L.click(w, o);
  const rn = d.querySelector('[data-act="regenno"]'); if (rn) L.click(w, rn);
}

(async () => {
  const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const D = (await import(path.join(ROOT, 'city', 'districts.mjs'))).city;
  const B = D.districts.M02.bounds, RAD = D.radius;   // los ataques de movimiento corren dentro de M02; los de la plaza usan sus propios límites
  try {
    // ================= A) inventario de lectores =================
    {
      const files = ['engine.html', 'city/view.js', 'city/world2d.js', 'city/sprites2d.js'];
      const hits = [];
      files.forEach((f) => fs.readFileSync(path.join(ROOT, f), 'utf8').split('\n').forEach((ln, i) => {
        if (/hero\.look|\.welcomed|S\.hero\.look|opts\.look|\blook\b\s*[,)]/.test(ln) && !/lookAt|TRIP_LOOK|scene\.look/.test(ln)) hits.push(f + ':' + (i + 1));
      }));
      console.log('INVENTARIO lectores de look/welcomed (' + hits.length + '): ' + hits.join(' '));
      const eng = fs.readFileSync(path.join(ROOT, 'engine.html'), 'utf8');
      ok('A1 fixLook, avatarSvg y PARTS ya no existen en el motor', !/fixLook|avatarSvg|\bPARTS\b/.test(eng));
      ok('A2 solo queda el comentario de la lista blanca como mención de look/welcomed', hits.length <= 1 && hits.every((h) => /^engine\.html:/.test(h)), hits.join(' '));
    }

    // ================= B) guardados hostiles en hero =================
    const heroCases = [
      // ATAQUE: hero ausente
      ['sin hero', (s) => { delete s.hero; }],
      // ATAQUE: hero null / array / string / número
      ['hero null', (s) => { s.hero = null; }], ['hero array', (s) => { s.hero = [1, 2]; }], ['hero string', (s) => { s.hero = 'x'; }], ['hero 7', (s) => { s.hero = 7; }],
      // ATAQUE: look ausente / null / array / string / número
      ['look ausente', (s) => { delete s.hero.look; }], ['look null', (s) => { s.hero.look = null; }], ['look []', (s) => { s.hero.look = []; }],
      ['look "abc"', (s) => { s.hero.look = 'abc'; }], ['look 0', (s) => { s.hero.look = 0; }],
      // ATAQUE: índices fuera de rango, negativos, fraccionarios, cadenas, enormes
      ['look fuera de rango', (s) => { s.hero.look = { skin: 999, suit: -1, head: 1.9, eyes: '2', emblem: 1e308, cape: null, hand: true }; }],
      // ATAQUE: colores con inyección de atributos/HTML
      ['look hc/capec inyección', (s) => { s.hero.look = { skin: 0, hc: '#fff" onload="alert(1)', capec: '<script>x</script>' }; }],
      // ATAQUE: welcomed no booleano (con progreso, para que la tarjeta se evalúe)
      ['welcomed "true"', (s) => { s.hero.welcomed = 'true'; s.xp = 50; }], ['welcomed 1', (s) => { s.hero.welcomed = 1; s.xp = 50; }],
      ['welcomed {}', (s) => { s.hero.welcomed = {}; s.xp = 50; }], ['welcomed null', (s) => { s.hero.welcomed = null; s.xp = 50; }],
      // ATAQUE: guardado "del futuro" (spec aplicado: sin look ni welcomed) cargado por esta versión (rollback)
      ['guardado post-spec (sin look ni welcomed) con progreso', (s) => { delete s.hero.look; delete s.hero.welcomed; s.xp = 500; }],
      // ATAQUE: nombre hostil (tipo, HTML, gigante, zero-width/RTL)
      ['name número', (s) => { s.hero.name = 42; }], ['name HTML', (s) => { s.hero.name = '<img src=x onerror=alert(1)>'; }],
      ['name 200k', (s) => { s.hero.name = 'A'.repeat(200000); }], ['name ZW/RTL', (s) => { s.hero.name = '​‮\u0000'; }],
    ];
    const rawCases = [
      // ATAQUE: prototype pollution vía clave propia "__proto__" en look y en hero
      ['look con __proto__', '{"skin":0,"__proto__":{"polluted":1,"skin":5},"constructor":{"prototype":{"polluted":2}}}', 'look'],
      ['hero con __proto__', '{"name":"H","__proto__":{"polluted":3,"look":{"skin":4}},"welcomed":true}', 'hero'],
    ];
    const runHero = async (label, raw, wantWelcome) => {
      const t0 = Date.now();
      const e = boot(raw);
      const { w, d } = e;
      const app = d.getElementById('app') || d.body;
      const homeOk = app.innerHTML.length > 100;
      const card = !!d.querySelector('[data-act="welcome"]');
      const polluted = w.eval('({}).polluted !== undefined || ({}).skin !== undefined || ({}).look !== undefined');
      const hb = d.querySelector('[data-act="hero"]'); if (hb) L.click(w, hb);
      const heroHtml = app.innerHTML;
      const injected = !!d.querySelector('script:not([src])') && [...d.querySelectorAll('img[onerror], [onload]')].length > 0;
      forceSave(w, d);
      let s = null; try { s = saved(w); } catch (x) { /* sin guardar */ }
      const h = s && s.hero;

      const bad = [];
      if (e.errors.length) bad.push('errores: ' + e.errors.slice(0, 2).join(' / '));
      if (!homeOk) bad.push('inicio vacío');
      if (polluted) bad.push('Object.prototype contaminado');
      if (!hb) bad.push('sin botón héroe');
      if (!/data-spr="hero"/.test(heroHtml)) bad.push('sin icono del héroe');
      if (injected) bad.push('HTML inyectado');
      if (!h) bad.push('no se guardó hero');
      else {
        if (Object.keys(h).join() !== 'name') bad.push('el héroe debe ser solo { name }: ' + Object.keys(h).join());
        if (typeof h.name !== 'string' || h.name.length > 20) bad.push('name inválido: ' + typeof h.name + ' ' + String(h.name).length);
        if (Object.getPrototypeOf(h) !== Object.prototype) bad.push('proto');
      }
      if (card) bad.push('la tarjeta de bienvenida ya no debe existir');
      if (Date.now() - t0 > 15000) bad.push('lento ' + (Date.now() - t0) + ' ms');
      ok('B hero hostil: ' + label + ' → arranca, normaliza y renderiza', !bad.length, bad.join('; '));
      w.close();
      return h;
    };
    for (const [label, mut] of heroCases) {
      const s = base(); mut(s);
      await runHero(label, JSON.stringify(s));
    }
    for (const [label, frag, where] of rawCases) {
      const s = JSON.stringify(base());
      const raw = where === 'look' ? s.replace(/"look":\{[^}]*\}/, '"look":' + frag) : s.replace(/"hero":\{"name":"H","look":\{[^}]*\},"welcomed":true\}/, '"hero":' + frag);
      if (raw === s) { ok('B ' + label + ' (armado del payload)', false, 'no se pudo inyectar'); continue; }
      await runHero(label, raw);
    }
    // línea base del rollback: un guardado nuevo cargado por una versión anterior solo vuelve a mostrar la tarjeta (se documenta en el spec §4)

    // ================= C) guardados hostiles en city =================
    const today = (w) => { const x = new w.Date(), p = (n) => String(n).padStart(2, '0'); return x.getFullYear() + '-' + p(x.getMonth() + 1) + '-' + p(x.getDate()); };
    const validAt = (at, sceneId) => { const sc = CityMove.scene(D, sceneId); if (!sc || !at || !CityMove.isNum(at.x) || !CityMove.isNum(at.z) || !CityMove.isNum(at.yaw)) return false;
      const Bs = sc.bounds;
      return at.x >= Bs.minX + RAD - 1e-9 && at.x <= Bs.maxX - RAD + 1e-9 && at.z >= Bs.minZ + RAD - 1e-9 && at.z <= Bs.maxZ - RAD + 1e-9 &&
        CityMove.portalAt(D, sceneId, at.x, at.z) === null &&
        !CityMove.boxesFor(D, sceneId).some((b) => { const cx = Math.min(b.maxX, Math.max(b.minX, at.x)), cz = Math.min(b.maxZ, Math.max(b.minZ, at.z)); return (at.x - cx) ** 2 + (at.z - cz) ** 2 < (RAD - 1e-6) ** 2; }); };
    const M = D.districts.M02, idsOf = (l) => l.map((x) => x.id);
    const cityOk = (c, tdy, bossPassed) => {
      const bad = [];
      if (!c || typeof c !== 'object') return ['city ausente'];
      const dm = c.d && c.d.M02; if (!dm) return ['d.M02 ausente'];
      Object.keys(dm.beaten || {}).forEach((k) => { if (!idsOf(M.creatures).includes(k)) bad.push('beaten id basura ' + k); else if (!/^\d{4}-\d{2}-\d{2}$/.test(dm.beaten[k]) || dm.beaten[k] > tdy) bad.push('beaten fecha ' + dm.beaten[k]); });
      Object.keys(dm.repairs || {}).forEach((k) => { if (!idsOf(M.repairs).includes(k) || dm.repairs[k] !== true) bad.push('repairs ' + k + '=' + dm.repairs[k]); });
      Object.keys(dm.taught || {}).forEach((k) => { if (!idsOf(M.apprentices).includes(k) || dm.taught[k] !== true) bad.push('taught ' + k + '=' + dm.taught[k]); });
      const cond = !!bossPassed && Object.keys(dm.taught || {}).length >= M.need;
      if (!!(c.restored && c.restored.M02) !== cond) bad.push('restored falsificado');
      if (!!(c.powers && c.powers.planos) !== cond) bad.push('powers falsificado');
      ['prologue', 'run'].forEach((k) => { if (typeof c[k] !== 'boolean') bad.push(k + ' no booleano'); });
      if ('bridgeSeen' in c) bad.push('bridgeSeen sigue en el guardado');
      if (!(c.scene === 'plaza' || own(D.districts, c.scene))) bad.push('scene inválida ' + String(c.scene));
      else if (!validAt(c.at, c.scene)) bad.push('at inválido ' + JSON.stringify(c.at) + ' en ' + c.scene);
      return bad;
    };
    const cityCases = [
      // ATAQUE: at con coordenadas enormes / -enormes
      ['at enormes', { at: { x: 1e308, z: -1e308, yaw: 1e308 } }],
      // ATAQUE: at como cadenas numéricas, arrays, null
      ['at cadenas', { at: { x: '5', z: '5', yaw: '1' } }], ['at array', { at: [0, 8, 0] }], ['at null', { at: null }],
      // ATAQUE: at dentro de un edificio / dentro de la torre / en la boca de un portal
      ['at en la torre', { at: { x: M.tower.x, z: M.tower.z, yaw: 0 } }], ['at en el portal de M02', { at: { x: D.plaza.portals.find((q) => q.dist === 'M02').x, z: D.plaza.portals.find((q) => q.dist === 'M02').z, yaw: 0 } }],
      ['at en la sede', { at: { x: D.plaza.hq.x, z: D.plaza.hq.z, yaw: 0 } }],
      // ATAQUE: yaw -0, subnormal, negativo enorme
      ['at yaw raros', { at: { x: 0, z: 8, yaw: -1e-320 } }], ['at yaw -1e300', { at: { x: 0, z: 8, yaw: -1e300 } }],
      // ATAQUE: ids basura, fechas futuras/imposibles, valores no booleanos
      ['ids basura', { beaten: { bit: '2099-01-01', silicio: '2026-02-30', kernel: 'hoy', zzz: '2020-01-01', toString: '2020-01-01' }, repairs: { r01: 'true', r02: 1, r99: true, constructor: true }, taught: { a01: true, a99: true, a02: 'si' } }],
      // ATAQUE: restored/powers falsificados sin cumplir la condición
      ['restored falsificado', { restored: { M02: true }, powers: { planos: true }, bridgeSeen: 'yes', run: 1, prologue: 'true' }],
      // ATAQUE: city entera como array / string
      ['city array', []], ['city string', 'boom'],
    ];
    const cityRaw = [
      // ATAQUE: __proto__ como clave propia en beaten/at
      ['beaten __proto__', '{"beaten":{"__proto__":{"bit":"2020-01-01"}},"at":{"__proto__":{"x":0},"x":1e9}}'],
    ];
    const runCity = async (label, raw, bossPassed) => {
      const e = boot(raw); const { w, d } = e;
      const tdy = today(w);
      const cb = d.querySelector('[data-act="city"]'); if (cb) L.click(w, cb);
      await tick(6);
      const o = w.__fakeOpts; const bad = [];
      if (!cb) bad.push('sin botón ciudad');
      if (!o) bad.push('la ciudad no creó el mundo');
      else {
        const hs = []; let st = o.state();
        hs.push(st && st.hero);
        // ATAQUE: dt hostiles en el bucle de la vista
        for (const dt of [NaN, -5, Infinity, 1e9, 0, 16, -0, 1e-300]) { try { o.tick(dt); st = o.state(); hs.push(st && st.hero); } catch (x) { bad.push('tick(' + dt + ') lanzó ' + x.message); } }
        const validHero = (h) => !!h && validAt({ x: h.x, z: h.z, yaw: 0 }, w.__fakeScene) && ['up', 'down', 'left', 'right'].includes(h.face) && CityMove.isNum(h.speed);
        if (hs.some((h) => !validHero(h))) bad.push('héroe inválido en la vista ' + JSON.stringify(hs.find((h) => !validHero(h))));
      }
      forceSave(w, d);
      const s = saved(w);
      cityOk(s.city, tdy, bossPassed).forEach((b) => bad.push(b));
      if (w.eval('({}).bit !== undefined || ({}).x !== undefined')) bad.push('Object.prototype contaminado');
      if (e.errors.length) bad.push('errores: ' + e.errors.slice(0, 2).join(' / '));
      ok('C city hostil: ' + label + ' → normaliza y la vista no se rompe', !bad.length, bad.join('; '));
      w.close();
    };
    for (const [label, c] of cityCases) await runCity(label, JSON.stringify(base({ city: c })), false);
    for (const [label, frag] of cityRaw) await runCity(label, JSON.stringify(base()).replace(/\}$/, ',"city":' + frag + '}'), false);

    // C-prop: normalizeCity(JSON arbitrario) siempre devuelve un estado válido e idempotente
    {
      const tdy = '2026-11-12';
      const jv = fc.jsonValue({ maxDepth: 3 });
      const num = fc.oneof(fc.double({ noNaN: false }), fc.integer(), fc.constant(1e308), fc.constant(-1e308), fc.constant(-0));
      const arbCity = fc.oneof(jv, fc.record({
        at: fc.oneof(jv, fc.record({ x: num, z: num, yaw: num }, { requiredKeys: [] }), fc.record({ x: fc.double({ min: B.minX - 20, max: B.maxX + 20, noNaN: true }), z: fc.double({ min: B.minZ - 20, max: B.maxZ + 20, noNaN: true }), yaw: num })),
        beaten: fc.dictionary(fc.oneof(fc.constantFrom(...idsOf(M.creatures), '__proto__', 'constructor'), fc.string()), fc.oneof(fc.constantFrom('2026-01-01', '2099-01-01', '2026-02-30', '2026-11-12', '2026-11-13'), jv)),
        repairs: fc.dictionary(fc.oneof(fc.constantFrom(...idsOf(M.repairs)), fc.string()), fc.oneof(fc.constant(true), jv)),
        taught: fc.dictionary(fc.oneof(fc.constantFrom(...idsOf(M.apprentices)), fc.string()), fc.oneof(fc.constant(true), jv)),
        restored: jv, powers: jv, prologue: jv, run: jv, bridgeSeen: jv,
      }, { requiredKeys: [] }));
      const r = fc.check(fc.property(arbCity, fc.boolean(), (raw, bp) => {
        const c = CityStory.normalizeCity(raw, D, bp, tdy);
        const bad = cityOk(c, tdy, bp);
        const c2 = CityStory.normalizeCity(JSON.parse(JSON.stringify(c)), D, bp, tdy);
        if (JSON.stringify(c2) !== JSON.stringify(c)) bad.push('no idempotente');
        return bad.length === 0;
      }), { numRuns: 3000, seed: SEED });
      ok('C-P1 normalizeCity(cualquier JSON) válido e idempotente (3000 ejecuciones)', !r.failed, r.failed ? 'contraejemplo: ' + JSON.stringify(r.counterexample).slice(0, 300) + ' seed=' + r.seed : '');
    }

    // ================= D) propiedades de batalla =================
    const hudOf = (d) => {
      const h = d.querySelector('.hearts'), b = d.querySelector('.hpbar'); if (!h || !b) return null;
      const m1 = /Energía (-?\d+) de (\d+)/.exec(h.getAttribute('aria-label')), m2 = /villano (-?\d+) de (\d+)/.exec(b.getAttribute('aria-label'));
      return { en: +m1[1], enMax: +m1[2], hp: +m2[1], hpMax: +m2[2], hearts: h.querySelectorAll('span').length, heartsOn: h.querySelectorAll('.on').length };
    };
    const isResults = (d) => !!d.querySelector('.gtitle') && !d.querySelector('.prompt');
    const won = (d) => /¡Victoria!/.test((d.querySelector('.gtitle') || {}).textContent || '');
    const VIL = M.creatures;
    // pool mínimo por criatura: con energía 4 (Valentía) + 2 escudos, una batalla puede necesitar 4 + 4 - 1 + 2 = 9 preguntas
    {
      const e = boot(JSON.stringify(base({ xp: 1e6 })));
      const sizes = VIL.map((c) => { const it = e.w.__CITY_ROUND__.battleItems({ mod: 'M02', topics: c.topics, n: 8 }); return [c.id, it.length + it.pool.length]; });
      console.log('INFO preguntas de batalla por criatura: ' + sizes.map((x) => x.join('=')).join(' '));
      ok('D0 cada criatura tiene >= 9 preguntas (alcanza para energía 4 + escudos)', sizes.every((x) => x[1] >= 9), JSON.stringify(sizes));
      e.w.close();
    }
    let battleRuns = 0, answers = 0, wins = 0, losses = 0, regens = 0, powers = 0;
    const variants = [
      ['nivel 1', { xp: 0 }],
      ['todos los poderes', { xp: 1e6 }],
      ['todos los poderes + Valentía + Resiliencia', { xp: 1e6, virtues: { valentia: 1, resiliencia: 1 } }],
    ];
    for (const [vlabel, over] of variants) {
      const e = boot(JSON.stringify(base(over))); const { w, d } = e;
      const per = Math.ceil(BATTLES / variants.length);
      const viol = [];
      for (let k = 0; k < per && viol.length < 5; k++) {
        const seed = SEED + k * 7919 + vlabel.length;
        const r = L.rng(seed);
        const vil = r.pick(VIL);
        w.__CITY_ROUND__.startRound({ kind: 'battle', title: 'Batalla', mid: 'M02', back: { name: 'home' }, villain: { id: vil.id, name: vil.name }, city: { kind: 'battle', id: vil.id, mid: 'M02' } },
          w.__CITY_ROUND__.battleItems({ mod: 'M02', topics: vil.topics, n: 8 }));
        battleRuns++;
        let prev = hudOf(d), last = prev, n = 0, guard = 0, bad = '';
        if (!prev || !(prev.en === prev.enMax && (prev.enMax === 3 || prev.enMax === 4)) || prev.hp !== 4) bad = 'inicio ' + JSON.stringify(prev);
        while (!bad && !isResults(d) && guard++ < 300) {
          const pr = r();
          const pend = d.querySelector('[data-act="regenyes"]');
          if (pend) { regens++; L.click(w, r.bool() ? pend : d.querySelector('[data-act="regenno"]')); }
          else if (d.querySelector('#nextbtn')) { if (r.bool(0.1)) L.click(w, d.querySelector('#nextbtn')); L.click(w, d.querySelector('#nextbtn') || d.body); }  // ATAQUE: doble clic en Siguiente
          else if (pr < 0.2) { const pw = [...d.querySelectorAll('[data-act="power"]:not([disabled])')]; if (pw.length) { powers++; L.click(w, r.pick(pw)); } }
          else {
            const q = L.findQ(w, d); const opts = [...d.querySelectorAll('.opt:not([disabled])')];
            if (!opts.length) { bad = 'sin opciones ni siguiente'; break; }
            const right = q && r.bool(0.5) ? L.optBtn(d, L.correctText(q)) : null;
            const t = right && !right.disabled ? right : r.pick(opts);
            L.click(w, t); if (r.bool(0.1) && !t.disabled) L.click(w, t);   // ATAQUE: doble clic en la opción
            n++;
          }
          const h = hudOf(d);
          if (h) {
            if (h.enMax !== 3 && h.enMax !== 4) bad = 'energía máxima inesperada: ' + h.enMax;
            else if (h.en < 0 || h.en > h.enMax) bad = 'energía fuera de [0,' + h.enMax + ']: ' + h.en;
            else if (h.hp < 0 || h.hp > 4) bad = 'vida fuera de [0,4]: ' + h.hp;
            else if (h.hp > last.hp) bad = 'la vida subió ' + last.hp + '→' + h.hp;
            else if (h.heartsOn !== h.en || h.hearts !== h.enMax) bad = 'HUD corazones ' + h.heartsOn + '/' + h.hearts + ' vs ' + h.en + '/' + h.enMax;
            last = h;
          }
        }
        answers += n; if (isResults(d)) { if (won(d)) wins++; else losses++; }
        if (!bad && !isResults(d)) bad = 'no terminó (' + guard + ' acciones)';
        if (!bad && won(d) && last.hp !== 0) bad = 'victoria con vida ' + last.hp;
        if (!bad && !won(d) && last.hp === 0) bad = 'derrota con vida 0';
        if (!bad && !won(d) && last.en !== 0) bad = 'derrota con energía ' + last.en + ' (vida ' + last.hp + ')';
        if (!bad && last.enMax !== ((over.virtues && over.virtues.valentia) ? 4 : 3)) bad = 'enMax ' + last.enMax + ' no coincide con Valentía';
        if (bad) viol.push('seed=' + seed + ' ' + vil.id + ': ' + bad);
        const home = d.querySelector('[data-act="home"]') || d.querySelector('[data-act="back"]'); if (home) L.click(w, home);
      }
      ok('D1-D5 batalla [' + vlabel + '] ×' + per + ': energía en [0,máx], vida en [0,4] y no sube, HUD = energía, victoria <=> vida 0, derrota => energía 0, termina', !viol.length && !e.errors.length, viol.concat(e.errors.slice(0, 2)).join(' | '));
      w.close();
    }
    console.log('INFO batallas ' + battleRuns + ': ' + wins + ' victorias, ' + losses + ' derrotas, ' + answers + ' respuestas, ' + regens + ' regeneraciones, ' + powers + ' poderes');
    // ATAQUE: el gancho con menos preguntas que las necesarias (sin pool): ¿derrota con energía > 0?
    {
      const e = boot(JSON.stringify(base())); const { w, d } = e;
      const it = w.__CITY_ROUND__.battleItems({ mod: 'M02', topics: ['T01'], n: 2 }); it.pool = [];
      w.__CITY_ROUND__.startRound({ kind: 'battle', title: 'B', mid: 'M02', back: { name: 'home' }, villain: { id: 'bit', name: 'Bit' }, city: { kind: 'battle', id: 'bit', mid: 'M02' } }, it);
      for (let i = 0; i < 2; i++) { const q = L.findQ(w, d); L.click(w, L.optBtn(d, L.correctText(q))); L.click(w, d.querySelector('#nextbtn')); }
      const h = hudOf(d);
      // con el pool agotado y vida y energía: "Empate" (no victoria ni derrota)
      ok('D6 pool agotado (2 preguntas, sin pool): termina en "Empate"', isResults(d) && !won(d) && /Empate/.test(d.querySelector('.gtitle').textContent), 'resultado ' + (isResults(d) ? d.querySelector('.gtitle').textContent : 'sigue') + (h ? ' hud ' + JSON.stringify(h) : ''));
      e.w.close();
    }
    // Valentía en el guardado hoy no cambia la energía: el máximo 3 está fijo en 4 sitios del motor
    {
      const eng = fs.readFileSync(path.join(ROOT, 'engine.html'), 'utf8');
      const sites = ['en: 3', 'B.en < 3', 'i < 3; i++) hearts', 'de 3">'].filter((s) => eng.includes(s));
      ok('D7 la energía máxima ya no está escrita a mano en el motor (R.battle.max)', sites.length === 0, sites.join(' | '));
    }

    // ================= E) movimiento relativo a pantalla (camYaw = 0) =================
    {
      const boxesF = CityMove.boxesFor(D, 'M02'), boxesT = boxesF;   // M02 ya no tiene puente: las cajas no dependen de la restauración
      const inside = (x, z, boxes) => boxes.some((b) => { const cx = Math.min(b.maxX, Math.max(b.minX, x)), cz = Math.min(b.maxZ, Math.max(b.minZ, z)); return (x - cx) ** 2 + (z - cz) ** 2 < (RAD - 1e-6) ** 2; });
      const inBounds = (x, z) => x >= B.minX + RAD - 1e-6 && x <= B.maxX - RAD + 1e-6 && z >= B.minZ + RAD - 1e-6 && z <= B.maxZ - RAD + 1e-6;
      const hostileNum = [NaN, Infinity, -Infinity, 1e308, -1e308, -0, 5, -5, 1e-320, undefined, null, '1', [1], {}, true];
      const r = L.rng(SEED);
      const freePos = (boxes) => { for (;;) { const x = B.minX + r() * (B.maxX - B.minX), z = B.minZ + r() * (B.maxZ - B.minZ); if (inBounds(x, z) && !inside(x, z, boxes)) return { x, z, yaw: 0, vx: 0, vz: 0, speed: 0 }; } };
      const pickN = (p) => (r() < p ? r.pick(hostileNum) : (r() * 2 - 1) * (r() < 0.1 ? 3 : 1));
      // E1 fuzzing masivo: caminantes aleatorios, intents y dt hostiles
      let steps = 0, viol = null; const t0 = Date.now();
      outer: for (let walker = 0; steps < MOVE_STEPS; walker++) {
        const restored = r.bool(), boxes = restored ? boxesT : boxesF;
        let s = freePos(boxes);
        for (let i = 0; i < 2000 && steps < MOVE_STEPS; i++, steps++) {
          const intent = r() < 0.05 ? r.pick([null, undefined, 'x', 7, []]) : { mx: pickN(0.1), mz: pickN(0.1), run: r.bool(0.4), camYaw: r() < 0.97 ? 0 : r.pick(hostileNum) };
          const dt = r() < 0.15 ? r.pick([NaN, -1, Infinity, -Infinity, 1e9, 0, -0, 1e-320, 0.1, 5, '0.016', null]) : r() * 0.05;
          const prev = s;
          let n;
          try { n = CityMove.step(s, intent, dt, boxes, { canRun: r.bool(0.7), radius: RAD, safe: { x: prev.x, z: prev.z, yaw: prev.yaw } }); }
          catch (x) { viol = 'lanzó ' + x.message + ' paso ' + steps; break outer; }
          if (!n || ![n.x, n.z, n.yaw, n.vx, n.vz, n.speed].every(Number.isFinite)) { viol = 'salida no finita ' + JSON.stringify(n) + ' desde ' + JSON.stringify(prev) + ' intent ' + JSON.stringify(intent) + ' dt ' + dt; break outer; }
          if (!inBounds(n.x, n.z)) { viol = 'fuera de bounds ' + JSON.stringify(n) + ' desde ' + JSON.stringify(prev) + ' intent ' + JSON.stringify(intent) + ' dt ' + dt; break outer; }
          if (inside(n.x, n.z, boxes)) { viol = 'dentro de una caja ' + JSON.stringify(n) + ' desde ' + JSON.stringify(prev) + ' intent ' + JSON.stringify(intent) + ' dt ' + dt + ' restored ' + restored; break outer; }
          if (Math.hypot(n.x - prev.x, n.z - prev.z) > 7 * 0.05 + 1e-6 && Math.hypot(n.x - prev.x, n.z - prev.z) > RAD * 2) { viol = 'salto ' + Math.hypot(n.x - prev.x, n.z - prev.z); break outer; }
          s = n;
          // ATAQUE: estado corrupto entre pasos (velocidad enorme / NaN) — debe volver a safe o acotarse
          if (r() < 0.002) s = Object.assign({}, s, { vx: r.pick([1e308, NaN, -1e300, Infinity]), vz: r.pick([1e308, 0, -1e300]) });
        }
      }
      ok('E1 fuzzing step camYaw=0: ' + steps + ' pasos (' + (Date.now() - t0) + ' ms) sin salir de bounds, sin entrar en cajas, salida finita, sin teletransporte', !viol, viol);

      // E2 propiedad: secuencias arbitrarias desde cualquier posición libre (fast-check, shrink al mínimo)
      const arbNum = fc.oneof(fc.double({ min: -1, max: 1, noNaN: true }), fc.constantFrom(NaN, Infinity, -Infinity, 1e308, -0, 2, -2));
      const arbStep = fc.record({ mx: arbNum, mz: arbNum, run: fc.boolean(), dt: fc.oneof(fc.double({ min: 0, max: 0.05, noNaN: true }), fc.constantFrom(NaN, -1, Infinity, 1e9, 0, 0.1)) });
      const arbStart = fc.record({ x: fc.double({ min: B.minX + RAD, max: B.maxX - RAD, noNaN: true }), z: fc.double({ min: B.minZ + RAD, max: B.maxZ - RAD, noNaN: true }), restored: fc.boolean() })
        .filter((p) => !inside(p.x, p.z, p.restored ? boxesT : boxesF));
      const p2 = fc.check(fc.property(arbStart, fc.array(arbStep, { minLength: 1, maxLength: 300 }), (st, seq) => {
        const boxes = st.restored ? boxesT : boxesF; let s = { x: st.x, z: st.z, yaw: 0, vx: 0, vz: 0, speed: 0 };
        for (const k of seq) { s = CityMove.step(s, { mx: k.mx, mz: k.mz, run: k.run }, k.dt, boxes, { canRun: true, radius: RAD, safe: s }); if (!inBounds(s.x, s.z) || inside(s.x, s.z, boxes) || !Number.isFinite(s.x + s.z + s.vx + s.vz + s.yaw)) return false; }
        return true;
      }), { numRuns: 1500, seed: SEED });
      ok('E2 prop: cualquier secuencia (≤300 pasos) desde posición libre queda en bounds y fuera de cajas (1500 ejecuciones)', !p2.failed, p2.failed ? 'contraejemplo ' + JSON.stringify(p2.counterexample).slice(0, 400) + ' seed=' + p2.seed : '');

      // E3 oráculo de dirección en pantalla: en espacio libre, con camYaw 0, arriba (mz<0) => z baja; derecha (mx>0) => x sube
      const p3 = fc.check(fc.property(fc.double({ min: -1, max: 1, noNaN: true }), fc.double({ min: -1, max: 1, noNaN: true }), (mx, mz) => {
        fc.pre(Math.hypot(mx, mz) > 0.05);
        let s = { x: 0, z: 20, yaw: 0, vx: 0, vz: 0, speed: 0 };     // plaza sur, libre a varios metros
        for (let i = 0; i < 20; i++) s = CityMove.step(s, { mx, mz }, 0.05, [], { radius: RAD });
        const dx = s.x - 0, dz = s.z - 20, len = Math.hypot(dx, dz), il = Math.hypot(mx, mz);
        return len > 0 && Math.abs(dx / len - mx / il) < 1e-6 && Math.abs(dz / len - mz / il) < 1e-6 && Math.abs(Math.atan2(-s.vx, -s.vz) - s.yaw) < 1e-9;
      }), { numRuns: 1000, seed: SEED });
      ok('E3 prop: con camYaw 0 el desplazamiento sigue la dirección de pantalla (mx→+x, mz→+z) y yaw = dirección de la velocidad (1000)', !p3.failed, p3.failed ? JSON.stringify(p3.counterexample) : '');

      // E4 ATAQUE: velocidad máxima de carrera hacia una pared delgada (muros de la plaza, d = 2) en todos los ángulos: sin túnel
      let tunnel = null;
      const boxesP = CityMove.boxesFor(D, 'plaza'), PB = D.plaza.bounds, inBP = (x, z) => x >= PB.minX + RAD - 1e-6 && x <= PB.maxX - RAD + 1e-6 && z >= PB.minZ + RAD - 1e-6 && z <= PB.maxZ - RAD + 1e-6;
      for (const rd of D.plaza.portals.filter((q) => !D.districts[q.dist])) {
        const wl = rd;
        for (let a = 0; a < 360 && !tunnel; a += 3) {
          const ang = a * Math.PI / 180, sx = wl.x - Math.cos(ang) * 4, sz = wl.z - Math.sin(ang) * 4;
          if (!inBP(sx, sz) || inside(sx, sz, boxesP)) continue;
          let s = { x: sx, z: sz, yaw: 0, vx: Math.cos(ang) * 7, vz: Math.sin(ang) * 7, speed: 7 };
          for (let i = 0; i < 80; i++) { s = CityMove.step(s, { mx: Math.cos(ang), mz: Math.sin(ang), run: true }, 0.05, boxesP, { canRun: true, radius: RAD, safe: s }); if (inside(s.x, s.z, boxesP)) { tunnel = rd.dist + ' ang ' + a + ' ' + JSON.stringify(s); break; } }
        }
      }
      ok('E4 carrera contra los muros delgados de la plaza en 120 ángulos: sin túnel', !tunnel, tunnel);
    }
  } catch (x) { results.push(['FAIL', 'excepción', x.stack]); }
  const fails = results.filter((r) => r[0] === 'FAIL');
  results.forEach((r) => { if (r[0] === 'FAIL') console.log(r.join(' | ')); });
  console.log((fails.length ? 'SPEC2D_ATTACK FALLAS ' + fails.length : 'SPEC2D_ATTACK OK') + ' (' + results.length + ' chequeos)');
  process.exit(fails.length ? 1 : 0);
})();
