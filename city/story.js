/* Lógica pura de la historia de Ciudad Núcleo: normalización del guardado, restauración, rangos y objetivo activo.
   Sin DOM ni Three. D = CITY_DATA; C = S.city. Nunca confía en los booleanos guardados: restored y powers se recalculan. */
var CityStory = (function () {
  /* alias distinto de CityMove: un `var CityMove` aquí taparía al global en el navegador */
  var CM = (typeof CityMove !== 'undefined') ? CityMove : require('./move.js');
  var own = Object.prototype.hasOwnProperty, TAU = Math.PI * 2, DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

  function plainObj(x) { return !!x && typeof x === 'object' && !Array.isArray(x) && Object.getPrototypeOf(x) === Object.prototype; }
  function validDate(s, todayStr) {
    if (typeof s !== 'string' || !DATE_RE.test(s)) return false;
    var d = new Date(s + 'T00:00:00Z');
    if (isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== s) return false;
    return !todayStr || s <= todayStr;
  }
  function ids(list) { return list.map(function (x) { return x.id; }); }
  function pick(obj, idList, okv) {
    var o = {};
    if (plainObj(obj)) idList.forEach(function (id) { if (own.call(obj, id) && okv(obj[id])) o[id] = obj[id]; });
    return o;
  }
  function taughtCount(C, D) {
    var t = plainObj(C.taught) ? C.taught : {};
    return D.districts.M02.apprentices.filter(function (a) { return own.call(t, a.id) && t[a.id] === true; }).length;
  }
  function condition(C, D, bossPassed) { return !!bossPassed && taughtCount(C, D) >= D.districts.M02.need; }
  function insideBox(x, z, r, boxes) {
    return boxes.some(function (b) {
      var cx = Math.min(b.maxX, Math.max(b.minX, x)), cz = Math.min(b.maxZ, Math.max(b.minZ, z)), dx = x - cx, dz = z - cz;
      return dx * dx + dz * dz < r * r;
    });
  }

  /* Reconstruye S.city con listas blancas: ids de CITY_DATA con hasOwnProperty, fechas reales y no futuras, y posición válida. */
  function normalizeCity(raw, D, bossPassed, todayStr) {
    var src = plainObj(raw) ? raw : {}, M = D.districts.M02, B = D.bounds, r = D.radius || 0.4, sp = D.spawn;
    var C = {
      prologue: src.prologue === true, run: src.run === true, bridgeSeen: src.bridgeSeen === true,
      beaten: pick(src.beaten, ids(M.creatures).concat(ids(D.villainsM01 || [])), function (v) { return validDate(v, todayStr); }),
      repairs: pick(src.repairs, ids(M.repairs), function (v) { return v === true; }),
      taught: pick(src.taught, ids(M.apprentices), function (v) { return v === true; }),
      restored: {}, powers: {}, at: { x: sp.x, z: sp.z, yaw: sp.yaw }
    };
    var ok = condition(C, D, bossPassed);
    if (ok) { C.restored.M02 = true; C.powers.planos = true; }
    var a = plainObj(src.at) ? src.at : null;
    if (a && CM.isNum(a.x) && CM.isNum(a.z)) {
      var x = CM.coord(a.x, B.minX + r, B.maxX - r, sp.x), z = CM.coord(a.z, B.minZ + r, B.maxZ - r, sp.z);
      if (!insideBox(x, z, r, CM.boxesFor(D, ok))) {
        C.at = { x: x, z: z, yaw: CM.isNum(a.yaw) ? ((a.yaw % TAU) + TAU) % TAU : sp.yaw };
      }
    }
    return C;
  }

  /* 0 a 100: la mitad por enseñar a los 8 aprendices y la otra mitad por el jefe */
  function restoration(C, D, bossPassed) {
    var need = D.districts.M02.need, t = Math.min(taughtCount(C, D), need);
    return Math.round(100 * (0.5 * t / need + 0.5 * (bossPassed ? 1 : 0)));
  }
  function isRestored(C, D, bossPassed) { return condition(C, D, bossPassed); }
  /* Idempotente: pone o quita restored.M02 y powers.planos según la condición. changed solo si M02 pasó de no restaurado a restaurado. */
  function applyRestore(C, D, bossPassed) {
    var ok = condition(C, D, bossPassed), was = !!(C.restored && C.restored.M02 === true);
    if (!plainObj(C.restored)) C.restored = {};
    if (!plainObj(C.powers)) C.powers = {};
    if (ok) { C.restored.M02 = true; C.powers.planos = true; } else { delete C.restored.M02; delete C.powers.planos; }
    return { changed: ok && !was };
  }
  function rankOf(C, D) {
    var n = 0, rs = plainObj(C.restored) ? C.restored : {};
    Object.keys(D.districts).forEach(function (id) { if (rs[id] === true) n++; });
    var name = D.ranks[0][1];
    D.ranks.forEach(function (rk) { if (n >= rk[0]) name = rk[1]; });
    return name;
  }
  function apprenticesAvailable(C, D, starsOf) {
    var t = plainObj(C.taught) ? C.taught : {};
    return D.districts.M02.apprentices.filter(function (a) { return t[a.id] !== true && starsOf(a.topic) >= 1; });
  }

  /* Objetivo activo (spec §3.5). ctx = { learned(topic), stars(topic), beatenEver(id), beatenToday(id), bossUnlocked, bossPassed } */
  function nextObjective(C, D, ctx) {
    var M = D.districts.M02, dir = D.plaza.director, i;
    if (!C.prologue) return { kind: 'director', id: dir.id, label: 'Habla con ' + dir.name };
    if (C.restored && C.restored.M02 === true) {
      return C.bridgeSeen ? { kind: 'done', id: null, label: 'Capítulo completo' } : { kind: 'bridge', id: M.bridge.id, label: 'Cruza el puente' };
    }
    if (ctx.bossUnlocked && !ctx.bossPassed) return { kind: 'tower', id: M.tower.id, label: 'Entra a la torre' };
    for (i = 0; i < M.creatures.length; i++) {
      var cr = M.creatures[i], ms = cr.topics.map(function (t) { return M.mentors.filter(function (m) { return m.topic === t; })[0]; });
      var unlearned = ms.filter(function (m) { return !ctx.learned(m.topic); })[0];
      var noStars = ms.filter(function (m) { return ctx.stars(m.topic) < 1; })[0];
      if (unlearned) return { kind: 'mentor', id: unlearned.id, label: 'Habla con ' + unlearned.name };
      if (noStars) return { kind: 'practice', id: noStars.id, label: 'Practica con ' + noStars.name };
      if (!ctx.beatenEver(cr.id)) return { kind: 'creature', id: cr.id, label: 'Enfrenta a ' + cr.name };
    }
    var rp = M.repairs.filter(function (x) { return !(C.repairs && C.repairs[x.id] === true); })[0];
    if (rp) return { kind: 'repair', id: rp.id, label: 'Repara el ' + rp.label };
    var ap = M.apprentices.filter(function (x) { return !(C.taught && C.taught[x.id] === true) && ctx.stars(x.topic) >= 1; })[0];
    if (ap) return { kind: 'apprentice', id: ap.id, label: 'Enseña a ' + ap.name };
    var cb = M.creatures.filter(function (x) { return !ctx.beatenToday(x.id); })[0];
    if (cb) return { kind: 'creature', id: cb.id, label: 'Enfrenta a ' + cb.name };
    return { kind: 'none', id: null, label: '' };
  }

  return { normalizeCity: normalizeCity, taughtCount: taughtCount, restoration: restoration, isRestored: isRestored, applyRestore: applyRestore, rankOf: rankOf, apprenticesAvailable: apprenticesAvailable, nextObjective: nextObjective };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = CityStory;
