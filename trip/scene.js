/* Escena 3D del viaje "Viaja como paquete": estilo holograma técnico (sin luces, materiales unlit).
   Recibe THREE como parámetro; no hace import. Ver spec §6 "Estilo visual". */
var TripScene = (function () {
  var BG = 0x0b1220, GRID = 0x1d2b47, LINE = 0x7da2ff, CYAN = 0x5ce1ff, GOOD = 0x5fd39b, LOST = 0xff8f84, CORE = 0xf2b04a;
  var DEG = Math.PI / 180;
  function easeInOutCubic(k) { return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2; }
  function easeOutCubic(k) { return 1 - Math.pow(1 - k, 3); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function Pauser() {
    var reasons = {}, count = 0, last = 0;
    return {
      set: function (r, on) {
        var was = count === 0;
        if (on && !reasons[r]) { reasons[r] = true; count++; }
        else if (!on && reasons[r]) { delete reasons[r]; count--; }
        if (!was && count === 0) last = 0;
      },
      running: function () { return count === 0; },
      tick: function (ts) { var dt = last ? Math.min(50, ts - last) : 16; last = ts; return dt; }
    };
  }

  function buildWorld(THREE, stations) {
    var scene = new THREE.Scene();
    scene.background = new THREE.Color(BG);
    scene.fog = new THREE.Fog(BG, 8, 40);
    var camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);

    // materiales compartidos (como mucho 12 con el de la rejilla)
    var lineMat = new THREE.LineBasicMaterial({ color: LINE });
    var packetMat = new THREE.LineBasicMaterial({ color: CYAN });
    var cableMat = new THREE.LineBasicMaterial({ color: CYAN, transparent: true, opacity: 0.6 });
    var fillMat = new THREE.MeshBasicMaterial({ color: LINE, transparent: true, opacity: 0.12, side: THREE.FrontSide, depthWrite: false });
    var coreMat = new THREE.MeshBasicMaterial({ color: CORE, transparent: true, opacity: 1 });
    var pointsMat = new THREE.PointsMaterial({ color: CYAN, size: 0.08, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
    var ringMats = [CYAN, LINE, GOOD, CORE].map(function (c) { return new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.55, depthWrite: false }); });

    // riel: 10 puntos de control, uno por estación; con nudos uniformes, getPoint(i/9) pasa por el punto i
    var pts = [], i;
    for (i = 0; i < 10; i++) pts.push(new THREE.Vector3(i * 5, 0.4 * Math.sin(i * 0.9), 2.5 * Math.sin(i * 0.6)));
    var curve = new THREE.CatmullRomCurve3(pts);
    var stops = pts.map(function (_, k) { return k / 9; });

    var grid = new THREE.GridHelper(80, 40, LINE, GRID);
    grid.position.set(22, -1.5, 0); grid.material.transparent = true; grid.material.opacity = 0.35;
    scene.add(grid);
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(120)), cableMat));

    function box(x, y, z, w, h, d) {   // contorno + relleno translúcido
      var g = new THREE.BoxGeometry(w, h, d);
      var f = new THREE.Mesh(g, fillMat), e = new THREE.LineSegments(new THREE.EdgesGeometry(g), lineMat);
      f.position.set(x, y, z); e.position.set(x, y, z); scene.add(f); scene.add(e);
    }
    // varias copias de una pieza: un InstancedMesh de relleno y un solo LineSegments con todos los contornos
    function cluster(geo, spots) {
      var im = new THREE.InstancedMesh(geo, fillMat, spots.length), m = new THREE.Matrix4(), k;
      var base = new THREE.EdgesGeometry(geo).attributes.position.array, pos = new Float32Array(base.length * spots.length), j;
      for (k = 0; k < spots.length; k++) {
        m.makeTranslation(spots[k][0], spots[k][1], spots[k][2]); im.setMatrixAt(k, m);
        for (j = 0; j < base.length; j += 3) { pos[k * base.length + j] = base[j] + spots[k][0]; pos[k * base.length + j + 1] = base[j + 1] + spots[k][1]; pos[k * base.length + j + 2] = base[j + 2] + spots[k][2]; }
      }
      im.instanceMatrix.needsUpdate = true; scene.add(im);
      var eg = new THREE.BufferGeometry(); eg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      scene.add(new THREE.LineSegments(eg, lineMat));
    }

    for (i = 0; i < 10; i++) {
      var p = pts[i];
      box(p.x, -1.45, p.z, 3, 0.1, 3);                                       // plataforma de la estación
      if (i === 0) cluster(new THREE.BoxGeometry(0.4, 0.4, 0.4), [[p.x - 0.8, -1.0, p.z + 1.4], [p.x, -1.0, p.z + 1.8], [p.x + 0.8, -1.0, p.z + 1.2], [p.x - 0.4, -0.4, p.z + 2.2], [p.x + 0.6, -0.5, p.z + 2.0]]);
      if (i === 1) box(p.x, -0.6, p.z + 1.5, 0.55, 1.1, 0.08);                // teléfono
      if (i === 2 || i === 3 || i === 4 || i === 9) box(p.x, -0.6, p.z + 1.7, 1.6, 1.0, 0.05);   // panel de capa
      if (i === 5) { var wg = new THREE.TorusGeometry(0.6, 0.012, 4, 24); var wm = new THREE.InstancedMesh(wg, ringMats[1], 4), mm = new THREE.Matrix4(), s; for (s = 0; s < 4; s++) { mm.makeScale(1 + s * 0.6, 1 + s * 0.6, 1); mm.setPosition(p.x, -0.4, p.z + 1.6); wm.setMatrixAt(s, mm); } wm.instanceMatrix.needsUpdate = true; scene.add(wm); }
      if (i === 6) {                                                          // router con dos antenas
        box(p.x, -1.2, p.z + 1.6, 1.2, 0.25, 0.8);
        var ag = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(p.x - 0.4, -1.07, p.z + 1.6), new THREE.Vector3(p.x - 0.4, -0.4, p.z + 1.6), new THREE.Vector3(p.x + 0.4, -1.07, p.z + 1.6), new THREE.Vector3(p.x + 0.4, -0.4, p.z + 1.6)]);
        scene.add(new THREE.LineSegments(ag, lineMat));
      }
      if (i === 7) cluster(new THREE.IcosahedronGeometry(0.28, 0), [[p.x - 1.0, -0.7, p.z + 1.6], [p.x, -0.3, p.z + 2.0], [p.x + 1.0, -0.7, p.z + 1.4], [p.x - 0.5, -1.0, p.z + 2.4], [p.x + 0.6, -0.9, p.z + 2.6], [p.x + 0.1, -0.9, p.z + 1.2]]);
      if (i === 8) { box(p.x, -1.0, p.z + 1.6, 0.9, 0.3, 0.9); box(p.x, -0.65, p.z + 1.6, 0.9, 0.3, 0.9); box(p.x, -0.3, p.z + 1.6, 0.9, 0.3, 0.9); }   // servidor
    }

    // partículas de datos sobre el cable
    var pg = new THREE.BufferGeometry(), parr = new Float32Array(200 * 3);
    pg.setAttribute('position', new THREE.BufferAttribute(parr, 3));
    var particles = new THREE.Points(pg, pointsMat); particles.frustumCulled = false; scene.add(particles);

    // paquete: icosaedro de líneas, núcleo ámbar y cuatro anillos de encapsulación
    var packet = new THREE.Group();
    packet.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.3, 0)), packetMat));
    var core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12, 0), coreMat); packet.add(core);
    var rings = ringMats.map(function (mat, k) {
      var r = new THREE.Mesh(new THREE.TorusGeometry(0.45 + k * 0.1, 0.02, 6, 32), mat);
      r.rotation.x = Math.PI / 2; r.visible = false; r.scale.setScalar(0.001); packet.add(r); return r;
    });
    scene.add(packet);

    var freed = false;
    function dispose() {
      if (freed) return; freed = true;
      var gs = new Set(), ms = new Set();
      scene.traverse(function (o) { if (o.geometry) gs.add(o.geometry); if (o.material) ms.add(o.material); });
      gs.forEach(function (g) { g.dispose(); });
      ms.forEach(function (m) { m.dispose(); });
    }
    return { scene: scene, camera: camera, curve: curve, stops: stops, packet: packet, rings: rings, particles: particles, core: core, mats: { packet: packetMat, points: pointsMat, core: coreMat }, dispose: dispose };
  }

  function create(THREE, canvas, stations, opts) {
    opts = opts || {};
    var reduced = !!opts.reducedMotion;
    var W = buildWorld(THREE, stations);
    var renderer = opts.renderer || new THREE.WebGLRenderer({ canvas: canvas, antialias: false });
    var raf = opts.raf || function (cb) { return requestAnimationFrame(cb); };
    var caf = opts.caf || function (id) { cancelAnimationFrame(id); };
    var pixelRatio = opts.pixelRatio !== undefined ? opts.pixelRatio : (typeof devicePixelRatio !== 'undefined' ? devicePixelRatio : 1);
    var search = opts.search !== undefined ? opts.search : (typeof location !== 'undefined' ? location.search : '');
    renderer.setPixelRatio(Math.min(pixelRatio, 1.5));
    if (renderer.setClearColor) renderer.setClearColor(BG);
    function fit() {
      var w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
      renderer.setSize(w, h, false);
      W.camera.aspect = w / h; W.camera.updateProjectionMatrix();
    }
    fit();

    var pauser = Pauser(), pending = null, wantFrame = false, disposed = false;
    var camT = 0, yaw = 0, pitch = 0, travel = null, time = 0, phase = 0, lostTimer = null;
    var ringState = W.rings.map(function () { return { cur: 0, from: 0, tgt: 0, el: 0 }; });
    var P = new THREE.Vector3(), Q = new THREE.Vector3(), T = new THREE.Vector3(), lookAt = new THREE.Vector3();
    var fpsEl = null, fpsAcc = 0, fpsN = 0;
    if (/fps=1/.test(search) && canvas.parentNode && typeof document !== 'undefined') {
      fpsEl = document.createElement('div'); fpsEl.id = 'trip-fps'; fpsEl.style.cssText = 'position:absolute;left:8px;bottom:8px;font:12px monospace;color:#5ce1ff;pointer-events:none';
      canvas.parentNode.appendChild(fpsEl);
    }

    function applyCamera() {
      W.curve.getPoint(camT, P); W.curve.getTangent(camT, T);
      W.packet.position.copy(P);
      Q.copy(P).addScaledVector(T, -3.2); Q.y += 1.3; Q.z += 0.4;
      W.camera.position.copy(Q);
      lookAt.copy(P).addScaledVector(T, 2.5); lookAt.y -= 0.2;
      W.camera.lookAt(lookAt);
      W.camera.rotateY(-yaw * DEG); W.camera.rotateX(pitch * DEG);
    }
    function seedParticles() {
      var a = W.particles.geometry.attributes.position.array, n = a.length / 3, k;
      for (k = 0; k < n; k++) { W.curve.getPoint(((k / n) + phase) % 1, P); a[k * 3] = P.x; a[k * 3 + 1] = P.y; a[k * 3 + 2] = P.z; }
      W.particles.geometry.attributes.position.needsUpdate = true;
    }
    applyCamera(); seedParticles();

    function needsLoop() { return !reduced || !!travel || ringState.some(function (r) { return r.cur !== r.tgt; }); }
    function requestFrame() { if (disposed || pending !== null) return; pending = raf(loop); }
    function loop(ts) {
      pending = null;
      if (disposed) return;
      var running = pauser.running();
      if (!running && !wantFrame) return;
      wantFrame = false;
      var dt = running ? pauser.tick(ts) : 0, arrived = null;
      time += dt;
      if (travel) {
        travel.el += dt;
        var k = clamp(travel.el / travel.dur, 0, 1);
        camT = travel.from + (travel.to - travel.from) * easeInOutCubic(k);
        if (k >= 1) { arrived = travel.res; travel = null; }
        applyCamera();
      }
      ringState.forEach(function (r, n) {
        if (r.cur === r.tgt) return;
        r.el += dt;
        var kk = clamp(r.el / 400, 0, 1);
        r.cur = kk >= 1 ? r.tgt : r.from + (r.tgt - r.from) * easeOutCubic(kk);
        var ring = W.rings[n]; ring.scale.setScalar(Math.max(r.cur, 0.001)); ring.visible = r.cur > 0.001;
      });
      if (!reduced && running) {
        W.mats.core.opacity = 0.8 + 0.2 * Math.sin(time * 2 * Math.PI / 1000);
        W.packet.rotation.y += dt * 0.001;
        phase = (phase + dt * 0.00004) % 1; seedParticles();
      }
      renderer.render(W.scene, W.camera);
      if (fpsEl && dt) { fpsAcc += 1000 / dt; fpsN++; if (fpsN >= 30) { fpsEl.textContent = Math.round(fpsAcc / fpsN) + ' fps · ' + renderer.info.render.calls + ' calls'; fpsAcc = 0; fpsN = 0; } }
      if (arrived) arrived();
      if ((pauser.running() && needsLoop()) || wantFrame) requestFrame();
    }
    function frameNow() { wantFrame = true; requestFrame(); }

    function goTo(i) {
      if (disposed) return Promise.resolve();
      if (travel) { var old = travel.res; travel = null; old(); }
      yaw = 0; pitch = 0;
      var to = W.stops[i];
      if (reduced) { camT = to; applyCamera(); frameNow(); return Promise.resolve(); }
      return new Promise(function (res) { travel = { from: camT, to: to, el: 0, dur: camT === to ? 600 : 2500, res: res }; frameNow(); });
    }
    function setLayers(n) {
      ringState.forEach(function (r, k) {
        var tgt = k < n ? 1 : 0;
        if (tgt === r.tgt) return;
        r.from = r.cur; r.tgt = tgt; r.el = 0;
        if (reduced) { r.cur = tgt; W.rings[k].scale.setScalar(Math.max(tgt, 0.001)); W.rings[k].visible = tgt > 0; }
      });
      frameNow();
    }
    function lost() {
      W.mats.packet.color.setHex(LOST); W.mats.points.color.setHex(LOST); W.mats.core.color.setHex(LOST);
      if (lostTimer) clearTimeout(lostTimer);
      lostTimer = setTimeout(function () {
        lostTimer = null;
        W.mats.packet.color.setHex(CYAN); W.mats.points.color.setHex(CYAN); W.mats.core.color.setHex(CORE);
        frameNow();
      }, 600);
      frameNow();
    }
    function look(dx, dy) { yaw = clamp(yaw + dx, -60, 60); pitch = clamp(pitch + dy, -25, 25); applyCamera(); frameNow(); }
    function resize() { fit(); frameNow(); }
    function setPaused(reason, on) {
      var was = pauser.running();
      pauser.set(reason, on);
      if (!was && pauser.running()) frameNow();
    }

    var drag = null;
    var onDown = function (e) { drag = { x: e.clientX, y: e.clientY }; try { canvas.setPointerCapture(e.pointerId); } catch (x) {} };
    var onMove = function (e) { if (!drag) return; var dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY; look(-dx * 0.25, dy * 0.25); };
    var onUp = function () { drag = null; };
    canvas.addEventListener('pointerdown', onDown); canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp); canvas.addEventListener('pointercancel', onUp);

    function dispose() {
      if (disposed) return;
      disposed = true;
      if (pending !== null) { caf(pending); pending = null; }
      if (lostTimer) { clearTimeout(lostTimer); lostTimer = null; }
      canvas.removeEventListener('pointerdown', onDown); canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp); canvas.removeEventListener('pointercancel', onUp);
      if (travel) { var r = travel.res; travel = null; r(); }
      W.dispose();
      renderer.dispose();
      try { renderer.forceContextLoss(); } catch (e) {}
      if (fpsEl && fpsEl.parentNode) fpsEl.parentNode.removeChild(fpsEl);
    }
    var api = { goTo: goTo, setLayers: setLayers, lost: lost, look: look, resize: resize, setPaused: setPaused, dispose: dispose };

    // compileAsync de r169 sondea cada 10 ms y no termina nunca si se pierde el contexto: se compite contra webglcontextlost
    var onLost;
    var lostP = new Promise(function (_, rej) { onLost = function () { rej(new Error('contextlost')); }; canvas.addEventListener('webglcontextlost', onLost); });
    var compiled = renderer.compileAsync ? renderer.compileAsync(W.scene, W.camera) : Promise.resolve(renderer.compile(W.scene, W.camera));
    return Promise.race([Promise.resolve(compiled), lostP]).then(function () {
      canvas.removeEventListener('webglcontextlost', onLost);
      frameNow();
      return api;
    }, function (err) {
      canvas.removeEventListener('webglcontextlost', onLost);
      dispose();
      throw err;
    });
  }

  return { create: create, buildWorld: buildWorld, Pauser: Pauser };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = TripScene;
