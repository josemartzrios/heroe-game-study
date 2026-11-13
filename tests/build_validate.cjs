// validate.mjs y build.mjs del viaje 3D, ejecutados sobre una copia del proyecto en un directorio temporal
// (no toca juego_estudio.html del repositorio): hash del vendor, bloque VENDOR:THREE, TRIP_STATIONS y anclas del motor.
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const root = path.join(__dirname, '..');
const results = [];
const ok = (name, cond, extra) => { results.push([cond ? 'PASS' : 'FAIL', name, extra || '']); };
const html0 = fs.readFileSync(path.join(root, 'juego_estudio.html'), 'utf8');
const OPEN = '<script type="text/plain" id="three-src" data-version="0.169.0">';

// Ejecuta validate.mjs contra un HTML dado (copia validate.mjs junto al HTML en un directorio nuevo)
function validate(htmlText, mutate) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'val-'));
  fs.copyFileSync(path.join(root, 'validate.mjs'), path.join(dir, 'validate.mjs'));
  fs.cpSync(path.join(root, 'city'), path.join(dir, 'city'), { recursive: true });   // validate.mjs carga city/move.js, check_district.mjs y los distritos
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
  fs.cpSync(path.join(root, 'trip'), path.join(dir, 'trip'), { recursive: true });
  fs.cpSync(path.join(root, 'vendor'), path.join(dir, 'vendor'), { recursive: true });
  for (const extra of ['three', 'city']) if (fs.existsSync(path.join(root, extra))) fs.cpSync(path.join(root, extra), path.join(dir, extra), { recursive: true });
  if (mutate) mutate(dir);
  const env = Object.assign({}, process.env); delete env.THREE_VENDOR;
  const r = spawnSync('node', ['build.mjs'], { cwd: dir, env, encoding: 'utf8' });
  const outPath = path.join(dir, 'juego_estudio.html');
  const out = fs.existsSync(outPath) ? fs.readFileSync(outPath, 'utf8') : null;
  fs.rmSync(dir, { recursive: true, force: true });
  return { status: r.status, msg: (r.stdout || '') + (r.stderr || ''), out };
}
const edit = (dir, file, fn) => { const p = path.join(dir, file); fs.writeFileSync(p, fn(fs.readFileSync(p, 'utf8'))); };

// ---- validate.mjs ----
{ const r = validate(html0);
  ok('v0 el HTML actual sin cambios valida (código 0, VALIDACIÓN OK)', r.status === 0 && /VALIDACIÓN OK/.test(r.out), 'status=' + r.status + ' ' + r.out.slice(-300)); }

{ const i = html0.indexOf(OPEN) + OPEN.length;
  const r = validate(html0.slice(0, i) + ';' + html0.slice(i));
  ok('v1 un byte añadido al vendor: falla con "vendor: hash distinto"', r.status === 1 && /vendor: hash distinto/.test(r.out), 'status=' + r.status + ' ' + r.out.slice(-200)); }

{ const i = html0.indexOf(OPEN) + OPEN.length + 100, ch = html0[i];
  const r = validate(html0.slice(0, i) + (ch === 'a' ? 'b' : 'a') + html0.slice(i + 1));
  ok('v2 un carácter cambiado (mismo tamaño): falla con "vendor: hash distinto"', r.status === 1 && /vendor: hash distinto/.test(r.out), 'status=' + r.status); }

{ const r = validate(html0.replace(/<!-- VENDOR:THREE START -->[\s\S]*?<!-- VENDOR:THREE END -->/, ''));
  ok('v3 sin el bloque VENDOR:THREE: falla con "Falta el bloque VENDOR:THREE"', r.status === 1 && /Falta el bloque VENDOR:THREE/.test(r.out), 'status=' + r.status); }

{ const r = validate(html0.replace('data-version="0.169.0"', 'data-version="0.170.0"'));
  ok('v4 otra data-version: falla con "falta data-version"', r.status === 1 && /vendor: falta data-version="0\.169\.0"/.test(r.out), 'status=' + r.status); }

