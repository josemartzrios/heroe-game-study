// Oráculo adversarial de los CONTRATOS del plan docs/superpowers/plans/2026-11-11-ciudad-nucleo.md
// (Tareas 4 y 5) antes de que exista el código. Implementa referencias mínimas que siguen el contrato al pie
// de la letra y ataca: step/cameraArm (túneles, atascos, NaN), nextObjective (objetivos imposibles, bucles)
// y normalizeCity/restoration/applyRestore (estado hostil, prototipo).
// Uso: node tests/adv/plan_city_oracle.cjs [SEED=20261111] [N_STEP=4000] [N_OBJ=1500] [N_NORM=1500]
// Sale con 1 si algún contrato, tal como está escrito, produce un fallo.
'use strict';
const SEED = +(process.env.SEED || 20261111);
const N_STEP = +(process.env.N_STEP || 4000);
const N_OBJ = +(process.env.N_OBJ || 1500);
const N_NORM = +(process.env.N_NORM || 1500);

function rng(seed) {
  let a = seed >>> 0;
  const f = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  f.int = (lo, hi) => lo + Math.floor(f() * (hi - lo + 1));
  f.pick = (arr) => arr[Math.floor(f() * arr.length)];
  f.bool = (p = 0.5) => f() < p;
  f.range = (lo, hi) => lo + f() * (hi - lo);
  return f;
}

const results = [];
function check(id, sev, name, fn) {
  let r;
  try { r = fn(); } catch (e) { r = { ok: false, detail: 'EXCEPCIÓN ' + (e && e.stack ? e.stack.split('\n').slice(0, 2).join(' ') : e) }; }
  results.push(Object.assign({ id, sev, name }, r));
}
const J = (v) => JSON.stringify(v, (k, x) => (typeof x === 'number' && !Number.isFinite(x) ? String(x) : x));

// =====================================================================================
// 1. Referencia de CityMove (Tarea 5, literal)
// =====================================================================================
const R = 0.4, WALK = 4, RUN = 7, ACC = 0.15, ARM_MIN = 1.2;
const fin = Number.isFinite;

// coord: "v acotado si es finito, o fallback". El spec §6.4 dice "con isFinite" (global, coerciona).
function coordSpec(v, min, max, fallback) { return isFinite(v) ? (v < min ? min : v > max ? max : v) : fallback; }
function coordSafe(v, min, max, fallback) { return typeof v === 'number' && fin(v) ? Math.min(max, Math.max(min, v)) : fallback; }

function d2circleBox(x, z, b) {
  const cx = Math.max(b.minX, Math.min(x, b.maxX)), cz = Math.max(b.minZ, Math.min(z, b.maxZ));
  return (x - cx) * (x - cx) + (z - cz) * (z - cz);
}
const overlaps = (x, z, b) => d2circleBox(x, z, b) < R * R;

// Resolución por eje de un círculo contra AABB: se empuja SOLO en el eje del movimiento hasta quedar a R.
// Lado: opuesto a la velocidad del eje (si es 0, lado del centro). Una sola pasada por caja (el contrato no pide más).
function resolveAxis(axis, x, z, d, boxes) {
  for (const b of boxes) {
    if (!overlaps(x, z, b)) continue;
    if (axis === 'x') {
      const dz = z < b.minZ ? b.minZ - z : z > b.maxZ ? z - b.maxZ : 0;
      const pen = Math.sqrt(Math.max(0, R * R - dz * dz));
      const neg = d > 0 || (d === 0 && x < (b.minX + b.maxX) / 2);
      x = neg ? b.minX - pen : b.maxX + pen;
    } else {
      const dx = x < b.minX ? b.minX - x : x > b.maxX ? x - b.maxX : 0;
      const pen = Math.sqrt(Math.max(0, R * R - dx * dx));
      const neg = d > 0 || (d === 0 && z < (b.minZ + b.maxZ) / 2);
      z = neg ? b.minZ - pen : b.maxZ + pen;
    }
  }
  return axis === 'x' ? x : z;
}

// step literal: velocidad 4/7, "aceleración hacia el objetivo en 0.15 s" (mezcla lineal k = dt/0.15),
// relativo a camYaw (yaw 0 mira a -z), X luego Z, no finito → state anterior. Sin tope de dt (el contrato no lo pone).
function step(s, intent, dt, boxes, opts) {
  if (!fin(dt) || dt < 0) return s;
  const cy = intent.camYaw || 0;
  let mx = Math.max(-1, Math.min(1, intent.mx || 0)), mz = Math.max(-1, Math.min(1, intent.mz || 0));
  const l = Math.hypot(mx, mz); if (l > 1) { mx /= l; mz /= l; }
  // adelante (mz = -1) = (-sin cy, -cos cy); derecha = (cos cy, -sin cy)
  const wx = mx * Math.cos(cy) + mz * Math.sin(cy), wz = -mx * Math.sin(cy) + mz * Math.cos(cy);
  const top = intent.run && opts && opts.canRun ? RUN : WALK;
  const k = dt / ACC;
  let vx = s.vx + (wx * top - s.vx) * k, vz = s.vz + (wz * top - s.vz) * k;
  const ox = s.x + vx * dt;
  const x = resolveAxis('x', ox, s.z, vx, boxes); if (x !== ox) vx = 0;
  const oz = s.z + vz * dt;
  const z = resolveAxis('z', x, oz, vz, boxes); if (z !== oz) vz = 0;
  const speed = Math.hypot(vx, vz);
  const yaw = speed > 0.1 ? Math.atan2(-vx, -vz) : s.yaw;
  const n = { x, z, yaw, vx, vz, speed };
  for (const v of Object.values(n)) if (!fin(v)) return s;
  return n;
}

