/* Vista `city` de Ciudad Núcleo, una escena a la vez: la plaza o un distrito (CD.scene). Se inserta DENTRO de la IIFE del motor: usa S, V, go,
   esc, fmt, mod, starsOf, queue, sample, startRound, levelOf, bossPassedOf, cityD, beatenToday, CITY_DATA, CityMove, CityStory, CityInput y CityWorld2D. ES5. Texto de datos: solo esc()/fmt() en innerHTML;
   el botón de acción, #city-live y #city-obj se escriben solo con textContent. */
var CD = null, cityGen = 0;
function cityLoadHtml(text) { return '<div id="city-loadbox"><p role="status" id="city-load">' + esc(text) + '</p><button class="btn" data-act="cx" data-c="quit">Salir</button></div>'; }
var CITY_ZMIN = 1, CITY_ZMAX = 1.75, CITY_LOAD_MS = 250, CITY_FADE_MS = 250, CITY_SAVE_M = 1;
var CITY_ROTATE_Q = '(orientation: landscape) and (max-height: 499px) and (pointer: coarse)';
var CITY_NEAR = 2.2;

function cityRootEl() { return document.getElementById('city-root'); }
function cId(id) { return document.getElementById(id); }
function cFocus(el) {
  if (!el) return;
  try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); }
}
function cityWorldFactory() {
  var f = window.__CITY_WORLD__;
  if (window.__CITY_TEST__ === true && f && typeof f.create === 'function' && !(typeof Node !== 'undefined' && f instanceof Node)) return f;
  return (typeof CityWorld2D !== 'undefined') ? CityWorld2D : null;
}
function cityReduced() {
  try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; }
}
function cityHasDistrict(id) { return typeof id === 'string' && Object.prototype.hasOwnProperty.call(CITY_DATA.districts, id); }
function citySceneName(id) { var sc = CityMove.scene(CITY_DATA, id); return sc ? sc.name : ''; }
function cityPortalOf(dist) { var ps = CITY_DATA.plaza.portals, i; for (i = 0; i < ps.length; i++) if (ps[i].dist === dist) return ps[i]; return null; }
/* punto de llegada en una escena: la entrada de un distrito, o el punto de regreso del portal de un distrito al volver a la plaza */
function cityArrival(sceneId, from) {
  if (sceneId === 'plaza') { var p = from ? cityPortalOf(from) : null, b = p ? p.back : CITY_DATA.plaza.entry; return { x: b.x, z: b.z, yaw: b.yaw }; }
  var e = CITY_DATA.districts[sceneId].entry; return { x: e.x, z: e.z, yaw: e.yaw };
}
function cityRestoredN() {
  var ids = Object.keys(CITY_DATA.districts), n = 0;
  ids.forEach(function (id) { if (S.city.restored[id] === true) n++; });
  return { done: n, total: ids.length };
}
/* ---------- lugares: interactuables de la escena activa ---------- */
function cityBase() {
  var out = [], d, M, P = CITY_DATA.plaza;
  if (CD.scene === 'plaza') {
    out.push({ id: P.director.id, kind: 'director', name: P.director.name, label: 'Hablar con ' + P.director.name, x: P.director.x, z: P.director.z });
    out.push({ id: P.mirror.id, kind: 'mirror', name: P.mirror.name, label: 'Mirar el espejo', x: P.mirror.x, z: P.mirror.z });
    P.portals.forEach(function (p) {
      var Md = cityHasDistrict(p.dist) ? CITY_DATA.districts[p.dist] : null;
      out.push({ id: 'portal:' + p.dist, kind: 'portal', dist: p.dist, name: Md ? Md.name : p.dist, label: Md ? 'Entrar a ' + Md.name : 'Ver ' + p.dist, sub: '', x: p.x, z: p.z, r: 4 });
    });
    return out;
  }
  M = CD.sc;
  M.mentors.forEach(function (m) { out.push({ id: m.id, kind: 'mentor', name: m.name, label: 'Hablar con ' + m.name, x: m.x, z: m.z, topic: m.topic }); });
  M.creatures.forEach(function (c) { out.push({ id: c.id, kind: 'creature', name: c.name, label: 'Enfrentar a ' + c.name, x: c.area.x, z: c.area.z, topics: c.topics }); });
  M.repairs.forEach(function (r) { out.push({ id: r.id, kind: 'repair', name: r.label, label: 'Reparar ' + r.label, x: r.x, z: r.z, topic: r.topic }); });
  M.apprentices.forEach(function (a) { out.push({ id: a.id, kind: 'apprentice', name: a.name, label: 'Enseñar a ' + a.name, x: a.x, z: a.z, topic: a.topic, mode: a.mode }); });
  d = CityMove.door(M.tower); out.push({ id: M.tower.id, kind: 'tower', name: 'Torre', label: 'Entrar a la torre', x: d.x, z: d.z });
  if (M.route) M.route.pads.forEach(function (p, i) { out.push({ id: 'pad' + i, kind: 'pad', idx: i, name: 'Estación ' + (i + 1), label: 'Estación ' + (i + 1), sub: '', x: p.x, z: p.z, r: 2.5 }); });
  out.push({ id: 'exit', kind: 'exit', name: 'Plaza', label: 'Volver a la plaza', x: M.exit.x, z: M.exit.z, r: 4 });
  return out;
}
/* Lugares disponibles ahora: se recalcula solo en cityRefresh (cambian los flags o el día), nunca por cuadro */
function cityItems() { return (CD && CD.items) || []; }
/* Ids de los aprendices que se ofrecen ahora (regla única: CityStory.apprenticesAvailable) */
function cityApprenticeIds() {
  var out = {};
  if (CD.scene === 'plaza') return out;
  var m = mod(CD.scene);
  CityStory.apprenticesAvailable(S.city, CITY_DATA, CD.scene, function (t) { return starsOf(m, t); }).forEach(function (a) { out[a.id] = 1; });
  return out;
}
/* texto secundario del portal: módulo, número de temas y avance del distrito */
function cityPortalSub(dist) {
  if (!cityHasDistrict(dist)) return dist + ' · Próximamente';
  var m = mod(dist);
  return dist + ' · ' + (m ? m.topics.length : 0) + ' temas · ' + CityStory.restoration(S.city, CITY_DATA, dist, bossPassedOf(dist)) + ' % restaurado';
}
function cityBuildItems() {
  if (!CD.base) CD.base = cityBase();
  var avail = cityApprenticeIds(), sc = CD.scene, dd = sc === 'plaza' ? null : cityD(sc);
  return CD.base.filter(function (o) {
    if (o.kind === 'portal') { o.sub = cityPortalSub(o.dist); return true; }
    if (o.kind === 'pad') {   // solo el pad activo (o el primero, para repetir la ruta completa) es interactivo
      var sts = CD.sc.route.stations, rd = cityRouteDone();
      if (rd < sts.length) { if (o.idx !== rd) return false; o.label = 'Estación ' + (rd + 1) + ' de ' + sts.length; o.sub = sts[rd].name; return true; }
      if (o.idx !== 0) return false; o.label = 'Recorrer otra vez'; o.sub = 'Ruta del paquete completa'; return true;
    }
    if (o.kind === 'creature') return !beatenToday(sc, o.id);
    if (o.kind === 'repair') return !(dd && dd.repairs[o.id] === true);
    if (o.kind === 'apprentice') return !!avail[o.id];
    return true;
  });
}
/* Recalcula flags, lugares, objetivo y HUD: al iniciar, al reanudar, al cerrar una hoja y al cambiar el día */
function cityRefresh() {
  if (!CD) return;
  CD.flags = cityFlags(); CD.items = cityBuildItems(); CD.day = today(); CD.dayT = Date.now();
  if (CD.world && CD.sc.route && typeof CD.world.setRoute === 'function') CD.world.setRoute(cityRouteDone());   // pads y cable de la ruta (la 1.ª vez sin animar)
  cityHud(true); cityUpdateNear(true);
  cityTipsCheck('tower'); cityTipsCheck('plaza');
}
function cityItem(id) {
  if (!CD) return null;
  if (!CD.base) CD.base = cityBase();
  for (var i = 0; i < CD.base.length; i++) if (CD.base[i].id === id) return CD.base[i];
  return null;
}
/* ---------- objetivo ---------- */
function cityObjective() {
  var sc = CD.scene;
  if (sc === 'plaza') return CityStory.nextObjective(S.city, CITY_DATA, 'plaza', null);
  var m = mod(sc), dd = cityD(sc);
  return CityStory.nextObjective(S.city, CITY_DATA, sc, {
    learned: function (t) { return S.stats.learnTopics.indexOf(sc + ':' + t) >= 0; },
    stars: function (t) { return starsOf(m, t); },
    beatenEver: function (id) { return !!dd.beaten[id]; },
    beatenToday: function (id) { return beatenToday(sc, id); },
    bossUnlocked: bossUnlocked(m), bossPassed: bossPassedOf(sc)
  });
}
function cityObjTarget(o) {
  if (!o) return null;
  var id = o.kind === 'portal' ? 'portal:' + o.id : (o.kind === 'plaza' ? 'exit' : o.id);
  return id ? cityItem(id) : null;
}
/* flags del mundo: restored y lit significan "esta escena" (distrito: restaurado y progreso de 0 a 8; plaza: todos los distritos y su avance) */
function cityFlags() {
  var f = { beatenToday: {}, repairs: {}, apprenticesVisible: {}, stars: {}, restored: false, lit: 0 }, sc = CD.scene;
  if (sc === 'plaza') {
    var n = cityRestoredN(); f.restored = n.total > 0 && n.done === n.total; f.lit = n.total ? Math.round(8 * n.done / n.total) : 0;
    return f;
  }
  var m = mod(sc), M = CD.sc, dd = cityD(sc);
  f.restored = S.city.restored[sc] === true;
  f.lit = Math.round(8 * Math.min(CityStory.taughtCount(S.city, CITY_DATA, sc), M.need) / M.need);
  M.creatures.forEach(function (c) { if (beatenToday(sc, c.id)) f.beatenToday[c.id] = 1; });
  M.repairs.forEach(function (r) { if (dd.repairs[r.id] === true) f.repairs[r.id] = 1; });
  f.apprenticesVisible = cityApprenticeIds();
  M.mentors.forEach(function (x) { f.stars[x.id] = starsOf(m, x.topic); });
  return f;
}

