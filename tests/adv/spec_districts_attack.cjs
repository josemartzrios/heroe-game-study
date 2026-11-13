// Ataque a la normalización del guardado por distrito (spec 2026-11-12-ciudad-distritos §5.1–§5.2): propiedades con fast-check
// sobre CityStory.normalizeCity con la forma nueva (scene, at, d[mid], tips, restored/powers por distrito).
//  P1 nunca lanza (JSON hostil, __proto__/constructor propios, tipos basura, números extremos, bossPassedOf hostil)
//  P2 resultado solo con ids de cada distrito y valores válidos (true estricto, fechas reales y no futuras, route.done entero 0..n)
//  P3 idempotente: normalize(normalize(x)) == normalize(x), también tras ida y vuelta por JSON (lo que hacen save y load)
//  P4 la posición cae dentro de los bounds de su escena, fuera de toda caja y de toda boca de portal; yaw en [0, 2π) sin -0
//  P5 __proto__/constructor no contaminan Object.prototype ni el resultado
//  P6 restored y powers se recalculan por distrito: restored[mid] <=> jefe de ese distrito aprobado y taught >= need
//  P7 scene solo es 'plaza' o un distrito propio de los datos; d solo tiene los distritos de los datos, en su orden
//  P8 bossPassedOf solo se llama con claves de D.districts
//  P9 migración: sin scene, una posición numérica dentro del rect viejo da M02 y fuera del rect da la plaza
// Uso: node tests/adv/spec_districts_attack.cjs [RUNS=5000] [SEED=20261112]   (sale con 1 si algo falla)
const fc = require('fast-check');
const assert = require('assert');
const path = require('path');
const CityMove = require('../../city/move.js');
const CityStory = require('../../city/story.js');

const RUNS = +(process.argv[2] || 5000), SEED = +(process.argv[3] || 20261112);
const TODAY = '2026-11-12', TAU = Math.PI * 2;
const results = [];
let inputs = 0;
const ok = (name, cond, extra) => results.push([cond ? 'PASS' : 'FAIL', name, cond ? '' : (extra || '')]);
const norm = (raw, D, bp, today) => { inputs++; return CityStory.normalizeCity(raw, D, bp, today); };

function prop(name, arb, pred) {
  // ATAQUE: cada propiedad con semilla registrada; el contraejemplo reducido queda en el reporte
  const r = fc.check(fc.property(arb, pred), { numRuns: RUNS, seed: SEED, endOnFailure: false });
  ok(name + ' (' + RUNS + ' ejecuciones, semilla ' + SEED + ')', !r.failed,
    r.failed ? 'contraejemplo=' + safeStr(r.counterexample) + ' error=' + String(r.errorInstance && r.errorInstance.message || r.error).slice(0, 300) : '');
}
function safeStr(x) { try { return JSON.stringify(x).slice(0, 400); } catch (e) { return String(x); } }

function insideBox(x, z, r, boxes) {   // misma tolerancia que story.js (r - 1e-6): un punto que solo toca el borde no cuenta como dentro
  const rr = r - 1e-6;
  return boxes.some((b) => { const cx = Math.min(b.maxX, Math.max(b.minX, x)), cz = Math.min(b.maxZ, Math.max(b.minZ, z)); return (x - cx) ** 2 + (z - cz) ** 2 < rr * rr; });
}

