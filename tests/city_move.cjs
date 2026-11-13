// Pruebas de city/move.js (matemática pura): coord, layoutBuildings, boxesFor, step, faceOf, nearest y within.
// Los casos de step/cameraArm incluyen los contraejemplos del oráculo adversarial (tests/adv/plan_city_oracle.cjs).
const path = require('path');
const { pathToFileURL } = require('url');
const results = [];
const ok = (name, cond, extra) => { results.push([cond ? 'PASS' : 'FAIL', name, extra || '']); };

function rng(seed) { let a = seed >>> 0; const f = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; f.range = (lo, hi) => lo + f() * (hi - lo); f.int = (lo, hi) => lo + Math.floor(f() * (hi - lo + 1)); f.bool = (p = 0.5) => f() < p; f.pick = (a2) => a2[Math.floor(f() * a2.length)]; return f; }
const R = 0.4;
const box = (cx, cz, w, d, h = 10) => ({ minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2, h });
const d2 = (x, z, b) => { const cx = Math.max(b.minX, Math.min(x, b.maxX)), cz = Math.max(b.minZ, Math.min(z, b.maxZ)); return (x - cx) ** 2 + (z - cz) ** 2; };
const pen = (x, z, boxes) => boxes.some((b) => d2(x, z, b) < (R - 1e-6) ** 2);
const inside = (x, z, b) => x > b.minX && x < b.maxX && z > b.minZ && z < b.maxZ;
function rayBox(ox, oz, dx, dz, b) {
  let t0 = 0, t1 = Infinity;
  for (const [o, d, lo, hi] of [[ox, dx, b.minX, b.maxX], [oz, dz, b.minZ, b.maxZ]]) {
    if (Math.abs(d) < 1e-12) { if (o < lo || o > hi) return Infinity; continue; }
    let a = (lo - o) / d, c = (hi - o) / d; if (a > c) [a, c] = [c, a];
    t0 = Math.max(t0, a); t1 = Math.min(t1, c); if (t0 > t1) return Infinity;
  }
  return t0;
}
const crossed = (p, q, b) => { const dx = q.x - p.x, dz = q.z - p.z, L = Math.hypot(dx, dz); if (!L) return false; const t = rayBox(p.x, p.z, dx / L, dz / L, b); return t <= L && !inside(q.x, q.z, b) && d2(q.x, q.z, b) >= R * R; };

