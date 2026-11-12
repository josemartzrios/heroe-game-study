// Pruebas de city/input.js: joystick por pointerId, cámara con dedo, Q/Z, WASD, E/Enter y Esc (jsdom, rect simulado a 390×844).
const { JSDOM } = require('jsdom');
const results = [];
const ok = (name, cond, extra) => { results.push([cond ? 'PASS' : 'FAIL', name, extra || '']); };
const CI = require('../city/input.js');

function setup(over = {}) {
  const dom = new JSDOM('<!doctype html><body><div id="root"><button id="hud" data-hud>HUD</button></div><button id="btn">B</button><input id="inp"></body>', { pretendToBeVisual: true });
  const w = dom.window, d = w.document, root = d.getElementById('root');
  root.getBoundingClientRect = () => ({ left: 0, top: 0, width: 390, height: 844, right: 390, bottom: 844, x: 0, y: 0 });
  let captures = 0; w.Element.prototype.setPointerCapture = function () { captures++; }; w.Element.prototype.releasePointerCapture = function () {};
  const clock = { t: 0 };
  const safe = over.safe || { left: 0, bottom: 0 };
  const inp = CI.create(root, { safe: () => safe, isFree: (el) => !(el.closest && el.closest('[data-hud]')), now: () => clock.t });
  const ptr = (type, target, x, y, id) => target.dispatchEvent(new w.PointerEvent(type, { bubbles: true, pointerId: id, clientX: x, clientY: y, pointerType: 'touch' }));
  const key = (type, k, extra) => (extra && extra.target || d).dispatchEvent(new w.KeyboardEvent(type, Object.assign({ key: k, bubbles: true }, extra)));
  return { w, d, root, inp, clock, ptr, key, captures: () => captures, safe };
}

// (a) joystick
{ const t = setup(); t.ptr('pointerdown', t.root, 100, 700, 1); t.ptr('pointermove', t.root, 148, 700, 1);
  const i = t.inp.intent();
  ok('a joystick: 48 px a la derecha → mx ≈ 1, mag ≈ 1 y corre', Math.abs(i.mx - 1) < 1e-6 && Math.abs(i.mag - 1) < 1e-6 && i.run === true, JSON.stringify(i));
  t.ptr('pointermove', t.root, 100, 676, 1); const j = t.inp.intent();
  ok('a joystick: 24 px hacia arriba → mz = -0.5, mag 0.5 y camina', Math.abs(j.mz + 0.5) < 1e-6 && Math.abs(j.mag - 0.5) < 1e-6 && j.run === false, JSON.stringify(j));
  ok('a la captura de puntero se pidió (opcional)', t.captures() >= 1);
  t.ptr('pointerup', t.root, 100, 676, 1); ok('a al soltar, intent vuelve a 0', t.inp.intent().mag === 0); t.inp.dispose(); }

// (b) cámara
{ const t = setup(); t.ptr('pointerdown', t.root, 300, 300, 2); t.ptr('pointermove', t.root, 340, 300, 2);
  const c = t.inp.consumeCamera();
  ok('b arrastrar 40 px en zona libre → yaw 10', Math.abs(c.yaw - 10) < 1e-6 && Math.abs(c.pitch) < 1e-6, JSON.stringify(c));
  t.ptr('pointermove', t.root, 340, 316, 2); ok('b arrastrar 16 px hacia abajo → pitch 4', Math.abs(t.inp.consumeCamera().pitch - 4) < 1e-6);
  ok('b consumeCamera vacía el acumulado', t.inp.consumeCamera().yaw === 0); t.inp.dispose(); }

// (c) dos dedos a la vez + cancel + soltar fuera
{ const t = setup(); t.ptr('pointerdown', t.root, 100, 700, 1); t.ptr('pointerdown', t.root, 300, 300, 2);
  t.ptr('pointermove', t.root, 148, 700, 1); t.ptr('pointermove', t.root, 320, 300, 2);
  ok('c joystick y cámara funcionan a la vez', t.inp.intent().mx > 0.99 && Math.abs(t.inp.consumeCamera().yaw - 5) < 1e-6);
  t.ptr('pointercancel', t.root, 148, 700, 1); ok('c pointercancel del joystick devuelve intent a 0', t.inp.intent().mag === 0);
  t.ptr('pointerup', t.root, 320, 300, 2); t.ptr('pointermove', t.root, 400, 300, 2); ok('c tras soltar el dedo de la cámara, mover no gira', t.inp.consumeCamera().yaw === 0);
  t.ptr('pointerdown', t.root, 100, 700, 3); t.ptr('pointerup', t.w, 100, 700, 3); t.ptr('pointermove', t.root, 148, 700, 3);
  ok('c un pointerup fuera del root (en la ventana) también suelta el dedo', t.inp.intent().mag === 0); t.inp.dispose(); }

