// Ataque previo al spec 2026-11-12-ciudad-distritos (§5.1): fija con fast-check las propiedades que la
// normalizeCity ACTUAL (city/story.js) cumple y que la migración por distritos debe conservar.
//  P1 nunca lanza (JSON hostil, __proto__/constructor propios, tipos basura, números extremos)
//  P2 resultado solo con ids de CITY_DATA y valores válidos (true estricto, fechas reales y no futuras)
//  P3 idempotente: normalize(normalize(x)) == normalize(x), también tras ida y vuelta por JSON (lo que hace save/load)
//  P4 la posición nunca cae dentro de una caja de colisión ni fuera de bounds; yaw en [0, 2π)
//  P5 __proto__/constructor no contaminan Object.prototype ni el resultado
//  P6 restored/powers se recalculan: restored.M02 <=> jefe aprobado y taught >= need
// Además: sondas de los huecos del spec (informativas, no fallan) y regresiones fijas.
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

function insideBox(x, z, r, boxes) {
  return boxes.some((b) => { const cx = Math.min(b.maxX, Math.max(b.minX, x)), cz = Math.min(b.maxZ, Math.max(b.minZ, z)); return (x - cx) ** 2 + (z - cz) ** 2 < r * r; });
}

(async () => {
  const D = (await import(path.join(__dirname, '..', '..', 'city', 'districts.mjs'))).city;
  const M = D.districts.M02, R = D.radius || 0.4, B = D.bounds;
  const CR = M.creatures.map((c) => c.id), RP = M.repairs.map((c) => c.id), AP = M.apprentices.map((c) => c.id);
  const HOSTILE = ['PPROTO', 'constructor', 'prototype', 'toString', 'hasOwnProperty', 'valueOf', '', 'M02', 'M08', 'a01 ', 'A01', 'bit​', 'r01\u0000'];

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
  const atArb = fc.oneof(fc.record({ x: numArb, z: numArb, yaw: numArb }, { requiredKeys: [] }), fc.anything(), fc.constant(null));
  const cityArb = fc.record({
    prologue: valArb, run: valArb, bridgeSeen: valArb,
    beaten: mapArb(CR), repairs: mapArb(RP), taught: mapArb(AP),
    restored: mapArb(['M02', 'M08', 'PPROTO']), powers: mapArb(['planos', 'PPROTO']),
    at: atArb, scene: fc.oneof(fc.constantFrom('plaza', 'M02', 'M08', 'PPROTO', 'constructor', 'toString', ''), fc.anything()),
    d: fc.anything(), tips: fc.anything(), PPROTO: fc.anything(), constructor: fc.anything()
  }, { requiredKeys: [] });
  // inyecta __proto__ como clave PROPIA (lo que produce JSON.parse sobre un localStorage manipulado)
  const viaJson = (x) => { let s; try { s = JSON.stringify(x); } catch (e) { return x; } if (s === undefined) return x; return JSON.parse(s.split('"PPROTO"').join('"__proto__"')); };
  const rawArb = fc.oneof({ weight: 6, arbitrary: cityArb.map(viaJson) }, { weight: 2, arbitrary: cityArb }, { weight: 1, arbitrary: fc.anything() },
    { weight: 1, arbitrary: fc.string({ maxLength: 50 }).map((s) => { try { return JSON.parse(s); } catch (e) { return s; } }) });
  const caseArb = fc.tuple(rawArb, fc.oneof(fc.boolean(), fc.constantFrom(0, 1, 'x', null, undefined)));

  const protoKeysBefore = Object.getOwnPropertyNames(Object.prototype).join(',');

  // ---------- P1 nunca lanza ----------
  prop('P1 nunca lanza', caseArb, ([raw, bp]) => { norm(raw, D, bp, TODAY); return true; });

  // ---------- P2 solo ids válidos y valores válidos ----------
  const validDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && new Date(s + 'T00:00:00Z').toISOString().slice(0, 10) === s && s <= TODAY;
  prop('P2 resultado solo con ids de CITY_DATA y valores válidos', caseArb, ([raw, bp]) => {
    const C = norm(raw, D, bp, TODAY);
    assert.deepStrictEqual(Object.keys(C).sort(), ['at', 'beaten', 'bridgeSeen', 'powers', 'prologue', 'repairs', 'restored', 'run', 'taught']);
    for (const k of ['prologue', 'run', 'bridgeSeen']) assert.strictEqual(typeof C[k], 'boolean');
    for (const [k, v] of Object.entries(C.beaten)) { assert.ok(CR.includes(k), 'beaten ' + k); assert.ok(validDate(v), 'fecha ' + v); }
    for (const [k, v] of Object.entries(C.repairs)) { assert.ok(RP.includes(k), 'repairs ' + k); assert.strictEqual(v, true); }
    for (const [k, v] of Object.entries(C.taught)) { assert.ok(AP.includes(k), 'taught ' + k); assert.strictEqual(v, true); }
    assert.ok(Object.keys(C.restored).every((k) => k === 'M02') && Object.keys(C.powers).every((k) => k === 'planos'));
    return true;
  });

  // ---------- P3 idempotencia (directa y tras JSON) ----------
  prop('P3 idempotente normalize(normalize(x)) == normalize(x)', caseArb, ([raw, bp]) => {
    const a = norm(raw, D, bp, TODAY), b = norm(a, D, bp, TODAY);
    assert.deepStrictEqual(b, a);
    const c = norm(JSON.parse(JSON.stringify(a)), D, bp, TODAY);   // save() + load()
    assert.strictEqual(JSON.stringify(c), JSON.stringify(a));
    return true;
  });

  // ---------- P4 posición válida ----------
  const posArb = fc.tuple(fc.record({ at: fc.record({ x: numArb, z: numArb, yaw: numArb }), taught: mapArb(AP) }), fc.boolean());
  prop('P4 at finito, dentro de bounds, fuera de toda caja; yaw en [0, 2π)', fc.oneof(caseArb, posArb), ([raw, bp]) => {
    const C = norm(raw, D, bp, TODAY), { x, z, yaw } = C.at;
    assert.ok([x, z, yaw].every(Number.isFinite), 'no finito');
    assert.ok(x >= B.minX + R && x <= B.maxX - R && z >= B.minZ + R && z <= B.maxZ - R, 'fuera de bounds ' + x + ',' + z);
    assert.ok(!insideBox(x, z, R, CityMove.boxesFor(D, C.restored.M02 === true)), 'dentro de caja ' + x + ',' + z);
    assert.ok(yaw >= 0 && yaw < TAU, 'yaw ' + yaw);
    return true;
  });

  // ---------- P5 sin contaminación ----------
  prop('P5 __proto__/constructor no contaminan', caseArb, ([raw, bp]) => {
    const C = norm(raw, D, bp, TODAY);
    assert.strictEqual(Object.getOwnPropertyNames(Object.prototype).join(','), protoKeysBefore);
    assert.strictEqual(({}).polluted, undefined);
    for (const o of [C, C.beaten, C.repairs, C.taught, C.restored, C.powers, C.at]) {
      assert.strictEqual(Object.getPrototypeOf(o), Object.prototype);
      assert.ok(!Object.prototype.hasOwnProperty.call(o, '__proto__') && !Object.prototype.hasOwnProperty.call(o, 'constructor'));
    }
    return true;
  });

  // ---------- P6 restored recalculado (oráculo) ----------
  prop('P6 restored.M02 <=> jefe y taught >= need; powers.planos igual', caseArb, ([raw, bp]) => {
    const C = norm(raw, D, bp, TODAY), n = AP.filter((id) => C.taught[id] === true).length, exp = !!bp && n >= M.need;
    assert.strictEqual(C.restored.M02 === true, exp); assert.strictEqual(C.powers.planos === true, exp);
    return true;
  });

  // ---------- regresiones / adversariales puntuales ----------
  // ATAQUE: __proto__ propio con ids válidos dentro (JSON.parse lo deja como clave propia)
  const p1 = norm(JSON.parse('{"__proto__":{"prologue":true,"taught":{"a01":true}},"taught":{"__proto__":{"a01":true}},"at":{"__proto__":{"x":0,"z":-45}}}'), D, true, TODAY);
  ok('ADV __proto__ propio no aporta datos', p1.prologue === false && Object.keys(p1.taught).length === 0 && p1.at.z === D.spawn.z);
  // ATAQUE: constructor.prototype como camino de contaminación
  norm(JSON.parse('{"constructor":{"prototype":{"polluted":1}},"beaten":{"constructor":{"prototype":{"polluted":1}}}}'), D, false, TODAY);
  ok('ADV constructor.prototype no contamina', ({}).polluted === undefined);
  // ATAQUE: fecha futura, 29-feb inexistente, salto de línea final
  const p3 = norm({ beaten: { bit: '2026-11-13', silicio: '2026-02-29', kernel: '2026-11-12\n', eco: TODAY } }, D, false, TODAY);
  ok('ADV fechas futuras/inexistentes descartadas', JSON.stringify(p3.beaten) === JSON.stringify({ eco: TODAY }), JSON.stringify(p3.beaten));
  // ATAQUE: restored/powers manipulados sin cumplir la condición
  const p4 = norm({ restored: { M02: true, M08: true }, powers: { planos: true, vuelo: true } }, D, true, TODAY);
  ok('ADV restored/powers manipulados se recalculan', !p4.restored.M02 && !p4.powers.planos && !p4.restored.M08);
  // ATAQUE: yaw extremos
  const ys = [-0, -5e-324, 1e308, -1e308, -TAU, TAU, 7 * TAU - 1e-15].map((y) => norm({ at: { x: 0, z: 8, yaw: y } }, D, false, TODAY).at.yaw);
  ok('ADV yaw extremos en [0, 2π) y sin -0', ys.every((y) => y >= 0 && y < TAU && !Object.is(y, -0)), JSON.stringify(ys));
  // ATAQUE: regresión del contraejemplo de P3: yaw negativo diminuto; ((y % 2π) + 2π) % 2π redondea distinto en la 2.ª pasada
  const ry = [-1e-13, -4.46309655899313e-13].map((y) => { const a = norm({ at: { x: 0, z: 0, yaw: y } }, D, false, TODAY); return [a.at.yaw, norm(a, D, false, TODAY).at.yaw]; });
  ok('REG yaw idempotente con yaw=-1e-13 y -4.46309655899313e-13', ry.every(([a, b]) => a === b), JSON.stringify(ry));
  // ATAQUE: raw no plano (Object.create(null), Date, array con props, string gigante)
  const weird = [Object.create(null), new Date(), Object.assign([], { prologue: true }), 'x'.repeat(1e6), 42, true];
  ok('ADV raw no plano → estado limpio', weird.every((w) => { const c = norm(w, D, true, TODAY); return c.prologue === false && c.at.z === D.spawn.z; }));

  // ---------- sondas de huecos del spec §5.1 (informativas) ----------
  const info = [];
  // la calle vieja entre plaza y M02 (z en [-50, -30]) hoy es posición válida; §5.1 la manda a la plaza con las mismas coordenadas
  let street = 0, tot = 0, gap = 0;
  for (let x = -60; x <= 60; x += 2) for (let z = -50; z <= -30; z += 1) {
    tot++; const c = norm({ at: { x, z } }, D, false, TODAY);
    if (c.at.x === x && c.at.z === z) { street++; if (z <= -46 && z > -50) gap++; }
  }
  info.push('calle vieja z∈[-50,-30]: ' + street + '/' + tot + ' posiciones aceptadas hoy (' + gap + ' con z∈(-50,-46], dentro de bounds M02 −46 pero fuera de rect −50)');
  // posiciones en x∈(50,70) aceptadas hoy, fuera de bounds de la plaza del spec (−50..50)
  let wide = 0; for (let z = -40; z <= 38; z += 2) { const c = norm({ at: { x: 65, z } }, D, false, TODAY); if (c.at.x === 65) wide++; }
  info.push('x=65 (fuera de bounds plaza del spec, dentro de los viejos): ' + wide + ' posiciones aceptadas hoy');
  // clamp vs reinicio: hoy x=1e9 se recorta al borde (no vuelve a spawn); el spec dice "si no, entry"
  const cl = norm({ at: { x: 1e9, z: 0 } }, D, false, TODAY).at;
  info.push('at x=1e9 hoy → ' + JSON.stringify(cl) + ' (recorte, no entry)');
  // al sur del puente (restaurado), fuera del rect de M02: el spec lo manda a la plaza → entry
  const sb = norm({ at: { x: 0, z: -190 }, taught: Object.fromEntries(AP.map((a) => [a, true])) }, D, true, TODAY).at;
  info.push('al otro lado del puente z=-190 (restaurado) hoy → ' + JSON.stringify(sb));
  // firma: el spec cambia bossPassed (boolean) por bossPassedOf (función); el engine pasa hoy un boolean
  info.push('engine.html:465 pasa bp boolean; con la firma nueva `bossPassedOf(mid)` un boolean lanzaría TypeError si no se valida typeof');

  // ---------- reporte ----------
  const fails = results.filter((r) => r[0] === 'FAIL');
  results.forEach((r) => console.log(r[0] + ' ' + r[1] + (r[2] ? '\n     ' + r[2] : '')));
  console.log('\nSONDAS DEL SPEC:'); info.forEach((s) => console.log('  - ' + s));
  console.log('\nentradas procesadas por normalizeCity: ' + inputs + ' | pruebas: ' + results.length + ' | fallos: ' + fails.length);
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
