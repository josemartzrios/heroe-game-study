// Ataque de revisión a los distritos (spec 2026-11-12-ciudad-distritos §2, §4.3, §5, §8, §9, §13). Busca huecos que NO cubren
// spec_districts_attack, plan_districts_props, route_props, city_fuzz, city_base_attack, spec2d_attack, review_attack ni xss_data:
//  A) story.js: mirror (ida y vuelta y entradas hostiles), applyRestore (idempotencia y consistencia con normalizeCity), restoration,
//     rankOf (oráculo) y nextObjective (robustez y coherencia con los datos) — propiedades fast-check.
//  B) move.js: portalAt/boxesFor/scene con ids y números hostiles; invariantes de llegada sobre los datos reales.
//  C) route.js: reentrada (callbacks que vuelven a llamar al flujo).
//  D) check_district.mjs: distritos mal formados (nunca debe lanzar) y distritos rotos que el validador acepta (falsos negativos).
//  E) validate.mjs: la guarda de ganchos y de identificadores retirados (falsos negativos y falsos positivos por texto de datos).
//  F) vista (jsdom, mundo falso): cambio de escena con hoja/pausa abierta, suspensión durante el fundido, hojas durante el fundido,
//     localStorage corrupto al cargar.
// Uso: node tests/adv/review_districts_attack.cjs [RUNS=1000] [SEED=20261113]   (sale con 1 si algo rompe)
const fc = require('fast-check');
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { JSDOM, VirtualConsole } = require('jsdom');
const CM = require('../../city/move.js');
const CS = require('../../city/story.js');
const CityRoute = require('../../city/route.js');