/* ---------- ciclo de vida ---------- */
function citySafe() {
  var el = cId('city-safe'), cs, l = 0, b = 0;
  if (el) { try { cs = window.getComputedStyle(el); l = parseFloat(cs.paddingLeft) || 0; b = parseFloat(cs.paddingBottom) || 0; } catch (e) {} }
  return { left: l, bottom: b };
}
function cityMakeInput() {
  var inp = CityInput.create(cityRootEl(), {
    safe: citySafe,
    isActive: function () { return !cityBlocked(); },
    isFree: function (el) { return !(el && el.closest && el.closest('button, #city-sheet, #city-pausebox, #city-rotate, #city-err, #city-veil, #city-tip')); }
  });
  /* con la hoja o la pausa abiertas el mundo no agenda cuadros (no hay tick): Esc se atiende aquí, después del listener del input */
  var fn = function () { if (CD && CD.input === inp && !CD.suspended && (CD.sheet || CD.paused) && inp.consumePause()) cityPauseKey(); };
  window.addEventListener('keydown', fn);
  inp.offKeys = function () { window.removeEventListener('keydown', fn); };
  return inp;
}
function cityDropInput(c) { if (c && c.input) { try { if (c.input.offKeys) c.input.offKeys(); c.input.dispose(); } catch (e) {} c.input = null; } }
function cityPauseKey() {
  if (!CD) return;
  if (CD.sheet) { if (CD.sheetFor === 'iris' && !S.city.prologue) cityIntroDone(); else cityCloseSheet(); }   // Esc en el prólogo cuenta como cerrarlo
  else if (CD.paused) cityClosePause(); else if (!CD.rotate) cityOpenPause();
}
function cityFlush() { if (CD && CD.input) { CD.input.consumeAction(); CD.input.consumeZoom(); } }
function cityHtml() {
  var run = levelOf(S.xp) >= 5 ? '<button class="btn sm" id="city-run" data-act="cx" data-c="run" aria-pressed="' + (S.city.run ? 'true' : 'false') + '">Correr</button>' : '';
  return '<canvas id="city-cv" aria-hidden="true"></canvas><div id="city-joy" aria-hidden="true"><i class="jbase"></i><i class="jknob"></i></div>' +
    '<div id="city-ui-main"><div class="city-hud"><button class="btn sm" id="city-pause" data-act="cx" data-c="pause">Pausa</button>' + run +
    '<span class="pill" id="city-rank"></span><span class="pill" id="city-xp"></span><span class="pill" id="city-rest"></span><span class="pill" id="city-layers" hidden></span>' +
    '<p class="city-objrow"><span id="city-arrow" aria-hidden="true">▲</span><span id="city-obj"></span></p></div>' +
    '<button class="btn primary" id="city-act" data-act="cx" data-c="act" hidden><span class="act-main"></span><span class="act-sub" hidden></span></button></div>' +
    '<div id="city-live" class="sronly" aria-live="polite"></div>' +   // fuera de #city-ui-main: ese subárbol queda inert durante el fundido y un inert no se anuncia
    '<div id="city-sheet" hidden role="dialog" aria-modal="true"></div><div id="city-pausebox" hidden role="dialog" aria-modal="true" aria-label="Pausa"></div>' +
    '<div id="city-rotate" hidden role="alert"><p>Gira tu teléfono a vertical</p></div><div id="city-err" hidden></div><div id="city-veil" aria-hidden="true"></div><div id="city-tip" role="status" data-act="cx" data-c="tip-close"></div>' +
    '<div id="city-safe" style="position:fixed;left:0;bottom:0;padding-left:env(safe-area-inset-left);padding-bottom:env(safe-area-inset-bottom);visibility:hidden"></div>';
}
function cityTeardown() {
  cityGen++;
  var c = CD; CD = null;
  if (!c) return;
  if (c.loadTimer) clearTimeout(c.loadTimer);
  if (c.fadeT) clearTimeout(c.fadeT);
  cityDropInput(c);
  if (c.world) { try { c.world.dispose(); } catch (e2) {} }
}
function cityStop() {
  cityTeardown();
  var r = cityRootEl();
  if (r) { r.hidden = true; r.innerHTML = ''; }
}
function cityPos() { return CD ? { x: CD.hero.x, z: CD.hero.z, yaw: CD.hero.yaw } : null; }
function citySave() { var p = cityPos(); if (p) { S.city.at = p; S.city.scene = CD.scene; } save(); }
function cityFallback(kind) {
  if (CD) citySave();
  cityTeardown();
  var r = cityRootEl(); r.hidden = false;
  if (kind === 'lost') {
    r.innerHTML = '<div class="banner up" role="alert"><p>Se perdió la vista de la ciudad.</p><div class="actions"><button class="btn primary" data-act="cx" data-c="retry">Reintentar</button><button class="btn" data-act="cx" data-c="quit">Salir</button></div></div>';
  } else {
    r.innerHTML = '<div class="banner up" role="alert"><p>No se pudo mostrar la ciudad.</p><div class="actions"><button class="btn" data-act="cx" data-c="mods">Ir a los módulos</button><button class="btn primary" data-act="cx" data-c="home">Volver</button></div></div>';
  }
  var b = r.querySelector('button.primary'); if (b) cFocus(b);
}
/* Estado de la vista para una escena: su objeto, sus cajas, el héroe en `at` y los cachés vacíos */
function citySetScene(c, id, at) {
  c.scene = id; c.sc = CityMove.scene(CITY_DATA, id); c.boxes = CityMove.boxesFor(CITY_DATA, id);
  c.base = null; c.items = null; c.flags = null; c.teach = null; c.route = null; c.nearId = null; c.obj = null; c.objTarget = null; c.lastAng = -1; c.joyKey = '';
  c.hero = { x: at.x, z: at.z, yaw: at.yaw, vx: 0, vz: 0, speed: 0 }; c.safe = { x: at.x, z: at.z, yaw: at.yaw }; c.savedAt = { x: at.x, z: at.z };
  c.face = CityMove.faceOf(at.yaw);
}
/* Crea el mundo de una escena sobre el canvas de la vista */
function cityCreateWorld(c, sceneId) {
  var F = cityWorldFactory();
  if (!F) return Promise.reject(new Error('sin mundo'));
  var made, tok = c.wtok = (c.wtok || 0) + 1;   // un aviso de pérdida de un mundo que ya se liberó (otra escena) no cuenta
  try {
    made = F.create(c.canvas, CITY_DATA, sceneId, { reducedMotion: cityReduced(), tick: cityTick, state: cityState, onLost: function () { if (CD !== c || c.wtok !== tok) return; if (c.suspended) c.lost = true; else cityFallback('lost'); } });
  } catch (e) { return Promise.reject(e); }
  return Promise.resolve(made);
}
/* Aviso de que un distrito no se pudo abrir: no se cierra solo, con Reintentar (con el foco) y Cerrar. Está fuera de #city-ui-main. */
function cityShowError(name, id) {
  var e = cId('city-err'); if (!e) return;
  e.innerHTML = '<div class="banner up" role="alert"><p>' + esc('No se pudo abrir ' + name + '.') + '</p><div class="actions"><button class="btn primary" data-act="cx" data-c="err-retry" data-id="' + esc(id) + '">Reintentar</button><button class="btn" data-act="cx" data-c="err-close">Cerrar</button></div></div>';
  e.hidden = false; cFocus(e.querySelector('button.primary'));
}
function cityHideError() { var e = cId('city-err'); if (e) { e.hidden = true; e.innerHTML = ''; } }
/* Un distrito no se pudo crear: se intenta la plaza (en el regreso de su portal) y se avisa; si la plaza tampoco, "No se pudo mostrar la ciudad." */
function cityFailScene(c, g, sceneId, done) {
  if (CD !== c || cityGen !== g) return;
  if (sceneId === 'plaza') { cityFallback('init'); return; }
  var back = cityArrival('plaza', sceneId), name = citySceneName(sceneId);
  citySetScene(c, 'plaza', back);
  S.city.scene = 'plaza'; S.city.at = { x: back.x, z: back.z, yaw: back.yaw }; save();   // la partida queda en la plaza: no se pierde
  cityCreateWorld(c, 'plaza').then(function (world) { done(world); cityShowError(name, sceneId); }, function () { if (CD === c && cityGen === g) cityFallback('init'); });
}
function cityStart() {
  if (CD && CD.world && !CD.suspended) return;
  cityTeardown();
  var gen = ++cityGen, r = cityRootEl(), at = S.city.at, sceneId = S.city.scene;
  r.hidden = false;
  r.innerHTML = cityHtml();
  var cv = cId('city-cv'), c;
  c = CD = {
    gen: gen, canvas: cv, world: null, input: null, loadTimer: null, fadeT: null, fading: false, entered: false,
    scene: 'plaza', sc: null, base: null, flags: null, items: null, hero: null, safe: null, savedAt: null, face: 'up', boxes: [],
    zoom: CITY_ZMIN, st: { hero: { x: at.x, z: at.z, face: 'up', speed: 0 }, zoom: CITY_ZMIN, flags: null },
    tips: { q: [], cur: null, left: CITY_TIP_MS, hover: false }, starBase: {},
    paused: false, sheet: false, rotate: false, suspended: false, lost: false, lastObjId: null, lastZone: null, nearId: null,
    saveT: 0, objT: 0, obj: null, objTarget: null, sheetFor: null, day: '', dayT: 0, lastAng: -1
  };
  citySetScene(c, sceneId, at);
  var tipEl = cId('city-tip');   // el contador de la pista se detiene mientras el puntero está encima
  if (tipEl) { tipEl.addEventListener('mouseenter', function () { if (CD === c) c.tips.hover = true; }); tipEl.addEventListener('mouseleave', function () { if (CD === c) c.tips.hover = false; }); }
  c.loadTimer = setTimeout(function () {   // el aviso solo se muestra si el mundo tarda más de 250 ms
    c.loadTimer = null;
    if (CD === c && !c.world) r.insertAdjacentHTML('beforeend', cityLoadHtml('Preparando la ciudad…'));
  }, CITY_LOAD_MS);
  var ready = function (world) {
    if (gen !== cityGen || V.name !== 'city') { try { world.dispose(); } catch (e) {} if (gen === cityGen) cityTeardown(); return; }
    if (c.loadTimer) { clearTimeout(c.loadTimer); c.loadTimer = null; }
    CD.world = world;
    CD.input = cityMakeInput();
    var lb = cId('city-loadbox'); if (lb) lb.remove();
    c.starBase = cityStarSnapshot();
    cityRefresh(); cityRotateCheck(); cityAnnounce();
    if (!S.city.prologue) cityIntroOpen(0);   // quien entra por primera vez ve el prólogo de Iris sin tener que buscarla
    else if (cityRestorePending.length) { var rp0 = cityRestorePending; cityRestorePending = []; cityCelebrate(rp0, ''); }   // restaurado con la ciudad detenida (ronda o jefe desde fuera)
  };
  cityCreateWorld(c, sceneId).then(ready, function () { cityFailScene(c, gen, sceneId, ready); });
}
/* Cambio de escena (spec §2): fundido a negro, se libera el mundo y se crea el nuevo con la pantalla negra, se guarda y se aclara.
   Los temporizadores (nunca transitionend) viven en CD.fadeT y cityTeardown los cancela; un create tardío se descarta con cityGen. */