// (d) isFree
{ const t = setup(); t.ptr('pointerdown', t.d.getElementById('hud'), 300, 300, 1); t.ptr('pointermove', t.root, 340, 300, 1);
  ok('d un toque sobre un elemento no libre no gira la cámara ni crea joystick', t.inp.consumeCamera().yaw === 0 && t.inp.intent().mag === 0);
  t.ptr('pointerdown', t.d.getElementById('hud'), 100, 700, 2); t.ptr('pointermove', t.root, 148, 700, 2); ok('d tampoco en la zona del joystick', t.inp.intent().mag === 0); t.inp.dispose(); }

// (e) márgenes del sistema
{ const t = setup(); t.ptr('pointerdown', t.root, 10, 700, 1); t.ptr('pointermove', t.root, 58, 700, 1);
  ok('e un toque en el margen izquierdo de 16 px no crea joystick ni cámara', t.inp.intent().mag === 0 && t.inp.consumeCamera().yaw === 0); t.inp.dispose(); }
{ const t = setup({ safe: { left: 0, bottom: 34 } }); t.ptr('pointerdown', t.root, 100, 824, 1); t.ptr('pointermove', t.root, 148, 824, 1);
  ok('e con safe.bottom = 34, un toque a 20 px del borde inferior no hace nada', t.inp.intent().mag === 0);
  t.ptr('pointerdown', t.root, 100, 760, 2); t.ptr('pointermove', t.root, 148, 760, 2); ok('e a 84 px del borde inferior sí crea el joystick', t.inp.intent().mag > 0.99); t.inp.dispose(); }

// (f) teclado
{ const t = setup(); t.key('keydown', 'w'); t.key('keydown', 'Shift', { shiftKey: true });
  const i = t.inp.intent(); ok('f W + Shift → mz = -1 y corre', i.mz === -1 && i.mx === 0 && i.run === true, JSON.stringify(i));
  t.key('keyup', 'w'); t.key('keyup', 'Shift'); t.key('keydown', 'ArrowRight'); ok('f flecha derecha → mx = 1', t.inp.intent().mx === 1); t.key('keyup', 'ArrowRight');
  t.key('keydown', 'w'); t.key('keydown', 'd'); const dg = t.inp.intent(); ok('f diagonal W + D normalizada (mag ≈ 1)', Math.abs(Math.hypot(dg.mx, dg.mz) - 1) < 1e-6 && dg.mag <= 1 + 1e-9, JSON.stringify(dg)); t.key('keyup', 'w'); t.key('keyup', 'd');
  t.inp.consumeCamera(); t.key('keydown', 'q'); t.clock.t = 500; ok('f Q mantenida 0.5 s → yaw ≈ -45', Math.abs(t.inp.consumeCamera().yaw + 45) < 1e-6); t.key('keyup', 'q');
  t.key('keydown', 'z'); t.clock.t = 1000; ok('f Z mantenida 0.5 s → yaw ≈ +45', Math.abs(t.inp.consumeCamera().yaw - 45) < 1e-6); t.key('keyup', 'z'); t.clock.t = 2000; ok('f soltar la tecla detiene el giro', t.inp.consumeCamera().yaw === 0);
  t.key('keydown', 'w', { ctrlKey: true }); ok('f Ctrl+W no mueve', t.inp.intent().mag === 0);
  t.d.getElementById('inp').focus(); t.key('keydown', 'w', { target: t.d.getElementById('inp') }); ok('f con el foco en un input las teclas de juego se ignoran', t.inp.intent().mag === 0); t.d.getElementById('inp').blur(); t.inp.dispose(); }

// (g) acción y pausa
{ const t = setup(); t.key('keydown', 'e'); ok('g E → consumeAction una vez y luego falso', t.inp.consumeAction() === true && t.inp.consumeAction() === false);
  t.key('keydown', 'Enter'); ok('g Enter sin foco en botón → acción', t.inp.consumeAction() === true);
  t.d.getElementById('btn').focus(); t.key('keydown', 'Enter'); ok('g Enter con el foco en un botón no cuenta', t.inp.consumeAction() === false); t.d.getElementById('btn').blur();
  t.key('keydown', 'Escape'); ok('g Esc → consumePause una vez', t.inp.consumePause() === true && t.inp.consumePause() === false); t.inp.dispose(); }

// (h) dispose
{ const t = setup(); t.inp.dispose(); t.key('keydown', 'w'); t.ptr('pointerdown', t.root, 100, 700, 1); t.ptr('pointermove', t.root, 148, 700, 1); t.key('keydown', 'e');
  ok('h tras dispose() los eventos no hacen nada', t.inp.intent().mag === 0 && t.inp.consumeAction() === false); }

results.forEach((r) => console.log(r.join(' | ')));
const fails = results.filter((r) => r[0] === 'FAIL').length;
console.log(fails ? `\n${fails} FALLOS` : '\nCITY_INPUT OK (' + results.length + ' comprobaciones)');
process.exit(fails ? 1 : 0);
