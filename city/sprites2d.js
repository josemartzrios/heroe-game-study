/* Sprites 2D de Ciudad Núcleo: pixel art neón generado por código, un atlas (un canvas) por tipo, cuadros de 14×14 px.
   Sin imágenes externas. Las variantes salen solo de CITY_DATA (nunca del guardado): 'iris' y 'mid:id' para cada mentor, aprendiz y criatura
   de cada distrito, porque un id (m01) se repite entre distritos. El distrito de referencia (D.order[0]) conserva su aspecto; los demás tienen el suyo:
   sus criaturas se tiñen con colors.a/colors.b del distrito (un distrito sin colores válidos usa el aspecto de referencia). */
var CitySprites = (function () {
  var CELL = 14, FACES = ['up', 'down', 'left', 'right'];
  /* listas de variantes (se rellenan en setData; las arrays son siempre las mismas para que `kinds` no quede viejo) */
  var PERSON = ['iris'], CREATURE = [], THING = ['repair', 'repaired', 'lamp', 'lampOn', 'ask'];
  var LOOK = ['iris'], STYLE = [], TINT = [], FIRST = { mentor: '', apprentice: '', creature: '' };
  var KINDS = { hero: [''], person: PERSON, creature: CREATURE, thing: THING };
  var SUIT = ['#3d7ad8', '#e0533a', '#3aa36b', '#9b5fd8', '#f2c14e', '#6bb6d6'], SKIN = ['#f1c9a5', '#d9a273', '#a86f46', '#7b4a2d'];
  var doc = null, atlas = {}, data = null;

  function init(d) { if (d !== doc) { doc = d; atlas = {}; } }
  function hexOk(c) { return typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c); }   // mismo formato que R11 (city/check_district.mjs)
  function arr(x) { return Array.isArray(x) ? x : []; }
  function fill(list, items) { list.length = 0; for (var i = 0; i < items.length; i++) list.push(items[i]); }
  /* Genera las variantes desde CITY_DATA. Con los mismos datos no hace nada (los atlas siguen valiendo); con otros los descarta.
     Se arma todo en listas nuevas y se copia al final: un distrito mal formado (null, listas que no son arrays, ids ausentes) no deja nada a medias.
     La referencia es el primer id de D.order que es un distrito (o el primer distrito si no hay ninguno); los íconos de inicio salen de ella. */
  function setData(D) {
    if (D === data) return;
    var dist = D && D.districts && typeof D.districts === 'object' ? D.districts : {};
    var mids = Object.keys(dist).filter(function (m) { return !!dist[m] && typeof dist[m] === 'object'; });
    var order = D && Array.isArray(D.order) ? D.order : [], ref = null, i, k = 0;
    for (i = 0; i < order.length && ref === null; i++) if (mids.indexOf(order[i]) >= 0) ref = order[i];
    if (ref === null && mids.length) ref = mids[0];
    var P = ['iris'], L = ['iris'], C = [], ST = [], TI = [], any = { mentor: '', apprentice: '', creature: '' }, fromRef = { mentor: '', apprentice: '', creature: '' };
    function first(kind, v, isRef) { if (!any[kind]) any[kind] = v; if (isRef && !fromRef[kind]) fromRef[kind] = v; }
    mids.forEach(function (mid) {
      var M = dist[mid], isRef = mid === ref, off = isRef ? 0 : 3 * (++k), col = M.colors;   // 6 formas: cada distrito no-referencia rota 3
      var tint = !isRef && col && hexOk(col.a) && hexOk(col.b) ? [col.a, col.b] : null;
      function add(list, kind) { arr(list).forEach(function (o) { var id = String(o && o.id), v = mid + ':' + id; P.push(v); L.push(isRef ? id : v); first(kind, v, isRef); }); }
      add(M.mentors, 'mentor');
      add(M.apprentices, 'apprentice');
      arr(M.creatures).forEach(function (c, ci) { var v = mid + ':' + String(c && c.id); C.push(v); ST.push((ci + off) % 6); TI.push(tint); first('creature', v, isRef); });
    });
    fill(PERSON, P); fill(LOOK, L); fill(CREATURE, C); fill(STYLE, ST); fill(TINT, TI);
    FIRST.mentor = fromRef.mentor || any.mentor; FIRST.apprentice = fromRef.apprentice || any.apprentice; FIRST.creature = fromRef.creature || any.creature;
    atlas = {}; data = D;
  }
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; }
  function idx(list, v) { var i = list.indexOf(v); return i < 0 ? 0 : i; }
  function px(g, c, x, y, w, h) { g.fillStyle = c; g.fillRect(x, y, w, h); }

  /* persona: face 0 up (espalda), 1 down (frente), 2 left, 3 right; step 0/1 mueve las piernas */
  function person(g, ox, oy, face, step, suit, skin, hair, accent) {
    var lf = step ? 1 : 0;
    px(g, 'rgba(0,0,0,0.30)', ox + 3, oy + 12, 8, 2);
    px(g, '#2b3158', ox + 4, oy + 10 + lf, 2, 3 - lf); px(g, '#2b3158', ox + 8, oy + 10 + (1 - lf), 2, 3 - (1 - lf));
    px(g, suit, ox + 3, oy + 6, 8, 5); px(g, accent, ox + 3, oy + 6, 8, 1);
    px(g, skin, ox + 2, oy + 7, 1, 3); px(g, skin, ox + 11, oy + 7, 1, 3);
    px(g, skin, ox + 4, oy + 1, 6, 5);
    if (face === 0) px(g, hair, ox + 4, oy + 1, 6, 4);
    else { px(g, hair, ox + 4, oy + 1, 6, 2); if (face === 1) { px(g, '#12162e', ox + 5, oy + 4, 1, 1); px(g, '#12162e', ox + 8, oy + 4, 1, 1); } else if (face === 2) { px(g, '#12162e', ox + 5, oy + 4, 1, 1); px(g, hair, ox + 9, oy + 2, 1, 3); } else { px(g, '#12162e', ox + 8, oy + 4, 1, 1); px(g, hair, ox + 4, oy + 2, 1, 3); } }
  }
  function hero(g, ox, oy, face, step) { person(g, ox, oy, face, step, '#5ce1ff', '#f1c9a5', '#3b2a20', '#ff4fd8'); px(g, '#ffffff', ox + 6, oy + 7, 2, 1); }
  function personV(g, ox, oy, face, step, id) {
    var h = hash(id), isIris = id === 'iris';
    person(g, ox, oy, face, step, isIris ? '#ffd23f' : SUIT[h % 6], SKIN[(h >>> 3) % 4], isIris ? '#e8ecff' : ['#3b2a20', '#1f1a17', '#6b4423', '#b9772f'][(h >>> 5) % 4], isIris ? '#ff4fd8' : '#12162e');
  }
  /* tint: null = aspecto de referencia (paleta morada, marca #3a2470, ojos amarillos); [a, b] = cuerpo a, rasgos oscuros, 2 px de acento b y ojos blancos */
  function creature(g, ox, oy, step, i, tint) {
    var body = tint ? tint[0] : ['#7a52c4', '#b06cff', '#5a3a9a', '#9a4fd8', '#8a5fe0', '#6a3fb0'][i], dk = tint ? '#12162e' : '#3a2470', y = step ? 1 : 0;
    px(g, 'rgba(0,0,0,0.30)', ox + 2, oy + 12, 10, 2);
    px(g, body, ox + 2, oy + 4 + y, 10, 7); px(g, body, ox + 3, oy + 3 + y, 8, 1);
    if (i === 0) { px(g, dk, ox + 3, oy + 1 + y, 2, 3); px(g, dk, ox + 9, oy + 1 + y, 2, 3); }
    else if (i === 1) { px(g, dk, ox + 6, oy + y, 2, 4); px(g, dk, ox + 2, oy + 7 + y, 10, 1); }
    else if (i === 2) { px(g, dk, ox + 2, oy + 2 + y, 3, 2); px(g, dk, ox + 9, oy + 2 + y, 3, 2); px(g, dk, ox + 5, oy + y, 4, 2); }
    else if (i === 3) { px(g, dk, ox + 1, oy + 6 + y, 1, 3); px(g, dk, ox + 12, oy + 6 + y, 1, 3); px(g, dk, ox + 4, oy + 2 + y, 6, 1); }
    else if (i === 4) { px(g, dk, ox + 4, oy + 11, 2, 2); px(g, dk, ox + 8, oy + 11, 2, 2); px(g, dk, ox + 6, oy + 2 + y, 2, 2); }
    else { px(g, dk, ox + 3, oy + 2 + y, 8, 1); px(g, dk, ox + 3, oy + 10 + y, 8, 1); }
    var eye = tint ? '#ffffff' : '#ffd23f';
    px(g, eye, ox + 4, oy + 6 + y, 2, 2); px(g, eye, ox + 8, oy + 6 + y, 2, 2); px(g, '#12162e', ox + 5, oy + 7 + y, 1, 1); px(g, '#12162e', ox + 9, oy + 7 + y, 1, 1);
    if (tint) px(g, tint[1], ox + 6, oy + 4 + y, 2, 1);
  }
  function thing(g, ox, oy, id) {
    if (id === 'repair') { px(g, '#4a4f6e', ox + 3, oy + 5, 8, 7); px(g, '#ff8f3a', ox + 4, oy + 6, 6, 3); px(g, '#ffd76a', ox + 2, oy + 3, 1, 1); px(g, '#ffd76a', ox + 11, oy + 2, 1, 1); px(g, '#ff8f3a', ox + 6, oy + 1, 1, 2); }
    else if (id === 'repaired') { px(g, '#4a4f6e', ox + 3, oy + 5, 8, 7); px(g, '#7dff8a', ox + 4, oy + 6, 6, 3); px(g, '#7dff8a', ox + 6, oy + 2, 2, 2); }
    else if (id === 'lamp') { px(g, '#4a4f6e', ox + 6, oy + 4, 2, 9); px(g, '#3a3f55', ox + 4, oy + 1, 6, 4); }
    else if (id === 'lampOn') { px(g, '#4a4f6e', ox + 6, oy + 4, 2, 9); px(g, '#ffe066', ox + 4, oy + 1, 6, 4); px(g, '#fff6b0', ox + 6, oy + 2, 2, 2); }
    else { px(g, '#ffd76a', ox + 5, oy + 1, 4, 2); px(g, '#ffd76a', ox + 8, oy + 3, 2, 3); px(g, '#ffd76a', ox + 6, oy + 6, 2, 2); px(g, '#ffd76a', ox + 6, oy + 10, 2, 2); }
  }

  function build(kind) {
    var list = KINDS[kind], cols, rows, cv, g, v, f, s;
    if (kind === 'hero' || kind === 'person') { cols = 8; rows = list.length; }
    else if (kind === 'creature') { cols = 2; rows = Math.max(1, list.length); }
    else { cols = list.length; rows = 1; }
    cv = doc.createElement('canvas'); cv.width = cols * CELL; cv.height = rows * CELL;
    g = cv.getContext('2d');
    if (!g) throw new Error('sin-2d');
    for (v = 0; v < list.length; v++) {
      if (kind === 'hero') for (f = 0; f < 4; f++) for (s = 0; s < 2; s++) hero(g, (f * 2 + s) * CELL, 0, f, s);
      else if (kind === 'person') for (f = 0; f < 4; f++) for (s = 0; s < 2; s++) personV(g, (f * 2 + s) * CELL, v * CELL, f, s, LOOK[v]);
      else if (kind === 'creature') for (s = 0; s < 2; s++) creature(g, s * CELL, v * CELL, s, STYLE[v], TINT[v]);
      else thing(g, v * CELL, 0, list[v]);
    }
    return cv;
  }

  /* → { img, sx, sy, w, h }; kind/variant/face/step desconocidos caen al primero */
  function frame(kind, variant, face, step) {
    if (!KINDS.hasOwnProperty(kind)) kind = 'hero';
    if (!atlas[kind]) atlas[kind] = build(kind);
    var list = KINDS[kind], v = idx(list, variant), f = Math.max(0, FACES.indexOf(face)), s = step === 1 ? 1 : 0, sx, sy;
    if (kind === 'hero') { sx = (f * 2 + s) * CELL; sy = 0; }
    else if (kind === 'person') { sx = (f * 2 + s) * CELL; sy = v * CELL; }
    else if (kind === 'creature') { sx = s * CELL; sy = v * CELL; }
    else { sx = v * CELL; sy = 0; }
    return { img: atlas[kind], sx: sx, sy: sy, w: CELL, h: CELL };
  }

  /* Pinta cada canvas[data-spr] de root (hero, mentor, creature o apprentice) con su personaje de frente, sin suavizado. */
  function iconOf(name) {
    if (name === 'hero') return ['hero', ''];
    if (name === 'mentor') return ['person', FIRST.mentor];
    if (name === 'apprentice') return ['person', FIRST.apprentice];
    if (name === 'creature') return ['creature', FIRST.creature];
    return null;
  }
  function paintIcons(root) {
    if (!root || !root.querySelectorAll) return;
    var list = root.querySelectorAll('canvas[data-spr]'), i, cv, g, r, ic;
    for (i = 0; i < list.length; i++) {
      cv = list[i]; g = null;
      ic = iconOf(cv.getAttribute ? cv.getAttribute('data-spr') : null);
      if (!ic) continue;
      try { g = cv.getContext('2d'); } catch (e) {}
      if (!g) continue;
      try {
        r = frame(ic[0], ic[1], 'down', 0);
        g.imageSmoothingEnabled = false;
        g.clearRect(0, 0, cv.width, cv.height);
        g.drawImage(r.img, r.sx, r.sy, r.w, r.h, 0, 0, cv.width, cv.height);
      } catch (e) { /* sin 2D los iconos quedan vacíos: el nombre y el nivel siguen en texto */ }
    }
  }

  if (typeof document !== 'undefined') init(document);
  if (typeof CITY_DATA !== 'undefined') setData(CITY_DATA);   // en el navegador los datos ya están en el mismo ámbito
  return { init: init, setData: setData, frame: frame, paintIcons: paintIcons, kinds: KINDS, CELL: CELL };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = CitySprites;