function cityEnter(sceneId, at) {
  var c = CD;
  if (!c || !c.world || c.fading || c.suspended || !CityMove.scene(CITY_DATA, sceneId)) return;
  c.fading = true; cityInert();
  try { c.world.setPaused('fade', true); } catch (e) {}
  var g = cityGen, ms = cityReduced() ? 0 : CITY_FADE_MS, veil = cId('city-veil');
  if (veil) veil.style.opacity = '1';
  cityHideError();
  var arrived = function (world) {
    if (CD !== c || cityGen !== g) { try { world.dispose(); } catch (e) {} return; }
    if (c.loadTimer) { clearTimeout(c.loadTimer); c.loadTimer = null; }
    var lb = cId('city-loadbox'); if (lb) lb.remove();
    c.world = world; c.entered = true;
    if (c.input) c.input.releaseAll();   // una tecla sostenida no debe cruzar la salida recién estrenada
    citySave();
    cityRefresh(); cityRotateCheck(); cityAnnounce();
    var v = cId('city-veil'); if (v) v.style.opacity = '0';
    c.fadeT = setTimeout(function () {
      c.fadeT = null; if (CD !== c || cityGen !== g) return;
      c.fading = false; cityInert();
      var ae = document.activeElement;   // el foco se perdió si está en body, en un nodo que ya no existe o en un botón oculto (p. ej. #city-act al salir del portal)
      if (!ae || ae === document.body || !ae.isConnected || ae.hidden || (ae.closest && ae.closest('[hidden]'))) cFocus(cId('city-pause'));
    }, ms);
  };
  c.fadeT = setTimeout(function () {
    c.fadeT = null; if (CD !== c || cityGen !== g) return;
    var old = c.world; c.world = null; c.wtok = (c.wtok || 0) + 1;   // lo que avise el mundo viejo al liberarse ya no cuenta
    if (old) { try { old.dispose(); } catch (e) {} }
    citySetScene(c, sceneId, at);
    var name = c.sc.name;
    c.loadTimer = setTimeout(function () {
      c.loadTimer = null;
      if (CD === c && !c.world) cityRootEl().insertAdjacentHTML('beforeend', cityLoadHtml('Abriendo ' + name + '…'));   // en la raíz y sobre el velo: dentro de #city-ui-main (inert, bajo el velo) ni se ve ni se oye
    }, CITY_LOAD_MS);
    cityCreateWorld(c, sceneId).then(arrived, function () {
      if (CD !== c || cityGen !== g) return;
      var lb2 = cId('city-loadbox'); if (lb2) lb2.remove();
      cityFailScene(c, g, sceneId, function (world) { arrived(world); });
    });
  }, ms);
}
function citySuspend() {
  if (!CD || CD.suspended) return;
  CD.suspended = true;
  citySave();
  cityDropInput(CD);
  var r = cityRootEl(); if (r) r.hidden = true;
  if (CD.world) CD.world.setPaused('suspended', true);
}
function cityResume() {
  if (!CD || !CD.suspended) return;
  if (CD.lost) { cityFallback('lost'); return; }
  CD.suspended = false;
  cityRootEl().hidden = false;
  CD.input = cityMakeInput();
  cityReleaseUi();
  CD.boxes = CityMove.boxesFor(CITY_DATA, CD.scene);
  if (CD.pendingBattle) { var pb = CD.pendingBattle; CD.pendingBattle = null; if (beatenToday(CD.scene, pb) && CD.world) CD.world.dissolve(pb); }
  if (CD.world) { CD.world.setPaused('suspended', false); CD.world.resize(); }   // primero se quita la pausa: con 'suspended' activo resize no hace nada
  cityRefresh(); cityTipsCheck('resume'); cityRotateCheck(); cityAnnounce();
  if (cityRestorePending.length) { var rp = cityRestorePending; cityRestorePending = []; cityCelebrate(rp, ''); }
}
function cityRotateCheck() {
  if (!CD || !CD.world || CD.suspended) return;
  var on = false;
  try { on = !!(window.matchMedia && window.matchMedia(CITY_ROTATE_Q).matches); } catch (e) {}
  if (on === CD.rotate) return;
  CD.rotate = on;
  var rot = cId('city-rotate'); if (rot) rot.hidden = !on;
  cityInert();
  CD.world.setPaused('rotate', on);
}
function cityInert() {
  var u = cId('city-ui-main'); if (!u || !CD) return;
  var busy = CD.paused || CD.rotate || CD.sheet || CD.fading;
  if (busy) u.setAttribute('inert', ''); else u.removeAttribute('inert');
  var tp = cId('city-tip'); if (tp) tp.hidden = !!busy;   // la pista no tapa hojas ni pausa: se queda pendiente (con su texto y su cuenta) hasta que vuelva la vista libre
  [cId('city-sheet'), cId('city-pausebox')].forEach(function (el) { if (el) { if (CD.rotate) el.setAttribute('inert', ''); else el.removeAttribute('inert'); } });
}

