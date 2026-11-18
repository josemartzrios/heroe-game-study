// Ataque a las dos decisiones de la Tanda 2 con el código REAL y los cinco distritos reales:
//  (a) rango previo de la celebración = rankOf contando solo los restaurados de CITY_DATA.districts que no están en mids ("Subes" si difiere);
//      story.js real (rankOf con claves propias) y la fórmula tal como la escribe cityRankLine.
//  (b) tinte de criaturas por distrito en city/sprites2d.js REAL: D.order[0] es la referencia, un distrito sin colores no rompe nada;
//      el atlas falso registra fillStyle por celda.
// Uso: node tests/adv/tanda2_plan_attack.cjs [RUNS=1000] [FUZZ_N=100000] [SEED=20261117]   (código 1 si algo rompe)
const fc = require('fast-check');
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const { pathToFileURL } = require('url');
const CS = require('../../city/story.js');

const RUNS = +(process.argv[2] || 1000), FUZZ_N = +(process.argv[3] || 100000), SEED = +(process.argv[4] || 20261117);
const root = path.join(__dirname, '..', '..');
const imp = (f) => import(pathToFileURL(path.join(root, f)).href);
const hasOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const results = [];
let attacks = 0, props = 0, fuzzTotal = 0;
const ok = (name, cond, extra) => results.push([cond ? 'PASS' : 'FAIL', name, cond ? '' : (extra || '')]);
const safeStr = (x) => { try { return String(JSON.stringify(x)).slice(0, 400); } catch (e) { return String(x); } };
function attack(name, fn) { attacks++; try { const r = fn(); ok('A: ' + name, r === undefined || r === true, typeof r === 'string' ? r : ''); } catch (e) { ok('A: ' + name, false, 'lanza: ' + String(e && e.message).slice(0, 300)); } }
function prop(name, arb, pred) {
  props++;
  const r = fc.check(fc.property(arb, pred), { numRuns: RUNS, seed: SEED, endOnFailure: false });
  ok('P: ' + name + ' (' + RUNS + ' ejecuciones, semilla ' + SEED + ')', !r.failed,
    r.failed ? 'contraejemplo=' + safeStr(r.counterexample) + ' error=' + String(r.errorInstance && r.errorInstance.message || r.error).slice(0, 300) : '');
}
function mulberry(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// ---------- la fórmula de cityRankLine: restaurados propios de los datos que no están en mids ----------
function copySpec(restored, mids, D) { var r = {}; Object.keys(D.districts).forEach(function (id) { if (restored && Object.prototype.hasOwnProperty.call(restored, id) && restored[id] === true && mids.indexOf(id) < 0) r[id] = true; }); return r; }
// mensaje: 'Subes a X.' si rankOf(antes) !== rankOf(ahora), si no 'Sigues como X.'
function planSays(C, D, mids) {
  var ahora = CS.rankOf(C, D), antes = CS.rankOf({ restored: copySpec(C.restored, mids, D) }, D);
  return antes !== ahora ? 'sube' : 'sigue';
}
// oráculo obviamente correcto: índice del rango por número de distritos de D restaurados (restored[id] === true como propiedad propia)
function rankIdx(n, D) { let k = 0; D.ranks.forEach((rk, i) => { if (n >= rk[0]) k = i; }); return k; }
function countOwn(restored, D, skip) { return Object.keys(D.districts).filter((id) => hasOwn(restored, id) && restored[id] === true && !(skip || []).includes(id)).length; }

// ---------- city/sprites2d.js real ----------
const SPR_SRC = fs.readFileSync(path.join(root, 'city/sprites2d.js'), 'utf8');
const PLAN_SRC = SPR_SRC;
function loadSprites(src) { const m = { exports: {} }; vm.runInNewContext(src, { module: m, Math, Object, Array, Error }); return m.exports; }
// documento falso: cada canvas registra [fillStyle, x, y] por fillRect
function fakeDoc() {
  return { createElement() { const ops = []; return { width: 0, height: 0, ops, getContext() { const g = { fillStyle: '', ops, fillRect(x, y) { ops.push([g.fillStyle, x, y]); }, clearRect() {}, drawImage() {} }; return g; } }; } };
}
// colores (en orden) que pinta la celda del cuadro 0 de la variante `variant` de criatura
function creatureCell(SP, variant) {
  const f = SP.frame('creature', variant, 'down', 0);
  return f.img.ops.filter(([, x, y]) => x >= f.sx && x < f.sx + f.w && y >= f.sy && y < f.sy + f.h).map((o) => o[0]);
}
function creatureGeom(SP, variant) {   // forma: posiciones relativas de cada fillRect (sin color)
  const f = SP.frame('creature', variant, 'down', 0);
  return f.img.ops.filter(([, x, y]) => x >= f.sx && x < f.sx + f.w && y >= f.sy && y < f.sy + f.h).map((o) => (o[1] - f.sx) + ',' + (o[2] - f.sy)).join(' ');
}
function body(cell) { return cell[1]; }   // 0 sombra, 1 cuerpo
function mark(cell) { const shadow = cell[0], b = cell[1]; return cell.find((c) => c !== b && c !== shadow && c !== '#ffd23f' && c !== '#12162e' && c !== '#ffffff'); }   // el acento (o la marca #3a2470 de la referencia)

(async () => {
  const D2 = (await imp('city/districts.mjs')).city;
  const m02 = D2.districts.M02, m08 = D2.districts.M08;
  const DIST = D2.districts;   // los cinco distritos reales, en el orden de city/districts.mjs
  const ORDER5 = ['M02', 'M08', 'M03', 'M01', 'M10'];
  const mkD = (order, over) => ({ ranks: D2.ranks, order: D2.order, radius: D2.radius, plaza: D2.plaza, districts: Object.fromEntries(order.map((m) => [m, (over && over[m]) || DIST[m]])) });
  const D5 = mkD(ORDER5);
  const MIDS = ORDER5;

  // =================== (a) Task 3: rango previo ===================
  const JUNK = ['M04', 'M99', '', 'constructor', 'toString', 'hasOwnProperty', '__proto__', 'm02', 'M02 ', 'M0​2'];
  const keyArb = fc.oneof(fc.constantFrom(...MIDS), fc.constantFrom(...JUNK), fc.string({ maxLength: 4 }));
  const valArb = fc.oneof({ weight: 4, arbitrary: fc.constant(true) }, fc.constantFrom(false, 1, 'true', null, undefined, 0, NaN, {}, [true]));
  const restoredArb = fc.dictionary(keyArb, valArb, { maxKeys: 12, noNullPrototype: true })   // S.city.restored siempre es un objeto plano (normalizeCity);
  const midsArb = fc.array(keyArb, { maxLength: 8 });   // repetidos, inexistentes, junk
  for (const [vname, copy] of [['cityRankLine', null]]) {
    // ATAQUE: "subió" del plan ⇔ el rango (oráculo por conteo) de verdad subió, con restaurados y mids arbitrarios
    prop(`(a) [${vname}] plan "Subes" ⇔ rangoIdx(después) > rangoIdx(después sin mids)`, fc.tuple(restoredArb, midsArb), ([restored, mids]) => {
      const C = { restored };
      const subio = rankIdx(countOwn(restored, D5), D5) > rankIdx(countOwn(restored, D5, mids), D5);
      return (planSays(C, D5, mids) === 'sube') === subio;
    });
    // ATAQUE: el rango "antes" nunca es mayor que el de "después" (quitar restaurados no puede subir el rango)
    prop(`(a) [${vname}] rango previo ≤ rango actual`, fc.tuple(restoredArb, midsArb), ([restored, mids]) => {
      const nameIdx = (nm) => D5.ranks.findIndex((r) => r[1] === nm);
      return nameIdx(CS.rankOf({ restored: copySpec(restored, mids, D5) }, D5)) <= nameIdx(CS.rankOf({ restored }, D5));
    });
    // ATAQUE: restored con una clave propia "__proto__" (JSON.parse) cuyo valor es un objeto: la copia cambia el prototipo y rankOf la ve vacía
    prop(`(a) [${vname}] restored de JSON con "__proto__" propio: "Subes" ⇔ subió`, fc.tuple(fc.subarray(MIDS), midsArb, fc.constantFrom('{}', '{"M02":true}', '[]', 'null', 'true')), ([rs, mids, pv]) => {
      const restored = JSON.parse('{"__proto__":' + pv + (rs.length ? ',' : '') + rs.map((m) => JSON.stringify(m) + ':true').join(',') + '}');
      if (!mids.length) mids = ['M02'];
      const subio = rankIdx(countOwn(restored, D5), D5) > rankIdx(countOwn(restored, D5, mids), D5);
      return (planSays({ restored }, D5, mids) === 'sube') === subio;
    });
  }
  // ATAQUE: con applyRestore REAL, mids = changed y los jefes aprobados solo crecen (un jefe aprobado no desaparece del guardado; si desapareciera, el aviso
  // podría decir "Subes" sin subir: límite aceptado en el spec)
  prop('(a) applyRestore real: "Subes" ⇔ rango(después) > rango(antes real)', fc.tuple(fc.subarray(MIDS), fc.subarray(MIDS), fc.subarray(MIDS)), ([taught, bossA, extra]) => {
    const bossB = MIDS.filter((m) => bossA.includes(m) || extra.includes(m));
    const C = { d: {}, restored: {}, powers: {} };
    MIDS.forEach((m) => { C.d[m] = { taught: {} }; if (taught.includes(m)) D5.districts[m].apprentices.forEach((a) => { C.d[m].taught[a.id] = true; }); });
    CS.applyRestore(C, D5, (m) => bossA.includes(m));
    const before = CS.rankOf(C, D5), beforeIdx = D5.ranks.findIndex((r) => r[1] === before);
    const rs = CS.applyRestore(C, D5, (m) => bossB.includes(m));
    if (!rs.changed.length) return true;   // sin cambios no hay celebración
    const afterIdx = D5.ranks.findIndex((r) => r[1] === CS.rankOf(C, D5));
    return (planSays(C, D5, rs.changed) === 'sube') === (afterIdx > beforeIdx);
  });
  // casos con nombre del plan (Step 1 de Task 3)
  // ATAQUE: 2.º distrito restaurado (M02 ya, ahora M08) debe decir "Sigues como Junior."
  attack('(a) M02 ya restaurado + M08 nuevo → sigue', () => planSays({ restored: { M02: true, M08: true } }, D5, ['M08']) === 'sigue' || 'dice sube');
  // ATAQUE: dos a la vez de 0 a 2 → "Subes a Junior."
  attack('(a) de 0 a 2 a la vez → sube', () => planSays({ restored: { M02: true, M08: true } }, D5, ['M02', 'M08']) === 'sube' || 'dice sigue');
  // ATAQUE: mids con duplicados e inexistentes no cambian el veredicto
  attack('(a) mids repetidos/inexistentes: [M08,M08,M99,__proto__] con M02 ya → sigue', () => planSays({ restored: { M02: true, M08: true } }, D5, ['M08', 'M08', 'M99', '__proto__']) === 'sigue' || 'dice sube');
  // ATAQUE: el 3.º distrito cruza el umbral 3 (Semi-senior)
  attack('(a) 2 → 3 cruza a Semi-senior → sube', () => planSays({ restored: { M02: true, M08: true, M03: true } }, D5, ['M03']) === 'sube' || 'dice sigue');
  // ATAQUE: restored con un mid que el plan quita pero cuyo valor no es true (no contaba antes ni ahora) → sigue
  attack('(a) restored {M02:true, M08:"true"} mids [M08] → sigue', () => planSays({ restored: { M02: true, M08: 'true' } }, D5, ['M08']) === 'sigue' || 'dice sube');
  // ATAQUE: restored no objeto (null / array) → no lanza
  attack('(a) restored null o array → no lanza y sigue', () => ['sigue'].includes(planSays({ restored: null }, D5, ['M02'])) && planSays({ restored: [true] }, D5, ['0']) === 'sigue' || 'mal');
  // ATAQUE: Object.prototype contaminado con M02:true (otra librería): rankOf lee rs[id] sin hasOwn
  attack('(a) Object.prototype.M08 = true: restored {M02:true} mids [M02] → oráculo dice sube (Becario→Junior)', () => {
    Object.prototype.M08 = true;
    try { return planSays({ restored: { M02: true } }, D5, ['M02']) === 'sube' || 'dice sigue: el M08 heredado cuenta en antes y ahora'; } finally { delete Object.prototype.M08; }
  });
  // fuzzing: nunca lanza ni devuelve otra cosa con restored/mids aleatorios (incl. claves raras)
  (function fuzzA() {
    const rnd = mulberry(SEED), pool = MIDS.concat(JUNK, ['‮M02', 'M02\u0000', '${x}', '<script>']);
    const vals = [true, true, true, false, 1, 'true', null, undefined, NaN, {}, []];
    let bad = null, n = 0, nbad = 0;
    for (; n < FUZZ_N; n++) {
      const restored = {}, mids = [];
      for (let i = Math.floor(rnd() * 10); i-- > 0;) Object.defineProperty(restored, pool[Math.floor(rnd() * pool.length)], { value: vals[Math.floor(rnd() * vals.length)], enumerable: true, writable: true, configurable: true });   // clave propia, como JSON.parse
      for (let i = Math.floor(rnd() * 8); i-- > 0;) mids.push(pool[Math.floor(rnd() * pool.length)]);
      try {
        const s = planSays({ restored }, D5, mids);
        const subio = rankIdx(countOwn(restored, D5), D5) > rankIdx(countOwn(restored, D5, mids), D5);
        if ((s === 'sube') !== subio) { nbad++; if (!bad) bad = { restored, mids, s }; }
      } catch (e) { nbad++; if (!bad) bad = { restored, mids, e: e.message }; }
    }
    fuzzTotal += n; attacks++;
    ok('F: (a) fuzz restored/mids ' + n + ' entradas', !bad, nbad + ' fallos; primero=' + safeStr(bad) + (bad && Object.getPrototypeOf(bad.restored) !== Object.prototype ? ' (restored con __proto__ propio)' : ''));
  })();

  // =================== (b) Task 2: tinta por criatura ===================
  const PAL = ['#7a52c4', '#b06cff', '#5a3a9a', '#9a4fd8', '#8a5fe0', '#6a3fb0'];
  const BASE = loadSprites(SPR_SRC); BASE.init(fakeDoc()); BASE.setData(mkD(ORDER5));
  const baseM02 = m02.creatures.map((c) => creatureCell(BASE, 'M02:' + c.id));
  const plan = (D) => { const SP = loadSprites(PLAN_SRC); SP.init(fakeDoc()); SP.setData(D); return SP; };
  // ATAQUE: con el orden del plan (M02 primero) M02 queda idéntica a hoy (c1)
  attack('(b) orden {M02,M08,M03,M01,M10}: M02 idéntica a hoy', () => { const SP = plan(D5); return m02.creatures.every((c, i) => safeStr(creatureCell(SP, 'M02:' + c.id)) === safeStr(baseM02[i])) || 'cambia'; });
  // ATAQUE: el orden de D.districts NO es parte de los datos validados: si M01 queda primero (orden alfabético en districts.mjs) M02 pierde su paleta
  attack('(b) orden {M01,M02,M08,M03,M10}: M02 idéntica a hoy', () => {
    const SP = plan(mkD(['M01', 'M02', 'M08', 'M03', 'M10']));
    const bad = m02.creatures.map((c, i) => [c.id, body(creatureCell(SP, 'M02:' + c.id)), body(baseM02[i])]).filter((x) => x[1] !== x[2]);
    return bad.length ? 'M02 cambia: ' + safeStr(bad.slice(0, 2)) : true;
  });
  // ATAQUE: con M01 primero, sus criaturas salen con la paleta morada de M02 en vez de su colors.a
  attack('(b) orden {M01,M02,...}: las criaturas de M01 usan sus colors.a/colors.b', () => {
    const SP = plan(mkD(['M01', 'M02', 'M08', 'M03', 'M10']));
    const bad = DIST.M01.creatures.map((c) => creatureCell(SP, 'M01:' + c.id)).filter((cell) => body(cell) !== DIST.M01.colors.a || mark(cell) !== DIST.M01.colors.b);
    return bad.length ? bad.length + '/6 criaturas de M01 sin sus colores, p.ej. cuerpo=' + body(bad[0]) + ' marca=' + mark(bad[0]) : true;
  });
  // ATAQUE: un distrito sin colors (check_district.mjs no exige colors): setData lanza TypeError
  attack('(b) M10 sin colors: setData no lanza', () => { plan(mkD(ORDER5, { M10: Object.assign({}, DIST.M10, { colors: undefined }) })); });
  // ATAQUE: tras el throw, data ya quedó = D (se asigna antes del bucle): reintentar setData(D) es un no-op y las listas quedan a medias
  attack('(b) tras el fallo de setData, corregir colors y reintentar deja las 6 criaturas de M10', () => {
    const SP = loadSprites(PLAN_SRC); SP.init(fakeDoc());
    const M10 = Object.assign({}, DIST.M10, { colors: null }), D = mkD(ORDER5, { M10 });
    try { SP.setData(D); } catch (e) { /* esperado con el plan */ }
    M10.colors = { a: '#ff5f6d', b: '#c9b8ff' }; SP.setData(D);
    const n = SP.kinds.creature.filter((v) => v.indexOf('M10:') === 0).length;
    return n === 6 || 'criaturas M10 registradas=' + n + ' de 6 (frame cae a la variante 0)';
  });
  // ATAQUE: colors sin b (solo a): la marca no puede quedar undefined/'undefined'
  attack('(b) colors {a} sin b: ninguna celda pinta undefined', () => {
    const SP = plan(mkD(ORDER5, { M03: Object.assign({}, DIST.M03, { colors: { a: '#ff9f43' } }) }));
    const cell = creatureCell(SP, 'M03:' + DIST.M03.creatures[0].id); return cell.every((c) => typeof c === 'string' && c) || 'fillStyle=' + safeStr(cell);
  });
  // ATAQUE: "criaturas distinguibles": forma (STYLE) + color de cuerpo iguales entre distritos distintos (c3 solo compara el mismo índice)
  attack('(b) ninguna criatura de otro distrito repite forma y cuerpo de una de M02', () => {
    const SP = plan(D5), dup = [];
    m02.creatures.forEach((c, i) => ORDER5.slice(1).forEach((mid) => D5.districts[mid].creatures.forEach((o, j) => {
      const a = creatureCell(SP, 'M02:' + c.id), b = creatureCell(SP, mid + ':' + o.id);
      if (body(a) === body(b) && creatureGeom(SP, 'M02:' + c.id) === creatureGeom(SP, mid + ':' + o.id)) dup.push(`M02:${c.id}(i${i}) ~ ${mid}:${o.id}(i${j}) cuerpo ${body(a)}`);
    })));
    return dup.length ? dup.join('; ') : true;
  });
  // PROPIEDAD: para CUALQUIER orden de los 5 distritos, M02 conserva su aspecto y cada otro distrito pinta con su colors.a/colors.b
  prop('(b) cualquier permutación de D.districts: M02 idéntica y los demás con sus colores', fc.shuffledSubarray(ORDER5, { minLength: 5, maxLength: 5 }), (perm) => {
    const SP = plan(mkD(perm));
    if (!m02.creatures.every((c, i) => safeStr(creatureCell(SP, 'M02:' + c.id)) === safeStr(baseM02[i]))) return false;
    return perm.filter((m) => m !== 'M02').every((m) => D5.districts[m].creatures.every((c) => { const cell = creatureCell(SP, m + ':' + c.id); return body(cell) === D5.districts[m].colors.a && mark(cell) === D5.districts[m].colors.b; }));
  });
  // PROPIEDAD: con M02 primero y cualquier orden del resto, setData nunca lanza con colors arbitrarios (faltantes, no string, null)
  prop('(b) colors arbitrarios en un distrito no-M02: setData no lanza', fc.tuple(fc.constantFrom('M08', 'M03', 'M01', 'M10'), fc.oneof(fc.constant(undefined), fc.constant(null), fc.record({ a: fc.oneof(fc.string(), fc.integer()) }), fc.record({ a: fc.string(), b: fc.string() }))), ([mid, colors]) => {
    plan(mkD(ORDER5, { [mid]: Object.assign({}, DIST[mid], { colors }) })); return true;
  });

  finish();
})().catch((e) => { console.error('ERROR FATAL', e); process.exit(1); });

function finish() {
  const fails = results.filter((r) => r[0] === 'FAIL');
  for (const [s, n, x] of results) console.log(s + '  ' + n + (x ? '\n      ' + x : ''));
  console.log(`\nataques=${attacks} propiedades=${props}×${RUNS} fuzz=${fuzzTotal} entradas | ${results.length - fails.length} PASS, ${fails.length} FAIL`);
  process.exit(fails.length ? 1 : 0);
}