(async () => {
  const CM = require('../city/move.js');
  const { city: D } = await import(pathToFileURL(path.join(__dirname, '..', 'city', 'districts.mjs')).href);
  const M2 = D.districts.M02;
  const st0 = { x: 0, z: 0, yaw: 0, vx: 0, vz: 0, speed: 0 };

  // ---- coord / isNum ----
  ok('coord: "5", [], null, NaN, -Infinity → fallback', ['5', [], null, NaN, -Infinity, undefined, {}].every((v) => CM.coord(v, -10, 10, 7) === 7));
  ok('coord: 1e308 → max, -1e308 → min, -5 → -5', CM.coord(1e308, -10, 10, 0) === 10 && CM.coord(-1e308, -10, 10, 0) === -10 && CM.coord(-5, -10, 10, 0) === -5);

  // ---- layoutBuildings ----
  const L1 = CM.layoutBuildings(M2), L2 = CM.layoutBuildings(M2);
  ok('layoutBuildings es determinista', JSON.stringify(L1) === JSON.stringify(L2));
  ok('layoutBuildings: entre 32 y 48 edificios', L1.length >= 32 && L1.length <= 48, 'n=' + L1.length);
  { let outside = 0, badSize = 0;
    for (const b of L1) {
      const blk = M2.blocks.find(([cx, cz]) => Math.abs(b.x - cx) <= 10 && Math.abs(b.z - cz) <= 10);
      if (!blk || b.x - b.w / 2 < blk[0] - 10 + 0.4 || b.x + b.w / 2 > blk[0] + 10 - 0.4 || b.z - b.d / 2 < blk[1] - 10 + 0.4 || b.z + b.d / 2 > blk[1] + 10 - 0.4) outside++;
      if (b.w < 5 || b.w > 9 || b.d < 5 || b.d > 9 || b.h < 4 || b.h > 14) badSize++;
    }
    ok('layoutBuildings: cada edificio queda dentro de su manzana y con tamaños del spec', outside === 0 && badSize === 0, `fuera=${outside} tamaño=${badSize}`); }

  // ---- scene / boxesFor / portalAt (por escena) ----
  const M8 = D.districts.M08, P = D.plaza, aabbOf = (o) => ({ minX: o.x - o.w / 2, maxX: o.x + o.w / 2, minZ: o.z - o.d / 2, maxZ: o.z + o.d / 2 });
  ok('scene: plaza, distritos propios y null para nombres que no son escenas', CM.scene(D, 'plaza') === D.plaza && CM.scene(D, 'M02') === M2 && CM.scene(D, 'M08') === M8 && ['M99', '__proto__', 'constructor', 'toString', '', null, 5, undefined].every((id) => CM.scene(D, id) === null));
  const plazaBoxes = CM.boxesFor(D, 'plaza'), m2Boxes = CM.boxesFor(D, 'M02'), m8Boxes = CM.boxesFor(D, 'M08');
  const finite = (b) => ['minX', 'maxX', 'minZ', 'maxZ'].every((k) => typeof b[k] === 'number' && Number.isFinite(b[k]));
  ok('boxesFor: cajas finitas y sin altura (el dibujo 2D no la usa)', plazaBoxes.concat(m2Boxes, m8Boxes).every((b) => finite(b) && !('h' in b)));
  const sameBox = (a, b) => ['minX', 'maxX', 'minZ', 'maxZ'].every((k) => Math.abs(a[k] - b[k]) < 1e-9);
  const existing = P.portals.filter((p) => D.districts[p.dist]), pending = P.portals.filter((p) => !D.districts[p.dist]);
  ok('portales: 11 en total (2 abiertos y 9 sin distrito)', P.portals.length === 11 && existing.length === 2 && pending.length === 9, existing.length + '/' + pending.length);
  ok('boxesFor plaza: sede + 9 muros sin distrito + 4 bordes', plazaBoxes.length === 1 + 9 + 4, 'n=' + plazaBoxes.length);
  ok('boxesFor plaza: los portales M02 y M08 NO son sólidos y los muros "Próximamente" sí', existing.every((p) => !plazaBoxes.some((b) => sameBox(b, aabbOf(p)))) && pending.every((p) => plazaBoxes.some((b) => sameBox(b, aabbOf(p)))));
  ok('boxesFor M02: edificios + torre + 4 bordes (sin puente)', m2Boxes.length === CM.layoutBuildings(M2).length + 1 + 4, 'n=' + m2Boxes.length);
  ok('boxesFor M08: edificios + torre + 4 bordes', m8Boxes.length === CM.layoutBuildings(M8).length + 1 + 4, 'n=' + m8Boxes.length);
  ok('boxesFor con escena inválida → []', ['M99', '__proto__', 'constructor', null, 7].every((id) => Array.isArray(CM.boxesFor(D, id)) && CM.boxesFor(D, id).length === 0));
  ok('entradas de las tres escenas quedan libres', !pen(P.entry.x, P.entry.z, plazaBoxes) && !pen(M2.entry.x, M2.entry.z, m2Boxes) && !pen(M8.entry.x, M8.entry.z, m8Boxes));
  ok('los puntos "back" de los portales quedan libres de cajas y fuera de todo portal', P.portals.every((p) => !pen(p.back.x, p.back.z, plazaBoxes) && CM.portalAt(D, 'plaza', p.back.x, p.back.z) === null));
  { const bad = [[P, plazaBoxes, [P.director, P.mirror]], [M2, m2Boxes, [...M2.mentors, ...M2.repairs, ...M2.apprentices, ...M2.creatures.map((c) => ({ id: c.id, x: c.area.x, z: c.area.z })), CM.door(M2.tower)]],
      [M8, m8Boxes, [...M8.mentors, ...M8.repairs, ...M8.apprentices, ...M8.creatures.map((c) => ({ id: c.id, x: c.area.x, z: c.area.z })), CM.door(M8.tower), ...M8.route.pads]]]
      .flatMap(([, boxes, pts]) => pts.filter((q) => boxes.some((b) => d2(q.x, q.z, b) < 0.6 * 0.6)).map((q) => q.id || 'pad'));
    ok('boxesFor: ningún interactuable queda dentro de una caja en su escena (margen 0.6 m)', bad.length === 0, bad.join(',')); }
  { const at = (o) => [o.x, o.z];
    const m8p = P.portals.find((p) => p.dist === 'M08'), m2p = P.portals.find((p) => p.dist === 'M02'), m3p = P.portals.find((p) => p.dist === 'M03');
    ok('portalAt: la boca del portal M08 → "M08" y la del M02 → "M02"', CM.portalAt(D, 'plaza', ...at(m8p)) === 'M08' && CM.portalAt(D, 'plaza', ...at(m2p)) === 'M02');
    ok('portalAt: un muro "Próximamente" (M03) → null, y la entrada de la plaza → null', CM.portalAt(D, 'plaza', ...at(m3p)) === null && CM.portalAt(D, 'plaza', P.entry.x, P.entry.z) === null);
    ok('portalAt: la salida de M02 y la de M08 → "plaza"; su entrada → null', CM.portalAt(D, 'M02', M2.exit.x, M2.exit.z) === 'plaza' && CM.portalAt(D, 'M08', M8.exit.x, M8.exit.z) === 'plaza' && CM.portalAt(D, 'M02', M2.entry.x, M2.entry.z) === null && CM.portalAt(D, 'M08', M8.entry.x, M8.entry.z) === null);
    ok('portalAt: escena inválida o coordenadas no finitas → null', CM.portalAt(D, 'M99', 0, 0) === null && CM.portalAt(D, 'plaza', NaN, 0) === null && CM.portalAt(D, 'plaza', 0, '5') === null && CM.portalAt(D, '__proto__', 0, 0) === null); }

  // ---- step ----
  const run = { mx: 0, mz: -1, run: true };
  { let s = { x: 0, z: 1 + R + 1e-9, yaw: 0, vx: 0, vz: -CM.RUN, speed: CM.RUN };
    for (let i = 0; i < 100; i++) s = CM.step(s, run, 0.05, [box(0, 0, 6, 2)], { canRun: true, safe: { x: 0, z: 5, yaw: 0 } });
    ok('step S2: un muro 6×2 resiste 100 pasos de 50 ms a la velocidad de carrera', s.z >= 1 + R - 1e-6, 'z=' + s.z); }
  { const bad = [];
    for (const dt of [0.12, 0.2, 0.5, 1, 5]) for (const [n, b] of [['muro 6×2', box(0, 0, 6, 2)], ['borde 0.1', box(0, 0, 6, 0.1)], ['grosor 0', box(0, 0, 6, 0)]]) {
      const s = { x: 0, z: (b.maxZ - b.minZ) / 2 + R + 0.01, yaw: 0, vx: 0, vz: -CM.RUN, speed: CM.RUN };
      const q = CM.step(s, run, dt, [b], { canRun: true, safe: { x: 0, z: 9, yaw: 0 } });
      if (q.z < b.minZ) bad.push(`${n} dt=${dt}`);
    }
    ok('step S3: dt grande (0.12–5 s) no atraviesa muros (se limita a 50 ms)', bad.length === 0, bad.join(' | ')); }
  { const bad = [];
    for (const dt of [0.1, 0.16, 0.25, 0.5, 5]) { const q = CM.step(st0, run, dt, [], { canRun: true, safe: { x: 0, z: 0, yaw: 0 } }); if (q.speed > CM.RUN + 1e-9) bad.push(`dt=${dt} v=${q.speed}`); }
    ok('step S4: la velocidad nunca pasa de la de carrera con dt grande', bad.length === 0, bad.join(' | '));
    let s = st0; for (let i = 0; i < 3; i++) s = CM.step(s, { mx: 0, mz: -1 }, 0.05, [], { canRun: false, safe: { x: 0, z: 0, yaw: 0 } });
    ok('step: a los 0.15 s ya lleva más del 60 % de la velocidad de caminar y nunca se pasa', s.speed >= 0.6 * CM.WALK && s.speed <= CM.WALK + 1e-9, 'speed=' + s.speed);
    for (let i = 0; i < 12; i++) s = CM.step(s, { mx: 0, mz: -1 }, 0.05, [], { canRun: false, safe: { x: 0, z: 0, yaw: 0 } });
    ok('step: a los 0.75 s alcanza la velocidad de caminar', s.speed > CM.WALK - 0.05 && s.speed <= CM.WALK + 1e-9, 'speed=' + s.speed);
    const w = CM.step(st0, { mx: 0, mz: -1, run: true }, 0.05, [], { canRun: false, safe: { x: 0, z: 0, yaw: 0 } });
    const r2 = CM.step({ ...st0, vz: -CM.WALK }, { mx: 0, mz: -1, run: true }, 0.05, [], { canRun: true, safe: { x: 0, z: 0, yaw: 0 } });
    ok('step: corre solo con canRun', w.speed < CM.WALK + 1e-4 && r2.speed > CM.WALK + 0.5, `${w.speed} / ${r2.speed}`); }
  { const r = rng(5); let stuck = 0, back = 0;
    for (let i = 0; i < 300; i++) {
      const zTop = r.range(-170, 40), x0 = r.range(-60, 60), w1 = r.range(5, 9), w2 = r.range(5, 9);
      const A = { minX: x0, maxX: x0 + w1, minZ: zTop - 6, maxZ: zTop, h: 10 }, B = { minX: x0 + w1, maxX: x0 + w1 + w2, minZ: zTop - 6, maxZ: zTop, h: 10 };
      let s = { x: x0 + w1 - 1.5, z: zTop + R + 0.05, yaw: 0, vx: 0, vz: 0, speed: 0 }, minDx = 0, px = s.x;
      for (let k = 0; k < 120; k++) { s = CM.step(s, { mx: 1, mz: -1 }, 1 / 60, [A, B], { safe: { x: s.x, z: s.z, yaw: 0 } }); minDx = Math.min(minDx, s.x - px); px = s.x; }
      if (s.x < x0 + w1 + 0.5) stuck++; if (minDx < -0.01) back++;
    }
    ok('step S5: deslizar contra dos cajas contiguas (costura) no se atasca ni retrocede (300 casos)', stuck === 0 && back === 0, `atascadas=${stuck} retrocesos=${back}`); }
  { const A = box(-5.3, 0, 10, 10), B = box(5.3, 0, 10, 10); let s = { x: 0, z: 5 + R + 0.1, yaw: 0, vx: 0, vz: 0, speed: 0 };
    for (let i = 0; i < 60; i++) s = CM.step(s, { mx: 0, mz: -1 }, 1 / 60, [A, B], { safe: { x: 0, z: 9, yaw: 0 } });
    ok('step S7: un hueco de 0.6 m entre cajas no deja al círculo dentro', !pen(s.x, s.z, [A, B]), `x=${s.x.toFixed(3)} z=${s.z.toFixed(3)}`); }
  { const r = rng(8), hostile = [NaN, Infinity, -Infinity, 1e308, -1e308, undefined, null, '5', {}, []]; let bad = 0, unsafe = 0;
    for (let i = 0; i < 2000; i++) {
      const s = { x: r.range(-5, 5), z: r.range(-5, 5), yaw: 0, vx: 0, vz: 0, speed: 0 };
      if (r.bool(0.3)) s[r.pick(['x', 'z', 'vx', 'vz', 'yaw'])] = r.pick(hostile);
      const it = { mx: r.bool(0.3) ? r.pick(hostile) : r.range(-1, 1), mz: r.bool(0.3) ? r.pick(hostile) : r.range(-1, 1), camYaw: r.bool(0.3) ? r.pick(hostile) : 0, run: true };
      const dt = r.bool(0.3) ? r.pick(hostile) : r.range(0, 0.05), safe = { x: 1, z: 2, yaw: 0.5 };
      const q = CM.step(s, it, dt, [box(20, 20, 2, 2)], { canRun: true, safe });
      if (![q.x, q.z, q.yaw, q.vx, q.vz, q.speed].every((v) => typeof v === 'number' && Number.isFinite(v))) bad++;
      const stateBad = ['x', 'z', 'vx', 'vz', 'yaw'].some((k) => typeof s[k] !== 'number' || !Number.isFinite(s[k])) || typeof dt !== 'number' || !Number.isFinite(dt) || dt < 0;
      if (stateBad && !(q.x === 1 && q.z === 2 && q.vx === 0 && q.vz === 0 && q.speed === 0)) unsafe++;
    }
    ok('step S8: entradas hostiles (NaN, Infinity, strings…) nunca dan salidas no finitas', bad === 0, 'no finitas=' + bad);
    ok('step: con estado o dt inválido devuelve opts.safe con velocidad 0', unsafe === 0, 'sin safe=' + unsafe); }
  { const r = rng(11); let cases = 0, bPen = 0, bTun = 0, bNan = 0;
    for (let i = 0; i < 1500; i++) {
      const boxes = []; const n = r.int(1, 6);
      for (let k = 0; k < n; k++) { const thin = r.bool(0.4), w = thin ? (r.bool() ? 6 : 2) : r.range(0.05, 9), d = thin ? (w === 6 ? 2 : 6) : r.range(0.05, 9); const b = box(r.range(-10, 10), r.range(-10, 10), w, d); if (boxes.every((o) => b.maxX < o.minX - 1 || b.minX > o.maxX + 1 || b.maxZ < o.minZ - 1 || b.minZ > o.maxZ + 1)) boxes.push(b); }
      let p = null; for (let k = 0; k < 200 && !p; k++) { const x = r.range(-14, 14), z = r.range(-14, 14); if (boxes.every((b) => d2(x, z, b) >= R * R)) p = { x, z }; }
      if (!p) continue;
      const vm = r.range(0, CM.RUN), an = r.range(-Math.PI, Math.PI), s = { x: p.x, z: p.z, yaw: 0, vx: Math.sin(an) * vm, vz: Math.cos(an) * vm, speed: vm };
      const q = CM.step(s, { mx: r.range(-1, 1), mz: r.range(-1, 1), run: true }, r.bool(0.1) ? 0.05 : r.range(0, 0.05), boxes, { canRun: true, safe: { x: p.x, z: p.z, yaw: 0 } }); cases++;
      if (![q.x, q.z, q.vx, q.vz, q.speed].every(Number.isFinite)) bNan++;
      if (pen(q.x, q.z, boxes)) bPen++;
      if (boxes.some((b) => crossed(s, q, b))) bTun++;
    }
    ok('step S1: ' + cases + ' casos con cajas separadas — sin NaN, penetración ni túnel', bNan === 0 && bPen === 0 && bTun === 0, `nan=${bNan} pen=${bPen} túnel=${bTun}`); }

  ok('velocidades: caminar ≥ 9 m/s (≈ 72 px/s a zoom 1), correr > caminar y ≤ 15 m/s (a 50 ms por paso no cruza un muro de 0.05 m más el radio)', CM.WALK >= 9 && CM.RUN > CM.WALK && CM.RUN <= 15, CM.WALK + ' / ' + CM.RUN);
  // ---- cámara 2D: sin brazo de cámara y con faceOf ----
  ok('cameraArm ya no existe', CM.cameraArm === undefined);
  ok('nearest se retiró (la vista busca el lugar más cercano por su cuenta)', CM.nearest === undefined);
  ok('layoutBuildings devuelve el índice de manzana y ya no un color sin uso', CM.layoutBuildings(D.districts.M02).every((b) => Number.isInteger(b.block) && b.block >= 0 && b.block < 16 && !('color' in b)));
  ok('layoutBuildings M08: determinista, 16 manzanas y edificios dentro de su manzana', JSON.stringify(CM.layoutBuildings(D.districts.M08)) === JSON.stringify(CM.layoutBuildings(D.districts.M08)) && CM.layoutBuildings(D.districts.M08).every((b) => b.block >= 0 && b.block < 16));
  { const f = CM.faceOf, PI = Math.PI;
    ok('faceOf: yaw 0 → up, π → down, π/2 → left, -π/2 → right', f(0) === 'up' && f(PI) === 'down' && f(PI / 2) === 'left' && f(-PI / 2) === 'right');
    ok('faceOf: en el empate a 45° gana el eje vertical', f(PI / 4) === 'up' && f(-PI / 4) === 'up' && f(3 * PI / 4) === 'down' && f(-3 * PI / 4) === 'down');
    ok('faceOf: normaliza ángulos grandes', f(7 * PI) === 'down' && f(-7 * PI) === 'down' && f(2 * PI) === 'up');
    ok('faceOf: valores no finitos o no numéricos → up', f(NaN) === 'up' && f(Infinity) === 'up' && f('x') === 'up' && f(null) === 'up'); }
  { const q = CM.step({ x: 0, z: 0, yaw: 0, vx: 0, vz: 0, speed: 0 }, { mx: 0, mz: -1 }, 0.05, [], { canRun: false, safe: { x: 0, z: 0, yaw: 0 } });
    ok('step sin camYaw: mz = -1 baja z (arriba en pantalla) y mx = +1 sube x (derecha)', q.vz < 0 && Math.abs(q.vx) < 1e-9 && CM.step({ x: 0, z: 0, yaw: 0, vx: 0, vz: 0, speed: 0 }, { mx: 1, mz: 0 }, 0.05, [], { canRun: false, safe: { x: 0, z: 0, yaw: 0 } }).vx > 0); }

  // ---- nearest / within ----
  { const items = [{ id: 'a', x: 3, z: 0 }, { id: 'b', x: 1, z: 0 }, { id: 'c', x: 0, z: 10 }];
    ok('within ordena por distancia y filtra', JSON.stringify(CM.within({ x: 0, z: 0 }, items, 5).map((i) => i.id)) === '["b","a"]'); }

  results.forEach((r) => console.log(r.join(' | ')));
  const fails = results.filter((r) => r[0] === 'FAIL').length;
  console.log(fails ? `\n${fails} FALLOS` : '\nCITY_MOVE OK (' + results.length + ' comprobaciones)');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('EXCEPCIÓN', e && e.message); results.forEach((r) => console.log(r.join(' | '))); process.exit(2); });
