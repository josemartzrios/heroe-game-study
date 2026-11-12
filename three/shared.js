/* Piezas comunes del viaje 3D y del mundo 2D de la ciudad: Pauser (pausa por motivos), carrera de compilación contra pérdida
   de contexto y liberación de escenas. Sin DOM propio: recibe canvas, renderer y THREE por parámetro. */
var Three3D = (function () {
  /* Pausa por motivos: el bucle corre solo si no hay ninguno activo. */
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
      has: function (r) { return !!reasons[r]; },
      tick: function (ts) { var dt = last ? Math.min(50, ts - last) : 16; last = ts; return dt; }
    };
  }

  /* compileAsync de r169 sondea cada 10 ms y no termina nunca si se pierde el contexto: se compite contra webglcontextlost. */
  function compileOrLost(renderer, scene, camera, canvas) {
    var onLost;
    var lostP = new Promise(function (_, rej) { onLost = function () { rej(new Error('contextlost')); }; canvas.addEventListener('webglcontextlost', onLost); });
    var compiled;
    try { compiled = renderer.compileAsync ? renderer.compileAsync(scene, camera) : Promise.resolve(renderer.compile(scene, camera)); }
    catch (e) { canvas.removeEventListener('webglcontextlost', onLost); return Promise.reject(e); }
    return Promise.race([Promise.resolve(compiled), lostP]).then(function (v) {
      canvas.removeEventListener('webglcontextlost', onLost); return v;
    }, function (err) {
      canvas.removeEventListener('webglcontextlost', onLost); throw err;
    });
  }

  /* Libera cada geometría y material único de la escena (InstancedMesh.dispose no libera su geometría). */
  function disposeScene(scene) {
    var gs = new Set(), ms = new Set();
    scene.traverse(function (o) {
      if (o.geometry) gs.add(o.geometry);
      if (o.material) { if (Array.isArray(o.material)) o.material.forEach(function (m) { ms.add(m); }); else ms.add(o.material); }
    });
    gs.forEach(function (g) { g.dispose(); });
    ms.forEach(function (m) { m.dispose(); });
  }

  return { Pauser: Pauser, compileOrLost: compileOrLost, disposeScene: disposeScene };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = Three3D;
