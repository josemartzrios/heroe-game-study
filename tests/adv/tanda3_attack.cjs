// Ataque a la Tanda 3 (M04, M06, M07 "solo datos, sin cambios de código") con los distritos REALES de city/districts.mjs.
// D8 = la ciudad real reducida a los 8 distritos de la Tanda 3 (tests/city_at.cjs); D5 = la misma sin M04/M06/M07 (el estado de la Tanda 2) para atacar la migración.
//  C  contenido/validación: checkDistrict de los 3 nuevos con el contenido real y checkPlaza(D8) (las reglas entre distritos las prueba tanda3_feasibility).
//  T  city/story.js con 8 distritos: guardados de la Tanda 2, rangos (máximo Arquitecto), applyRestore de varios, objetivo de la plaza por ORDER,
//     simulación de partida en cada distrito nuevo y posiciones de la plaza con los 3 portales recién abiertos.
//  S  city/sprites2d.js real (vm): atlas, aspecto de los 5 de antes intacto, forma (ci + 3k) % 6, ninguna criatura de otro distrito igual o casi igual.
//  V  cityRankLine extraída de city/view.js con story.js real y D8 (oráculo).
// No duplica tanda2_*.cjs: todo aquí corre con D8 y ataca lo que cambia al pasar de 5 a 8 distritos.
// Uso: node tests/adv/tanda3_attack.cjs [RUNS=1000] [FUZZ_N=100000 por objetivo] [SEED=20261118] [MAX_S=60 por objetivo]   (código 1 si algo rompe)
const fc = require('fast-check');
const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const { pathToFileURL } = require('url');
const CS = require('../../city/story.js');
const CM = require('../../city/move.js');
const { TANDA3, cityAt } = require('../city_at.cjs');

