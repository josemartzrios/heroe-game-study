// Prueba de los helpers de pruebas: tests/district_rules.cjs (regla de nombres, colores propios, repetidos) y tests/modules.cjs (contra build.mjs).
const fs = require('fs');
const path = require('path');
const R = require('./district_rules.cjs');
const MODULES = require('./modules.cjs');
const results = [];
const ok = (name, cond, extra) => results.push([cond ? 'PASS' : 'FAIL', name, cond ? '' : (extra || '')]);

// namesNear: parecidos
for (const [a, b] of [['Ana', 'Hana'], ['Javi', 'Xavier'], ['Gil', 'Gilda'], ['Óscar', 'Oscar'], ['Cecilia', 'Sesilia'], ['Gerardo', 'Jerardo'], ['Estrella', 'Estreya'], ['Kevin', 'Quevin']])
  ok(`namesNear('${a}','${b}') es verdadero`, R.namesNear(a, b) && R.namesNear(b, a), R.phon(a) + ' / ' + R.phon(b));
// namesNear: distintos
for (const [a, b] of [['Ana', 'Ada'], ['Sol', 'Saúl'], ['Guido', 'Jido'], ['Chema', 'Kema'], ['Dora', 'Doris'], ['Abel', 'Abril']])
  ok(`namesNear('${a}','${b}') es falso`, !R.namesNear(a, b) && !R.namesNear(b, a), R.phon(a) + ' / ' + R.phon(b));
ok('phon: gue/gui conservan /g/ y ge/gi suenan /j/', R.phon('Miguel') === 'migel' && R.phon('Gil') === 'jil' && R.phon('Guido') === 'gido', [R.phon('Miguel'), R.phon('Gil'), R.phon('Guido')].join());
ok('phon: letras repetidas, h muda, qu y ch', R.phon('Aaron') === 'aron' && R.phon('Hugo') === 'ugo' && R.phon('Quique') === 'kike' && R.phon('Chema') === 'chema', [R.phon('Aaron'), R.phon('Hugo'), R.phon('Quique'), R.phon('Chema')].join());

// namesNear: los caracteres invisibles y el ancho completo no esconden un nombre
for (const [a, b] of [['Ana', 'A\u200Bna'], ['Ana', 'A\u00ADna'], ['Ana', 'Ａｎａ'], ['Ana', 'An\uFEFFa']])
  ok(`namesNear('${a}', ${JSON.stringify(b)}) es verdadero`, R.namesNear(a, b) && R.namesNear(b, a), R.phon(a) + ' / ' + R.phon(b));

// nameClashes
const P = (...names) => names.map((name) => ({ name }));
const D = (id, mentors, apprentices, colors, seed, name) => [id, { mentors: P(...mentors), apprentices: P(...apprentices), colors: colors || { a: '#111111', b: '#222222' }, seed: seed || 1, name: name || id }];
const dist = (...ds) => Object.fromEntries(ds);
ok('nameClashes: sin choques no devuelve nada', R.nameClashes(dist(D('A', ['Abel', 'Bea'], ['Coco']), D('B', ['Dora', 'Ernesto'], ['Fede']))).length === 0);
ok('nameClashes: no reporta las excepciones heredadas (Carla/Karla, Elena/Helena), en cualquier orden',
  R.nameClashes(dist(D('A', ['Carla', 'Elena'], []), D('B', ['Helena'], ['Karla']))).length === 0, R.nameClashes(dist(D('A', ['Carla', 'Elena'], []), D('B', ['Helena'], ['Karla']))).join());
ok('nameClashes: sí reporta un nombre de 2 letras', R.nameClashes(dist(D('A', ['Al', 'Bea'], []))).some((x) => /Al\(A\) tiene menos de 3 letras/.test(x)));
ok('nameClashes: reporta el mismo nombre en dos distritos y sin importar acentos', R.nameClashes(dist(D('A', ['Óscar'], []), D('B', ['Oscar'], []))).length === 1);
ok('nameClashes: reporta homófonos entre distritos y dentro de uno', R.nameClashes(dist(D('A', ['Ana', 'Hana'], []), D('B', ['Javi'], ['Xavier']))).length === 2);
ok('nameClashes: Carla con otro Karla distinto (no heredado) sí se reporta', R.nameClashes(dist(D('A', ['Carla'], []), D('B', ['Karlos'], []))).length === 1);

