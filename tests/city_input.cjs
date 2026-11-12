// Pruebas de city/input.js: joystick por pointerId, zoom (pellizco, rueda, +/-), WASD, E/Enter y Esc (jsdom, rect simulado a 390×844).
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
  const active = { v: true };
  const inp = CI.create(root, { safe: () => safe, isFree: (el) => !(el.closest && el.closest('[data-hud]')), now: () => clock.t, isActive: () => active.v });
  const ptr = (type, target, x, y, id) => target.dispatchEvent(new w.PointerEvent(type, { bubbles: true, pointerId: id, clientX: x, clientY: y, pointerType: 'touch' }));
  const key = (type, k, extra) => (extra && extra.target || d).dispatchEvent(new w.KeyboardEvent(type, Object.assign({ key: k, bubbles: true }, extra)));
  const wheel = (deltaY, extra) => { const ev = new w.Event('wheel', { bubbles: true, cancelable: true }); Object.defineProperty(ev, 'deltaY', { value: deltaY }); Object.assign(ev, extra); root.dispatchEvent(ev); return ev; };
  return { w, d, root, inp, clock, ptr, key, wheel, active, captures: () => captures, safe };
}

// (a) joystick
{ const t = setup(); t.ptr('pointerdown', t.root, 100, 700, 1); t.ptr('pointermove', t.root, 148, 700, 1);
  const i = t.inp.intent();
  ok('a joystick: 48 px a la derecha → mx ≈ 1, mag ≈ 1 y corre', Math.abs(i.mx - 1) < 1e-6 && Math.abs(i.mag - 1) < 1e-6 && i.run === true, JSON.stringify(i));
  t.ptr('pointermove', t.root, 100, 676, 1); const j = t.inp.intent();
  ok('a joystick: 24 px hacia arriba → mz = -0.5, mag 0.5 y camina', Math.abs(j.mz + 0.5) < 1e-6 && Math.abs(j.mag - 0.5) < 1e-6 && j.run === false, JSON.stringify(j));
  ok('a la captura de puntero se pidió (opcional)', t.captures() >= 1);
  t.ptr('pointerup', t.root, 100, 676, 1); ok('a al soltar, intent vuelve a 0', t.inp.intent().mag === 0); t.inp.dispose(); }

// (c) dos dedos a la vez + cancel + soltar fuera
{ const t = setup(); t.ptr('pointerdown', t.root, 100, 700, 1); t.ptr('pointermove', t.root, 148, 700, 1);
  ok('c joystick activo', t.inp.intent().mx > 0.99);
  t.ptr('pointercancel', t.root, 148, 700, 1); ok('c pointercancel del joystick devuelve intent a 0', t.inp.intent().mag === 0);
  t.ptr('pointerdown', t.root, 100, 700, 3); t.ptr('pointerup', t.w, 100, 700, 3); t.ptr('pointermove', t.root, 148, 700, 3);
  ok('c un pointerup fuera del root (en la ventana) también suelta el dedo', t.inp.intent().mag === 0); t.inp.dispose(); }

// (d) isFree
{ const t = setup(); t.ptr('pointerdown', t.d.getElementById('hud'), 300, 300, 1); t.ptr('pointermove', t.root, 340, 300, 1);
  ok('d un toque sobre un elemento no libre no crea joystick ni zoom', t.inp.consumeZoom().factor === 1 && t.inp.intent().mag === 0);
  t.ptr('pointerdown', t.d.getElementById('hud'), 100, 700, 2); t.ptr('pointermove', t.root, 148, 700, 2); ok('d tampoco en la zona del joystick', t.inp.intent().mag === 0); t.inp.dispose(); }

// (e) márgenes del sistema
{ const t = setup(); t.ptr('pointerdown', t.root, 10, 700, 1); t.ptr('pointermove', t.root, 58, 700, 1);
  ok('e un toque en el margen izquierdo de 16 px no crea joystick', t.inp.intent().mag === 0); t.inp.dispose(); }
{ const t = setup({ safe: { left: 0, bottom: 34 } }); t.ptr('pointerdown', t.root, 100, 824, 1); t.ptr('pointermove', t.root, 148, 824, 1);
  ok('e con safe.bottom = 34, un toque a 20 px del borde inferior no hace nada', t.inp.intent().mag === 0);
  t.ptr('pointerdown', t.root, 100, 760, 2); t.ptr('pointermove', t.root, 148, 760, 2); ok('e a 84 px del borde inferior sí crea el joystick', t.inp.intent().mag > 0.99); t.inp.dispose(); }

// (f) teclado
{ const t = setup(); t.key('keydown', 'w'); t.key('keydown', 'Shift', { shiftKey: true });
  const i = t.inp.intent(); ok('f W + Shift → mz = -1 y corre', i.mz === -1 && i.mx === 0 && i.run === true, JSON.stringify(i));
  t.key('keyup', 'w'); t.key('keyup', 'Shift'); t.key('keydown', 'ArrowRight'); ok('f flecha derecha → mx = 1', t.inp.intent().mx === 1); t.key('keyup', 'ArrowRight');
  t.key('keydown', 'w'); t.key('keydown', 'd'); const dg = t.inp.intent(); ok('f diagonal W + D normalizada (mag ≈ 1)', Math.abs(Math.hypot(dg.mx, dg.mz) - 1) < 1e-6 && dg.mag <= 1 + 1e-9, JSON.stringify(dg)); t.key('keyup', 'w'); t.key('keyup', 'd');
  t.key('keydown', 'w', { ctrlKey: true }); ok('f Ctrl+W no mueve', t.inp.intent().mag === 0);
  t.d.getElementById('inp').focus(); t.key('keydown', 'w', { target: t.d.getElementById('inp') }); ok('f con el foco en un input las teclas de juego se ignoran', t.inp.intent().mag === 0); t.d.getElementById('inp').blur(); t.inp.dispose(); }

