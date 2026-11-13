// Factibilidad del plan de distritos, Task 2 / spec §4.5: la geometría de M08 da lugares para 15 mentores + 5 criaturas + 8 reparaciones + 9 aprendices.
const results = [];
const ok = (name, cond, extra) => { results.push([cond ? 'PASS' : 'FAIL', name, extra || '']); };

// Misma reimplementación del makeLayout del plan (Task 1, bloque Interfaces).
function makeLayout({ reserve, streetX, streetZ, xRange, zRange, step = 8, min = 7 }) {
  const taken = reserve.map(([x, z]) => ({ x, z }));
  const spots = [];
  const free = (x, z) => taken.every((p) => Math.hypot(p.x - x, p.z - z) >= min);
  const add = (x, z) => { if (free(x, z)) { taken.push({ x, z }); spots.push({ x, z }); } };
  for (const z of streetZ) for (let x = xRange[0]; x <= xRange[1]; x += step) add(x, z);
  for (const x of streetX) for (let z = zRange[0]; z >= zRange[1]; z -= step) add(x, z);
  let next = 0;
  return { take() { if (next >= spots.length) throw new Error('faltan lugares'); return { ...spots[next++] }; }, spots };
}

const NEED = 15 + 5 + 8 + 9;                       // 37
const bounds = { minX: -60, maxX: 60, minZ: -70, maxZ: 60 };
const streetX = [-28, 0, 28], streetZ = [16, -12, -40];
const blocks = [-42, -14, 14, 42].flatMap((x) => [30, 2, -26, -54].map((z) => ({ x, z, w: 20, d: 20 })));
const tower = { x: 0, z: -64, w: 8, d: 8 };
const entry = { x: 0, z: 52 };
const exitBox = { x: 0, z: 57, w: 6, d: 2 };       // tamaño supuesto (como un muro de la plaza); el spec no lo fija
// Pads propuestos S0..S9, todos sobre ejes de calle, de la entrada a la torre.
const pads = [[0, 44], [0, 30], [0, 16], [-14, 16], [-28, 2], [-28, -12], [-14, -12], [0, -26], [0, -40], [0, -54]];
const boxes = [...blocks, tower, exitBox];
// distancia de un punto al borde de una caja (0 si está dentro)
const gap = (p, b) => Math.hypot(Math.max(Math.abs(p.x - b.x) - b.w / 2, 0), Math.max(Math.abs(p.z - b.z) - b.d / 2, 0));
const inside = (p, b) => Math.abs(p.x - b.x) < b.w / 2 && Math.abs(p.z - b.z) < b.d / 2;
const inBounds = (p) => p.x >= bounds.minX && p.x <= bounds.maxX && p.z >= bounds.minZ && p.z <= bounds.maxZ;
const P = (a) => ({ x: a[0], z: a[1] });

function run(label, zRange, extraReserve = []) {
  const L = makeLayout({ reserve: [[tower.x, tower.z], ...pads, ...extraReserve], streetX, streetZ, xRange: [-52, 52], zRange });
  const all = L.spots;
  const got = []; let err = null;
  try { for (let i = 0; i < NEED; i++) got.push(L.take()); } catch (e) { err = e.message; }
  ok(`${label}: hay lugares para los 37 (sobran ${all.length - NEED} de ${all.length})`, err === null && got.length === NEED, err || '');
  const badBox = got.filter((p) => boxes.some((b) => gap(p, b) < 0.6));
  ok(`${label}: los 37 lugares quedan a >= 0.6 m de manzanas, torre y salida`, badBox.length === 0, JSON.stringify(badBox));
  const badB = got.filter((p) => !inBounds(p));
  ok(`${label}: los 37 lugares quedan dentro de bounds`, badB.length === 0, JSON.stringify(badB));
  const pts = [...got, ...pads.map(P)];
  let close = 0; for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) if (Math.hypot(pts[i].x - pts[j].x, pts[i].z - pts[j].z) < 7) close++;
  ok(`${label}: separación >= 7 m entre los 37 lugares y los 10 pads`, close === 0, String(close));
  const nearEntry = got.filter((p) => Math.hypot(p.x - entry.x, p.z - entry.z) < 7);
  ok(`${label}: ningún lugar a < 7 m de la entrada (0,52)`, nearEntry.length === 0, JSON.stringify(nearEntry));
  return all.length - NEED;
}

// zRange análogo a M02 (hi = maxZ - 8, lo = torre.z - 8) y una variante recortada dentro de bounds.
const sobraA = run('zRange [52,-72] (análogo a M02)', [52, -72]);
const sobraB = run('zRange [44,-56]', [44, -56]);
const sobraC = run('zRange [52,-72] + entrada reservada', [52, -72], [[entry.x, entry.z]]);

ok('entrada (0,52) fuera de toda caja', boxes.every((b) => !inside(entry, b)) && blocks.every((b) => gap(entry, b) >= 0.6));
ok('salida (0,57) fuera de manzanas y torre', [...blocks, tower].every((b) => gap(P([exitBox.x, exitBox.z]), b) >= 0.6));
ok('entrada y salida dentro de bounds', inBounds(entry) && inBounds(P([exitBox.x, exitBox.z])));
ok('los 10 pads están sobre un eje de calle', pads.every(([x, z]) => streetX.includes(x) || streetZ.includes(z)));
ok('los 10 pads quedan a >= 0.6 m de toda caja y dentro de bounds', pads.map(P).every((p) => inBounds(p) && boxes.every((b) => gap(p, b) >= 0.6)));
{ let c = 0; for (let i = 0; i < pads.length; i++) for (let j = i + 1; j < pads.length; j++) if (Math.hypot(pads[i][0] - pads[j][0], pads[i][1] - pads[j][1]) < 7) c++;
  ok('pads separados >= 7 m entre sí', c === 0, String(c)); }
ok('bounds de M08 <= 140 x 160 m', bounds.maxX - bounds.minX <= 140 && bounds.maxZ - bounds.minZ <= 160);

let fail = 0;
for (const [s, n, e] of results) { if (s === 'FAIL') fail++; console.log(s + '  ' + n + (e ? '  [' + e + ']' : '')); }
console.log(`\nsobran: análogo ${sobraA}, recortado ${sobraB}, con entrada reservada ${sobraC}`);
console.log(`${results.length - fail}/${results.length} PASS`);
process.exit(fail ? 1 : 0);
