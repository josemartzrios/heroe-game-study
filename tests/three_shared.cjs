// Pruebas de three/shared.js (Pauser, compileOrLost, disposeScene, mergeBoxes) con Three r169 real, sin WebGL.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { pathToFileURL } = require('url');
const results = [];
const ok = (name, cond, extra) => { results.push([cond ? 'PASS' : 'FAIL', name, extra || '']); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const THREE = await import(pathToFileURL(path.join(__dirname, '..', 'vendor', 'three.module.min.js')).href);
  const T3 = require('../three/shared.js');

  // (a) Pauser
  { const P = T3.Pauser();
    ok('a Pauser corre sin motivos', P.running());
    P.set('sheet', true); P.set('hidden', true); P.set('hidden', false);
    ok('a con "sheet" activo sigue en pausa', !P.running() && P.has('sheet') && !P.has('hidden'));
    P.set('sheet', false);
    ok('a sin motivos vuelve a correr', P.running() && !P.has('sheet'));
    P.tick(1000);
    ok('a dt limitado a 50', P.tick(5000) === 50);
    P.set('x', true); P.set('x', false);
    ok('a el primer tick tras reanudar da 16', P.tick(9000) === 16); }

  // (b) compileOrLost
  function fakeCanvas() { const l = {}; return { l, addEventListener(t, f) { l[t] = f; }, removeEventListener(t) { delete l[t]; } }; }
  { const c = fakeCanvas(); let compiled = 0;
    await T3.compileOrLost({ compileAsync() { compiled++; return Promise.resolve(); } }, {}, {}, c);
    ok('b compileOrLost resuelve y quita su listener', compiled === 1 && !c.l.webglcontextlost); }
  { const c = fakeCanvas(); let rejected = false;
    const p = T3.compileOrLost({ compileAsync() { return new Promise(() => {}); } }, {}, {}, c).catch(() => { rejected = true; });
    await wait(5); c.l.webglcontextlost({ target: c }); await p;
    ok('b rechaza si se pierde el contexto y quita su listener', rejected && !c.l.webglcontextlost); }
  { const c = fakeCanvas(); let n = 0;
    await T3.compileOrLost({ compile() { n++; } }, {}, {}, c);
    ok('b sin compileAsync usa compile', n === 1); }

  // (c) disposeScene
  { const scene = new THREE.Scene(); const g = new THREE.BoxGeometry(1, 1, 1), m = new THREE.MeshBasicMaterial();
    scene.add(new THREE.Mesh(g, m)); scene.add(new THREE.Mesh(g, m)); scene.add(new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), m));
    let gd = 0, md = 0; const og = THREE.BufferGeometry.prototype.dispose, om = THREE.Material.prototype.dispose;
    THREE.BufferGeometry.prototype.dispose = function () { gd++; return og.call(this); }; THREE.Material.prototype.dispose = function () { md++; return om.call(this); };
    T3.disposeScene(scene);
    THREE.BufferGeometry.prototype.dispose = og; THREE.Material.prototype.dispose = om;
    ok('c disposeScene libera cada geometría y material compartido una sola vez', gd === 2 && md === 1, `g=${gd} m=${md}`); }

  // (d) mergeBoxes
  { const geo = T3.mergeBoxes(THREE, [
      { w: 1, h: 1, d: 1, x: 0, y: 0, z: 0, color: 0xff0000 },
      { w: 2, h: 1, d: 1, x: 3, y: 0, z: 0, color: 0x00ff00 },
      { w: 2, h: 1, d: 1, x: 0, y: 0, z: 5, color: 0x0000ff, rotY: Math.PI / 2 }]);
    ok('d mergeBoxes: 108 índices y 72 vértices', geo.index.count === 108 && geo.attributes.position.count === 72, `${geo.index.count}/${geo.attributes.position.count}`);
    ok('d mergeBoxes: tiene color y no tiene uv', !!geo.attributes.color && !geo.attributes.uv && !!geo.attributes.normal);
    const c = geo.attributes.color; ok('d mergeBoxes: el primer vértice es rojo y el último azul', Math.abs(c.getX(0) - 1) < 1e-6 && Math.abs(c.getZ(71) - 1) < 1e-6);
    // una caja larga (4 en X) girada 90° queda larga en Z; si las normales también giran, las que miran a ±Z están en las tapas (|z| ≈ 2)
    const g2 = T3.mergeBoxes(THREE, [{ w: 4, h: 1, d: 0.2, x: 0, y: 0, z: 0, color: 0xffffff, rotY: Math.PI / 2 }]);
    const p2 = g2.attributes.position, n2 = g2.attributes.normal; let capZ = 0, bad = 0;
    for (let i = 0; i < p2.count; i++) if (Math.abs(n2.getZ(i)) > 0.99) { capZ++; if (Math.abs(Math.abs(p2.getZ(i)) - 2) > 1e-4) bad++; }
    ok('d mergeBoxes: rotY gira también las normales', capZ === 8 && bad === 0, `vértices con normal ±Z=${capZ}, fuera de la tapa=${bad}`); }

  // (e) en el navegador no hay require: scene.js debe encontrar Three3D global
  { const shared = fs.readFileSync(path.join(__dirname, '..', 'three', 'shared.js'), 'utf8');
    const scene = fs.readFileSync(path.join(__dirname, '..', 'trip', 'scene.js'), 'utf8');
    let err = null, res = null;
    try { res = vm.runInNewContext('(function(){ ' + shared + '\n' + scene + '\n return { Pauser: TripScene.Pauser, hasCreate: typeof TripScene.create }; })()'); } catch (e) { err = e.message; }
    ok('e scene.js evaluado sin require toma Three3D global', !err && res && typeof res.Pauser === 'function' && res.hasCreate === 'function', err); }

  results.forEach((r) => console.log(r.join(' | ')));
  const fails = results.filter((r) => r[0] === 'FAIL').length;
  console.log(fails ? `\n${fails} FALLOS` : '\nTHREE_SHARED OK (' + results.length + ' comprobaciones)');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('EXCEPCIÓN', e && e.message); results.forEach((r) => console.log(r.join(' | '))); process.exit(2); });
