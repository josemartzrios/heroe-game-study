/* Lógica pura de la historia de Ciudad Núcleo: normalización del guardado por distrito (S.city.d[mid]), migración del formato plano,
   restauración, rangos y objetivo activo. Sin DOM. D = CITY_DATA; C = S.city. Nunca confía en los booleanos guardados: restored y powers se recalculan. */
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
  /* [0, 2π) idempotente: un ángulo ya normalizado no cambia (sumar 2π y volver a tomar el módulo movía un ulp) y sin -0 */
  function normYaw(v) {
    var y = v % TAU;
    if (y < 0) y += TAU;
    return (y > 0 && y < TAU) ? y : 0;
  }
  function ids(list) { return list.map(function (x) { return x.id; }); }
  function pick(obj, idList, okv) {
    var o = {};
    if (plainObj(obj)) idList.forEach(function (id) { if (own.call(obj, id) && okv(obj[id])) o[id] = obj[id]; });
    return o;
  }
  /* lectura segura de una clave propia (un __proto__ del JSON nunca se hereda) */
  function get(o, k) { return (plainObj(o) && own.call(o, k)) ? o[k] : undefined; }
  function isTrue(v) { return v === true; }

  /* Solo para migrar guardados anteriores a los distritos: el único distrito que existía era M02 y su rect ocupaba el mundo al norte
     de la plaza (el mundo viejo medía -70..70 × -195..40). Cerrado en todos los bordes; luego la posición se acota a los bounds de M02. */
  var LEGACY_ID = 'M02', LEGACY_M02_RECT = { minX: -70, maxX: 70, minZ: -195, maxZ: -44 };
  var TIP_IDS = ['talk', 'star', 'creature', 'repair', 'tower', 'portals'];

  /* un llamador que no es función, que lanza o que no devuelve true exactamente → no pasó el jefe; solo se llama con ids de D.districts */
  function bossOk(bossPassedOf, mid) {
    try { return typeof bossPassedOf === 'function' && bossPassedOf(mid) === true; } catch (e) { return false; }
  }
  function dOf(C, mid) { var d = plainObj(C.d) && own.call(C.d, mid) && plainObj(C.d[mid]) ? C.d[mid] : {}; return d; }
  function taughtCount(C, D, mid) {
    var t = plainObj(dOf(C, mid).taught) ? dOf(C, mid).taught : {};
    return D.districts[mid].apprentices.filter(function (a) { return own.call(t, a.id) && t[a.id] === true; }).length;
  }
  function condition(C, D, mid, bossPassedOf) { return bossOk(bossPassedOf, mid) && taughtCount(C, D, mid) >= D.districts[mid].need; }
  function insideBox(x, z, r, boxes) {
    return boxes.some(function (b) {
      var cx = Math.min(b.maxX, Math.max(b.minX, x)), cz = Math.min(b.maxZ, Math.max(b.minZ, z)), dx = x - cx, dz = z - cz, rr = r - 1e-6;
      return dx * dx + dz * dz < rr * rr;
    });
  }
  function inRect(x, z, R) { return x >= R.minX && x <= R.maxX && z >= R.minZ && z <= R.maxZ; }
  function routeDone(r, n) {
    var v = get(r, 'done');
    return (typeof v === 'number' && isFinite(v) && Math.floor(v) === v && v > 0) ? Math.min(v, n) : 0;
  }

  /* Posición válida dentro de una escena: se acota a sus bounds menos el radio; una caja sólida → su entrada; un portal (o la salida) →
     el punto de regreso del portal (o la entrada del distrito) para no cambiar de escena nada más cargar. */
  function resolveAt(a, sceneId, D) {
    var sc = CM.scene(D, sceneId), B = sc.bounds, r = D.radius || 0.4, e = sc.entry;
    var entry = { x: e.x, z: e.z, yaw: e.yaw };
    if (!plainObj(a) || !CM.isNum(a.x) || !CM.isNum(a.z)) return entry;
    var x = CM.coord(a.x, B.minX + r, B.maxX - r, e.x), z = CM.coord(a.z, B.minZ + r, B.maxZ - r, e.z);
    if (insideBox(x, z, r, CM.boxesFor(D, sceneId))) return entry;
    var hit = CM.portalAt(D, sceneId, x, z);
    if (hit !== null) {
      if (sceneId !== 'plaza') return entry;
      var p = D.plaza.portals.filter(function (q) { return q.dist === hit; })[0];
      return { x: p.back.x, z: p.back.z, yaw: p.back.yaw };
    }
    return { x: x, z: z, yaw: CM.isNum(a.yaw) ? normYaw(a.yaw) : e.yaw };
  }

  /* Reconstruye S.city con listas blancas. bossPassedOf(mid) dice si el jefe de ese módulo está aprobado.
     Sin d (guardado anterior a los distritos) se migran los campos planos a d[LEGACY_ID]; con d gana d. */
  function normalizeCity(raw, D, bossPassedOf, todayStr) {
    var src = plainObj(raw) ? raw : {}, mids = Object.keys(D.districts), srcD = get(src, 'd');
    var C = { prologue: get(src, 'prologue') === true, run: get(src, 'run') === true, tips: pick(get(src, 'tips'), TIP_IDS, isTrue), scene: 'plaza', at: null, d: {}, restored: {}, powers: {} };
    mids.forEach(function (mid) {
      var M = D.districts[mid], base = plainObj(srcD) ? get(srcD, mid) : (mid === LEGACY_ID ? src : null);
      var o = {
        beaten: pick(get(base, 'beaten'), ids(M.creatures), function (v) { return validDate(v, todayStr); }),
        repairs: pick(get(base, 'repairs'), ids(M.repairs), isTrue),
        taught: pick(get(base, 'taught'), ids(M.apprentices), isTrue)
      };
      if (M.route) o.route = { done: routeDone(get(base, 'route'), M.route.stations.length) };
      C.d[mid] = o;
    });
    mids.forEach(function (mid) {
      if (condition(C, D, mid, bossPassedOf)) { C.restored[mid] = true; var pw = D.districts[mid].celebrate && D.districts[mid].celebrate.power; if (pw) C.powers[pw.id] = true; }
    });
    var a = get(src, 'at'), sc = get(src, 'scene');
    if (own.call(src, 'scene')) {   // con scene: válida → esa escena; cualquier otro valor → la plaza en su entrada (la posición era de una escena desconocida)
      var known = typeof sc === 'string' && (sc === 'plaza' || own.call(D.districts, sc));
      C.scene = known ? sc : 'plaza';
      C.at = known ? resolveAt(a, C.scene, D) : resolveAt(null, 'plaza', D);
    } else {   // sin scene: migración por el rect del mundo viejo
      var ok = plainObj(a) && CM.isNum(a.x) && CM.isNum(a.z), legacy = ok && own.call(D.districts, LEGACY_ID) && inRect(a.x, a.z, LEGACY_M02_RECT);
      C.scene = legacy ? LEGACY_ID : 'plaza';
      C.at = resolveAt(a, C.scene, D);
    }
    return C;
  }

  /* Espejo: copia d[LEGACY_ID] a los campos planos que leía el código anterior, para que una pestaña vieja no pierda el progreso de ese distrito. */
  function mirror(C) {
    var d = dOf(C, LEGACY_ID);
    function copy(o) { var r = {}; if (plainObj(o)) Object.keys(o).forEach(function (k) { if (k !== '__proto__') r[k] = o[k]; }); return r; }
    C.beaten = copy(d.beaten); C.repairs = copy(d.repairs); C.taught = copy(d.taught);
    return C;
  }

  /* 0 a 100: la mitad por enseñar a `need` aprendices y la otra mitad por el jefe */
  function restoration(C, D, mid, bossPassed) {
    var need = D.districts[mid].need, t = Math.min(taughtCount(C, D, mid), need);
    return Math.round(100 * (0.5 * t / need + 0.5 * (bossPassed ? 1 : 0)));
  }
  /* Idempotente: pone o quita restored[mid] y los poderes según la condición. changed lista los distritos que pasaron de no restaurados a restaurados. */
  function applyRestore(C, D, bossPassedOf) {
    var changed = [];
    if (!plainObj(C.restored)) C.restored = {};
    C.powers = {};
    Object.keys(D.districts).forEach(function (mid) {
      var ok = condition(C, D, mid, bossPassedOf), was = C.restored[mid] === true;
      if (ok) {
        C.restored[mid] = true;
        var pw = D.districts[mid].celebrate && D.districts[mid].celebrate.power; if (pw) C.powers[pw.id] = true;
        if (!was) changed.push(mid);
      } else delete C.restored[mid];
    });
    return { changed: changed };
  }
  function rankOf(C, D) {
    var n = 0, rs = plainObj(C.restored) ? C.restored : {};
    Object.keys(D.districts).forEach(function (id) { if (own.call(rs, id) && rs[id] === true) n++; });
    var name = D.ranks[0][1];
    D.ranks.forEach(function (rk) { if (n >= rk[0]) name = rk[1]; });
    return name;
  }
  function apprenticesAvailable(C, D, mid, starsOf) {
    var t = plainObj(dOf(C, mid).taught) ? dOf(C, mid).taught : {};
    return D.districts[mid].apprentices.filter(function (a) { return t[a.id] !== true && starsOf(a.topic) >= 1; });
  }
  /* distrito recomendado: el primero de D.order que existe y no está restaurado */
  function recommended(C, D) {
    var rs = plainObj(C.restored) ? C.restored : {}, i;
    for (i = 0; i < D.order.length; i++) if (own.call(D.districts, D.order[i]) && rs[D.order[i]] !== true) return D.order[i];
    return null;
  }

  /* Objetivo activo. En la plaza: Iris y luego el portal recomendado. En un distrito (sceneId = su id):
     ctx = { learned(topic), stars(topic), beatenEver(id), beatenToday(id), bossUnlocked, bossPassed } */
  function nextObjective(C, D, sceneId, ctx) {
    var dir = D.plaza.director, i;
    if (sceneId === 'plaza') {
      if (!C.prologue) return { kind: 'director', id: dir.id, label: 'Habla con ' + dir.name };
      var rec = recommended(C, D);
      return rec ? { kind: 'portal', id: rec, label: 'Entra a ' + D.districts[rec].name } : { kind: 'none', id: null, label: 'Ciudad al día: más distritos pronto' };
    }
    if (typeof sceneId !== 'string' || !own.call(D.districts, sceneId)) return { kind: 'none', id: null, label: '' };
    var M = D.districts[sceneId], dd = dOf(C, sceneId);
    if (C.restored && C.restored[sceneId] === true) return { kind: 'plaza', id: 'exit', label: 'Vuelve a la plaza' };
    if (ctx.bossUnlocked && !ctx.bossPassed) return { kind: 'tower', id: M.tower.id, label: 'Entra a la torre' };
    for (i = 0; i < M.creatures.length; i++) {
      var cr = M.creatures[i], ms = cr.topics.map(function (t) { return M.mentors.filter(function (m) { return m.topic === t; })[0]; });
      var unlearned = ms.filter(function (m) { return !ctx.learned(m.topic); })[0];
      var noStars = ms.filter(function (m) { return ctx.stars(m.topic) < 1; })[0];
      if (unlearned) return { kind: 'mentor', id: unlearned.id, label: 'Habla con ' + unlearned.name };
      if (noStars) return { kind: 'practice', id: noStars.id, label: 'Practica con ' + noStars.name };
      if (!ctx.beatenEver(cr.id)) return { kind: 'creature', id: cr.id, label: 'Enfrenta a ' + cr.name };
    }
    if (M.route) {
      var done = routeDone(dd.route, M.route.stations.length);
      if (done < M.route.stations.length) return { kind: 'route', id: 'pad' + done, label: 'Ruta del paquete · estación ' + (done + 1) + ' de ' + M.route.stations.length };
    }
    var rp = M.repairs.filter(function (x) { return !(plainObj(dd.repairs) && dd.repairs[x.id] === true); })[0];
    if (rp) return { kind: 'repair', id: rp.id, label: 'Repara ' + rp.label };
    var ap = apprenticesAvailable(C, D, sceneId, ctx.stars)[0];
    if (ap) return { kind: 'apprentice', id: ap.id, label: 'Enseña a ' + ap.name };
    var cb = M.creatures.filter(function (x) { return !ctx.beatenToday(x.id); })[0];
    if (cb) return { kind: 'creature', id: cb.id, label: 'Enfrenta a ' + cb.name };
    return { kind: 'none', id: null, label: '' };
  }

  return { normalizeCity: normalizeCity, taughtCount: taughtCount, restoration: restoration, applyRestore: applyRestore, rankOf: rankOf, apprenticesAvailable: apprenticesAvailable, nextObjective: nextObjective, mirror: mirror, LEGACY_M02_RECT: LEGACY_M02_RECT, TIP_IDS: TIP_IDS };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = CityStory;
