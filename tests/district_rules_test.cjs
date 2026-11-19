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

const fails = results.filter((r) => r[0] === 'FAIL');
results.forEach((r) => console.log(r.join(' | ')));
console.log(fails.length ? 'DISTRICT_RULES FALLAS ' + fails.length : 'DISTRICT_RULES OK (' + results.length + ' comprobaciones)');
process.exit(fails.length ? 1 : 0);
