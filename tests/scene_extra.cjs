// Más pruebas de trip/scene.js con el Three r169 real y sin WebGL: medidor de fps, anillos (setLayers) con y sin
// animación, goTo encadenado, lost() con colores, arrastre con puntero y pausa durante un viaje.
const path = require('path');
const { pathToFileURL } = require('url');
const { JSDOM } = require('jsdom');
const results = [];
const ok = (name, cond, extra) => { results.push([cond ? 'PASS' : 'FAIL', name, extra || '']); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const THREE = await import(pathToFileURL(path.join(__dirname, '..', 'vendor', 'three.module.min.js')).href);
  const { stations } = await import(pathToFileURL(path.join(__dirname, '..', 'trip', 'stations.mjs')).href);
  const S = require('../trip/scene.js');

  // Renderer, rAF y canvas falsos; render() guarda la escena y la cámara para inspeccionarlas
  function fakes(over = {}) {
    const f = { pend: new Map(), nextId: 1, maxPend: 0, listeners: {}, scene: null, camera: null, rend: { renders: 0, info: { render: { calls: 7 } } } };
    f.raf = (cb) => { const id = f.nextId++; f.pend.set(id, cb); f.maxPend = Math.max(f.maxPend, f.pend.size); return id; };
    f.caf = (id) => { f.pend.delete(id); };
    f.run = (ts) => { const [id, cb] = [...f.pend][0]; f.pend.delete(id); cb(ts); };
    f.canvas = { clientWidth: 400, clientHeight: 800, parentNode: over.parent || null, addEventListener(t, fn) { f.listeners[t] = fn; }, removeEventListener(t) { delete f.listeners[t]; }, setPointerCapture() {} };
    Object.assign(f.rend, { setPixelRatio() {}, setSize() {}, setClearColor() {}, dispose() {}, forceContextLoss() {},
      render(s, c) { f.rend.renders++; f.scene = s; f.camera = c; }, compileAsync(s, c) { f.scene = s; f.camera = c; return Promise.resolve(); } });
    f.opts = { reducedMotion: over.reduced !== undefined ? over.reduced : true, renderer: f.rend, raf: f.raf, caf: f.caf, pixelRatio: 1, search: over.search || '' };
    return f;
  }
  const packetOf = (scene) => scene.children.find((o) => o.isGroup);
  const ringsOf = (scene) => packetOf(scene).children.filter((o) => o.geometry && o.geometry.type === 'TorusGeometry');
  // corre cuadros de 16 ms mientras haya uno pendiente (como mucho n)
  async function frames(f, t0, n) { let t = t0; for (let i = 0; i < n && f.pend.size; i++, t += 16) { f.run(t); await Promise.resolve(); } return t; }

  // ---- (a) medidor de fps con ?fps=1 ----
  { const dom = new JSDOM('<div id="trip-root"><canvas></canvas></div>');
    global.document = dom.window.document;
    const parent = dom.window.document.getElementById('trip-root');
    const f = fakes({ parent, search: '?fps=1', reduced: false });
    const api = await S.create(THREE, f.canvas, stations, f.opts);
    const el = parent.querySelector('#trip-fps');
    ok('a con search "?fps=1" se agrega #trip-fps al padre del canvas', !!el);
    ok('a #trip-fps no captura el puntero', !!el && /pointer-events:\s*none/.test(el.style.cssText));
    ok('a antes de 30 cuadros el medidor está vacío', !!el && el.textContent === '');
    await frames(f, 1000, 31);
    ok('a tras 30 cuadros de 16 ms muestra "63 fps · 7 calls"', !!el && el.textContent === '63 fps · 7 calls', el && JSON.stringify(el.textContent));
    api.dispose();
    ok('a dispose() quita #trip-fps', !parent.querySelector('#trip-fps'));
    delete global.document; }

  { const dom = new JSDOM('<div id="trip-root"><canvas></canvas></div>');
    global.document = dom.window.document;
    const parent = dom.window.document.getElementById('trip-root');
    const f = fakes({ parent, search: '?x=2&fps=0' });
    const api = await S.create(THREE, f.canvas, stations, f.opts);
    ok('a2 con "fps=0" no hay #trip-fps', !parent.querySelector('#trip-fps'));
    api.dispose();
    const f2 = fakes({ parent: null, search: '?fps=1' });
    let threw = null; try { (await S.create(THREE, f2.canvas, stations, f2.opts)).dispose(); } catch (e) { threw = e; }
    ok('a3 "?fps=1" con un canvas sin padre no lanza', !threw, threw && threw.message);
    delete global.document; }

  // ---- (b) setLayers con reducedMotion: aparecen sin animar ----
  { const f = fakes({ reduced: true });
    const api = await S.create(THREE, f.canvas, stations, f.opts);
    const R = ringsOf(f.scene);
    ok('b hay 4 anillos ocultos al empezar', R.length === 4 && R.every((r) => !r.visible));
    api.setLayers(3);
    ok('b reducedMotion: setLayers(3) muestra 3 anillos a escala 1 sin esperar cuadros', R.slice(0, 3).every((r) => r.visible && r.scale.x === 1) && !R[3].visible, R.map((r) => r.visible + ':' + r.scale.x).join(','));
    await frames(f, 1000, 5);
    ok('b reducedMotion: tras dibujar no queda rAF pendiente', f.pend.size === 0);
    api.setLayers(1);
    ok('b reducedMotion: setLayers(1) deja solo el primero', R[0].visible && !R[1].visible && !R[2].visible && !R[3].visible);
    api.setLayers(0);
    ok('b setLayers(0) oculta todos', R.every((r) => !r.visible));
    api.setLayers(9);
    ok('b setLayers(9) (más de 4) muestra los 4 sin lanzar', R.every((r) => r.visible));
    api.setLayers(-1);
    ok('b setLayers(-1) los oculta todos', R.every((r) => !r.visible));
    api.dispose(); }

  // ---- (c) setLayers con animación: crecen en ~400 ms ----
  { const f = fakes({ reduced: false });
    const api = await S.create(THREE, f.canvas, stations, f.opts);
    await frames(f, 1000, 1);
    const R = ringsOf(f.scene);
    api.setLayers(2);
    ok('c animado: justo después de setLayers(2) siguen ocultos', R.every((r) => !r.visible));
    let t = await frames(f, 2000, 2);
    const mid = R[0].scale.x;
    ok('c animado: a mitad de animación la escala está entre 0 y 1', mid > 0 && mid < 1 && R[0].visible, 'scale=' + mid);
    t = await frames(f, t, 40);
    ok('c animado: tras 400 ms los 2 primeros están a escala 1 y los otros ocultos', R[0].scale.x === 1 && R[1].scale.x === 1 && R[0].visible && R[1].visible && !R[2].visible && !R[3].visible, R.map((r) => r.scale.x.toFixed(3)).join(','));
    api.setLayers(0);
    t = await frames(f, t, 40);
    ok('c animado: setLayers(0) los encoge hasta ocultarlos', R.every((r) => !r.visible), R.map((r) => r.scale.x.toFixed(3)).join(','));
    ok('c animado: nunca más de 1 rAF pendiente', f.maxPend <= 1, 'max=' + f.maxPend);
    api.dispose(); }

  // ---- (d) goTo encadenado ----
  { const f = fakes({ reduced: false });
    const api = await S.create(THREE, f.canvas, stations, f.opts);
    await frames(f, 1000, 1);
    let a = false, b = false;
    const pa = api.goTo(3).then(() => { a = true; });
    let t = await frames(f, 1016, 5);
    const pb = api.goTo(5).then(() => { b = true; });
    await Promise.resolve(); await Promise.resolve();
    ok('d el primer goTo resuelve en cuanto empieza el segundo', a && !b);
    t = await frames(f, t, 400);
    await Promise.all([pa, pb]);
    ok('d el segundo goTo resuelve al llegar', b);
    const P = new THREE.Vector3(); S.buildWorld(THREE, stations).curve.getPoint(5 / 9, P);
    const pk = packetOf(f.scene).position;
    ok('d el paquete termina en la estación 5', pk.distanceTo(P) < 1e-6, pk.toArray().map((x) => x.toFixed(3)).join(',') + ' vs ' + P.toArray().map((x) => x.toFixed(3)).join(','));
    let c = false; const pc = api.goTo(5).then(() => { c = true; });
    let n = 0; for (let tt = t; !c && n < 200 && f.pend.size; n++, tt += 16) { f.run(tt); await Promise.resolve(); }
    await pc;
    ok('d goTo a la misma estación resuelve en ~600 ms (menos de 50 cuadros)', c && n <= 45, 'cuadros=' + n);
    api.dispose(); }

  // ---- (d2) goTo con reducedMotion: corta al destino ----
  { const f = fakes({ reduced: true });
    const api = await S.create(THREE, f.canvas, stations, f.opts);
    await api.goTo(9);
    await frames(f, 1000, 2);
    const P = new THREE.Vector3(); S.buildWorld(THREE, stations).curve.getPoint(1, P);
    ok('d2 reducedMotion: goTo(9) deja el paquete en la última estación', packetOf(f.scene).position.distanceTo(P) < 1e-6);
    await api.goTo(0);
    ok('d2 reducedMotion: goTo(0) vuelve a la primera', packetOf(f.scene).position.distanceTo(new THREE.Vector3(0, 0, 0)) < 1e-6);
    api.dispose();
    const r = await api.goTo(3);
    ok('d3 goTo después de dispose resuelve sin lanzar', r === undefined); }

  // ---- (d4) dispose durante un viaje resuelve la promesa pendiente ----
  { const f = fakes({ reduced: false });
    const api = await S.create(THREE, f.canvas, stations, f.opts);
    let done = false; const p = api.goTo(4).then(() => { done = true; });
    await frames(f, 1000, 3);
    api.dispose(); await p;
    ok('d4 dispose() a mitad de goTo resuelve la promesa', done);
    ok('d4 tras dispose no queda rAF pendiente', f.pend.size === 0); }

  // ---- (e) pausa durante el viaje: no avanza ----
  { const f = fakes({ reduced: false });
    const api = await S.create(THREE, f.canvas, stations, f.opts);
    await frames(f, 1000, 1);
    let done = false; api.goTo(9).then(() => { done = true; });
    let t = await frames(f, 1016, 3);
    api.setPaused('hidden', true);
    t = await frames(f, t, 3);
    const before = packetOf(f.scene).position.clone();
    ok('e en pausa no queda rAF pendiente', f.pend.size === 0);
    api.setPaused('hidden', false);
    t = await frames(f, t + 10000, 2);
    const moved = packetOf(f.scene).position.distanceTo(before);
    ok('e al reanudar tras 10 s el paquete avanza poco (dt limitado, no salta al final)', !done && moved > 0 && moved < 5, 'movió=' + moved.toFixed(3));
    api.dispose(); }

  // ---- (f) lost() tiñe y restaura los colores ----
  { const f = fakes({ reduced: true });
    const api = await S.create(THREE, f.canvas, stations, f.opts);
    await frames(f, 1000, 1);
    const pk = packetOf(f.scene), lines = pk.children.find((o) => o.isLineSegments), core = pk.children.find((o) => o.isMesh && o.geometry.type === 'IcosahedronGeometry');
    const pts = f.scene.children.find((o) => o.isPoints);
    api.lost();
    ok('f lost(): paquete, núcleo y partículas en 0xff8f84', lines.material.color.getHex() === 0xff8f84 && core.material.color.getHex() === 0xff8f84 && pts.material.color.getHex() === 0xff8f84);
    await wait(300); api.lost();             // segundo lost antes de terminar: reinicia el temporizador
    await wait(400);
    ok('f lost() repetido: a los 400 ms del segundo sigue rojo', lines.material.color.getHex() === 0xff8f84);
    await wait(300);
    ok('f tras 600 ms vuelve a cian (paquete y partículas) y ámbar (núcleo)', lines.material.color.getHex() === 0x5ce1ff && pts.material.color.getHex() === 0x5ce1ff && core.material.color.getHex() === 0xf2b04a,
      [lines, core, pts].map((o) => o.material.color.getHexString()).join(','));
    api.lost(); api.dispose();
    await wait(700);
    ok('f lost() y dispose(): el temporizador no pide cuadros después', f.pend.size === 0); }

  // ---- (g) arrastre con puntero ----
  { const f = fakes({ reduced: true });
    const api = await S.create(THREE, f.canvas, stations, f.opts);
    await frames(f, 1000, 1);
    const q0 = f.camera.quaternion.clone();
    f.listeners.pointermove({ clientX: 50, clientY: 50 });
    ok('g pointermove sin pointerdown no gira la cámara', f.camera.quaternion.equals(q0));
    let cap = 0; f.canvas.setPointerCapture = () => { cap++; };
    f.listeners.pointerdown({ clientX: 0, clientY: 0, pointerId: 1 });
    f.listeners.pointermove({ clientX: 40, clientY: 0 });
    ok('g arrastrar gira la cámara y captura el puntero', !f.camera.quaternion.equals(q0) && cap === 1);
    const q1 = f.camera.quaternion.clone();
    f.listeners.pointerup({});
    f.listeners.pointermove({ clientX: 400, clientY: 400 });
    ok('g tras pointerup moverse no gira', f.camera.quaternion.equals(q1));
    f.canvas.setPointerCapture = () => { throw new Error('NotFoundError'); };
    let threw = null; try { f.listeners.pointerdown({ clientX: 0, clientY: 0, pointerId: 9 }); } catch (e) { threw = e; }
    ok('g setPointerCapture que lanza no rompe pointerdown', !threw);
    f.listeners.pointercancel({});
    // look() satura: un giro enorme equivale al límite
    api.look(1000, 1000); const qa = f.camera.quaternion.clone();
    api.look(10, 10); const qb = f.camera.quaternion.clone();
    ok('g look() satura en ±60°/±25°: seguir girando no cambia la cámara', qa.angleTo(qb) < 1e-9);
    await api.goTo(2);
    const f2 = fakes({ reduced: true }); const api2 = await S.create(THREE, f2.canvas, stations, f2.opts); await api2.goTo(2);
    ok('g goTo() reinicia el giro: la cámara queda igual que sin haber girado', f.camera.quaternion.angleTo(f2.camera.quaternion) < 1e-9 && f.camera.position.distanceTo(f2.camera.position) < 1e-9);
    api2.dispose(); api.dispose(); }

  // ---- (h) sin reducedMotion el núcleo pulsa dentro de [0.6, 1] y el paquete rota ----
  { const f = fakes({ reduced: false });
    const api = await S.create(THREE, f.canvas, stations, f.opts);
    const pk = packetOf(f.scene), core = pk.children.find((o) => o.isMesh && o.geometry.type === 'IcosahedronGeometry');
    const ops = []; let t = 1000;
    for (let i = 0; i < 80 && f.pend.size; i++, t += 16) { f.run(t); ops.push(core.material.opacity); }
    ok('h la opacidad del núcleo varía y queda en [0.6, 1]', Math.min(...ops) >= 0.6 - 1e-9 && Math.max(...ops) <= 1 + 1e-9 && Math.max(...ops) - Math.min(...ops) > 0.1, Math.min(...ops).toFixed(3) + '..' + Math.max(...ops).toFixed(3));
    ok('h el paquete rota', pk.rotation.y > 0);
    api.dispose(); }
  { const f = fakes({ reduced: true });
    const api = await S.create(THREE, f.canvas, stations, f.opts);
    await frames(f, 1000, 3);
    const pk = packetOf(f.scene);
    ok('h2 con reducedMotion el paquete no rota', pk.rotation.y === 0);
    api.dispose(); }

  results.forEach((r) => console.log(r.join(' | ')));
  const fails = results.filter((r) => r[0] === 'FAIL').length;
  console.log(fails ? `\n${fails} FALLOS` : '\nSCENE_EXTRA OK (' + results.length + ' comprobaciones)');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('EXCEPCIÓN', e && e.stack); results.forEach((r) => console.log(r.join(' | '))); process.exit(2); });
