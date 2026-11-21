// Pruebas de city/teach.js (CityTeach, lógica pura): norm, same, keyTerms, explainCheck, fixItem, fixTerms, fixCheck, marks y STOP,
// con propiedades de fast-check y una comprobación del orden dentro del HTML generado.
const fs = require('fs');
const path = require('path');
const fc = require('fast-check');
const results = [];
const ok = (name, cond, extra) => { results.push([cond ? 'PASS' : 'FAIL', name, extra || '']); };
const J = JSON.stringify;

const SRC = path.join(__dirname, '..', 'city', 'teach.js');
const T = require('../city/teach.js');
const STOP_LITERAL = 'a al algo ante antes asi aun bajo bien cada como con contra cual cuando de del desde donde dos e el ella ellas ello ellos en entre era es esa ese eso esta este esto estos estas fue ha hace hay la las le les lo los mas me mi mismo misma muy nada ni no nos o otra otro otros para pero poco por porque que quien se sea segun ser si sin sino sobre solo son su sus tambien tan tanto te tiene tienen todo todos tu un una uno unos unas usa y ya reves version correcta error realidad decir puede pueden';
const RUNS = { numRuns: 1000 };
// texto con letras acentuadas, números con punto, signos e invisibles
const textArb = fc.array(fc.constantFrom('a', 'e', 'c', 'p', 'u', 'á', 'é', 'ñ', 'Á', 'CPU', 'red', 'es', 's', '1', '255', '.', ',', ' ', '  ', '\n', '​', '⁦', '­', '`', '*', '“', '”', '-'), { maxLength: 40 }).map((a) => a.join(''));

