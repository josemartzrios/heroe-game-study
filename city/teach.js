/* Lógica pura de enseñar escribiendo en Ciudad Núcleo: normaliza lo que escribe el jugador, detecta los términos que cubrió
   (puntos clave en «explicar», términos de la versión correcta en «corregir») y parte el texto en tramos para resaltarlo. Sin DOM.
   Todo texto del jugador se recorta a MAX_CHARS antes de procesarlo y no se usa la normalización de compatibilidad (su expansión colgaba el fuzzing). */
var CityTeach = (function () {
  var MAX_CHARS = 2000, MIN_WORDS_EXPLAIN = 12, MIN_WORDS_FIX = 6, PASS_POINTS = 3;
  /* palabras vacías: artículos, preposiciones, conectores y auxiliares; «reves», «version», «correcta» y «error» salen del enunciado de «corregir» */
  var STOP = ('a al algo ante antes asi aun bajo bien cada como con contra cual cuando de del desde donde dos e el ella ellas ello ellos en entre era es esa ese eso esta este esto estos estas ' +
    'fue ha hace hay la las le les lo los mas me mi mismo misma muy nada ni no nos o otra otro otros para pero poco por porque que quien se sea segun ser si sin sino sobre solo son su sus tambien tan tanto te ' +
    'tiene tienen todo todos tu un una uno unos unas usa y ya reves version correcta error realidad decir puede pueden').split(' ');
  var STOPSET = Object.create(null);
  STOP.forEach(function (w) { STOPSET[w] = true; });
  var INVIS = /[­؜᠎​-‏‪-‮⁠-⁩﻿]/;
  var COMB = /[̀-ͯ]/g, TOK = /[a-z0-9]+(?:[.,][0-9]+)*/g;
  var CAN_NFD = typeof String.prototype.normalize === 'function';

  function isNum(t) { return /^[0-9]/.test(t); }
  function isStop(t) { return STOPSET[t] === true; }

  /* Plega el texto carácter a carácter: n es el texto normalizado (minúsculas, sin acentos ni invisibles) y owner[i] el carácter del original
     que produjo n[i]. norm y marks usan este mismo plegado, así que lo que se resalta es exactamente lo que se cuenta. */
  function fold(raw) {
    var s = raw == null ? '' : String(raw), n = '', owner = [], produced = [], i, k, c;
    if (s.length > MAX_CHARS) s = s.slice(0, MAX_CHARS);
    for (i = 0; i < s.length; i++) {
      c = s.charAt(i);
      produced.push(false);
      if (INVIS.test(c)) continue;
      if (CAN_NFD) c = c.normalize('NFD');
      c = c.replace(COMB, '').toLowerCase();
      for (k = 0; k < c.length; k++) { n += c.charAt(k); owner.push(i); produced[i] = true; }
    }
    return { s: s, n: n, owner: owner, produced: produced };
  }
  /* Palabras del texto: minúsculas, sin acentos; los números con puntos (255.255.255.255, 1,5) quedan enteros */
  function norm(s) { return fold(s).n.match(TOK) || []; }

  /* Dos palabras casan si son iguales, una es la otra con «s»/«es», o ambas tienen 6+ letras y comparten las 6 primeras. Los números solo casan si son iguales. */
  function same(a, b) {
    if (a === b) return true;
    if (isNum(a) || isNum(b)) return false;
    if (a === b + 's' || a === b + 'es' || b === a + 's' || b === a + 'es') return true;
    return a.length >= 6 && b.length >= 6 && a.slice(0, 6) === b.slice(0, 6);
  }
  function has(toks, t) { return toks.some(function (x) { return same(x, t); }); }

  /* Términos de un punto clave: los fragmentos **…** (sin los que son solo palabras vacías). Cada uno es la lista de sus tokens significativos
     (números y palabras de 3+ letras que no son vacías); si no tiene ninguno pero sí tokens (C, IP, 5G), valen sus tokens enteros. */
  function keyTerms(kp) {
    var re = /\*\*(.+?)\*\*/g, m, out = [];
    if (typeof kp !== 'string') return out;
    while ((m = re.exec(kp)) !== null) {
      var tk = norm(m[1]);
      if (!tk.length || tk.every(isStop)) continue;
      var sig = tk.filter(function (t) { return isNum(t) || (t.length >= 3 && !isStop(t)); });
      out.push(sig.length ? sig : tk);
    }
    return out;
  }
  /* Alineado con keyPoints: un punto se detecta si aparece alguno de sus términos (todos sus tokens significativos); sin términos, nunca */
  function explainCheck(text, keyPoints) {
    var tt = norm(text);
    return (Array.isArray(keyPoints) ? keyPoints : []).map(function (kp) {
      return tt.length > 0 && keyTerms(kp).some(function (sig) { return sig.every(function (t) { return has(tt, t); }); });
    });
  }

  /* Pregunta error del HTML → {wrong, right, explanation}; null si está mal formada */
  function fixItem(q) {
    if (!q || typeof q !== 'object' || typeof q.prompt !== 'string' || !Array.isArray(q.options)) return null;
    var a = q.answer;
    if (typeof a !== 'number' || a % 1 !== 0 || typeof q.options[a] !== 'string') return null;
    var i = q.prompt.indexOf('“'), j = q.prompt.lastIndexOf('”');
    return {
      wrong: (i >= 0 && j > i) ? q.prompt.slice(i + 1, j) : '',
      right: q.options[a],
      explanation: typeof q.explanation === 'string' ? q.explanation.replace(/^Versión correcta:\s*/, '') : ''
    };
  }
  /* Siglas del texto original: 2 a 4 mayúsculas seguidas, sin letras ni dígitos pegados (CPU, RAM, DNS) */
  function siglas(raw) {
    var re = /(^|[^A-Za-z0-9ÁÉÍÓÚÑáéíóúñ])([A-ZÁÉÍÓÚÑ]{2,4})(?![A-Za-z0-9ÁÉÍÓÚÑáéíóúñ])/g, m, out = [], s = String(raw == null ? '' : raw).slice(0, MAX_CHARS);
    while ((m = re.exec(s)) !== null) out.push(norm(m[2])[0]);
    return out;
  }
  /* Palabras que el jugador debe cubrir al corregir: de la versión correcta y su explicación, números, palabras de 5+ letras no vacías y siglas,
     sin las que ya estaban en la frase equivocada y sin repetidos */
  function fixTerms(item) {
    var wrong = norm(item.wrong), out = [];
    [item.right, item.explanation].forEach(function (src) {
      var sg = siglas(src);
      norm(src).forEach(function (t) {
        var good = isNum(t) || (t.length >= 5 && !isStop(t)) || sg.indexOf(t) >= 0;
        if (good && !has(wrong, t) && !has(out, t)) out.push(t);
      });
    });
    return out;
  }
  /* Se detecta si hay términos y el jugador cubrió al menos un tercio */
  function fixCheck(text, item) {
    var terms = fixTerms(item), tt = norm(text);
    var found = terms.filter(function (t) { return has(tt, t); });
    return { terms: terms, found: found, detected: terms.length > 0 && found.length >= Math.ceil(terms.length / 3) };
  }

  /* Parte el texto (recortado) en tramos [{t, hit}] que unidos lo reproducen; hit marca las palabras que casan con found.
     La vista solo hace esc(t) y envuelve los tramos marcados: nunca RegExp ni replace sobre HTML. */
  function marks(raw, found) {
    var f = fold(raw), out = [], pos = 0, m, a, b, list = Array.isArray(found) ? found : [];
    TOK.lastIndex = 0;
    while ((m = TOK.exec(f.n)) !== null) {
      a = f.owner[m.index];
      b = f.owner[m.index + m[0].length - 1] + 1;
      while (b < f.s.length && !f.produced[b]) b++;
      if (a > pos) out.push({ t: f.s.slice(pos, a), hit: false });
      out.push({ t: f.s.slice(a, b), hit: list.some(function (x) { return same(m[0], x); }) });
      pos = b;
    }
    if (pos < f.s.length) out.push({ t: f.s.slice(pos), hit: false });
    return out;
  }

  return {
    MAX_CHARS: MAX_CHARS, MIN_WORDS_EXPLAIN: MIN_WORDS_EXPLAIN, MIN_WORDS_FIX: MIN_WORDS_FIX, PASS_POINTS: PASS_POINTS, STOP: STOP,
    norm: norm, same: same, keyTerms: keyTerms, explainCheck: explainCheck, fixItem: fixItem, fixTerms: fixTerms, fixCheck: fixCheck, marks: marks
  };
})();
if (typeof module !== 'undefined' && module.exports) module.exports = CityTeach;
