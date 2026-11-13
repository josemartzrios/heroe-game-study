/* Introducción de Ciudad Núcleo para quien juega por primera vez (se inserta DENTRO de la IIFE del motor, después de view.js):
   prólogo de Iris en 4 paneles, pistas en el momento (una a la vez, 6 s de visibilidad real, una sola vez cada una), "¿Cómo se juega?"
   y los textos de controles según el tipo de puntero. Usa S, CD, cId, cFocus, cityOpenSheet, citySheetHtml, cityCloseSheet, cityItem, esc, fmt,
   starsOf, mod, bossUnlocked y CityStory. ES5. Los textos van a innerHTML solo con esc(); la pista se escribe con textContent. */
var CITY_TIP_MS = 6000;
var CITY_INTRO = [
  ['Ciudad Núcleo', 'Ciudad Núcleo funciona gracias a su software: semáforos, puertas, grúas y buzones. Todo depende del conocimiento de quienes lo cuidan.'],
  ['La Maraña', 'La Maraña nace del código que nadie entiende y del conocimiento guardado por unos pocos. Apaga la ciudad distrito tras distrito.'],
  ['Tu papel', 'Llegas como Becario. Cada distrito es un módulo del temario: restáuralo y subirás de rango hasta Tech Lead. Cada portal abierto de la plaza lleva a un distrito; los demás llegarán pronto.']
];
var CITY_HOWTO_TITLE = 'Cómo se juega';
var CITY_HOWTO = [
  ['🧑‍🏫', 'Mentor', 'Habla con él y lee la lección de su tema.'],
  ['⭐', 'Practicar', 'Responde preguntas y gana estrellas.'],
  ['👾', 'Criatura', 'Mezcla varios temas: véncela para probar lo que sabes.'],
  ['🔧', 'Reparar y enseñar', 'Arregla la ciudad y explica temas a los aprendices.'],
  ['🗼', 'Torre', 'El examen final del módulo restaura el distrito.']
];
var CITY_TIPS = {
  talk: 'Toca «Hablar con…» o pulsa E para aprender su tema.',
  star: 'Con 1 estrella ya puedes enseñar ese tema a un aprendiz.',
  creature: 'Las criaturas mezclan varios temas: aprende antes de enfrentarlas.',
  repair: 'Repara la ciudad respondiendo sin ayudas.',
  tower: 'La torre está abierta: es el examen final del distrito.',
  portals: 'Hay más distritos detrás de los portales.'
};

function cityMedia(q) { try { return !!(window.matchMedia && window.matchMedia(q).matches); } catch (e) { return false; } }
/* Controles según el puntero: líneas táctiles si hay puntero grueso, de teclado si hay puntero fino (o ninguno detectado); en híbridos, ambas */
function cityControlsHtml() {
  var coarse = cityMedia('(any-pointer: coarse)'), fine = cityMedia('(any-pointer: fine)'), out = '';
  if (coarse) out += '<li class="ctl-touch">' + esc('Arrastra en la parte izquierda de la pantalla para caminar. Pellizca para acercar o alejar.') + '</li>';
  if (fine || !coarse) out += '<li class="ctl-kb">' + esc('WASD o flechas para caminar. E o Enter para hablar. Rueda o +/− para el zoom. Esc para pausa.') + '</li>';
  out += '<li class="ctl-run">' + esc('Desde el nivel 5 puedes correr (botón Correr o Shift).') + '</li>';
  return out;
}
/* Cuerpo del panel "Cómo se juega": el ciclo del distrito con un ícono por paso y los controles */
function cityHowToBody() {
  return '<ul class="vlist how">' + CITY_HOWTO.map(function (h) { return '<li><span aria-hidden="true">' + h[0] + '</span> <b>' + esc(h[1]) + ':</b> ' + esc(h[2]) + '</li>'; }).join('') + cityControlsHtml() + '</ul>';
}
function cityIntroTotal() { return CITY_INTRO.length + 1; }
/* Prólogo: paneles 1..3 de texto y el 4.º "Cómo se juega"; cerrar o saltar lo marca como visto */
function cityIntroOpen(i) {
  if (!CD) return;
  var last = i >= CITY_INTRO.length, tot = cityIntroTotal(), title = last ? CITY_HOWTO_TITLE : CITY_INTRO[i][0];
  var body = last ? cityHowToBody() : '<p>' + esc(CITY_INTRO[i][1]) + '</p>';
  var act = last ? '<button class="btn primary" data-act="cx" data-c="pro-end">Cerrar</button>' : '<button class="btn primary" data-act="cx" data-c="pro-next" data-i="' + (i + 1) + '">Siguiente</button><button class="btn" data-act="cx" data-c="pro-skip">Saltar</button>';
  var html = '<article class="qcard"><div class="chips"><span class="chip">' + esc('Prólogo ' + (i + 1) + ' de ' + tot) + '</span></div><h2 class="prompt">' + esc(title) + '</h2>' + body + '<div class="actions">' + act + '</div></article>';
  var sh = cId('city-sheet');
  if (CD.sheet && sh) { sh.innerHTML = html; citySheetLabel(sh); sh.scrollTop = 0; cFocus(sh.querySelector('button')); } else cityOpenSheet(html, 'button', 'iris');
}
function cityIntroDone() { if (!S.city.prologue) { S.city.prologue = true; save(); } cityCloseSheet(); }
/* Iris después del prólogo: el panel "Cómo se juega" y, en negrita, el objetivo actual */
function cityIrisSheet(o) {
  var ob = cityObjective();
  cityOpenSheet(citySheetHtml('Ciudad Núcleo', o.name, '<p>' + esc('Bienvenido a Ciudad Núcleo, ' + heroName() + '.') + '</p>' + (ob && ob.label ? '<p><b>' + esc(ob.label) + '</b></p>' : '') + '<h3 class="h2">' + esc(CITY_HOWTO_TITLE) + '</h3>' + cityHowToBody()), '[data-c="sheetclose"]', o.id);
}
/* "¿Cómo se juega?" de la pausa: el panel 4 y la lista de pistas ya vistas */
function cityHowTo() {
  var seen = Object.keys(CITY_TIPS).filter(function (id) { return S.city.tips[id] === true; });
  var tips = seen.length ? '<h3 class="h2">Pistas vistas</h3><ul class="kp">' + seen.map(function (id) { return '<li>' + esc(CITY_TIPS[id]) + '</li>'; }).join('') + '</ul>' : '';
  cityOpenSheet(citySheetHtml('Ciudad Núcleo', '¿Cómo se juega?', cityHowToBody() + tips), '[data-c="sheetclose"]', 'howto');
}

