// Pruebas de city/layout.mjs (makeLayout) y de que city/districts/m02.mjs conserva las coordenadas de M02.
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');
const results = [];
const ok = (name, cond, extra) => { results.push([cond ? 'PASS' : 'FAIL', name, extra || '']); };
const imp = (rel) => import(pathToFileURL(path.join(__dirname, '..', rel)).href);

(async () => {
  const { makeLayout, people } = await imp('city/layout.mjs');
  const { district: M } = await imp('city/districts/m02.mjs');
  const fx = JSON.parse(fs.readFileSync(path.join(__dirname, 'fixtures', 'm02_coords.json'), 'utf8'));

  // M02 conserva coordenadas
  const pts = {};
  for (const k of ['mentors', 'repairs', 'apprentices']) for (const e of M[k]) pts[e.id] = [e.x, e.z];
  for (const c of M.creatures) pts[c.id] = [c.area.x, c.area.z];
  const ids = Object.keys(fx);
  ok('M02: mismos ids que el fixture', JSON.stringify(Object.keys(pts).sort()) === JSON.stringify(ids.slice().sort()), Object.keys(pts).length + ' vs ' + ids.length);
  const moved = ids.filter((id) => !pts[id] || pts[id][0] !== fx[id][0] || pts[id][1] !== fx[id][1]);
  ok('M02 conserva coordenadas de los 51 lugares', moved.length === 0, moved.join(','));
  ok('torre igual', JSON.stringify(M.tower) === JSON.stringify({ id: 'torre', x: 0, z: -162, w: 8, d: 8, h: 20 }), JSON.stringify(M.tower));
  ok('M02: formato §4.2 (id, name, style, seed, celebrate, need)', M.id === 'M02' && M.name === 'Taller Comunal' && M.style === 'taller' && M.seed === 7 && M.need === 8 && M.celebrate && M.celebrate.power && M.celebrate.power.id === 'planos');
  ok('M02: etiquetas de reparación con artículo', M.repairs.every((r) => /^(el|la) /.test(r.label)), M.repairs.map((r) => r.label).join(' | '));
  ok('M02: sin puente', !('bridge' in M));

  // makeLayout
  const lay = makeLayout({ streetX: [0], streetZ: [], xRange: [0, 0], zRange: [0, -8] });
  const a = lay.take(), b = lay.take();
  ok('makeLayout: orden de recorrido por columna (z bajando)', a.x === 0 && a.z === 0 && b.x === 0 && b.z === -8, JSON.stringify([a, b]));
  let err = null; try { lay.take(); } catch (e) { err = e; }
  ok('makeLayout lanza al agotarse', err && /faltan lugares/.test(err.message), err && err.message);

  const lay2 = makeLayout({ reserve: [[0, 0]], streetX: [0], streetZ: [0], xRange: [-20, 20], zRange: [20, -20] });
  const got = []; try { for (;;) got.push(lay2.take()); } catch (e) { /* agotado */ }
  ok('reserve excluye: ningún punto a menos de 7 m de la reserva', got.length > 0 && got.every((p) => Math.hypot(p.x, p.z) >= 7), got.length + ' puntos');
  ok('separación mínima 7 m entre puntos', got.every((p, i) => got.every((q, j) => i === j || Math.hypot(p.x - q.x, p.z - q.z) >= 7)));

  // people(): ids, temas y orden fijo de lugares (mentores → criaturas → reparaciones → aprendices)
  { const spots = []; const lay = { take() { const p = { x: spots.length, z: -spots.length }; spots.push(p); return { x: p.x, z: p.z }; } };
    const P = people(lay, { mentors: ['Ana', 'Beto'], creatures: [{ id: 'bit', name: 'Bit', topics: ['T01', 'T02'] }], repairs: [['T02', 'el semáforo']], apprentices: [['Cleo', 'T01', 'explain']] });
    ok('people(): mentores m01/m02 con temas T01/T02 y los primeros lugares', JSON.stringify(P.mentors) === JSON.stringify([{ id: 'm01', topic: 'T01', name: 'Ana', x: 0, z: -0 }, { id: 'm02', topic: 'T02', name: 'Beto', x: 1, z: -1 }]), JSON.stringify(P.mentors));
    ok('people(): la criatura toma el lugar siguiente como área de 6 m', JSON.stringify(P.creatures[0]) === JSON.stringify({ id: 'bit', name: 'Bit', topics: ['T01', 'T02'], area: { x: 2, z: -2, r: 6 } }), JSON.stringify(P.creatures));
    ok('people(): reparación r01 y aprendiz a01 después, en ese orden', JSON.stringify(P.repairs[0]) === JSON.stringify({ id: 'r01', topic: 'T02', label: 'el semáforo', x: 3, z: -3 }) && JSON.stringify(P.apprentices[0]) === JSON.stringify({ id: 'a01', topic: 'T01', name: 'Cleo', mode: 'explain', x: 4, z: -4 }), JSON.stringify([P.repairs, P.apprentices]));
    ok('people(): toma exactamente un lugar por personaje', spots.length === 5); }
  results.forEach((r) => console.log(r.join(' | ')));
  const fails = results.filter((r) => r[0] === 'FAIL').length;
  console.log(fails ? `\n${fails} FALLOS` : '\nCITY_LAYOUT OK (' + results.length + ' comprobaciones)');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('EXCEPCIÓN', e && e.message); results.forEach((r) => console.log(r.join(' | '))); process.exit(2); });