// cameraArm literal: rayo hacia atrás desde target en XZ contra AABB; largo = min(len, max(1.2, hit - 0.2)).
function rayBox(ox, oz, dx, dz, b) {
  let t0 = 0, t1 = Infinity;
  for (const [o, d, lo, hi] of [[ox, dx, b.minX, b.maxX], [oz, dz, b.minZ, b.maxZ]]) {
    if (Math.abs(d) < 1e-12) { if (o < lo || o > hi) return Infinity; continue; }
    let a = (lo - o) / d, c = (hi - o) / d; if (a > c) [a, c] = [c, a];
    t0 = Math.max(t0, a); t1 = Math.min(t1, c); if (t0 > t1) return Infinity;
  }
  return t0;
}
function cameraArm(target, yaw, pitch, len, boxes) {
  const h = Math.cos(pitch), dx = Math.sin(yaw) * h, dz = Math.cos(yaw) * h; // detrás del héroe (yaw 0 mira a -z)
  let hit = Infinity;
  for (const b of boxes) hit = Math.min(hit, rayBox(target.x, target.z, dx, dz, b) / Math.max(h, 1e-9));
  return Math.min(len, Math.max(ARM_MIN, hit - 0.2));
}
function camPoint(target, yaw, pitch, L) { const h = Math.cos(pitch); return { x: target.x + Math.sin(yaw) * h * L, z: target.z + Math.cos(yaw) * h * L }; }
const inside = (x, z, b) => x > b.minX && x < b.maxX && z > b.minZ && z < b.maxZ;
const box = (cx, cz, w, d) => ({ minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2 });
// ¿el segmento del centro p→q cruza la caja (atravesó sin quedar dentro)?
function crossed(p, q, b) {
  const dx = q.x - p.x, dz = q.z - p.z, L = Math.hypot(dx, dz);
  if (L === 0) return false;
  const t = rayBox(p.x, p.z, dx / L, dz / L, b);
  return t <= L && !inside(q.x, q.z, b) && !overlaps(q.x, q.z, b);
}

// Con REAL=1 las comprobaciones de step/cameraArm se ejecutan contra la implementación real (city/move.js).
if (process.env.REAL) {
  const CMr = require('../../city/move.js');
  step = (s, it, dt, b, op) => CMr.step(s, it, dt, b, Object.assign({ safe: { x: s && Number.isFinite(s.x) ? s.x : 0, z: s && Number.isFinite(s.z) ? s.z : 0, yaw: 0 } }, op));
  cameraArm = (t, y, p, l, b) => CMr.cameraArm(t, y, p, l, b);
}
// ---------- 1a. fuzz: dt ∈ [0, 50 ms], cajas aleatorias (incluye muros 6×2), 7 m/s ----------
function randBoxes(r, overlapOk) {
  const out = [];
  const n = r.int(1, 6);
  for (let i = 0; i < n * 4 && out.length < n; i++) {
    const thin = r.bool(0.4);
    const w = thin ? (r.bool() ? 6 : 2) : r.range(0.05, 9), d = thin ? (w === 6 ? 2 : 6) : r.range(0.05, 9);
    const b = box(r.range(-10, 10), r.range(-10, 10), w, d);
    if (!overlapOk && out.some((o) => !(b.maxX < o.minX - 1 || b.minX > o.maxX + 1 || b.maxZ < o.minZ - 1 || b.minZ > o.maxZ + 1))) continue;
    out.push(b);
  }
  return out;
}
function freeStart(r, boxes) {
  for (let i = 0; i < 200; i++) { const x = r.range(-14, 14), z = r.range(-14, 14); if (boxes.every((b) => d2circleBox(x, z, b) >= R * R)) return { x, z }; }
  return null;
}
function fuzzStep(seed, n, dtMax, overlapOk) {
  const r = rng(seed); const bad = { nan: [], pen: [], tunnel: [], speed: [] }; let cases = 0;
  for (let i = 0; i < n; i++) {
    const boxes = randBoxes(r, overlapOk); const p = freeStart(r, boxes); if (!p) continue;
    const vmag = r.range(0, 7), ang = r.range(-Math.PI, Math.PI);
    const s = { x: p.x, z: p.z, yaw: 0, vx: Math.sin(ang) * vmag, vz: Math.cos(ang) * vmag, speed: vmag };
    const intent = { mx: r.range(-1, 1), mz: r.range(-1, 1), run: true, camYaw: r.range(-7, 7) };
    const dt = r.bool(0.1) ? dtMax : r.range(0, dtMax);
    const q = step(s, intent, dt, boxes, { canRun: true }); cases++;
    const c = { s, intent, dt, boxes };
    if (![q.x, q.z, q.yaw, q.vx, q.vz, q.speed].every(fin)) bad.nan.push(c);
    if (boxes.some((b) => d2circleBox(q.x, q.z, b) < (R - 1e-6) ** 2)) bad.pen.push(c);
    if (boxes.some((b) => crossed(s, q, b))) bad.tunnel.push(c);
    if (q.speed > RUN + 1e-9) bad.speed.push(Object.assign(c, { speed: q.speed }));
  }
  return { cases, bad };
}

const F50 = fuzzStep(SEED, N_STEP, 0.05, false);
check('S1', 'ALTO', `step: ${F50.cases} casos dt≤50ms, cajas separadas — sin NaN, sin penetración, sin túnel, speed≤7`, () => {
  const b = F50.bad; const ok = !b.nan.length && !b.pen.length && !b.tunnel.length && !b.speed.length;
  return { ok, detail: `nan=${b.nan.length} pen=${b.pen.length} tunnel=${b.tunnel.length} speed=${b.speed.length}` + (b.pen[0] ? ' ej.pen=' + J(b.pen[0]) : '') };
});

