/* Vista `city` de Ciudad Núcleo (se inserta DENTRO de la IIFE del motor: usa S, V, go, esc, fmt, mod, starsOf, queue, sample,
   startRound, levelOf, CITY_DATA, CityMove, CityStory, CityInput y CityWorld2D). ES5. Texto de datos: solo esc()/fmt() en innerHTML;
   el botón de acción, #city-live y #city-obj se escriben solo con textContent. */
var CD = null, cityGen = 0;
var CITY_LOAD_HTML = '<div id="city-loadbox"><p role="status" id="city-load">Preparando la ciudad…</p><button class="btn" data-act="cx" data-c="quit">Salir</button></div>';
var CITY_ZMIN = 1, CITY_ZMAX = 1.75, CITY_LOAD_MS = 250, CITY_SAVE_M = 1;
var CITY_ROTATE_Q = '(orientation: landscape) and (max-height: 499px) and (pointer: coarse)';
var CITY_NEAR = 2.2;

function cityRootEl() { return document.getElementById('city-root'); }
function cId(id) { return document.getElementById(id); }
function cFocus(el) {
  if (!el) return;
  try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); }
  if (el.scrollIntoView && el.closest && el.closest('#city-sheet')) { try { el.scrollIntoView({ block: 'nearest' }); } catch (e2) {} }
}
function cityWorldFactory() {
  var f = window.__CITY_WORLD__;
  if (window.__CITY_TEST__ === true && f && typeof f.create === 'function' && !(typeof Node !== 'undefined' && f instanceof Node)) return f;
  return (typeof CityWorld2D !== 'undefined') ? CityWorld2D : null;
}
function cityBossPassed() { return !!(S.boss.M02 && S.boss.M02.passed === true); }

/* ---------- lugares: interactuables ---------- */
function cityBase() {
  var M = CITY_DATA.districts.M02, P = CITY_DATA.plaza, out = [], d;
  out.push({ id: P.director.id, kind: 'director', name: P.director.name, label: 'Hablar con ' + P.director.name, x: P.director.x, z: P.director.z });
  out.push({ id: P.mirror.id, kind: 'mirror', name: P.mirror.name, label: 'Mirar el espejo', x: P.mirror.x, z: P.mirror.z });
  M.mentors.forEach(function (m) { out.push({ id: m.id, kind: 'mentor', name: m.name, label: 'Hablar con ' + m.name, x: m.x, z: m.z, topic: m.topic }); });
  M.creatures.forEach(function (c) { out.push({ id: c.id, kind: 'creature', name: c.name, label: 'Enfrentar a ' + c.name, x: c.area.x, z: c.area.z, topics: c.topics }); });
  M.repairs.forEach(function (r) { out.push({ id: r.id, kind: 'repair', name: r.label, label: 'Reparar ' + r.label, x: r.x, z: r.z, topic: r.topic }); });
  M.apprentices.forEach(function (a) { out.push({ id: a.id, kind: 'apprentice', name: a.name, label: 'Enseñar a ' + a.name, x: a.x, z: a.z, topic: a.topic, mode: a.mode }); });
  d = CityMove.door(M.tower); out.push({ id: M.tower.id, kind: 'tower', name: 'Torre', label: 'Entrar a la torre', x: d.x, z: d.z });
  d = CityMove.door(M.bridge); out.push({ id: M.bridge.id, kind: 'bridge', name: 'Puente', label: 'Cruzar el puente', x: d.x, z: d.z });
  return out;
}
/* Lugares disponibles ahora: se recalcula solo en cityRefresh (cambian los flags o el día), nunca por cuadro */
function cityItems() { return (CD && CD.items) || []; }
function cityBuildItems() {
  if (!CD.base) CD.base = cityBase();
  var m = mod('M02');
  return CD.base.filter(function (o) {
    if (o.kind === 'creature') return !beatenToday(o.id);
    if (o.kind === 'repair') return S.city.repairs[o.id] !== true;
    if (o.kind === 'apprentice') return S.city.taught[o.id] !== true && starsOf(m, o.topic) >= 1;
    return true;
  });
}
/* Recalcula flags, lugares, objetivo y HUD: al iniciar, al reanudar, al cerrar una hoja y al cambiar el día */
function cityRefresh() {
  if (!CD) return;
  CD.flags = cityFlags(); CD.items = cityBuildItems(); CD.day = today(); CD.dayT = Date.now();
  cityHud(true); cityUpdateNear(true);
}
function cityItem(id) {
  if (!CD) return null;
  if (!CD.base) CD.base = cityBase();
  for (var i = 0; i < CD.base.length; i++) if (CD.base[i].id === id) return CD.base[i];
  return null;
}
function cityZone(x, z) {
  var r = CITY_DATA.districts.M02.rect;
  return (x >= r.minX && x <= r.maxX && z >= r.minZ && z <= r.maxZ) ? 'Taller Comunal' : 'Plaza central';
}