/* ---------- HUD ---------- */
function cityHud(force) {
  if (!CD) return;
  var info = lvlInfo(S.xp);
  var set = function (id, t) { var el = cId(id); if (el && el.textContent !== t) el.textContent = t; };
  set('city-rank', CityStory.rankOf(S.city, CITY_DATA));
  set('city-xp', nf(S.xp) + ' XP · Nv ' + info.lv);
  var rn = cityRestoredN();
  set('city-rest', CD.scene === 'plaza' ? 'Distritos ' + rn.done + ' de ' + rn.total : CD.sc.name + ' ' + CityStory.restoration(S.city, CITY_DATA, CD.scene, bossPassedOf(CD.scene)) + ' %');
  cityRouteHud();
  cityObjUpdate(force);
}
function cityObjUpdate(force) {
  if (!CD) return;
  if (force || !CD.obj) { CD.obj = cityObjective(); CD.objTarget = cityObjTarget(CD.obj); CD.lastAng = -1; }
  var o = CD.obj, t = CD.objTarget, el = cId('city-obj'), ar = cId('city-arrow'), txt = '';
  if (o && o.label) {
    if (t) {
      var dx = t.x - CD.hero.x, dz = t.z - CD.hero.z, dist = Math.hypot(dx, dz), d = Math.round(dist);
      txt = o.label + ' · ' + d + ' m';
      var ang = Math.round(((Math.atan2(dx, -dz) * 180 / Math.PI) % 360 + 360) % 360);   // ▲ = 0° (arriba), giro horario
      if (ar) {
        var hide = dist < 1;
        if (ar.hidden !== hide) ar.hidden = hide;
        if (!hide && ang !== CD.lastAng) { ar.style.transform = 'rotate(' + ang + 'deg)'; CD.lastAng = ang; }
      }
    } else { txt = o.label; if (ar && !ar.hidden) ar.hidden = true; }
  } else if (ar && !ar.hidden) ar.hidden = true;
  if (el && el.textContent !== txt) el.textContent = txt;
}
function cityAnnounce() {
  if (!CD) return;
  var lv = cId('city-live'); if (!lv) return;
  var name = CD.sc.name, o = CD.obj || cityObjective(), id = o && o.id ? o.kind + ':' + o.id : (o ? o.kind : ''), lab = o && o.label ? o.label : '';
  if (CD.scene !== CD.lastZone) {
    CD.lastZone = CD.scene; CD.lastObjId = id;
    lv.textContent = CD.entered ? 'Entraste a ' + name + '.' + (lab ? ' Objetivo: ' + lab + '.' : '') : name + (lab ? '. ' + lab : '');
  } else if (id !== CD.lastObjId) { CD.lastObjId = id; lv.textContent = lab ? 'Objetivo: ' + lab : ''; }
}
function citySetAct(b, label, sub) {
  var m = b.querySelector('.act-main'), u = b.querySelector('.act-sub');
  if (m) m.textContent = label;
  if (u) { u.textContent = sub || ''; u.hidden = !sub; }
}
function cityUpdateNear(force) {
  if (!CD) return;
  var list = cityItems(), best = null, bd = Infinity, i, o, dx, dz, d2, rr;
  for (i = 0; i < list.length; i++) { o = list[i]; dx = o.x - CD.hero.x; dz = o.z - CD.hero.z; d2 = dx * dx + dz * dz; rr = o.r || CITY_NEAR; if (d2 <= rr * rr && d2 < bd) { bd = d2; best = o; } }
  var id = best ? best.id : null, b = cId('city-act');
  if (!b || (!force && id === CD.nearId)) return;
  CD.nearId = id;
  if (best) { citySetAct(b, best.label, best.sub); b.hidden = false; } else { citySetAct(b, '', ''); b.hidden = true; }
  cityTipsCheck('near');
}
/* ---------- contrato con el mundo ---------- */
function cityState() {
  if (!CD) return null;
  var s = CD.st;
  s.hero.x = CD.hero.x; s.hero.z = CD.hero.z; s.hero.face = CD.face; s.hero.speed = CD.hero.speed;
  s.zoom = CD.zoom; s.flags = CD.flags || (CD.flags = cityFlags());
  return s;
}
function cityBlocked() { return !CD || !CD.world || CD.suspended || CD.paused || CD.sheet || CD.rotate || CD.lost || CD.busy || CD.fading; }
/* Zoom: dueño único. El pellizco multiplica (continuo); los pasos de rueda y teclas suman 0.25 y encajan en la rejilla de 0.25. NaN cae a 1. No se guarda. */
function cityZoomBy(factor, steps) {
  if (!CD) return;
  var z = CD.zoom * (typeof factor === 'number' && isFinite(factor) && factor > 0 ? factor : 1);
  if (typeof steps === 'number' && isFinite(steps) && steps !== 0) z = Math.round((z + 0.25 * steps) / 0.25) * 0.25;
  CD.zoom = (typeof z === 'number' && isFinite(z)) ? Math.max(CITY_ZMIN, Math.min(CITY_ZMAX, z)) : CITY_ZMIN;
  cityZoomUi();
}
/* Texto del nivel de zoom en la pausa y límites de los botones */
function cityZoomUi() {
  if (!CD) return;
  var tx = cId('city-zoom'), zi = cityRootEl().querySelector('[data-c="zoomin"]'), zo = cityRootEl().querySelector('[data-c="zoomout"]');
  if (tx) tx.textContent = 'Zoom ' + Math.round(CD.zoom * 100) + ' %';
  if (zi) zi.disabled = CD.zoom >= CITY_ZMAX - 1e-9;
  if (zo) zo.disabled = CD.zoom <= CITY_ZMIN + 1e-9;
}
function cityTick(dt) {
  var c = CD;
  if (!c || !c.input || c.suspended) return;
  if (typeof dt !== 'number' || !(dt >= 0)) dt = 0;
  var sec = Math.min(dt, 100) / 1000;
  if (c.input.consumePause()) cityPauseKey();
  var act = c.input.consumeAction(), zm = c.input.consumeZoom();
  if (cityBlocked()) return;
  cityZoomBy(zm.factor, zm.steps);
  var it = c.input.intent();
  cityJoyDraw(c);
  var canRun = levelOf(S.xp) >= 5 && S.city.run === true;
  var nh = CityMove.step(c.hero, { mx: it.mx, mz: it.mz, run: it.run }, sec, c.boxes, { canRun: canRun, radius: CITY_DATA.radius, safe: c.safe });
  c.hero = nh; c.safe = { x: nh.x, z: nh.z, yaw: nh.yaw };
  if (nh.speed > 0.1) c.face = CityMove.faceOf(nh.yaw);
  var hit = CityMove.portalAt(CITY_DATA, c.scene, nh.x, nh.z);   // pisar la boca de un portal o la salida cambia de escena
  if (hit !== null) { cityStepOn(hit); return; }
  cityTipTick(dt);
  c.saveT += sec; c.objT += sec;
  if (c.saveT >= 5) {   // guardado periódico solo si el héroe se movió más de 1 m (al pausar, suspender o salir siempre se guarda)
    c.saveT = 0;
    if (Math.hypot(nh.x - c.savedAt.x, nh.z - c.savedAt.z) > CITY_SAVE_M) { citySave(); c.savedAt = { x: nh.x, z: nh.z }; }
  }
  var nowMs = Date.now();
  if (nowMs - c.dayT > 30000 || nowMs < c.dayT) { c.dayT = nowMs; if (today() !== c.day) { cityRefresh(); cityAnnounce(); } }
  if (c.objT >= 0.25) { c.objT = 0; cityObjUpdate(false); cityAnnounce(); }
  cityUpdateNear(false);
  if (act && c.nearId) { var o = cityItem(c.nearId); if (o) cityOpen(o); }
}
/* Dibuja la palanca: atenuada en su sitio de reposo y, al tocar, bajo el dedo con el botón desplazado (solo escribe si cambió) */
/* hit = distrito del portal pisado en la plaza, o 'plaza' al pisar la salida de un distrito */
function cityStepOn(hit) {
  if (CD.scene === 'plaza') cityEnter(hit, cityArrival(hit));
  else cityEnter('plaza', cityArrival('plaza', CD.scene));
}
function cityJoyDraw(c) {
  var el = cId('city-joy'); if (!el || !c.input) return;
  var j = c.input.joy(), key = j.on ? Math.round(j.x) + ',' + Math.round(j.y) + ',' + Math.round(j.kx) + ',' + Math.round(j.ky) : '';
  if (key === c.joyKey) return;
  c.joyKey = key;
  var knob = el.lastChild;
  if (j.on) { el.classList.add('on'); el.style.left = Math.round(j.x) + 'px'; el.style.top = Math.round(j.y) + 'px'; el.style.bottom = 'auto'; knob.style.transform = 'translate(' + Math.round(j.kx) + 'px, ' + Math.round(j.ky) + 'px)'; }
  else { el.classList.remove('on'); el.style.left = ''; el.style.top = ''; el.style.bottom = ''; knob.style.transform = ''; }
}