// muro 6×2 a 7 m/s, 50 ms, posición de contacto (peor caso) en ambos ejes
check('S2', 'CRÍTICO', 'step: muro 6×2 (2 m de grueso) a 7 m/s y dt=50 ms no se atraviesa', () => {
  const wall = box(0, 0, 6, 2); let s = { x: 0, z: 1 + R + 1e-9, yaw: 0, vx: 0, vz: -7, speed: 7 };
  for (let i = 0; i < 100; i++) s = step(s, { mx: 0, mz: -1, run: true, camYaw: 0 }, 0.05, [wall], { canRun: true });
  return { ok: s.z >= 1 + R - 1e-6, detail: 'z final=' + s.z };
});

// dt hostil: pestaña suspendida / tirón de rAF. El contrato no acota dt.
const dtTunnel = [];
for (const dt of [0.1, 0.12, 0.2, 0.3, 0.5, 1, 2, 5]) {
  for (const [name, b] of [['muro 6×2', box(0, 0, 6, 2)], ['borde fino 0.1', box(0, 0, 6, 0.1)], ['caja 0 grosor', box(0, 0, 6, 0)]]) {
    const s = { x: 0, z: (b.maxZ - b.minZ) / 2 + R + 0.01, yaw: 0, vx: 0, vz: -7, speed: 7 };
    const q = step(s, { mx: 0, mz: -1, run: true, camYaw: 0 }, dt, [b], { canRun: true });
    if (q.z < b.minZ) dtTunnel.push(`${name} dt=${dt}s z ${s.z.toFixed(2)}→${q.z.toFixed(2)}`);
  }
}
check('S3', 'CRÍTICO', 'step: dt grande (0.1–5 s, rAF tras suspender pestaña) no atraviesa muros', () => ({ ok: dtTunnel.length === 0, detail: dtTunnel.slice(0, 6).join(' | ') + (dtTunnel.length > 6 ? ` …(+${dtTunnel.length - 6})` : '') }));

check('S4', 'ALTO', 'step: "aceleración en 0.15 s" no sobrepasa la velocidad objetivo con dt grande', () => {
  const bad = [];
  for (const dt of [0.1, 0.16, 0.25, 0.31, 0.5]) {
    const q = step({ x: 0, z: 0, yaw: 0, vx: 0, vz: 0, speed: 0 }, { mx: 0, mz: -1, run: true, camYaw: 0 }, dt, [], { canRun: true });
    if (q.speed > RUN + 1e-9) bad.push(`dt=${dt} speed=${q.speed.toFixed(2)}`);
  }
  return { ok: !bad.length, detail: bad.join(' | ') };
});

// costura: dos cajas pegadas que forman una pared recta; deslizar en diagonal debe avanzar.
function seamTrial(r) {
  const zTop = r.range(-170, 40), x0 = r.range(-60, 60), w1 = r.range(5, 9), w2 = r.range(5, 9);
  const A = { minX: x0, maxX: x0 + w1, minZ: zTop - 6, maxZ: zTop }, B = { minX: x0 + w1, maxX: x0 + w1 + w2, minZ: zTop - 6, maxZ: zTop };
  let s = { x: x0 + w1 - 1.5, z: zTop + R + 0.05, yaw: 0, vx: 0, vz: 0, speed: 0 };
  // camYaw 0: mx=+1 → +x, mz=+1 → +z… queremos +x y -z (contra la pared): mx=1, mz=-1
  for (let i = 0; i < 120; i++) s = step(s, { mx: 1, mz: -1, camYaw: 0 }, 1 / 60, [A, B], {});
  return { stuck: s.x < x0 + w1 + 0.5, A, B, s };
}
check('S5', 'ALTO', 'step: deslizar contra una pared hecha de 2 cajas contiguas (costura) no se atasca (500 costuras)', () => {
  const r = rng(SEED + 5); let stuck = 0, ex = null;
  for (let i = 0; i < 500; i++) { const t = seamTrial(r); if (t.stuck) { stuck++; ex = ex || t; } }
  return { ok: stuck === 0, detail: `${stuck}/500 atascadas` + (ex ? ` ej: A=${J(ex.A)} B=${J(ex.B)} final x=${ex.s.x} z=${ex.s.z}` : '') };
});