const RUNS = +(process.argv[2] || 1000), SEED = +(process.argv[3] || 20261113);
const TODAY = '2026-11-13';
const ROOT = path.join(__dirname, '..', '..');
const HTML0 = fs.readFileSync(path.join(ROOT, 'juego_estudio.html'), 'utf8');
const KEY = 'estudio_isw_v1';
const results = [];
const ok = (name, cond, extra) => results.push([cond ? 'PASS' : 'FAIL', name, cond ? '' : (extra || '')]);
const safeStr = (x) => { try { return JSON.stringify(x, (k, v) => (typeof v === 'number' && !isFinite(v)) ? String(v) : v).slice(0, 500); } catch (e) { return String(x); } };
let propRuns = 0, propCount = 0;
function prop(name, arb, pred, runs = RUNS) {
  propCount++; propRuns += runs;
  const r = fc.check(fc.property(arb, pred), { numRuns: runs, seed: SEED, endOnFailure: false });
  ok('PROP ' + name + ' (' + runs + ' ejecuciones, semilla ' + SEED + ')', !r.failed,
    r.failed ? 'contraejemplo=' + safeStr(r.counterexample) + ' error=' + String(r.errorInstance && r.errorInstance.message || r.error).slice(0, 300) : '');
}
const throwsMsg = (fn) => { try { fn(); return null; } catch (e) { return String(e && e.message || e); } };
const clone = (x) => JSON.parse(JSON.stringify(x));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const D = (await import(path.join(ROOT, 'city', 'districts.mjs'))).city;
  const { checkDistrict, checkPlaza } = await import(path.join(ROOT, 'city', 'check_district.mjs'));
  const vm = require('vm');
  const MODULES = vm.runInNewContext(HTML0.match(/const MODULES = (\[[\s\S]*?\n\]);/)[1]);
  const modOf = (id) => MODULES.find((m) => m.id === id);
  const MIDS = Object.keys(D.districts), R = D.radius || 0.4;
  const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const HOSTILE_IDS = ['__proto__', 'constructor', 'prototype', 'toString', 'hasOwnProperty', 'valueOf', '', 'M99', 'm08', 'M08 ', 'plaza ', 'PLAZA'];

  // ---------- generadores de un S.city normalizado (lo que de verdad vive en S) ----------
  const subOf = (arr) => fc.subarray(arr);
  const distRawArb = (mid) => {
    const M = D.districts[mid];
    return fc.record({
      beaten: subOf(M.creatures.map((c) => c.id)).chain((ids) => fc.tuple(...ids.map(() => fc.constantFrom('2026-01-01', TODAY, '2027-01-01', 'x'))).map((ds) => Object.fromEntries(ids.map((id, i) => [id, ds[i]])))),
      repairs: subOf(M.repairs.map((x) => x.id)).map((ids) => Object.fromEntries(ids.map((id) => [id, true]))),
      taught: subOf(M.apprentices.map((x) => x.id)).map((ids) => Object.fromEntries(ids.map((id) => [id, true]))),
      route: fc.record({ done: fc.oneof(fc.integer({ min: -2, max: 14 }), fc.constantFrom(NaN, Infinity, '3', 3.5)) })
    });
  };
  const rawArb = fc.record({
    prologue: fc.boolean(), run: fc.boolean(),
    scene: fc.constantFrom('plaza', ...MIDS, ...HOSTILE_IDS),
    at: fc.record({ x: fc.double({ min: -80, max: 80, noNaN: true }), z: fc.double({ min: -200, max: 70, noNaN: true }), yaw: fc.double({ noNaN: true }) }),
    d: fc.record(Object.fromEntries(MIDS.map((m) => [m, distRawArb(m)])))
  }, { requiredKeys: ['d'] });
  const bossArb = fc.subarray(MIDS);
  const bpOf = (set) => (mid) => set.indexOf(mid) >= 0;
  const caseArb = fc.tuple(rawArb, bossArb);
  const normC = (raw, set) => CS.normalizeCity(raw, D, bpOf(set), TODAY);
  const condOf = (C, mid, set) => set.indexOf(mid) >= 0 && CS.taughtCount(C, D, mid) >= D.districts[mid].need;

  // =====================================================================================================
  // A) story.js
  // =====================================================================================================
  prop('A1 mirror: normalize(JSON(mirror(C))) == C y los campos planos son copias exactas de d.M02', caseArb, ([raw, set]) => {
    const C = normC(raw, set), M = CS.mirror(clone(C));
    const back = CS.normalizeCity(JSON.parse(JSON.stringify(M)), D, bpOf(set), TODAY);
    assert.deepStrictEqual(back, C);
    assert.deepStrictEqual(M.beaten, C.d.M02.beaten); assert.deepStrictEqual(M.repairs, C.d.M02.repairs); assert.deepStrictEqual(M.taught, C.d.M02.taught);
    // una pestaña vieja lee los planos: si se le quita d, la migración debe dar el mismo progreso de M02
    const old = clone(M); delete old.d;
    const mig = CS.normalizeCity(old, D, bpOf(set), TODAY);
    assert.deepStrictEqual(mig.d.M02, C.d.M02);
    return true;
  });

  prop('A3 applyRestore sobre un C normalizado no cambia nada y devuelve changed=[]; dos veces seguidas también', caseArb, ([raw, set]) => {
    const C = normC(raw, set), before = clone(C);
    const r1 = CS.applyRestore(C, D, bpOf(set)), r2 = CS.applyRestore(C, D, bpOf(set));
    assert.deepStrictEqual(r1.changed, []); assert.deepStrictEqual(r2.changed, []);
    assert.deepStrictEqual(clone(C), before);
    return true;
  });
  prop('A4 applyRestore tras enseñar/quitar aprendices y cambiar jefes: changed = exactamente los que pasaron a restaurados; restored/powers == normalizeCity', fc.tuple(caseArb, bossArb, fc.array(fc.tuple(fc.constantFrom(...MIDS), fc.nat(20), fc.boolean()), { maxLength: 20 })), ([[raw, set], set2, flips]) => {
    const C = normC(raw, set), was = Object.assign({}, C.restored);
    flips.forEach(([mid, i, on]) => { const ap = D.districts[mid].apprentices; const id = ap[i % ap.length].id; if (on) C.d[mid].taught[id] = true; else delete C.d[mid].taught[id]; });
    const r = CS.applyRestore(C, D, bpOf(set2));
    const want = MIDS.filter((m) => condOf(C, m, set2) && was[m] !== true);
    assert.deepStrictEqual(r.changed, want);
    const N = CS.normalizeCity(JSON.parse(JSON.stringify(C)), D, bpOf(set2), TODAY);
    assert.deepStrictEqual(C.restored, N.restored); assert.deepStrictEqual(C.powers, N.powers);
    assert.deepStrictEqual(CS.applyRestore(C, D, bpOf(set2)).changed, []);
    return true;
  });
  prop('A5 restoration es entero en [0,100], 100 ⇔ restaurado (con jefe), monótona al enseñar', fc.tuple(caseArb, fc.constantFrom(...MIDS), fc.boolean()), ([[raw, set], mid, boss]) => {
    const C = normC(raw, set), p = CS.restoration(C, D, mid, boss);
    if (!Number.isInteger(p) || p < 0 || p > 100) throw new Error('p=' + p);
    const cond = boss && CS.taughtCount(C, D, mid) >= D.districts[mid].need;
    if ((p === 100) !== cond) throw new Error('p=' + p + ' cond=' + cond);
    const ap = D.districts[mid].apprentices.find((a) => C.d[mid].taught[a.id] !== true);
    if (ap) { C.d[mid].taught[ap.id] = true; const p2 = CS.restoration(C, D, mid, boss); if (p2 < p) throw new Error('baja al enseñar ' + p + '→' + p2); }
    return true;
  });
  prop('A6 rankOf == oráculo (umbral más alto ≤ distritos restaurados)', fc.tuple(caseArb, fc.dictionary(fc.constantFrom(...MIDS, 'M99', 'constructor'), fc.anything())), ([[raw, set], extra]) => {
    const C = normC(raw, set); Object.assign(C.restored, extra);
    const n = MIDS.filter((m) => C.restored[m] === true).length;
    const want = D.ranks.filter((rk) => n >= rk[0]).pop()[1];
    return CS.rankOf(C, D) === want;
  });
  const KINDS = new Set(['director', 'portal', 'none', 'plaza', 'tower', 'mentor', 'practice', 'creature', 'route', 'repair', 'apprentice']);
  const ctxVal = fc.constantFrom(true, false, 0, 1, 3, NaN, -1, Infinity, undefined, null, '1', 'x');
  const ctxArb = fc.record({
    learned: fc.func(ctxVal), stars: fc.func(ctxVal), beatenEver: fc.func(ctxVal), beatenToday: fc.func(ctxVal),
    bossUnlocked: ctxVal, bossPassed: ctxVal
  });
  prop('A7 nextObjective nunca lanza y su objetivo existe en los datos de la escena (todas las escenas, ctx con valores raros)', fc.tuple(caseArb, fc.constantFrom('plaza', ...MIDS, ...HOSTILE_IDS), ctxArb), ([[raw, set], sc, ctx]) => {
    const C = normC(raw, set), o = CS.nextObjective(C, D, sc, sc === 'plaza' ? null : ctx);
    if (!o || !KINDS.has(o.kind) || typeof o.label !== 'string') throw new Error('forma ' + safeStr(o));
    if (sc !== 'plaza' && !own(D.districts, sc)) { if (o.kind !== 'none') throw new Error('escena hostil ' + sc + ' → ' + o.kind); return true; }
    if (sc === 'plaza') {
      if (o.kind === 'portal' && (!own(D.districts, o.id) || C.restored[o.id] === true)) throw new Error('portal a ' + o.id);
      if (o.kind === 'portal' && D.order.find((m) => own(D.districts, m) && C.restored[m] !== true) !== o.id) throw new Error('no es el recomendado: ' + o.id);
      return true;
    }
    const M = D.districts[sc];
    if (C.restored[sc] === true) { if (o.kind !== 'plaza') throw new Error('restaurado y objetivo ' + o.kind); return true; }
    const idsBy = { tower: [M.tower.id], mentor: M.mentors.map((x) => x.id), practice: M.mentors.map((x) => x.id), creature: M.creatures.map((x) => x.id), repair: M.repairs.map((x) => x.id), apprentice: M.apprentices.map((x) => x.id), route: M.route ? M.route.pads.map((_, i) => 'pad' + i) : [] };
    if (idsBy[o.kind] && idsBy[o.kind].indexOf(o.id) < 0) throw new Error(o.kind + ' con id inexistente ' + o.id);
    if (o.kind === 'plaza' || o.kind === 'director' || o.kind === 'portal') throw new Error('kind de plaza en un distrito: ' + o.kind);
    if (ctx.bossUnlocked && !ctx.bossPassed && o.kind !== 'tower') throw new Error('torre desbloqueada y objetivo ' + o.kind);
    if (o.kind === 'repair' && C.d[sc].repairs[o.id] === true) throw new Error('reparación ya hecha ' + o.id);
    return true;
  });
  prop('A8 nextObjective con C.d corrupto (route.done/repairs/taught basura, no normalizado) no lanza y la ruta apunta a un pad real', fc.tuple(fc.constantFrom(...MIDS), fc.anything(), fc.anything(), ctxArb), ([mid, junkD, junkR, ctx]) => {
    const C = { prologue: true, restored: {}, d: { [mid]: { route: { done: junkR }, repairs: junkD, taught: junkD } } };
    const o = CS.nextObjective(C, D, mid, ctx);
    if (o.kind === 'route') { const k = +o.id.slice(3); if (!Number.isInteger(k) || k < 0 || k >= D.districts[mid].route.pads.length) throw new Error('pad ' + o.id); }
    return true;
  });

  // =====================================================================================================
  // B) move.js
  // =====================================================================================================
  const anyId = fc.oneof(fc.constantFrom('plaza', ...MIDS, ...HOSTILE_IDS), fc.anything());
  const anyNum = fc.oneof(fc.double(), fc.constantFrom(NaN, Infinity, -Infinity, -0, '0', null, [0], { valueOf: () => 0 }), fc.double({ min: -100, max: 100, noNaN: true }));
  prop('B1 scene/boxesFor/portalAt con ids y números hostiles: nunca lanza; portalAt ∈ {null, plaza, distrito propio}; escena inválida → null y []', fc.tuple(anyId, anyNum, anyNum), ([id, x, z]) => {
    const sc = CM.scene(D, id), bx = CM.boxesFor(D, id), p = CM.portalAt(D, id, x, z);
    const valid = id === 'plaza' || (typeof id === 'string' && own(D.districts, id));
    if (!valid && (sc !== null || bx.length !== 0 || p !== null)) throw new Error('escena inválida resuelta: ' + safeStr(id));
    if (p !== null && p !== 'plaza' && !own(D.districts, p)) throw new Error('portal ' + safeStr(p));
    if (p !== null && (typeof x !== 'number' || typeof z !== 'number')) throw new Error('coerciona números: ' + safeStr([x, z]));
    if (valid && id !== 'plaza' && p !== null && p !== 'plaza') throw new Error('un distrito devuelve portal ' + p);
    return true;
  });
  // ATAQUE: invariantes de llegada con los datos reales: entrar por la entrada o volver por back nunca cae en una caja ni en un portal (rebote inmediato)
  { const bad = [];
    for (const mid of MIDS) {
      const M = D.districts[mid], e = M.entry, bx = CM.boxesFor(D, mid);
      if (CM.portalAt(D, mid, e.x, e.z) !== null) bad.push(mid + ': entry dentro de la salida');
      if (bx.some((b) => { const cx = Math.max(b.minX, Math.min(e.x, b.maxX)), cz = Math.max(b.minZ, Math.min(e.z, b.maxZ)); return Math.hypot(e.x - cx, e.z - cz) < R; })) bad.push(mid + ': entry solapa una caja');
    }
    for (const p of D.plaza.portals) if (own(D.districts, p.dist) && CM.portalAt(D, 'plaza', p.back.x, p.back.z) !== null) bad.push('back de ' + p.dist + ' dentro de un portal');
    if (CM.portalAt(D, 'plaza', D.plaza.entry.x, D.plaza.entry.z) !== null) bad.push('entry de la plaza dentro de un portal');
    ok('B2 datos reales: ninguna llegada (entry de cada escena, back de cada portal) cae en una caja ni en un portal', bad.length === 0, bad.join(' | ')); }

  // =====================================================================================================
  // C) route.js: reentrada
  // =====================================================================================================
  const { stations } = await import(path.join(ROOT, 'city', 'districts', 'm08_route.mjs'));
  const bankFor = (sts, n) => { const by = {}; sts.forEach((s) => s.topics.forEach((t) => { if (!by[t]) by[t] = Array.from({ length: n }, (_, k) => ({ id: t + '-' + k, topic: t })); })); return by; };
  prop('C1 CityRoute reentrante (onStation→ask, onAsk→answer, onResult→next síncronos): termina en summary, cada estación una vez, xp = suma de onResult', fc.tuple(fc.array(fc.boolean(), { minLength: 60, maxLength: 60 }), fc.integer({ min: 1, max: 4 }), fc.integer({ min: 0, max: 9 })), ([oks, nq, from]) => {
    let i = 0, sum = 0, sums = 0; const st = [], layers = [];
    const f = CityRoute.create({
      stations, questionsByTopic: bankFor(stations, nq), from, rnd: () => 0.3,
      prep: (q) => ({ q, labels: ['a', 'b'], correct: 0 }),
      onStation: (k) => { st.push(k); f.ask(); },
      onAsk: (it) => { f.answer(oks[i++ % oks.length] ? it.correct : 1); },
      onResult: (r) => { const g = r.ok ? 10 : 0; sum += g; f.next(); return g; },
      onLayer: (n) => layers.push(n), onSummary: () => sums++
    });
    f.start();
    const s = f.state();
    if (s.phase !== 'summary' || sums !== 1) throw new Error('fase ' + s.phase + ' resúmenes ' + sums);
    if (JSON.stringify(st) !== JSON.stringify(Array.from({ length: 10 - from }, (_, k) => k + from))) throw new Error('estaciones ' + JSON.stringify(st));
    if (s.xp !== sum) throw new Error('xp ' + s.xp + ' != ' + sum);
    return true;
  }, Math.min(RUNS, 300));
  // ATAQUE: onResult que lanza (error de la vista al pintar el resultado): la decisión ya contó; el flujo no queda bloqueado
  { let n = 0; const f = CityRoute.create({ stations, questionsByTopic: bankFor(stations, 3), prep: (q) => ({ q, labels: ['a', 'b'], correct: 0 }), onStation() {}, onAsk() {}, onResult: () => { if (n++ === 0) throw new Error('vista'); return 5; }, onLayer() {}, onSummary() {} });
    f.start(); f.ask(); const e1 = throwsMsg(() => f.answer(0)); const s1 = f.state(); f.next(); const s2 = f.state();
    ok('C2 onResult que lanza: la excepción sale, la fase queda en result y next() sigue avanzando', !!e1 && s1.phase === 'result' && (s2.phase === 'ask' || s2.phase === 'arrive'), 'e=' + e1 + ' ' + s1.phase + '→' + s2.phase); }

  // =====================================================================================================
  // D) check_district.mjs
  // =====================================================================================================
  // D1: distritos mal formados (forma rota) → el validador debe devolver errores "R<n>: …", nunca lanzar (spec §4.3: lista de errores)
  const PATHS = (o, pre = []) => { const out = []; if (o && typeof o === 'object') for (const k of Object.keys(o)) { out.push(pre.concat(k)); if (pre.length < 3) out.push(...PATHS(o[k], pre.concat(k))); } return out; };
  const base8 = D.districts.M08, base2 = D.districts.M02;
  const P8 = PATHS(base8), P2 = PATHS(base2);
  const junkArb = fc.oneof(fc.constantFrom(undefined, null, NaN, Infinity, -1, 0, '', 'x', [], {}, true, [null], { length: 3 }), fc.anything());
  const mutArb = fc.tuple(fc.constantFrom('M08', 'M02'), fc.array(fc.tuple(fc.nat(), junkArb, fc.boolean()), { minLength: 1, maxLength: 3 }));
  const mutate = ([mid, ops]) => { const d = structuredClone(mid === 'M08' ? base8 : base2), P = mid === 'M08' ? P8 : P2;
    ops.forEach(([i, v, del]) => { const p = P[i % P.length]; let o = d; for (let k = 0; k < p.length - 1; k++) { if (!o || typeof o !== 'object') return; o = o[p[k]]; } if (o && typeof o === 'object') { if (del) delete o[p[p.length - 1]]; else o[p[p.length - 1]] = v; } });
    return { mid, d }; };
  prop('D1 checkDistrict con distritos mal formados nunca lanza y devuelve solo errores "R<n>: …"', mutArb, (m) => {
    const { mid, d } = mutate(m);
    const errs = checkDistrict(d, modOf(mid));
    if (!Array.isArray(errs) || errs.some((e) => typeof e !== 'string' || !/^R\d+: /.test(e))) throw new Error('salida ' + safeStr(errs));
    return true;
  });
  // ATAQUE: forma mínima rota — un distrito sin "route.pads" (o creatures sin area) hace lanzar TypeError en vez de reportar R8/R7
  { const d = structuredClone(base8); delete d.route.pads;
    const e = throwsMsg(() => checkDistrict(d, modOf('M08')));
    ok('D1b M08 sin route.pads: checkDistrict reporta "R8: … pads" en vez de lanzar', !e, 'lanza: ' + e); }
  { const d = structuredClone(base8); delete d.creatures[0].area;
    const e = throwsMsg(() => checkDistrict(d, modOf('M08')));
    ok('D1c criatura sin area: checkDistrict reporta un error R7 en vez de lanzar', !e, 'lanza: ' + e); }

  // regresiones permanentes: entradas mínimas que el fuzzing (review_districts_fuzz.cjs, T6) encontró rompiendo checkDistrict
  for (const [mid, muts] of [['M08', [['route', '<img src=x>']]], ['M08', [['route.stations', '__proto__']]], ['M02', [['mentors.2', 'DELETE']]], ['M08', [['creatures.4.topics', 0.5]]], ['M08', [['repairs.1.z', { toString: '2026-02-29' }]]]]) {
    const d = structuredClone(D.districts[mid]);
    muts.forEach(([p, v]) => { const ks = p.split('.'); let o = d; for (let i = 0; i < ks.length - 1; i++) o = o[ks[i]]; if (v === 'DELETE') delete o[ks[ks.length - 1]]; else o[ks[ks.length - 1]] = v; });
    const e = throwsMsg(() => checkDistrict(d, modOf(mid)));
    ok('D1-REG ' + mid + ' ' + safeStr(muts) + ': checkDistrict devuelve errores en vez de lanzar', !e, 'lanza: ' + e);
  }
  // D2: falsos negativos — distritos que el validador acepta y que rompen el juego
  // ATAQUE: ORDER con un id que coincide con Object.prototype ("constructor") y sin portal: seen[k] lo hereda y R9 no lo reporta
  { const D4 = Object.assign({}, D, { order: D.order.concat(['constructor']) });
    const errs = checkPlaza(D4);
    ok('D2d ORDER con "constructor" sin portal: R9 debe reportar "no tiene portal"', errs.some((e) => /constructor/.test(e)), 'errores=' + safeStr(errs)); }

  // =====================================================================================================
  // E) validate.mjs (sobre una copia en un directorio temporal; no toca juego_estudio.html)
  // =====================================================================================================
  function validate(htmlText) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rdval-'));
    fs.copyFileSync(path.join(ROOT, 'validate.mjs'), path.join(dir, 'validate.mjs'));
    fs.cpSync(path.join(ROOT, 'city'), path.join(dir, 'city'), { recursive: true });
    fs.copyFileSync(path.join(ROOT, '_headers'), path.join(dir, '_headers'));
    fs.writeFileSync(path.join(dir, 'juego_estudio.html'), htmlText);
    const r = spawnSync('node', ['validate.mjs'], { cwd: dir, encoding: 'utf8' });
    fs.rmSync(dir, { recursive: true, force: true });
    return { status: r.status, out: (r.stdout || '') + (r.stderr || '') };
  }
  { const r = validate(HTML0); ok('E0 el HTML actual valida', r.status === 0, r.out.slice(-200)); }

  // =====================================================================================================
  // F) vista en jsdom (mundo falso; opts.real usa el mundo real con rAF inyectado)
  // =====================================================================================================
  function boot(raw, opts = {}) {
    const errors = []; const vc = new VirtualConsole();
    vc.on('jsdomError', (er) => errors.push('jsdomError: ' + (er.detail && er.detail.stack ? String(er.detail.stack).split('\n').slice(0, 2).join(' ') : (er.detail || er.message))));
    vc.on('error', (...a) => errors.push('console.error: ' + a.map(String).join(' ')));
    const st = { scenes: [], calls: [], reject: opts.reject || new Set(), pending: opts.pending || new Set(), resolvers: {}, lastOpts: null, rafPend: new Map(), rafN: 0 };
    const dom = new JSDOM(HTML0, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.test/', virtualConsole: vc,
      beforeParse(w) {
        if (raw != null) w.localStorage.setItem(KEY, raw);
        w.scrollTo = () => {}; w.Element.prototype.scrollIntoView = function () {}; w.__CITY_TEST__ = true;
        w.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
        const fake = (el) => new Proxy({ canvas: el }, { get(t, k) { if (k in t) return t[k]; if (k === 'measureText') return () => ({ width: 0 }); return () => {}; }, set(t, k, v) { t[k] = v; return true; } });
        w.HTMLCanvasElement.prototype.getContext = function () { return fake(this); };
        const raf = (cb) => { const id = ++st.rafN; st.rafPend.set(id, cb); return id; }, caf = (id) => { st.rafPend.delete(id); };
        w.__CITY_WORLD__ = { create(canvas, Dd, sceneId, o) {
          st.scenes.push(sceneId); st.lastOpts = o;
          if (st.reject.has(sceneId)) return Promise.reject(new Error('create falló: ' + sceneId));
          if (opts.real) {
            const CW = require('../../city/world2d.js');
            return CW.create(canvas, Dd, sceneId, Object.assign({}, o, { doc: w.document, raf, caf, pixelRatio: 1 })).then((rw) => {
              const sp = rw.setPaused; rw.setPaused = (r, on) => { st.calls.push(['setPaused', r, on, sceneId]); return sp(r, on); }; return rw; });
          }
          const api = { resize() {}, setPaused: (r, on) => st.calls.push(['setPaused', r, on, sceneId]), dissolve() {}, encounter: () => Promise.resolve(), setRoute() {}, dispose: () => st.calls.push(['dispose', sceneId]) };
          if (st.pending.has(sceneId)) return new Promise((res) => { st.resolvers[sceneId] = () => res(api); });
          return Promise.resolve(api);
        } };
      } });
    const e = { dom, w: dom.window, d: dom.window.document, st, errors };
    e.click = (el) => el && el.dispatchEvent(new e.w.MouseEvent('click', { bubbles: true }));
    e.key = (k) => e.w.dispatchEvent(new e.w.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
    e.cx = (c) => [...e.d.querySelectorAll('[data-act="cx"]')].find((b) => b.dataset.c === c);
    e.tp = (x, z) => e.w.__CITY_TEST_API__.teleport(x, z);
    e.tick = (ms = 16) => e.st.lastOpts.tick(ms);
    return e;
  }
  const seed = (o = {}) => JSON.stringify(Object.assign({ v: 1, xp: 100000, days: { last: null, count: 0 }, session: 1, lastActive: 0, topics: {}, qs: { 'M02-Q001': { a: 1, c: 0, q: true, g: 0, gs: -1 } }, boss: {}, hero: { name: 'H' }, city: { prologue: true } }, o));
  const P = D.plaza, pm8 = P.portals.find((p) => p.dist === 'M08');
  const FADE_ALL = 900;
  // lleva la vista a la plaza con el aviso "No se pudo abrir Nodo Enlace." visible (M08 rechaza la primera vez)
  async function toErrorBanner(opts = {}) {
    const e = boot(seed(), Object.assign({ reject: new Set(['M08']) }, opts));
    e.click(e.d.querySelector('[data-act="city"]')); await sleep(20);
    e.tp(pm8.x, pm8.z + 2.5); e.click(e.d.querySelector('#city-act')); await sleep(FADE_ALL);
    e.st.reject.clear();
    return e;
  }
  try {
    // ATAQUE: "Reintentar" del aviso (fuera de #city-ui-main, nunca inert) con la hoja de Iris abierta: cambia de escena con la hoja encima
    { const e = await toErrorBanner();
      e.tp(P.director.x, P.director.z + 1); e.click(e.d.querySelector('#city-act'));
      const sheetOpen = !e.d.querySelector('#city-sheet').hidden;
      e.click(e.cx('err-retry')); await sleep(FADE_ALL);
      const inM08 = e.st.scenes[e.st.scenes.length - 1] === 'M08' && JSON.parse(e.w.localStorage.getItem(KEY)).city.scene === 'M08';
      const stillOpen = !e.d.querySelector('#city-sheet').hidden, m08Paused = e.st.calls.some((c) => c[0] === 'setPaused' && c[1] === 'sheet' && c[2] === true && c[3] === 'M08');
      ok('F1 Reintentar con una hoja abierta: no debe cambiar de escena, o la hoja se cierra, o el mundo nuevo queda en pausa "sheet"', !(sheetOpen && inM08 && stillOpen && !m08Paused),
        'hoja de Iris (plaza) sigue abierta sobre Nodo Enlace y el mundo de M08 nunca recibió setPaused("sheet", true); errores=' + e.errors.join('|'));
      e.w.close(); }
    // ATAQUE: Pausa abierta + Reintentar + "Repaso" en pleno fundido → la vista se suspende (ronda) y el mundo nuevo se crea sin la pausa "suspended"
    { const e = await toErrorBanner();
      e.key('Escape'); e.tick();
      const paused = !e.d.querySelector('#city-pausebox').hidden;
      e.click(e.cx('err-retry')); await sleep(60);
      e.click(e.cx('p-review')); await sleep(FADE_ALL);
      const inRound = e.d.querySelector('#city-root').hidden && e.st.scenes[e.st.scenes.length - 1] === 'M08';
      const susp = e.st.calls.some((c) => c[0] === 'setPaused' && c[1] === 'suspended' && c[2] === true && c[3] === 'M08');
      ok('F2 suspender la vista durante el fundido: el mundo que se crea después debe quedar en pausa "suspended" (o no crearse)', !(paused && inRound && !susp),
        'pausa=' + paused + ' ronda=' + inRound + ' llamadas a M08=' + safeStr(e.st.calls.filter((c) => c[3] === 'M08')));
      e.w.close(); }
    // mismo ataque con el mundo real: ¿quedan cuadros (rAF) agendándose mientras se juega la ronda?
    { const e = await toErrorBanner({ real: true });
      e.key('Escape'); e.tick();
      e.click(e.cx('err-retry')); await sleep(60);
      e.click(e.cx('p-review')); await sleep(FADE_ALL);
      const inRound = e.d.querySelector('#city-root').hidden;
      // corre los rAF pendientes unas veces: un mundo en pausa no vuelve a agendar
      for (let k = 0; k < 5; k++) { const cbs = [...e.st.rafPend.values()]; e.st.rafPend.clear(); cbs.forEach((cb) => { try { cb(16 * (k + 1)); } catch (er) {} }); }
      ok('F2b (mundo real) con la ronda en curso no queda ningún rAF de la ciudad agendándose', !(inRound && e.st.rafPend.size > 0), 'rAF pendientes=' + e.st.rafPend.size + ' con #city-root oculto (ronda en curso)');
      e.w.close(); }
    // ATAQUE: cerrar la hoja mientras el create de M08 está pendiente (mundo = null) y abrir/cerrar la pausa: sin errores y estado coherente al llegar
    { const e = await toErrorBanner({ pending: new Set(['M08']) });
      e.st.pending.add('M08');
      e.tp(P.director.x, P.director.z + 1); e.click(e.d.querySelector('#city-act'));
      e.click(e.cx('err-retry')); await sleep(400);   // el viejo ya se liberó; M08 pendiente
      e.click(e.cx('sheetclose')); e.key('Escape'); e.key('Escape');
      e.st.resolvers.M08(); await sleep(FADE_ALL);
      ok('F3 cerrar la hoja con el create pendiente: sin errores, hoja cerrada, sin inert al terminar', e.errors.length === 0 && e.d.querySelector('#city-sheet').hidden && !e.d.querySelector('#city-ui-main').hasAttribute('inert'),
        'errores=' + e.errors.join('|') + ' inert=' + e.d.querySelector('#city-ui-main').hasAttribute('inert'));
      e.w.close(); }
    // ATAQUE: localStorage corrupto al cargar (scene/at/d hostiles, JSON raros): la ciudad arranca en una escena válida, sin errores, y el guardado queda válido
    { const rr = fc.sample(fc.record({
        scene: fc.oneof(fc.constantFrom('plaza', ...MIDS, ...HOSTILE_IDS), fc.anything()),
        at: fc.oneof(fc.record({ x: anyNum, z: anyNum, yaw: anyNum }), fc.anything()),
        d: fc.oneof(fc.dictionary(fc.constantFrom(...MIDS, '__proto__', 'constructor'), fc.anything()), fc.anything()),
        prologue: fc.constantFrom(true, 'true', 1), tips: fc.anything()
      }, { requiredKeys: [] }), { numRuns: 16, seed: SEED });
      const extra = ['{"v":1,"city":{"__proto__":{"scene":"M08"},"scene":"constructor","at":{"x":1e309,"z":-1e309}}}', '{"v":1,"city":"M08"}', '{"v":1,"city":{"d":{"M08":{"route":{"done":9007199254740993}}},"scene":"M08","prologue":true}}', '{"v":1,"city":[1,2,3]}'];
      const bad = [];
      const raws = rr.map((c) => { let s = JSON.stringify(c, (k, v) => (typeof v === 'number' && !isFinite(v)) ? 1e308 : (typeof v === 'bigint' ? 0 : v)); s = s || '{}'; return '{"v":1,"xp":5,"city":' + s + '}'; }).concat(extra);
      for (const raw of raws) {
        const e = boot(raw);
        try {
          e.click(e.d.querySelector('[data-act="city"]')); await sleep(20);
          for (let k = 0; k < 5; k++) e.tick(16);
          e.key('Escape'); e.tick(16);   // abrir la pausa guarda (citySave): el guardado reescrito debe ser válido
          const sv = JSON.parse(e.w.localStorage.getItem(KEY) || 'null'), sc0 = e.st.scenes[0];
          const okScene = sc0 === 'plaza' || own(D.districts, sc0);
          if (e.errors.length || !okScene || (sv && sv.city && sv.city.scene !== undefined && !(sv.city.scene === 'plaza' || own(D.districts, sv.city.scene)))) bad.push(raw.slice(0, 160) + ' → ' + (e.errors[0] || 'escena ' + sc0));
        } catch (er) { bad.push(raw.slice(0, 160) + ' → excepción ' + er.message); }
        e.w.close();
      }
      ok('F4 ' + raws.length + ' guardados corruptos al cargar: escena válida, sin errores de consola', bad.length === 0, bad.slice(0, 3).join(' || ')); }
  } catch (err) { ok('F excepción del arnés', false, err && err.stack); }

  results.forEach((r) => console.log(r.join(' | ')));
  const fails = results.filter((r) => r[0] === 'FAIL').length;
  console.log('\nadversariales+propiedades: ' + results.length + ' comprobaciones, ' + propCount + ' propiedades × ejecuciones = ' + propRuns + ' casos');
  console.log(fails ? `${fails} FALLOS (el código se rompió)` : 'REVIEW_DISTRICTS_ATTACK OK');
  process.exit(fails ? 1 : 0);
})();
