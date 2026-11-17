// Huecos de cobertura del plan de distritos (revisión): bordes de las reglas R1–R10 de city/check_district.mjs que no tenían caso propio,
// límites de la migración y de normalizeCity en city/story.js, bordes de portalAt/makeLayout, y que juego_estudio.html es la build actual
// de las fuentes (se construye en una copia temporal: nunca toca el HTML del repositorio).
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');
const root = path.join(__dirname, '..');
const results = [];
const ok = (name, cond, extra) => { results.push([cond ? 'PASS' : 'FAIL', name, extra || '']); };
const imp = (rel) => import(pathToFileURL(path.join(root, rel)).href);
const clone = (o) => JSON.parse(JSON.stringify(o));
const TODAY = '2026-11-13';

(async () => {
  const { checkDistrict, checkPlaza } = await imp('city/check_district.mjs');
  const { makeLayout } = await imp('city/layout.mjs');
  const { city: D } = await imp('city/districts.mjs');
  const { expandModule } = await imp('content_expand.mjs');
  const mod8 = expandModule('M08', 'Redes informáticas', await imp('content_m08.mjs'));
  const { district: d8 } = await imp('city/districts/m08.mjs');
  const CS = require('../city/story.js'), CM = require('../city/move.js');
  const M2 = D.districts.M02, M8 = D.districts.M08, P = D.plaza;
  const norm = (raw, bp = () => false, today = TODAY) => CS.normalizeCity(raw, D, bp, today);

  // ================= check_district: bordes de las reglas =================
  const mutate = (fn) => { const d = clone(d8); fn(d); return checkDistrict(d, mod8); };
  const has = (errs, rule, re) => errs.some((e) => e.indexOf(rule + ':') === 0 && (!re || re.test(e)));
  const expectRule = (name, errs, rule, re) => ok(name, has(errs, rule, re), errs.length ? errs.join(' || ') : 'sin errores');
  const expectNo = (name, errs, rule, re) => ok(name, !has(errs, rule, re), errs.join(' || '));

  // R1
  expectRule('R1: mentor con tema inexistente T99 se reporta', mutate((d) => { d.mentors[0].topic = 'T99'; }), 'R1', /m01: tema inexistente T99/);
  expectRule('R1: dos mentores para el mismo tema (T01 con 2)', mutate((d) => { d.mentors[1].topic = 'T01'; }), 'R1', /T01 debe tener exactamente un mentor \(tiene 2\)/);
  // R2
  expectRule('R2: criatura con 1 tema (límite inferior − 1)', mutate((d) => { const e = d.creatures.find((c) => c.id === 'espia'); e.topics = ['T11']; d.creatures.find((c) => c.id === 'perdido').topics.push('T15'); }), 'R2', /espia: debe tener de 2 a 5 temas \(tiene 1\)/);
  expectRule('R2: criatura con 6 temas (límite superior + 1)', mutate((d) => { d.creatures = d.creatures.filter((c) => c.id !== 'espia'); d.creatures.find((c) => c.id === 'capas').topics.push('T11', 'T15'); }), 'R2', /capas: debe tener de 2 a 5 temas \(tiene 6\)/);
  expectNo('R2: criatura con 5 temas (límite superior) no da el error de cantidad', mutate((d) => { d.creatures = d.creatures.filter((c) => c.id !== 'espia'); d.creatures.find((c) => c.id === 'capas').topics.push('T11'); d.creatures.find((c) => c.id === 'perdido').topics.push('T15'); }), 'R2', /de 2 a 5/);
  expectRule('R2: tema del módulo sin criatura (T15 en 0)', mutate((d) => { d.creatures.find((c) => c.id === 'espia').topics = ['T11']; }), 'R2', /T15 debe estar en exactamente una criatura \(está en 0\)/);
  expectRule('R2: criatura con un tema inexistente', mutate((d) => { d.creatures.find((c) => c.id === 'capas').topics.push('T99'); }), 'R2', /capas: tema inexistente T99/);
  // R3
  expectRule('R3: dos reparaciones con el mismo tema', mutate((d) => { d.repairs[1].topic = d.repairs[0].topic; }), 'R3', /temas repetidos/);
  // R4
  expectRule('R4: dos aprendices con el mismo tema', mutate((d) => { d.apprentices[1].topic = d.apprentices[0].topic; }), 'R4', /temas repetidos/);
  expectRule('R4: dos aprendices con el mismo nombre', mutate((d) => { d.apprentices[1].name = d.apprentices[0].name; }), 'R4', /nombres de aprendiz repetidos/);
  expectRule('R4: aprendiz con tema inexistente', mutate((d) => { d.apprentices[0].topic = 'T99'; }), 'R4', /a01: tema inexistente T99/);
  expectRule('R4: modo inválido ("teach")', mutate((d) => { d.apprentices[0].mode = 'teach'; }), 'R4', /a01: modo inválido/);
  for (const v of [0, -1, 1.5, '6', null, NaN]) expectRule('R4: need inválido (' + String(v) + ')', mutate((d) => { d.need = v; }), 'R4', /need/);
  expectNo('R4: need igual al número de aprendices (9) es válido', mutate((d) => { d.need = d.apprentices.length; }), 'R4', /need/);
  expectNo('R4: need 1 (mínimo) es válido', mutate((d) => { d.need = 1; }), 'R4', /need/);
  // R5
  for (const id of ['M01', 'constructor', 'hasOwnProperty', 'prototype', 'valueOf', 'a 1', '', 'ñu', 'a01<b>']) expectRule('R5: id inseguro ' + JSON.stringify(id), mutate((d) => { d.mentors[0].id = id; }), 'R5', /id inseguro/);
  expectRule('R5: id no texto (número 5)', mutate((d) => { d.mentors[0].id = 5; }), 'R5', /id inseguro 5/);
  expectRule('R5: id de la torre "__proto__"', mutate((d) => { d.tower.id = '__proto__'; }), 'R5', /__proto__/);
  expectRule('R5: el mismo id en tipos distintos (reparación "ruido" y criatura "ruido")', mutate((d) => { d.repairs[0].id = 'ruido'; }), 'R5', /ids repetidos: ruido/);
  expectNo('R5: ids con guion y guion bajo son válidos', mutate((d) => { d.mentors[0].id = 'm-01_x'; }), 'R5');
  // R6
  expectNo('R6: "Thoreau" y "Flashback" no son falsos positivos de \\bThor\\b ni \\bFlash\\b', mutate((d) => { d.mentors[0].name = 'Thoreau'; d.apprentices[0].name = 'Flashback'; }), 'R6');
  expectRule('R6: palabra prohibida en la etiqueta de una reparación', mutate((d) => { d.repairs[0].label = 'el cable de Spiderman'; }), 'R6', /Spider/);
  expectRule('R6: palabra prohibida en el nombre de una criatura', mutate((d) => { d.creatures[0].name = 'Ruido Avengers'; }), 'R6', /Avengers/);
  expectNo('R6: nombres con acentos y emoji no disparan palabras prohibidas', mutate((d) => { d.mentors[0].name = 'Ñandú 🛰️ Óscar'; }), 'R6');
  // R7
  expectNo('R7: bounds de exactamente 140 × 160 no superan el tope', mutate((d) => { d.bounds = { minX: -70, maxX: 70, minZ: -100, maxZ: 60 }; }), 'R7', /superan el tope/);
  expectRule('R7: bounds de 140.5 de ancho superan el tope', mutate((d) => { d.bounds = { minX: -70.5, maxX: 70, minZ: -70, maxZ: 60 }; }), 'R7', /superan el tope/);
  expectRule('R7: bounds de 160.5 de fondo superan el tope', mutate((d) => { d.bounds = { minX: -60, maxX: 60, minZ: -100.5, maxZ: 60 }; }), 'R7', /superan el tope/);
  expectRule('R7: sin blocks no se pueden calcular los edificios', mutate((d) => { delete d.blocks; }), 'R7', /faltan blocks o seed/);
  expectRule('R7: seed no finito (NaN tras JSON → null)', mutate((d) => { d.seed = null; }), 'R7', /faltan blocks o seed/);
  { const b = CM.layoutBuildings(d8)[3];
    expectRule('R7: un pad de la ruta dentro de un edificio', mutate((d) => { d.route.pads[4] = { x: b.x, z: b.z }; }), 'R7', /pad5: dentro o junto/); }
  expectRule('R7: dos puntos en el mismo sitio (distancia 0)', mutate((d) => { d.repairs[0].x = d.mentors[0].x; d.repairs[0].z = d.mentors[0].z; }), 'R7', /m01 y r01 están a menos de 4 m/);
  expectRule('R7: la puerta de la torre fuera de los bounds', mutate((d) => { d.tower.z = 58; }), 'R7', /puerta de la torre: fuera de los bounds/);
  // R8
  { const kpText = mod8.topics.find((t) => t.id === 'T12').keyPoints[3];   // la estación S2 apunta a T12 #3
    const withExpect = (s) => mutate((d) => { d.route.stations[2].kp[0].expect = s; });
    expectNo('R8: expect de 15 caracteres (mínimo) es válido', withExpect(kpText.slice(0, 15)), 'R8');
    expectNo('R8: expect de 40 caracteres (máximo) es válido', withExpect(kpText.slice(0, 40)), 'R8');
    expectRule('R8: expect de 14 caracteres falla', withExpect(kpText.slice(0, 14)), 'R8', /S2: expect debe medir de 15 a 40/);
    expectRule('R8: expect de 41 caracteres falla', withExpect(kpText.slice(0, 41)), 'R8', /S2: expect debe medir de 15 a 40/);
    expectRule('R8: expect no texto (número)', withExpect(12345678901234567), 'R8', /S2: kp desalineado/); }
  expectRule('R8: kp con 2 elementos', mutate((d) => { d.route.stations[0].kp.push(clone(d.route.stations[0].kp[0])); }), 'R8', /S0: kp debe tener 1 elemento/);
  expectRule('R8: kp ausente', mutate((d) => { delete d.route.stations[0].kp; }), 'R8', /S0: kp debe tener 1 elemento/);
  expectRule('R8: kp.topic que no está en los temas de la estación', mutate((d) => { d.route.stations[2].topics = ['T09', 'T10']; d.route.stations[8].topics.push('T12'); }), 'R8', /S2: kp\.topic no está en topics/);
  for (const v of [0, '1', 1.5, null]) expectRule('R8: ask = ' + JSON.stringify(v) + ' falla', mutate((d) => { d.route.stations[0].ask = v; }), 'R8', /S0: ask debe ser 1 o 2/);
  expectRule('R8: kp.index negativo', mutate((d) => { d.route.stations[0].kp[0].index = -1; }), 'R8', /S0: kp desalineado/);
  expectRule('R8: kp.index no entero (0.5)', mutate((d) => { d.route.stations[0].kp[0].index = 0.5; }), 'R8', /S0: kp desalineado/);
  expectRule('R8: once pads para diez estaciones', mutate((d) => { d.route.pads.push({ x: 28, z: -60 }); }), 'R8', /hay 11 pads para 10 estaciones/);
  { const errs = mutate((d) => { delete d.route; });
    ok('R8: un distrito sin route no da errores R8 (y sigue válido)', errs.length === 0, errs.join(' || ')); }
  ok('checkDistrict: cada error empieza con "R<n>: M08:"', mutate((d) => { d.need = 0; d.mentors[0].id = 'X'; }).every((e) => /^R\d+: M08: /.test(e)));

  // checkPlaza
  const mutP = (fn) => { const X = clone(D); fn(X); return checkPlaza(X); };
  expectRule('R7 plaza: el espejo dentro de la sede', mutP((X) => { X.plaza.mirror.x = 0; X.plaza.mirror.z = -14; }), 'R7', /espejo/);
  expectRule('R7 plaza: la entrada fuera de los bounds', mutP((X) => { X.plaza.entry.z = 45; }), 'R7', /entry: fuera de los bounds/);
  expectRule('R10: un nombre de rango distinto', mutP((X) => { X.ranks[1][1] = 'Junior '; }), 'R10', /rangos/);
  expectRule('R10: falta un rango', mutP((X) => { X.ranks.pop(); }), 'R10', /rangos/);
  expectRule('R9: tres portales del mismo distrito → un solo error de repetido', mutP((X) => { X.plaza.portals[1].dist = 'M02'; X.plaza.portals[2].dist = 'M02'; }), 'R9', /portal repetido: M02/);
  expectRule('R9: un portal de más "constructor" se reporta como fuera de ORDER', mutP((X) => { X.plaza.portals.push({ dist: 'constructor', angle: 90, x: 0, z: 30, w: 6, d: 2, back: { x: 0, z: 25, yaw: 0 } }); }), 'R9', /portal de constructor, que no está en ORDER/);
  expectRule('R9: un portal de más "__proto__" se reporta como fuera de ORDER', mutP((X) => { X.plaza.portals.push({ dist: '__proto__', angle: 90, x: 0, z: 30, w: 6, d: 2, back: { x: 0, z: 25, yaw: 0 } }); }), 'R9', /portal de __proto__, que no está en ORDER/);

  // ================= story.js: límites de la migración y de normalizeCity =================
  const R = CS.LEGACY_M02_RECT;
  for (const [name, at, scene] of [
    ['z = -44 (borde norte del rect, cerrado)', { x: 0, z: -44 }, 'M02'], ['z = -43.999 (justo fuera)', { x: 0, z: -43.999 }, 'plaza'],
    ['z = -195 (borde sur, cerrado)', { x: 0, z: -195 }, 'M02'], ['z = -195.001 (justo fuera)', { x: 0, z: -195.001 }, 'plaza'],
    ['x = 70 (borde este, cerrado)', { x: 70, z: -100 }, 'M02'], ['x = 70.001 (justo fuera)', { x: 70.001, z: -100 }, 'plaza'],
    ['x = -70 (borde oeste, cerrado)', { x: -70, z: -100 }, 'M02'], ['x = -70.001 (justo fuera)', { x: -70.001, z: -100 }, 'plaza']]) {
    const C = norm({ at: { x: at.x, z: at.z, yaw: 0 } });
    ok('migración LEGACY_M02_RECT ' + name + ' → ' + scene, C.scene === scene && R.maxZ === -44, JSON.stringify([C.scene, C.at]));
  }
  { const C = norm({ scene: 'M08' });
    ok('normalizeCity: scene M08 sin at → entrada de M08', C.scene === 'M08' && C.at.x === M8.entry.x && C.at.z === M8.entry.z && C.at.yaw === M8.entry.yaw, JSON.stringify(C.at)); }
  { const C = norm({ scene: 'plaza', at: { x: 5, z: 8, yaw: -0 } });
    ok('normalizeCity: yaw -0 se guarda como +0', Object.is(C.at.yaw, 0), String(C.at.yaw)); }
  { const C = norm({ scene: 'plaza', at: { x: 5, z: 8, yaw: 2 * Math.PI } }), C2 = norm({ scene: 'plaza', at: { x: 5, z: 8, yaw: -Math.PI / 2 } });
    ok('normalizeCity: yaw 2π → 0 y -π/2 → 3π/2', C.at.yaw === 0 && Math.abs(C2.at.yaw - 1.5 * Math.PI) < 1e-12, JSON.stringify([C.at.yaw, C2.at.yaw])); }
  { const p = P.portals.find((q) => q.dist === 'M08');
    const C = norm({ scene: 'plaza', at: { x: p.x + p.w / 2, z: p.z, yaw: 0 } });
    ok('normalizeCity: at justo en el borde de la caja del portal M08 → back (borde cerrado)', C.at.x === p.back.x && C.at.z === p.back.z, JSON.stringify(C.at)); }
  { const C = norm({ d: { M02: { beaten: { bit: '2024-02-29', eco: '2023-02-29', silicio: '2026-1-01', kernel: ' 2026-11-10', huerfano: TODAY, alucina: '2026-11-14' } } } });
    ok('normalizeCity: 29-feb bisiesto y hoy pasan; 29-feb no bisiesto, mes de 1 dígito, espacios y mañana no', JSON.stringify(Object.keys(C.d.M02.beaten).sort()) === '["bit","huerfano"]', JSON.stringify(C.d.M02.beaten)); }
  { const C = norm({ d: { M08: { route: { done: 10 } } } });
    ok('normalizeCity: route.done = número de estaciones exacto se conserva', C.d.M08.route.done === M8.route.stations.length); }
  { const C = norm({ d: { M08: { route: { done: 1 } } } }), C2 = norm({ d: { M08: { route: { done: 9 } } } });
    ok('normalizeCity: route.done 1 y 9 (uno después de 0 y uno antes del total) se conservan', C.d.M08.route.done === 1 && C2.d.M08.route.done === 9); }
  { const C = norm({ d: { M02: { taught: { a01: 'true', a02: 1, a03: true } } } });
    ok('normalizeCity: taught solo acepta true estricto', JSON.stringify(Object.keys(C.d.M02.taught)) === '["a03"]', JSON.stringify(C.d.M02.taught)); }
  { const C = norm({ d: Object.assign(Object.create(null), { M02: { taught: { a01: true } } }), taught: { a02: true } });
    ok('normalizeCity: d con prototipo nulo no es un objeto plano → se migra desde los planos (no lanza)', JSON.stringify(Object.keys(C.d.M02.taught)) === '["a02"]', JSON.stringify(C.d.M02.taught)); }
  { const C = norm({ d: { M08: { taught: Object.fromEntries(M8.apprentices.slice(0, 6).map((a) => [a.id, true])) } } }, (mid) => (mid === 'M08' ? 'yes' : false));
    ok('normalizeCity: bossPassedOf que devuelve un texto verdadero no restaura', !C.restored.M08); }
  { const C = norm({ prologue: 'true', run: 1 });
    ok('normalizeCity: prologue y run solo con true estricto', C.prologue === false && C.run === false); }

  // taughtCount / restoration / applyRestore / rankOf / recommended / mirror
  { const C = norm({}); C.d.M02.taught = { a01: 'true', a02: true, zz: true };
    ok('taughtCount: ignora valores no true e ids que no son aprendices', CS.taughtCount(C, D, 'M02') === 1); }
  { const C = norm({}); C.d.M02.taught = ['a01'];
    ok('taughtCount: taught arreglo → 0 sin lanzar', CS.taughtCount(C, D, 'M02') === 0); }
  { const C = norm({}); M2.apprentices.slice(0, M2.need - 1).forEach((a) => { C.d.M02.taught[a.id] = true; });
    const r = CS.applyRestore(C, D, () => true);
    ok('applyRestore: need − 1 enseñados con jefe → no restaura (uno antes del límite)', r.changed.length === 0 && !C.restored.M02 && CS.restoration(C, D, 'M02', true) < 100, JSON.stringify([r, CS.restoration(C, D, 'M02', true)])); }
  { const C = norm({}); M2.apprentices.slice(0, M2.need).forEach((a) => { C.d.M02.taught[a.id] = true; });
    const r = CS.applyRestore(C, D, (mid) => mid === 'M02');
    ok('applyRestore: need exacto con jefe → restaura (en el límite)', JSON.stringify(r.changed) === '["M02"]' && C.restored.M02 === true); }
  ok('rankOf: restored con ids que no son distritos o valores no true no cuenta', CS.rankOf({ restored: { M99: true, __x: true, M02: 'true', M08: 1 } }, D) === 'Becario');
  ok('rankOf: restored no objeto → Becario sin lanzar', [null, 5, 'M02', []].every((r) => CS.rankOf({ restored: r }, D) === 'Becario'));
  { const ids = ['A', 'B', 'C', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
    const big = { ranks: D.ranks, districts: Object.fromEntries(ids.map((k) => [k, {}])) };
    const rk = (n) => CS.rankOf({ restored: Object.fromEntries(ids.slice(0, n).map((k) => [k, true])) }, big);
    ok('rankOf: límites de la tabla 2/3 → Junior/Semi-senior, 5/6 → Semi-senior/Senior, 7/8 → Senior/Arquitecto, 10/11 → Arquitecto/Tech Lead',
      rk(2) === 'Junior' && rk(3) === 'Semi-senior' && rk(5) === 'Semi-senior' && rk(6) === 'Senior' && rk(7) === 'Senior' && rk(8) === 'Arquitecto' && rk(10) === 'Arquitecto' && rk(11) === 'Tech Lead',
      [2, 3, 5, 6, 7, 8, 10, 11].map(rk).join(',')); }
  { const C = norm({}); C.prologue = true;
    const D2 = Object.assign({}, D, { order: ['M99', '__proto__', 'M08', 'M02'] });
    const o = CS.nextObjective(C, D2, 'plaza', {});
    ok('nextObjective plaza: se salta ids de ORDER que no son distritos (M99, __proto__)', o.kind === 'portal' && o.id === 'M08' && o.label === 'Entra a Nodo Enlace', JSON.stringify(o)); }
  { const C = norm({}); C.prologue = true;
    const bad = ['__proto__', 'constructor', 'toString', 'M99', undefined, null, 5].filter((sc) => { try { const o = CS.nextObjective(C, D, sc, {}); return !(o.kind === 'none' && o.id === null && o.label === ''); } catch (e) { return true; } });
    ok('nextObjective: escena desconocida (__proto__, constructor, M99, undefined…) → none sin lanzar', bad.length === 0, bad.map(String).join(',')); }
  { const C = { d: undefined }; CS.mirror(C);
    ok('mirror: sin d deja los planos vacíos sin lanzar', JSON.stringify([C.beaten, C.repairs, C.taught]) === '[{},{},{}]'); }
  { const C = { d: { M02: null, M08: { taught: { a01: true } } } }; CS.mirror(C);
    ok('mirror: d.M02 null → planos vacíos y nunca copia M08', JSON.stringify([C.beaten, C.repairs, C.taught]) === '[{},{},{}]'); }
  { const C = norm({}); C.d.M02.taught.a01 = true; C.d.M08.taught.a01 = true; C.d.M08.repairs.r01 = true; CS.mirror(C);
    ok('mirror: con el mismo id en M02 y M08, el espejo refleja solo M02', JSON.stringify(C.taught) === '{"a01":true}' && JSON.stringify(C.repairs) === '{}'); }
  ok('apprenticesAvailable: starsOf que devuelve NaN o texto no cuenta como estrella', CS.apprenticesAvailable(norm({}), D, 'M08', () => NaN).length === 0 && CS.apprenticesAvailable(norm({}), D, 'M08', () => '0').length === 0);

  // ================= move.js: bordes de portalAt y boxesFor =================
  { const p = P.portals.find((q) => q.dist === 'M08');
    ok('portalAt: el borde exacto de la caja del portal cuenta (cerrado)', CM.portalAt(D, 'plaza', p.x + p.w / 2, p.z + p.d / 2) === 'M08' && CM.portalAt(D, 'plaza', p.x - p.w / 2, p.z - p.d / 2) === 'M08');
    ok('portalAt: 1 mm fuera de la caja del portal → null', CM.portalAt(D, 'plaza', p.x + p.w / 2 + 0.001, p.z) === null && CM.portalAt(D, 'plaza', p.x, p.z + p.d / 2 + 0.001) === null); }
  { const e = M8.exit;
    ok('portalAt M08: borde exacto de la salida → plaza y 1 mm fuera → null', CM.portalAt(D, 'M08', e.x - e.w / 2, e.z) === 'plaza' && CM.portalAt(D, 'M08', e.x - e.w / 2 - 0.001, e.z) === null); }
  ok('portalAt: coordenadas en texto ("0", "57") → null (no coerciona)', CM.portalAt(D, 'M08', '0', '57') === null);
  ok('boxesFor/scene: "__proto__", "constructor" y "hasOwnProperty" no son escenas', ['__proto__', 'constructor', 'hasOwnProperty'].every((s) => CM.scene(D, s) === null && CM.boxesFor(D, s).length === 0 && CM.portalAt(D, s, 0, 0) === null));

  // ================= layout.mjs: bordes de makeLayout =================
  { const L = makeLayout({ reserve: [[8, 0]], streetX: [], streetZ: [0], xRange: [0, 16], step: 8, min: 8, zRange: [0, 0] });
    const a = L.take(), b = L.take(); let threw = false; try { L.take(); } catch (e) { threw = /faltan lugares/.test(e.message); }
    ok('makeLayout: a exactamente `min` de la reserva se acepta (>=) y el punto sobre la reserva no', a.x === 0 && b.x === 16 && threw, JSON.stringify([a, b, threw])); }
  { const L = makeLayout({ streetX: [], streetZ: [], xRange: [0, 10], zRange: [0, -10] }); let threw = false; try { L.take(); } catch (e) { threw = true; }
    ok('makeLayout: sin calles → el primer take() lanza', threw); }
  { const L = makeLayout({ streetX: [0], streetZ: [0], xRange: [10, -10], zRange: [-10, 10] }); let threw = false; try { L.take(); } catch (e) { threw = true; }
    ok('makeLayout: rangos invertidos no generan lugares (take lanza, no bucle infinito)', threw); }
  { const L = makeLayout({ streetX: [], streetZ: [0], xRange: [0, 40], zRange: [0, 0] }), p = L.take(); p.x = 999; const q = L.take();
    ok('makeLayout: take() devuelve copias (mutarlas no cambia el reparto)', q.x === 8, JSON.stringify(q)); }

  // ================= build: el HTML del repositorio es la build de las fuentes =================
  { const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rdg-'));
    for (const f of fs.readdirSync(root)) if (f.endsWith('.mjs') || f === 'engine.html') fs.copyFileSync(path.join(root, f), path.join(dir, f));
    fs.cpSync(path.join(root, 'city'), path.join(dir, 'city'), { recursive: true });
    const r = spawnSync('node', ['build.mjs'], { cwd: dir, encoding: 'utf8' });
    const out1 = fs.existsSync(path.join(dir, 'juego_estudio.html')) ? fs.readFileSync(path.join(dir, 'juego_estudio.html'), 'utf8') : null;
    spawnSync('node', ['build.mjs'], { cwd: dir, encoding: 'utf8' });
    const out2 = fs.readFileSync(path.join(dir, 'juego_estudio.html'), 'utf8');
    fs.rmSync(dir, { recursive: true, force: true });
    const repo = fs.readFileSync(path.join(root, 'juego_estudio.html'), 'utf8');
    let at = -1; if (out1 && out1 !== repo) { at = 0; while (at < out1.length && out1[at] === repo[at]) at++; }
    ok('build: dos builds seguidas dan el mismo HTML (determinista)', r.status === 0 && out1 === out2, 'status=' + r.status);
    ok('build: juego_estudio.html del repositorio es idéntico a la build de las fuentes actuales', out1 === repo, at >= 0 ? 'primer byte distinto en ' + at + ': …' + JSON.stringify(repo.slice(Math.max(0, at - 60), at + 60)) : '');
    const i = repo.indexOf('var CITY_DATA = '), j = repo.indexOf(';\n', i), lit = repo.slice(i + 16, j);
    let parsed = null; try { parsed = JSON.parse(lit); } catch (e) {}
    ok('build: CITY_DATA del HTML es JSON válido, sin "<" literal, e igual a city/districts.mjs', !!parsed && lit.indexOf('<') < 0 && JSON.stringify(parsed) === JSON.stringify(D)); }

  results.forEach((r) => { if (r[0] === 'FAIL') console.log(r.join(' | ')); });
  const fails = results.filter((r) => r[0] === 'FAIL').length;
  console.log(fails ? `\n${fails} FALLOS de ${results.length}` : '\nREVIEW_DISTRICT_GAPS OK (' + results.length + ' comprobaciones)');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('EXCEPCIÓN', e && e.stack); results.forEach((r) => console.log(r.join(' | '))); process.exit(2); });
