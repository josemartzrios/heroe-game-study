// validate.mjs y build.mjs ejecutados sobre una copia del proyecto en un directorio temporal (no toca juego_estudio.html del repositorio):
// reglas de distritos y de la ciudad, guarda de identificadores retirados y de ganchos, CSP sin blob: y anclas del motor.
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const root = path.join(__dirname, '..');
const results = [];
const ok = (name, cond, extra) => { results.push([cond ? 'PASS' : 'FAIL', name, extra || '']); };
const html0 = fs.readFileSync(path.join(root, 'juego_estudio.html'), 'utf8');

// Ejecuta validate.mjs contra un HTML dado (copia validate.mjs junto al HTML en un directorio nuevo)
function validate(htmlText, mutate) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'val-'));
  fs.copyFileSync(path.join(root, 'validate.mjs'), path.join(dir, 'validate.mjs'));
  fs.cpSync(path.join(root, 'city'), path.join(dir, 'city'), { recursive: true });   // validate.mjs carga city/move.js, check_district.mjs y los distritos
  fs.copyFileSync(path.join(root, '_headers'), path.join(dir, '_headers'));   // y revisa la CSP
  fs.writeFileSync(path.join(dir, 'juego_estudio.html'), htmlText);
  if (mutate) mutate(dir);
  const r = spawnSync('node', ['validate.mjs'], { cwd: dir, encoding: 'utf8' });
  fs.rmSync(dir, { recursive: true, force: true });
  return { status: r.status, out: (r.stdout || '') + (r.stderr || '') };
}
// Copia lo necesario para build.mjs; mutate(dir) cambia la copia antes de construir
function build(mutate) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bld-'));
  for (const f of fs.readdirSync(root)) if (f.endsWith('.mjs') || f === 'engine.html') fs.copyFileSync(path.join(root, f), path.join(dir, f));
  fs.cpSync(path.join(root, 'city'), path.join(dir, 'city'), { recursive: true });
  if (mutate) mutate(dir);
  const r = spawnSync('node', ['build.mjs'], { cwd: dir, encoding: 'utf8' });
  const outPath = path.join(dir, 'juego_estudio.html');
  const out = fs.existsSync(outPath) ? fs.readFileSync(outPath, 'utf8') : null;
  fs.rmSync(dir, { recursive: true, force: true });
  return { status: r.status, msg: (r.stdout || '') + (r.stderr || ''), out };
}
const edit = (dir, file, fn) => { const p = path.join(dir, file); fs.writeFileSync(p, fn(fs.readFileSync(p, 'utf8'))); };

// ---- validate.mjs ----
{ const r = validate(html0);
  ok('v0 el HTML actual sin cambios valida (código 0, VALIDACIÓN OK)', r.status === 0 && /VALIDACIÓN OK/.test(r.out), 'status=' + r.status + ' ' + r.out.slice(-300)); }

// la ruta de M08 y el resto de datos de ciudad se validan desde el CITY_DATA que va en el HTML (reglas de city/check_district.mjs)
const vCity = (from, to) => {
  const i = html0.indexOf('var CITY_DATA = '), j = html0.indexOf(';\n', i), seg = html0.slice(i, j);
  if (seg.indexOf(from) < 0) return { status: -1, out: 'no se encontró en CITY_DATA: ' + from };
  return validate(html0.slice(0, i) + seg.replace(from, () => to) + html0.slice(j));
};
const S0 = '"id":"S0","name":"Prólogo: la red","topics":["T01"],"ask":1,"layers":0,"kp":[{"topic":"T01","index":0,"expect":"computadoras autónomas conectadas"}]';

{ const r = vCity(S0, S0.replace(/"kp":\[\{.*\}\]$/, '"kp":[]'));
  ok('v5 estación sin kp: falla con "kp debe tener 1 elemento"', r.status === 1 && /R8: M08: estación S0: kp debe tener 1 elemento/.test(r.out), 'status=' + r.status + ' ' + r.out.slice(-200)); }

{ const r = vCity('"pads":[{"x":0,"z":44},', '"pads":[');
  ok('v6 un pad menos: falla con "9 pads para 10 estaciones"', r.status === 1 && /R8: M08: hay 9 pads para 10 estaciones/.test(r.out), 'status=' + r.status + ' ' + r.out.slice(-200)); }

{ const r = vCity('"ask":1,"layers":0', '"ask":3,"layers":0');
  ok('v7 ask = 3 en S0: falla con "S0: ask debe ser 1 o 2"', r.status === 1 && /estación S0: ask debe ser 1 o 2/.test(r.out), 'status=' + r.status + ' ' + r.out.slice(-200)); }

{ const r = vCity('"kp":[{"topic":"T01","index":0,', '"kp":[{"topic":"T01","index":99,');
  ok('v8 kp.index fuera de rango: falla con "kp desalineado" en S0', r.status === 1 && /estación S0: kp desalineado/.test(r.out), 'status=' + r.status); }