// colores propios, seeds y nombres de distrito
ok('ownColorProblems: un distrito con los dos colores de otros se reporta', R.ownColorProblems(dist(
  D('A', [], [], { a: '#111111', b: '#222222' }), D('B', [], [], { a: '#111111', b: '#333333' }), D('C', [], [], { a: '#444444', b: '#222222' }), D('E', [], [], { a: '#111111', b: '#222222' }))).length === 2);
ok('ownColorProblems: con un color propio no hay problema', R.ownColorProblems(dist(D('A', [], [], { a: '#111111', b: '#222222' }), D('B', [], [], { a: '#111111', b: '#333333' }))).length === 0);
ok('nameClashes: los invisibles no cuentan como letras (una letra visible es un nombre corto)', R.nameClashes(dist(D('A', ['A\u200B\u200B'], []))).some((x) => /menos de 3 letras/.test(x)));
ok('ownColorProblems: los colores en mayúsculas cuentan como los mismos', R.ownColorProblems(dist(
  D('A', [], [], { a: '#aabbcc', b: '#223344' }), D('B', [], [], { a: '#AABBCC', b: '#223344' }))).length === 2);
ok('repeated: seeds y nombres repetidos', R.repeated(dist(D('A', [], [], null, 5, 'X'), D('B', [], [], null, 5, 'Y')), 'seed').join() === '5' && R.repeated(dist(D('A', [], [], null, 1, 'X'), D('B', [], [], null, 2, 'X')), 'name').join() === 'X'
  && R.repeated(dist(D('A', [], [], null, 1, 'X'), D('B', [], [], null, 2, 'Y')), 'seed').length === 0);

// modules.cjs coincide con build.mjs (importaciones y expand)
const build = fs.readFileSync(path.join(__dirname, '..', 'build.mjs'), 'utf8');
const ids = Object.keys(MODULES);
ok('modules.cjs: M01..M10 en orden', ids.join() === 'M01,M02,M03,M04,M05,M06,M07,M08,M09,M10', ids.join());
for (const [id, { file, title }] of Object.entries(MODULES)) {
  const n = String(+id.slice(1));
  ok(`modules.cjs ${id}: build.mjs importa ${file} como c${n} y lo expande con "${title}"`, build.includes(`import * as c${n} from './${file}';`) && build.includes(`expand('${id}', '${title}', c${n})`));
}

