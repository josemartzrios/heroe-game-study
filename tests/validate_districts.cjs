// Pruebas de city/check_district.mjs (reglas genéricas de un distrito, spec §4.3) sobre M02 y M08, y mutaciones que deben fallar
// con el número de regla correcto. Los datos concretos de M08 (10 estaciones, suma de ask 18, 10 pads) se comprueban aquí.
const path = require('path');
const { pathToFileURL } = require('url');
const results = [];
const ok = (name, cond, extra) => { results.push([cond ? 'PASS' : 'FAIL', name, extra || '']); };
const imp = (rel) => import(pathToFileURL(path.join(__dirname, '..', rel)).href);
const clone = (o) => JSON.parse(JSON.stringify(o));

(async () => {
  const { checkDistrict, checkPlaza } = await imp('city/check_district.mjs');
  const { city } = await imp('city/districts.mjs');
  const { expandModule } = await imp('content_expand.mjs');
  const mod8 = expandModule('M08', 'Redes informáticas', await imp('content_m08.mjs'));
  const mod2 = expandModule('M02', 'Fundamentos de ingeniería de software', await imp('content_m02.mjs'));
  const { district: d2 } = await imp('city/districts/m02.mjs');
  const { district: d8 } = await imp('city/districts/m08.mjs');
  const CM = require('../city/move.js');

  const e2 = checkDistrict(d2, mod2), e8 = checkDistrict(d8, mod8);
  ok('M02 válido: sin errores', e2.length === 0, e2.join(' || '));
  ok('M08 válido: sin errores', e8.length === 0, e8.join(' || '));

  // datos concretos de M08 (spec §4.5)
  ok('M08: 15 mentores, 5 criaturas, 8 reparaciones, 9 aprendices, need 6', d8.mentors.length === 15 && d8.creatures.length === 5 && d8.repairs.length === 8 && d8.apprentices.length === 9 && d8.need === 6);
  ok('M08: ruta de 10 estaciones, suma de ask 18 y 10 pads', d8.route.stations.length === 10 && d8.route.stations.reduce((n, s) => n + s.ask, 0) === 18 && d8.route.pads.length === 10);
  ok('M08: entrada, salida y torre del spec', d8.entry.x === 0 && d8.entry.z === 52 && d8.exit.z === 57 && d8.tower.z === -64 && d8.style === 'red' && d8.seed === 11);
  ok('M08: etiquetas con artículo', d8.repairs.every((r) => /^(el|la) /.test(r.label)), d8.repairs.map((r) => r.label).join(' | '));

  // mutaciones: cada una exige un error de la regla indicada (y, si se pide, con una pista del mensaje)
  const mutate = (fn, mod) => { const d = clone(d8); fn(d); return checkDistrict(d, mod || mod8); };
  const expectRule = (name, errs, rule, hint) => {
    const hit = errs.filter((e) => e.indexOf(rule + ':') === 0 && (!hint || hint.test(e)));
    ok(name + ' → ' + rule, hit.length > 0, errs.length ? errs.join(' || ') : 'sin errores');
  };
  const dropTypes = (mod, pred) => ({ ...mod, questions: mod.questions.filter((q) => !pred(q)) });

  expectRule('R1 quitar el mentor m01', mutate((d) => { d.mentors = d.mentors.filter((m) => m.id !== 'm01'); }), 'R1', /T01/);
  expectRule('R1 nombre de mentor repetido', mutate((d) => { d.mentors[1].name = d.mentors[0].name; }), 'R1', /repetid/);
  expectRule('R2 tema repetido en dos criaturas', mutate((d) => { d.creatures.find((c) => c.id === 'capas').topics.push('T01'); }), 'R2', /T01/);
  expectRule('R2 criatura con < 8 preguntas mcq+tf', mutate((d) => d, dropTypes(mod8, (q) => (q.topic === 'T11' || q.topic === 'T15') && (q.type === 'mcq' || q.type === 'tf'))), 'R2', /espia/);
  expectRule('R3 reparación con un tema de 1 pregunta', mutate((d) => { d.repairs[0].topic = 'T01'; }), 'R3', /r01/);
  expectRule('R4 aprendiz correct sin preguntas error', mutate((d) => d, dropTypes(mod8, (q) => q.topic === 'T02' && q.type === 'error')), 'R4', /a02/);
  expectRule('R4 aprendiz con nombre de mentor', mutate((d) => { d.apprentices[0].name = d.mentors[0].name; }), 'R4', /nombre/);
  expectRule('R4 need mayor que los aprendices', mutate((d) => { d.need = 10; }), 'R4', /need/);
  expectRule('R5 id __proto__', mutate((d) => { d.mentors[0].id = '__proto__'; }), 'R5', /__proto__/);
  expectRule('R5 id repetido', mutate((d) => { d.repairs[1].id = d.repairs[0].id; }), 'R5', /repetid/);
  expectRule('R6 palabra prohibida', mutate((d) => { d.mentors[0].name = 'Batman'; }), 'R6', /Batman|prohibida/i);
  const b0 = CM.layoutBuildings(d8)[0];
  expectRule('R7 mentor dentro de un edificio', mutate((d) => { d.mentors[0].x = b0.x; d.mentors[0].z = b0.z; }), 'R7', /m01/);
  expectRule('R7 dos puntos a 3 m', mutate((d) => { d.mentors[1].x = d.mentors[0].x + 3; d.mentors[1].z = d.mentors[0].z; }), 'R7', /menos de 4 m/);
  expectRule('R7 bounds de 150 × 130', mutate((d) => { d.bounds = { minX: -75, maxX: 75, minZ: -70, maxZ: 60 }; }), 'R7', /bounds|tamaño/i);
  expectRule('R7 punto fuera de los bounds', mutate((d) => { d.mentors[0].x = 200; }), 'R7', /fuera/);
  expectRule('R8 kp desalineado', mutate((d) => { d.route.stations[1].kp[0].expect = 'texto que no está en el punto'; }), 'R8', /kp/);
  expectRule('R8 ask = 3', mutate((d) => { d.route.stations[0].ask = 3; }), 'R8', /ask/);
  expectRule('R8 expect de 10 caracteres', mutate((d) => { d.route.stations[0].kp[0].expect = 'computador'; }), 'R8', /expect/);
  expectRule('R8 nueve pads para diez estaciones', mutate((d) => { d.route.pads = d.route.pads.slice(0, 9); }), 'R8', /pad/);
  expectRule('R8 estaciones que no cubren todos los temas', mutate((d) => { d.route.stations[9].topics = ['T01']; d.route.stations[9].kp = [{ topic: 'T01', index: 0, expect: 'computadoras autónomas conectadas' }]; d.route.stations[8].topics = ['T05']; d.route.stations[8].kp = [{ topic: 'T05', index: 0, expect: 'protocolo' }]; }), 'R8', /cubr|tema/i);

  // ---- plaza: portales (R9) y rangos (R10) ----
  const ep = checkPlaza(city);
  ok('plaza válida: sin errores (11 portales, rangos, puntos libres)', ep.length === 0, ep.join(' || '));
  const SIN = city.order.find((m) => !Object.prototype.hasOwnProperty.call(city.districts, m));   // un portal que sigue siendo muro sólido
  const mutP = (fn) => { const D = clone(city); fn(D); return checkPlaza(D); };
  expectRule('R9 portal repetido', mutP((D) => { D.plaza.portals[1].dist = D.plaza.portals[0].dist; }), 'R9', /repetid/);
  expectRule('R9 distrito de ORDER sin portal', mutP((D) => { D.plaza.portals = D.plaza.portals.filter((p) => p.dist !== 'M05'); }), 'R9', /M05/);
  expectRule('R9 portal de un distrito que no está en ORDER', mutP((D) => { D.plaza.portals[2].dist = 'M99'; }), 'R9', /M99/);
  expectRule('R9 distrito existente fuera de ORDER', mutP((D) => { D.order = D.order.filter((m) => m !== 'M08'); }), 'R9', /M08/);
  expectRule('R9 back dentro de un muro sólido', mutP((D) => { const w = D.plaza.portals.find((p) => p.dist === SIN); D.plaza.portals.find((p) => p.dist === 'M08').back = { x: w.x, z: w.z, yaw: 0 }; }), 'R9', /back/);
  expectRule('R9 back dentro de la boca de un portal abierto', mutP((D) => { const q = D.plaza.portals.find((p) => p.dist === 'M02'); q.back = { x: q.x, z: q.z, yaw: 0 }; }), 'R9', /back/);
  expectRule('R9 back fuera de los bounds de la plaza', mutP((D) => { D.plaza.portals[0].back.x = 200; }), 'R9', /back/);
  expectRule('R10 tabla de rangos distinta', mutP((D) => { D.ranks[2][0] = 4; }), 'R10', /rangos/);
  expectRule('R7 director dentro de la sede', mutP((D) => { D.plaza.director.x = 0; D.plaza.director.z = -14; }), 'R7', /iris/);
  expectRule('R6 palabra prohibida en el nombre de la directora', mutP((D) => { D.plaza.director.name = 'Hulk'; }), 'R6', /Hulk|prohibida/i);

  results.forEach((r) => console.log(r.join(' | ')));
  const fails = results.filter((r) => r[0] === 'FAIL').length;
  console.log(fails ? `\n${fails} FALLOS` : '\nVALIDATE_DISTRICTS OK (' + results.length + ' comprobaciones)');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('EXCEPCIÓN', e && e.message); results.forEach((r) => console.log(r.join(' | '))); process.exit(2); });
