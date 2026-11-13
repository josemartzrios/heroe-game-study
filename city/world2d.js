/* Mundo 2D de Ciudad Núcleo (vista desde arriba, pixel art neón), una escena a la vez: la plaza o un distrito.
   Contrato: CityWorld2D.create(canvas, D, sceneId, opts) → Promise<api>; opts = { reducedMotion, tick(dt), state(), onLost?, raf?, caf?, pixelRatio?, search?, doc? }.
   api = { resize, setPaused(reason, on), dispose, encounter(id), dissolve(id), stats(), setRoute(done) }.
   El mapa de la escena se prerenderiza una sola vez a 8 px/m (sin dpr ni zoom); cada cuadro copia el rectángulo visible y dibuja encima
   sprites, la ruta del paquete (pads, cable y paquete) y partículas. Por cuadro NO se usa shadowBlur, filter, composite distinto de
   source-over, canvas nuevos ni get/putImageData; encender un tramo de la ruta nunca repinta el mapa. */
var CityWorld2D = (function () {
  /* alias distintos de los globales: un `var Three3D` aquí taparía al global en el navegador */
  var T3 = (typeof Three3D !== 'undefined') ? Three3D : require('../three/shared.js');
  var SP = (typeof CitySprites !== 'undefined') ? CitySprites : require('./sprites2d.js');
  var CMv = (typeof CityMove !== 'undefined') ? CityMove : require('./move.js');
  var PX = 8, BG = '#0d1230', FOG = 'rgba(176,108,255,0.08)', STAR_COL = ['#6b7280', '#cd7f32', '#cfd6e6', '#ffd23f'];
  var NEON = ['#5ce1ff', '#ff4fd8', '#7dff8a', '#ffd76a'];
  var NPART = 200, CABLE_OFF = '#2a3358', CHECK = '#eafff3', PACKET = '#ffffff', PACKET_MS = 800;

  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  /* Prerenderiza el mapa de una escena a 8 px/m. restored enciende más las ventanas del distrito. */
  function buildMap(D, sceneId, doc, restored, into) {
    var SC = CMv.scene(D, sceneId);
    if (!SC) throw new Error('escena');
    var B = SC.bounds, w = Math.round((B.maxX - B.minX) * PX), h = Math.round((B.maxZ - B.minZ) * PX);
    var cv = into || doc.createElement('canvas'); cv.width = w; cv.height = h;
    var g = cv.getContext('2d');
    if (!g) throw new Error('sin-2d');
    function X(x) { return (x - B.minX) * PX; }
    function Z(z) { return (z - B.minZ) * PX; }
    function rect(c, x0, z0, x1, z1) { g.fillStyle = c; g.fillRect(Math.round(X(x0)), Math.round(Z(z0)), Math.round((x1 - x0) * PX), Math.round((z1 - z0) * PX)); }
    function label(txt, x, z, c, size) { g.fillStyle = c; g.font = 'bold ' + size + 'px ui-monospace, monospace'; g.textAlign = 'center'; g.fillText(txt, X(x), Z(z)); }
    /* arco abierto (portal de un distrito o salida): suelo oscuro, dintel y umbral en el color a, postes en el color b */
    function arch(o, ca, cb, txt) {
      var x0 = o.x - o.w / 2, x1 = o.x + o.w / 2, z0 = o.z - o.d / 2, z1 = o.z + o.d / 2;
      rect('#0d1230', x0, z0, x1, z1); rect(ca, x0, z0, x1, z0 + 0.3); rect(ca, x0, z1 - 0.3, x1, z1);
      rect(cb, x0, z0, x0 + 0.8, z1); rect(cb, x1 - 0.8, z0, x1, z1);
      label(txt, o.x, o.z + 0.7, ca, 18);
    }
    rect('#141a3a', B.minX, B.minZ, B.maxX, B.maxZ);
    var road = '#232a52', r, a;
    if (sceneId === 'plaza') {
      var P = SC;
      // disco de baldosas, baldosas y anillo neón
      g.fillStyle = '#1b2250';
      for (a = -P.r; a <= P.r; a += 0.5) { var half = Math.sqrt(Math.max(0, P.r * P.r - a * a)); g.fillRect(Math.round(X(-half)), Math.round(Z(a)), Math.round(half * 2 * PX), Math.round(0.5 * PX) + 1); }
      for (a = -P.r + 3; a < P.r; a += 3) {
        var hw = Math.sqrt(Math.max(0, P.r * P.r - a * a));
        rect('#232c63', -hw, a - 0.06, hw, a + 0.06); rect('#232c63', a - 0.06, -hw, a + 0.06, hw);
      }
      g.strokeStyle = '#5ce1ff'; g.lineWidth = 3; g.beginPath(); g.arc(X(0), Z(0), P.r * PX, 0, Math.PI * 2); g.stroke();
      g.strokeStyle = '#ff4fd8'; g.lineWidth = 1; g.beginPath(); g.arc(X(0), Z(0), (P.r - 1) * PX, 0, Math.PI * 2); g.stroke();
      // un camino del anillo a cada portal
      P.portals.forEach(function (p) { var an = p.angle * Math.PI / 180; for (r = P.r; r < Math.hypot(p.x, p.z); r += 0.5) rect(road, Math.cos(an) * r - 2, Math.sin(an) * r - 2, Math.cos(an) * r + 2, Math.sin(an) * r + 2); });
      // sede y espejo
      var hq = P.hq;
      rect('rgba(0,0,0,0.30)', hq.x - hq.w / 2 + 1, hq.z - hq.d / 2 + 1, hq.x + hq.w / 2 + 1, hq.z + hq.d / 2 + 1);
      rect('#3d6fa8', hq.x - hq.w / 2, hq.z - hq.d / 2, hq.x + hq.w / 2, hq.z + hq.d / 2); rect('#5ce1ff', hq.x - hq.w / 2, hq.z - hq.d / 2, hq.x + hq.w / 2, hq.z - hq.d / 2 + 0.4); rect('#ffd76a', hq.x - 1.5, hq.z + hq.d / 2 - 1.2, hq.x + 1.5, hq.z + hq.d / 2);
      var wxx; for (wxx = hq.x - hq.w / 2 + 1.2; wxx < hq.x + hq.w / 2 - 1.5; wxx += 2.2) { rect('#ffd76a', wxx, hq.z - hq.d / 2 + 1.5, wxx + 1, hq.z - hq.d / 2 + 2.5); rect('#5ce1ff', wxx, hq.z - hq.d / 2 + 3.5, wxx + 1, hq.z - hq.d / 2 + 4.5); }
      rect('#9be7ff', P.mirror.x - 0.7, P.mirror.z - 1.2, P.mirror.x + 0.7, P.mirror.z + 1.2);
      // portales: arco abierto con los colores del distrito, o muro de La Maraña con letrero
      P.portals.forEach(function (p) {
        var Md = Object.prototype.hasOwnProperty.call(D.districts, p.dist) ? D.districts[p.dist] : null;
        if (Md) arch(p, Md.colors.a, Md.colors.b, p.dist);
        else { rect('#2a1f3d', p.x - p.w / 2, p.z - p.d / 2, p.x + p.w / 2, p.z + p.d / 2); rect('#ffd76a', p.x - 1.5, p.z - 0.3, p.x + 1.5, p.z + 0.3); label(p.dist, p.x, p.z - 1.4, '#8a7fb0', 16); }
      });
      return cv;
    }
    // ---- distrito: calles, edificios y torre ----
    var cols = SC.colors, line = cols.a, red = SC.style === 'red', tw = SC.tower;
    SC.streets.z.forEach(function (z) { rect(road, B.minX, z - 3, B.maxX, z + 3); rect(line, B.minX, z - 0.06, B.maxX, z + 0.06); });
    SC.streets.x.forEach(function (x) { rect(road, x - 3, B.minZ, x + 3, B.maxZ); rect(line, x - 0.06, B.minZ, x + 0.06, B.maxZ); });
    var lit = restored ? '#fff0a0' : '#ffd76a';
    CMv.layoutBuildings(SC).forEach(function (b, n) {
      var neon = red ? (b.block % 2 ? cols.b : cols.a) : NEON[b.block % 4], x0 = b.x - b.w / 2, z0 = b.z - b.d / 2, x1 = b.x + b.w / 2, z1 = b.z + b.d / 2;
      rect('rgba(0,0,0,0.30)', x0 + b.h * 0.12, z0 + b.h * 0.12, x1 + b.h * 0.12, z1 + b.h * 0.12);
      rect('#2a2f5e', x0, z0, x1, z1); rect(neon, x0, z0, x1, z0 + 0.35); rect('#1f2450', x0, z1 - 0.5, x1, z1);
      var hh = hash('w' + n), wx, wz;
      for (wz = z0 + 1; wz < z1 - 1.2; wz += 1.5) for (wx = x0 + 0.8; wx < x1 - 1; wx += 1.4) { hh = Math.imul(hh ^ (hh >>> 13), 1274126177) >>> 0; if (hh % 3) rect(hh % 5 === 0 ? neon : lit, wx, wz, wx + 0.55, wz + 0.45); }
      if (red) {   // antena en la azotea y franjas de rack en la fachada
        var ax = x0 + 0.8 + (hash('a' + n) % 100) / 100 * Math.max(0.1, b.w - 1.6);
        rect(cols.a, ax, z0 - 1.4, ax + 0.3, z0 + 0.3); rect(cols.b, ax - 0.5, z0 - 1.4, ax + 0.8, z0 - 1.1);
        rect(cols.b, x0 + 0.5, z1 - 1.3, x1 - 0.5, z1 - 1.15); rect(cols.a, x0 + 0.5, z1 - 1.0, x1 - 0.5, z1 - 0.85);
      }
    });
    rect('rgba(0,0,0,0.30)', tw.x - tw.w / 2 + 2, tw.z - tw.d / 2 + 2, tw.x + tw.w / 2 + 2, tw.z + tw.d / 2 + 2);
    rect('#5b6270', tw.x - tw.w / 2, tw.z - tw.d / 2, tw.x + tw.w / 2, tw.z + tw.d / 2); rect('#ffd23f', tw.x - tw.w / 2 + 1, tw.z - tw.d / 2 + 1, tw.x + tw.w / 2 - 1, tw.z + tw.d / 2 - 1);
    arch(SC.exit, cols.a, cols.b, 'PLAZA');
    return cv;
  }

  function create(canvas, D, sceneId, opts) {
    opts = opts || {};
    var SC = CMv.scene(D, sceneId);
    if (!SC) return Promise.reject(new Error('escena inválida'));
    var isPlaza = sceneId === 'plaza', P = D.plaza, B = SC.bounds;
    var doc = opts.doc || (typeof document !== 'undefined' ? document : null);
    if (opts.doc) SP.init(opts.doc);
    SP.setData(D);
    var ctx = null, map = null, restored0 = false;
    try {
      ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('sin-2d');
      var s0 = opts.state ? opts.state() : null;   // si la escena ya está restaurada el mapa se prerenderiza una sola vez, ya restaurado
      restored0 = !!(s0 && s0.flags && s0.flags.restored);
      map = buildMap(D, sceneId, doc, restored0);
      ['hero', 'person', 'creature', 'thing'].forEach(function (k) { SP.frame(k, '', 'down', 0); });   // un atlas imposible rechaza aquí, no en el primer cuadro
    } catch (e) { return Promise.reject(new Error('sin-2d')); }
    var raf = opts.raf || function (cb) { return requestAnimationFrame(cb); };
    var caf = opts.caf || function (id) { cancelAnimationFrame(id); };
    var pr = (typeof opts.pixelRatio === 'number' && isFinite(opts.pixelRatio)) ? opts.pixelRatio : (typeof devicePixelRatio !== 'undefined' ? devicePixelRatio : 1);
    pr = clamp(pr, 1, 1.5);
    var search = opts.search !== undefined ? opts.search : (typeof location !== 'undefined' ? location.search : '');
    var reduced = !!opts.reducedMotion;
    var pauser = T3.Pauser(), pending = null, wantFrame = false, disposed = false, time = 0, enc = null, encRes = null, encTimer = null;
    var camOffX = 0, camOffZ = 0, dis = {}, W_ = 0, H_ = 0, portrait = true;
    var parts = [], nLive = 0, sparkT = 0, st = { npc: 0, part: 0, tick: 0, draw: 0, p95: 0 }, times = [], frames = 0;
    var i;
    for (i = 0; i < NPART; i++) parts.push({ x: 0, z: 0, vx: 0, vz: 0, life: 0, c: '#b06cff' });
    // NPC de la escena: Iris en la plaza; mentores, criaturas y aprendices en un distrito
    var npcs = [], vId = function (id) { return sceneId + ':' + id; };
    if (isPlaza) npcs.push({ id: P.director.id, v: P.director.id, kind: 'person', x: P.director.x, z: P.director.z });
    else {
      SC.mentors.forEach(function (m) { npcs.push({ id: m.id, v: vId(m.id), kind: 'person', x: m.x, z: m.z, star: true }); });
      SC.creatures.forEach(function (c) { npcs.push({ id: c.id, v: vId(c.id), kind: 'creature', x: c.area.x, z: c.area.z }); });
      SC.apprentices.forEach(function (a) { npcs.push({ id: a.id, v: vId(a.id), kind: 'person', x: a.x, z: a.z, ask: true }); });
    }
    var byId = Object.create(null); npcs.forEach(function (n) { byId[n.id] = n; });
    var repairs = isPlaza ? [] : SC.repairs;
    // 8 faroles: en el anillo de la plaza o en los cruces de calles más cercanos a la entrada del distrito
    var lamps = [];
    if (isPlaza) for (i = 0; i < 8; i++) lamps.push({ x: Math.cos(i * Math.PI / 4) * 20, z: Math.sin(i * Math.PI / 4) * 20 });
    else {
      var cross = []; SC.streets.x.forEach(function (x) { SC.streets.z.forEach(function (z) { cross.push({ x: x, z: z, d: Math.hypot(x - SC.entry.x, z - SC.entry.z) }); }); });
      cross.sort(function (a, b) { return a.d - b.d; });
      for (i = 0; i < 8; i++) lamps.push(cross[i % cross.length]);
    }
    // muros de La Maraña (portales sin distrito) para las chispas de la plaza
    var walls = isPlaza ? P.portals.filter(function (p) { return !Object.prototype.hasOwnProperty.call(D.districts, p.dist); }) : [];
    var fogBlobs = []; for (i = 0; i < 14; i++) fogBlobs.push({ x: B.minX + (hash('f' + i) % 1000) / 1000 * (B.maxX - B.minX), z: B.minZ + (hash('g' + i) % 1000) / 1000 * (B.maxZ - B.minZ), r: 7 + (i % 4) * 2 });
    // ruta del paquete (solo distritos con ruta): pads, tramos de cable por las calles y paquete
    var route = (!isPlaza && SC.route) ? SC.route : null, pads = route ? route.pads : [], legs = [], routeDone = 0, routeInit = false, packet = null;
    if (route) for (i = 0; i + 1 < pads.length; i++) {
      var p0 = pads[i], p1 = pads[i + 1], pts = [[p0.x, p0.z], [p1.x, p0.z], [p1.x, p1.z]], rs = [], k2;
      for (k2 = 0; k2 < 2; k2++) if (pts[k2][0] !== pts[k2 + 1][0] || pts[k2][1] !== pts[k2 + 1][1]) rs.push({ x0: Math.min(pts[k2][0], pts[k2 + 1][0]) - 0.25, z0: Math.min(pts[k2][1], pts[k2 + 1][1]) - 0.25, x1: Math.max(pts[k2][0], pts[k2 + 1][0]) + 0.25, z1: Math.max(pts[k2][1], pts[k2 + 1][1]) + 0.25 });
      legs.push({ rects: rs, pts: pts });
    }
    var lastRestored = restored0, errs = 0;

    var fpsEl = null;
    if (/fps=1/.test(search) && canvas.parentNode && typeof document !== 'undefined') {
      fpsEl = document.createElement('div'); fpsEl.id = 'city-fps'; fpsEl.style.cssText = 'position:absolute;left:8px;bottom:8px;font:12px monospace;color:#5ce1ff;pointer-events:none;z-index:9';
      canvas.parentNode.appendChild(fpsEl);
    }
    function readReduced() {
      var rm = !!opts.reducedMotion;
      try { if (!rm && typeof window !== 'undefined' && window.matchMedia) rm = !!window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
      reduced = rm;
    }
    function fit(force) {
      var w = canvas.clientWidth, h = canvas.clientHeight;
      if (!force && (!w || !h)) return;
      w = w || 1; h = h || 1;
      var cw = Math.min(8192, Math.max(1, Math.round(w * pr))), ch = Math.min(8192, Math.max(1, Math.round(h * pr)));   // tope: más de 8192 px deja el canvas en blanco
      portrait = h > w;
      if (cw !== canvas.width || ch !== canvas.height) { canvas.width = cw; canvas.height = ch; ctx.imageSmoothingEnabled = false; }   // asignar width borra y realoca: solo si cambió
      W_ = cw; H_ = ch;
    }
    fit(true);

    function spawn(x, z, vx, vz, life, c) {
      for (var k = 0; k < NPART; k++) if (parts[k].life <= 0) { var p = parts[k]; p.x = x; p.z = z; p.vx = vx; p.vz = vz; p.life = life; p.c = c; nLive++; return; }
    }
    function updateParts(dt, running, hx, hz, flags) {
      var k, p, s = dt / 1000;
      for (k = 0; k < NPART; k++) { p = parts[k]; if (p.life <= 0) continue; p.life -= dt; if (p.life <= 0) { nLive--; continue; } p.x += p.vx * s; p.z += p.vz * s; }
      if (reduced || !running) return;
      sparkT += dt;
      if (sparkT > 160) {
        sparkT = 0;
        if (walls.length) {   // las chispas salen de los muros de La Maraña (solo en la plaza) y de los retos sin reparar (solo en un distrito)
          var w = walls[Math.floor(time / 160) % walls.length];
          if (Math.abs(w.x - hx) < 40 && Math.abs(w.z - hz) < 60) spawn(w.x + (Math.random() - 0.5) * 5, w.z, 0, -1.5, 900, '#b06cff');
        }
        if (repairs.length) {
          var rp = repairs[Math.floor(time / 160) % repairs.length];
          if (!(flags.repairs && flags.repairs[rp.id]) && Math.abs(rp.x - hx) < 30 && Math.abs(rp.z - hz) < 50) spawn(rp.x, rp.z - 0.8, (Math.random() - 0.5) * 2, -2, 500, '#ffd76a');
        }
      }
    }

    var cx = 0, cz = 0, sx = 0, sy = 0, ppm = PX, sprS = 2;
    function SXp(x) { return sx + (x - cx) * ppm; }
    function SZp(z) { return sy + (z - cz) * ppm; }
    function onScreen(x, z, m) { var X = SXp(x), Z = SZp(z); return X > -m && X < W_ + m && Z > -m && Z < H_ + m; }
    function spr(r, x, z, lift) {
      var dw = r.w * sprS, dh = r.h * sprS;
      ctx.drawImage(r.img, r.sx, r.sy, r.w, r.h, Math.round(SXp(x) - dw / 2), Math.round(SZp(z) - dh * 0.9 - (lift || 0)), dw, dh);
    }

    /* cable (encendido hasta el pad activo), paquete y pads: terminados con ✓ y relleno oscuro, el activo relleno con el color del distrito,
       los siguientes solo con contorno (la diferencia es de forma, no solo de color) */
    function drawRoute() {
      var cols = SC.colors, j, k, L, q, S = Math.round(3 * ppm), X, Z, o, u = Math.max(2, Math.round(ppm * 0.25));
      for (j = 0; j < legs.length; j++) {
        ctx.fillStyle = j < routeDone ? cols.a : CABLE_OFF;
        for (k = 0; k < legs[j].rects.length; k++) { q = legs[j].rects[k]; ctx.fillRect(Math.round(SXp(q.x0)), Math.round(SZp(q.z0)), Math.max(2, Math.round((q.x1 - q.x0) * ppm)), Math.max(2, Math.round((q.z1 - q.z0) * ppm))); }
      }
      if (packet && !reduced && legs[packet.seg]) {
        L = legs[packet.seg].pts; var l1 = Math.abs(L[1][0] - L[0][0]) + Math.abs(L[1][1] - L[0][1]), l2 = Math.abs(L[2][0] - L[1][0]) + Math.abs(L[2][1] - L[1][1]), d = clamp(packet.t / PACKET_MS, 0, 1) * (l1 + l2), px, pz;
        if (d <= l1) { px = L[0][0] + (L[1][0] - L[0][0]) * (l1 ? d / l1 : 0); pz = L[0][1] + (L[1][1] - L[0][1]) * (l1 ? d / l1 : 0); }
        else { var e = l2 ? (d - l1) / l2 : 0; px = L[1][0] + (L[2][0] - L[1][0]) * e; pz = L[1][1] + (L[2][1] - L[1][1]) * e; }
        if (onScreen(px, pz, 20)) { ctx.fillStyle = PACKET; ctx.fillRect(Math.round(SXp(px) - 2 * u), Math.round(SZp(pz) - 2 * u), 4 * u, 4 * u); }
      }
      for (j = 0; j < pads.length; j++) {
        o = pads[j]; if (!onScreen(o.x, o.z, S)) continue;
        X = Math.round(SXp(o.x) - S / 2); Z = Math.round(SZp(o.z) - S / 2);
        if (j < routeDone) {
          ctx.fillStyle = '#10152e'; ctx.fillRect(X, Z, S, S);
          ctx.fillStyle = CHECK;
          ctx.fillRect(X + Math.round(S * 0.2), Z + Math.round(S * 0.5), u, u * 2); ctx.fillRect(X + Math.round(S * 0.2) + u, Z + Math.round(S * 0.5) + u, u, u * 2);
          ctx.fillRect(X + Math.round(S * 0.2) + 2 * u, Z + Math.round(S * 0.5) + 2 * u, u, u); ctx.fillRect(X + Math.round(S * 0.2) + 3 * u, Z + Math.round(S * 0.5) + u, u, u * 2);
          ctx.fillRect(X + Math.round(S * 0.2) + 4 * u, Z + Math.round(S * 0.5) - u, u, u * 2); ctx.fillRect(X + Math.round(S * 0.2) + 5 * u, Z + Math.round(S * 0.5) - 3 * u, u, u * 2);
          ctx.strokeStyle = cols.a; ctx.lineWidth = 2; ctx.strokeRect(X, Z, S, S);
        } else if (j === routeDone) {
          ctx.fillStyle = cols.a; ctx.fillRect(X, Z, S, S);
          ctx.fillStyle = '#10152e'; ctx.fillRect(X + u * 2, Z + u * 2, S - u * 4, S - u * 4);
          ctx.fillStyle = (!reduced && Math.floor(time / 500) % 2) ? cols.b : cols.a; ctx.fillRect(X + Math.round(S / 2) - u, Z + Math.round(S / 2) - u, u * 2, u * 2);
        } else { ctx.strokeStyle = '#4a5280'; ctx.lineWidth = 2; ctx.strokeRect(X + 1, Z + 1, S - 2, S - 2); }
      }
    }

    function draw(s) {
      var t0 = typeof performance !== 'undefined' ? performance.now() : 0;
      var h = s.hero, f = s.flags || {}, zoom = clamp(typeof s.zoom === 'number' && isFinite(s.zoom) ? s.zoom : 1, 1, 1.75);
      ppm = Math.round(PX * zoom * pr * 4) / 4; sprS = Math.round(2 * zoom * pr * 4) / 4;
      cx = h.x + camOffX; cz = h.z + camOffZ;
      sx = W_ / 2; sy = H_ * (portrait ? 0.55 : 0.5);
      if (!!f.restored !== lastRestored) { lastRestored = !!f.restored; try { buildMap(D, sceneId, doc, lastRestored, map); } catch (e) {} }
      ctx.fillStyle = BG; ctx.fillRect(0, 0, W_, H_);
      // rectángulo visible del mapa
      var wx0 = cx - sx / ppm, wz0 = cz - sy / ppm, wx1 = cx + (W_ - sx) / ppm, wz1 = cz + (H_ - sy) / ppm;
      var vx0 = Math.max(wx0, B.minX), vz0 = Math.max(wz0, B.minZ), vx1 = Math.min(wx1, B.maxX), vz1 = Math.min(wz1, B.maxZ);
      if (vx1 > vx0 && vz1 > vz0) ctx.drawImage(map, (vx0 - B.minX) * PX, (vz0 - B.minZ) * PX, (vx1 - vx0) * PX, (vz1 - vz0) * PX, Math.round(SXp(vx0)), Math.round(SZp(vz0)), Math.round((vx1 - vx0) * ppm), Math.round((vz1 - vz0) * ppm));
      var n = 0, m = 16 * sprS, j, o, fr, sc;
      if (route) drawRoute();
      // retos
      for (j = 0; j < repairs.length; j++) { o = repairs[j]; if (onScreen(o.x, o.z, m)) { spr(SP.frame('thing', f.repairs && f.repairs[o.id] ? 'repaired' : 'repair', 'down', 0), o.x, o.z); n++; } }
      // faroles
      for (j = 0; j < lamps.length; j++) if (onScreen(lamps[j].x, lamps[j].z, m)) { spr(SP.frame('thing', j < (f.lit | 0) ? 'lampOn' : 'lamp', 'down', 0), lamps[j].x, lamps[j].z); n++; }
      // NPC
      var bob = reduced ? 0 : Math.sin(time / 400) * 2;
      for (j = 0; j < npcs.length; j++) {
        o = npcs[j];
        if (!onScreen(o.x, o.z, m)) continue;
        if (o.kind === 'creature') { if ((f.beatenToday && f.beatenToday[o.id]) || dis[o.id] === 'gone') continue; spr(SP.frame('creature', o.v, 'down', reduced ? 0 : (Math.floor(time / 300) % 2)), o.x, o.z, 4 + bob * sprS); }
        else if (o.ask) { if (!(f.apprenticesVisible && f.apprenticesVisible[o.id])) continue; spr(SP.frame('person', o.v, 'down', 0), o.x, o.z); spr(SP.frame('thing', 'ask', 'down', 0), o.x, o.z, 15 * sprS); }
        else { spr(SP.frame('person', o.v, 'down', 0), o.x, o.z); if (o.star) { sc = (f.stars && f.stars[o.id]) | 0; sc = clamp(sc, 0, 3); ctx.fillStyle = STAR_COL[sc]; var cnt = Math.max(1, sc), q; for (q = 0; q < cnt; q++) ctx.fillRect(Math.round(SXp(o.x) - cnt * 2 * sprS + q * 4 * sprS), Math.round(SZp(o.z) - 17 * sprS), 3 * sprS, 3 * sprS); } }
        n++;
      }
      // héroe
      fr = SP.frame('hero', '', h.face, (!reduced && h.speed > 0.5) ? (Math.floor(time / 150) % 2) : 0);
      spr(fr, h.x, h.z); n++;
      // neblina de La Maraña sobre la escena mientras no esté restaurada
      if (!f.restored) {
        ctx.fillStyle = FOG;
        for (j = 0; j < fogBlobs.length; j++) { o = fogBlobs[j]; var drift = reduced ? 0 : Math.sin(time / 2500 + j) * 2; if (onScreen(o.x + drift, o.z, o.r * ppm)) ctx.fillRect(Math.round(SXp(o.x + drift - o.r)), Math.round(SZp(o.z - o.r * 0.6)), Math.round(o.r * 2 * ppm), Math.round(o.r * 1.2 * ppm)); }
      }
      // partículas
      for (j = 0; j < NPART; j++) { o = parts[j]; if (o.life > 0 && onScreen(o.x, o.z, 8)) { ctx.fillStyle = o.c; ctx.fillRect(Math.round(SXp(o.x)), Math.round(SZp(o.z)), Math.max(2, Math.round(ppm * 0.18)), Math.max(2, Math.round(ppm * 0.18))); } }
      st.npc = n; st.part = nLive; st.draw = (typeof performance !== 'undefined' ? performance.now() : 0) - t0;
    }

    function requestFrame() { if (disposed || pending !== null) return; pending = raf(loop); }
    function loop(ts) {
      pending = null;
      if (disposed) return;
      var running = pauser.running();
      if (!running && !wantFrame) return;
      wantFrame = false;
      try {
        var dt = running ? pauser.tick(ts) : 0, t1 = typeof performance !== 'undefined' ? performance.now() : 0;
        if (!(dt >= 0 && dt <= 50)) dt = 0;   // timestamp de rAF inválido (NaN, Infinity): ese cuadro no avanza el tiempo
        time += dt;
        if (packet) { packet.t += dt; if (packet.t >= PACKET_MS) packet = null; }
        if (opts.tick) opts.tick(dt);
        if (disposed) return;
        st.tick = (typeof performance !== 'undefined' ? performance.now() : 0) - t1;
        var s = opts.state ? opts.state() : null;
        if (s && s.hero) {
          if (enc) { enc.t += dt; var kk = Math.min(1, enc.t / 600); camOffX = (enc.x - s.hero.x) * 0.5 * kk; camOffZ = (enc.z - s.hero.z) * 0.5 * kk; if (kk >= 1) finishEnc(); }
          updateParts(dt, running, s.hero.x, s.hero.z, s.flags || {});
          draw(s);
        }
        if (dt) { times.push(dt); if (times.length > 120) times.shift(); }
        frames++;
        if (fpsEl && frames % 30 === 0 && times.length > 10) {
          var srt = times.slice().sort(function (a, b) { return a - b; }), tot = 0, q; for (q = 0; q < times.length; q++) tot += times[q];
          st.p95 = srt[Math.floor(srt.length * 0.95)];
          fpsEl.textContent = Math.round(1000 * times.length / tot) + ' fps · p95 ' + st.p95.toFixed(1) + ' ms · tick ' + st.tick.toFixed(1) + ' · dibujo ' + st.draw.toFixed(1) + ' · npc ' + st.npc + ' · part ' + st.part;
        }
        errs = 0;
      } catch (e) {
        errs++;
        if (errs >= 3) { if (opts.onLost) opts.onLost(); return; }   // un cuadro malo se salta; tres seguidos = la vista se da por perdida
      }
      if (disposed) return;
      if (pauser.running() || wantFrame) requestFrame();
    }
    function frameNow() { wantFrame = true; requestFrame(); }
    function finishEnc() { var r = encRes; enc = null; encRes = null; camOffX = 0; camOffZ = 0; if (encTimer) { clearTimeout(encTimer); encTimer = null; } if (r) r(); }

    function resize() { if (disposed || pauser.has('suspended')) return; readReduced(); fit(false); frameNow(); }
    function setPaused(reason, on) {
      if (disposed) return;
      var was = pauser.running();
      pauser.set(reason, on);
      if (!was && pauser.running()) frameNow();
    }
    function dissolve(id) {
      var n = byId[id]; if (disposed || !n) return;
      dis[id] = 'gone';
      if (!reduced) { var k; for (k = 0; k < 24; k++) spawn(n.x, n.z - 0.6, Math.cos(k * 0.26) * (1 + (k % 3)), Math.sin(k * 0.26) * (1 + (k % 3)) - 1, 700, k % 2 ? '#b06cff' : '#ff4fd8'); }
      frameNow();
    }
    function encounter(id) {
      var n = byId[id];
      if (disposed || !n || reduced) return Promise.resolve();
      if (encRes) finishEnc();
      return new Promise(function (res) {
        enc = { x: n.x, z: n.z, t: 0 }; encRes = res;
        encTimer = setTimeout(function () { encTimer = null; finishEnc(); }, 1500);
        frameNow();
      });
    }
    /* done = estaciones terminadas (0..pads). La primera llamada solo fija el estado; avanzar de a una estación lanza el paquete por el tramo nuevo. */
    function setRoute(n) {
      if (disposed || !route) return;
      var v = (typeof n === 'number' && isFinite(n) && Math.floor(n) === n) ? clamp(n, 0, pads.length) : 0;
      if (routeInit && v === routeDone + 1 && !reduced) packet = { seg: routeDone, t: 0 };
      routeDone = v; routeInit = true;
      frameNow();
    }
    var onLostEv = function () { if (opts.onLost) opts.onLost(); };
    canvas.addEventListener('contextlost', onLostEv);
    function dispose() {
      if (disposed) return;
      disposed = true;
      if (pending !== null) { caf(pending); pending = null; }
      finishEnc();
      canvas.removeEventListener('contextlost', onLostEv);
      map.width = 0; map.height = 0; map = null;
      canvas.width = 0; canvas.height = 0;   // libera la memoria del canvas (en iOS cuenta para el total)
      if (fpsEl && fpsEl.parentNode) fpsEl.parentNode.removeChild(fpsEl);
    }
    var api = { resize: resize, setPaused: setPaused, dispose: dispose, encounter: encounter, dissolve: dissolve, setRoute: setRoute, stats: function () { return { npc: st.npc, part: nLive, tick: st.tick, draw: st.draw, p95: st.p95 }; } };
    readReduced();
    frameNow();
    return Promise.resolve(api);
  }

  return { create: create };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = CityWorld2D;
