// Pruebas de trip/scene.js con el Three r169 real, sin WebGL (renderer, raf y canvas falsos).
const path = require('path');
const { pathToFileURL } = require('url');
const results = [];
const ok = (name, cond, extra) => { results.push([cond ? 'PASS' : 'FAIL', name, extra || '']); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const THREE = await import(pathToFileURL(path.join(__dirname, '..', 'vendor', 'three.module.min.js')).href);
  const { stations } = await import(pathToFileURL(path.join(__dirname, '..', 'city', 'districts', 'm08_route.mjs')).href);
  const S = require('../trip/scene.js');

  // ---- buildWorld ----
  const W = S.buildWorld(THREE, stations);
  ok('a buildWorld devuelve 10 stops crecientes en [0,1]', W.stops.length === 10 && W.stops.every((t, i) => t >= 0 && t <= 1 && (i === 0 || t > W.stops[i - 1])), JSON.stringify(W.stops));
  W.rings.forEach((r) => { r.visible = true; });
  const drawn = []; W.scene.traverseVisible((o) => { if (o.isMesh || o.isLine || o.isPoints) drawn.push(o); });
  let tris = 0;
  for (const o of drawn) if (o.isMesh) { const g = o.geometry; tris += (g.index ? g.index.count : g.attributes.position.count) / 3 * (o.isInstancedMesh ? o.count : 1); }
  ok('b triángulos <= 30000', tris > 0 && tris <= 30000, 'tris=' + tris);
  ok('c objetos dibujables <= 100 (draw calls)', drawn.length > 0 && drawn.length <= 100, 'n=' + drawn.length);
  ok('c2 hay al menos 1 InstancedMesh', drawn.some((o) => o.isInstancedMesh));
  ok('c3 sin arreglos de materiales ni transparentes DoubleSide', drawn.every((o) => !Array.isArray(o.material) && !(o.material.transparent && o.material.side === THREE.DoubleSide)));
  const mats = new Set(), geos = new Set(); let lights = 0;
  W.scene.traverse((o) => { if (o.isLight) lights++; if (o.material) mats.add(o.material); if (o.geometry) geos.add(o.geometry); });
  ok('d ningún material con map y solo Basic/Line/Points', [...mats].every((m) => !m.map && (m.isMeshBasicMaterial || m.isLineBasicMaterial || m.isPointsMaterial)));
  ok('d no hay luces', lights === 0);
  ok('d2 background 0x0b1220 y fog', W.scene.background && W.scene.background.getHex() === 0x0b1220 && W.scene.fog && W.scene.fog.isFog);
  const pts = drawn.filter((o) => o.isPoints), edges = drawn.filter((o) => o.isLineSegments && o.geometry.type === 'EdgesGeometry');
  ok('d3 exactamente 1 Points con 200 vértices y blending aditivo', pts.length === 1 && pts[0].geometry.attributes.position.count === 200 && pts[0].material.blending === THREE.AdditiveBlending);
  ok('d3 al menos 3 LineSegments con EdgesGeometry', edges.length >= 3, 'n=' + edges.length);
  ok('e como mucho 12 materiales únicos', mats.size <= 12, 'n=' + mats.size);

  // (f) dispose libera todo, incluida la geometría de cada InstancedMesh
  { const gd = new Set(), md = new Set();
    const og = THREE.BufferGeometry.prototype.dispose, om = THREE.Material.prototype.dispose;
    THREE.BufferGeometry.prototype.dispose = function () { gd.add(this); return og.call(this); };
    THREE.Material.prototype.dispose = function () { md.add(this); return om.call(this); };
    W.dispose();
    THREE.BufferGeometry.prototype.dispose = og; THREE.Material.prototype.dispose = om;
    ok('f dispose libera todas las geometrías', [...geos].every((g) => gd.has(g)), `${gd.size}/${geos.size}`);
    ok('f dispose libera todos los materiales', [...mats].every((m) => md.has(m)), `${md.size}/${mats.size}`);
    const inst = drawn.filter((o) => o.isInstancedMesh);
    ok('f la geometría de cada InstancedMesh se liberó', inst.length > 0 && inst.every((o) => gd.has(o.geometry))); }

  // buildWorld usa stations.length (no un 10 fijo)
  { const fake = Array.from({ length: 12 }, (_, i) => Object.assign({}, stations[i % 10], { id: 'X' + i }));
    const W2 = S.buildWorld(THREE, fake);
    ok('a2 buildWorld con 12 estaciones: 12 stops crecientes', W2.stops.length === 12 && W2.stops.every((t, i) => i === 0 || t > W2.stops[i - 1]) && W2.stops[11] === 1, JSON.stringify(W2.stops.length));
    W2.dispose(); }

  // ---- Pauser ----
  { const P = S.Pauser();
    ok('g Pauser corre sin motivos', P.running());
    P.set('sheet', true); P.set('hidden', true); P.set('hidden', false);
    ok('g con "sheet" activo sigue en pausa aunque "hidden" se quite', !P.running());
    P.set('sheet', false);
    ok('g sin motivos vuelve a correr', P.running());
    const P2 = S.Pauser(); P2.tick(1000);
    ok('h el segundo tick limita dt a 50', P2.tick(5000) === 50);
    P2.set('sheet', true); P2.set('sheet', false);
    ok('i tras reanudar el primer tick devuelve 16', P2.tick(9000) === 16); }

  // ---- create() con renderer, raf y canvas falsos ----
  function fakes(over = {}) {
    const f = { pend: new Map(), nextId: 1, maxPend: 0, rafCalls: 0, cafCalls: [], listeners: {}, rend: { pr: [], size: [], renders: 0, compiles: 0, disposed: 0, ctxLost: 0, info: { render: { calls: 0 } } } };
    f.raf = (cb) => { f.rafCalls++; const id = f.nextId++; f.pend.set(id, cb); f.maxPend = Math.max(f.maxPend, f.pend.size); return id; };
    f.caf = (id) => { f.cafCalls.push(id); f.pend.delete(id); };
    f.run = (ts) => { const [id, cb] = [...f.pend][0]; f.pend.delete(id); cb(ts || 16); };
    f.canvas = { clientWidth: 400, clientHeight: 800, parentNode: null, addEventListener(t, fn) { f.listeners[t] = fn; }, removeEventListener(t) { delete f.listeners[t]; }, setPointerCapture() {} };
    Object.assign(f.rend, { setPixelRatio(v) { f.rend.pr.push(v); }, setSize(w, h, u) { f.rend.size.push([w, h, u]); }, render() { f.rend.renders++; }, dispose() { f.rend.disposed++; }, forceContextLoss() { f.rend.ctxLost++; }, setClearColor() {},
      compileAsync() { f.rend.compiles++; return over.neverCompile ? new Promise(() => {}) : Promise.resolve(); } });
    f.opts = { reducedMotion: true, renderer: f.rend, raf: f.raf, caf: f.caf, pixelRatio: 3, search: '' };
    return f;
  }
  { const f = fakes();
    const api = await S.create(THREE, f.canvas, stations, f.opts);
    ok('f2 create resuelve', !!api && typeof api.goTo === 'function' && typeof api.dispose === 'function');
    ok('f2 setPixelRatio recibió 1.5 y setSize (400, 800, false)', f.rend.pr[0] === 1.5 && JSON.stringify(f.rend.size[0]) === JSON.stringify([400, 800, false]), JSON.stringify([f.rend.pr, f.rend.size]));
    ok('f2 compileAsync se llamó antes de resolver', f.rend.compiles === 1);
    ok('f2 el listener webglcontextlost de la carrera ya no está', !f.listeners.webglcontextlost);
    ok('f2 hay listeners de puntero en el canvas', !!f.listeners.pointerdown && !!f.listeners.pointermove);
    const arrived = await api.goTo(3);
    ok('f2 goTo(3) resuelve (reducedMotion)', arrived === undefined);
    api.look(1000, 1000); api.look(-1000, -1000);
    ok('f2 look() fuera de rango no lanza', true);
    f.run();                                           // vacía el cuadro pendiente
    api.setPaused('sheet', true);
    let r0 = f.rend.renders;
    ok('f2 pausado y sin pendientes: ningún rAF agendado', f.pend.size === 0);
    api.resize();
    ok('f2 resize() en pausa pide un cuadro', f.pend.size === 1 && f.rend.renders === r0);
    f.run();
    ok('f2 resize() en pausa sube en 1 las llamadas a render y no agenda otro', f.rend.renders === r0 + 1 && f.pend.size === 0, `renders ${r0}→${f.rend.renders}`);
    ok('f2 resize() hizo setSize(400, 800, false)', JSON.stringify(f.rend.size[f.rend.size.length - 1]) === JSON.stringify([400, 800, false]));
    r0 = f.rend.renders; api.setPaused('sheet', false);
    ok('f2 setPaused("sheet", false) agenda un rAF', f.pend.size === 1);
    f.run();
    ok('f2 al ejecutarlo dibuja (render +1)', f.rend.renders === r0 + 1);
    api.setPaused('sheet', true); r0 = f.rend.renders; api.lost();
    f.run();
    ok('f2 lost() en pausa pide un cuadro (render +1)', f.rend.renders === r0 + 1 && f.pend.size === 0);
    await wait(700);
    ok('f2 al terminar lost() vuelve a pedir un cuadro para restaurar colores', f.pend.size === 1);
    f.run();
    api.setPaused('sheet', false); const idPend = [...f.pend.keys()][0];
    api.dispose();
    ok('f2 dispose() llama a caf con el rAF pendiente', f.cafCalls.includes(idPend));
    ok('f2 dispose() llama a renderer.dispose y forceContextLoss', f.rend.disposed === 1 && f.rend.ctxLost === 1);
    ok('f2 dispose() quita los listeners de puntero', !f.listeners.pointerdown && !f.listeners.pointermove);
    const calls0 = f.rafCalls; api.setPaused('x', true); api.setPaused('x', false); api.resize(); api.lost();
    ok('f2 tras dispose() ningún rAF más', f.rafCalls === calls0 && f.pend.size === 0);
    ok('f2 nunca hubo más de 1 rAF pendiente', f.maxPend <= 1, 'max=' + f.maxPend);
    ok('f2 dispose() es idempotente', (api.dispose(), f.rend.disposed === 1)); }

  // (f4) sin reducedMotion, goTo anima y resuelve al llegar
  { const f = fakes(); f.opts.reducedMotion = false;
    const api = await S.create(THREE, f.canvas, stations, f.opts);
    let done = false; const p = api.goTo(2).then(() => { done = true; });
    f.run(1000);
    ok('f4 goTo animado no resuelve en el primer cuadro', !done);
    for (let t = 1016, i = 0; i < 200 && !done; i++, t += 16) { if (f.pend.size) f.run(t); await Promise.resolve(); }
    await p;
    ok('f4 goTo animado resuelve al llegar', done);
    ok('f4 mientras corre sigue habiendo un solo rAF pendiente', f.maxPend <= 1, 'max=' + f.maxPend);
    api.dispose(); }

  // (f3) el contexto se pierde durante la compilación
  { const f = fakes({ neverCompile: true });
    const pr = S.create(THREE, f.canvas, stations, f.opts);
    await wait(10);
    f.listeners.webglcontextlost({ target: f.canvas });
    let rejected = false; await pr.catch(() => { rejected = true; });
    ok('f3 create rechaza si se pierde el contexto compilando', rejected);
    ok('f3 se llamó a renderer.dispose', f.rend.disposed >= 1);
    ok('f3 el listener webglcontextlost se quitó', !f.listeners.webglcontextlost); }

  // opciones por defecto con guarda typeof (en Node no existen devicePixelRatio ni location)
  { const f = fakes(); delete f.opts.pixelRatio; delete f.opts.search;
    const api = await S.create(THREE, f.canvas, stations, f.opts);
    ok('defaults sin devicePixelRatio ni location: pixelRatio 1', f.rend.pr[0] === 1);
    api.dispose(); }

  results.forEach((r) => console.log(r.join(' | ')));
  const fails = results.filter((r) => r[0] === 'FAIL').length;
  console.log(fails ? `\n${fails} FALLOS` : '\nSCENE OK (' + results.length + ' comprobaciones)');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('EXCEPCIÓN', e && e.message); results.forEach((r) => console.log(r.join(' | '))); process.exit(2); });