/* ---------- hojas ---------- */
/* La hoja es un diálogo modal etiquetado por su título (el h2 de la tarjeta) */
function citySheetLabel(sh) {
  var h = sh.querySelector('.prompt');
  if (h) { h.id = 'city-sheet-title'; sh.setAttribute('aria-labelledby', 'city-sheet-title'); } else sh.removeAttribute('aria-labelledby');
}
function cityOpenSheet(html, focusSel, forId) {
  if (!CD) return;
  var sh = cId('city-sheet'); if (!sh) return;
  citySave();
  sh.innerHTML = html; sh.hidden = false; sh.scrollTop = 0; citySheetLabel(sh);   // siempre se abre desde arriba (el título a la vista)
  CD.sheet = true; CD.sheetFor = forId || null;
  cityRootEl().classList.add('sheet-open'); cityInert();
  if (CD.world) CD.world.setPaused('sheet', true);
  var f = focusSel ? sh.querySelector(focusSel) : null;
  cFocus(f || sh.querySelector('button'));
}
function cityCloseSheet(quiet) {
  if (!CD) return;
  var resume = cityRouteAbort();   // una estación a medias no cuenta: aviso para retomarla
  var sh = cId('city-sheet'); if (sh) { sh.hidden = true; sh.innerHTML = ''; }
  CD.sheet = false; CD.sheetFor = null;
  cityRootEl().classList.remove('sheet-open'); cityInert();
  if (CD.world && !quiet) CD.world.setPaused('sheet', false);
  if (quiet) return;
  cityRefresh(); cityAnnounce();
  if (resume) { var lv = cId('city-live'); if (lv) lv.textContent = resume; }
  cityFlush();
  var a = cId('city-act'); cFocus(a && !a.hidden ? a : cId('city-pause'));
}
function citySheetHtml(sub, title, body, actions) {
  return '<article class="qcard"><div class="chips"><span class="chip">' + esc(sub) + '</span></div><h2 class="prompt">' + esc(title) + '</h2>' + body +
    '<div class="actions">' + (actions || '') + '<button class="btn" data-act="cx" data-c="sheetclose">Cerrar</button></div></article>';
}
/* Lección del mentor: resumen y puntos clave del tema; abrirla cuenta como lección vista */
function cityLesson(o) {
  var m = mod(CD.scene), t = m.tById[o.topic];
  if (!t) return;
  var lk = CD.scene + ':' + t.id;
  if (S.stats.learnTopics.indexOf(lk) < 0) { S.stats.learnTopics.push(lk); checkVirtues(); save(); }
  var body = '<p class="lead">' + fmt(t.summary) + '</p><ul class="kp">' + t.keyPoints.map(function (k) { return '<li>' + fmt(k) + '</li>'; }).join('') + '</ul>' +
    '<p class="meta">' + esc('Para la primera estrella hacen falta al menos 6 respuestas') + '</p>';
  cityOpenSheet(citySheetHtml(o.name + ' · ' + t.id, t.title, body, '<button class="btn primary" data-act="cx" data-c="practice" data-id="' + esc(o.id) + '">Practicar</button>'), '[data-c="practice"]', o.id);
}
/* Cierra hoja y pausa y libera TODAS sus razones de pausa del mundo (si no, al volver de una ronda la ciudad no dibuja) */
function cityReleaseUi() {
  if (!CD) return;
  var sh = cId('city-sheet'); if (sh) { sh.hidden = true; sh.innerHTML = ''; sh.removeAttribute('aria-labelledby'); }
  var pb = cId('city-pausebox'); if (pb) { pb.hidden = true; pb.innerHTML = ''; }
  CD.sheet = false; CD.sheetFor = null; CD.paused = false;
  var r = cityRootEl(); if (r) r.classList.remove('sheet-open');
  cityInert();
  if (CD.world) { CD.world.setPaused('sheet', false); CD.world.setPaused('pause', false); }
}
function cityPractice(id) {
  var o = cityItem(id); if (!CD || !o) return;
  cityReleaseUi();
  startRound({ kind: 'quiz', title: 'Quiz', mid: CD.scene, back: { name: 'city' }, city: { kind: 'practice', id: id, mid: CD.scene } }, itemsFor('quiz', mod(CD.scene), o.topic));
}
/* Enseñar (explicar): el aprendiz pide explicación; hay que elegir los 3 puntos clave del tema entre 6 */
function cityKpPool(o) {
  var m = mod(CD.scene), own = shuffle(m.tById[o.topic].keyPoints).slice(0, 3).map(function (t) { return { t: t, own: true }; });
  var others = []; m.topics.forEach(function (tp) { if (tp.id !== o.topic) tp.keyPoints.forEach(function (k) { others.push(k); }); });
  var foreign = shuffle(others).slice(0, 3).map(function (t) { return { t: t, own: false }; });
  return shuffle(own.concat(foreign));
}
function cityTeachExplain(o, fresh, focusI) {
  if (!CD) return;
  var m = mod(CD.scene), tp = m.tById[o.topic];
  if (fresh || !CD.teach || CD.teach.id !== o.id) CD.teach = { id: o.id, o: o, items: cityKpPool(o), picked: {}, checked: false };
  var T = CD.teach, n = Object.keys(T.picked).length;
  var rows = T.items.map(function (it, i) {
    var on = !!T.picked[i], bad = T.checked && on && !it.own;
    return '<li><button class="btn kp' + (bad ? ' bad' : '') + '" data-act="cx" data-c="kp" data-i="' + i + '" aria-pressed="' + (on ? 'true' : 'false') + '"' + (T.checked ? ' disabled' : '') + '>' + fmt(it.t) + (bad ? ' <strong>De otro tema</strong>' : '') + '</button></li>';
  }).join('');
  var act = T.checked ? '<button class="btn primary" data-act="cx" data-c="retry-teach">Reintentar</button>' : '<button class="btn primary" data-act="cx" data-c="teach-go"' + (n === 3 ? '' : ' disabled') + '>Explicar</button>';
  var html = '<article class="qcard"><div class="chips"><span class="chip">' + esc('Enseñar a ' + o.name + ' · ' + tp.id) + '</span></div><h2 class="prompt">' + esc('¿Me explicas ' + tp.title + '?') + '</h2>' +
    '<p class="meta" id="city-count" aria-live="polite">' + n + ' de 3</p><ul class="vlist">' + rows + '</ul><div class="actions">' + act + '<button class="btn" data-act="cx" data-c="sheetclose">Cerrar</button></div></article>';
  var sh = cId('city-sheet');
  if (CD.sheet && sh) { sh.innerHTML = html; citySheetLabel(sh); cFocus((focusI !== undefined && sh.querySelector('[data-i="' + focusI + '"]')) || sh.querySelector('button')); } else cityOpenSheet(html, 'button', o.id);
}
function cityTeachPick(i) {
  var T = CD && CD.teach; if (!T || T.checked || !T.items[i]) return;
  if (T.picked[i]) delete T.picked[i]; else if (Object.keys(T.picked).length < 3) T.picked[i] = true; else return;
  cityTeachExplain(T.o, false, i);   // el foco sigue en el botón pulsado
}
function cityTeachGo() {
  var T = CD && CD.teach; if (!T || T.checked || Object.keys(T.picked).length !== 3) return;
  var good = Object.keys(T.picked).every(function (i) { return T.items[i].own; });
  if (!good) { T.checked = true; cityTeachExplain(T.o, false); return; }
  touch();
  var gainXp = teachXp(); S.xp += gainXp;
  cityD(CD.scene).taught[T.o.id] = true;
  var rs = CityStory.applyRestore(S.city, CITY_DATA, bossPassedOf);
  checkVirtues(); save();
  CD.teach = null;
  if (rs.changed.length) { cityRestorePending = []; cityRefresh(); cityCelebrate(rs.changed, '¡Gracias, ' + T.o.name + ' lo entendió!'); }
  else cityOpenSheet(citySheetHtml('Enseñar', '¡Lo entendió!', '<p>' + esc(T.o.name + ' lo entendió gracias a ti. +' + gainXp + ' XP.') + '</p>'), '[data-c="sheetclose"]', T.o.id);
}
function cityTeachCorrect(o) {
  var qs = shuffle(ofType(mod(CD.scene), 'error', o.topic));
  if (!qs.length || !CD) return;
  startRound({ kind: 'error', title: 'Enseñar', mid: CD.scene, back: { name: 'city' }, city: { kind: 'teach', id: o.id, mid: CD.scene } }, [qs[0]]);
}
/* Línea de rango de la celebración: "Subes a X." solo si el rango subió con esta restauración; si no, "Sigues como X: te falta(n) N distrito(s) para Y."
   (Y = el siguiente rango alcanzable con los distritos que existen) o "Sigues como X." si ya no hay uno. El rango previo cuenta los restaurados que no están en mids. */