{ const r = vCity('"id":"S0","name":"Prólogo: la red","topics":["T01"]', '"id":"S0","name":"Prólogo: la red","topics":["T99"]');
  ok('v9 tema inexistente: falla con "S0: tema T99 no existe"', r.status === 1 && /estación S0: tema T99 no existe/.test(r.out), 'status=' + r.status); }

{ const r = vCity('"expect":"computadoras autónomas conectadas"', '"expect":"corto"');
  ok('v10 expect de 5 caracteres: falla (longitud de expect o kp desalineado)', r.status === 1 && /estación S0: expect debe medir de 15 a 40 caracteres|estación S0: kp desalineado/.test(r.out), 'status=' + r.status); }

{ const r = vCity('"name":"Nodo Enlace"', '"name":"Hulk Enlace"');
  ok('v10b palabra prohibida en el nombre de un distrito: falla con R6', r.status === 1 && /R6: M08: palabra prohibida/.test(r.out), 'status=' + r.status + ' ' + r.out.slice(-200)); }

// el código de la vista no puede nombrar un distrito concreto
for (const f of ['view', 'world2d', 'sprites2d', 'input']) {
  const r = validate(html0, (d) => edit(d, 'city/' + f + '.js', (t) => t + "\nvar _x = 'M02';\n"));
  ok('v13 city/' + f + '.js con el literal \'M02\': falla con "nombra un distrito concreto"', r.status === 1 && new RegExp('city/' + f + '\\.js nombra un distrito concreto').test(r.out), 'status=' + r.status + ' ' + r.out.slice(-160));
}
{ const r = validate(html0, (d) => edit(d, 'city/view.js', (t) => t + "\n/* el módulo M02 */ var _y = 'distrito';\n"));
  ok('v13b un comentario sin comillas con M02 no es un literal y no falla', r.status === 0, 'status=' + r.status + ' ' + r.out.slice(-160)); }

{ const r = validate(html0.replace('<div id="city-root" hidden></div>', '<div id="city-root" hidden>Batman</div>'));
  ok('v12 palabra prohibida en el HTML sí se reporta', r.status === 1 && /Palabra prohibida/.test(r.out), 'status=' + r.status); }

