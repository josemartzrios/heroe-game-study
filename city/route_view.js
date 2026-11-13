/* Ruta del paquete de un distrito en la vista (se inserta DENTRO de la IIFE del motor, después de intro.js): hojas de cada estación (punto clave,
   pregunta, resultado), XP y guardado por respuesta, resumen de la visita, "Recorrer otra vez" y el HUD de capas. La lógica de estados es CityRoute
   (city/route.js); el progreso se guarda en S.city.d[mid].route.done. Usa S, CD, cId, cFocus, cityD, cityOpenSheet, citySheetHtml, citySheetLabel,
   cityCloseSheet, cityReleaseUi, mod, prep, touch, xpBase, xpWithPassive, recordAnswer, checkVirtues, save, startRound, shuffle, KIND_LABEL, esc y fmt. ES5.
   Los textos de datos van a innerHTML solo con esc()/fmt(); #city-live y la pill de capas, con textContent. */
var CITY_ROUTE_LAYERS = ['Datos', 'Puerto', 'IP', 'Trama'];

function cityRouteStations() { return (CD && CD.sc && CD.sc.route) ? CD.sc.route.stations : null; }
function cityRouteDone() { var d = (CD && CD.scene !== 'plaza') ? cityD(CD.scene) : null; return (d && d.route) ? d.route.done : 0; }
/* Cambia el contenido de la hoja abierta (o la abre si no hay una) */
function citySheetSet(html, focusSel) {
  var sh = cId('city-sheet');
  if (CD.sheet && sh) { sh.innerHTML = html; citySheetLabel(sh); sh.scrollTop = 0; cFocus(sh.querySelector(focusSel) || sh.querySelector('button')); }
  else cityOpenSheet(html, focusSel, 'route');
}
/* HUD: capas del modelo alcanzadas (las de la última estación terminada); se deducen de done, así que sobreviven a recargar */
function cityRouteHud() {
  var el = cId('city-layers'); if (!el) return;
  var sts = cityRouteStations(), done = sts ? cityRouteDone() : 0, n = (done > 0 && sts[done - 1]) ? sts[done - 1].layers : 0;
  var txt = n ? 'Capas: ' + CITY_ROUTE_LAYERS.slice(0, n).join(' · ') : '';
  if (el.textContent !== txt) el.textContent = txt;
  el.hidden = !txt;
}
/* El pad que se tocó: el activo abre su estación; con la ruta completa, el primero ofrece repetirla; cualquier otro no hace nada */
function cityRoutePad(o) {
  var sts = cityRouteStations(); if (!sts) return;
  var n = sts.length, done = cityRouteDone();
  if (done >= n) {
    if (o.idx !== 0) return;
    cityOpenSheet(citySheetHtml('Ruta del paquete', 'Ruta completa', '<p>' + esc('Ya recorriste las ' + n + ' estaciones. ¿Quieres recorrerla otra vez?') + '</p>', '<button class="btn primary" data-act="cx" data-c="route-reset">Recorrer otra vez</button>'), '[data-c="route-reset"]', o.id);
    return;
  }
  if (o.idx !== done) return;
  var R = CD.route || (CD.route = { flow: null, active: false, starting: false, xp: 0, fails: [], per: [] });
  if (!R.flow) R.flow = cityRouteMakeFlow(done);
  R.active = true;
  if (R.flow.state().phase === 'idle') { R.starting = true; R.flow.start(); R.starting = false; }   // start() → onStation(done) abre la hoja
  else cityRouteOpen(done);
}
function cityRouteMakeFlow(from) {
  return CityRoute.create({
    stations: CD.sc.route.stations, questionsByTopic: mod(CD.scene).byTopic, prep: prep, rnd: Math.random, from: from,
    onStation: cityRouteOnStation, onAsk: cityRouteAsk, onResult: cityRouteRecord, onLayer: cityRouteOnLayer, onSummary: cityRouteOnSummary
  });
}
function cityRouteOnStation(i) {
  var R = CD && CD.route; if (!R) return;
  if (R.starting) { cityRouteOpen(i); return; }
  cityCloseSheet();   // terminó una estación: el flujo espera en "arrive" a que se toque el pad siguiente
  var lv = cId('city-live'); if (lv && R.msg) lv.textContent = R.msg;
}
function cityRouteOpen(i) {
  var sts = cityRouteStations(), st = sts[i], kp = st.kp[0];
  citySheetSet('<article class="qcard"><div class="chips"><span class="chip">' + esc('Estación ' + (i + 1) + ' de ' + sts.length + ' · ' + st.name) + '</span></div><h2 class="prompt">' + esc(st.name) + '</h2>' +
    '<p>' + fmt(mod(CD.scene).tById[kp.topic].keyPoints[kp.index]) + '</p><div class="actions"><button class="btn primary" data-act="cx" data-c="route-ask">Ver pregunta</button><button class="btn" data-act="cx" data-c="sheetclose">Cerrar</button></div></article>', '[data-c="route-ask"]');
}
function cityRouteOpts(item, picked) {
  return '<div class="opts" role="group" aria-label="Opciones de respuesta">' + item.labels.map(function (l, i) {
    var cls = 'opt' + (picked === null ? '' : (i === item.correct ? ' ok' : (i === picked ? ' bad' : ' dim')));
    return '<button class="' + cls + '" data-act="cx" data-c="ropt" data-k="' + i + '"' + (picked === null ? '' : ' disabled') + '><span class="key mono"><b class="kn">' + (i + 1) + '</b>' +
      ((picked !== null && i === item.correct) ? '<i class="mark" aria-hidden="true">✓</i><i class="sronly">respuesta correcta</i>' : ((picked !== null && i === picked) ? '<i class="mark" aria-hidden="true">✗</i><i class="sronly">tu respuesta</i>' : '')) + '</span><span>' + fmt(l) + '</span></button>';
  }).join('') + '</div>';
}
function cityRouteAsk(item) {
  citySheetSet('<article class="qcard"><div class="chips"><span class="chip">' + esc(KIND_LABEL[item.q.type]) + '</span></div><h2 class="prompt">' + fmt(item.q.prompt) + '</h2>' + cityRouteOpts(item, null) +
    '<div class="actions"><button class="btn" data-act="cx" data-c="sheetclose">Cerrar</button></div></article>', '.opt');
}
function cityRouteAnswer(k) {
  var R = CD && CD.route; if (!R || !R.flow || !R.active || R.flow.state().phase !== 'ask') return;
  R.flow.answer(k);
  var s = R.flow.state(), item = s.item, q = item.q, good = s.lastOk;
  citySheetSet('<article class="qcard"><div class="chips"><span class="chip">' + esc(KIND_LABEL[q.type]) + '</span></div><h2 class="prompt">' + fmt(q.prompt) + '</h2>' + cityRouteOpts(item, k) +
    '<div class="fb ' + (good ? 'good' : 'bad') + '" role="status"><strong><span class="fbt">' + (good ? 'Correcto' : 'Paquete perdido: retransmitiendo') + '</span></strong>' +
    (good ? '' : '<p>Respuesta correcta: <b>' + fmt(item.labels[item.correct]) + '</b></p>') + '<p>' + fmt(q.explanation) + '</p></div>' +
    '<div class="actions"><button class="btn primary" data-act="cx" data-c="route-next">Continuar</button></div></article>', '[data-c="route-next"]');
}
/* XP y registro de cada respuesta (igual que el viaje anterior) y acumulado de la visita para el resumen */
function cityRouteRecord(r) {
  touch();
  var base = r.ok ? xpBase(r.q, r.consec) : 0, gain = xpWithPassive(base);
  recordAnswer(r.q, r.ok, false, gain);
  checkVirtues(); save();
  var R = CD && CD.route;
  if (R && R.flow) {
    var i = R.flow.state().station, p = R.per[i] || (R.per[i] = { ok: 0, total: 0 });
    R.xp += gain; p.total++; if (r.ok) p.ok++;
    else if (!R.fails.some(function (f) { return f.id === r.q.id; })) R.fails.push(r.q);
  }
  return gain;
}
/* Terminó una estación: se guarda el avance, se enciende el tramo y se anuncia (la hoja se cierra en onStation o se reemplaza por el resumen) */
function cityRouteOnLayer() {
  var R = CD.route, sts = cityRouteStations(), i = R.flow.state().station, d = cityD(CD.scene).route;
  if (i + 1 > d.done) d.done = i + 1;
  save();
  R.active = false;
  if (CD.world && typeof CD.world.setRoute === 'function') CD.world.setRoute(d.done);
  R.msg = 'Estación ' + (i + 1) + ' completada.' + (sts[i + 1] ? ' Siguiente: ' + sts[i + 1].name + '.' : '') + (sts[i].layers ? ' Capas: ' + CITY_ROUTE_LAYERS.slice(0, sts[i].layers).join(' · ') + '.' : '');
  cityRouteHud();
}
function cityRouteOnSummary() {
  var R = CD.route, sts = cityRouteStations();
  var rows = sts.map(function (st, i) { var p = R.per[i]; return p ? '<li>' + esc(st.name + ': ' + p.ok + ' de ' + p.total) + '</li>' : ''; }).join('');
  citySheetSet('<article class="qcard"><div class="chips"><span class="chip">Resumen de la ruta</span></div><h2 class="prompt">Llegaste al servidor</h2><ul>' + rows + '</ul><p>' + esc('XP ganada: ') + '<b>' + R.xp + '</b></p>' +
    '<div class="actions"><button class="btn primary" data-act="cx" data-c="sheetclose">Terminar</button>' + (R.fails.length ? '<button class="btn" data-act="cx" data-c="route-replay">Repasar lo que fallé</button>' : '') + '</div></article>', '[data-c="sheetclose"]');
}
/* Se cerró la hoja a mitad de una estación: no cuenta, se descarta el flujo y se retoma desde done. Devuelve el aviso (o '' si no había nada a medias). */
function cityRouteAbort() {
  var R = CD && CD.route;
  if (!R || !R.active) return '';
  R.active = false; R.flow = null;
  return 'Retomarás en la estación ' + (cityRouteDone() + 1) + '.';
}
function cityRouteReplay() {
  var R = CD && CD.route; if (!R || !R.fails.length) return;
  var fails = shuffle(R.fails.slice());
  cityReleaseUi();
  startRound({ kind: 'replay', title: 'Repaso de fallos', mid: CD.scene, back: { name: 'city' } }, fails);
}
/* Recorrer otra vez: done vuelve a 0; XP, historial y criaturas vencidas no se tocan */
function cityRouteReset() {
  var d = CD && CD.scene !== 'plaza' ? cityD(CD.scene) : null;
  if (!d || !d.route || d.route.done < (cityRouteStations() || []).length) return;
  d.route.done = 0; CD.route = null; save();
  if (CD.world && typeof CD.world.setRoute === 'function') CD.world.setRoute(0);
  cityCloseSheet();
}
