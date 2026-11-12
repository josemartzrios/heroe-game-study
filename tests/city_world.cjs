// city/world.js con el Three r169 real, sin WebGL (renderer, raf y canvas falsos): presupuesto gráfico y ciclo de vida.
const path = require('path');
const fs = require('fs');
const vm = require('vm');
const { pathToFileURL } = require('url');
const results = [];
const ok = (name, cond, extra) => { results.push([cond ? 'PASS' : 'FAIL', name, extra || '']); };

(async () => {
  const THREE = await import(pathToFileURL(path.join(__dirname, '..', 'vendor', 'three.module.min.js')).href);
  const D = (await import(pathToFileURL(path.join(__dirname, '..', 'city', 'districts.mjs')).href)).city;
  const html = fs.readFileSync(path.join(__dirname, '..', 'engine.html'), 'utf8');
  const PARTS = vm.runInNewContext('(' + html.match(/var PARTS = (\{[\s\S]*?\n  \});/)[1] + ')');
  const W = require('../city/world.js');
  const look = { skin: 1, suit: 1, head: 4, eyes: 0, emblem: 0, cape: 1, hand: 0 };

  const B = W.buildWorld(THREE, D, { look, PARTS, portrait: true });
  const drawn = []; B.scene.traverseVisible((o) => { if (o.isMesh || o.isLine || o.isPoints) drawn.push(o); });
  let tris = 0;
  for (const o of drawn) if (o.isMesh) { const g = o.geometry; tris += (g.index ? g.index.count : g.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1); }
  ok('a triángulos <= 80000', tris > 0 && tris <= 80000, 'tris=' + tris);
  ok('a2 dibujables <= 150', drawn.length > 0 && drawn.length <= 150, 'n=' + drawn.length);
  ok('a3 sin groups ni arreglos de materiales', drawn.every((o) => !Array.isArray(o.material) && !(o.geometry.groups && o.geometry.groups.length)));
  ok('b cada NPC es 1 malla (42)', B.npcs.length === 42 && B.npcs.every((n) => n.mesh.isMesh && !n.mesh.children.length), String(B.npcs.length));
  const inst = drawn.filter((o) => o.isInstancedMesh);
  ok('c sombras, indicadores y faroles: >= 3 InstancedMesh', inst.length >= 3 && !!B.groups.shadows && !!B.groups.stars && !!B.groups.lamps && B.groups.lamps.material.isMeshBasicMaterial, String(inst.length));
  let lights = 0, pl = 0; B.scene.traverse((o) => { if (o.isLight) lights++; if (o.isPointLight) pl++; });
  ok('c2 hay luces hemisférica y direccional y 0 PointLight', lights === 2 && pl === 0, lights + '/' + pl);
  const mats = new Set(); B.scene.traverse((o) => { if (o.material) mats.add(o.material); });
  ok('d materiales solo Lambert/Basic/Points/LineBasic y sin transparent+DoubleSide', [...mats].every((m) => (m.isMeshLambertMaterial || m.isMeshBasicMaterial || m.isPointsMaterial || m.isLineBasicMaterial) && !(m.transparent && m.side === THREE.DoubleSide)));
  ok('e camera.far 55..70, fog.far ≈ 62, FOV 70', B.camera.far >= 55 && B.camera.far <= 70 && Math.abs(B.scene.fog.far - 62) < 1e-9 && B.camera.fov === 70);
  ok('f edificios en 4 a 9 mallas', B.chunks.length >= 4 && B.chunks.length <= 9, String(B.chunks.length));
  const pts = []; B.scene.traverse((o) => { if (o.isPoints) pts.push(o); });
  ok('g Maraña: un Points por muro (10 + 1 de disolución), <= 60 partículas, size <= 0.12, aditivo', pts.length === 11 && pts.every((p) => p.geometry.attributes.position.count <= 60 && p.material.size <= 0.12 && p.material.blending === THREE.AdditiveBlending && p.material.depthWrite === false));
  { let g = 0, m = 0; const gs = new Set(), ms = new Set(); B.scene.traverse((o) => { if (o.geometry) gs.add(o.geometry); if (o.material) ms.add(o.material); });
    gs.forEach((x) => { const d = x.dispose.bind(x); x.dispose = () => { g++; d(); }; }); ms.forEach((x) => { const d = x.dispose.bind(x); x.dispose = () => { m++; d(); }; });
    B.dispose();
    ok('h dispose libera todas las geometrías y materiales', g === gs.size && m === ms.size && g > 20, g + '/' + gs.size + ' ' + m + '/' + ms.size); }

  // ---- create ----
  function fakes() {
    const f = { pend: new Map(), nextId: 1, maxPend: 0, rafCalls: 0, listeners: {}, rend: { size: [], renders: 0, disposed: 0, ctxLost: 0, info: { render: { calls: 0, triangles: 0 } } }, order: [] };
    f.raf = (cb) => { f.rafCalls++; const id = f.nextId++; f.pend.set(id, cb); f.maxPend = Math.max(f.maxPend, f.pend.size); return id; };
    f.caf = (id) => { f.pend.delete(id); };
    f.run = (ts) => { const [id, cb] = [...f.pend][0]; f.pend.delete(id); cb(ts); };
    f.canvas = { clientWidth: 390, clientHeight: 844, parentNode: null, addEventListener(t, fn) { f.listeners[t] = fn; }, removeEventListener(t) { delete f.listeners[t]; } };
    Object.assign(f.rend, { setPixelRatio() {}, setSize(w, h, u) { f.rend.size.push([w, h, u]); }, render() { f.rend.renders++; f.order.push('render'); }, dispose() { f.rend.disposed++; }, forceContextLoss() { f.rend.ctxLost++; }, setClearColor() {}, compileAsync() { return Promise.resolve(); } });
    f.state = { hero: { x: 0, z: 8, yaw: 0, speed: 0 }, cam: { yaw: 0, pitch: 0.26, arm: 6 }, flags: { beatenToday: {}, repairs: {}, apprenticesVisible: {}, stars: {}, restored: false, lit: 0 } };
    f.opts = { renderer: f.rend, raf: f.raf, caf: f.caf, pixelRatio: 2, search: '', portrait: true, look, PARTS, reducedMotion: false, tick: (dt) => { f.order.push('tick'); }, state: () => { f.order.push('state'); return f.state; } };
    return f;
  }
  { const f = fakes();
    const api = await W.create(THREE, f.canvas, D, f.opts);
    ok('i create resuelve con el contrato', ['resize', 'setPaused', 'dispose', 'encounter', 'dissolve', 'setLook'].every((k) => typeof api[k] === 'function'));
    ok('i2 hay un rAF pendiente tras crear', f.pend.size === 1);
    f.run(100); f.run(116);
    ok('i3 un cuadro: tick, luego state y luego render', f.order.slice(0, 3).join() === 'tick,state,render', f.order.join());
    ok('i4 nunca más de un rAF pendiente', f.maxPend === 1);
    api.setPaused('sheet', true);
    const before = f.rafCalls; if (f.pend.size) f.run(200);
    ok('i5 en pausa no se agenda ningún rAF', f.pend.size === 0 && f.rafCalls <= before + 0);
    api.setPaused('sheet', false);
    ok('i6 al reanudar vuelve a haber un rAF', f.pend.size === 1);
    f.run(300);
    api.setPaused('suspended', true);
    const s0 = f.rend.size.length; api.resize();
    ok('j resize() con la ciudad suspendida no llama a setSize', f.rend.size.length === s0);
    api.setPaused('suspended', false);
    f.canvas.clientWidth = 0; f.canvas.clientHeight = 0; const s1 = f.rend.size.length; api.resize();
    ok('j2 resize() con canvas 0×0 no llama a setSize', f.rend.size.length === s1);
    f.canvas.clientWidth = 390; f.canvas.clientHeight = 844; api.resize();
    ok('j3 resize() normal sí redimensiona', JSON.stringify(f.rend.size[f.rend.size.length - 1]) === JSON.stringify([390, 844, false]));
    f.state.flags.restored = true; f.state.flags.lit = 3; f.state.flags.apprenticesVisible = { a01: 1 }; f.state.flags.beatenToday = { bit: 1 };
    if (!f.pend.size) api.setPaused('x', false); f.run(400);
    ok('k un cuadro con flags nuevas no lanza', true);
    api.dissolve('bit'); api.setLook(look); api.dissolve('nada');
    ok('k2 dissolve y setLook no lanzan', true);
    api.dispose(); api.dispose();
    ok('l dispose: renderer.dispose y forceContextLoss una vez, sin rAF pendiente', f.rend.disposed === 1 && f.rend.ctxLost === 1 && f.pend.size === 0);
    const r1 = f.rafCalls; api.setPaused('a', true); api.setPaused('a', false); api.resize();
    ok('l2 tras dispose ningún rAF más', f.rafCalls === r1 && f.pend.size === 0); }
  { const f = fakes(); f.rend.compileAsync = () => new Promise(() => {});
    const p = W.create(THREE, f.canvas, D, f.opts).then(() => 'ok', (e) => 'err:' + e.message);
    await new Promise((r) => setTimeout(r, 0)); f.listeners.webglcontextlost && f.listeners.webglcontextlost();
    const r = await p;
    ok('m contexto perdido durante la compilación: rechaza y libera', /err/.test(r) && f.rend.disposed === 1 && f.rend.ctxLost === 1, r); }
  { const f = fakes(); f.opts.search = '?fps=1'; const parent = { children: [], appendChild(e) { this.children.push(e); e.parentNode = this; }, removeChild(e) { this.children = this.children.filter((x) => x !== e); } };
    f.canvas.parentNode = parent; global.document = { createElement: () => ({ style: {}, id: '' }) };
    const api = await W.create(THREE, f.canvas, D, f.opts);
    ok('n ?fps=1 agrega el div y dispose lo quita', parent.children.length === 1 && (api.dispose(), parent.children.length === 0));
    delete global.document; }

  results.forEach((r) => { if (r[0] === 'FAIL') console.log(r.join(' | ')); });
  const fails = results.filter((r) => r[0] === 'FAIL').length;
  console.log(fails ? fails + ' FALLOS' : 'CITY_WORLD OK (' + results.length + ')'); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