// hueco estrecho entre dos cajas (< 0.8 m) o cajas solapadas: una pasada por caja deja al círculo dentro de otra.
const FOV = fuzzStep(SEED + 7, N_STEP, 0.05, true);
check('S6', 'ALTO', `step: ${FOV.cases} casos con cajas solapadas/huecos <0.8 m — sin penetración`, () => {
  const b = FOV.bad; return { ok: !b.pen.length && !b.nan.length, detail: `pen=${b.pen.length} nan=${b.nan.length}` + (b.pen[0] ? ' ej=' + J({ s: b.pen[0].s, dt: b.pen[0].dt, boxes: b.pen[0].boxes }) : '') };
});
check('S7', 'ALTO', 'step: esquina cóncava de 2 cajas con hueco de 0.6 m — el círculo no queda dentro', () => {
  const A = box(-5.3, 0, 10, 10), B = box(5.3, 0, 10, 10); // hueco de 0.6 m en x∈[-0.3,0.3]
  let s = { x: 0, z: 5 + R + 0.1, yaw: 0, vx: 0, vz: 0, speed: 0 };
  for (let i = 0; i < 60; i++) s = step(s, { mx: 0, mz: -1, camYaw: 0 }, 1 / 60, [A, B], {});
  const pen = [A, B].some((b) => d2circleBox(s.x, s.z, b) < (R - 1e-6) ** 2);
  return { ok: !pen, detail: `final x=${s.x.toFixed(3)} z=${s.z.toFixed(3)} d(A)=${Math.sqrt(d2circleBox(s.x, s.z, A)).toFixed(3)} d(B)=${Math.sqrt(d2circleBox(s.x, s.z, B)).toFixed(3)}` };
});
check('S8', 'ALTO', 'step: NaN en dt/estado/intent no propaga NaN (2000 casos hostiles)', () => {
  const r = rng(SEED + 8); const hostile = [NaN, Infinity, -Infinity, 1e308, -1e308, -0, undefined, null, '5', 1e-320];
  let bad = 0, ex = null;
  for (let i = 0; i < 2000; i++) {
    const s = { x: r.range(-5, 5), z: r.range(-5, 5), yaw: 0, vx: 0, vz: 0, speed: 0 };
    if (r.bool(0.3)) s[r.pick(['x', 'z', 'vx', 'vz', 'yaw'])] = r.pick(hostile);
    const it = { mx: r.bool(0.3) ? r.pick(hostile) : r.range(-1, 1), mz: r.bool(0.3) ? r.pick(hostile) : r.range(-1, 1), camYaw: r.bool(0.3) ? r.pick(hostile) : 0, run: true };
    const dt = r.bool(0.3) ? r.pick(hostile) : r.range(0, 0.05);
    const q = step(s, it, dt, [box(20, 20, 2, 2)], { canRun: true });
    if (![q.x, q.z, q.yaw, q.vx, q.vz].every((v) => typeof v === 'number' && fin(v))) { bad++; ex = ex || { s, it, dt, q }; }
  }
  return { ok: !bad, detail: `${bad} salidas no finitas (devuelve el state previo ya corrupto: el contrato solo valida la salida)` + (ex ? ' ej=' + J(ex) : '') };
});

// ---------- 1b. cameraArm ----------
check('C1', 'ALTO', 'cameraArm: resultado ≤ len siempre (len < 1.2 incluido)', () => {
  const v = cameraArm({ x: 0, z: 0 }, 0, 0.3, 0.8, []);
  return { ok: v <= 0.8, detail: `len=0.8 → ${v} (min 1.2 y ≤ len se contradicen)` };
});
check('C2', 'ALTO', 'cameraArm: 2000 casos — finito, ≤len, y la cámara nunca queda dentro de una caja', () => {
  const r = rng(SEED + 9); let nan = 0, over = 0, inBox = 0, ex = null;
  for (let i = 0; i < 2000; i++) {
    const boxes = randBoxes(r, true); const p = freeStart(r, boxes) || { x: 30, z: 30 };
    const yaw = r.bool(0.05) ? r.pick([NaN, Infinity]) : r.range(-7, 7), pitch = r.range(-0.2, 1.3), len = r.range(0.5, 8);
    const L = cameraArm(p, yaw, pitch, len, boxes);
    if (!fin(L)) { nan++; continue; }
    if (L > len + 1e-9) over++;
    const c = camPoint(p, yaw, pitch, L);
    if (boxes.some((b) => inside(c.x, c.z, b))) { inBox++; ex = ex || { p, yaw, pitch, len, L, boxes }; }
  }
  return { ok: !nan && !over && !inBox, detail: `nan=${nan} >len=${over} cámara-dentro-de-caja=${inBox}` + (ex ? ` ej: target=${J(ex.p)} yaw=${ex.yaw.toFixed(2)} L=${ex.L.toFixed(2)}` : '') };
});
check('C3', 'MEDIO', 'cameraArm: "más altura" es implementable con las AABB de boxesFor', () => {
  let sample = { minX: 0, maxX: 1, minZ: 0, maxZ: 1 }; // forma literal de boxesFor(D) del plan original
  if (process.env.REAL) {
    const mini = { bounds: { minX: -70, maxX: 70, minZ: -190, maxZ: 40 }, plaza: { roads: [], hq: { x: 0, z: -14, w: 14, d: 10, h: 9 } },
      districts: { M02: { seed: 1, blocks: [[0, -66]], tower: { x: 0, z: -162, w: 8, d: 8, h: 20 }, bridge: { x: 0, z: -178, w: 6, d: 10 } } } };
    sample = require('../../city/move.js').boxesFor(mini, false)[0];
  }
  return { ok: 'h' in sample || 'maxY' in sample, detail: 'boxesFor devuelve { minX, maxX, minZ, maxZ } sin altura: el rayo no puede pasar sobre cajas bajas' };
});

// =====================================================================================
// 2. nextObjective (Tarea 4, orden §3.5)
// =====================================================================================
const TOP = (i) => 'T' + String(i).padStart(2, '0');
const D = {
  districts: { M02: {
    need: 8,
    mentors: Array.from({ length: 23 }, (_, i) => ({ id: 'm' + String(i + 1).padStart(2, '0'), topic: TOP(i + 1), name: 'Mentor' + (i + 1) })),
    creatures: [['bit', [1, 2, 3]], ['silicio', [4, 5, 10]], ['kernel', [6, 7, 8, 9]], ['eco', [12, 13, 14, 15, 16]], ['huerfano', [11, 17, 18, 19, 20]], ['alucina', [21, 22, 23]]]
      .map(([id, t]) => ({ id, name: id, topics: t.map(TOP) })),
    repairs: [1, 2, 5, 6, 9, 10, 13, 14, 15, 16].map((t, i) => ({ id: 'r' + String(i + 1).padStart(2, '0'), topic: TOP(t), label: 'reto' + i })),
    apprentices: [1, 3, 4, 6, 8, 10, 12, 14, 17, 19, 21, 23].map((t, i) => ({ id: 'a' + String(i + 1).padStart(2, '0'), topic: TOP(t), name: 'Apr' + i, mode: 'explain' })),
    tower: { id: 'torre' }, bridge: { id: 'puente' },
  } },
  plaza: { director: { id: 'iris', name: 'Iris' } },
  bounds: { minX: -70, maxX: 70, minZ: -190, maxZ: 40 }, spawn: { x: 0, z: 8, yaw: 0 },
};
const M = D.districts.M02;
const own = (o, k) => o != null && Object.prototype.hasOwnProperty.call(o, k);