function cityRankLine(mids) {
  var rs = S.city.restored, own = Object.prototype.hasOwnProperty, ids = Object.keys(CITY_DATA.districts), now = [], prev = {}, next = null;
  ids.forEach(function (id) { if (rs && own.call(rs, id) && rs[id] === true) { now.push(id); if (mids.indexOf(id) < 0) prev[id] = true; } });
  var after = CityStory.rankOf(S.city, CITY_DATA), before = CityStory.rankOf({ restored: prev }, CITY_DATA);
  if (after !== before) return 'Subes a ' + after + '.';
  CITY_DATA.ranks.forEach(function (rk) { if (!next && rk[0] > now.length && rk[0] <= ids.length) next = rk; });
  if (!next) return 'Sigues como ' + after + '.';
  var miss = next[0] - now.length;
  return 'Sigues como ' + after + ': ' + (miss === 1 ? 'te falta 1 distrito' : 'te faltan ' + miss + ' distritos') + ' para ' + next[1] + '.';
}
/* Celebración de uno o más distritos recién restaurados: el texto y el poder salen de los datos de cada distrito */
function cityCelebrate(mids, pre) {
  var texts = [], powers = [], names = [];
  mids.forEach(function (id) {
    if (!cityHasDistrict(id)) return;
    var M = CITY_DATA.districts[id];
    names.push(M.name); texts.push((M.celebrate && M.celebrate.text) || 'El distrito vuelve a funcionar.');
    if (M.celebrate && M.celebrate.power) powers.push(M.celebrate.power.name);
  });
  if (!names.length) return;
  var body = '<p>' + esc((pre ? pre + ' ' : '') + texts.join(' ')) + '</p>' +
    '<p><b>' + esc((powers.length ? 'Poder nuevo: ' + powers.join(', ') + '. ' : '') + cityRankLine(mids)) + '</b></p>';
  cityOpenSheet(citySheetHtml(names.join(' · '), names.length > 1 ? '¡Distritos restaurados!' : '¡Distrito restaurado!', body), '[data-c="sheetclose"]', 'celebracion');
}
function cityTower(o) {
  var mid = CD.scene, m = mod(mid);
  if (bossUnlocked(m)) {
    cityReleaseUi();
    startRound({ kind: 'boss', title: 'Jefe final', mid: mid, back: { name: 'city' }, city: { kind: 'boss', id: 'torre', mid: mid } }, itemsFor('boss', m));
    return;
  }
  var miss = m.topics.filter(function (t) { return starsOf(m, t.id) < 1; });
  cityOpenSheet(citySheetHtml('Torre · ' + CD.sc.name, 'Te faltan ' + miss.length + (miss.length === 1 ? ' tema' : ' temas'),
    '<p>Consigue al menos una estrella en cada tema para enfrentar al jefe.</p><ul class="kp">' + miss.map(function (t) { return '<li>' + esc(t.id + ' ' + t.title) + '</li>'; }).join('') + '</ul>'), '[data-c="sheetclose"]', o.id);
}
/* Portal de la plaza: un distrito que existe se abre; uno que no, muestra una hoja corta ("Ir al módulo" solo si el módulo existe) */
function cityPortal(o) {
  if (cityHasDistrict(o.dist)) { cityEnter(o.dist, cityArrival(o.dist)); return; }
  var mm = mod(o.dist);
  cityOpenSheet(citySheetHtml('Próximamente', mm ? o.dist + ' · ' + mm.title : o.dist + ' · Próximamente',
    '<p>' + esc('Este distrito llegará pronto.' + (mm ? ' Mientras, puedes estudiarlo desde Módulos.' : '')) + '</p>',
    mm ? '<button class="btn primary" data-act="cx" data-c="go-module" data-id="' + esc(o.dist) + '">Ir al módulo</button>' : ''), mm ? '[data-c="go-module"]' : '[data-c="sheetclose"]', o.id);
}
/* Criatura: el mundo hace el encuentro y al resolver empieza la batalla; si el mundo ya no existe, no pasa nada */
function cityEncounter(o) {
  var c = CD; if (!c || !c.world || c.busy) return;
  c.busy = true;
  var go = function () {
    if (CD !== c) return;
    c.busy = false; c.pendingBattle = o.id;
    startRound({ kind: 'battle', title: 'Batalla', mid: c.scene, back: { name: 'city' }, villain: { id: o.id, name: o.name, mod: c.scene, topics: o.topics }, city: { kind: 'battle', id: o.id, mid: c.scene } }, battleItems({ mod: c.scene, topics: o.topics, n: 8 }));
  };
  var p; try { p = c.world.encounter(o.id); } catch (e) { p = null; }
  Promise.resolve(p).then(go, go);
}
/* Abre el lugar según su tipo (todos los tipos de cityBase tienen su rama) */
function cityOpen(o) {
  if (!CD || !o || CD.fading) return;
  if (o.kind === 'director') {
    if (!S.city.prologue) cityIntroOpen(0); else cityIrisSheet(o);
  } else if (o.kind === 'mirror') {
    citySave(); go('hero');
  } else if (o.kind === 'mentor') {
    cityLesson(o);
  } else if (o.kind === 'apprentice') {
    if (o.mode === 'correct') cityTeachCorrect(o); else cityTeachExplain(o, true);
  } else if (o.kind === 'tower') {
    cityTower(o);
  } else if (o.kind === 'portal') {
    cityPortal(o);
  } else if (o.kind === 'pad') {
    cityRoutePad(o);
  } else if (o.kind === 'exit') {
    cityEnter('plaza', cityArrival('plaza', CD.scene));
  } else if (o.kind === 'creature') {
    cityEncounter(o);
  } else if (o.kind === 'repair') {
    startRound({ kind: 'repair', title: 'Reparación', mid: CD.scene, back: { name: 'city' }, city: { kind: 'repair', id: o.id, mid: CD.scene } }, repairItems(CD.scene, o.topic));
  }
}