// ---- build.mjs ----
{ const r = build();
  ok('b0 la build de la copia sale con 0 y no deja anclas sin reemplazar', r.status === 0 && !!r.out && !/\/\*__[A-Z_]+__\*\//.test(r.out), 'status=' + r.status + ' ' + r.msg.slice(-200));
  ok('b0 CityRoute, el mundo y la vista están incrustados', !!r.out && r.out.includes('var CityRoute = (function') && r.out.includes('var CityWorld2D = (function') && r.out.includes('function cityStart('));
  ok('b0 el HTML no trae nada del viaje 3D (Three3D, TripScene, TripFlow, TRIP_STATIONS, three-src, VENDOR:THREE)', !!r.out && !/Three3D|TripScene|TripFlow|TRIP_STATIONS|three-src|VENDOR:THREE|three\.module|THREE_VENDOR/.test(r.out)); }

{ const r = build((d) => edit(d, 'city/districts/m08_route.mjs', (t) => t.replace("name: 'Prólogo: la red'", () => "name: 'Prólogo $& $1 red'")));
  ok('b3 "$&" y "$1" en una estación se copian literales', r.status === 0 && !!r.out && r.out.includes('"name":"Prólogo $& $1 red"'), 'status=' + r.status); }

{ const r = build((d) => edit(d, 'city/route.js', (t) => t + "\n/* marca $' $` */\n"));
  ok("b4 \"$'\" y \"$`\" en route.js se copian literales", r.status === 0 && !!r.out && r.out.includes("/* marca $' $` */"), 'status=' + r.status); }

{ const r = build((d) => edit(d, 'city/districts/m08.mjs', (t) => t.replace('los paquetes llegan a su destino.', () => 'los paquetes llegan </script><b>x</b>.')));
  ok('b5 un "</script>" en un texto de los datos no corta el script: se escapa el "<" en CITY_DATA', r.status === 0 && !!r.out && r.out.includes('\\u003c/script>') && !r.out.includes('llegan </script>'), 'status=' + r.status + ' ' + r.msg.slice(-160)); }

// ---- guardas de limpieza y seguridad (spec §7) ----
for (const id of ['avatarSvg', 'PARTS', 'fixLook', 'setLook', 'mergeBoxes', 'cameraArm', 'consumeCamera', 'CityHero', 'welcomed', 'villainsM01',
  'Three3D', 'TripScene', 'TripFlow', 'TRIP_STATIONS', 'trip-root', 'tripStop', 'loadThree', 'three-src', 'three.module', '__TRIP_IMPORT__', '__TRIP_SCENE__', 'dynImport', 'createObjectURL', 'bridgeSeen', 'cityZone']) {
  const r = validate(html0 + '<script>/* ' + id + ' */</script>');
  ok('v-guard ' + id + ': un identificador retirado hace fallar validate.mjs', r.status === 1 && r.out.indexOf(id) >= 0, 'status=' + r.status + ' ' + r.out.slice(-160));
}
for (const [name, code] of [['import(\'x\')', "import('x')"], ['import (u)', 'import (u)'], ['import(u)', 'import(u)']]) {
  const r = validate(html0 + '<script>' + code + '</script>');
  ok('v-guard ' + name + ': un import dinámico hace fallar validate.mjs', r.status === 1 && /import\(/.test(r.out), 'status=' + r.status + ' ' + r.out.slice(-160));
}
{ const i = html0.indexOf('var CITY_DATA = '), j = html0.indexOf(';\n', i);
  const r = validate(html0.slice(0, i) + html0.slice(i, j).replace('"name":"Nodo Enlace"', '"name":"Nodo Enlace import(x) createObjectURL"') + html0.slice(j));
  ok('v-guard: un texto de los datos que menciona import( o createObjectURL no es un falso positivo', r.status === 0, 'status=' + r.status + ' ' + r.out.slice(-200)); }
{ const r = validate(html0 + '<script>window.__CITY_TEST_API__ = {};</script>');
  ok('v-guard ganchos: __CITY_TEST_API__ fuera de un bloque __CITY_TEST__ === true falla', r.status === 1 && /__CITY_TEST_API__/.test(r.out), r.out.slice(-160)); }
{ const r = validate(html0 + '<script>window.__CITY_WORLD__ = {};</script>');
  ok('v-guard ganchos: asignar __CITY_WORLD__ fuera de un bloque de prueba falla', r.status === 1 && /__CITY_WORLD__/.test(r.out), r.out.slice(-160)); }
{ const h = fs.readFileSync(path.join(root, '_headers'), 'utf8');
  ok('_headers: img-src \'none\' y sin blob: en ninguna directiva', /img-src 'none'/.test(h) && !/blob:/.test(h), h.slice(0, 260)); }
{ const r = validate(html0, (d) => edit(d, '_headers', (t) => t.replace("script-src 'unsafe-inline'", "script-src 'unsafe-inline' blob:")));
  ok('v-guard: blob: en _headers hace fallar validate.mjs', r.status === 1 && /blob:/.test(r.out), 'status=' + r.status + ' ' + r.out.slice(-160)); }
{ const r = validate(html0, (d) => edit(d, 'city/view.js', (t) => t + "\nfunction xssProbe(o) { cId('x').innerHTML = '<b>' + o.name + '</b>'; }\n"));
  ok('v-guard innerHTML: un nombre de los datos sin esc()/fmt() en city/view.js hace fallar validate.mjs', r.status === 1 && /city\/view\.js:\d+: un nombre o etiqueta de los datos va a innerHTML sin esc/.test(r.out), 'status=' + r.status + ' ' + r.out.slice(-200)); }
{ const r = validate(html0, (d) => edit(d, 'city/route_view.js', (t) => t + "\nfunction xssProbe(o) { cId('x').innerHTML = '<b>' + o.label + '</b>'; }\n"));
  ok('v-guard innerHTML: una etiqueta de los datos sin esc()/fmt() en city/route_view.js también falla', r.status === 1 && /city\/route_view\.js:\d+: un nombre o etiqueta/.test(r.out), 'status=' + r.status + ' ' + r.out.slice(-200)); }
{ const r = validate(html0, (d) => edit(d, 'city/view.js', (t) => t + "\nfunction xssProbe(o) { cId('x').innerHTML = '<b>' + esc(o.name) + '</b><i>' + fmt(o.label) + '</i>' + esc(f(o.name, (g(o.text)))); }\n"));
  ok('v-guard innerHTML: el mismo nombre dentro de esc()/fmt() (con paréntesis anidados) no es falso positivo', r.status === 0, 'status=' + r.status + ' ' + r.out.slice(-200)); }
ok('el HTML compilado no contiene Three3D, TripScene, three.module ni THREE', !/Three3D|TripScene|three\.module|\bTHREE\b/.test(html0));
ok('no quedan vendor/, trip/ ni three/ en el repositorio', !['vendor', 'trip', 'three'].some((d) => fs.existsSync(path.join(root, d))), ['vendor', 'trip', 'three'].filter((d) => fs.existsSync(path.join(root, d))).join(','));

results.forEach((r) => console.log(r.join(' | ')));
const fails = results.filter((r) => r[0] === 'FAIL').length;
console.log(fails ? `\n${fails} FALLOS` : '\nBUILD_VALIDATE OK (' + results.length + ' comprobaciones)');
process.exit(fails ? 1 : 0);