// variante "A": grupo incompleto = algún mentor sin lección, algún tema con 0 estrellas o criatura nunca vencida.
// variante "B": grupo incompleto = solo lecciones/estrellas (lectura literal de "grupo completo con estrellas" del test).
function nextObjective(C, Dd, ctx, variant) {
  const m = Dd.districts.M02;
  if (!C.prologue) return { kind: 'director', id: Dd.plaza.director.id };
  if (C.restored && C.restored.M02 === true) return { kind: 'bridge', id: m.bridge.id };
  if (ctx.bossUnlocked && !ctx.bossPassed) return { kind: 'tower', id: m.tower.id };
  for (const cr of m.creatures) {
    const ms = cr.topics.map((t) => m.mentors.find((x) => x.topic === t));
    const incomplete = ms.some((x) => !ctx.learned(x.topic) || ctx.stars(x.topic) < 1) || (variant === 'A' && !ctx.beatenEver(cr.id));
    if (!incomplete) continue;
    const a = ms.find((x) => !ctx.learned(x.topic)); if (a) return { kind: 'mentor', id: a.id };
    const b = ms.find((x) => ctx.stars(x.topic) < 1); if (b) return { kind: 'practice', id: b.id };
    if (!ctx.beatenEver(cr.id)) return { kind: 'creature', id: cr.id };
    break;
  }
  const rp = m.repairs.find((x) => C.repairs[x.id] !== true); if (rp) return { kind: 'repair', id: rp.id };
  const ap = m.apprentices.find((x) => C.taught[x.id] !== true && ctx.stars(x.topic) >= 1); if (ap) return { kind: 'apprentice', id: ap.id };
  const cr = m.creatures.find((x) => !ctx.beatenToday(x.id)); if (cr) return { kind: 'creature', id: cr.id };
  return { kind: 'none', id: null };
}
const TODAY = '2026-11-11';
function world(r) {
  const st = { learned: {}, stars: {}, beaten: {}, repairs: {}, taught: {}, prologue: r.bool(0.9), bossPassed: false };
  const p = r.range(0, 1); // nivel de progreso
  for (let i = 1; i <= 23; i++) { const t = TOP(i); st.learned[t] = r.bool(p + 0.1); st.stars[t] = st.learned[t] && r.bool(p) ? r.int(1, 3) : 0; }
  for (const c of M.creatures) if (r.bool(p * 0.8)) st.beaten[c.id] = r.bool() ? TODAY : '2026-11-0' + r.int(1, 9);
  for (const x of M.repairs) if (r.bool(p)) st.repairs[x.id] = true;
  for (const x of M.apprentices) if (st.stars[x.topic] >= 1 && r.bool(p)) st.taught[x.id] = true;
  return st;
}
const bossUnlocked = (st) => Object.keys(st.stars).every((t) => st.stars[t] >= 1); // engine.html:732
// Con REAL=1 las comprobaciones de objetivo, normalización y restauración usan city/story.js y los datos reales de city/districts.mjs.
if (process.env.REAL) {
  const fsr = require('fs'), vmr = require('vm'), pr = require('path'), CS = require('../../city/story.js');
  const realD = vmr.runInNewContext(fsr.readFileSync(pr.join(__dirname, '..', '..', 'city', 'districts.mjs'), 'utf8').replace('export const city =', 'var city =') + ';city');
  Object.keys(D).forEach((k) => { delete D[k]; }); Object.assign(D, realD);
  Object.keys(M).forEach((k) => { delete M[k]; }); Object.assign(M, realD.districts.M02); D.districts = { M02: M };
  nextObjective = (C, Dd, ctx) => CS.nextObjective(C, Dd, ctx);
  applyRestoreRef = (C, Dd, bp) => CS.applyRestore(C, Dd, bp);
  restorationRef = (C, Dd, bp) => CS.restoration(C, Dd, bp);
  normalizeCity = (raw, Dd, bp) => CS.normalizeCity(raw, Dd, bp, TODAY);
}
function view(st) {
  const C = { prologue: st.prologue, beaten: st.beaten, repairs: st.repairs, taught: st.taught, restored: {}, powers: {} };
  applyRestoreRef(C, D, st.bossPassed);
  const ctx = { learned: (t) => !!st.learned[t], stars: (t) => st.stars[t] || 0, beatenEver: (id) => own(st.beaten, id), beatenToday: (id) => st.beaten[id] === TODAY, bossUnlocked: bossUnlocked(st), bossPassed: st.bossPassed };
  return { C, ctx };
}
// cumplir el objetivo: aplica el efecto de juego que le corresponde
function fulfil(st, o) {
  const m = o.id && M.mentors.find((x) => x.id === o.id);
  switch (o.kind) {
    case 'director': st.prologue = true; return true;
    case 'mentor': st.learned[m.topic] = true; return true;
    case 'practice': st.stars[m.topic] = 1; return true;
    case 'creature': st.beaten[o.id] = TODAY; return true;
    case 'repair': st.repairs[o.id] = true; return true;
    case 'apprentice': st.taught[o.id] = true; return true;
    case 'tower': st.bossPassed = true; return true;
    default: return false; // bridge ("Próximamente") y none no cambian nada
  }
}
function propsObjective(variant) {
  const r = rng(SEED + 20 + variant.charCodeAt(0)); const bad = { learnedMentor: [], tower: [], apprentice: [], creatureBeaten: [], loop: [], skippedCreature: [] };
  for (let i = 0; i < N_OBJ; i++) {
    const st = world(r); if (r.bool(0.3)) st.bossPassed = bossUnlocked(st) && r.bool();
    const { C, ctx } = view(st); const o = nextObjective(C, D, ctx, variant);
    const m = o.id && M.mentors.find((x) => x.id === o.id);
    if (o.kind === 'mentor' && ctx.learned(m.topic)) bad.learnedMentor.push(st);
    if (o.kind === 'tower' && (!ctx.bossUnlocked || ctx.bossPassed)) bad.tower.push(st);
    if (o.kind === 'apprentice') { const a = M.apprentices.find((x) => x.id === o.id); if (C.taught[a.id] === true || ctx.stars(a.topic) < 1) bad.apprentice.push(st); }
    if (o.kind === 'creature' && ctx.beatenToday(o.id)) bad.creatureBeaten.push(st);
    // bucle: tras cumplirlo, el objetivo debe cambiar
    if (fulfil(st, o)) { const v2 = view(st); const o2 = nextObjective(v2.C, D, v2.ctx, variant); if (o2.kind === o.kind && o2.id === o.id) bad.loop.push({ o }); }
  }
  // camino completo desde cero: ¿cada criatura se pide alguna vez como "nunca vencida" (paso 4.3)? ¿se llega a restaurar?
  const st = { learned: {}, stars: {}, beaten: {}, repairs: {}, taught: {}, prologue: false, bossPassed: false };
  for (let i = 1; i <= 23; i++) { st.learned[TOP(i)] = false; st.stars[TOP(i)] = 0; }
  const seen = []; let o, n = 0;
  do { const v = view(st); o = nextObjective(v.C, D, v.ctx, variant); seen.push(o.kind + ':' + o.id); n++; } while (fulfil(st, o) && n < 500);
  const step43 = M.creatures.filter((c) => { const idx = seen.indexOf('creature:' + c.id); return idx >= 0 && seen.slice(0, idx).every((k) => !k.startsWith('repair')); });
  return { bad, path: seen, end: o, step43 };
}
for (const variant of ['A', 'B']) {
  const P = propsObjective(variant);
  check('O1' + variant, 'ALTO', `nextObjective[${variant}] ${N_OBJ} estados: nunca mentor aprendido / torre bloqueada / aprendiz no visible / criatura ya vencida hoy`, () => {
    const b = P.bad; const n = b.learnedMentor.length + b.tower.length + b.apprentice.length + b.creatureBeaten.length;
    return { ok: !n, detail: `mentor=${b.learnedMentor.length} torre=${b.tower.length} aprendiz=${b.apprentice.length} criatura=${b.creatureBeaten.length}` };
  });
  check('O2' + variant, 'ALTO', `nextObjective[${variant}]: cumplir el objetivo siempre lo cambia (sin bucles)`, () => ({ ok: !P.bad.loop.length, detail: `${P.bad.loop.length} bucles` + (P.bad.loop[0] ? ' ej=' + J(P.bad.loop[0].o) : '') }));
  check('O3' + variant, 'ALTO', `nextObjective[${variant}]: partida completa llega a 'bridge' y el paso 4.3 pide las 6 criaturas`, () => ({
    ok: P.end.kind === 'bridge' && P.step43.length === 6,
    detail: `fin=${P.end.kind} en ${P.path.length} pasos; criaturas pedidas en 4.3=${P.step43.length}/6 [${P.step43.map((c) => c.id)}]`,
  }));
}
check('O4', 'MEDIO', "nextObjective: el final ('bridge' tras restaurar) es un objetivo que no se puede cumplir nunca", () => {
  const st = { learned: {}, stars: {}, beaten: {}, repairs: {}, taught: {}, prologue: true, bossPassed: true };
  for (let i = 1; i <= 23; i++) { st.learned[TOP(i)] = true; st.stars[TOP(i)] = 1; }
  M.apprentices.slice(0, 8).forEach((a) => { st.taught[a.id] = true; });
  const v = view(st); if (process.env.REAL) v.C.bridgeSeen = true; const o = nextObjective(v.C, D, v.ctx, 'A');
  if (process.env.REAL) return { ok: o.kind === 'done', detail: 'objetivo=' + o.kind + ' (esperado done tras ver el puente)' };
  return { ok: o.kind !== 'bridge', detail: `objetivo=${o.kind}: "Cruza el puente" abre "Próximamente" y la flecha queda fija para siempre (sin estado de cierre)` };
});

