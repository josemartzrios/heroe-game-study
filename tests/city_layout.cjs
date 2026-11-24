// Pruebas de city/layout.mjs (makeLayout) y de que city/districts/m02.mjs conserva las coordenadas de M02.
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');
const results = [];
const ok = (name, cond, extra) => { results.push([cond ? 'PASS' : 'FAIL', name, extra || '']); };
const imp = (rel) => import(pathToFileURL(path.join(__dirname, '..', rel)).href);

(async () => {
  const { makeLayout, people, standardFrame } = await imp('city/layout.mjs');
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

  // entradas que harían un bucle sin fin: se rechazan con un error en vez de colgar la build
  for (const [como, args] of [['paso 0', { step: 0 }], ['paso negativo', { step: -8 }], ['paso no numérico', { step: 'x' }], ['xRange infinito', { xRange: [0, Infinity] }],
    ['xRange que empieza en -Infinity', { xRange: [-Infinity, 0] }], ['zRange infinito', { zRange: [0, -Infinity] }], ['zRange con NaN', { zRange: [NaN, 0] }]]) {
    let e = null; try { makeLayout({ streetX: [0], streetZ: [0], xRange: [-8, 8], zRange: [8, -8], ...args }); } catch (x) { e = x; }
    ok('makeLayout lanza con ' + como, e && /makeLayout/.test(e.message), e && e.message);
  }
  ok('makeLayout acepta que falte el rango de una dirección sin calles (solo filas o solo columnas)', (() => { try { return makeLayout({ streetX: [], streetZ: [0], xRange: [0, 8] }).take().x === 0 && makeLayout({ streetX: [0], streetZ: [], zRange: [0, -8] }).take().z === 0; } catch (e) { return false; } })());
  ok('makeLayout sigue aceptando un rango de un solo punto y el paso por defecto', (() => { const L = makeLayout({ streetX: [0], streetZ: [], xRange: [0, 0], zRange: [0, 0] }); return L.take().x === 0; })());
  // people(): ids, temas y orden fijo de lugares (mentores → criaturas → reparaciones → aprendices)
  { const spots = []; const lay = { take() { const p = { x: spots.length, z: -spots.length }; spots.push(p); return { x: p.x, z: p.z }; } };
    const P = people(lay, { mentors: ['Ana', 'Beto'], creatures: [{ id: 'bit', name: 'Bit', topics: ['T01', 'T02'] }], repairs: [['T02', 'el semáforo']], apprentices: [['Cleo', 'T01', 'explain']] });
    ok('people(): mentores m01/m02 con temas T01/T02 y los primeros lugares', JSON.stringify(P.mentors) === JSON.stringify([{ id: 'm01', topic: 'T01', name: 'Ana', x: 0, z: -0 }, { id: 'm02', topic: 'T02', name: 'Beto', x: 1, z: -1 }]), JSON.stringify(P.mentors));
    ok('people(): la criatura toma el lugar siguiente como área de 6 m', JSON.stringify(P.creatures[0]) === JSON.stringify({ id: 'bit', name: 'Bit', topics: ['T01', 'T02'], area: { x: 2, z: -2, r: 6 } }), JSON.stringify(P.creatures));
    ok('people(): reparación r01 y aprendiz a01 después, en ese orden', JSON.stringify(P.repairs[0]) === JSON.stringify({ id: 'r01', topic: 'T02', label: 'el semáforo', x: 3, z: -3 }) && JSON.stringify(P.apprentices[0]) === JSON.stringify({ id: 'a01', topic: 'T01', name: 'Cleo', mode: 'explain', x: 4, z: -4 }), JSON.stringify([P.repairs, P.apprentices]));
    ok('people(): toma exactamente un lugar por personaje', spots.length === 5); }
  // standardFrame().lay: la secuencia de lugares que reparte take() es lo que fija dónde está cada personaje; si cambia, se mueven todos los de todos los distritos
  { const lay = standardFrame().lay, got = []; try { for (;;) got.push(lay.take()); } catch (e) { /* fin de los lugares */ }
    ok('standardFrame().lay.take(): los tres primeros lugares son {-52,16}, {-44,16} y {-36,16}', JSON.stringify(got.slice(0, 3)) === '[{"x":-52,"z":16},{"x":-44,"z":16},{"x":-36,"z":16}]', JSON.stringify(got.slice(0, 3)));
    ok('standardFrame().lay: hay exactamente 72 lugares y el último es {28,-68}', got.length === 72 && JSON.stringify(got[71]) === '{"x":28,"z":-68}', got.length + ' ' + JSON.stringify(got[got.length - 1])); }
  // standardFrame(): el marco común de los distritos de las tandas 2 a 4 (mismo mapa que Nodo Enlace sin pads)
  { const F = standardFrame();
    const want = { bounds: { minX: -60, maxX: 60, minZ: -70, maxZ: 60 }, entry: { x: 0, z: 52, yaw: 0 }, exit: { x: 0, z: 57, w: 6, d: 2 }, tower: { id: 'torre', x: 0, z: -64, w: 8, d: 8, h: 20 }, streets: { x: [-28, 0, 28], z: [16, -12, -40] } };
    ok('standardFrame(): bounds, entrada, salida, torre y calles del marco común', ['bounds', 'entry', 'exit', 'tower', 'streets'].every((k) => JSON.stringify(F[k]) === JSON.stringify(want[k])), JSON.stringify(F));
    ok('standardFrame(): 16 manzanas con x {−42, −14, 14, 42} y z {30, 2, −26, −54}', F.blocks.length === 16 && JSON.stringify(F.blocks.slice(0, 4)) === '[[-42,30],[-42,2],[-42,-26],[-42,-54]]' && JSON.stringify(F.blocks[15]) === '[42,-54]', JSON.stringify(F.blocks));
    ok('standardFrame(): el orden de claves es el que usan los distritos', Object.keys(F).join() === 'lay,tower,entry,exit,bounds,streets,blocks', Object.keys(F).join());
    const G = standardFrame();
    const shared = [];
    const walk = (a, b, path) => { if (a && b && typeof a === 'object' && typeof b === 'object') { if (a === b) shared.push(path); for (const k of Object.keys(a)) walk(a[k], b[k], path + '.' + k); } };
    walk(F, G, 'frame');
    ok('standardFrame(): dos llamadas no comparten ningún objeto ni array', shared.length === 0, shared.slice(0, 4).join(', '));
    const a1 = F.lay.take(), a2 = G.lay.take();
    ok('standardFrame(): cada llamada da un lay nuevo (el primer take() de dos marcos es el mismo lugar)', JSON.stringify(a1) === JSON.stringify(a2) && a1.x === a2.x, JSON.stringify([a1, a2]));
    ok('standardFrame(): el lay reserva torre y entrada (ningún lugar a menos de 7 m de ellas)', (() => { const L = standardFrame().lay, pts = []; try { for (;;) pts.push(L.take()); } catch (e) { /* sin lugares */ } return pts.length >= 45 && pts.every((p) => Math.hypot(p.x, p.z + 64) >= 7 && Math.hypot(p.x, p.z - 52) >= 7); })()); }
  results.forEach((r) => console.log(r.join(' | ')));
  const fails = results.filter((r) => r[0] === 'FAIL').length;
  console.log(fails ? `\n${fails} FALLOS` : '\nCITY_LAYOUT OK (' + results.length + ' comprobaciones)');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('EXCEPCIÓN', e && e.message); results.forEach((r) => console.log(r.join(' | '))); process.exit(2); });
