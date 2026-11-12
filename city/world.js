/* Mundo 3D de Ciudad Núcleo (low-poly colorido): plaza, Taller Comunal, NPC, La Maraña, sombras, indicadores y faroles.
   Recibe THREE por parámetro. Cumple el contrato create(THREE, canvas, D, opts) → Promise<api> de la vista.
   Presupuesto: un InstancedMesh por grupo, una malla por NPC, edificios fusionados por cuadrante, sin PointLight. */
var CityWorld = (function () {
  /* alias distintos de los globales: un `var CityMove` aquí taparía al global en el navegador */
  var T3 = (typeof Three3D !== 'undefined') ? Three3D : require('../three/shared.js');
  var CMv = (typeof CityMove !== 'undefined') ? CityMove : require('./move.js');
  var CH = (typeof CityHero !== 'undefined') ? CityHero : require('./hero3d.js');
  var SKY = 0x8fd3ff, SKY_DARK = 0x9a86c4, FOG_NEAR = 20, FOG_FAR = 62;
  var PALETTE = [0xe8e3d8, 0xf2c14e, 0x6bb6d6, 0xe07a5f, 0x9b8bd8, 0x81c784];
  var STAR_COL = [0x6b7280, 0xcd7f32, 0xcfd6e6, 0xffd23f];
  var STREET_X = [-28, 0, 28], STREET_Z = [-80, -108, -136];
  var TAU = Math.PI * 2;

  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; }
  function shade(c, k) { return (Math.round(((c >> 16) & 255) * k) << 16) | (Math.round(((c >> 8) & 255) * k) << 8) | Math.round((c & 255) * k); }

  function buildWorld(THREE, D, opts) {
    opts = opts || {};
    var M = D.districts.M02, P = D.plaza, scene = new THREE.Scene(), i, k;
    scene.background = new THREE.Color(SKY_DARK);
    scene.fog = new THREE.Fog(SKY_DARK, FOG_NEAR, FOG_FAR);
    var camera = new THREE.PerspectiveCamera(70, 1, 0.1, 62);
    scene.add(new THREE.HemisphereLight(0xffffff, 0xb8aee0, 1.7));
    var sun = new THREE.DirectionalLight(0xfff2d6, 1.1); sun.position.set(30, 50, 20); scene.add(sun);

    var litMat = new THREE.MeshLambertMaterial({ vertexColors: true });
    function addMerged(parts, name) {
      var g = T3.mergeBoxes(THREE, parts), m = new THREE.Mesh(g, litMat); m.name = name; scene.add(m); return m;
    }
    // suelo y plaza
    var gm = new THREE.Mesh(new THREE.PlaneGeometry(300, 420).rotateX(-Math.PI / 2), new THREE.MeshLambertMaterial({ color: 0x7fb069 }));
    gm.position.set(0, 0, -80); scene.add(gm);
    var pm = new THREE.Mesh((function () { var g = new THREE.CylinderGeometry(P.r, P.r, 0.2, 28); g.clearGroups(); return g; })(), new THREE.MeshLambertMaterial({ color: 0xd9d4c7 }));
    pm.position.y = 0.05; scene.add(pm);
    // calles
    var roads = [{ w: 6, h: 0.1, d: 24, x: 0, y: 0.1, z: -42, color: 0x5b6270 }];
    P.roads.forEach(function (r) { var a = r.angle * Math.PI / 180; roads.push({ w: 4, h: 0.1, d: 10, x: Math.cos(a) * 33, y: 0.1, z: Math.sin(a) * 33, color: 0x5b6270, rotY: -(a + Math.PI / 2) }); });
    STREET_Z.forEach(function (z) { roads.push({ w: 124, h: 0.1, d: 6, x: 0, y: 0.1, z: z, color: 0x5b6270 }); });
    STREET_X.forEach(function (x) { roads.push({ w: 6, h: 0.1, d: 136, x: x, y: 0.1, z: -118, color: 0x5b6270 }); });
    addMerged(roads, 'roads');
    // edificios por cuadrante
    var buildings = CMv.layoutBuildings(M), quad = [[], [], [], []], chunks = [];
    buildings.forEach(function (b) {
      var q = (b.x < 0 ? 0 : 1) + (b.z < -108 ? 2 : 0), c = PALETTE[b.color % PALETTE.length];
      quad[q].push({ w: b.w, h: b.h, d: b.d, x: b.x, y: b.h / 2, z: b.z, color: c });
      quad[q].push({ w: b.w + 0.3, h: 0.4, d: b.d + 0.3, x: b.x, y: b.h + 0.2, z: b.z, color: shade(c, 0.7) });
    });
    quad.forEach(function (parts, n) { chunks.push(addMerged(parts, 'chunk' + n)); });
    // sede, espejo, torre, letreros
    var hq = P.hq, tw = M.tower;
    var land = [
      { w: hq.w, h: hq.h, d: hq.d, x: hq.x, y: hq.h / 2, z: hq.z, color: 0x6fa3d8 }, { w: hq.w + 0.6, h: 0.6, d: hq.d + 0.6, x: hq.x, y: hq.h + 0.3, z: hq.z, color: 0x1f3a5f },
      { w: 3, h: 3, d: 0.3, x: hq.x, y: 1.5, z: hq.z + hq.d / 2 + 0.1, color: 0xffd76a },
      { w: 1.4, h: 2.4, d: 0.25, x: P.mirror.x, y: 1.2, z: P.mirror.z, color: 0x9be7ff }, { w: 1.7, h: 0.2, d: 0.5, x: P.mirror.x, y: 0.1, z: P.mirror.z, color: 0x5b6270 },
      { w: tw.w, h: tw.h, d: tw.d, x: tw.x, y: tw.h / 2, z: tw.z, color: 0x5b6270 }, { w: tw.w + 1, h: 1.2, d: tw.d + 1, x: tw.x, y: tw.h + 0.6, z: tw.z, color: 0xffd23f }
    ];
    addMerged(land, 'landmarks');
    // La Maraña: muros oscuros con letrero y una nube de partículas por muro
    var wallParts = [], marPts = [], wallMat = new THREE.PointsMaterial({ color: 0xb06cff, size: 0.11, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
    P.roads.forEach(function (r, n) {
      var w = r.wall, a = r.angle * Math.PI / 180, rot = -(a + Math.PI / 2);
      wallParts.push({ w: w.w, h: w.h, d: w.d, x: w.x, y: w.h / 2, z: w.z, color: 0x2a1f3d, rotY: rot });
      wallParts.push({ w: 3, h: 0.9, d: 0.2, x: w.x - Math.cos(a) * 1.2, y: 1.6, z: w.z - Math.sin(a) * 1.2, color: 0xffd76a, rotY: rot });
      var g = new THREE.BufferGeometry(), arr = new Float32Array(48 * 3), s = hash('w' + n);
      for (k = 0; k < 48; k++) { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; var u = s / 4294967296; s = (Math.imul(s, 1664525) + 1013904223) >>> 0; var v = s / 4294967296; arr[k * 3] = (u - 0.5) * 7; arr[k * 3 + 1] = v * 5; arr[k * 3 + 2] = ((u * 7 + v * 3) % 1 - 0.5) * 3; }
      g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
      var pts = new THREE.Points(g, wallMat); pts.position.set(w.x, 0, w.z); pts.rotation.y = rot; pts.frustumCulled = false; scene.add(pts); marPts.push(pts);
    });
    var walls = addMerged(wallParts, 'walls');
    // puente: cerrado (bloque oscuro) o abierto (tablones)
    var br = M.bridge;
    var bridgeClosed = addMerged([{ w: br.w, h: 3, d: br.d, x: br.x, y: 1.5, z: br.z, color: 0x2a1f3d }], 'bridgeClosed');
    var bridge = addMerged([{ w: br.w, h: 0.4, d: br.d, x: br.x, y: 0.2, z: br.z, color: 0xc4a46b }, { w: br.w + 0.4, h: 0.15, d: 0.6, x: br.x, y: 0.5, z: br.z + br.d / 2, color: 0xffd76a }], 'bridge');
    bridge.visible = false;

    // NPC: una malla por NPC con colores por vértice
    var npcs = [];
    function person(c1, c2, c3) {
      return [{ w: 0.5, h: 0.6, d: 0.28, x: 0, y: 1.0, z: 0, color: c1 }, { w: 0.2, h: 0.7, d: 0.22, x: -0.13, y: 0.35, z: 0, color: c2 }, { w: 0.2, h: 0.7, d: 0.22, x: 0.13, y: 0.35, z: 0, color: c2 },
        { w: 0.16, h: 0.55, d: 0.16, x: -0.36, y: 0.98, z: 0, color: c3 }, { w: 0.16, h: 0.55, d: 0.16, x: 0.36, y: 0.98, z: 0, color: c3 }, { w: 0.36, h: 0.36, d: 0.34, x: 0, y: 1.62, z: 0, color: c3 }];
    }
    function creatureParts(c) {
      return [{ w: 1.3, h: 1.2, d: 1.3, x: 0, y: 0.7, z: 0, color: c }, { w: 0.4, h: 0.8, d: 0.4, x: -0.4, y: 1.7, z: 0, color: shade(c, 0.7) }, { w: 0.4, h: 0.6, d: 0.4, x: 0.4, y: 1.6, z: 0.1, color: shade(c, 0.7) },
        { w: 0.25, h: 0.25, d: 0.1, x: -0.25, y: 0.9, z: 0.66, color: 0xffd23f }, { w: 0.25, h: 0.25, d: 0.1, x: 0.25, y: 0.9, z: 0.66, color: 0xffd23f }];
    }
    function addNpc(id, kind, x, z, parts, y0) {
      var m = new THREE.Mesh(T3.mergeBoxes(THREE, parts), litMat); m.position.set(x, 0, z); m.rotation.y = (hash(id) % 628) / 100; m.name = id;
      scene.add(m); var n = { id: id, kind: kind, mesh: m, baseY: 0, phase: (hash(id) % 628) / 100, x: x, z: z, y0: y0 || 0 }; npcs.push(n); return n;
    }
    var palSuit = [0x3d6fa8, 0xe07a5f, 0x6bb6d6, 0x9b8bd8, 0x81c784, 0xf2c14e], palSkin = [0xf1c9a5, 0xd9a273, 0xa86f46, 0x7b4a2d];
    addNpc(P.director.id, 'director', P.director.x, P.director.z, person(0xffd23f, 0x5b6270, palSkin[0]));
    M.mentors.forEach(function (m) { var h = hash(m.id); addNpc(m.id, 'mentor', m.x, m.z, person(palSuit[h % 6], 0x3b4252, palSkin[(h >> 3) % 4])); });
    M.creatures.forEach(function (c) { addNpc(c.id, 'creature', c.area.x, c.area.z, creatureParts(0x7a52c4)); });
    M.apprentices.forEach(function (a) { var h = hash(a.id); addNpc(a.id, 'apprentice', a.x, a.z, person(palSuit[(h >> 2) % 6], 0x6b4423, palSkin[(h >> 5) % 4])); });
    npcs.forEach(function (n) { if (n.kind === 'apprentice') n.mesh.visible = false; });

    // hero
    var heroRig = null;
    function makeHero(look) {
      if (heroRig) { scene.remove(heroRig.group); heroRig.dispose(); }
      heroRig = CH.create(THREE, look, opts.PARTS); scene.add(heroRig.group);
    }
    if (opts.PARTS) makeHero(opts.look);

    // grupos instanciados: sombras, estrellas, faroles, retos
    var dummy = new THREE.Object3D(), groups = {};
    var sh = new THREE.InstancedMesh(new THREE.CircleGeometry(0.55, 10).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25, depthWrite: false }), npcs.length + 1);
    npcs.forEach(function (n, j) { dummy.position.set(n.x, 0.03, n.z); dummy.scale.setScalar(n.kind === 'creature' ? 1.6 : 1); dummy.updateMatrix(); sh.setMatrixAt(j, dummy.matrix); });
    dummy.position.set(0, 0.03, 0); dummy.scale.setScalar(1); dummy.updateMatrix(); sh.setMatrixAt(npcs.length, dummy.matrix);
    scene.add(sh); groups.shadows = sh;
    var st = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.2, 0), new THREE.MeshBasicMaterial({ color: 0xffffff }), M.mentors.length);
    M.mentors.forEach(function (m, j) { dummy.position.set(m.x, 2.5, m.z); dummy.scale.setScalar(1); dummy.updateMatrix(); st.setMatrixAt(j, dummy.matrix); st.setColorAt(j, new THREE.Color(STAR_COL[0])); });
    scene.add(st); groups.stars = st;
    var lampSpots = []; for (i = 0; i < 8; i++) lampSpots.push([Math.cos(i * TAU / 8) * 20, Math.sin(i * TAU / 8) * 20]);
    var lm = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.35, 0), new THREE.MeshBasicMaterial({ color: 0xffffff }), 8);
    lampSpots.forEach(function (p, j) { dummy.position.set(p[0], 3.2, p[1]); dummy.scale.setScalar(1); dummy.updateMatrix(); lm.setMatrixAt(j, dummy.matrix); lm.setColorAt(j, new THREE.Color(0x3a3f55)); });
    scene.add(lm); groups.lamps = lm;
    var rp = new THREE.InstancedMesh((function () { var g = new THREE.BoxGeometry(0.9, 0.9, 0.9); g.clearGroups(); return g; })(), new THREE.MeshBasicMaterial({ color: 0xffffff }), M.repairs.length);
    M.repairs.forEach(function (r, j) { dummy.position.set(r.x, 0.6, r.z); dummy.scale.setScalar(1); dummy.updateMatrix(); rp.setMatrixAt(j, dummy.matrix); rp.setColorAt(j, new THREE.Color(0xe07a5f)); });
    scene.add(rp); groups.repairs = rp;
    // partículas de disolución (una sola, reutilizada)
    var dg = new THREE.BufferGeometry(), da = new Float32Array(40 * 3);
    for (k = 0; k < 40; k++) { da[k * 3] = Math.cos(k * 2.4) * 0.8; da[k * 3 + 1] = (k % 8) * 0.25; da[k * 3 + 2] = Math.sin(k * 2.4) * 0.8; }
    dg.setAttribute('position', new THREE.BufferAttribute(da, 3));
    var particles = new THREE.Points(dg, new THREE.PointsMaterial({ color: 0xb06cff, size: 0.12, transparent: true, opacity: 1, blending: THREE.AdditiveBlending, depthWrite: false }));
    particles.visible = false; particles.frustumCulled = false; scene.add(particles);

    var lastFlags = null, colorTmp = new THREE.Color();
    function applyFlags(f) {
      if (!f || f === lastFlags) return;
      lastFlags = f;
      npcs.forEach(function (n) {
        if (n.dissolved && n.kind === 'creature' && !(f.beatenToday && f.beatenToday[n.id])) n.dissolved = false;
        if (n.kind === 'creature') n.mesh.visible = !(f.beatenToday && f.beatenToday[n.id]) && !n.dissolved;
        else if (n.kind === 'apprentice') n.mesh.visible = !!(f.apprenticesVisible && f.apprenticesVisible[n.id]);
      });
      M.mentors.forEach(function (m, j) { var s = (f.stars && f.stars[m.id]) | 0; st.setColorAt(j, colorTmp.setHex(STAR_COL[Math.max(0, Math.min(3, s))])); });
      if (st.instanceColor) st.instanceColor.needsUpdate = true;
      for (var j = 0; j < 8; j++) lm.setColorAt(j, colorTmp.setHex(j < (f.lit | 0) ? 0xffe066 : 0x3a3f55));
      if (lm.instanceColor) lm.instanceColor.needsUpdate = true;
      M.repairs.forEach(function (r, j) { rp.setColorAt(j, colorTmp.setHex(f.repairs && f.repairs[r.id] ? 0x81c784 : 0xe07a5f)); });
      if (rp.instanceColor) rp.instanceColor.needsUpdate = true;
      var rest = !!f.restored;
      bridge.visible = rest; bridgeClosed.visible = !rest;
      var bg = rest ? SKY : SKY_DARK; scene.background.setHex(bg); scene.fog.color.setHex(bg);
    }

    function dispose() { T3.disposeScene(scene); }
    return { scene: scene, camera: camera, chunks: chunks, npcs: npcs, groups: groups, particles: particles, walls: walls, marPts: marPts, bridge: bridge, bridgeClosed: bridgeClosed,
      getHero: function () { return heroRig; }, setHero: makeHero, applyFlags: applyFlags, dispose: dispose };
  }

  function create(THREE, canvas, D, opts) {
    opts = opts || {};
    var reduced = !!opts.reducedMotion;
    var B = buildWorld(THREE, D, opts);
    var renderer = opts.renderer || new THREE.WebGLRenderer({ canvas: canvas, antialias: false });
    var raf = opts.raf || function (cb) { return requestAnimationFrame(cb); };
    var caf = opts.caf || function (id) { cancelAnimationFrame(id); };
    var pixelRatio = opts.pixelRatio !== undefined ? opts.pixelRatio : (typeof devicePixelRatio !== 'undefined' ? devicePixelRatio : 1);
    var search = opts.search !== undefined ? opts.search : (typeof location !== 'undefined' ? location.search : '');
    renderer.setPixelRatio(Math.min(pixelRatio, 1.5));
    if (renderer.setClearColor) renderer.setClearColor(SKY_DARK);
    var pauser = T3.Pauser(), pending = null, wantFrame = false, disposed = false, time = 0, dis = null, encTimer = null, encRes = null;
    var npcById = {}; B.npcs.forEach(function (n) { npcById[n.id] = n; });
    var dummy = new THREE.Object3D(), target = new THREE.Vector3();
    var fpsEl = null, fpsAcc = 0, fpsN = 0;
    if (/fps=1/.test(search) && canvas.parentNode && typeof document !== 'undefined') {
      fpsEl = document.createElement('div'); fpsEl.id = 'city-fps'; fpsEl.style.cssText = 'position:absolute;left:8px;bottom:8px;font:12px monospace;color:#5ce1ff;pointer-events:none;z-index:9';
      canvas.parentNode.appendChild(fpsEl);
    }
    function fit(force) {
      var w = canvas.clientWidth, h = canvas.clientHeight;
      if (!force && (!w || !h)) return;
      w = w || 1; h = h || 1;
      renderer.setSize(w, h, false);
      B.camera.aspect = w / h;
      if (h > w) B.camera.setViewOffset(w, h, 0, -Math.round(h * 0.16), w, h); else B.camera.clearViewOffset();   // vertical: el héroe en el tercio inferior
      B.camera.updateProjectionMatrix();
    }
    fit(true);

    function update(s, dt) {
      var hr = B.getHero(), h = s.hero, c = s.cam;
      B.applyFlags(s.flags);
      if (hr && h) {
        hr.group.position.set(h.x, 0, h.z); hr.group.rotation.y = h.yaw + Math.PI;
        hr.setPose(reduced ? 0 : h.speed, time / 1000);
        dummy.position.set(h.x, 0.03, h.z); dummy.scale.setScalar(1); dummy.updateMatrix(); B.groups.shadows.setMatrixAt(B.npcs.length, dummy.matrix); B.groups.shadows.instanceMatrix.needsUpdate = true;
      }
      if (h && c) {
        var ch = Math.cos(c.pitch), a = c.arm;
        target.set(h.x, 1.6, h.z);
        B.camera.position.set(h.x + Math.sin(c.yaw) * ch * a, Math.max(0.5, 1.6 + Math.sin(c.pitch) * a), h.z + Math.cos(c.yaw) * ch * a);
        B.camera.lookAt(target);
      }
      if (!reduced) {
        B.npcs.forEach(function (n) { n.mesh.position.y = Math.sin(time / 500 + n.phase) * 0.05; });
        B.marPts.forEach(function (p) { p.rotation.z = Math.sin(time / 1500) * 0.03; p.position.y = Math.sin(time / 700 + p.position.x) * 0.15; });
      }
      if (dis) {
        dis.t += dt;
        var k = Math.min(1, dis.t / 700);
        B.particles.scale.setScalar(1 + k * 1.5); B.particles.material.opacity = 1 - k;
        if (k >= 1) { B.particles.visible = false; dis.n.mesh.visible = false; dis.n.dissolved = true; dis = null; }
      }
    }
    function requestFrame() { if (disposed || pending !== null) return; pending = raf(loop); }
    function loop(ts) {
      pending = null;
      if (disposed) return;
      var running = pauser.running();
      if (!running && !wantFrame) return;
      wantFrame = false;
      var dt = running ? pauser.tick(ts) : 0;
      time += dt;
      if (opts.tick) opts.tick(dt);
      if (disposed) return;
      var s = opts.state ? opts.state() : null;
      if (s) update(s, dt);
      renderer.render(B.scene, B.camera);
      if (fpsEl && dt) { fpsAcc += 1000 / dt; fpsN++; if (fpsN >= 30) { var inf = renderer.info.render; fpsEl.textContent = Math.round(fpsAcc / fpsN) + ' fps · ' + inf.calls + ' calls · ' + inf.triangles + ' tris'; fpsAcc = 0; fpsN = 0; } }
      if (pauser.running() || wantFrame) requestFrame();
    }
    function frameNow() { wantFrame = true; requestFrame(); }

    function resize() { if (disposed || pauser.has('suspended')) return; fit(false); frameNow(); }
    function setPaused(reason, on) {
      if (disposed) return;
      var was = pauser.running();
      pauser.set(reason, on);
      if (!was && pauser.running()) frameNow();
    }
    function dissolve(id) {
      var n = npcById[id]; if (disposed || !n) return;
      B.particles.position.set(n.x, 0.2, n.z); B.particles.scale.setScalar(1); B.particles.material.opacity = 1; B.particles.visible = true;
      dis = { n: n, t: 0 }; frameNow();
    }
    function encounter(id) {
      if (disposed || !npcById[id]) return Promise.resolve();
      return new Promise(function (res) { encRes = res; encTimer = setTimeout(function () { encTimer = null; encRes = null; res(); }, reduced ? 0 : 350); });
    }
    function setLook(look) { if (disposed || !opts.PARTS) return; B.setHero(look); frameNow(); }
    function dispose() {
      if (disposed) return;
      disposed = true;
      if (pending !== null) { caf(pending); pending = null; }
      if (encTimer) { clearTimeout(encTimer); encTimer = null; }
      if (encRes) { encRes(); encRes = null; }
      B.dispose();
      renderer.dispose();
      try { renderer.forceContextLoss(); } catch (e) {}
      if (fpsEl && fpsEl.parentNode) fpsEl.parentNode.removeChild(fpsEl);
    }
    var api = { resize: resize, setPaused: setPaused, dispose: dispose, encounter: encounter, dissolve: dissolve, setLook: setLook };

    return T3.compileOrLost(renderer, B.scene, B.camera, canvas).then(function () {
      frameNow();
      return api;
    }, function (err) {
      dispose();
      throw err;
    });
  }

  return { create: create, buildWorld: buildWorld };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = CityWorld;