// la ruta de M08 se valida desde su archivo de datos (city/districts/m08_route.mjs, regla R8 de check_district.mjs)
const ROUTE = 'city/districts/m08_route.mjs';
const vRoute = (fn) => validate(html0, (d) => edit(d, ROUTE, fn));

{ const r = vRoute((t) => t.replace("kp: [{ topic: 'T01', index: 0, expect: 'computadoras autónomas conectadas' }]", 'kp: []'));
  ok('v5 estación sin kp: falla con "kp debe tener 1 elemento"', r.status === 1 && /R8: M08: estación S0: kp debe tener 1 elemento/.test(r.out), 'status=' + r.status + ' ' + r.out.slice(-200)); }

{ const r = vRoute((t) => t.replace(/\n  \{ id: 'S9'[^\n]*/, ''));
  ok('v6 una estación menos: falla con "pads para 9 estaciones"', r.status === 1 && /R8: M08: hay 10 pads para 9 estaciones/.test(r.out), 'status=' + r.status + ' ' + r.out.slice(-200)); }

{ const r = vRoute((t) => t.replace('ask: 1, layers: 0', 'ask: 3, layers: 0'));
  ok('v7 ask = 3 en S0: falla con "S0: ask debe ser 1 o 2"', r.status === 1 && /estación S0: ask debe ser 1 o 2/.test(r.out), 'status=' + r.status); }

{ const r = vRoute((t) => t.replace("kp: [{ topic: 'T01', index: 0,", "kp: [{ topic: 'T01', index: 99,"));
  ok('v8 kp.index fuera de rango: falla con "kp desalineado" en S0', r.status === 1 && /estación S0: kp desalineado/.test(r.out), 'status=' + r.status); }

{ const r = vRoute((t) => t.replace("topics: ['T01'], ask: 1", "topics: ['T99'], ask: 1"));
  ok('v9 tema inexistente: falla con "S0: tema T99 no existe"', r.status === 1 && /estación S0: tema T99 no existe/.test(r.out), 'status=' + r.status); }

{ const r = vRoute((t) => t.replace("expect: 'computadoras autónomas conectadas'", "expect: 'corto'"));
  ok('v10 expect de 5 caracteres: falla (longitud de expect o kp desalineado)', r.status === 1 && /estación S0: expect debe medir de 15 a 40 caracteres|estación S0: kp desalineado/.test(r.out), 'status=' + r.status); }

{ const i = html0.indexOf(OPEN) + OPEN.length;
  const r = validate(html0.slice(0, i) + 'Batman' + html0.slice(i));
  ok('v11 palabra prohibida dentro del vendor no se reporta como palabra prohibida (solo hash)', r.status === 1 && !/Palabra prohibida/.test(r.out) && /vendor: hash distinto/.test(r.out), r.out.slice(-200)); }

{ const r = validate(html0.replace('<div id="trip-root" hidden></div>', '<div id="trip-root" hidden>Batman</div>'));
  ok('v12 palabra prohibida fuera del vendor sí se reporta', r.status === 1 && /Palabra prohibida/.test(r.out), 'status=' + r.status); }

// ---- build.mjs ----
{ const r = build();
  ok('b0 build de la copia sale con 0 y produce el bloque VENDOR y TRIP_STATIONS', r.status === 0 && !!r.out && r.out.includes('<!-- VENDOR:THREE START -->') && /var TRIP_STATIONS = \[/.test(r.out), 'status=' + r.status + ' ' + r.msg.slice(-200));
  ok('b0 no quedan anclas sin reemplazar', !!r.out && !r.out.includes('/*__TRIP__*/') && !r.out.includes('/*__TRIP_CODE__*/') && !r.out.includes('<!--__THREE__-->'));
  ok('b0 TripFlow y TripScene están incrustados', !!r.out && r.out.includes('var TripFlow = (function') && r.out.includes('var TripScene = (function')); }

{ const r = build((d) => edit(d, 'engine.html', (t) => t.replace('/*__TRIP__*/', '')));
  ok('b1 sin el ancla /*__TRIP__*/: build falla y no escribe el HTML', r.status !== 0 && /falta el ancla \/\*__TRIP__\*\//.test(r.msg) && r.out === null, 'status=' + r.status); }

{ const r = build((d) => edit(d, 'engine.html', (t) => t.replace('<!--__THREE__-->', '')));
  ok('b2 sin el ancla <!--__THREE__-->: build falla y no escribe el HTML', r.status !== 0 && /falta el ancla <!--__THREE__-->/.test(r.msg) && r.out === null, 'status=' + r.status); }

{ const r = build((d) => edit(d, 'city/districts/m08_route.mjs', (t) => t.replace("name: 'Prólogo: la red'", () => "name: 'Prólogo $& $1 red'")));
  ok('b3 "$&" y "$1" en una estación se copian literales', r.status === 0 && !!r.out && r.out.includes('"name":"Prólogo $& $1 red"'), 'status=' + r.status); }

{ const r = build((d) => edit(d, 'trip/flow.js', (t) => t + "\n/* marca $' $` */\n"));
  ok("b4 \"$'\" y \"$`\" en flow.js se copian literales", r.status === 0 && !!r.out && r.out.includes("/* marca $' $` */"), 'status=' + r.status); }

// ---- guardas de limpieza y seguridad (spec §6 y §7) ----
for (const id of ['avatarSvg', 'PARTS', 'fixLook', 'setLook', 'mergeBoxes', 'cameraArm', 'consumeCamera', 'CityHero', 'welcomed', 'villainsM01']) {
  const r = validate(html0 + '<script>/* ' + id + ' */</script>');
  ok('v-guard ' + id + ': un identificador retirado hace fallar validate.mjs', r.status === 1 && r.out.indexOf(id) >= 0, 'status=' + r.status + ' ' + r.out.slice(-160));
}
{ const r = validate(html0 + '<script>window.__CITY_TEST_API__ = {};</script>');
  ok('v-guard ganchos: __CITY_TEST_API__ fuera de un bloque __CITY_TEST__ === true falla', r.status === 1 && /__CITY_TEST_API__/.test(r.out), r.out.slice(-160)); }
{ const r = validate(html0 + '<script>window.__CITY_WORLD__ = {};</script>');
  ok('v-guard ganchos: asignar __CITY_WORLD__ fuera de un bloque de prueba falla', r.status === 1 && /__CITY_WORLD__/.test(r.out), r.out.slice(-160)); }
{ const i = html0.indexOf('function cityStart('), j = html0.indexOf('function citySuspend(');
  const r = validate(html0.slice(0, i) + 'function cityStart() { loadThree(); }\n' + html0.slice(j));
  ok('v-guard: llamar a loadThree dentro de la ciudad falla', r.status === 1 && /loadThree/.test(r.out), r.out.slice(-160)); }
for (const g of ['__TRIP_IMPORT__', '__TRIP_SCENE__']) {
  const r = validate(html0 + '<script>var x = window.' + g + '; x && x();</script>');
  ok('v-guard ganchos del viaje: leer ' + g + ' sin exigir __CITY_TEST__ === true falla', r.status === 1 && r.out.indexOf(g) >= 0, r.out.slice(-160));
}
{ const h = fs.readFileSync(path.join(root, '_headers'), 'utf8');
  ok('_headers: img-src \'none\' y blob: se conserva en script-src (lo usa el viaje)', /img-src 'none'/.test(h) && /script-src[^;]*blob:/.test(h), h.slice(0, 200)); }

results.forEach((r) => console.log(r.join(' | ')));
const fails = results.filter((r) => r[0] === 'FAIL').length;
console.log(fails ? `\n${fails} FALLOS` : '\nBUILD_VALIDATE OK (' + results.length + ' comprobaciones)');
process.exit(fails ? 1 : 0);
