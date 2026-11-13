/* Entrada de Ciudad Núcleo: joystick táctil por pointerId, zoom (pellizco, rueda y teclas +/-), teclado (WASD/flechas, Shift, E/Enter, Esc).
   El teclado se escucha en la ventana del propio root (root.ownerDocument.defaultView).
   consumeZoom() → { factor, steps }: factor = producto acumulado del pellizco (cada evento en [0.5, 2]); steps = pasos de rueda y teclas (±1). */
var CityInput = (function () {
  var JOY_R = 56, EDGE = 16, WHEEL_MS = 120, JOY_X = 0.45, JOY_Y = 0.2;
  var KEYS = { w: 'up', arrowup: 'up', s: 'down', arrowdown: 'down', a: 'left', arrowleft: 'left', d: 'right', arrowright: 'right' };

  function create(root, opts) {
    opts = opts || {};
    var win = root.ownerDocument.defaultView, doc = root.ownerDocument;
    var safe = opts.safe || function () { return { left: 0, bottom: 0 }; };
    var isFree = opts.isFree || function () { return true; };
    var now = opts.now || function () { return win.performance.now(); };
    var isActive = opts.isActive || function () { return true; };
    var fingers = {}, down = {}, zoomF = 1, zoomS = 0, pinch = null, lastWheel = -Infinity, action = false, pause = false, dead = false;

    function typing() { var t = doc.activeElement && doc.activeElement.tagName; return t === 'INPUT' || t === 'TEXTAREA'; }
    function onDown(e) {
      if (dead || fingers[e.pointerId] || !isFree(e.target) || !isFinite(e.clientX) || !isFinite(e.clientY)) return;
      var r = root.getBoundingClientRect(), s = safe(), lx = e.clientX - r.left, ly = e.clientY - r.top;
      if (lx < (s.left || 0) + EDGE || (r.height - ly) < (s.bottom || 0) + EDGE) return;       // margen de los gestos del sistema: no hace nada
      var joy = lx < r.width * JOY_X && ly > r.height * JOY_Y;   // palanca flotante: nace bajo el dedo en el 45 % izquierdo, bajo la barra superior
      fingers[e.pointerId] = joy ? { kind: 'joy', ox: e.clientX, oy: e.clientY, rx: lx, ry: ly, dx: 0, dy: 0 } : { kind: 'free', x: e.clientX, y: e.clientY };
      if (!joy && !pinch) {
        var fr = Object.keys(fingers).filter(function (k) { return fingers[k].kind === 'free'; });
        if (fr.length === 2) pinch = { a: fr[0], b: fr[1], d: Math.max(1, dist(fingers[fr[0]], fingers[fr[1]])) };
      }
      if (root.setPointerCapture) { try { root.setPointerCapture(e.pointerId); } catch (x) {} }
    }
    function onMove(e) {
      var f = fingers[e.pointerId]; if (dead || !f || !isFinite(e.clientX) || !isFinite(e.clientY)) return;
      if (f.kind === 'joy') { f.dx = e.clientX - f.ox; f.dy = e.clientY - f.oy; }
      else if (f.kind === 'free') {
        f.x = e.clientX; f.y = e.clientY;
        if (pinch && (String(e.pointerId) === pinch.a || String(e.pointerId) === pinch.b)) {
          var nd = Math.max(1, dist(fingers[pinch.a], fingers[pinch.b])), k = Math.max(0.5, Math.min(2, nd / pinch.d));
          if (!isFinite(k) || !isFinite(nd)) return;
          zoomF *= k; pinch.d = nd;
        }
      }
    }
    function dist(p, q) { return Math.hypot(p.x - q.x, p.y - q.y); }
    function onUp(e) {
      var id = String(e.pointerId);
      if (pinch && (id === pinch.a || id === pinch.b)) { var other = id === pinch.a ? pinch.b : pinch.a; pinch = null; if (fingers[other]) fingers[other].kind = 'idle'; }
      delete fingers[e.pointerId];
    }
    function onWheel(e) {
      if (dead || !isActive() || typeof e.deltaY !== 'number' || !isFinite(e.deltaY) || e.deltaY === 0) return;
      e.preventDefault();
      var t = now();
      if (t - lastWheel >= WHEEL_MS) { zoomS += e.deltaY < 0 ? 1 : -1; lastWheel = t; }
    }
    function onKeyDown(e) {
      if (dead || e.ctrlKey || e.metaKey || e.altKey) return;
      var k = String(e.key).toLowerCase();
      if (k === 'escape') { if (!e.repeat) pause = true; return; }
      if (typing()) return;
      if (k === '+' || k === '=') { if (!e.repeat) zoomS += 1; return; }
      if (k === '-' || k === '_') { if (!e.repeat) zoomS -= 1; return; }
      if (KEYS[k] || k === 'shift') { down[k] = true; return; }
      if (k === 'e' || k === 'enter') {
        var ae = doc.activeElement;
        if (k === 'enter' && ae && ae.tagName === 'BUTTON') return;
        if (!e.repeat) action = true;
      }
    }
    function onKeyUp(e) { delete down[String(e.key).toLowerCase()]; }
    /* si la ventana pierde el foco o la pestaña se oculta no llegan los keyup/pointerup: se suelta todo para que el héroe no camine solo */
    function releaseAll() { down = {}; fingers = {}; pinch = null; }
    function onVisibility() { if (doc.hidden) releaseAll(); }
    root.addEventListener('pointerdown', onDown); root.addEventListener('pointermove', onMove);
    root.addEventListener('pointerup', onUp); root.addEventListener('pointercancel', onUp); root.addEventListener('wheel', onWheel, { passive: false });
    win.addEventListener('pointerup', onUp); win.addEventListener('pointercancel', onUp);
    win.addEventListener('keydown', onKeyDown); win.addEventListener('keyup', onKeyUp);
    win.addEventListener('blur', releaseAll); doc.addEventListener('visibilitychange', onVisibility);

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
    /* Estado de la palanca para dibujarla: centro (x, y) relativo al root y desplazamiento del botón (kx, ky) limitado al radio */
    function joy() {
      var id, f = null;
      if (!dead) for (id in fingers) if (fingers[id].kind === 'joy') { f = fingers[id]; break; }
      if (!f) return { on: false, x: 0, y: 0, kx: 0, ky: 0 };
      var m = Math.hypot(f.dx, f.dy), k = m > JOY_R ? JOY_R / m : 1;
      return { on: true, x: f.rx, y: f.ry, kx: f.dx * k, ky: f.dy * k };
    }
    function consumeZoom() { var r = { factor: zoomF, steps: zoomS }; zoomF = 1; zoomS = 0; return r; }
    function consumeAction() { var a = action; action = false; return a; }
    function consumePause() { var p = pause; pause = false; return p; }
    function dispose() {
      dead = true; fingers = {}; down = {}; pinch = null; zoomF = 1; zoomS = 0; action = false; pause = false;
      root.removeEventListener('pointerdown', onDown); root.removeEventListener('pointermove', onMove);
      root.removeEventListener('pointerup', onUp); root.removeEventListener('pointercancel', onUp); root.removeEventListener('wheel', onWheel);
      win.removeEventListener('pointerup', onUp); win.removeEventListener('pointercancel', onUp);
      win.removeEventListener('keydown', onKeyDown); win.removeEventListener('keyup', onKeyUp);
      win.removeEventListener('blur', releaseAll); doc.removeEventListener('visibilitychange', onVisibility);
    }
    return { intent: intent, joy: joy, consumeZoom: consumeZoom, consumeAction: consumeAction, consumePause: consumePause, releaseAll: releaseAll, dispose: dispose };
  }
  return { create: create };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = CityInput;