// de00 y colorDistanceProblems: la regla de distancia de color de los distritos nuevos (spec de la Tanda 4)
const fc = require('fast-check');
const X = (a, b) => ({ X: { colors: { a, b } } });
const hex = fc.tuple(fc.integer({ min: 0, max: 255 }), fc.integer({ min: 0, max: 255 }), fc.integer({ min: 0, max: 255 })).map(([r, g, b]) => '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join(''));
ok('de00: #ffd76a y #ffe600 quedan a menos de 10 (el amarillo que se descartó)', R.de00('#ffd76a', '#ffe600') < 10, String(R.de00('#ffd76a', '#ffe600')));
ok('de00: #ff4800 y #ff8f3a quedan a 15 o más', R.de00('#ff4800', '#ff8f3a') >= 15, String(R.de00('#ff4800', '#ff8f3a')));
{ let bad = 0; fc.assert(fc.property(hex, hex, (a, b) => { if (Math.abs(R.de00(a, b) - R.de00(b, a)) > 1e-9 || R.de00(a, a) !== 0) bad++; return true; }), { numRuns: 1000 });
  ok('de00 es simétrica y de00(x, x) = 0 (1000 ejecuciones)', bad === 0, 'violaciones=' + bad); }
const has = (errs, re) => errs.some((e) => re.test(e));
ok('colorDistanceProblems: #ff8c42 nombra el naranja de las reparaciones #ff8f3a', has(R.colorDistanceProblems(X('#ff8c42', '#36a3ff'), ['X']), /#ff8f3a/));
ok('colorDistanceProblems: #f4f4ff como cuerpo (a) nombra los ojos', has(R.colorDistanceProblems(X('#f4f4ff', '#36a3ff'), ['X']), /ojos/));
ok('colorDistanceProblems: #7c5cff nombra el morado de referencia #8a5fe0', has(R.colorDistanceProblems(X('#ff4800', '#7c5cff'), ['X']), /#8a5fe0/));
ok('colorDistanceProblems: un color casi igual al de la fachada nombra el fondo', has(R.colorDistanceProblems(X('#2a2f5e', '#fff700'), ['X']), /fondo/));
ok('colorDistanceProblems: a y b iguales dentro del mismo distrito dan problema', has(R.colorDistanceProblems(X('#36a3ff', '#36a3ff'), ['X']), /otro color/));
ok('colorDistanceProblems: "#fff" y "" se reportan como mal formados, sin NaN silenciosos', R.colorDistanceProblems(X('#fff', ''), ['X']).filter((e) => /mal formado/.test(e)).length === 2);
ok('colorDistanceProblems: un id no registrado da "<id>: no registrado" y no lanza, también __proto__ y constructor', JSON.stringify(R.colorDistanceProblems({}, ['M05'])) === '["M05: no registrado"]' && R.colorDistanceProblems({}, ['__proto__', 'constructor']).length === 2);

(async () => {
  const { city } = await import(require('url').pathToFileURL(path.join(__dirname, '..', 'city', 'districts.mjs')).href);
  const real = Object.fromEntries(Object.entries(city.districts).map(([k, d]) => [k, { colors: d.colors }]));
  ok('colorDistanceProblems: con ids [] no se mide nada, aunque M07 esté a 6,4 de M01', R.colorDistanceProblems(real, []).length === 0);
  ok('colorDistanceProblems: con ids ["M07"] sí se mide y da problema (M07 b #e05cff queda a menos de 10 de M01 a #d580ff)', R.colorDistanceProblems(real, ['M07']).length > 0);
  const all = Object.assign({}, real, { M05: { colors: { a: '#ff4800', b: '#fff700' } }, M09: { colors: { a: '#36a3ff', b: '#f4f4ff' } } });
  const nuevos = R.colorDistanceProblems(all, ['M05', 'M09']);
  ok('colorDistanceProblems: los colores de M05 y M09 del spec, junto a los 8 reales, no dan ningún problema', nuevos.length === 0, nuevos.join(' | '));

  // la luz de las ventanas de un distrito restaurado también es un color de la escena
  ok('REF_COLORS incluye la luz de las ventanas restauradas #fff0a0 y colorDistanceProblems la nombra', R.REF_COLORS.lit === '#fff0a0' && has(R.colorDistanceProblems(X('#fff1a2', '#36a3ff'), ['X']), /#fff0a0/), JSON.stringify(R.REF_COLORS.lit));
  ok('los colores de M05 y M09 siguen a ΔE ≥ 10 de esa luz (el amarillo #fff700 queda a ≈ 13)', R.de00('#fff700', '#fff0a0') >= 10, String(R.de00('#fff700', '#fff0a0')));
  // los nombres no se esconden con rellenos invisibles ni espacios raros (fold quita \p{Cf}, \p{Mn}, los espacios Unicode, los rellenos hangul y el braille vacío)
  for (const [a, b] of [['Ana', 'A\u3164na'], ['Ana', 'A\u2800na'], ['Ana', 'A\u00A0na'], ['Ana', 'A\u3000na'], ['Ana', 'A\u115Fna'], ['Ana', 'A\u17B4na'], ['Ana', 'A\u200Bna'], ['Ana', ' Ana'], ['Ana', 'Ana\t']])
    ok(`namesNear('${a}', ${JSON.stringify(b)}) es verdadero (relleno invisible o espacio)`, R.namesNear(a, b) && R.namesNear(b, a), R.phon(a) + ' / ' + R.phon(b));
  ok('nameClashes reporta " Al " como nombre de menos de 3 letras (los espacios no cuentan)', R.nameClashes(dist(D('A', [' Al '], []))).some((x) => /tiene menos de 3 letras/.test(x)));

  const fails = results.filter((r) => r[0] === 'FAIL');
  results.forEach((r) => console.log(r.join(' | ')));
  console.log(fails.length ? 'DISTRICT_RULES FALLAS ' + fails.length : 'DISTRICT_RULES OK (' + results.length + ' comprobaciones)');
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error('EXC', e); process.exit(2); });