/* ---------- pistas ---------- */
function cityTipEl() { return cId('city-tip'); }
function cityTipShowNext() {
  var T = CD && CD.tips, el = cityTipEl();
  if (!T || !el || T.cur || !T.q.length) return;
  var id = T.q.shift();
  T.cur = id; T.left = CITY_TIP_MS;
  S.city.tips[id] = true; save();   // se marca al mostrarse: no se repite aunque se cierre al instante
  el.textContent = CITY_TIPS[id];
}
function cityTipClose() {
  var T = CD && CD.tips, el = cityTipEl();
  if (!T || !T.cur) return;
  T.cur = null; T.hover = false;
  if (el) el.textContent = '';
  cityTipShowNext();
}
/* Pone la pista en cola si es conocida, no se vio nunca y no está ya en cola o en pantalla */
function cityTip(id) {
  var T = CD && CD.tips;
  if (!T || !Object.prototype.hasOwnProperty.call(CITY_TIPS, id) || S.city.tips[id] === true || T.cur === id || T.q.indexOf(id) >= 0) return;
  T.q.push(id); cityTipShowNext();
}
/* La cuenta de 6 s solo avanza con la vista libre: no corre con hoja, pausa o fundido (el tick no llega) ni con el puntero o el foco sobre la pista */
function cityTipTick(dt) {
  var T = CD && CD.tips; if (!T || !T.cur) return;
  var el = cityTipEl(), ae = document.activeElement;
  if (T.hover || (el && ae && el.contains(ae))) return;
  T.left -= dt;
  if (T.left <= 0) cityTipClose();
}
function cityStarSnapshot() {
  var o = {};
  Object.keys(CITY_DATA.districts).forEach(function (mid) { var m = mod(mid); if (m) m.topics.forEach(function (t) { if (starsOf(m, t.id) >= 1) o[mid + ':' + t.id] = 1; }); });
  return o;
}
/* reason: near (cambió el lugar más cercano), resume (se vuelve de una ronda), tower y plaza (al recalcular la escena) */
function cityTipsCheck(reason) {
  if (!CD || !CD.tips) return;
  if (reason === 'near') {
    var it = CD.nearId ? cityItem(CD.nearId) : null;
    if (it) { if (it.kind === 'mentor') cityTip('talk'); else if (it.kind === 'creature') cityTip('creature'); else if (it.kind === 'repair') cityTip('repair'); }
  } else if (reason === 'resume') {
    var now = cityStarSnapshot(), fresh = Object.keys(now).some(function (k) { return !CD.starBase[k]; });
    CD.starBase = now;
    if (fresh) cityTip('star');
  } else if (reason === 'tower') {
    if (CD.scene !== 'plaza' && bossUnlocked(mod(CD.scene))) cityTip('tower');
  } else if (reason === 'plaza') {
    if (CD.scene === 'plaza' && cityRestoredN().done > 0) cityTip('portals');
  }
}