const RUNS = +(process.argv[2] || 1000), FUZZ_N = +(process.argv[3] || 100000), SEED = +(process.argv[4] || 20261118), MAX_MS = 1000 * +(process.argv[5] || 60);
const TODAY = '2026-11-18';
const root = path.join(__dirname, '..', '..');
const imp = (f) => import(pathToFileURL(path.join(root, f)).href);
const hasOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const results = [];
let attacks = 0, props = 0, fuzzTotal = 0;
const ok = (name, cond, extra) => results.push([cond ? 'PASS' : 'FAIL', name, cond ? '' : (extra || '')]);
const safeStr = (x) => { try { const s = JSON.stringify(x, (k, v) => (typeof v === 'number' && !isFinite(v)) ? String(v) : (typeof v === 'function' ? 'fn' : v)); return (s === undefined ? String(x) : s).slice(0, 400); } catch (e) { return String(x); } };
async function attack(name, fn) { attacks++; try { const r = await fn(); ok('A: ' + name, r === undefined || r === true, typeof r === 'string' ? r : ''); } catch (e) { ok('A: ' + name, false, 'lanza: ' + String(e && e.message).slice(0, 300)); } }
function prop(name, arb, pred) {
  props++;
  const r = fc.check(fc.property(arb, pred), { numRuns: RUNS, seed: SEED, endOnFailure: false });
  ok('P: ' + name + ' (' + RUNS + ' ejecuciones, semilla ' + SEED + ')', !r.failed,
    r.failed ? 'contraejemplo=' + safeStr(r.counterexample) + ' error=' + String(r.errorInstance && r.errorInstance.message || r.error).slice(0, 300) : '');
}
function mulberry(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const pick = (r, a) => a[Math.floor(r() * a.length)];
function campaign(name, gen, run) {
  const r = mulberry(SEED ^ (name.length * 2654435761)), t0 = Date.now(), sig = {};
  let n = 0;
  for (; n < FUZZ_N && Date.now() - t0 < MAX_MS; n++) {
    const input = gen(r), a = Date.now(); let err = null;
    try { err = run(input); } catch (e) { err = 'lanza ' + String(e && e.message).replace(/\d+/g, '#'); }
    if (!err && Date.now() - a > 250) err = 'lento (> 250 ms)';
    if (err) { const k = String(err).slice(0, 160), s = safeStr(input); if (!sig[k]) sig[k] = { n: 0, min: s }; sig[k].n++; if (s.length < sig[k].min.length) sig[k].min = s; }
  }
  fuzzTotal += n;
  const keys = Object.keys(sig);
  ok('F: ' + name + ' (' + n + ' entradas, ' + (Date.now() - t0) + ' ms, semilla ' + SEED + ')', keys.length === 0, keys.map((k) => k + ' ×' + sig[k].n + ' mínima=' + sig[k].min).join(' | '));
}

const NEW = ['M04', 'M06', 'M07'];

// ---------- sprites2d real en vm ----------
const SPR_SRC = fs.readFileSync(path.join(root, 'city/sprites2d.js'), 'utf8');
function loadSprites() { const m = { exports: {} }; vm.runInNewContext(SPR_SRC, { module: m, Math, Object, Array, Error }); return m.exports; }
function fakeDoc() {
  return { createElement() { const ops = []; const cv = { width: 0, height: 0, ops, getContext() { const g = { fillStyle: '', fillRect(x, y, w, h) { ops.push([g.fillStyle, x, y, w, h]); }, clearRect() {}, drawImage() {} }; return g; } }; return cv; } };
}
const SP_NEW = (D) => { const SP = loadSprites(); SP.init(fakeDoc()); SP.setData(D); return SP; };
function cellOps(SP, kind, variant) {
  const f = SP.frame(kind, variant, 'down', 0);
  return f.img.ops.filter(([, x, y]) => x >= f.sx && x < f.sx + f.w && y >= f.sy && y < f.sy + f.h).map(([c, x, y, w, h]) => [c, x - f.sx, y - f.sy, w, h]);
}
const geom = (ops) => ops.map((o) => o.slice(1).join(',')).join(';');

// ---------- CIEDE2000 (para "casi el mismo color") ----------
function lab(h) {
  const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v > 0.04045 ? ((v + 0.055) / 1.055) ** 2.4 : v / 12.92));
  const X = (c[0] * 0.4124 + c[1] * 0.3576 + c[2] * 0.1805) / 0.95047, Y = c[0] * 0.2126 + c[1] * 0.7152 + c[2] * 0.0722, Z = (c[0] * 0.0193 + c[1] * 0.1192 + c[2] * 0.9505) / 1.08883;
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116); return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))];
}
function de00(h1, h2) {
  const [L1, a1, b1] = lab(h1), [L2, a2, b2] = lab(h2), rad = Math.PI / 180, C1 = Math.hypot(a1, b1), C2 = Math.hypot(a2, b2), Cb = (C1 + C2) / 2;
  const G = 0.5 * (1 - Math.sqrt(Cb ** 7 / (Cb ** 7 + 25 ** 7))), a1p = a1 * (1 + G), a2p = a2 * (1 + G), C1p = Math.hypot(a1p, b1), C2p = Math.hypot(a2p, b2);
  let h1p = Math.atan2(b1, a1p) / rad; if (h1p < 0) h1p += 360; let h2p = Math.atan2(b2, a2p) / rad; if (h2p < 0) h2p += 360;
  const dL = L2 - L1, dC = C2p - C1p; let dh = h2p - h1p; if (C1p * C2p === 0) dh = 0; else if (dh > 180) dh -= 360; else if (dh < -180) dh += 360;
  const dH = 2 * Math.sqrt(C1p * C2p) * Math.sin(dh / 2 * rad), Lb = (L1 + L2) / 2, Cbp = (C1p + C2p) / 2;
  let hb = h1p + h2p; if (C1p * C2p !== 0) { if (Math.abs(h1p - h2p) > 180) hb = hb < 360 ? hb + 360 : hb - 360; hb /= 2; }
  const Tt = 1 - 0.17 * Math.cos((hb - 30) * rad) + 0.24 * Math.cos(2 * hb * rad) + 0.32 * Math.cos((3 * hb + 6) * rad) - 0.2 * Math.cos((4 * hb - 63) * rad);
  const dth = 30 * Math.exp(-(((hb - 275) / 25) ** 2)), RC = 2 * Math.sqrt(Cbp ** 7 / (Cbp ** 7 + 25 ** 7));
  const SL = 1 + 0.015 * (Lb - 50) ** 2 / Math.sqrt(20 + (Lb - 50) ** 2), SC = 1 + 0.045 * Cbp, SH = 1 + 0.015 * Cbp * Tt, RT = -Math.sin(2 * dth * rad) * RC;
  return Math.sqrt((dL / SL) ** 2 + (dC / SC) ** 2 + (dH / SH) ** 2 + RT * (dC / SC) * (dH / SH));
}

// ---------- cityRankLine real (view.js), cargada por tests/rankline.cjs ----------
const { rankLineWith } = require('../rankline.cjs');