/* ---------- objetivo ---------- */
function cityObjective() {
  var m = mod('M02');
  return CityStory.nextObjective(S.city, CITY_DATA, {
    learned: function (t) { return S.stats.learnTopics.indexOf('M02:' + t) >= 0; },
    stars: function (t) { return starsOf(m, t); },
    beatenEver: function (id) { return !!S.city.beaten[id]; },
    beatenToday: function (id) { return beatenToday(id); },
    bossUnlocked: bossUnlocked(m), bossPassed: cityBossPassed()
  });
}
function cityObjTarget(o) {
  if (!o || !o.id) return null;
  return cityItem(o.id);
}
function cityFlags() {
  var m = mod('M02'), M = CITY_DATA.districts.M02, f = { beatenToday: {}, repairs: {}, apprenticesVisible: {}, stars: {}, restored: !!(S.city.restored && S.city.restored.M02 === true), lit: Math.min(8, CityStory.taughtCount(S.city, CITY_DATA)) };
  M.creatures.forEach(function (c) { if (beatenToday(c.id)) f.beatenToday[c.id] = 1; });
  M.repairs.forEach(function (r) { if (S.city.repairs[r.id] === true) f.repairs[r.id] = 1; });
  M.apprentices.forEach(function (a) { if (S.city.taught[a.id] !== true && starsOf(m, a.topic) >= 1) f.apprenticesVisible[a.id] = 1; });
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
    isFree: function (el) { return !(el && el.closest && el.closest('button, #city-sheet, #city-pausebox, #city-rotate')); }
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
  if (CD.sheet) cityCloseSheet(); else if (CD.paused) cityClosePause(); else if (!CD.rotate) cityOpenPause();
}
function cityFlush() { if (CD && CD.input) { CD.input.consumeAction(); CD.input.consumeZoom(); } }
function cityHtml() {
  var run = levelOf(S.xp) >= 5 ? '<button class="btn sm" id="city-run" data-act="cx" data-c="run" aria-pressed="' + (S.city.run ? 'true' : 'false') + '">Correr</button>' : '';
  return '<canvas id="city-cv" aria-hidden="true"></canvas>' +
    '<div id="city-ui-main"><div class="city-hud"><button class="btn sm" id="city-pause" data-act="cx" data-c="pause">Pausa</button>' +
    '<span class="pill" id="city-rank"></span><span class="pill" id="city-xp"></span><span class="pill" id="city-rest"></span>' + run +
    '<p class="city-objrow"><span id="city-arrow" aria-hidden="true">▲</span><span id="city-obj"></span></p></div>' +
    '<div id="city-live" class="sronly" aria-live="polite"></div>' +
    '<button class="btn primary" id="city-act" data-act="cx" data-c="act" hidden></button></div>' +
    '<div id="city-sheet" hidden></div><div id="city-pausebox" hidden role="dialog" aria-modal="true" aria-label="Pausa"></div>' +
    '<div id="city-rotate" hidden role="alert"><p>Gira tu teléfono a vertical</p></div>' +
    '<div id="city-safe" style="position:fixed;left:0;bottom:0;padding-left:env(safe-area-inset-left);padding-bottom:env(safe-area-inset-bottom);visibility:hidden"></div>';
}
function cityTeardown() {
  cityGen++;
  var c = CD; CD = null;
  if (!c) return;
  if (c.loadTimer) clearTimeout(c.loadTimer);
  cityDropInput(c);
  if (c.world) { try { c.world.dispose(); } catch (e2) {} }
}
function cityStop() {
  cityTeardown();
  var r = cityRootEl();
  if (r) { r.hidden = true; r.innerHTML = ''; }
}
function cityPos() { return CD ? { x: CD.hero.x, z: CD.hero.z, yaw: CD.hero.yaw } : null; }
function citySave() { var p = cityPos(); if (p) S.city.at = p; save(); }
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
function cityStart() {
  if (CD && CD.world && !CD.suspended) return;
  cityTeardown();
  var gen = ++cityGen, r = cityRootEl(), at = S.city.at;
  r.hidden = false;
  r.innerHTML = cityHtml();
  var cv = cId('city-cv'), c;
  c = CD = {
    gen: gen, canvas: cv, world: null, input: null, base: null, flags: null, items: null, loadTimer: null,
    hero: { x: at.x, z: at.z, yaw: at.yaw, vx: 0, vz: 0, speed: 0 }, safe: { x: at.x, z: at.z, yaw: at.yaw }, savedAt: { x: at.x, z: at.z },
    face: CityMove.faceOf(at.yaw), zoom: CITY_ZMIN, boxes: CityMove.boxesFor(CITY_DATA, !!(S.city.restored && S.city.restored.M02 === true)),
    st: { hero: { x: at.x, z: at.z, face: 'up', speed: 0 }, zoom: CITY_ZMIN, flags: null },
    paused: false, sheet: false, rotate: false, suspended: false, lost: false, lastObjId: null, lastZone: null, nearId: null,
    saveT: 0, objT: 0, obj: null, objTarget: null, sheetFor: null, day: '', dayT: 0, lastD: -1, lastAng: -1
  };
  c.loadTimer = setTimeout(function () {   // el aviso solo se muestra si el mundo tarda más de 250 ms
    c.loadTimer = null;
    if (CD === c && !c.world) { var u = cId('city-ui-main'); if (u) u.insertAdjacentHTML('beforeend', CITY_LOAD_HTML); }
  }, CITY_LOAD_MS);
  var fail = function () { if (gen === cityGen) cityFallback('nogl'); };
  var F = cityWorldFactory();
  if (!F) { fail(); return; }
  var rm = false;
  try { rm = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) {}
  var made;
  try {
    made = F.create(cv, CITY_DATA, { reducedMotion: rm, tick: cityTick, state: cityState, onLost: function () { if (CD !== c) return; if (c.suspended) c.lost = true; else cityFallback('lost'); } });
  } catch (e2) { fail(); return; }
  Promise.resolve(made).then(function (world) {
    if (gen !== cityGen || V.name !== 'city') { try { world.dispose(); } catch (e) {} return; }
    if (c.loadTimer) { clearTimeout(c.loadTimer); c.loadTimer = null; }
    CD.world = world;
    CD.input = cityMakeInput();
    var lb = cId('city-loadbox'); if (lb) lb.remove();
    cityRefresh(); cityRotateCheck(); cityAnnounce();
  }).then(null, fail);
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
  cityClosePause(true);
  if (CD.sheet) cityCloseSheet(true);
  CD.boxes = CityMove.boxesFor(CITY_DATA, !!(S.city.restored && S.city.restored.M02 === true));
  if (CD.pendingBattle) { var pb = CD.pendingBattle; CD.pendingBattle = null; if (S.city.beaten[pb] === today() && CD.world) CD.world.dissolve(pb); }
  if (CD.world) { CD.world.resize(); CD.world.setPaused('suspended', false); }
  cityRefresh(); cityRotateCheck(); cityAnnounce();
  if (cityRestorePending) { cityRestorePending = false; cityCelebrate(''); }
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
  if (CD.paused || CD.rotate) u.setAttribute('inert', ''); else u.removeAttribute('inert');
}

