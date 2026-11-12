/* Vista `city` de Ciudad Núcleo (se inserta DENTRO de la IIFE del motor: usa S, V, go, esc, fmt, mod, starsOf, queue, sample,
   startRound, levelOf, loadThree, CITY_DATA, CityMove, CityStory y CityInput). ES5. Texto de datos: solo esc()/fmt() en innerHTML;
   el botón de acción, #city-live y #city-obj se escriben solo con textContent. */
var CD = null, cityGen = 0;
var CITY_QUIT_HTML = '<div id="city-loadbox"><p role="status" id="city-load">Preparando la ciudad…</p><button class="btn" data-act="cx" data-c="quit">Salir</button></div>';
var CITY_TILT0 = -15 * Math.PI / 180, CITY_TILT_MIN = -35 * Math.PI / 180, CITY_TILT_MAX = 10 * Math.PI / 180;
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
  return (typeof CityWorld !== 'undefined') ? CityWorld : null;
}
function cityBossPassed() { return !!(S.boss.M02 && S.boss.M02.passed === true); }
function cityPortrait() { return !(window.innerWidth > window.innerHeight && window.innerHeight < 500); }

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
function cityItems() {
  if (!CD) return [];
  if (!CD.base) CD.base = cityBase();
  var m = mod('M02');
  return CD.base.filter(function (o) {
    if (o.kind === 'creature') return !beatenToday(o.id);
    if (o.kind === 'repair') return S.city.repairs[o.id] !== true;
    if (o.kind === 'apprentice') return S.city.taught[o.id] !== true && starsOf(m, o.topic) >= 1;
    return true;
  });
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
function cityFlush() { if (CD && CD.input) { CD.input.consumeAction(); CD.input.consumeCamera(); } }
function cityHtml() {
  var run = levelOf(S.xp) >= 5 ? '<button class="btn sm" id="city-run" data-act="cx" data-c="run" aria-pressed="' + (S.city.run ? 'true' : 'false') + '">Correr</button>' : '';
  return '<canvas id="city-cv" aria-hidden="true"></canvas>' +
    '<div id="city-ui-main"><div class="city-hud"><button class="btn sm" id="city-pause" data-act="cx" data-c="pause">Pausa</button>' +
    '<span class="pill" id="city-rank"></span><span class="pill" id="city-xp"></span><span class="pill" id="city-rest"></span>' + run +
    '<p class="city-objrow"><span id="city-arrow" aria-hidden="true">▲</span><span id="city-obj"></span></p></div>' +
    '<div id="city-live" class="sronly" aria-live="polite"></div>' +
    '<button class="btn primary" id="city-act" data-act="cx" data-c="act" hidden></button>' + CITY_QUIT_HTML + '</div>' +
    '<div id="city-sheet" hidden></div><div id="city-pausebox" hidden role="dialog" aria-modal="true" aria-label="Pausa"></div>' +
    '<div id="city-rotate" hidden role="alert"><p>Gira tu teléfono a vertical</p></div>' +
    '<div id="city-safe" style="position:fixed;left:0;bottom:0;padding-left:env(safe-area-inset-left);padding-bottom:env(safe-area-inset-bottom);visibility:hidden"></div>';
}
function cityTeardown() {
  cityGen++;
  var c = CD; CD = null;
  if (!c) return;
  if (c.canvas && c.onLost) c.canvas.removeEventListener('webglcontextlost', c.onLost);
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
    r.innerHTML = '<div class="banner up" role="alert"><p>Se perdió la vista 3D.</p><div class="actions"><button class="btn primary" data-act="cx" data-c="retry">Reintentar</button><button class="btn" data-act="cx" data-c="quit">Salir</button></div></div>';
  } else {
    r.innerHTML = '<div class="banner up" role="alert"><p>Tu equipo no puede mostrar la ciudad 3D.</p><div class="actions"><button class="btn" data-act="cx" data-c="mods">Ir a los módulos</button><button class="btn primary" data-act="cx" data-c="home">Volver</button></div></div>';
  }
  var b = r.querySelector('button.primary'); if (b) cFocus(b);
}
function cityStart() {
  if (CD && CD.world && !CD.suspended) return;
  cityTeardown();
  var gen = ++cityGen, r = cityRootEl(), at = S.city.at;
  r.hidden = false;
  r.innerHTML = cityHtml();
  var cv = cId('city-cv');
  var onLost = function (ev) {
    if (!CD || ev.target !== CD.canvas) return;
    if (CD.suspended) CD.lost = true; else cityFallback('lost');
  };
  CD = {
    gen: gen, canvas: cv, world: null, input: null, onLost: onLost, base: null, flags: null,
    hero: { x: at.x, z: at.z, yaw: at.yaw, vx: 0, vz: 0, speed: 0 }, safe: { x: at.x, z: at.z, yaw: at.yaw },
    cam: { yaw: at.yaw, tilt: CITY_TILT0, arm: 6 }, boxes: CityMove.boxesFor(CITY_DATA, !!(S.city.restored && S.city.restored.M02 === true)),
    paused: false, sheet: false, rotate: false, suspended: false, lost: false, lastObjId: null, lastZone: null, nearId: null,
    saveT: 0, objT: 1, obj: null, objTarget: null, sheetFor: null
  };
  cv.addEventListener('webglcontextlost', onLost);
  var fail = function () { if (gen === cityGen) { cityFallback('nogl'); } };
  loadThree().then(function (THREE) {
    if (gen !== cityGen || V.name !== 'city') return;
    var F = cityWorldFactory();
    if (!F) throw new Error('sin mundo');
    var rm = false;
    try { rm = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) {}
    return Promise.resolve(F.create(THREE, cv, CITY_DATA, { reducedMotion: rm, portrait: cityPortrait(), look: S.hero.look, PARTS: PARTS, tick: cityTick, state: cityState })).then(function (world) {
      if (gen !== cityGen || V.name !== 'city') { try { world.dispose(); } catch (e) {} return; }
      CD.world = world;
      CD.input = cityMakeInput();
      var lb = cId('city-loadbox'); if (lb) lb.remove();
      CD.flags = cityFlags();
      cityHud(true); cityUpdateNear(true); cityRotateCheck();
      cityAnnounce();
    });
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
  CD.flags = cityFlags(); CD.objT = 1;
  if (CD.world) { CD.world.resize(); CD.world.setPaused('suspended', false); }
  cityHud(true); cityUpdateNear(true); cityRotateCheck(); cityAnnounce();
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
  if (force || !CD.obj) { CD.obj = cityObjective(); CD.objTarget = cityObjTarget(CD.obj); }
  var o = CD.obj, t = CD.objTarget, el = cId('city-obj'), ar = cId('city-arrow'), txt = '';
  if (o && o.label) {
    if (t) {
      var d = Math.round(Math.hypot(t.x - CD.hero.x, t.z - CD.hero.z));
      txt = o.label + ' · ' + d + ' m';
      if (ar) { var ang = Math.atan2(-(t.x - CD.hero.x), -(t.z - CD.hero.z)) - CD.cam.yaw + Math.PI; ar.style.transform = 'rotate(' + Math.round(ang * 180 / Math.PI) + 'deg)'; ar.hidden = false; }
    } else { txt = o.label; if (ar) ar.hidden = true; }
  } else if (ar) ar.hidden = true;
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
  var n = CityMove.nearest(CD.hero, cityItems(), CITY_NEAR), id = n ? n.id : null, b = cId('city-act');
  if (!b || (!force && id === CD.nearId)) return;
  CD.nearId = id;
  if (n) { b.textContent = n.label; b.hidden = false; } else { b.textContent = ''; b.hidden = true; }
}

/* ---------- contrato con el mundo ---------- */
function cityState() {
  if (!CD) return null;
  return { hero: { x: CD.hero.x, z: CD.hero.z, yaw: CD.hero.yaw, speed: CD.hero.speed }, cam: { yaw: CD.cam.yaw, pitch: -CD.cam.tilt, arm: CD.cam.arm }, flags: CD.flags || (CD.flags = cityFlags()) };
}
function cityBlocked() { return !CD || !CD.world || CD.suspended || CD.paused || CD.sheet || CD.rotate || CD.lost; }
function cityAngDiff(a, b) { var d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; }
function cityTick(dt) {
  var c = CD;
  if (!c || !c.input || c.suspended) return;
  if (typeof dt !== 'number' || !(dt >= 0)) dt = 0;
  var sec = Math.min(dt, 100) / 1000;
  if (c.input.consumePause()) cityPauseKey();
  var act = c.input.consumeAction();
  if (cityBlocked()) { c.input.consumeCamera(); return; }
  var it = c.input.intent(), cm = c.input.consumeCamera();
  c.cam.yaw -= cm.yaw * Math.PI / 180;
  c.cam.tilt = Math.max(CITY_TILT_MIN, Math.min(CITY_TILT_MAX, c.cam.tilt - cm.pitch * Math.PI / 180));
  var canRun = levelOf(S.xp) >= 5 && S.city.run === true;
  var nh = CityMove.step(c.hero, { mx: it.mx, mz: it.mz, run: it.run, camYaw: c.cam.yaw }, sec, c.boxes, { canRun: canRun, radius: CITY_DATA.radius, safe: c.safe });
  c.hero = nh; c.safe = { x: nh.x, z: nh.z, yaw: nh.yaw };
  var rm = false;
  if (!c.reducedChecked) { c.reducedChecked = true; try { c.reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { c.reduced = false; } }
  rm = c.reduced;
  if (nh.speed > 0.5 && !rm && Math.abs(cm.yaw) < 0.01) {
    var df = cityAngDiff(c.cam.yaw, nh.yaw), stp = (Math.PI / 2) * sec;
    c.cam.yaw += Math.abs(df) <= stp ? df : (df > 0 ? stp : -stp);
  }
  c.cam.arm = CityMove.cameraArm({ x: nh.x, z: nh.z, y: 1.6 }, c.cam.yaw, -c.cam.tilt, 6, c.boxes);
  c.saveT += sec; c.objT += sec;
  if (c.saveT >= 5) { c.saveT = 0; citySave(); }
  if (c.objT >= 0.25) { c.objT = 0; cityObjUpdate(true); cityAnnounce(); }
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
  CD.flags = cityFlags(); cityHud(true); cityUpdateNear(true); cityAnnounce();
  cityFlush();
  var a = cId('city-act'); cFocus(a && !a.hidden ? a : cId('city-pause'));
}
function citySheetHtml(sub, title, body, actions) {
  return '<article class="qcard"><div class="chips"><span class="chip">' + esc(sub) + '</span></div><h2 class="prompt">' + esc(title) + '</h2>' + body +
    '<div class="actions">' + (actions || '') + '<button class="btn" data-act="cx" data-c="sheetclose">Cerrar</button></div></article>';
}
/* Punto de extensión: cada tarea posterior reemplaza la rama de su tipo (mentor, criatura, reparación, aprendiz, torre, puente). */
function cityOpen(o) {
  if (!CD || !o) return;
  if (o.kind === 'director') {
    cityOpenSheet(citySheetHtml('Directora', o.name, '<p>' + fmt('Bienvenido a Ciudad Núcleo, ' + heroName() + '.') + '</p>'), '[data-c="sheetclose"]', o.id);
  } else if (o.kind === 'mirror') {
    cityOpenSheet(citySheetHtml('Espejo', 'Tu héroe', '<p>' + fmt('Mira cómo vas: rango ' + CityStory.rankOf(S.city, CITY_DATA) + '.') + '</p>'), '[data-c="sheetclose"]', o.id);
  } else if (o.kind === 'creature') {
    startRound({ kind: 'battle', title: 'Batalla', mid: 'M02', back: { name: 'city' }, villain: { id: o.id, name: o.name, mod: 'M02', topics: o.topics }, city: { kind: 'battle', id: o.id } }, battleItems({ mod: 'M02', topics: o.topics, n: 8 }));
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
    var m = mod('M02'), rows = S.stats.learnTopics.filter(function (k) { return k.indexOf('M02:') === 0 && m.tById[k.slice(4)]; })
      .map(function (k) { var t = m.tById[k.slice(4)]; return '<p class="meta">' + esc(t.id + ' ' + t.title) + ' ' + starsHtml(starsOf(m, t.id)) + '</p>'; });
    var pb = cId('city-pausebox');
    pb.innerHTML = '<div class="banner"><h2 class="h2">Lecciones vistas</h2>' + (rows.length ? rows.join('') : '<p>Todavía no has visto lecciones de este distrito.</p>') +
      '<div class="actions"><button class="btn" data-act="cx" data-c="pausemain">Volver</button></div></div>';
    cFocus(pb.querySelector('button'));
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
  else if (c === 'pausemain') { cityPauseMain(); cFocus(cId('city-pausebox').querySelector('button')); }
  else if (c.indexOf('p-') === 0) { if (CD && CD.paused) cityPauseAct(c.slice(2)); }
  else if (c === 'go') { var o = cityItem(b.dataset.id); if (CD && o) { cityClosePause(); cityOpen(o); } }
  else if (c === 'act') { if (CD && CD.world && !CD.sheet && !CD.paused && CD.nearId) { var n = cityItem(CD.nearId); if (n) cityOpen(n); } }
  else if (c === 'sheetclose') cityCloseSheet();
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
      cityObjUpdate(true); cityUpdateNear(true); cityAnnounce();
    },
    objective: function () { return cityObjective(); }
  };
}
