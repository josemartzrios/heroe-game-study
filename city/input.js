/* Entrada de Ciudad Núcleo: joystick táctil por pointerId, arrastre de cámara, teclado (WASD/flechas, Shift, Q/Z, E/Enter, Esc).
   Sin Three. El teclado se escucha en la ventana del propio root (root.ownerDocument.defaultView).
   consumeCamera(): yaw = +grados hacia la derecha del arrastre (0.25 °/px) y pitch = +grados hacia abajo; Q = -90 °/s y Z = +90 °/s. */
var CityInput = (function () {
  var JOY_R = 48, DRAG = 0.25, KEY_DEG = 90, EDGE = 16;
  var KEYS = { w: 'up', arrowup: 'up', s: 'down', arrowdown: 'down', a: 'left', arrowleft: 'left', d: 'right', arrowright: 'right' };

  function create(root, opts) {
    opts = opts || {};
    var win = root.ownerDocument.defaultView, doc = root.ownerDocument;
    var safe = opts.safe || function () { return { left: 0, bottom: 0 }; };
    var isFree = opts.isFree || function () { return true; };
    var now = opts.now || function () { return win.performance.now(); };
    var fingers = {}, down = {}, camYaw = 0, camPitch = 0, lastNow = now(), action = false, pause = false, dead = false;

    function typing() { var t = doc.activeElement && doc.activeElement.tagName; return t === 'INPUT' || t === 'TEXTAREA'; }
    function onDown(e) {
      if (dead || fingers[e.pointerId] || !isFree(e.target)) return;
      var r = root.getBoundingClientRect(), s = safe(), lx = e.clientX - r.left, ly = e.clientY - r.top;
      if (lx < (s.left || 0) + EDGE || (r.height - ly) < (s.bottom || 0) + EDGE) return;       // margen de los gestos del sistema: no hace nada
      var joy = lx < r.width * 0.5 && ly > r.height * 0.75;
      fingers[e.pointerId] = joy ? { kind: 'joy', ox: e.clientX, oy: e.clientY, dx: 0, dy: 0 } : { kind: 'cam', x: e.clientX, y: e.clientY };
      if (root.setPointerCapture) { try { root.setPointerCapture(e.pointerId); } catch (x) {} }
    }
    function onMove(e) {
      var f = fingers[e.pointerId]; if (dead || !f) return;
      if (f.kind === 'joy') { f.dx = e.clientX - f.ox; f.dy = e.clientY - f.oy; }
      else { camYaw += (e.clientX - f.x) * DRAG; camPitch += (e.clientY - f.y) * DRAG; f.x = e.clientX; f.y = e.clientY; }
    }
    function onUp(e) { delete fingers[e.pointerId]; }
    function onKeyDown(e) {
      if (dead || e.ctrlKey || e.metaKey || e.altKey) return;
      var k = String(e.key).toLowerCase();
      if (k === 'escape') { if (!e.repeat) pause = true; return; }
      if (typing()) return;
      if (KEYS[k] || k === 'q' || k === 'z' || k === 'shift') { down[k] = true; return; }
      if (k === 'e' || k === 'enter') {
        var ae = doc.activeElement;
        if (k === 'enter' && ae && ae.tagName === 'BUTTON') return;
        if (!e.repeat) action = true;
      }
    }
    function onKeyUp(e) { delete down[String(e.key).toLowerCase()]; }
    root.addEventListener('pointerdown', onDown); root.addEventListener('pointermove', onMove);
    root.addEventListener('pointerup', onUp); root.addEventListener('pointercancel', onUp);
    win.addEventListener('pointerup', onUp); win.addEventListener('pointercancel', onUp);
    win.addEventListener('keydown', onKeyDown); win.addEventListener('keyup', onKeyUp);

    function intent() {
      var mx = 0, mz = 0, run = false, id, f;
      for (id in fingers) if (fingers[id].kind === 'joy') { f = fingers[id]; break; }
      if (f) {
        mx = f.dx / JOY_R; mz = f.dy / JOY_R;
        var m = Math.hypot(mx, mz); if (m > 1) { mx /= m; mz /= m; }
      } else {
        Object.keys(down).forEach(function (kk) {
          var dir = KEYS[kk];
          if (dir === 'right') mx += 1; else if (dir === 'left') mx -= 1; else if (dir === 'down') mz += 1; else if (dir === 'up') mz -= 1;
        });
        mx = Math.max(-1, Math.min(1, mx)); mz = Math.max(-1, Math.min(1, mz));
        var l = Math.hypot(mx, mz); if (l > 1) { mx /= l; mz /= l; }
      }
      var mag = Math.hypot(mx, mz);
      run = f ? mag >= 0.7 : !!down.shift && mag > 0;
      return { mx: mx, mz: mz, mag: mag, run: run };
    }
    function consumeCamera() {
      var t = now(), dt = (t - lastNow) / 1000; lastNow = t;
      var yaw = camYaw + ((down.z ? 1 : 0) - (down.q ? 1 : 0)) * KEY_DEG * dt, pitch = camPitch;
      camYaw = 0; camPitch = 0;
      return { yaw: yaw, pitch: pitch };
    }
    function consumeAction() { var a = action; action = false; return a; }
    function consumePause() { var p = pause; pause = false; return p; }
    function dispose() {
      dead = true; fingers = {}; down = {}; action = false; pause = false;
      root.removeEventListener('pointerdown', onDown); root.removeEventListener('pointermove', onMove);
      root.removeEventListener('pointerup', onUp); root.removeEventListener('pointercancel', onUp);
      win.removeEventListener('pointerup', onUp); win.removeEventListener('pointercancel', onUp);
      win.removeEventListener('keydown', onKeyDown); win.removeEventListener('keyup', onKeyUp);
    }
    return { intent: intent, consumeCamera: consumeCamera, consumeAction: consumeAction, consumePause: consumePause, dispose: dispose };
  }
  return { create: create };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = CityInput;