(async () => {
  const D8 = cityAt((await imp('city/districts.mjs')).city, TANDA3);   // los 8 de la Tanda 3: registrar M05/M09/M11 después no cambia estas pruebas
  const D5 = Object.assign({}, D8, { districts: Object.fromEntries(Object.entries(D8.districts).filter(([m]) => !NEW.includes(m))) });   // el estado de la Tanda 2
  const { checkDistrict, checkPlaza } = await imp('city/check_district.mjs');
  const { expandModule } = await imp('content_expand.mjs');
  const MODULES = require('../modules.cjs'), RULES = require('../district_rules.cjs');
  const MODS = {};
  for (const id of NEW) MODS[id] = expandModule(id, MODULES[id].title, await imp(MODULES[id].file));
  const M5 = Object.keys(D5.districts), M8 = Object.keys(D8.districts), DIST = D8.districts;
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const ALLTRUE = (ids) => Object.fromEntries(ids.map((i) => [i, true]));
  const allT = (m) => ALLTRUE(DIST[m].apprentices.map((a) => a.id));
  const RK = D8.ranks, rkName = (n) => { let nm = RK[0][1]; RK.forEach((r) => { if (n >= r[0]) nm = r[1]; }); return nm; };
  const ownTrue = (rs, ms) => ms.filter((m) => rs && typeof rs === 'object' && hasOwn(rs, m) && rs[m] === true);

  // =================== C. validación y contenido ===================
  await attack('C0 orden de registro = ORDER sin los muros: ' + M8.join(','), () => safeStr(M8) === safeStr(D8.order.filter((m) => hasOwn(DIST, m))) || safeStr(M8));
  // ATAQUE: el spec dice "comprobado R1–R7 sin errores" con el contenido real: checkDistrict R0–R11 de cada distrito nuevo armado con sus tablas
  for (const id of NEW) await attack('C1 checkDistrict(' + id + ') con el contenido real y la tabla del spec: sin errores', () => { const e = checkDistrict(DIST[id], MODS[id]); return e.length === 0 || e.join(' | '); });
  // ATAQUE: R9/R10 con 8 distritos (3 portales nuevos se abren y dejan de ser muros: back libre, todos en ORDER)
  await attack('C2 checkPlaza(D8) sin errores', () => { const e = checkPlaza(D8); return e.length === 0 || e.join(' | '); });
  // =================== T. story.js con 8 distritos ===================
  // ATAQUE: el máximo alcanzable pasa a Arquitecto; Tech Lead (11) nunca con 8
  await attack('T1 rankName 0..8 con D8 = Becario,Junior,Junior,Semi-senior,Semi-senior,Semi-senior,Senior,Senior,Arquitecto (tabla 0/1/3/6/8/11 del spec)', () => {
    const got = Array.from({ length: 9 }, (_, n) => CS.rankName(n, D8)).join(',');
    return got === 'Becario,Junior,Junior,Semi-senior,Semi-senior,Semi-senior,Senior,Senior,Arquitecto' || got;
  });
  await attack('T2 rankOf con restored de todos (más claves de muros M05/M09/M11) = ' + rkName(M8.length) + ', nunca Tech Lead', () => {
    const C = { restored: Object.assign(ALLTRUE(M8), { M05: true, M09: true, M11: true }) };
    return CS.rankOf(C, D8) === rkName(M8.length) || CS.rankOf(C, D8);
  });
  // guardado real de la Tanda 2: los 5 restaurados, escrito por normalizeCity(D5) + mirror como lo guarda el juego
  const boss5 = (m) => M5.includes(m);
  const C5full = CS.mirror(CS.normalizeCity({ prologue: true, d: Object.fromEntries(M5.map((m) => [m, { taught: allT(m) }])) }, D5, boss5, TODAY));
  const save5 = JSON.stringify(C5full);
  // ATAQUE: un jugador que terminó la Tanda 2 ("Ciudad al día") actualiza: conserva rango y progreso y la plaza le manda a M04
  await attack('T3 guardado Tanda 2 (todos los de antes restaurados) en D8: mismo rango, intactos, nuevos vacíos, objetivo "Entra a ' + DIST[NEW[0]].name + '"', () => {
    const C = CS.normalizeCity(JSON.parse(save5), D8, boss5, TODAY), o = CS.nextObjective(C, D8, 'plaza', null);
    for (const m of M5) if (safeStr(C.d[m]) !== safeStr(C5full.d[m])) return m + ' cambió';
    for (const m of NEW) if (safeStr(C.d[m]) !== '{"beaten":{},"repairs":{},"taught":{}}') return m + '=' + safeStr(C.d[m]);
    if (safeStr(ownTrue(C.restored, M8)) !== safeStr(M5)) return 'restored=' + safeStr(C.restored);
    if (CS.rankOf(C, D8) !== rkName(M5.length)) return 'rango ' + CS.rankOf(C, D8);
    return (o.kind === 'portal' && o.id === NEW[0] && o.label === 'Entra a ' + DIST[NEW[0]].name) || safeStr(o);
  });
  // ATAQUE: objetivo de la plaza recorre ORDER completo con 8 distritos y acaba en "Ciudad al día"
  await attack('T4 plaza: restaurando en ORDER, el objetivo pasa por todos los distritos en orden y termina en "none"', () => {
    const C = CS.normalizeCity({ prologue: true }, D8, null, TODAY), seen = [];
    for (let i = 0; i < 12; i++) { const o = CS.nextObjective(C, D8, 'plaza', null); seen.push(o.id); if (o.kind !== 'portal') break; C.restored[o.id] = true; }
    return safeStr(seen) === safeStr(M8.concat([null])) || safeStr(seen);
  });
  // ATAQUE: los 3 distritos nuevos se restauran a la vez (un solo applyRestore): changed en orden, poderes intactos, 5 → 8 = "Subes a Arquitecto."
  const RL8 = rankLineWith(D8);
  await attack('T5 applyRestore restaura M04+M06+M07 a la vez: changed=NEW, rango ' + rkName(M8.length) + ', línea "Subes a ' + rkName(M8.length) + '."', () => {
    const raw = JSON.parse(save5); NEW.forEach((m) => { raw.d[m] = { taught: allT(m) }; });
    const C = CS.normalizeCity(raw, D8, boss5, TODAY);
    const r = CS.applyRestore(C, D8, () => true), r2 = CS.applyRestore(C, D8, () => true);
    if (safeStr(r.changed) !== safeStr(NEW) || r2.changed.length) return 'changed=' + safeStr(r.changed) + ' segundo=' + safeStr(r2.changed);
    if (safeStr(C.powers) !== '{"planos":true}') return 'powers=' + safeStr(C.powers);
    const line = RL8(C.restored, r.changed);
    return (CS.rankOf(C, D8) === rkName(M8.length) && line === 'Subes a ' + rkName(M8.length) + '.') || CS.rankOf(C, D8) + ' / ' + line;
  });
  // ATAQUE: la línea de rango en cada escalón nuevo (4.º con plural, 5.º, 6.º, 7.º, 8.º y ya completo); textos literales de Review Focus 2 del plan
  await attack('T6 cityRankLine con D8 en 3→4, 4→5, 5→6, 6→7, 7→8 y 8 completo', () => {
    const mk = (n) => ALLTRUE(M8.slice(0, n)), want = [
      [mk(4), [M8[3]], 'Sigues como Semi-senior: te faltan 2 distritos para Senior.'], [mk(5), [M8[4]], 'Sigues como Semi-senior: te falta 1 distrito para Senior.'],
      [mk(6), [M8[5]], 'Subes a Senior.'], [mk(7), [M8[6]], 'Sigues como Senior: te falta 1 distrito para Arquitecto.'], [mk(8), [M8[7]], 'Subes a Arquitecto.'],
      [mk(8), [], 'Sigues como Arquitecto. Llevas ' + M8.length + ' de ' + M8.length + ' distritos restaurados.'], [mk(8), [M8[6], M8[7]], 'Subes a Arquitecto.']];
    const bad = want.map(([rs, mids, w]) => [RL8(rs, mids), w]).filter(([g, w]) => g !== w);
    return bad.length === 0 || bad.map(([g, w]) => '"' + g + '" (debía "' + w + '")').join(' | ');
  });
  // ATAQUE: posiciones de la plaza válidas en la Tanda 2 junto a los muros M04/M06/M07 (que ahora son portales abiertos): no deben teletransportar a un distrito
  await attack('T7 guardados de la Tanda 2 pegados a los muros M04/M06/M07: en D8 no quedan dentro de un portal', () => {
    const bad = [];
    for (const p of D8.plaza.portals.filter((q) => NEW.includes(q.dist))) for (const [dx, dz] of [[0, 1.4], [0, -1.4], [3.4, 0], [-3.4, 0], [0, 1.01], [0, -1.01]]) {
      const raw = { prologue: true, scene: 'plaza', at: { x: p.x + dx, z: p.z + dz, yaw: 1 } };
      const C5 = CS.normalizeCity(raw, D5, null, TODAY), C8 = CS.normalizeCity(clone(C5), D8, null, TODAY);
      if (CM.portalAt(D8, 'plaza', C8.at.x, C8.at.z) !== null) bad.push(p.dist + safeStr(C8.at));
      if (safeStr(C8.at) !== safeStr(C5.at)) bad.push(p.dist + ' se movió ' + safeStr(C5.at) + '→' + safeStr(C8.at));
    }
    return bad.length === 0 || bad.join(' | ');
  });

  // REGLA (migración Tanda 2 → 3): normalize(D8, JSON(mirror(normalize(D5, raw)))) conserva todo lo de los 5, nuevos vacíos, misma escena/posición y rango
  const numArb = fc.oneof(fc.double({ min: -80, max: 80, noNaN: true }), fc.constantFrom(NaN, Infinity, -0, 1e308));
  const anyIdArb = (m) => fc.constantFrom(...DIST[m].creatures.map((c) => c.id), ...DIST[m].repairs.map((c) => c.id), ...DIST[m].apprentices.map((c) => c.id), '__proto__', 'constructor');
  const mapArb = fc.dictionary(fc.oneof(...M8.map(anyIdArb)), fc.oneof(fc.constant(true), fc.constant(TODAY), fc.constantFrom('2026-11-01', false, 1, null, '2099-01-01')), { maxKeys: 12 });
  const entryArb = fc.record({ beaten: mapArb, repairs: mapArb, taught: mapArb, route: fc.record({ done: fc.oneof(fc.integer({ min: -2, max: 12 }), fc.double()) }) }, { requiredKeys: [] });
  const saveArb = fc.record({
    prologue: fc.boolean(), scene: fc.constantFrom('plaza', ...M8, 'M05', '__proto__', undefined),
    at: fc.record({ x: numArb, z: numArb, yaw: numArb }, { requiredKeys: [] }),
    d: fc.dictionary(fc.constantFrom(...M8, 'M05', '__proto__', 'constructor'), entryArb, { maxKeys: 9 }),
    restored: fc.dictionary(fc.constantFrom(...M8, '__proto__'), fc.oneof(fc.constant(true), fc.anything()), { maxKeys: 9 })
  }, { requiredKeys: [] }).map((o) => JSON.parse(JSON.stringify(o, (k, v) => (typeof v === 'number' && !isFinite(v)) ? null : v)));
  const bossArb = fc.subarray(M8);
  prop('T-P1 migración Tanda 2 → 3 conserva progreso, escena, posición y rango', fc.tuple(saveArb, bossArb), ([raw, boss]) => {
    const bf = (m) => boss.includes(m), C5 = CS.mirror(CS.normalizeCity(raw, D5, bf, TODAY)), C8 = CS.normalizeCity(clone(C5), D8, bf, TODAY);
    for (const m of M5) assert.deepStrictEqual(C8.d[m], C5.d[m], m);
    for (const m of NEW) assert.deepStrictEqual(C8.d[m], { beaten: {}, repairs: {}, taught: {} }, m);
    assert.strictEqual(C8.scene, C5.scene); assert.deepStrictEqual(C8.at, C5.at);
    assert.deepStrictEqual(ownTrue(C8.restored, M8), ownTrue(C5.restored, M5));
    assert.strictEqual(CS.rankOf(C8, D8), CS.rankOf(C5, D5));
    return true;
  });
  // REGLA (oráculo): applyRestore con D8: restored = condición, changed = nuevos en orden de registro, idempotente, rango = tabla, plaza = primero de ORDER sin restaurar
  prop('T-P2 applyRestore/rankOf/objetivo de plaza con 8 distritos = oráculo', fc.tuple(fc.subarray(M8), fc.subarray(M8), fc.subarray(M8)), ([taught, boss, pre]) => {
    const C = { prologue: true, d: {}, restored: ALLTRUE(pre), powers: {} };
    M8.forEach((m) => { C.d[m] = { taught: taught.includes(m) ? allT(m) : ALLTRUE(DIST[m].apprentices.slice(0, DIST[m].need - 1).map((a) => a.id)) }; });
    const want = M8.filter((m) => taught.includes(m) && boss.includes(m)), r = CS.applyRestore(C, D8, (m) => boss.includes(m));
    assert.deepStrictEqual(ownTrue(C.restored, M8), want);
    assert.deepStrictEqual(r.changed, want.filter((m) => !pre.includes(m)));
    assert.deepStrictEqual(CS.applyRestore(C, D8, (m) => boss.includes(m)).changed, []);
    assert.strictEqual(CS.rankOf(C, D8), rkName(want.length));
    const o = CS.nextObjective(C, D8, 'plaza', null), rec = D8.order.find((m) => hasOwn(DIST, m) && !want.includes(m));
    assert.strictEqual(o.id, rec || null);
    if (rec) assert.strictEqual(o.label, 'Entra a ' + DIST[rec].name);
    return true;
  });
  // REGLA (progreso): siguiendo el objetivo en M04/M06/M07 (con jefe desbloqueado en un momento al azar) se llega a "Vuelve a la plaza" sin atascarse
  prop('T-P3 jugar M04/M06/M07 siguiendo nextObjective siempre termina restaurado', fc.tuple(fc.constantFrom(...NEW), fc.integer({ min: 0, max: 80 }), fc.boolean()), ([mid, unlockAt, early]) => {
    const M = DIST[mid], learned = new Set(), stars = {}, beaten = new Set(), C = CS.normalizeCity({ prologue: true }, D8, null, TODAY);
    let unlocked = false, passed = false, steps = 0, o;
    const ctx = () => ({ learned: (t) => learned.has(t), stars: (t) => stars[t] || 0, beatenEver: (id) => beaten.has(id), beatenToday: (id) => beaten.has(id), bossUnlocked: unlocked, bossPassed: passed });
    for (; steps < 200; steps++) {
      if (steps >= unlockAt && (early || learned.size === M.mentors.length)) unlocked = true;
      o = CS.nextObjective(C, D8, mid, ctx());
      if (o.kind === 'plaza') break;
      if (o.kind === 'mentor') learned.add(M.mentors.find((m) => m.id === o.id).topic);
      else if (o.kind === 'practice') stars[M.mentors.find((m) => m.id === o.id).topic] = 1;
      else if (o.kind === 'creature') beaten.add(o.id);
      else if (o.kind === 'repair') C.d[mid].repairs[o.id] = true;
      else if (o.kind === 'apprentice') C.d[mid].taught[o.id] = true;
      else if (o.kind === 'tower') passed = true;
      else if (o.kind === 'none') { if (unlocked) throw new Error('atascado en none con jefe desbloqueado'); unlocked = true; }
      else throw new Error('objetivo desconocido ' + safeStr(o));
      CS.applyRestore(C, D8, (m) => m === mid && passed);
    }
    if (!o || o.kind !== 'plaza') throw new Error('sin terminar tras ' + steps + ' pasos: ' + safeStr(o));
    return true;
  });

  // =================== S. sprites2d con 8 distritos ===================
  const SP5 = SP_NEW(D5), SP8 = SP_NEW(D8), REF = D8.order[0];
  // ATAQUE: añadir 3 distritos al final no cambia ni un píxel de los 5 de antes (k de rotación y tinte por Object.keys)
  await attack('S1 criaturas y personas de los 5 distritos de antes: mismas celdas en D8', () => {
    const bad = [];
    for (const m of M5) {
      for (const c of DIST[m].creatures) if (safeStr(cellOps(SP5, 'creature', m + ':' + c.id)) !== safeStr(cellOps(SP8, 'creature', m + ':' + c.id))) bad.push(m + ':' + c.id);
      for (const p of [...DIST[m].mentors, ...DIST[m].apprentices]) if (safeStr(cellOps(SP5, 'person', m + ':' + p.id)) !== safeStr(cellOps(SP8, 'person', m + ':' + p.id))) bad.push(m + ':' + p.id);
    }
    return bad.length === 0 || bad.length + ' cambian: ' + bad.slice(0, 8).join(',');
  });
  await attack('S2 atlas con todos los distritos: criaturas y personas contadas desde los datos (personas = 1 + mentores + aprendices), área ≤ 16 Mpx y lado ≤ 16384 (tope de Safari/Chrome)', () => {
    const nc = M8.reduce((a, m) => a + DIST[m].creatures.length, 0), np = 1 + M8.reduce((a, m) => a + DIST[m].mentors.length + DIST[m].apprentices.length, 0);
    const fp = SP8.frame('person', 'iris', 'down', 0).img, fcr = SP8.frame('creature', REF + ':x', 'down', 0).img;
    if (SP8.kinds.creature.length !== nc || SP8.kinds.person.length !== np) return 'criaturas ' + SP8.kinds.creature.length + '/' + nc + ' personas ' + SP8.kinds.person.length + '/' + np;
    const big = [fp, fcr].filter((c) => c.width * c.height > 16777216 || c.height > 16384 || c.width > 16384);
    return big.length === 0 || 'atlas ' + big.map((c) => c.width + '×' + c.height).join(',');
  });
  // tablas de forma: celda de cada forma 0..5 sin teñir (referencia) y teñida, por geometría
  const shapeTable = (tinted) => {
    const ds = { R: { creatures: Array.from({ length: 6 }, (_, i) => ({ id: 'c' + i })), mentors: [], apprentices: [], colors: { a: '#010203', b: '#040506' } } };
    if (tinted) ds.X = { creatures: Array.from({ length: 6 }, (_, i) => ({ id: 'c' + i })), mentors: [], apprentices: [], colors: { a: '#010203', b: '#040506' } };
    const SP = SP_NEW({ order: ['R'], districts: ds }), t = {};
    for (let i = 0; i < 6; i++) t[geom(cellOps(SP, 'creature', (tinted ? 'X' : 'R') + ':c' + i))] = tinted ? (i + 3) % 6 : i;
    return t;
  };
  const SH_REF = shapeTable(false), SH_TINT = shapeTable(true);
  const looks = [];   // [mid, id, forma, color de cuerpo, celda]
  M8.forEach((m) => DIST[m].creatures.forEach((c) => { const cell = cellOps(SP8, 'creature', m + ':' + c.id), g = geom(cell); looks.push([m, c.id, m === REF ? SH_REF[g] : SH_TINT[g], cell[1][0], safeStr(cell)]); }));
  // ATAQUE: "3 * ordinal % 6": la forma de cada criatura es (ci + 3k) % 6 con k = posición entre los no-referencia en el orden de registro
  await attack('S3 forma de cada criatura = (ci + 3k) % 6 (k por orden de registro; M02 sin rotar)', () => {
    let k = 0; const bad = [];
    M8.forEach((m) => { const off = m === REF ? 0 : 3 * (++k); DIST[m].creatures.forEach((c, ci) => { const l = looks.find((x) => x[0] === m && x[1] === c.id); if (l[2] !== (ci + off) % 6) bad.push(m + ':' + c.id + '=' + l[2]); }); });
    return bad.length === 0 || bad.join(',');
  });
  // ATAQUE: dos criaturas de distritos distintos con la misma forma y el mismo color de cuerpo (o la celda idéntica) son indistinguibles
  await attack('S4 ninguna criatura de distrito distinto comparte forma y color de cuerpo, ni celda idéntica', () => {
    const bad = [];
    for (let i = 0; i < looks.length; i++) for (let j = i + 1; j < looks.length; j++) {
      const a = looks[i], b = looks[j]; if (a[0] === b[0]) continue;
      if ((a[2] === b[2] && a[3] === b[3]) || a[4] === b[4]) bad.push(a[0] + ':' + a[1] + '/' + b[0] + ':' + b[1] + ' forma ' + a[2] + ' ' + a[3]);
    }
    return bad.length === 0 || bad.slice(0, 6).join(' | ');
  });
  // ATAQUE: "color propio" exacto no basta: cuerpo de un distrito nuevo casi igual (ΔE2000 < 10) al de otra criatura con la misma forma
  await attack('S5 cuerpos de M04/M06/M07: ΔE2000 ≥ 10 frente a toda criatura de otro distrito con la misma forma', () => {
    const bad = [];
    for (const a of looks.filter((l) => NEW.includes(l[0]))) for (const b of looks) if (a[0] !== b[0] && a[2] === b[2]) { const d = de00(a[3], b[3]); if (d < 10) bad.push(a[0] + ':' + a[1] + ' ' + a[3] + ' ~ ' + b[0] + ':' + b[1] + ' ' + b[3] + ' ΔE=' + d.toFixed(1)); }
    return bad.length === 0 || [...new Set(bad)].slice(0, 6).join(' | ');
  });
  await attack('S6 íconos de inicio siguen saliendo de M02 (referencia) con 8 distritos', () => {
    const want = ['M02:' + DIST.M02.mentors[0].id, 'M02:' + DIST.M02.creatures[0].id];
    const a = safeStr(cellOps(SP8, 'person', want[0])), b = safeStr(cellOps(SP5, 'person', want[0]));
    return a === b || 'mentor del ícono cambió';
  });
  // FUZZ: frame() sobre las variantes de D8 con cara/paso aleatorios: recorte dentro del atlas y tinte de los nuevos = colors.a/colors.b
  const VARS = [...SP8.kinds.creature.map((v) => ['creature', v]), ...SP8.kinds.person.map((v) => ['person', v]), ['creature', 'M07:'], ['person', 'M06:a11'], ['creature', '__proto__']];
  campaign('S-F frame() con las variantes de 8 distritos', (r) => ({ q: pick(r, VARS), f: pick(r, ['up', 'down', 'left', 'right', 'x', undefined]), s: pick(r, [0, 1, '1', NaN, -1]) }), ({ q, f, s }) => {
    const fr = SP8.frame(q[0], q[1], f, s);
    if (!(fr.sx >= 0 && fr.sy >= 0 && fr.sx + fr.w <= fr.img.width && fr.sy + fr.h <= fr.img.height)) return 'recorte fuera';
    const m = q[1].split(':')[0];
    if (q[0] === 'creature' && NEW.includes(m) && SP8.kinds.creature.includes(q[1])) {
      const cell = fr.img.ops.filter(([, x, y]) => x >= fr.sx && x < fr.sx + 14 && y >= fr.sy && y < fr.sy + 14).map((o) => o[0]);
      if (cell[1] !== DIST[m].colors.a || !cell.includes(DIST[m].colors.b)) return 'tinte ' + m;
    }
    return null;
  });

  // =================== V. cityRankLine con D8 (oráculo) ===================
  function oracleLine(restored, mids) {
    const now = ownTrue(restored, M8), prev = now.filter((m) => !mids.includes(m));
    if (rkName(now.length) !== rkName(prev.length)) return 'Subes a ' + rkName(now.length) + '.';
    const next = RK.find((r) => r[0] > now.length && r[0] <= M8.length);
    if (!next) return 'Sigues como ' + rkName(now.length) + '. Llevas ' + now.length + ' de ' + M8.length + ' distritos restaurados.';
    const miss = next[0] - now.length;
    return 'Sigues como ' + rkName(now.length) + ': ' + (miss === 1 ? 'te falta 1 distrito' : 'te faltan ' + miss + ' distritos') + ' para ' + next[1] + '.';
  }
  prop('V-P1 cityRankLine(D8) = oráculo; nunca menciona Tech Lead', fc.tuple(fc.subarray(M8), fc.array(fc.constantFrom(...M8, 'M05', '__proto__'), { maxLength: 9 })), ([rs, mids]) => {
    const got = RL8(ALLTRUE(rs), mids);
    if (got !== oracleLine(ALLTRUE(rs), mids)) throw new Error('"' + got + '" debía "' + oracleLine(ALLTRUE(rs), mids) + '"');
    if (/Tech Lead/.test(got)) throw new Error('Tech Lead inalcanzable: ' + got);
    return true;
  });

  // =================== F. fuzzing de story.js con guardados de la Tanda 2 mutados ===================
  const BASE_SAVES = [save5, JSON.stringify(CS.mirror(CS.normalizeCity({ prologue: true, scene: 'M10', at: { x: 3, z: 40, yaw: 2 }, d: { M02: { taught: allT('M02') }, M10: { repairs: { r01: true } } } }, D5, () => true, TODAY))),
    '{"prologue":true,"beaten":{"bit":"2026-11-01"},"taught":{"a01":true},"at":{"x":0,"z":-60}}'];
  const TOKS = ['"M04"', '"M06"', '"M07"', '"M05"', '"__proto__"', '"constructor"', 'true', 'false', 'null', '{}', '[]', '1e999', '-0', '"plaza"', '"r09"', '"a10"', '"goto"', '"caos"'];
  campaign('T-F normalizeCity/applyRestore/rankOf/objetivo en D8 con guardados de la Tanda 2 mutados', (r) => {
    let s = pick(r, BASE_SAVES);
    for (let i = 1 + Math.floor(r() * 4); i-- > 0;) {
      const t = r(), at = Math.floor(r() * s.length);
      if (t < 0.5) s = s.replace(pick(r, ['"M02"', '"M08"', '"M03"', '"M01"', '"M10"', 'true', '"a01"', '"r01"', '"plaza"']), pick(r, TOKS));
      else if (t < 0.8) s = s.slice(0, at) + pick(r, TOKS) + s.slice(at);
      else s = s.slice(0, at) + s.slice(at + 1 + Math.floor(r() * 3));
    }
    return { s, b: M8.filter(() => r() < 0.7) };
  }, ({ s, b }) => {
    let raw; try { raw = JSON.parse(s); } catch (e) { raw = s; }
    const bf = (m) => b.includes(m), C = CS.normalizeCity(raw, D8, bf, TODAY);
    if (safeStr(Object.keys(C.d)) !== safeStr(M8)) return 'd sin los 8';
    if (({}).M04 !== undefined || ({}).taught !== undefined) return 'Object.prototype contaminado';
    const want = M8.filter((m) => b.includes(m) && CS.taughtCount(C, D8, m) >= DIST[m].need);
    if (safeStr(ownTrue(C.restored, M8)) !== safeStr(want)) return 'restored ' + safeStr(C.restored);
    if (CS.applyRestore(C, D8, bf).changed.length) return 'applyRestore tras normalize cambia';
    if (CS.rankOf(C, D8) !== rkName(want.length)) return 'rango';
    if (C.scene !== 'plaza' && !hasOwn(DIST, C.scene)) return 'escena ' + C.scene;
    if (CM.portalAt(D8, C.scene, C.at.x, C.at.z) !== null) return 'carga dentro de un portal/salida';
    const C2 = CS.normalizeCity(JSON.parse(JSON.stringify(C)), D8, bf, TODAY);
    if (safeStr(C2) !== safeStr(C)) return 'no idempotente';
    const o = CS.nextObjective(C, D8, 'plaza', null), rec = D8.order.find((m) => hasOwn(DIST, m) && !want.includes(m));
    if (C.prologue ? o.id !== (rec || null) : o.kind !== 'director') return 'objetivo plaza ' + safeStr(o);
    return null;
  });
  // FUZZ: posiciones arbitrarias de la plaza en D8 (con los 3 portales nuevos abiertos): nunca carga dentro de un portal ni de una caja
  const BOX8 = CM.boxesFor(D8, 'plaza');
  campaign('T-F2 resolveAt(plaza) en D8 con posiciones aleatorias cerca de los portales', (r) => {
    const p = pick(r, D8.plaza.portals);
    return { x: r() < 0.8 ? p.x + (r() - 0.5) * 10 : (r() - 0.5) * 120, z: r() < 0.8 ? p.z + (r() - 0.5) * 6 : (r() - 0.5) * 120, yaw: r() * 20 - 10 };
  }, (at) => {
    const C = CS.normalizeCity({ prologue: true, scene: 'plaza', at }, D8, null, TODAY), a = C.at;
    if (CM.portalAt(D8, 'plaza', a.x, a.z) !== null) return 'dentro del portal ' + CM.portalAt(D8, 'plaza', a.x, a.z);
    if (BOX8.some((b) => { const cx = Math.max(b.minX, Math.min(a.x, b.maxX)), cz = Math.max(b.minZ, Math.min(a.z, b.maxZ)); return Math.hypot(a.x - cx, a.z - cz) < 0.4 - 1e-6; })) return 'dentro de una caja';
    return null;
  });
  // FUZZ: cityRankLine(D8) con restored/mids aleatorios (claves hostiles) frente al oráculo
  campaign('V-F cityRankLine(D8) con restored/mids aleatorios', (r) => {
    const pool = M8.concat(['M05', 'M11', '__proto__', 'constructor']), vals = [true, true, true, false, 1, 'true', null];
    const keys = [], mids = [];
    for (let i = Math.floor(r() * 12); i-- > 0;) keys.push([pick(r, pool), Math.floor(r() * vals.length)]);
    for (let i = Math.floor(r() * 9); i-- > 0;) mids.push(pick(r, pool));
    return { keys, mids };
  }, ({ keys, mids }) => {
    const vals = [true, true, true, false, 1, 'true', null], rs = {};
    keys.forEach(([k, j]) => Object.defineProperty(rs, k, { value: vals[j], enumerable: true, writable: true, configurable: true }));
    const got = RL8(rs, mids), want = oracleLine(rs, mids);
    return got === want ? null : 'dice "' + got + '" y debía "' + want + '"';
  });

  finish();
})().catch((e) => { console.error('ERROR FATAL', e); process.exit(1); });

function finish() {
  const fails = results.filter((r) => r[0] === 'FAIL');
  for (const [s, n, x] of results) console.log(s + '  ' + n + (x ? '\n      ' + x : ''));
  console.log(`\nataques=${attacks} propiedades=${props}×${RUNS} fuzz=${fuzzTotal} entradas | ${results.length - fails.length} PASS, ${fails.length} FAIL`);
  process.exit(fails.length ? 1 : 0);
}