// =====================================================================================
// 3. normalizeCity / restoration / applyRestore (Tarea 4, §6.4)
// =====================================================================================
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TAU = Math.PI * 2;
function taughtCount(C, Dd) { return Dd.districts.M02.apprentices.filter((a) => own(C.taught, a.id) && C.taught[a.id] === true).length; }
function restorationRef(C, Dd, bossPassed) { const t = taughtCount(C, Dd); return Math.round(100 * (0.5 * Math.min(t, 8) / 8 + 0.5 * bossPassed)); }
function applyRestoreRef(C, Dd, bossPassed) {
  const ok = bossPassed && taughtCount(C, Dd) >= Dd.districts.M02.need;
  if (ok && !(C.restored && C.restored.M02 === true)) { C.restored = C.restored || {}; C.powers = C.powers || {}; C.restored.M02 = true; C.powers.planos = true; return { changed: true }; }
  return { changed: false };
}
function normalizeCity(raw, Dd, bossPassed, coord) {
  const m = Dd.districts.M02; const src = raw && typeof raw === 'object' ? raw : {};
  const pick = (obj, ids, okv) => { const o = {}; if (obj && typeof obj === 'object') for (const id of ids) if (own(obj, id) && okv(obj[id])) o[id] = obj[id]; return o; };
  const C = {
    prologue: src.prologue === true, run: src.run === true,
    beaten: pick(src.beaten, m.creatures.map((x) => x.id), (v) => typeof v === 'string' && DATE.test(v)),
    repairs: pick(src.repairs, m.repairs.map((x) => x.id), (v) => v === true),
    taught: pick(src.taught, m.apprentices.map((x) => x.id), (v) => v === true),
    restored: {}, powers: {},
  };
  const at = src.at && typeof src.at === 'object' ? src.at : {};
  const b = Dd.bounds, sp = Dd.spawn;
  let yaw = typeof at.yaw === 'number' ? ((at.yaw % TAU) + TAU) % TAU : sp.yaw; // "yaw módulo 2π"
  C.at = { x: coord(at.x, b.minX, b.maxX, sp.x), z: coord(at.z, b.minZ, b.maxZ, sp.z), yaw };
  if (bossPassed && taughtCount(C, Dd) >= m.need) { C.restored.M02 = true; C.powers.planos = true; }
  return C;
}
const protoKeys = () => Object.getOwnPropertyNames(Object.prototype).sort().join(',');
const PROTO0 = protoKeys();
const junkIds = ['__proto__', 'constructor', 'prototype', 'toString', 'hasOwnProperty', 'valueOf', 'a1', 'A01', 'a01 ', ' a01', 'a​01', 'a01\u0000', '../a01', '<script>', 'M02', 'a13', 'a00', '', '0', 'length'];
function hostileRaw(r) {
  const vals = [true, 'true', 1, 0, null, false, {}, [], 'x', NaN, 1e308, '2026-11-11', '2026-13-45', '9999-99-99', '0000-00-00', '2026-11-11T00:00', '  2026-11-11', '2026-11-11\n', new Date(NaN).toString()];
  const bag = (ids) => { let s = '{'; const parts = []; const n = r.int(0, 15); for (let i = 0; i < n; i++) { const k = r.bool(0.5) ? r.pick(ids) : r.pick(junkIds); parts.push(JSON.stringify(k) + ':' + (r.bool(0.15) ? '{"a01":true,"M02":true,"planos":true}' : JSON.stringify(r.pick(vals)))); } return s + parts.join(',') + '}'; };
  const num = () => r.pick(['1e308', '-1e308', '1e309', '-1e309', 'null', '"5"', '"1e3"', '""', '[]', '[3]', 'true', '0', '-0', '5', '70.0001', '1e-320', String(r.range(-300, 300))]);
  const fields = [];
  if (r.bool(0.9)) fields.push('"taught":' + (r.bool(0.1) ? r.pick(['[]', 'null', '"a01"', '[true,true]']) : bag(M.apprentices.map((a) => a.id))));
  if (r.bool(0.7)) fields.push('"beaten":' + bag(M.creatures.map((c) => c.id)));
  if (r.bool(0.7)) fields.push('"repairs":' + bag(M.repairs.map((c) => c.id)));
  if (r.bool(0.5)) fields.push('"restored":{"M02":true}', '"powers":{"planos":true,"__proto__":{"polluted":1}}');
  if (r.bool(0.8)) fields.push(`"at":{"x":${num()},"z":${num()},"yaw":${num()}}`);
  if (r.bool(0.3)) fields.push('"__proto__":{"restored":{"M02":true},"taught":{"a01":true}}');
  if (r.bool(0.3)) fields.push('"prologue":' + r.pick(['true', '"true"', '1', '{}']));
  const top = '{' + fields.join(',') + '}';
  return r.bool(0.05) ? r.pick(['null', '"x"', '5', '[]', 'true']) : top;
}
function normInvariants(C, raw, bossPassed) {
  const errs = [];
  const valid = { taught: M.apprentices.map((a) => a.id), repairs: M.repairs.map((a) => a.id), beaten: M.creatures.map((a) => a.id) };
  for (const k of ['taught', 'repairs', 'beaten', 'restored', 'powers', 'at']) if (Object.getPrototypeOf(C[k]) !== Object.prototype) errs.push(k + ' prototipo alterado');
  for (const k of ['taught', 'repairs', 'beaten']) for (const id of Object.keys(C[k])) if (!valid[k].includes(id)) errs.push(k + ' id basura ' + J(id));
  for (const id of Object.keys(C.beaten)) { const d = new Date(C.beaten[id] + 'T00:00:00Z'); if (isNaN(d) || d.toISOString().slice(0, 10) !== C.beaten[id]) errs.push('beaten fecha inválida ' + C.beaten[id]); else if (C.beaten[id] > TODAY) errs.push('beaten fecha futura ' + C.beaten[id]); }
  const nValid = valid.taught.filter((id) => C.taught[id] === true).length;
  if (C.restored.M02 && !(bossPassed && nValid >= 8)) errs.push('restaurado sin jefe/8 ids');
  if (C.powers.planos && !C.restored.M02) errs.push('planos sin restaurar');
  for (const k of ['x', 'z', 'yaw']) if (typeof C.at[k] !== 'number' || !fin(C.at[k])) errs.push('at.' + k + ' = ' + J(C.at[k]) + ' (' + typeof C.at[k] + ')');
  if (typeof C.at.x === 'number' && (C.at.x > D.bounds.maxX - R || C.at.x < D.bounds.minX + R)) errs.push('at.x en el borde (círculo dentro del muro de bounds): ' + C.at.x);
  if (typeof C.at.z === 'number' && (C.at.z > D.bounds.maxZ - R || C.at.z < D.bounds.minZ + R)) errs.push('at.z en el borde: ' + C.at.z);
  const rs = restorationRef(C, D, bossPassed); if (!(Number.isInteger(rs) && rs >= 0 && rs <= 100)) errs.push('restoration=' + rs);
  if (protoKeys() !== PROTO0 || ({}).polluted !== undefined || ({}).a01 !== undefined) errs.push('Object.prototype contaminado');
  return errs;
}
function fuzzNorm(coord, label) {
  const r = rng(SEED + 40); const tally = {}; const ex = {};
  for (let i = 0; i < N_NORM; i++) {
    const raw = hostileRaw(r); const bp = r.bool(); let C;
    try { C = normalizeCity(JSON.parse(raw), D, bp, coord); } catch (e) { (tally.throw = (tally.throw || 0) + 1); ex.throw = ex.throw || raw; continue; }
    for (const e of normInvariants(C, raw, bp)) { const k = e.split(' ').slice(0, 2).join(' ').replace(/[=:(].*$/, '').trim(); tally[k] = (tally[k] || 0) + 1; if (!ex[k] || raw.length < ex[k].length) ex[k] = raw + '  →  ' + e; }
  }
  return { tally, ex, label };
}
for (const [coord, label] of [[coordSpec, 'coord con isFinite global (§6.4)'], [coordSafe, 'coord con Number.isFinite']]) {
  const Fz = fuzzNorm(coord, label);
  const crit = Object.keys(Fz.tally).filter((k) => /prototipo|basura|restaurado|planos|contaminado|throw|^at\.[xz]$|restoration/.test(k) && !/borde/.test(k));
  check('N1/' + label, 'CRÍTICO', `normalizeCity [${label}] ${N_NORM} estados hostiles: prototipo, ids, restaurado, at finito/número`, () => ({ ok: !crit.length, detail: crit.map((k) => `${k}×${Fz.tally[k]} min: ${Fz.ex[k]}`).join(' || ') }));
  const med = Object.keys(Fz.tally).filter((k) => !crit.includes(k));
  check('N2/' + label, 'ALTO', `normalizeCity [${label}]: yaw finito, fechas reales, at fuera del borde`, () => ({ ok: !med.length, detail: med.map((k) => `${k}×${Fz.tally[k]} min: ${Fz.ex[k]}`).join(' || ') }));
}
check('N3', 'ALTO', 'coord: contrato (1e308 → max) vs test del plan ("at {x:1e308,z:NaN} → el spawn")', () => {
  const C = normalizeCity({ at: { x: 1e308, z: NaN } }, D, false, coordSafe);
  return { ok: C.at.x === D.spawn.x && C.at.z === D.spawn.z, detail: `coord da at=${J(C.at)}, el test del plan espera spawn ${J(D.spawn)}; además (70,·) solapa el borde` };
});
check('N4', 'CRÍTICO', 'coord con isFinite global: at.x = "5" (string) llega a step → concatena', () => {
  const C = normalizeCity(JSON.parse('{"at":{"x":"5","z":8}}'), D, false, coordSpec);
  const q = step({ x: C.at.x, z: C.at.z, yaw: 0, vx: 1, vz: 0, speed: 1 }, { mx: 1, mz: 0, camYaw: 0 }, 0.016, [], {});
  return { ok: typeof C.at.x === 'number', detail: `at.x=${J(C.at.x)} (${typeof C.at.x}); x+vx*dt=${J(C.at.x + 0.016)} no es finito → step devuelve siempre el mismo state: héroe congelado` };
});
check('N5', 'MEDIO', 'applyRestore: estado con restored.M02 ya puesto pero powers vacío queda sin planos (y nunca revoca)', () => {
  const C = { taught: {}, restored: { M02: true }, powers: {} };
  M.apprentices.slice(0, 8).forEach((a) => { C.taught[a.id] = true; });
  const r1 = applyRestoreRef(C, D, true);
  const C2 = { taught: {}, restored: { M02: true }, powers: { planos: true } }; const r2 = applyRestoreRef(C2, D, false);
  return { ok: C.powers.planos === true && !C2.restored.M02, detail: `caso1 changed=${r1.changed} powers=${J(C.powers)}; caso2 (sin jefe) restored=${J(C2.restored)} changed=${r2.changed}` };
});
check('N6', 'MEDIO', 'restoration con bossPassed no booleano (S.boss.M02.passed = "true"/undefined) es entero 0..100', () => {
  const out = [undefined, 'true', null, {}].map((bp) => restorationRef({ taught: {} }, D, bp));
  return { ok: out.every((v) => Number.isInteger(v) && v >= 0 && v <= 100), detail: 'resultados=' + J(out) + ' (el contrato no exige !!bossPassed dentro)' };
});

// =====================================================================================
let fails = 0;
for (const r of results) { const tag = r.ok ? 'PASA ' : 'FALLA'; if (!r.ok) fails++; console.log(`${tag} [${r.id}] ${r.ok ? '' : '(' + r.sev + ') '}${r.name}${r.ok ? '' : '\n      → ' + r.detail}`); }
console.log(`\nSEED=${SEED}  ${results.length} comprobaciones, ${fails} fallan`);
process.exit(fails ? 1 : 0);