/* ---------- pausa ---------- */
var CITY_PAUSE_OPTS = [['goal', 'Ir al objetivo'], ['near', 'Lugares cercanos'], ['learned', 'Lecciones vistas'], ['review', 'Repaso'], ['hero', 'Tu héroe'], ['how', '¿Cómo se juega?'], ['home', 'Salir al inicio']];
function cityPauseMain() {
  var pb = cId('city-pausebox'); if (!pb) return;
  pb.innerHTML = '<div class="banner"><h2 class="h2">Pausa</h2><div class="actions col">' +
    CITY_PAUSE_OPTS.map(function (p) { return '<button class="btn" data-act="cx" data-c="p-' + p[0] + '">' + esc(p[1]) + '</button>'; }).join('') +
    '<p class="meta" id="city-zoom" aria-live="polite"></p><div class="actions"><button class="btn" data-act="cx" data-c="zoomout">Alejar</button><button class="btn" data-act="cx" data-c="zoomin">Acercar</button></div>' +
    '<button class="btn primary" data-act="cx" data-c="pauseclose">Cerrar</button></div></div>';
  cityZoomUi();
}
function cityOpenPause() {
  if (!CD || CD.paused) return;
  citySave();
  CD.paused = true; cityPauseMain();
  var pb = cId('city-pausebox'); pb.hidden = false;
  cityInert(); cityZoomUi();
  if (CD.world) CD.world.setPaused('pause', true);
  cFocus(pb.querySelector('button'));
}
function cityClosePause(quiet) {
  if (!CD) return;
  var pb = cId('city-pausebox'); if (pb) { pb.hidden = true; pb.innerHTML = ''; }
  var was = CD.paused; CD.paused = false;
  cityInert();
  if (CD.world && was && !quiet) CD.world.setPaused('pause', false);
  if (!quiet) { cityFlush(); cFocus(cId('city-pause')); }
}
function cityPauseList(title, rows, empty) {
  var pb = cId('city-pausebox'); if (!pb) return;
  pb.innerHTML = '<div class="banner"><h2 class="h2">' + esc(title) + '</h2>' + (rows.length ? '<div class="actions col">' + rows.join('') + '</div>' : '<p>' + esc(empty) + '</p>') +
    '<div class="actions"><button class="btn" data-act="cx" data-c="pausemain">Volver</button></div></div>';
  cFocus(pb.querySelector('button'));
}
function cityPauseAct(a) {
  if (a === 'goal') {
    var t = CD.objTarget || cityObjTarget(cityObjective());
    cityClosePause(); if (t) cityOpen(t);
  } else if (a === 'near') {
    var list = CityMove.within(CD.hero, cityItems(), 15);
    cityPauseList('Lugares cercanos', list.map(function (o) { return '<button class="btn" data-act="cx" data-c="go" data-id="' + esc(o.id) + '">' + esc(o.label) + ' · ' + Math.round(o.dist) + ' m</button>'; }), 'No hay lugares a menos de 15 m.');
  } else if (a === 'learned') {
    var mid = CD.scene, rows = [];
    if (mid === 'plaza') { cityPauseList('Lecciones vistas', rows, 'Entra a un distrito para ver sus lecciones.'); return; }
    var m = mod(mid), M = CD.sc;
    S.stats.learnTopics.forEach(function (k) {
      if (k.indexOf(mid + ':') !== 0 || !m.tById[k.slice(mid.length + 1)]) return;
      var tp = m.tById[k.slice(mid.length + 1)], mm = M.mentors.filter(function (x) { return x.topic === tp.id; })[0];
      if (mm) rows.push('<button class="btn" data-act="cx" data-c="lesson" data-id="' + esc(mm.id) + '">' + esc(tp.id + ' ' + tp.title) + ' · ' + starStr(starsOf(m, tp.id)) + '</button>');
    });
    cityPauseList('Lecciones vistas', rows, 'Todavía no has visto lecciones de este distrito.');
  } else if (a === 'review') {
    var q = queue();
    if (!q.length) { cityPauseList('Repaso', [], 'No tienes preguntas pendientes de repaso.'); return; }
    cityReleaseUi();
    startRound({ kind: 'review', title: 'Repaso', back: { name: 'city' } }, sample(q, 10));
  } else if (a === 'how') { cityClosePause(); cityHowTo(); }
  else if (a === 'hero') { citySave(); go('hero'); }
  else if (a === 'home') { citySave(); go('home'); }
}

