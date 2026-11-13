// Factibilidad del plan de distritos, Task 1: makeLayout (tal como lo describe el plan) reproduce las coordenadas actuales de M02.
const path = require('path');
const { pathToFileURL } = require('url');
const results = [];
const ok = (name, cond, extra) => { results.push([cond ? 'PASS' : 'FAIL', name, extra || '']); };

// Reimplementación literal de la interfaz del plan (Task 1, bloque Interfaces).
function makeLayout({ reserve, streetX, streetZ, xRange, zRange, step = 8, min = 7 }) {
  const taken = reserve.map(([x, z]) => ({ x, z }));
  const spots = [];
  const free = (x, z) => taken.every((p) => Math.hypot(p.x - x, p.z - z) >= min);
  const add = (x, z) => { if (free(x, z)) { taken.push({ x, z }); spots.push({ x, z }); } };
  for (const z of streetZ) for (let x = xRange[0]; x <= xRange[1]; x += step) add(x, z);
  for (const x of streetX) for (let z = zRange[0]; z >= zRange[1]; z -= step) add(x, z);
  let next = 0;
  return { take() { if (next >= spots.length) throw new Error('faltan lugares'); return { ...spots[next++] }; }, count: spots.length };
}

const M02 = { streetX: [-28, 0, 28], streetZ: [-80, -108, -136], xRange: [-52, 52], zRange: [-58, -170] };
// Mismo orden de take() que city/districts.mjs: mentores, criaturas (area), reparaciones, aprendices.
const orderOf = (d) => [
  ...d.mentors.map((m) => [m.id, m.x, m.z]),
  ...d.creatures.map((c) => [c.id, c.area.x, c.area.z]),
  ...d.repairs.map((r) => [r.id, r.x, r.z]),
  ...d.apprentices.map((a) => [a.id, a.x, a.z])
];
function replay(reserve, n) { const L = makeLayout({ reserve, ...M02 }); const out = []; for (let i = 0; i < n; i++) out.push(L.take()); return { L, out }; }
function diff(cur, out) { return cur.filter(([, x, z], i) => !out[i] || out[i].x !== x || out[i].z !== z).map(([id]) => id); }

(async () => {
  const { city } = await import(pathToFileURL(path.join(__dirname, '..', 'city', 'districts.mjs')).href);
  const D = city.districts.M02;
  const cur = orderOf(D);

  ok('M02 actual usa 51 lugares (23 + 6 + 10 + 12)', cur.length === 51, String(cur.length));
  { const { out } = replay([[0, -162], [0, -178]], cur.length);
    const bad = diff(cur, out);
    ok('makeLayout con reserve [[0,-162],[0,-178]] reproduce EXACTAMENTE las coordenadas de M02 en el orden de take()', bad.length === 0, bad.join(',')); }
  { const { out } = replay([[0, -162]], cur.length);
    const bad = diff(cur, out);
    ok('makeLayout con reserve [[0,-162]] (sin puente) da las mismas coordenadas', bad.length === 0, bad.join(',')); }
  { const a = makeLayout({ reserve: [[0, -162], [0, -178]], ...M02 }).count, b = makeLayout({ reserve: [[0, -162]], ...M02 }).count;
    ok('quitar el puente de reserve no cambia el total de lugares disponibles', a === b, a + ' vs ' + b); }
  ok('torre de M02 sigue en {x:0, z:-162, w:8, d:8, h:20}', D.tower.x === 0 && D.tower.z === -162 && D.tower.w === 8 && D.tower.d === 8 && D.tower.h === 20);
  { const L = makeLayout({ reserve: [], streetX: [0], streetZ: [], xRange: [0, 0], zRange: [0, -8] });
    let threw = null; L.take(); L.take(); try { L.take(); } catch (e) { threw = e.message; }
    ok('caso del plan "lanza al agotarse": el tercer take() lanza "faltan lugares"', threw === 'faltan lugares', String(threw)); }
  { const L = makeLayout({ reserve: [[0, 0]], streetX: [0], streetZ: [0], xRange: [-16, 16], zRange: [16, -16] });
    const pts = []; try { for (;;) pts.push(L.take()); } catch (e) { /* agotado */ }
    ok('caso del plan "reserve excluye": ningún punto a < 7 m de (0,0)', pts.length > 0 && pts.every((p) => Math.hypot(p.x, p.z) >= 7), JSON.stringify(pts)); }

  let fail = 0;
  for (const [s, n, e] of results) { if (s === 'FAIL') fail++; console.log(s + '  ' + n + (e ? '  [' + e + ']' : '')); }
  console.log(`\n${results.length - fail}/${results.length} PASS`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