// (z) zoom: pellizco
{ const t = setup(); t.ptr('pointerdown', t.root, 150, 300, 5); t.ptr('pointerdown', t.root, 250, 300, 6);
  t.ptr('pointermove', t.root, 100, 300, 5); t.ptr('pointermove', t.root, 300, 300, 6);
  const z = t.inp.consumeZoom(); ok('z pellizco de 100 a 200 px → factor ≈ 2', Math.abs(z.factor - 2) < 1e-6 && z.steps === 0, JSON.stringify(z));
  ok('z un segundo consumeZoom da factor 1', t.inp.consumeZoom().factor === 1);
  t.ptr('pointermove', t.root, 0, 300, 5); t.ptr('pointermove', t.root, 400, 300, 6);
  ok('z cada evento de pellizco se limita a [0.5, 2]', t.inp.consumeZoom().factor <= 2 + 1e-9);
  t.ptr('pointerup', t.root, 300, 300, 6); t.ptr('pointermove', t.root, 120, 300, 5); t.ptr('pointermove', t.root, 60, 300, 5);
  ok('z al soltar un dedo el pellizco termina: el dedo restante no hace nada (Foco de revisión 1)', t.inp.consumeZoom().factor === 1 && t.inp.intent().mag === 0);
  t.ptr('pointerup', t.root, 60, 300, 5); t.inp.dispose(); }
{ const t = setup(); t.ptr('pointerdown', t.root, 100, 700, 1); t.ptr('pointermove', t.root, 148, 700, 1);
  t.ptr('pointerdown', t.root, 250, 300, 2); t.ptr('pointerdown', t.root, 300, 300, 3); t.ptr('pointermove', t.root, 200, 300, 2); t.ptr('pointermove', t.root, 350, 300, 3);
  ok('z un dedo que nace en el joystick sigue siendo joystick aunque haya pellizco', t.inp.intent().mx > 0.99 && t.inp.consumeZoom().factor > 1);
  t.ptr('pointercancel', t.root, 200, 300, 2); t.ptr('pointermove', t.root, 400, 300, 3); ok('z pointercancel de un dedo del pellizco: el otro no hace nada', t.inp.consumeZoom().factor === 1); t.inp.dispose(); }
{ const t = setup(); t.ptr('pointerdown', t.d.getElementById('hud'), 150, 300, 1); t.ptr('pointerdown', t.root, 250, 300, 2); t.ptr('pointermove', t.root, 400, 300, 2); t.ptr('pointermove', t.root, 0, 300, 1);
  ok('z un pellizco que empieza sobre un botón no hace nada', t.inp.consumeZoom().factor === 1); t.inp.dispose(); }
// (r) rueda
{ const t = setup(); t.clock.t = 1000; const ev = t.wheel(-100);
  ok('r rueda hacia arriba → steps 1 y preventDefault', t.inp.consumeZoom().steps === 1 && ev.defaultPrevented === true);
  t.clock.t = 1200; t.wheel(-100); t.clock.t = 1210; t.wheel(-100); t.clock.t = 1220; t.wheel(-100);
  ok('r 3 eventos en < 120 ms cuentan un solo paso', t.inp.consumeZoom().steps === 1);
  t.clock.t = 2000; t.wheel(100); ok('r rueda hacia abajo → steps -1', t.inp.consumeZoom().steps === -1);
  t.clock.t = 3000; t.wheel(NaN); t.clock.t = 4000; t.wheel(Infinity); ok('r deltaY no finito se ignora', t.inp.consumeZoom().steps === 0);
  t.clock.t = 5000; const ev2 = t.wheel(-100, { ctrlKey: true }); ok('r con ctrlKey (pellizco del trackpad) cuenta y llama a preventDefault', t.inp.consumeZoom().steps === 1 && ev2.defaultPrevented === true);
  t.active.v = false; t.clock.t = 6000; const ev3 = t.wheel(-100); ok('r con la ciudad inactiva (pausa u hoja) no cuenta ni cancela el evento', t.inp.consumeZoom().steps === 0 && ev3.defaultPrevented === false);
  t.inp.dispose(); t.active.v = true; t.clock.t = 7000; const ev4 = t.wheel(-100); ok('r tras dispose() la rueda no hace nada', t.inp.consumeZoom().steps === 0 && ev4.defaultPrevented === false); }
// (k) teclas de zoom
{ const t = setup(); t.key('keydown', '+'); t.key('keydown', '='); t.key('keydown', '-'); ok('k teclas +, = y - suman +1, +1 y -1 pasos', t.inp.consumeZoom().steps === 1);
  ok('k consumeCamera ya no existe', t.inp.consumeCamera === undefined); t.inp.dispose(); }

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