/* ---------- eventos ---------- */
/* módulo al que lleva "Ir a los módulos": el distrito donde estabas o el primero que existe */
function cityModTarget() {
  if (cityHasDistrict(S.city.scene)) return S.city.scene;
  for (var i = 0; i < CITY_DATA.order.length; i++) if (cityHasDistrict(CITY_DATA.order[i])) return CITY_DATA.order[i];
  return Object.keys(CITY_DATA.districts)[0];
}
function cityAct(c, b) {
  if (c === 'quit' || c === 'home') { if (CD) citySave(); go('home'); }
  else if (c === 'mods') go('module', { mod: cityModTarget() });
  else if (c === 'go-module') { if (CD) citySave(); go('module', { mod: b.dataset.id }); }
  else if (c === 'err-retry') { var rid = b.dataset.id; cityHideError(); cityReleaseUi(); if (CD && cityHasDistrict(rid)) cityEnter(rid, cityArrival(rid)); }
  else if (c === 'err-close') { cityHideError(); cFocus(cId('city-pause')); }
  else if (c === 'retry') { cityStop(); cityStart(); }
  else if (c === 'pause') { if (CD && CD.world) { if (CD.paused) cityClosePause(); else if (!CD.sheet) cityOpenPause(); } }
  else if (c === 'pauseclose') cityClosePause();
  else if (c === 'zoomin') cityZoomBy(1, 1);
  else if (c === 'zoomout') cityZoomBy(1, -1);
  else if (c === 'pausemain') { cityPauseMain(); cFocus(cId('city-pausebox').querySelector('button')); }
  else if (c.indexOf('p-') === 0) { if (CD && CD.paused) cityPauseAct(c.slice(2)); }
  else if (c === 'go') { var o = cityItem(b.dataset.id); if (CD && o) { cityClosePause(); cityOpen(o); } }
  else if (c === 'act') { if (CD && CD.world && !CD.sheet && !CD.paused && CD.nearId) { var n = cityItem(CD.nearId); if (n) cityOpen(n); } }
  else if (c === 'sheetclose') cityCloseSheet();
  else if (c === 'pro-next') cityIntroOpen(parseInt(b.dataset.i, 10));
  else if (c === 'pro-skip' || c === 'pro-end') cityIntroDone();
  else if (c === 'tip-close') cityTipClose();
  else if (c === 'route-ask') { if (CD && CD.route && CD.route.flow && CD.route.active) CD.route.flow.ask(); }
  else if (c === 'ropt') cityRouteAnswer(parseInt(b.dataset.k, 10));
  else if (c === 'route-next') { if (CD && CD.route && CD.route.flow && CD.route.active) CD.route.flow.next(); }
  else if (c === 'route-replay') cityRouteReplay();
  else if (c === 'route-reset') cityRouteReset();
  else if (c === 'kp') cityTeachPick(parseInt(b.dataset.i, 10));
  else if (c === 'teach-go') cityTeachGo();
  else if (c === 'retry-teach') { if (CD && CD.teach) cityTeachExplain(CD.teach.o, true); }
  else if (c === 'practice') cityPractice(b.dataset.id);
  else if (c === 'lesson') { var lo = cityItem(b.dataset.id); if (CD && lo) { cityClosePause(); cityOpen(lo); } }
  else if (c === 'run') { S.city.run = !S.city.run; save(); b.setAttribute('aria-pressed', S.city.run ? 'true' : 'false'); }
}
cityRootEl().addEventListener('click', function (e) {
  var b = e.target.closest && e.target.closest('[data-act="cx"]');
  if (!b || b.disabled || V.name !== 'city') return;
  cityAct(b.dataset.c, b);
});
window.addEventListener('resize', function () { if (CD && CD.world && !CD.suspended) { CD.world.resize(); cityRotateCheck(); } });
if (window.__CITY_TEST__ === true) {
  window.__CITY_TEST_API__ = {
    teleport: function (x, z) {
      if (!CD) return;
      CD.hero = { x: x, z: z, yaw: CD.hero.yaw, vx: 0, vz: 0, speed: 0 }; CD.safe = { x: x, z: z, yaw: CD.hero.yaw };
      cityObjUpdate(false); cityUpdateNear(true); cityAnnounce();
    },
    objective: function () { return cityObjective(); }
  };
}