(async () => {
  const D = (await import(path.join(__dirname, '..', '..', 'city', 'districts.mjs'))).city;
  const MIDS = Object.keys(D.districts), R = D.radius || 0.4, own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
  const ID = {};   // ids por distrito
  for (const mid of MIDS) { const M = D.districts[mid]; ID[mid] = { cr: M.creatures.map((c) => c.id), rp: M.repairs.map((c) => c.id), ap: M.apprentices.map((c) => c.id) }; }
  const ALL = { cr: [].concat(...MIDS.map((m) => ID[m].cr)), rp: [].concat(...MIDS.map((m) => ID[m].rp)), ap: [].concat(...MIDS.map((m) => ID[m].ap)) };
  const HOSTILE = ['PPROTO', 'constructor', 'prototype', 'toString', 'hasOwnProperty', 'valueOf', '', 'M02', 'M08', 'M99', 'a01 ', 'A01', 'bit​', 'r01\u0000', 'r09', 'a10'];

  // ---------- generadores ----------
  const dateArb = fc.oneof(
    fc.date({ min: new Date('1970-01-01'), max: new Date('2100-12-31') }).filter((d) => !isNaN(d.getTime())).map((d) => d.toISOString().slice(0, 10)),
    fc.constantFrom(TODAY, '2026-11-13', '9999-12-31', '2026-02-29', '2024-02-29', '2026-13-01', '2026-00-10', '2026-11-12\n', ' 2026-11-12', '2026-11-12T00:00', '0000-01-01', '+02026-11-12', '٢٠٢٦-١١-١٢'));
  const valArb = fc.oneof(fc.constant(true), fc.constant(false), fc.constantFrom('true', 1, 0, -0, NaN, Infinity, null, [], {}, [true], { v: true }), dateArb, fc.anything());
  const mapArb = (ids) => fc.oneof(
    fc.dictionary(fc.constantFrom(...ids, ...HOSTILE), valArb, { maxKeys: ids.length + 4 }),
    fc.anything(), fc.constant(null), fc.array(fc.constant(true)));
  const numArb = fc.oneof(fc.double(), fc.double({ min: -250, max: 80, noNaN: true }), fc.integer({ min: -200, max: 70 }),
    fc.constantFrom(-0, NaN, Infinity, -Infinity, 1e308, -1e308, 5e-324, Number.MAX_SAFE_INTEGER, '0', '8', null, true, [0], { valueOf: 0 }));
  const routeArb = fc.oneof(fc.record({ done: fc.oneof(numArb, fc.integer({ min: -3, max: 14 })) }, { requiredKeys: [] }), fc.anything(), fc.constant(null));
  const dEntryArb = fc.oneof({ weight: 6, arbitrary: fc.record({ beaten: mapArb(ALL.cr), repairs: mapArb(ALL.rp), taught: mapArb(ALL.ap), route: routeArb, PPROTO: fc.anything() }, { requiredKeys: [] }) },
    { weight: 1, arbitrary: fc.anything() }, { weight: 1, arbitrary: fc.constant(null) });
  const dArb = fc.oneof({ weight: 6, arbitrary: fc.dictionary(fc.constantFrom(...MIDS, 'PPROTO', 'constructor', 'M99', 'toString'), dEntryArb, { maxKeys: 5 }) },
    { weight: 1, arbitrary: fc.anything() }, { weight: 1, arbitrary: fc.constant(null) }, { weight: 1, arbitrary: fc.array(fc.constant(true)) });
  const atArb = fc.oneof(fc.record({ x: numArb, z: numArb, yaw: numArb }, { requiredKeys: [] }),
    fc.record({ x: fc.double({ min: -70, max: 70, noNaN: true }), z: fc.double({ min: -200, max: 60, noNaN: true }), yaw: numArb }),
    fc.anything(), fc.constant(null));
  const sceneArb = fc.oneof(fc.constantFrom('plaza', 'M02', 'M08', 'PPROTO', 'constructor', 'toString', 'M99', 'm02', ''), fc.anything());
  const cityArb = fc.record({
    prologue: valArb, run: valArb, bridgeSeen: valArb,
    beaten: mapArb(ALL.cr), repairs: mapArb(ALL.rp), taught: mapArb(ALL.ap),
    restored: mapArb([...MIDS, 'PPROTO']), powers: mapArb(['planos', 'PPROTO']),
    at: atArb, scene: sceneArb, d: dArb, tips: fc.oneof(fc.dictionary(fc.constantFrom('talk', 'star', 'creature', 'repair', 'tower', 'portals', 'PPROTO', 'x'), valArb), fc.anything()),
    PPROTO: fc.anything(), constructor: fc.anything()
  }, { requiredKeys: [] });
  // inyecta __proto__ como clave PROPIA (lo que produce JSON.parse sobre un localStorage manipulado)
  const viaJson = (x) => { let s; try { s = JSON.stringify(x); } catch (e) { return x; } if (s === undefined) return x; return JSON.parse(s.split('"PPROTO"').join('"__proto__"')); };
  const rawArb = fc.oneof({ weight: 6, arbitrary: cityArb.map(viaJson) }, { weight: 2, arbitrary: cityArb }, { weight: 1, arbitrary: fc.anything() },
    { weight: 1, arbitrary: fc.string({ maxLength: 50 }).map((s) => { try { return JSON.parse(s); } catch (e) { return s; } }) });
  // bossPassedOf: función pura sobre un conjunto de distritos, o valores hostiles (no función, que lanza, que devuelve algo que no es true)
  const bpArb = fc.oneof(
    fc.subarray(MIDS).map((set) => ({ kind: 'set', set, fn: (mid) => set.indexOf(mid) >= 0 })),
    fc.constantFrom(true, false, 0, 1, 'x', null, undefined).map((v) => ({ kind: 'value', fn: v })),
    fc.constant({ kind: 'throw', fn: () => { throw new Error('boom'); } }),
    fc.constantFrom('true', 1, {}, []).map((v) => ({ kind: 'truthy', fn: () => v })));
  const caseArb = fc.tuple(rawArb, bpArb);

  const protoKeysBefore = Object.getOwnPropertyNames(Object.prototype).join(',');

  // ---------- P1 nunca lanza ----------
  prop('P1 nunca lanza', caseArb, ([raw, bp]) => { norm(raw, D, bp.fn, TODAY); return true; });

  // ---------- P2 solo ids válidos y valores válidos ----------
  const validDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && new Date(s + 'T00:00:00Z').toISOString().slice(0, 10) === s && s <= TODAY;
  prop('P2 resultado solo con ids de CITY_DATA por distrito y valores válidos', caseArb, ([raw, bp]) => {
    const C = norm(raw, D, bp.fn, TODAY);
    assert.deepStrictEqual(Object.keys(C).sort(), ['at', 'd', 'powers', 'prologue', 'restored', 'run', 'scene', 'tips']);
    for (const k of ['prologue', 'run']) assert.strictEqual(typeof C[k], 'boolean');
    for (const [k, v] of Object.entries(C.tips)) { assert.ok(CityStory.TIP_IDS.includes(k), 'tip ' + k); assert.strictEqual(v, true); }
    for (const mid of MIDS) {
      const d = C.d[mid], I = ID[mid];
      for (const [k, v] of Object.entries(d.beaten)) { assert.ok(I.cr.includes(k), mid + ' beaten ' + k); assert.ok(validDate(v), 'fecha ' + v); }
      for (const [k, v] of Object.entries(d.repairs)) { assert.ok(I.rp.includes(k), mid + ' repairs ' + k); assert.strictEqual(v, true); }
      for (const [k, v] of Object.entries(d.taught)) { assert.ok(I.ap.includes(k), mid + ' taught ' + k); assert.strictEqual(v, true); }
      const hasRoute = !!D.districts[mid].route;
      assert.strictEqual('route' in d, hasRoute, mid + ' route');
      if (hasRoute) { const n = D.districts[mid].route.stations.length; assert.ok(Number.isInteger(d.route.done) && d.route.done >= 0 && d.route.done <= n && !Object.is(d.route.done, -0), 'done ' + d.route.done); assert.deepStrictEqual(Object.keys(d.route), ['done']); }
      assert.deepStrictEqual(Object.keys(d).filter((k) => k !== 'route').sort(), ['beaten', 'repairs', 'taught']);
    }
    assert.ok(Object.keys(C.restored).every((k) => MIDS.includes(k)) && Object.values(C.restored).every((v) => v === true));
    assert.ok(Object.keys(C.powers).every((k) => k === 'planos'));
    return true;
  });

  // ---------- P3 idempotencia (directa y tras JSON) ----------
  prop('P3 idempotente normalize(normalize(x)) == normalize(x)', caseArb, ([raw, bp]) => {
    const a = norm(raw, D, bp.fn, TODAY), b = norm(a, D, bp.fn, TODAY);
    assert.deepStrictEqual(b, a);
    const c = norm(JSON.parse(JSON.stringify(a)), D, bp.fn, TODAY);   // save() + load()
    assert.strictEqual(JSON.stringify(c), JSON.stringify(a));
    return true;
  });

  // ---------- P4 posición válida en su escena ----------
  const posArb = fc.tuple(fc.record({ at: fc.record({ x: numArb, z: numArb, yaw: numArb }), scene: sceneArb, taught: mapArb(ALL.ap) }, { requiredKeys: ['at'] }), bpArb);
  prop('P4 at finito, dentro de los bounds de su escena, fuera de toda caja y de toda boca de portal; yaw en [0, 2π)', fc.oneof(caseArb, posArb), ([raw, bp]) => {
    const C = norm(raw, D, bp.fn, TODAY), { x, z, yaw } = C.at, sc = CityMove.scene(D, C.scene), B = sc.bounds;
    assert.ok([x, z, yaw].every(Number.isFinite), 'no finito');
    assert.ok(x >= B.minX + R - 1e-9 && x <= B.maxX - R + 1e-9 && z >= B.minZ + R - 1e-9 && z <= B.maxZ - R + 1e-9, 'fuera de bounds ' + C.scene + ' ' + x + ',' + z);
    assert.ok(!insideBox(x, z, R, CityMove.boxesFor(D, C.scene)), 'dentro de caja ' + C.scene + ' ' + x + ',' + z);
    assert.strictEqual(CityMove.portalAt(D, C.scene, x, z), null, 'dentro de la boca de un portal ' + C.scene + ' ' + x + ',' + z);
    assert.ok(yaw >= 0 && yaw < TAU && !Object.is(yaw, -0), 'yaw ' + yaw);
    return true;
  });

  // ---------- P5 sin contaminación ----------
  prop('P5 __proto__/constructor no contaminan', caseArb, ([raw, bp]) => {
    const C = norm(raw, D, bp.fn, TODAY);
    assert.strictEqual(Object.getOwnPropertyNames(Object.prototype).join(','), protoKeysBefore);
    assert.strictEqual(({}).polluted, undefined);
    const objs = [C, C.tips, C.d, C.restored, C.powers, C.at];
    for (const mid of MIDS) objs.push(C.d[mid], C.d[mid].beaten, C.d[mid].repairs, C.d[mid].taught, C.d[mid].route);
    for (const o of objs.filter(Boolean)) {
      assert.strictEqual(Object.getPrototypeOf(o), Object.prototype);
      assert.ok(!Object.prototype.hasOwnProperty.call(o, '__proto__') && !Object.prototype.hasOwnProperty.call(o, 'constructor'));
    }
    return true;
  });

  // ---------- P6 restored recalculado por distrito (oráculo) ----------
  prop('P6 restored[mid] <=> jefe de ese distrito y taught >= need; powers.planos <=> M02 restaurado', caseArb, ([raw, bp]) => {
    const C = norm(raw, D, bp.fn, TODAY);
    for (const mid of MIDS) {
      const n = ID[mid].ap.filter((id) => C.d[mid].taught[id] === true).length, exp = bp.kind === 'set' && bp.set.includes(mid) && n >= D.districts[mid].need;
      assert.strictEqual(C.restored[mid] === true, exp, mid);
    }
    assert.strictEqual(C.powers.planos === true, C.restored.M02 === true);
    return true;
  });

  // ---------- P7 escena y distritos solo de los datos ----------
  prop('P7 scene es plaza o un distrito propio y d solo tiene los distritos de los datos, en su orden', caseArb, ([raw, bp]) => {
    const C = norm(raw, D, bp.fn, TODAY);
    assert.ok(C.scene === 'plaza' || own(D.districts, C.scene), 'scene ' + C.scene);
    assert.deepStrictEqual(Object.keys(C.d), MIDS);
    return true;
  });

  // ---------- P8 bossPassedOf solo con claves de D.districts ----------
  prop('P8 bossPassedOf solo se llama con claves de D.districts', rawArb, (raw) => {
    const calls = []; norm(raw, D, (mid) => { calls.push(mid); return false; }, TODAY);
    assert.ok(calls.every((m) => typeof m === 'string' && own(D.districts, m)), JSON.stringify(calls));
    return true;
  });

  // ---------- P9 migración por el rect viejo ----------
  const L = CityStory.LEGACY_M02_RECT;
  prop('P9 sin scene: posición numérica dentro del rect viejo → M02; fuera → plaza', fc.record({ x: fc.double({ min: -90, max: 90, noNaN: true }), z: fc.double({ min: -220, max: 60, noNaN: true }) }), ({ x, z }) => {
    const C = norm({ at: { x, z, yaw: 0 } }, D, () => false, TODAY), inside = x >= L.minX && x <= L.maxX && z >= L.minZ && z <= L.maxZ;
    assert.strictEqual(C.scene, inside ? 'M02' : 'plaza');
    return true;
  });

  // ---------- regresiones / adversariales puntuales ----------
  // ATAQUE: __proto__ propio con ids válidos dentro (JSON.parse lo deja como clave propia)
  const p1 = norm(JSON.parse('{"__proto__":{"prologue":true,"d":{"M02":{"taught":{"a01":true}}}},"d":{"__proto__":{"M02":{"taught":{"a01":true}}}},"taught":{"__proto__":{"a01":true}},"at":{"__proto__":{"x":0,"z":-45}}}'), D, () => true, TODAY);
  ok('ADV __proto__ propio no aporta datos', p1.prologue === false && Object.keys(p1.d.M02.taught).length === 0 && p1.scene === 'plaza' && p1.at.z === D.plaza.entry.z);
  // ATAQUE: constructor.prototype como camino de contaminación
  norm(JSON.parse('{"constructor":{"prototype":{"polluted":1}},"d":{"M02":{"beaten":{"constructor":{"prototype":{"polluted":1}}}}}}'), D, () => false, TODAY);
  ok('ADV constructor.prototype no contamina', ({}).polluted === undefined);
  // ATAQUE: fecha futura, 29-feb inexistente, salto de línea final
  const p3 = norm({ d: { M02: { beaten: { bit: '2026-11-13', silicio: '2026-02-29', kernel: '2026-11-12\n', eco: TODAY } } } }, D, () => false, TODAY);
  ok('ADV fechas futuras/inexistentes descartadas', JSON.stringify(p3.d.M02.beaten) === JSON.stringify({ eco: TODAY }), JSON.stringify(p3.d.M02.beaten));
  // ATAQUE: restored/powers manipulados sin cumplir la condición
  const p4 = norm({ restored: { M02: true, M08: true }, powers: { planos: true, vuelo: true } }, D, () => true, TODAY);
  ok('ADV restored/powers manipulados se recalculan', !p4.restored.M02 && !p4.powers.planos && !p4.restored.M08);
  // ATAQUE: yaw extremos
  const ys = [-0, -5e-324, 1e308, -1e308, -TAU, TAU, 7 * TAU - 1e-15].map((y) => norm({ at: { x: 0, z: 8, yaw: y } }, D, () => false, TODAY).at.yaw);
  ok('ADV yaw extremos en [0, 2π) y sin -0', ys.every((y) => y >= 0 && y < TAU && !Object.is(y, -0)), JSON.stringify(ys));
  // ATAQUE: regresión del contraejemplo de P3: yaw negativo diminuto; ((y % 2π) + 2π) % 2π redondea distinto en la 2.ª pasada
  const ry = [-1e-13, -4.46309655899313e-13].map((y) => { const a = norm({ at: { x: 0, z: 0, yaw: y } }, D, () => false, TODAY); return [a.at.yaw, norm(a, D, () => false, TODAY).at.yaw]; });
  ok('REG yaw idempotente con yaw=-1e-13 y -4.46309655899313e-13', ry.every(([a, b]) => a === b), JSON.stringify(ry));
  // ATAQUE: raw no plano (Object.create(null), Date, array con props, string gigante)
  const weird = [Object.create(null), new Date(), Object.assign([], { prologue: true }), 'x'.repeat(1e6), 42, true];
  ok('ADV raw no plano → estado limpio', weird.every((w) => { const c = norm(w, D, () => true, TODAY); return c.prologue === false && c.scene === 'plaza' && c.at.z === D.plaza.entry.z; }));
  // ATAQUE: bossPassedOf como booleano (la firma vieja que aún pasaba el motor): no lanza y no restaura nada
  const c0 = norm({ d: { M02: { taught: Object.fromEntries(ID.M02.ap.slice(0, 8).map((a) => [a, true])) } } }, D, true, TODAY);
  ok('ADV bossPassedOf booleano (firma vieja) no lanza ni restaura', Object.keys(c0.restored).length === 0);

  // ---------- reporte ----------
  const fails = results.filter((r) => r[0] === 'FAIL');
  results.forEach((r) => console.log(r[0] + ' ' + r[1] + (r[2] ? '\n     ' + r[2] : '')));
  console.log('\nentradas procesadas por normalizeCity: ' + inputs + ' | pruebas: ' + results.length + ' | fallos: ' + fails.length);
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