// ---- norm ----
ok('norm: acentos, mayúsculas, números con puntos y siglas con dígitos', J(T.norm('Árbol  BITS, 255.255.255.255 y 5G')) === J(['arbol', 'bits', '255.255.255.255', 'y', '5g']), J(T.norm('Árbol  BITS, 255.255.255.255 y 5G')));
ok('norm: los invisibles (U+200B, aislante bidi U+2066, guion blando U+00AD) no parten la palabra', ['esca​lable', 'esca⁦lable', 'esca­lable'].every((s) => J(T.norm(s)) === J(['escalable'])));
ok('norm(null) y norm(undefined) dan []', J(T.norm(null)) === '[]' && J(T.norm(undefined)) === '[]');
ok('norm recorta a 2000 antes de todo', T.norm('x'.repeat(5000)).join('').length === 2000 && T.norm('a'.repeat(1999) + ' cpu').indexOf('cpu') < 0);
ok('norm no usa NFKC (ni \\p ni la bandera u en el código)', T.norm('ﬁ').join('') !== 'fi' && !/NFKC|\\p\{/.test(fs.readFileSync(SRC, 'utf8')));
{ const big = 'ﷺ'.repeat(1 << 20), t0 = Date.now(); T.norm(big); const ms = Date.now() - t0;
  ok('norm de 1 MB de ﷺ tarda menos de 200 ms', ms < 200, ms + ' ms'); }
{ let bad = 0; fc.assert(fc.property(textArb, (s) => { const a = T.norm(s); if (J(T.norm(a.join(' '))) !== J(a)) bad++; return true; }), RUNS);
  ok('norm es idempotente (1000 ejecuciones)', bad === 0, 'violaciones=' + bad); }

// ---- same ----
ok('same casa plurales, derivadas y números iguales', [['servidor', 'servidores'], ['clientes', 'cliente'], ['bit', 'bits'], ['cpu', 'cpus'], ['modular', 'modularidad'], ['asociado', 'asociacion'], ['255', '255']].every(([a, b]) => T.same(a, b)));
ok('same no casa números distintos ni palabras distintas', [['255', '255.255'], ['red', 'rojo'], ['servidor', 'servicio']].every(([a, b]) => !T.same(a, b)));
{ let bad = 0; fc.assert(fc.property(fc.stringMatching(/^[a-z0-9]{0,9}$/), fc.stringMatching(/^[a-z0-9]{0,9}$/), (a, b) => { if (T.same(a, b) !== T.same(b, a)) bad++; return true; }), RUNS);
  ok('same es simétrica (1000 ejecuciones)', bad === 0, 'violaciones=' + bad); }

// ---- keyTerms ----
ok('keyTerms descarta el término vacuo «es un» y rescata las siglas', J(T.keyTerms('**es un** y **IP** y **C++**')) === J([['ip'], ['c']]), J(T.keyTerms('**es un** y **IP** y **C++**')));
ok('keyTerms de un punto sin negritas es []', J(T.keyTerms('sin negritas')) === '[]');

// ---- explainCheck ----
{ const kps = ['**Latencia:** tiempo', 'usa **CDN** y **caché**'];
  ok('explainCheck: vacío y basura no detectan nada', J(T.explainCheck('', kps)) === J([false, false]) && J(T.explainCheck('patata cosa nada', kps)) === J([false, false]));
  ok('explainCheck: detecta por término con otras palabras alrededor', J(T.explainCheck('la latencia baja con un cdn', kps)) === J([true, true]), J(T.explainCheck('la latencia baja con un cdn', kps)));
  ok('explainCheck: un punto sin negritas siempre da false', J(T.explainCheck('todo lo que sea', ['sin negritas'])) === J([false])); }
ok('explainCheck: «constructor toString» detecta **Constructor**; «hola» no detecta **Constructor** ni **__proto__** (sin contaminar el prototipo)', J(T.explainCheck('constructor toString', ['**Constructor** x'])) === J([true]) && J(T.explainCheck('hola', ['**Constructor** x', '**__proto__**'])) === J([false, false]));

// ---- fixItem ----
{ const q = { prompt: 'Este fragmento contiene un error:\n“A es B.”\n¿Cuál es el error?', options: ['x', 'A es C'], answer: 1, explanation: 'Versión correcta: A es C.' };
  ok('fixItem extrae wrong, right y explanation', J(T.fixItem(q)) === J({ wrong: 'A es B.', right: 'A es C', explanation: 'A es C.' }), J(T.fixItem(q)));
  ok('fixItem usa la última ” (un wrong con ” interior se conserva entero)', T.fixItem(Object.assign({}, q, { prompt: 'x\n“A ”dice” B.”\n¿?' })).wrong === 'A ”dice” B.');
  ok('fixItem sin comillas deja wrong vacío', T.fixItem(Object.assign({}, q, { prompt: 'sin comillas' })).wrong === '');
  ok('fixItem con preguntas mal formadas da null sin lanzar', [{}, null, { prompt: 'x', options: 'y', answer: 0 }, { prompt: 'x', options: ['a'], answer: 3 }, { prompt: 5, options: ['a'], answer: 0 }].every((x) => { try { return T.fixItem(x) === null; } catch (e) { return false; } })); }

// ---- fixTerms y fixCheck ----
{ const it = { wrong: 'Es prioridad en la RAM', right: 'Es prioridad en el uso de CPU', explanation: '' }, ts = T.fixTerms(it);
  ok('fixTerms: la sigla CPU entra y «prioridad» (ya en wrong) no', ts.indexOf('cpu') >= 0 && ts.indexOf('prioridad') < 0, J(ts)); }
ok('fixTerms: la sigla se detecta junto a letras acentuadas y «CPUs» no es sigla', T.fixTerms({ wrong: '', right: 'Usa ÁRBOL y DNS', explanation: '' }).indexOf('dns') >= 0 && T.fixTerms({ wrong: '', right: 'Usa CPUs', explanation: '' }).indexOf('cpus') < 0);
ok('fixTerms no repite términos que casan entre sí', T.fixTerms({ wrong: '', right: 'servidor servidores', explanation: '' }).length === 1, J(T.fixTerms({ wrong: '', right: 'servidor servidores', explanation: '' })));
ok('fixCheck sin términos nunca detecta', T.fixCheck('lo que sea', { wrong: 'a b', right: 'a b', explanation: '' }).detected === false);
{ const it3 = { wrong: '', right: 'alfa1 bravo1 charly1', explanation: '' }, it4 = { wrong: '', right: 'alfa1 bravo1 charly1 delta1', explanation: '' };
  ok('fixCheck: con 3 términos basta 1; con 4 hacen falta 2', T.fixCheck('alfa1', it3).detected && !T.fixCheck('alfa1', it4).detected && T.fixCheck('alfa1 bravo1', it4).detected, J([T.fixTerms(it3), T.fixTerms(it4)])); }
{ let bad = 0; const w = fc.record({ wrong: textArb, right: textArb, explanation: textArb });
  fc.assert(fc.property(w, (it) => { if (T.fixCheck(it.wrong, it).detected) bad++; return true; }), RUNS);
  ok('fixCheck(wrong) nunca sale detectado (1000 ejecuciones)', bad === 0, 'violaciones=' + bad); }

// ---- marks ----
ok('marks reproduce el texto y marca CPU', T.marks('Hola, CPU!', ['cpu']).map((x) => x.t).join('') === 'Hola, CPU!' && T.marks('Hola, CPU!', ['cpu']).some((x) => x.t === 'CPU' && x.hit === true));
{ const m = T.marks('el satélite inalámbrico', ['inalambrico']);
  ok('marks no parte una palabra por el acento', m.filter((x) => x.hit).length === 1 && m.filter((x) => x.hit)[0].t === 'inalámbrico', J(m)); }
ok('marks marca la palabra con un invisible dentro', T.marks('esca​lable', ['escalable']).filter((x) => x.hit).map((x) => x.t).join('') === 'esca​lable');
{ const raw = 'x '.repeat(1000) + 'escalable', m = T.marks(raw, ['escalable']);
  ok('marks recorta a 2000 y no marca lo que norm no cuenta', m.map((x) => x.t).join('').length === 2000 && !m.some((x) => x.hit)); }
{ let bad = 0, bad2 = 0; const found = ['cpu', 'red', 'inalambrico', '255.255'];
  fc.assert(fc.property(textArb, (raw) => {
    const m = T.marks(raw, found);
    if (m.map((x) => x.t).join('') !== raw.slice(0, 2000)) bad++;
    const should = T.norm(raw).some((t) => found.some((f) => T.same(t, f)));
    if (m.some((x) => x.hit) !== should) bad2++;
    return true;
  }), RUNS);
  ok('marks: unir los tramos reproduce el original recortado (1000 ejecuciones)', bad === 0, 'violaciones=' + bad);
  ok('marks: hay un tramo resaltado ⇔ norm(raw) casa con found (1000 ejecuciones)', bad2 === 0, 'violaciones=' + bad2); }

// ---- STOP y constantes ----
ok('STOP coincide con la lista del plan, sin repetidos, con «reves» y sin «verdad»', T.STOP.join(' ') === STOP_LITERAL && new Set(T.STOP).size === T.STOP.length && T.STOP.indexOf('reves') >= 0 && T.STOP.indexOf('verdad') < 0);
ok('constantes del spec', T.MAX_CHARS === 2000 && T.MIN_WORDS_EXPLAIN === 12 && T.MIN_WORDS_FIX === 6 && T.PASS_POINTS === 3);

// ---- build: CityTeach va antes que la vista ----
{ const html = fs.readFileSync(path.join(__dirname, '..', 'juego_estudio.html'), 'utf8'), i = html.indexOf('var CityTeach'), v = html.indexOf('function cityRotateCheck');
  ok('el HTML generado define CityTeach antes de la vista', i > 0 && v > i, 'CityTeach=' + i + ' vista=' + v); }

results.forEach((r) => console.log(r.join(' | ')));
const fails = results.filter((r) => r[0] === 'FAIL').length;
console.log(fails ? `\n${fails} FALLOS` : '\nCITY_TEACH OK (' + results.length + ' comprobaciones)');
process.exit(fails ? 1 : 0);