/* ---------- HUD ---------- */
function cityHud(force) {
  if (!CD) return;
  var info = lvlInfo(S.xp), bp = cityBossPassed();
  var set = function (id, t) { var el = cId(id); if (el && el.textContent !== t) el.textContent = t; };
  set('city-rank', CityStory.rankOf(S.city, CITY_DATA));
  set('city-xp', nf(S.xp) + ' XP · Nv ' + info.lv);
  set('city-rest', 'Distrito ' + CityStory.restoration(S.city, CITY_DATA, bp) + ' %');
  cityObjUpdate(force);
}
function cityObjUpdate(force) {
  if (!CD) return;
  if (force || !CD.obj) { CD.obj = cityObjective(); CD.objTarget = cityObjTarget(CD.obj); CD.lastD = -1; CD.lastAng = -1; }
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
  var zone = cityZone(CD.hero.x, CD.hero.z), o = CD.obj || cityObjective(), id = o && o.id ? o.kind + ':' + o.id : (o ? o.kind : '');
  if (zone !== CD.lastZone) { CD.lastZone = zone; CD.lastObjId = id; lv.textContent = zone + (o && o.label ? '. ' + o.label : ''); }
  else if (id !== CD.lastObjId) { CD.lastObjId = id; lv.textContent = (o && o.label) ? 'Objetivo: ' + o.label : ''; }
}
function cityUpdateNear(force) {
  if (!CD) return;
  var list = cityItems(), best = null, bd = CITY_NEAR * CITY_NEAR, i, o, dx, dz, d2;
  for (i = 0; i < list.length; i++) { o = list[i]; dx = o.x - CD.hero.x; dz = o.z - CD.hero.z; d2 = dx * dx + dz * dz; if (d2 <= bd) { bd = d2; best = o; } }
  var id = best ? best.id : null, b = cId('city-act');
  if (!b || (!force && id === CD.nearId)) return;
  CD.nearId = id;
  if (best) { b.textContent = best.label; b.hidden = false; } else { b.textContent = ''; b.hidden = true; }
}
/* ---------- contrato con el mundo ---------- */
function cityState() {
  if (!CD) return null;
  var s = CD.st;
  s.hero.x = CD.hero.x; s.hero.z = CD.hero.z; s.hero.face = CD.face; s.hero.speed = CD.hero.speed;
  s.zoom = CD.zoom; s.flags = CD.flags || (CD.flags = cityFlags());
  return s;
}
function cityBlocked() { return !CD || !CD.world || CD.suspended || CD.paused || CD.sheet || CD.rotate || CD.lost || CD.busy; }
/* Zoom: dueño único. El pellizco multiplica (continuo); los pasos de rueda y teclas suman 0.25 y encajan en la rejilla de 0.25. NaN cae a 1. No se guarda. */
function cityZoomBy(factor, steps) {
  if (!CD) return;
  var z = CD.zoom * (typeof factor === 'number' && isFinite(factor) && factor > 0 ? factor : 1);
  if (typeof steps === 'number' && isFinite(steps) && steps !== 0) z = Math.round((z + 0.25 * steps) / 0.25) * 0.25;
  CD.zoom = (typeof z === 'number' && isFinite(z)) ? Math.max(CITY_ZMIN, Math.min(CITY_ZMAX, z)) : CITY_ZMIN;
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
  var canRun = levelOf(S.xp) >= 5 && S.city.run === true;
  var nh = CityMove.step(c.hero, { mx: it.mx, mz: it.mz, run: it.run }, sec, c.boxes, { canRun: canRun, radius: CITY_DATA.radius, safe: c.safe });
  c.hero = nh; c.safe = { x: nh.x, z: nh.z, yaw: nh.yaw };
  if (nh.speed > 0.1) c.face = CityMove.faceOf(nh.yaw);
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
/* ---------- hojas ---------- */
function cityOpenSheet(html, focusSel, forId) {
  if (!CD) return;
  var sh = cId('city-sheet'); if (!sh) return;
  citySave();
  sh.innerHTML = html; sh.hidden = false;
  CD.sheet = true; CD.sheetFor = forId || null;
  if (CD.world) CD.world.setPaused('sheet', true);
  var f = focusSel ? sh.querySelector(focusSel) : null;
  cFocus(f || sh.querySelector('button'));
}
function cityCloseSheet(quiet) {
  if (!CD) return;
  var sh = cId('city-sheet'); if (sh) { sh.hidden = true; sh.innerHTML = ''; }
  CD.sheet = false; CD.sheetFor = null;
  if (CD.world && !quiet) CD.world.setPaused('sheet', false);
  if (quiet) return;
  cityRefresh(); cityAnnounce();
  cityFlush();
  var a = cId('city-act'); cFocus(a && !a.hidden ? a : cId('city-pause'));
}
function citySheetHtml(sub, title, body, actions) {
  return '<article class="qcard"><div class="chips"><span class="chip">' + esc(sub) + '</span></div><h2 class="prompt">' + esc(title) + '</h2>' + body +
    '<div class="actions">' + (actions || '') + '<button class="btn" data-act="cx" data-c="sheetclose">Cerrar</button></div></article>';
}
/* Lección del mentor: resumen y puntos clave del tema; abrirla cuenta como lección vista */
function cityLesson(o) {
  var m = mod('M02'), t = m.tById[o.topic];
  if (!t) return;
  var lk = 'M02:' + t.id;
  if (S.stats.learnTopics.indexOf(lk) < 0) { S.stats.learnTopics.push(lk); checkVirtues(); save(); }
  var body = '<p class="lead">' + fmt(t.summary) + '</p><ul class="kp">' + t.keyPoints.map(function (k) { return '<li>' + fmt(k) + '</li>'; }).join('') + '</ul>' +
    '<p class="meta">' + esc('Para la primera estrella hacen falta al menos 6 respuestas') + '</p>';
  cityOpenSheet(citySheetHtml(o.name + ' · ' + t.id, t.title, body, '<button class="btn primary" data-act="cx" data-c="practice" data-id="' + esc(o.id) + '">Practicar</button>'), '[data-c="practice"]', o.id);
}
function cityPractice(id) {
  var o = cityItem(id); if (!CD || !o) return;
  var sh = cId('city-sheet'); if (sh) { sh.hidden = true; sh.innerHTML = ''; }
  CD.sheet = false; CD.sheetFor = null;
  startRound({ kind: 'quiz', title: 'Quiz', mid: 'M02', back: { name: 'city' }, city: { kind: 'practice', id: id } }, itemsFor('quiz', mod('M02'), o.topic));
}
/* Prólogo: tres paneles; terminar o saltar lo marca como visto */
var CITY_PROLOGUE = [
  ['Ciudad Núcleo', 'Ciudad Núcleo funciona gracias a su software: semáforos, puertas, grúas y buzones. Todo depende del conocimiento de quienes lo cuidan.'],
  ['La Maraña', 'La Maraña nace del código que nadie entiende y del conocimiento guardado por unos pocos. Apaga la ciudad distrito tras distrito.'],
  ['Llegas al Taller', 'Llegas como Becario al Taller Comunal, el colectivo de ingenieros de la ciudad. Aprende, ponte a prueba y enseña a tus vecinos: así vuelve la luz.']
];
function cityPrologue(i) {
  var p = CITY_PROLOGUE[i], last = i === CITY_PROLOGUE.length - 1;
  var act = last ? '' : '<button class="btn primary" data-act="cx" data-c="pro-next" data-i="' + (i + 1) + '">Siguiente</button><button class="btn" data-act="cx" data-c="pro-skip">Saltar</button>';
  var html = '<article class="qcard"><div class="chips"><span class="chip">' + esc('Prólogo ' + (i + 1) + ' de 3') + '</span></div><h2 class="prompt">' + esc(p[0]) + '</h2><p>' + esc(p[1]) + '</p>' +
    '<div class="actions">' + act + (last ? '<button class="btn primary" data-act="cx" data-c="pro-end">Cerrar</button>' : '') + '</div></article>';
  var sh = cId('city-sheet');
  if (CD && CD.sheet && sh) { sh.innerHTML = html; cFocus(sh.querySelector('button')); } else cityOpenSheet(html, 'button', 'iris');
}
function cityPrologueDone() { if (!S.city.prologue) { S.city.prologue = true; save(); } cityCloseSheet(); }

/* Enseñar (explicar): el aprendiz pide explicación; hay que elegir los 3 puntos clave del tema entre 6 */
function cityKpPool(o) {
  var m = mod('M02'), own = shuffle(m.tById[o.topic].keyPoints).slice(0, 3).map(function (t) { return { t: t, own: true }; });
  var others = []; m.topics.forEach(function (tp) { if (tp.id !== o.topic) tp.keyPoints.forEach(function (k) { others.push(k); }); });
  var foreign = shuffle(others).slice(0, 3).map(function (t) { return { t: t, own: false }; });
  return shuffle(own.concat(foreign));
}
function cityTeachExplain(o, fresh) {
  if (!CD) return;
  var m = mod('M02'), tp = m.tById[o.topic];
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
  if (CD.sheet && sh) { sh.innerHTML = html; cFocus(sh.querySelector('button')); } else cityOpenSheet(html, 'button', o.id);
}
function cityTeachPick(i) {
  var T = CD && CD.teach; if (!T || T.checked || !T.items[i]) return;
  if (T.picked[i]) delete T.picked[i]; else if (Object.keys(T.picked).length < 3) T.picked[i] = true; else return;
  cityTeachExplain(T.o, false);
}
function cityTeachGo() {
  var T = CD && CD.teach; if (!T || T.checked || Object.keys(T.picked).length !== 3) return;
  var good = Object.keys(T.picked).every(function (i) { return T.items[i].own; });
  if (!good) { T.checked = true; cityTeachExplain(T.o, false); return; }
  touch();
  S.xp += 15;
  S.city.taught[T.o.id] = true;
  var rs = CityStory.applyRestore(S.city, CITY_DATA, cityBossPassed());
  checkVirtues(); save();
  CD.teach = null;
  if (rs.changed) { cityRestorePending = false; cityCelebrate('¡Gracias, ' + T.o.name + ' lo entendió!'); }
  else cityOpenSheet(citySheetHtml('Enseñar', '¡Lo entendió!', '<p>' + esc(T.o.name + ' lo entendió gracias a ti. +15 XP.') + '</p>'), '[data-c="sheetclose"]', T.o.id);
}
function cityTeachCorrect(o) {
  var qs = shuffle(ofType(mod('M02'), 'error', o.topic));
  if (!qs.length || !CD) return;
  startRound({ kind: 'error', title: 'Enseñar', mid: 'M02', back: { name: 'city' }, city: { kind: 'teach', id: o.id } }, [qs[0]]);
}
function cityCelebrate(pre) {
  cityOpenSheet(citySheetHtml('Capítulo 1', '¡Distrito restaurado!', '<p>' + esc((pre ? pre + ' ' : '') + 'El Taller Comunal vuelve a funcionar y ya no depende de una sola persona.') + '</p>' +
    '<p><b>' + esc('Poder nuevo: Planos. Subes a ' + CityStory.rankOf(S.city, CITY_DATA) + '.') + '</b></p>'), '[data-c="sheetclose"]', 'celebracion');
}
function cityTower(o) {
  var m = mod('M02');
  if (bossUnlocked(m)) {
    var sh = cId('city-sheet'); if (sh) { sh.hidden = true; sh.innerHTML = ''; }
    CD.sheet = false;
    startRound({ kind: 'boss', title: 'Jefe final', mid: 'M02', back: { name: 'city' }, city: { kind: 'boss', id: 'torre' } }, itemsFor('boss', m));
    return;
  }
  var miss = m.topics.filter(function (t) { return starsOf(m, t.id) < 1; });
  cityOpenSheet(citySheetHtml('Torre del Taller', 'Te faltan ' + miss.length + (miss.length === 1 ? ' tema' : ' temas'),
    '<p>Consigue al menos una estrella en cada tema para enfrentar al jefe.</p><ul class="kp">' + miss.map(function (t) { return '<li>' + esc(t.id + ' ' + t.title) + '</li>'; }).join('') + '</ul>'), '[data-c="sheetclose"]', o.id);
}
function cityBridge(o) {
  if (S.city.restored && S.city.restored.M02 === true) {
    S.city.bridgeSeen = true; save();
    cityOpenSheet(citySheetHtml('Puente al Archivo', 'Próximamente', '<p>El puente ya está construido. El siguiente distrito abrirá en el capítulo 2.</p>'), '[data-c="sheetclose"]', o.id);
  } else {
    cityOpenSheet(citySheetHtml('Puente', 'Cerrado por La Maraña', '<p>Restaura el Taller Comunal para que el puente se abra.</p>'), '[data-c="sheetclose"]', o.id);
  }
}
/* Criatura: el mundo hace el encuentro y al resolver empieza la batalla; si el mundo ya no existe, no pasa nada */
function cityEncounter(o) {
  var c = CD; if (!c || !c.world || c.busy) return;
  c.busy = true;
  var go = function () {
    if (CD !== c) return;
    c.busy = false; c.pendingBattle = o.id;
    startRound({ kind: 'battle', title: 'Batalla', mid: 'M02', back: { name: 'city' }, villain: { id: o.id, name: o.name, mod: 'M02', topics: o.topics }, city: { kind: 'battle', id: o.id } }, battleItems({ mod: 'M02', topics: o.topics, n: 8 }));
  };
  var p; try { p = c.world.encounter(o.id); } catch (e) { p = null; }
  Promise.resolve(p).then(go, go);
}
/* Punto de extensión: cada tarea posterior reemplaza la rama de su tipo (mentor, criatura, reparación, aprendiz, torre, puente). */
function cityOpen(o) {
  if (!CD || !o) return;
  if (o.kind === 'director' && !S.city.prologue) {
    cityPrologue(0);
  } else if (o.kind === 'director') {
    var ob = cityObjective();
    cityOpenSheet(citySheetHtml('Directora', o.name, '<p>' + esc('Bienvenido a Ciudad Núcleo, ' + heroName() + '.') + '</p>' + (ob && ob.label ? '<p><b>' + esc(ob.label) + '</b></p>' : '')), '[data-c="sheetclose"]', o.id);
  } else if (o.kind === 'mirror') {
    citySave(); go('hero');
  } else if (o.kind === 'mentor') {
    cityLesson(o);
  } else if (o.kind === 'apprentice') {
    if (o.mode === 'correct') cityTeachCorrect(o); else cityTeachExplain(o, true);
  } else if (o.kind === 'tower') {
    cityTower(o);
  } else if (o.kind === 'bridge') {
    cityBridge(o);
  } else if (o.kind === 'creature') {
    cityEncounter(o);
  } else if (o.kind === 'repair') {
    startRound({ kind: 'repair', title: 'Reparación', mid: 'M02', back: { name: 'city' }, city: { kind: 'repair', id: o.id } }, repairItems('M02', o.topic));
  } else {
    cityOpenSheet(citySheetHtml('Lugar', o.name, '<p>' + esc(o.label) + '</p>'), '[data-c="sheetclose"]', o.id);
  }
}

/* ---------- pausa ---------- */
var CITY_PAUSE_OPTS = [['goal', 'Ir al objetivo'], ['near', 'Lugares cercanos'], ['learned', 'Lecciones vistas'], ['review', 'Repaso'], ['hero', 'Tu héroe'], ['home', 'Salir al inicio']];
function cityPauseMain() {
  var pb = cId('city-pausebox'); if (!pb) return;
  pb.innerHTML = '<div class="banner"><h2 class="h2">Pausa</h2><div class="actions col">' +
    CITY_PAUSE_OPTS.map(function (p) { return '<button class="btn" data-act="cx" data-c="p-' + p[0] + '">' + esc(p[1]) + '</button>'; }).join('') +
    '<div class="actions"><button class="btn" data-act="cx" data-c="zoomout">Alejar</button><button class="btn" data-act="cx" data-c="zoomin">Acercar</button></div>' +
    '<button class="btn primary" data-act="cx" data-c="pauseclose">Cerrar</button></div></div>';
}
function cityOpenPause() {
  if (!CD || CD.paused) return;
  citySave();
  CD.paused = true; cityPauseMain();
  var pb = cId('city-pausebox'); pb.hidden = false;
  cityInert();
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
    var m = mod('M02'), M = CITY_DATA.districts.M02, rows = [];
    S.stats.learnTopics.forEach(function (k) {
      if (k.indexOf('M02:') !== 0 || !m.tById[k.slice(4)]) return;
      var tp = m.tById[k.slice(4)], mm = M.mentors.filter(function (x) { return x.topic === tp.id; })[0];
      if (mm) rows.push('<button class="btn" data-act="cx" data-c="lesson" data-id="' + esc(mm.id) + '">' + esc(tp.id + ' ' + tp.title) + ' · ' + starStr(starsOf(m, tp.id)) + '</button>');
    });
    cityPauseList('Lecciones vistas', rows, 'Todavía no has visto lecciones de este distrito.');
  } else if (a === 'review') {
    var q = queue();
    if (!q.length) { cityPauseList('Repaso', [], 'No tienes preguntas pendientes de repaso.'); return; }
    cityClosePause(true);
    startRound({ kind: 'review', title: 'Repaso', back: { name: 'city' } }, sample(q, 10));
  } else if (a === 'hero') { citySave(); go('hero'); }
  else if (a === 'home') { citySave(); go('home'); }
}

/* ---------- eventos ---------- */
function cityAct(c, b) {
  if (c === 'quit' || c === 'home') { if (CD) citySave(); go('home'); }
  else if (c === 'mods') go('module', { mod: 'M02' });
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
  else if (c === 'pro-next') cityPrologue(parseInt(b.dataset.i, 10));
  else if (c === 'pro-skip' || c === 'pro-end') cityPrologueDone();
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
      CD.savedAt = { x: CD.savedAt.x, z: CD.savedAt.z }; cityObjUpdate(false); cityUpdateNear(true); cityAnnounce();
    },
    objective: function () { return cityObjective(); }
  };
}
