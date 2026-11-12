/* Piezas 3D compartidas por el viaje y la ciudad: Pauser, carrera de compilación contra pérdida de contexto,
   liberación de escenas y fusión de cajas. Sin DOM propio: recibe canvas, renderer y THREE por parámetro. */
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

  /* Fusiona cajas en una sola BufferGeometry indexada con position, normal y color (sin uv).
     parts: [{ w, h, d, x, y, z, color: 0xRRGGBB, rotY? }] */
  function mergeBoxes(THREE, parts) {
    var pos = [], nor = [], col = [], idx = [], base = 0;
    parts.forEach(function (p) {
      var g = new THREE.BoxGeometry(p.w, p.h, p.d), c = new THREE.Color(p.color);
      var cs = Math.cos(p.rotY || 0), sn = Math.sin(p.rotY || 0);
      var gp = g.attributes.position, gn = g.attributes.normal, gi = g.index.array, i;
      for (i = 0; i < gp.count; i++) {
        var x = gp.getX(i), y = gp.getY(i), z = gp.getZ(i), nx = gn.getX(i), ny = gn.getY(i), nz = gn.getZ(i);
        pos.push(x * cs + z * sn + p.x, y + p.y, -x * sn + z * cs + p.z);
        nor.push(nx * cs + nz * sn, ny, -nx * sn + nz * cs);
        col.push(c.r, c.g, c.b);
      }
      for (i = 0; i < gi.length; i++) idx.push(gi[i] + base);
      base += gp.count;
      g.dispose();
    });
    var out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
    out.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(nor), 3));
    out.setAttribute('color', new THREE.BufferAttribute(new Float32Array(col), 3));
    out.setIndex(new THREE.BufferAttribute(base > 65535 ? new Uint32Array(idx) : new Uint16Array(idx), 1));
    return out;
  }

  return { Pauser: Pauser, compileOrLost: compileOrLost, disposeScene: disposeScene, mergeBoxes: mergeBoxes };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = Three3D;
