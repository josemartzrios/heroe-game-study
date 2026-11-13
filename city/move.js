/* Matemática pura de Ciudad Núcleo: movimiento con colisión círculo-AABB, escenas (plaza y distritos), portales, dirección del héroe, cercanos y distribución de edificios.
   Sin DOM. Vista desde arriba: el movimiento es relativo a la pantalla (mz = -1 va a -z, arriba) y yaw 0 mira hacia -z. */
var CityMove = (function () {
  var WALK = 10, RUN = 14, ACC = 0.15, DT_MAX = 0.05, SKIN = 1e-4, EPS = 1e-6;

  function isNum(v) { return typeof v === 'number' && isFinite(v); }
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
  /* v acotado a [min, max] si es un número finito; si no, fallback (nunca coerciona cadenas ni arreglos) */
  function coord(v, min, max, fallback) { return isNum(v) ? clamp(v, min, max) : fallback; }

  function mulberry32(a) {
    return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; var t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  /* 2 o 3 edificios por manzana (20×20), con w y d entre 5 y 9, h entre 4 y 14, dentro de la manzana. Determinista. */
  function layoutBuildings(dist) {
    var rnd = mulberry32(dist.seed), out = [];
    dist.blocks.forEach(function (c, bi) {
      var n = rnd() < 0.5 ? 2 : 3, lo = -9.5, hi = 9.5;
      var slots = n === 2 ? [[lo, -0.25, lo, hi], [0.25, hi, lo, hi]] : [[lo, -0.25, lo, hi], [0.25, hi, lo, -0.25], [0.25, hi, 0.25, hi]];
      slots.forEach(function (s) {
        var sw = s[1] - s[0], sd = s[3] - s[2];
        var w = Math.min(sw, 5 + rnd() * 4), d = Math.min(sd, 5 + rnd() * 4);
        out.push({ x: c[0] + s[0] + w / 2 + rnd() * (sw - w), z: c[1] + s[2] + d / 2 + rnd() * (sd - d), w: w, d: d, h: 4 + rnd() * 10, block: bi });
        rnd();   // se conserva la consumición de azar del layout determinista
      });
    });
    return out;
  }

  function aabb(o) { return { minX: o.x - o.w / 2, maxX: o.x + o.w / 2, minZ: o.z - o.d / 2, maxZ: o.z + o.d / 2 }; }
  /* punto de interacción de una caja sólida (torre, puente): su puerta, 1.2 m al frente (lado sur) */
  function door(o) { return { x: o.x, z: o.z + o.d / 2 + 1.2 }; }

  var own = Object.prototype.hasOwnProperty;
  /* Escena por id: 'plaza', o un distrito propio de D.districts; null para cualquier otro texto (nunca resuelve __proto__, constructor…). */
  function scene(D, id) {
    if (id === 'plaza') return D.plaza;
    return (typeof id === 'string' && own.call(D.districts, id)) ? D.districts[id] : null;
  }
  /* Cajas de colisión de una escena: en la plaza, la sede y los muros de los portales sin distrito (los portales abiertos no son sólidos);
     en un distrito, sus edificios y su torre; y siempre el borde del mundo. Escena inválida → []. */
  function boxesFor(D, sceneId) {
    var sc = scene(D, sceneId), B, boxes = [], big = 10;
    if (!sc) return boxes;
    B = sc.bounds;
    if (sceneId === 'plaza') {
      if (sc.hq) boxes.push(aabb(sc.hq));
      sc.portals.forEach(function (p) { if (!own.call(D.districts, p.dist)) boxes.push(aabb(p)); });
    } else {
      layoutBuildings(sc).forEach(function (b) { boxes.push(aabb(b)); });
      boxes.push(aabb(sc.tower));
    }
    boxes.push({ minX: B.minX - big, maxX: B.minX, minZ: B.minZ - big, maxZ: B.maxZ + big });  // borde del mundo
    boxes.push({ minX: B.maxX, maxX: B.maxX + big, minZ: B.minZ - big, maxZ: B.maxZ + big });
    boxes.push({ minX: B.minX - big, maxX: B.maxX + big, minZ: B.minZ - big, maxZ: B.minZ });
    boxes.push({ minX: B.minX - big, maxX: B.maxX + big, minZ: B.maxZ, maxZ: B.maxZ + big });
    return boxes;
  }
  /* Portal que contiene el punto (el centro del héroe dentro de su caja): en la plaza el id del distrito (solo si existe);
     en un distrito, 'plaza' si está en su salida; null en cualquier otro caso. */
  function portalAt(D, sceneId, x, z) {
    var sc = scene(D, sceneId), i, b, p;
    if (!sc || !isNum(x) || !isNum(z)) return null;
    function inside(o) { b = aabb(o); return x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ; }
    if (sceneId === 'plaza') {
      for (i = 0; i < sc.portals.length; i++) { p = sc.portals[i]; if (own.call(D.districts, p.dist) && inside(p)) return p.dist; }
      return null;
    }
    return inside(sc.exit) ? 'plaza' : null;
  }

  function overlaps(x, z, r, b) {
    var cx = clamp(x, b.minX, b.maxX), cz = clamp(z, b.minZ, b.maxZ), dx = x - cx, dz = z - cz, rr = r - EPS;
    return dx * dx + dz * dz < rr * rr;
  }
  /* Empuja el círculo en el eje del movimiento hasta quedar a r + SKIN de cada caja que se le monta. Ignora las cajas con las que ya solapaba. */
  function resolveAxis(axis, x, z, v, boxes, r, skip) {
    var rr = r + SKIN, pass, i;
    for (pass = 0; pass < 4; pass++) {
      var moved = false;
      for (i = 0; i < boxes.length; i++) {
        var b = boxes[i];
        if (skip[i] || !overlaps(x, z, r, b)) continue;
        if (axis === 'x') {
          var dz = z < b.minZ ? b.minZ - z : (z > b.maxZ ? z - b.maxZ : 0), px = Math.sqrt(Math.max(0, rr * rr - dz * dz));
          x = (v > 0 || (v === 0 && x < (b.minX + b.maxX) / 2)) ? b.minX - px : b.maxX + px;
        } else {
          var dx = x < b.minX ? b.minX - x : (x > b.maxX ? x - b.maxX : 0), pz = Math.sqrt(Math.max(0, rr * rr - dx * dx));
          z = (v > 0 || (v === 0 && z < (b.minZ + b.maxZ) / 2)) ? b.minZ - pz : b.maxZ + pz;
        }
        moved = true;
      }
      if (!moved) break;
    }
    return axis === 'x' ? x : z;
  }

  /* Un paso del héroe. state = { x, z, yaw, vx, vz, speed }; intent = { mx, mz, run } (mx, mz en [-1, 1]).
     opts = { canRun, radius, safe: { x, z, yaw } }. Con estado o dt inválidos devuelve safe, quieto. */
  function step(s, intent, dt, boxes, opts) {
    opts = opts || {};
    var r = isNum(opts.radius) ? opts.radius : 0.4, safe = opts.safe || {};
    var fallback = { x: isNum(safe.x) ? safe.x : 0, z: isNum(safe.z) ? safe.z : 0, yaw: isNum(safe.yaw) ? safe.yaw : 0, vx: 0, vz: 0, speed: 0 };
    if (!s || !isNum(s.x) || !isNum(s.z) || !isNum(s.vx) || !isNum(s.vz) || !isNum(s.yaw) || !isNum(dt) || dt < 0) return fallback;
    dt = Math.min(dt, DT_MAX);
    intent = intent || {};
    var mx = isNum(intent.mx) ? clamp(intent.mx, -1, 1) : 0, mz = isNum(intent.mz) ? clamp(intent.mz, -1, 1) : 0;
    var len = Math.hypot(mx, mz); if (len > 1) { mx /= len; mz /= len; }
    var wx = mx, wz = mz;
    var top = (intent.run && opts.canRun) ? RUN : WALK, k = Math.min(1, dt / ACC);
    var vx = s.vx, vz = s.vz, sp = Math.hypot(vx, vz);
    if (sp > RUN) { vx *= RUN / sp; vz *= RUN / sp; }
    vx += (wx * top - vx) * k; vz += (wz * top - vz) * k;
    var skipX = boxes.map(function (b) { return overlaps(s.x, s.z, r, b); });
    var ox = s.x + vx * dt, x = resolveAxis('x', ox, s.z, vx, boxes, r, skipX); if (x !== ox) vx = 0;
    var skipZ = boxes.map(function (b) { return overlaps(x, s.z, r, b); });
    var oz = s.z + vz * dt, z = resolveAxis('z', x, oz, vz, boxes, r, skipZ); if (z !== oz) vz = 0;
    var speed = Math.hypot(vx, vz), yaw = speed > 0.1 ? Math.atan2(-vx, -vz) : s.yaw;
    var out = { x: x, z: z, yaw: yaw, vx: vx, vz: vz, speed: speed };
    return (isNum(out.x) && isNum(out.z) && isNum(out.yaw) && isNum(out.vx) && isNum(out.vz) && isNum(out.speed)) ? out : fallback;
  }

  /* Dirección en pantalla a partir de yaw (yaw 0 = arriba, π/2 = izquierda): up, down, left o right. En el empate a 45° gana el eje vertical. */
  function faceOf(yaw) {
    if (!isNum(yaw)) return 'up';
    var a = ((yaw % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI), s = Math.sin(a), c = Math.cos(a);
    if (Math.abs(c) >= Math.abs(s) - 1e-9) return c >= 0 ? 'up' : 'down';
    return s > 0 ? 'left' : 'right';
  }

  /* items: [{ id, x, z, … }]. within devuelve copias con dist, ordenadas. */
  function within(pos, items, r) {
    var out = [];
    items.forEach(function (it) { var d = Math.hypot(it.x - pos.x, it.z - pos.z); if (d <= r) { var c = {}; for (var k in it) c[k] = it[k]; c.dist = d; out.push(c); } });
    out.sort(function (a, b) { return a.dist - b.dist; });
    return out;
  }

  return { isNum: isNum, coord: coord, layoutBuildings: layoutBuildings, scene: scene, boxesFor: boxesFor, portalAt: portalAt, door: door, step: step, faceOf: faceOf, WALK: WALK, RUN: RUN, within: within };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = CityMove;
