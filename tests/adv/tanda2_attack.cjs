// Ataque a las suposiciones del spec 2026-11-17-ciudad-tanda-2-design.md (M03, M01, M10 "solo datos") sobre el código existente.
// Ataca city/story.js, city/move.js y city/check_district.mjs con todos los distritos reales (D5 = city/districts.mjs) y con la base de la Tanda 1
// (D2 = los mismos datos reducidos a M02 y M08) para los casos de guardado de la Tanda 1 y de vuelta atrás.
// Partes: A adversariales con nombre, P propiedades fast-check (semilla fija), F fuzzing con semilla fija.
// Uso: node tests/adv/tanda2_attack.cjs [RUNS=1000] [FUZZ_N=30000 por objetivo] [SEED=20261117] [MAX_S=60 por objetivo]   (código 1 si algo rompe)
const fc = require('fast-check');
const assert = require('assert');
const path = require('path');
const { pathToFileURL } = require('url');
const CM = require('../../city/move.js');
const CS = require('../../city/story.js');

const RUNS = +(process.argv[2] || 1000), FUZZ_N = +(process.argv[3] || 30000), SEED = +(process.argv[4] || 20261117), MAX_MS = 1000 * +(process.argv[5] || 60);
const TODAY = '2026-11-17', TAU = Math.PI * 2, NEW = ['M03', 'M01', 'M10'];
const root = path.join(__dirname, '..', '..');
const imp = (f) => import(pathToFileURL(path.join(root, f)).href);
const own = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const results = [];
let attacks = 0, props = 0, fuzzTotal = 0;
const ok = (name, cond, extra) => results.push([cond ? 'PASS' : 'FAIL', name, cond ? '' : (extra || '')]);
const safeStr = (x) => { try { const s = JSON.stringify(x, (k, v) => (typeof v === 'number' && !isFinite(v)) ? String(v) : (typeof v === 'function' ? 'fn' : v)); return (s === undefined ? String(x) : s).slice(0, 400); } catch (e) { return String(x); } };
function attack(name, fn) { attacks++; try { const r = fn(); ok('A: ' + name, r === undefined || r === true, typeof r === 'string' ? r : ''); } catch (e) { ok('A: ' + name, false, 'lanza: ' + String(e && e.message).slice(0, 300)); } }
function prop(name, arb, pred) {
  props++;
  const r = fc.check(fc.property(arb, pred), { numRuns: RUNS, seed: SEED, endOnFailure: false });
  ok('P: ' + name + ' (' + RUNS + ' ejecuciones, semilla ' + SEED + ')', !r.failed,
    r.failed ? 'contraejemplo=' + safeStr(r.counterexample) + ' error=' + String(r.errorInstance && r.errorInstance.message || r.error).slice(0, 300) : '');
}
function mulberry(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const insideBox = (x, z, r, boxes) => { const rr = r - 1e-6; return boxes.some((b) => { const cx = Math.min(b.maxX, Math.max(b.minX, x)), cz = Math.min(b.maxZ, Math.max(b.minZ, z)); return (x - cx) ** 2 + (z - cz) ** 2 < rr * rr; }); };

(async () => {
  const D5 = (await imp('city/districts.mjs')).city;
  const D2 = Object.assign({}, D5, { districts: { M02: D5.districts.M02, M08: D5.districts.M08 } });   // la Tanda 1: M03, M01 y M10 sin distrito (muros)
  const { checkDistrict, checkPlaza, FORBIDDEN } = await imp('city/check_district.mjs');
  const { expandModule } = await imp('content_expand.mjs');
  const MIDS = Object.keys(D5.districts), R = D5.radius, MODULES = require('../modules.cjs');
  const MODS = {};
  for (const m of MIDS) MODS[m] = expandModule(m, MODULES[m].title, await imp(MODULES[m].file));


  // =================== A. datos: reglas R1-R10 con el contenido real ===================
  for (const mid of NEW) {
    // ATAQUE: las tablas del spec (temas, ≥8 mcq+tf por criatura, reparaciones, 'correct', R7 con la semilla nueva) contra el contenido real
    attack(mid + ': checkDistrict sin errores con el módulo real', () => { const e = checkDistrict(D5.districts[mid], MODS[mid]); return e.length ? e.join(' | ') : true; });
    // ATAQUE: número de mentores del spec = número real de temas del módulo
    attack(mid + ': mentores del spec = temas reales', () => { const n = MODS[mid].topics.length, m = D5.districts[mid].mentors.length; return n === m ? true : `temas=${n} mentores=${m}`; });
    // ATAQUE: palabras prohibidas también en el texto de celebración (validate.mjs las aplica a todo el HTML)
    attack(mid + ': celebrate y nombre sin palabras prohibidas', () => { const t = D5.districts[mid].celebrate.text + ' ' + D5.districts[mid].name; const hit = FORBIDDEN.filter((re) => re.test(t)); return hit.length ? hit.join(',') : true; });
  }
  // ATAQUE: la plaza con todos los portales abiertos (backs, rangos, ORDER) sigue cumpliendo R9/R10
  attack('checkPlaza(D5) sin errores', () => { const e = checkPlaza(D5); return e.length ? e.join(' | ') : true; });
  // ATAQUE: el spec promete que ningún nombre de mentor o aprendiz se repite entre los distritos
  attack('nombres de mentor y aprendiz únicos entre todos los distritos', () => {
    const seen = {}, dup = [];
    for (const mid of MIDS) for (const o of [...D5.districts[mid].mentors, ...D5.districts[mid].apprentices]) { const k = o.name.normalize('NFC').toLowerCase(); if (seen[k]) dup.push(o.name + '(' + seen[k] + '/' + mid + ')'); else seen[k] = mid; }
    return dup.length ? 'repetidos: ' + dup.join(', ') : true;
  });
  // ATAQUE: un nombre de distrito, criatura o etiqueta de reparación repetido entre distritos confundiría el HUD y la celebración
  attack('nombres de distrito y de criatura únicos entre todos los distritos', () => {
    const all = MIDS.map((m) => D5.districts[m].name).concat(...MIDS.map((m) => D5.districts[m].creatures.map((c) => c.name)));
    const dup = all.filter((x, i) => all.indexOf(x) !== i); return dup.length ? dup.join(', ') : true;
  });
  // ATAQUE: ids de criatura repetidos entre distritos (las variantes de sprites usan mid:id, pero el reporte de batalla usa el id)
  attack('ids de criatura únicos entre todos los distritos', () => { const all = [].concat(...MIDS.map((m) => D5.districts[m].creatures.map((c) => c.id))); const dup = all.filter((x, i) => all.indexOf(x) !== i); return dup.length ? dup.join(',') : true; });
  // ATAQUE: "solo datos": el registro del spec deja 'M03','M01','M10' en ORDER y con portal
  attack('cada distrito nuevo tiene portal en la plaza y está en ORDER', () => NEW.every((m) => D5.order.includes(m) && D5.plaza.portals.some((p) => p.dist === m)) || 'falta');

  // =================== A. move.js con los ids nuevos ===================
  for (const mid of NEW) {
    const M = D5.districts[mid];
    // ATAQUE: scene() resuelve el id nuevo y en el CITY_DATA actual (sin el distrito) da null
    attack(mid + ': scene() en D5 y null en el CITY_DATA actual', () => CM.scene(D5, mid) === M && CM.scene(D2, mid) === null || 'scene incorrecto');
    // ATAQUE: el portal del distrito nuevo deja de ser muro sólido y su boca lleva al distrito
    attack(mid + ': portal abierto en D5 (no sólido, portalAt da el id) y muro en D2', () => {
      const p = D5.plaza.portals.find((q) => q.dist === mid);
      const wall5 = CM.boxesFor(D5, 'plaza').some((b) => b.minX === p.x - p.w / 2 && b.maxZ === p.z + p.d / 2);
      const wall2 = CM.boxesFor(D2, 'plaza').some((b) => b.minX === p.x - p.w / 2 && b.maxZ === p.z + p.d / 2);
      if (wall5 || !wall2) return 'wall5=' + wall5 + ' wall2=' + wall2;
      if (CM.portalAt(D5, 'plaza', p.x, p.z) !== mid) return 'portalAt(D5)=' + CM.portalAt(D5, 'plaza', p.x, p.z);
      if (CM.portalAt(D2, 'plaza', p.x, p.z) !== null) return 'portalAt(D2) no es null';
      return true;
    });
    // ATAQUE: el héroe que camina hacia la boca del portal nuevo llega a portalAt (el anillo/camino no lo bloquea)
    attack(mid + ': caminar del back al portal entra al distrito', () => {
      const p = D5.plaza.portals.find((q) => q.dist === mid), boxes = CM.boxesFor(D5, 'plaza');
      let s = { x: p.back.x, z: p.back.z, yaw: p.back.yaw, vx: 0, vz: 0, speed: 0 };
      for (let i = 0; i < 400; i++) {
        const dx = p.x - s.x, dz = p.z - s.z, l = Math.hypot(dx, dz) || 1;
        s = CM.step(s, { mx: dx / l, mz: dz / l }, 0.05, boxes, { radius: R, safe: p.back });
        if (CM.portalAt(D5, 'plaza', s.x, s.z) === mid) return true;
      }
      return 'no llega: ' + safeStr(s);
    });
    // ATAQUE: entrada libre, salida vuelve a la plaza, torre sólida, puerta alcanzable
    attack(mid + ': entrada libre, salida = plaza, torre sólida', () => {
      const boxes = CM.boxesFor(D5, mid);
      if (insideBox(M.entry.x, M.entry.z, R, boxes)) return 'entrada dentro de una caja';
      if (CM.portalAt(D5, mid, M.entry.x, M.entry.z) !== null) return 'la entrada ya está en la salida (rebote)';
      if (CM.portalAt(D5, mid, M.exit.x, M.exit.z) !== 'plaza') return 'la salida no lleva a la plaza';
      if (!insideBox(M.tower.x, M.tower.z, R, boxes)) return 'la torre no es sólida';
      const dr = CM.door(M.tower); if (insideBox(dr.x, dr.z, R, boxes)) return 'puerta de la torre bloqueada';
      return true;
    });
    // ATAQUE: cada lugar interactuable (mentor, criatura, reparación, aprendiz) es pisable con el radio del héroe
    attack(mid + ': ningún interactuable queda dentro de un edificio', () => {
      const boxes = CM.boxesFor(D5, mid), pts = [...M.mentors, ...M.repairs, ...M.apprentices, ...M.creatures.map((c) => ({ id: c.id, x: c.area.x, z: c.area.z }))];
      const bad = pts.filter((p) => insideBox(p.x, p.z, R, boxes)).map((p) => p.id); return bad.length ? bad.join(',') : true;
    });
  }
  // ATAQUE: los edificios de los distritos nuevos no salen iguales (antiobjetivo "copia con nombres cambiados")
  attack('layoutBuildings distinto en M03, M01, M10 y M08', () => {
    const k = (m) => JSON.stringify(CM.layoutBuildings(D5.districts[m]));
    const s = new Set(['M08', ...NEW].map(k)); return s.size === 4 || 'layouts iguales';
  });

  // =================== A. story.js: guardados viejos que no conocen los distritos nuevos ===================
  const ALLTRUE = (ids) => Object.fromEntries(ids.map((i) => [i, true]));
  const ids = (l) => l.map((x) => x.id);
  const bossAll = () => true;
  // ATAQUE: guardado plano anterior a los distritos (sin d) con r01/a01 que existen en todos: solo migra a M02
  attack('guardado plano: r01/a01/a10 solo migran a M02', () => {
    const raw = { prologue: true, beaten: { bit: TODAY, bitflip: TODAY, latencia: TODAY }, repairs: ALLTRUE(['r01', 'r08', 'r09']), taught: ALLTRUE(['a01', 'a07', 'a10']), at: { x: 0, z: -100, yaw: 1 } };
    const C = CS.normalizeCity(raw, D5, bossAll, TODAY);
    for (const m of ['M08', ...NEW]) if (Object.keys(C.d[m].beaten).length + Object.keys(C.d[m].repairs).length + Object.keys(C.d[m].taught).length) return m + ' heredó progreso plano: ' + safeStr(C.d[m]);
    if (!C.d.M02.beaten.bit || C.d.M02.beaten.bitflip) return 'M02 beaten mal: ' + safeStr(C.d.M02.beaten);
    if (C.scene !== 'M02') return 'scene=' + C.scene;
    return true;
  });
  // ATAQUE: guardado de la Tanda 1 (d con M02 y M08) cargado con todos los distritos: los nuevos nacen vacíos, sin route, sin restaurar
  attack('guardado Tanda 1 en D5: M03/M01/M10 vacíos y sin route', () => {
    const raw = { prologue: true, scene: 'M08', at: { x: 10, z: 10 }, d: { M02: { taught: ALLTRUE(ids(D5.districts.M02.apprentices)) }, M08: { taught: ALLTRUE(ids(D5.districts.M08.apprentices)), route: { done: 10 } } } };
    const C = CS.normalizeCity(raw, D5, bossAll, TODAY);
    for (const m of NEW) { const d = C.d[m]; if (JSON.stringify(d) !== '{"beaten":{},"repairs":{},"taught":{}}') return m + ': ' + safeStr(d); if (C.restored[m]) return m + ' restaurado sin aprendices'; }
    if (!C.restored.M02 || !C.restored.M08) return 'perdió M02/M08: ' + safeStr(C.restored);
    return CS.rankOf(C, D5) === CS.rankName(2, D5) || 'rango ' + CS.rankOf(C, D5);
  });
  // ATAQUE: guardado futuro (Tanda 2) abierto por el código actual (rollback): scene 'M10' desconocida → plaza; d.M03 se descarta sin lanzar
  attack('rollback: guardado de D5 abierto con el CITY_DATA actual', () => {
    const C5 = CS.normalizeCity({ prologue: true, scene: 'M10', at: { x: 0, z: 40 }, d: { M10: { taught: ALLTRUE(ids(D5.districts.M10.apprentices)) } } }, D5, bossAll, TODAY);
    const C2 = CS.normalizeCity(JSON.parse(JSON.stringify(C5)), D2, bossAll, TODAY);
    if (C2.scene !== 'plaza') return 'scene=' + C2.scene;
    if (own(C2.d, 'M10') || own(C2.restored, 'M10')) return 'conservó M10';
    const e = D2.plaza.entry; return (C2.at.x === e.x && C2.at.z === e.z) || 'at=' + safeStr(C2.at);
  });
  // ATAQUE: ids cruzados: los a01..a10 de M03 no cuentan para M01 ni M10, y los ids de criatura de otro distrito se descartan
  attack('ids cruzados entre d.M03 y los demás no se contaminan', () => {
    const raw = { d: { M03: { taught: ALLTRUE(['a01', 'a02', 'a03', 'a04', 'a05', 'a06', 'a07']), beaten: { latencia: TODAY, pescador: TODAY, bit: TODAY, bitflip: TODAY }, repairs: ALLTRUE(['r01', 'r09', 'r10']) } } };
    const C = CS.normalizeCity(raw, D5, bossAll, TODAY);
    if (Object.keys(C.d.M03.beaten).join() !== 'bitflip') return 'beaten M03=' + safeStr(C.d.M03.beaten);
    if (Object.keys(C.d.M03.repairs).join() !== 'r01,r09') return 'repairs M03=' + safeStr(C.d.M03.repairs);
    if (CS.taughtCount(C, D5, 'M01') || CS.taughtCount(C, D5, 'M10')) return 'contaminó otro distrito';
    return (C.restored.M03 === true && Object.keys(C.restored).join() === 'M03') || 'restored=' + safeStr(C.restored);
  });
  // ATAQUE: r09 existe en M03/M10 pero no en M01 (8 reparaciones): d.M01.repairs.r09 se descarta
  attack('r09 en M01 (que tiene 8 reparaciones) se descarta', () => { const C = CS.normalizeCity({ d: { M01: { repairs: { r09: true, r08: true } } } }, D5, null, TODAY); return Object.keys(C.d.M01.repairs).join() === 'r08' || safeStr(C.d.M01.repairs); });
  // ATAQUE: restauración de varios distritos a la vez: changed en orden de registro, idempotente, rango y poderes
  attack('applyRestore restaura todos a la vez y es idempotente', () => {
    const d = {}; MIDS.forEach((m) => { d[m] = { taught: ALLTRUE(ids(D5.districts[m].apprentices)) }; });
    const C = CS.normalizeCity({ d }, D5, () => false, TODAY);
    if (Object.keys(C.restored).length) return 'restauró sin jefe';
    const r1 = CS.applyRestore(C, D5, bossAll), r2 = CS.applyRestore(C, D5, bossAll);
    if (r1.changed.join() !== MIDS.join()) return 'changed=' + r1.changed;
    if (r2.changed.length) return 'no idempotente: ' + r2.changed;
    if (CS.rankOf(C, D5) !== CS.rankName(MIDS.length, D5)) return 'rango ' + CS.rankOf(C, D5);
    return JSON.stringify(C.powers) === '{"planos":true}' || 'powers=' + safeStr(C.powers);
  });
  // ATAQUE: jefe de un solo módulo aprobado → solo ese distrito (bossPassedOf recibe cada mid nuevo)
  attack('bossPassedOf se consulta por cada mid nuevo y solo restaura ese', () => {
    const d = {}; MIDS.forEach((m) => { d[m] = { taught: ALLTRUE(ids(D5.districts[m].apprentices)) }; });
    const asked = [], C = CS.normalizeCity({ d }, D5, (m) => { asked.push(m); return m === 'M10'; }, TODAY);
    if (!NEW.every((m) => asked.includes(m))) return 'no preguntó por ' + NEW.filter((m) => !asked.includes(m));
    return Object.keys(C.restored).join() === 'M10' || 'restored=' + safeStr(C.restored);
  });
  // ATAQUE: frontera de need: need − 1 enseñados no restauran, need sí; restoration() 50/100 con el jefe
  attack('need en los nuevos: frontera need − 1 / need y porcentaje', () => {
    for (const m of NEW) {
      const a = ids(D5.districts[m].apprentices), need = D5.districts[m].need, part = Math.round(100 * (0.5 * (need - 1) / need + 0.5));
      const C6 = CS.normalizeCity({ d: { [m]: { taught: ALLTRUE(a.slice(0, need - 1)) } } }, D5, bossAll, TODAY), C7 = CS.normalizeCity({ d: { [m]: { taught: ALLTRUE(a.slice(a.length - need)) } } }, D5, bossAll, TODAY);
      if (C6.restored[m] || !C7.restored[m]) return m + ' frontera rota';
      if (CS.restoration(C6, D5, m, true) !== part || CS.restoration(C7, D5, m, true) !== 100 || CS.restoration(C7, D5, m, false) !== 50) return m + ' porcentaje ' + [CS.restoration(C6, D5, m, true), CS.restoration(C7, D5, m, true), CS.restoration(C7, D5, m, false)];
    }
    return true;
  });
  attack('nextObjective en la plaza recorre los distritos en el orden de ORDER', () => {
    const C = CS.normalizeCity({ prologue: true }, D5, null, TODAY), seq = [];
    for (const m of MIDS.concat(['fin'])) { const o = CS.nextObjective(C, D5, 'plaza', null); seq.push(o.id); if (m !== 'fin') C.restored[o.id] = true; }
    const want = D5.order.filter((m) => D5.districts[m]).join() + ',';
    return seq.join() === want || 'secuencia=' + seq.join() + ' esperada=' + want;
  });
  // ATAQUE: nextObjective dentro de cada distrito nuevo con todo aprendido: sin route, pasa a reparaciones y aprendices con ids reales
  attack('nextObjective en M03/M01/M10: sin ruta, ids existentes', () => {
    for (const m of NEW) {
      const M = D5.districts[m], C = CS.normalizeCity({ prologue: true, d: { [m]: { beaten: Object.fromEntries(ids(M.creatures).map((i) => [i, TODAY])) } } }, D5, null, TODAY);
      const ctx = { learned: () => true, stars: () => 3, beatenEver: (i) => !!C.d[m].beaten[i], beatenToday: () => true, bossUnlocked: false, bossPassed: false };
      const o = CS.nextObjective(C, D5, m, ctx);
      if (o.kind !== 'repair' || o.id !== 'r01') return m + ': ' + safeStr(o);
      C.d[m].repairs = ALLTRUE(ids(M.repairs));
      const o2 = CS.nextObjective(C, D5, m, ctx); if (o2.kind !== 'apprentice' || o2.id !== 'a01') return m + ' tras reparar: ' + safeStr(o2);
      const o3 = CS.nextObjective(C, D5, m, Object.assign({}, ctx, { learned: (t) => t !== 'T18' }));
      const mt = M.mentors.find((x) => x.topic === 'T18'); if (o3.kind !== 'mentor' || o3.id !== mt.id) return m + ' mentor T18: ' + safeStr(o3);
    }
    return true;
  });
  // ATAQUE: posiciones guardadas en un distrito nuevo: dentro de la torre, en la salida, fuera de bounds, -0/NaN
  attack('normalizeCity: at hostil en M01 (torre, salida, fuera, NaN) cae en un punto libre', () => {
    const M = D5.districts.M01, cases = [{ x: 0, z: -64 }, { x: 0, z: 57 }, { x: 1e9, z: -1e9 }, { x: NaN, z: 3 }, { x: -0, z: -0, yaw: -0 }, { x: '0', z: '0' }];
    for (const at of cases) {
      const C = CS.normalizeCity({ scene: 'M01', at }, D5, null, TODAY), a = C.at;
      if (C.scene !== 'M01') return 'scene ' + C.scene;
      if (!(a.x >= M.bounds.minX && a.x <= M.bounds.maxX && a.z >= M.bounds.minZ && a.z <= M.bounds.maxZ)) return 'fuera ' + safeStr(at);
      if (insideBox(a.x, a.z, R, CM.boxesFor(D5, 'M01')) || CM.portalAt(D5, 'M01', a.x, a.z) !== null) return 'no libre ' + safeStr(at) + '→' + safeStr(a);
      if (Object.is(a.yaw, -0) || !(a.yaw >= 0 && a.yaw < TAU)) return 'yaw ' + a.yaw;
    }
    return true;
  });
  // ATAQUE: guardado de la Tanda 1 parado en la plaza justo donde estaba el muro de M03 (no se podía; un guardado editado sí)
  attack('at dentro de la boca del portal M03 en la plaza → back de M03 (no entra solo al cargar)', () => {
    const p = D5.plaza.portals.find((q) => q.dist === 'M03'), C = CS.normalizeCity({ scene: 'plaza', at: { x: p.x, z: p.z } }, D5, null, TODAY);
    return (C.scene === 'plaza' && C.at.x === p.back.x && C.at.z === p.back.z && CM.portalAt(D5, 'plaza', C.at.x, C.at.z) === null) || safeStr(C.at);
  });
  // ATAQUE: mirror sigue copiando solo M02 con todos los distritos (una pestaña vieja no recibe a01 de M03)
  attack('mirror con todos los distritos copia solo d.M02', () => {
    const C = CS.mirror(CS.normalizeCity({ d: { M02: { taught: { a02: true } }, M03: { taught: { a01: true } } } }, D5, null, TODAY));
    return JSON.stringify(C.taught) === '{"a02":true}' || safeStr(C.taught);
  });

  // =================== P. propiedades (fast-check, semilla fija) ===================
  const ALLIDS = { cr: [].concat(...MIDS.map((m) => ids(D5.districts[m].creatures))), rp: ['r01', 'r08', 'r09', 'r10'], ap: ['a01', 'a07', 'a09', 'a10', 'a11'] };
  const HOSTILE = ['__proto__', 'constructor', 'toString', 'hasOwnProperty', '', 'M03 ', 'm03', 'a01​', 'r01\u0000'];
  const dateArb = fc.oneof(fc.constantFrom(TODAY, '2026-11-18', '2026-02-29', '2024-02-29', '9999-12-31', '2026-11-17\n'), fc.date({ min: new Date('2000-01-01'), max: new Date('2030-12-31'), noInvalidDate: true }).map((d) => d.toISOString().slice(0, 10)));
  const valArb = fc.oneof({ weight: 4, arbitrary: fc.constant(true) }, { weight: 3, arbitrary: dateArb }, { weight: 1, arbitrary: fc.constantFrom(false, 'true', 1, null, NaN, [], {}) }, { weight: 1, arbitrary: fc.anything() });
  const mapArb = (l) => fc.oneof({ weight: 6, arbitrary: fc.dictionary(fc.constantFrom(...l, ...HOSTILE), valArb, { maxKeys: l.length + 3 }) }, { weight: 1, arbitrary: fc.anything() });
  const entryArb = fc.record({ beaten: mapArb(ALLIDS.cr), repairs: mapArb(ALLIDS.rp), taught: mapArb(ALLIDS.ap), route: fc.oneof(fc.record({ done: fc.oneof(fc.integer({ min: -2, max: 12 }), fc.double()) }), fc.anything()) }, { requiredKeys: [] });
  const numArb = fc.oneof(fc.double({ min: -250, max: 250, noNaN: true }), fc.constantFrom(-0, NaN, Infinity, -Infinity, 1e308, '3', null));
  const sceneArb = fc.constantFrom('plaza', 'M02', 'M08', 'M03', 'M01', 'M10', 'M04', '__proto__', 'constructor', '', 5, null);
  const saveArb = fc.record({
    prologue: fc.oneof(fc.boolean(), fc.anything()), scene: sceneArb, at: fc.oneof(fc.record({ x: numArb, z: numArb, yaw: numArb }, { requiredKeys: [] }), fc.anything()),
    d: fc.oneof({ weight: 6, arbitrary: fc.dictionary(fc.constantFrom(...MIDS, 'M04', '__proto__', 'constructor'), entryArb, { maxKeys: 6 }) }, { weight: 1, arbitrary: fc.anything() }),
    beaten: mapArb(ALLIDS.cr), repairs: mapArb(ALLIDS.rp), taught: mapArb(ALLIDS.ap), tips: fc.anything()
  }, { requiredKeys: [] }).map((o) => JSON.parse(JSON.stringify(o, (k, v) => (typeof v === 'number' && !isFinite(v)) ? null : v).replace(/"constructor_x"/g, '"constructor"')));
  const bossArb = fc.oneof(fc.subarray(MIDS).map((s) => (m) => s.includes(m)), fc.constant(() => true), fc.constant(null), fc.constant(() => { throw new Error('x'); }), fc.constant(() => 1));
  const bossRes = (b, m) => { try { return typeof b === 'function' && b(m) === true; } catch (e) { return false; } };

  // REGLA: robustez + lista blanca: nunca lanza; d tiene exactamente los mids de los datos; cada clave es un id propio del distrito
  prop('normalizeCity(D5) robusta y con listas blancas por distrito', fc.tuple(saveArb, bossArb), ([raw, b]) => {
    const C = CS.normalizeCity(raw, D5, b, TODAY);
    assert.deepStrictEqual(Object.keys(C.d), MIDS);
    for (const m of MIDS) {
      const M = D5.districts[m];
      for (const [k, l] of [['beaten', M.creatures], ['repairs', M.repairs], ['taught', M.apprentices]]) for (const id of Object.keys(C.d[m][k])) assert(ids(l).includes(id), m + '.' + k + '.' + id);
      if (!M.route) assert(!own(C.d[m], 'route'), m + ' con route');
    }
    assert(C.scene === 'plaza' || MIDS.includes(C.scene));
    assert.strictEqual(Object.prototype.polluted, undefined);
    return true;
  });
  // REGLA: idempotencia tras ida y vuelta por JSON (lo que hacen save/load)
  prop('normalize(JSON(normalize(x))) == normalize(x) con todos los distritos', fc.tuple(saveArb, bossArb), ([raw, b]) => {
    const A = CS.normalizeCity(raw, D5, b, TODAY), B = CS.normalizeCity(JSON.parse(JSON.stringify(A)), D5, b, TODAY);
    assert.deepStrictEqual(B, A); return true;
  });
  // REGLA (oráculo): "todo lo que ya funciona sigue igual": agregar los 3 distritos no cambia d/restored/powers de M02 y M08
  prop('oráculo D2 vs D5: M02 y M08 idénticos', fc.tuple(saveArb, bossArb), ([raw, b]) => {
    const A = CS.normalizeCity(raw, D2, b, TODAY), B = CS.normalizeCity(raw, D5, b, TODAY);
    for (const m of ['M02', 'M08']) { assert.deepStrictEqual(B.d[m], A.d[m]); assert.strictEqual(B.restored[m], A.restored[m]); }
    assert.deepStrictEqual(B.powers, A.powers);
    if (A.scene !== 'plaza') { assert.strictEqual(B.scene, A.scene); assert.deepStrictEqual(B.at, A.at); }
    return true;
  });
  // REGLA: restored[mid] <=> jefe(mid) && taught(mid) >= need, para cada mid; y applyRestore idempotente con changed en orden de registro
  prop('restored por distrito y applyRestore idempotente', fc.tuple(saveArb, bossArb, bossArb), ([raw, b1, b2]) => {
    const C = CS.normalizeCity(raw, D5, b1, TODAY);
    for (const m of MIDS) assert.strictEqual(C.restored[m] === true, bossRes(b1, m) && CS.taughtCount(C, D5, m) >= D5.districts[m].need, m);
    const r1 = CS.applyRestore(C, D5, b2), snap = JSON.stringify(C), r2 = CS.applyRestore(C, D5, b2);
    assert.deepStrictEqual(r2.changed, []); assert.strictEqual(JSON.stringify(C), snap);
    assert.deepStrictEqual(r1.changed, MIDS.filter((m) => r1.changed.includes(m)));
    return true;
  });
  // REGLA (C.restored siempre sale de JSON/normalizeCity: objeto con prototipo, de ahí noNullPrototype): rankOf es la tabla del spec aplicada al número de distritos restaurados (0..5) y solo cuenta mids reales
  prop('rankOf = tabla(#restaurados reales)', fc.dictionary(fc.constantFrom(...MIDS, 'M04', 'M05', 'M06', 'M07', 'M09', 'M11', '__proto__'), fc.oneof(fc.constant(true), fc.anything()), { noNullPrototype: true }), (rs) => {
    const n = MIDS.filter((m) => own(rs, m) && rs[m] === true).length;
    let want = 'Becario'; D5.ranks.forEach(([k, nm]) => { if (n >= k) want = nm; });
    assert.strictEqual(CS.rankOf({ restored: rs }, D5), want); return true;
  });
  // REGLA: nextObjective nunca lanza en los distritos nuevos y todo id que devuelve existe en ese distrito
  const ctxArb = fc.record({ learnedSet: fc.subarray(Array.from({ length: 20 }, (_, i) => 'T' + String(i + 1).padStart(2, '0'))), stars: fc.integer({ min: 0, max: 3 }),
    ever: fc.subarray(ALLIDS.cr), today: fc.subarray(ALLIDS.cr), bossUnlocked: fc.boolean(), bossPassed: fc.boolean() });
  prop('nextObjective en M03/M01/M10: no lanza e ids válidos', fc.tuple(saveArb, fc.constantFrom(...NEW), ctxArb), ([raw, m, c]) => {
    const C = CS.normalizeCity(raw, D5, null, TODAY), M = D5.districts[m];
    const ctx = { learned: (t) => c.learnedSet.includes(t), stars: () => c.stars, beatenEver: (i) => c.ever.includes(i), beatenToday: (i) => c.today.includes(i), bossUnlocked: c.bossUnlocked, bossPassed: c.bossPassed };
    const o = CS.nextObjective(C, D5, m, ctx);
    const pool = { mentor: ids(M.mentors), practice: ids(M.mentors), creature: ids(M.creatures), repair: ids(M.repairs), apprentice: ids(M.apprentices), tower: [M.tower.id], plaza: ['exit'], none: [null] };
    assert(own(pool, o.kind), 'kind ' + o.kind); assert(pool[o.kind].includes(o.id), o.kind + ' ' + o.id);
    assert(typeof o.label === 'string' && !/undefined|NaN/.test(o.label), o.label);
    return true;
  });
  // REGLA: caminar en un distrito nuevo desde un punto libre nunca sale de bounds ni se mete en una caja
  const BOX = Object.fromEntries(NEW.map((m) => [m, CM.boxesFor(D5, m)]));
  prop('step en M03/M01/M10: nunca atraviesa edificios ni bordes', fc.tuple(fc.constantFrom(...NEW), fc.double({ min: -60, max: 60, noNaN: true }), fc.double({ min: -70, max: 60, noNaN: true }),
    fc.array(fc.tuple(fc.double({ min: -1, max: 1, noNaN: true }), fc.double({ min: -1, max: 1, noNaN: true }), fc.boolean(), fc.double({ min: 0, max: 0.2, noNaN: true })), { minLength: 1, maxLength: 60 })), ([m, x, z, seq]) => {
    const boxes = BOX[m], B = D5.districts[m].bounds;
    if (insideBox(x, z, R + 1e-3, boxes)) return true;   // solo arranques libres
    let s = { x, z, yaw: 0, vx: 0, vz: 0, speed: 0 };
    for (const [mx, mz, run, dt] of seq) {
      s = CM.step(s, { mx, mz, run }, dt, boxes, { radius: R, canRun: true, safe: D5.districts[m].entry });
      assert(s.x > B.minX && s.x < B.maxX && s.z > B.minZ && s.z < B.maxZ, 'fuera ' + safeStr(s));
      assert(!insideBox(s.x, s.z, R - 1e-3, boxes), 'dentro de una caja ' + safeStr(s));
    }
    return true;
  });
  // REGLA: portalAt en la plaza con D5 devuelve solo mids existentes; con D2 nunca devuelve un mid nuevo
  prop('portalAt(plaza) solo da distritos que existen', fc.tuple(fc.double({ min: -50, max: 40, noNaN: true }), fc.double({ min: -50, max: 40, noNaN: true })), ([x, z]) => {
    const a = CM.portalAt(D5, 'plaza', x, z), b = CM.portalAt(D2, 'plaza', x, z);
    assert(a === null || MIDS.includes(a)); assert(b === null || ['M02', 'M08'].includes(b));
    if (b !== null) assert.strictEqual(a, b);
    return true;
  });

  // =================== F. fuzzing con semilla fija ===================
  const fuzzReport = [];
  function campaign(name, gen, run) {
    const r = mulberry(SEED ^ (name.length * 2654435761)), t0 = Date.now(), sig = {};
    let n = 0;
    for (; n < FUZZ_N && Date.now() - t0 < MAX_MS; n++) {
      const input = gen(r), a = Date.now(); let err = null;
      try { err = run(input); } catch (e) { err = 'lanza ' + String(e && e.message).replace(/\d+/g, '#'); }
      if (!err && Date.now() - a > 250) err = 'lento (> 250 ms)';   // un cuelgue o un coste patológico; 50 ms fallaba con una pausa del recolector de basura
      if (err) { const k = String(err).slice(0, 160), s = safeStr(input); if (!sig[k]) sig[k] = { n: 0, min: s }; sig[k].n++; if (s.length < sig[k].min.length) sig[k].min = s; }
    }
    fuzzTotal += n; fuzzReport.push({ name, n, ms: Date.now() - t0, sig });
    const keys = Object.keys(sig);
    ok('F: ' + name + ' (' + n + ' entradas, semilla ' + SEED + ')', keys.length === 0, keys.map((k) => k + ' ×' + sig[k].n + ' mínima=' + sig[k].min).join(' | '));
  }
  const pick = (r, a) => a[Math.floor(r() * a.length)];
  const VALS = [true, false, TODAY, '2026-11-18', '2025-02-29', null, 0, -0, 1, NaN, 'true', [], {}, [true], '__proto__', 1e308];
  const KEYS = [...ALLIDS.cr, 'r01', 'r08', 'r09', 'r10', 'a01', 'a07', 'a10', 'a11', 'm01', 'torre', '__proto__', 'constructor', 'toString', ''];
  function genVal(r, depth) {
    const t = r();
    if (depth > 3 || t < 0.5) return pick(r, VALS);
    if (t < 0.75) { const o = {}; const n = Math.floor(r() * 6); for (let i = 0; i < n; i++) o[pick(r, KEYS)] = genVal(r, depth + 1); return o; }
    if (t < 0.9) return Array.from({ length: Math.floor(r() * 4) }, () => genVal(r, depth + 1));
    return pick(r, [-1e9, 1e9, 57, -64, 52, 0.4, Math.PI * 2, -Math.PI]);
  }
  function genSave(r) {
    const o = {};
    if (r() < 0.7) o.prologue = r() < 0.8;
    if (r() < 0.7) o.scene = pick(r, ['plaza', ...MIDS, 'M04', 'M11', '__proto__', 'constructor', '', 'm03', 7]);
    if (r() < 0.8) o.at = r() < 0.8 ? { x: (r() - 0.5) * pick(r, [130, 260, 1e6]), z: (r() - 0.5) * pick(r, [140, 400, 1e6]), yaw: pick(r, [0, -0, 7, -7, NaN, 1e300, '1']) } : genVal(r, 1);
    if (r() < 0.8) { o.d = {}; const n = Math.floor(r() * 7); for (let i = 0; i < n; i++) { const m = pick(r, [...MIDS, 'M04', '__proto__']); o.d[m] = { beaten: genVal(r, 1), repairs: genVal(r, 1), taught: genVal(r, 1), route: { done: pick(r, [0, 3, 10, 11, -1, 2.5, NaN, '4']) } }; if (r() < 0.3) { o.d[m].taught = {}; ['a01', 'a02', 'a03', 'a04', 'a05', 'a06', 'a07', 'a08', 'a09', 'a10'].forEach((k) => { if (r() < 0.8) o.d[m].taught[k] = true; }); } } }
    else { o.beaten = genVal(r, 1); o.repairs = genVal(r, 1); o.taught = genVal(r, 1); }
    let s = JSON.stringify(o, (k, v) => (typeof v === 'number' && !isFinite(v)) ? null : v);
    if (r() < 0.15) { const i = Math.floor(r() * s.length); s = s.slice(0, i) + pick(r, ['"', '}', ',', '\u0000', '"__proto__":{"x":1},', '‮', '9e999']) + s.slice(i + 1); }   // mutación byte a byte
    return s;
  }
  const bosses = [() => true, () => false, (m) => m === 'M03' || m === 'M10', null, () => { throw new Error('b'); }];
  // ATAQUE (fuzz): guardado JSON mutado → normalizeCity + applyRestore + rankOf + nextObjective(plaza) con todos los distritos
  campaign('normalizeCity/applyRestore/rankOf con guardados mutados', (r) => ({ s: genSave(r), b: Math.floor(r() * bosses.length) }), ({ s, b }) => {
    let raw; try { raw = JSON.parse(s); } catch (e) { raw = s; }
    const bp = bosses[b], C = CS.normalizeCity(raw, D5, bp, TODAY);
    if (Object.keys(C.d).join() !== MIDS.join()) return 'd con mids ' + Object.keys(C.d);
    const sc = CM.scene(D5, C.scene); if (!sc) return 'scene inválida ' + C.scene;
    const a = C.at, B = sc.bounds;
    if (!(a.x >= B.minX && a.x <= B.maxX && a.z >= B.minZ && a.z <= B.maxZ) || !(a.yaw >= 0 && a.yaw < TAU) || Object.is(a.yaw, -0)) return 'at inválido';
    if (insideBox(a.x, a.z, R, CM.boxesFor(D5, C.scene))) return 'at dentro de una caja';
    if (CM.portalAt(D5, C.scene, a.x, a.z) !== null) return 'at sobre un portal';
    const C2 = CS.normalizeCity(JSON.parse(JSON.stringify(C)), D5, bp, TODAY);
    if (JSON.stringify(C2) !== JSON.stringify(C)) return 'no idempotente';
    const r1 = CS.applyRestore(C, D5, bp); if (CS.applyRestore(C, D5, bp).changed.length) return 'applyRestore no idempotente';
    if (r1.changed.some((m) => !MIDS.includes(m))) return 'changed con mid ajeno';
    const rk = CS.rankOf(C, D5); if (!D5.ranks.some((x) => x[1] === rk)) return 'rango ' + rk;
    const o = CS.nextObjective(C, D5, 'plaza', null); if (o.kind === 'portal' && !MIDS.includes(o.id)) return 'portal ' + o.id;
    if (Object.prototype.x !== undefined) return 'prototype contaminado';
    return null;
  });
  // ATAQUE (fuzz): nextObjective en un distrito nuevo con estado y ctx basura
  campaign('nextObjective(M03/M01/M10) con ctx y estado basura', (r) => ({ s: genSave(r), m: pick(r, NEW), sh: Math.floor(r() * 1e9) }), ({ s, m, sh }) => {
    let raw; try { raw = JSON.parse(s); } catch (e) { raw = s; }
    const C = CS.normalizeCity(raw, D5, null, TODAY), rr = mulberry(sh), M = D5.districts[m];
    const ctx = { learned: () => rr() < 0.7, stars: () => pick(rr, [0, 1, 3, NaN, -1]), beatenEver: () => rr() < 0.5, beatenToday: () => rr() < 0.5, bossUnlocked: rr() < 0.5, bossPassed: rr() < 0.5 };
    const o = CS.nextObjective(C, D5, m, ctx);
    const all = [null, 'exit', M.tower.id, ...ids(M.mentors), ...ids(M.creatures), ...ids(M.repairs), ...ids(M.apprentices)];
    if (!all.includes(o.id)) return 'id ajeno ' + o.kind + ':' + o.id;
    if (o.kind === 'route') return 'ruta en un distrito sin ruta';
    return null;
  });
  // ATAQUE (fuzz): scene/boxesFor/portalAt/step con ids nuevos, ids hostiles y números extremos
  const SIDS = ['plaza', ...MIDS, 'M04', '__proto__', 'constructor', 'hasOwnProperty', '', 'M03\u0000', null, 3, {}];
  campaign('scene/boxesFor/portalAt/step con ids y números hostiles', (r) => ({ id: pick(r, SIDS), x: pick(r, [r() * 140 - 70, r() * 1e6, NaN, Infinity, -0, '5']), z: pick(r, [r() * 140 - 70, NaN, -Infinity, 57, 52, -64]), mx: r() * 4 - 2, mz: r() * 4 - 2, dt: pick(r, [0.016, 0.05, 1, -1, NaN, 1e9]) }), (t) => {
    const sc = CM.scene(D5, t.id), bx = CM.boxesFor(D5, t.id), p = CM.portalAt(D5, t.id, t.x, t.z);
    if (!sc) { if (bx.length || p !== null) return 'escena inválida con cajas o portal'; return null; }
    if (p !== null && p !== 'plaza' && !MIDS.includes(p)) return 'portal ajeno ' + p;
    const st = CM.step({ x: t.x, z: t.z, yaw: 0, vx: 0, vz: 0 }, { mx: t.mx, mz: t.mz }, t.dt, bx, { radius: R, safe: sc.entry });
    if (![st.x, st.z, st.yaw, st.vx, st.vz, st.speed].every(Number.isFinite)) return 'step no finito';
    return null;
  });
  // ATAQUE (fuzz): checkDistrict con distritos nuevos mutados (campos borrados, tipos raros) nunca lanza
  const FIELDS = ['mentors', 'creatures', 'repairs', 'apprentices', 'tower', 'bounds', 'blocks', 'seed', 'need', 'entry', 'exit', 'name', 'id'];
  campaign('checkDistrict con M03/M01/M10 mutados', (r) => ({ m: pick(r, NEW), f: pick(r, FIELDS), v: pick(r, [undefined, null, 0, NaN, '', [], {}, [{}], [null], 'x', -1, 1e9]), i: Math.floor(r() * 25) }), ({ m, f, v, i }) => {
    const dist = JSON.parse(JSON.stringify(D5.districts[m]));
    if (Array.isArray(dist[f]) && dist[f].length && i < dist[f].length && v !== undefined) dist[f][i] = v; else dist[f] = v;
    const e = checkDistrict(dist, MODS[m]);
    if (!Array.isArray(e) || e.some((x) => typeof x !== 'string' || !/^R\d+:/.test(x))) return 'salida inválida';
    return null;
  });

  finish();
})().catch((e) => { console.error('ERROR FATAL', e); process.exit(1); });

function finish() {
  const fails = results.filter((r) => r[0] === 'FAIL');
  for (const [s, n, x] of results) console.log(s + '  ' + n + (x ? '\n      ' + x : ''));
  console.log(`\nataques=${attacks} propiedades=${props}×${RUNS} fuzz=${fuzzTotal} entradas | ${results.length - fails.length} PASS, ${fails.length} FAIL`);
  process.exit(fails.length ? 1 : 0);
}
