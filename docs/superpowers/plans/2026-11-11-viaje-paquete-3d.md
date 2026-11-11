# "Viaja como paquete" (piloto 3D de M08): plan de implementación

> **Para agentes ejecutores:** SUB-SKILL REQUERIDA: usa superpowers:subagent-driven-development (recomendada) o superpowers:executing-plans para ejecutar este plan tarea por tarea. Los pasos usan casillas (`- [ ]`) para seguir el avance.

**Objetivo:** añadir a M08 un viaje 3D sobre rieles en el que el jugador es un paquete que cruza 10 estaciones. Cada estación hace preguntas del banco de M08 y registra el progreso igual que una ronda.

**Arquitectura:**
- Lógica del viaje en `trip/flow.js`: una máquina de estados pura, que se puede probar con `require`.
- Escena 3D en `trip/scene.js`: recibe `THREE` como parámetro.
- Datos en `trip/stations.mjs`.
- `build.mjs` inserta los tres dentro de la IIFE del motor. Three.js r169 va como texto inerte y se importa una sola vez desde un Blob URL.
- El motor añade la vista `trip`, que vive en `#trip-root` fuera de `#app`, y `recordAnswer()`, extraída de `finalize()`.

**Stack:** JS vanilla (ES5 en el motor, script clásico), Three.js 0.169.0, Node 22 para build y validate, jsdom 31 para las pruebas (`tests/*.cjs`).

**Spec:** `docs/superpowers/specs/2026-11-11-viaje-paquete-3d-design.md` (v5, aprobado). **Léelo completo antes de empezar.** Las secciones citadas (§N) son de ahí.

**Si el plan y el spec difieren, manda el plan.** El plan amplía las interfaces del §5 a propósito, tras tres revisiones: `deps.prep`, `TripScene.buildWorld/Pauser`, `opts` de prueba de la escena y `look()`. Además añade la Tarea 0.

## Restricciones globales

- Un solo HTML autocontenido: `node build.mjs` genera `juego_estudio.html`. No se añaden archivos que el HTML cargue en tiempo de ejecución.
- La clave de `localStorage` es `estudio_isw_v1`, sin cambios. No se cambia ningún ID de módulo, tema ni pregunta, y no se toca nada entre los marcadores `// === MODULE:Mxx START/END ===`.
- No se agrega contenido nuevo de redes. El texto educativo sale de `keyPoints` y preguntas de `content_m08.mjs`.
- El viaje **no** escribe en `S.boss`, no usa poderes y no pasa por `finish()`.
- Three.js debe ser exactamente `0.169.0`. No se actualiza: a partir de r171 importa `./three.core.min.js` y una ruta relativa no se resuelve desde `blob:`.
- Todo el texto visible va en español de México. Textos fijos:
  - "Viaja como paquete"
  - "Preparando el viaje…"
  - "Tu navegador no pudo abrir el viaje 3D."
  - "Hacer ronda de M08"
  - "Volver"
  - "Estación N de 10"
  - "Ver pregunta"
  - "Correcto"
  - "Paquete perdido: retransmitiendo"
  - "Continuar"
  - "Terminar"
  - "Repasar lo que fallé"
  - "¿Salir del viaje? Lo que respondiste ya quedó guardado."
  - "Salir"
  - "Seguir"
- Código del motor en el estilo existente: `var`, `function`, sin arrow functions ni `let`/`const` dentro de la IIFE.
- `tests/record.cjs` y `tests/record2.cjs` **no se modifican** y deben pasar después de cada tarea.
- Suite completa (el "verde" de cada tarea, **a partir de la Tarea 0**):
  `cd /home/josma/myprojects/juego && node build.mjs && node validate.mjs && for f in tests/*.cjs tests/adv/attacks.cjs; do node "$f" >/dev/null 2>&1 || echo "FALLO $f"; done; echo FIN`
- Los archivos de `tests/adv/` (`attacks.cjs`, `props.cjs`, `fuzz_state.cjs`, `lib.cjs`, `gen.cjs`, `runner.cjs`) ya existen y **no se modifican**.
  Se espera `OK`, `VALIDACIÓN OK` y `FIN`, sin ninguna línea `FALLO`. La suite tarda más de 2 minutos: usa un timeout de 600000 ms o córrela en segundo plano.
- Commits en la rama `feat/viaje-paquete-3d`. Cada mensaje termina con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Si lo ejecuta otro modelo, usa su nombre.

## Foco de revisión

Son entradas que el spec implica pero que ninguna prueba principal cubre. Cada una tiene su prueba en la tarea indicada:

1. **Pregunta `tf` dentro del viaje:** no debe aparecer temporizador (`.timer`) y tampoco debe responderse sola por tiempo. → Tarea 6.
2. **Jugador nuevo, sin progreso guardado**, que entra directo al viaje: funciona y crea su estado. → Tarea 6.
3. **Entrar, salir y volver a entrar muy rápido mientras carga:** solo se crea una escena, y únicamente la del último intento. → Tarea 5.
4. **Girar el teléfono (resize) con una pregunta abierta:** se llama a `scene.resize()` y el viaje sigue pausado. → Tarea 5.
5. **Volver de otra app (`visibilitychange`) con una pregunta abierta:** el bucle sigue detenido. → Tarea 7 (unitaria de `Pauser`).

---

### Tarea 0: Endurecer el estado guardado (`migrate`, `touch`, `save`, colores del héroe)

Va antes del refactor: hoy un `estudio_isw_v1` corrupto deja el juego sin arrancar, o congela la pantalla en `finalize()`. El viaje registraría por el mismo camino.

**Archivos:**
- Modificar: `engine.html:466-492` (`migrate`, `save`), `engine.html:512-519` (`touch`), `engine.html:561-579` (`shade`/`avatarSvg`)
- Prueba: `tests/adv/attacks.cjs` (existente, hoy 30 PASS / 19 FAIL; no se modifica)

**Interfaces:**
- Produce: `migrate(o)` devuelve un estado en el que siempre se cumple lo siguiente. Lo que no se pueda reparar se reemplaza por el valor fresco o se descarta.
  - `xp`, `session` y `lastActive` son números finitos ≥ 0 (`session` ≥ 1).
  - `days` es `{ last: string(YYYY-MM-DD) | null, count: entero ≥ 0 }`.
  - `topics`, `qs` y `boss` son objetos que no son arreglos.
  - Cada `topics[k]` es un arreglo de números en `[0, 1]`, de longitud ≤ 10; los valores inválidos se filtran.
  - Cada `qs[k]` es un objeto con `a`, `c`, `g` y `gs` numéricos finitos, `0 ≤ c ≤ a` y `q` booleano; los que no son objetos se borran.
  - Cada `boss[k]` es un objeto; si no, se borra.
  - `hero.look.hc` y `hero.look.capec`, si existen, cumplen `/^#[0-9a-f]{6}$/i`; si no, se borran. Los demás campos de `look` se fuerzan a enteros ≥ 0.

- [ ] **Paso 0: comitear el arreglo de charset pendiente** (3 líneas sin comitear en `engine.html` y `juego_estudio.html`) y las pruebas de `tests/adv/`:

```bash
cd /home/josma/myprojects/juego && git add engine.html juego_estudio.html tests/adv && git commit -m "Declarar charset UTF-8, doctype y viewport; pruebas adversariales" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
- [ ] **Paso 1: correr la prueba que hoy falla.** `node tests/adv/attacks.cjs` → `30 PASS / 19 FAIL` y código de salida 1.
- [ ] **Paso 2: implementar.**
  - Agrega la normalización a `migrate()` (después de las líneas existentes 474-483) con helpers locales `num(x, d)`, `plainObj(x)` y `hex(x)`.
  - En `touch()`, si `t < S.days.last` (comparación de cadenas YYYY-MM-DD; el reloj retrocedió), no cambies `S.days`.
  - En `save()`, dentro del `catch`, llama a `saveWarn()`. Esta función crea **una sola vez** `<div id="savewarn" class="banner" role="alert">No se pudo guardar tu progreso: el almacenamiento del navegador está lleno.</div>` como hijo de `body`, antes de `#app`, para que `render()` no lo borre.
- [ ] **Paso 3: verificar.** `node tests/adv/attacks.cjs` → `49 PASS / 0 FAIL`. `node tests/adv/props.cjs 240 777` → 5 PASA. `node tests/adv/fuzz_state.cjs 320 20261111` → 0 casos con problemas y 0 cuelgues. La suite queda verde.
- [ ] **Paso 4: commit.** Mensaje: `fix: normalizar estado guardado, reloj hacia atrás, aviso de almacenamiento lleno`.

---

### Tarea 1: Extraer `recordAnswer()`

**Archivos:**
- Modificar: `engine.html` (`finalize`; las líneas citadas abajo son las previas a la Tarea 0. Si se movieron, ubícalas por su contenido)
- Pruebas: `tests/record.cjs`, `tests/record2.cjs` (existentes, no se tocan)

**Interfaces:**
- Produce: `function recordAnswer(q, ok, assisted, gain)` dentro de la IIFE. Hace `S.xp += gain`, actualiza el historial `S.topics[m.id + ':' + q.topic]` (antes líneas 845-846, usa `qmap[q.id].m.id`) y la cola `S.qs[q.id]` (antes 847-856). No llama a `touch`, `checkVirtues` ni `save`, y no lee `R`.

- [ ] **Paso 2: correr la suite como línea base.** Debe salir verde (ver Restricciones globales).
- [ ] **Paso 3: extraer la función.** En `finalize()`, la línea 844 `R.xp += gain; S.xp += gain;` queda como `R.xp += gain;` y las líneas 845-856 se reemplazan por `recordAnswer(q, ok, assisted, gain);`. El resto de `finalize` (incluidos `touch()` en la 831, la batalla, `R.log`, `checkVirtues()` y `save()`) no cambia. Define `recordAnswer` justo antes de `function finalize`.
- [ ] **Paso 4: correr la suite.** Verde; `record.cjs` y `record2.cjs` pasan sin cambios.
- [ ] **Paso 5: commit.** Mensaje: `refactor: extraer recordAnswer() de finalize()`.

---

### Tarea 2: Datos de estaciones, ancla `/*__TRIP__*/` y validación de estaciones

**Archivos:**
- Crear: `trip/stations.mjs`
- Modificar: `engine.html` (ancla), `build.mjs`, `validate.mjs`

**Interfaces:**
- Produce `export const stations`, un arreglo de 10 objetos `{ id, name, topics, ask, layers, kp }`:
  - `id`: `'S0'` a `'S9'`.
  - `name`: nombre de la estación según §2.
  - `topics`: arreglo de IDs de tema según §2.
  - `ask`: número de decisiones de la estación.
  - `layers`: capas al terminar la estación.
  - `kp: [{ topic, index, expect }]`: **exactamente 1** elemento. `expect` es una subcadena literal de 15 a 40 caracteres de `content_m08.mjs` → `topics[...].keyPoints[index]`, copiada tal cual, con `**` incluidos si los hay.
- Valores fijos:
  - `ask = [1,2,2,2,2,1,2,2,2,2]` (18 preguntas).
  - `layers = [0,1,2,3,4,4,4,4,1,1]`.
  - `topics` es exactamente la columna "Temas" de la tabla del §2, v5: la estación 5 es `['T02','T14']`, la 6 es `['T04']` y la 7 es `['T02','T03','T04','T14']`.
  - Para cada `kp.topic`, elige el `keyPoint` que mejor describa lo que se ve en la estación.
- En el HTML queda `var TRIP_STATIONS = <JSON>;` dentro de la IIFE.

- [ ] **Paso 1: escribir primero la validación, que debe fallar.** En `validate.mjs`, después de las validaciones de módulos:
  - Extrae `var TRIP_STATIONS = (\[[\s\S]*?\]);` del HTML y evalúalo con `vm.runInNewContext`. Si no está, `bad('Falta TRIP_STATIONS')`.
  - Comprueba que hay 10 estaciones.
  - Comprueba que cada `topics[i]` existe en M08.
  - Comprueba que la unión de `topics` es exactamente T01–T15.
  - Comprueba que `ask[i]` es 1 o 2.
  - Comprueba que cada `kp` tiene `index < keyPoints.length` y que `keyPoints[index].includes(expect)`, con mensaje `bad('kp desalineado en ' + id)`.
- [ ] **Paso 2: comprobar que falla.** `node build.mjs && node validate.mjs` → la salida contiene "Falta TRIP_STATIONS".
- [ ] **Paso 3: implementar.**
  - Crea `trip/stations.mjs`.
  - En `engine.html`, dentro de la IIFE, justo después de la línea `var TS = 16, WD = null, ...` (sección "modo aventura: datos"), agrega la línea `/*__TRIP__*/`.
  - En `build.mjs`, `import { stations } from './trip/stations.mjs'` y, después del reemplazo de módulos, `out = out.replace('/*__TRIP__*/', () => 'var TRIP_STATIONS = ' + JSON.stringify(stations) + ';\n/*__TRIP_CODE__*/')`. `/*__TRIP_CODE__*/` es el ancla para la Tarea 3.
  - Lanza un error si falta el ancla.
  - Convierte `const out` en `let out` si hace falta.
  - Al final, borra cualquier ancla `/*__TRIP_CODE__*/` que quede antes de escribir el archivo.
- [ ] **Paso 4: suite verde.**
- [ ] **Paso 5: commit.** Mensaje: `feat(trip): datos de estaciones y validación`.

---

### Tarea 3: `trip/flow.js`, la máquina de estados del viaje

**Archivos:**
- Crear: `trip/flow.js`, `tests/trip.cjs`
- Modificar: `build.mjs` (inserta `flow.js` en `/*__TRIP_CODE__*/`)

**Interfaces:**
- Produce `var TripFlow = (function () { … return { create: create }; })(); if (typeof module !== 'undefined' && module.exports) module.exports = TripFlow;` en ES5 puro, sin DOM ni Three.
- `TripFlow.create(deps)` → `{ start(), ask(), answer(k), next(), state() }`.
- `deps` = `{ stations, questionsByTopic, prep, rnd, onStation, onAsk, onResult, onLayer, onSummary }`:
  - `stations`: el formato de la Tarea 2.
  - `questionsByTopic`: `{ T01: [q, …], … }`.
  - `prep(q)`: devuelve `{ q, labels, correct }`. En el motor es la función `prep` existente.
  - `rnd()`: devuelve un número en `[0, 1)`.
  - `onStation(i)`: `i` va de 0 a 9.
  - `onAsk(item)`.
  - `onResult({ q, ok, consec })`: devuelve `gain` (number). `consec` ya incluye la respuesta actual, igual que `R.consec` en engine.html:833.
  - `onLayer(n)`.
  - `onSummary({ xp, fails, perStation })`: `fails` es un arreglo de `q` sin duplicados; `perStation[i] = { ok, total }`.
- `state()` → `{ phase, station, decision, attempt, item, lastOk, consec, xp, fails }`, con `phase ∈ 'idle'|'arrive'|'ask'|'result'|'summary'`.
- Transiciones (algoritmo que el spec fija en §3):
  - `start()`: estación 0, `phase = 'arrive'`, llama a `onStation(0)`.
  - `ask()`: solo si `phase === 'arrive'`. Elige un tema al azar entre los `topics` de la estación con `rnd` y una pregunta del tema no usada en este viaje; si se agotaron, cualquiera del tema. Pone `phase = 'ask'` y llama a `onAsk(item)`.
  - `answer(k)`: solo si `phase === 'ask'`; si no, lo ignora. Calcula `ok = k === item.correct`, actualiza `consec` (`ok ? +1 : 0`), agrega el fallo a `fails`, hace `xp += onResult(...) || 0`, actualiza `perStation` y pone `phase = 'result'`.
  - `next()`: solo si `phase === 'result'`.
    - Si falló y `attempt === 0`: `attempt = 1`, otra pregunta **del mismo tema**, `phase = 'ask'`, llama a `onAsk`.
    - Si no: `attempt = 0`, `decision++`. Si `decision < ask`: nueva pregunta, `phase = 'ask'`, llama a `onAsk`.
    - Si se acabaron las decisiones: `onLayer(station.layers)`, `station++`. Si era la última, `phase = 'summary'` y `onSummary(...)`. Si no, `phase = 'arrive'` y `onStation(i)`.

- [ ] **Paso 1: escribir `tests/trip.cjs`, que debe fallar.**
  - Usa `require('../trip/flow.js')` y las estaciones de `trip/stations.mjs` (vía `await import`). Las preguntas de M08 salen de `MODULES` en `juego_estudio.html`, extraídas con regex más `vm.runInNewContext` como validate.mjs:6-8 (sin jsdom). Usa un `prep` de prueba sin barajar, `q => ({ q, labels: q.type === 'tf' ? ['Verdadero','Falso'] : q.options, correct: q.type === 'tf' ? (q.answer ? 0 : 1) : q.answer })`, y un `rnd` con semilla (mulberry32).
  - Usa el mismo formato de reporte `ok(name, cond)` y la misma salida que `tests/record.cjs`, con código de salida 1 si algo falla.
  - Casos:
    - (a) Acertando todo: `onStation` recibe `0..9` en orden, hay 18 `onAsk`, `onLayer` recibe `[0,1,2,3,4,4,4,4,1,1]` y `onSummary.xp` es la suma de lo que devolvió `onResult` (un falso que devuelve 7).
    - (b) Un fallo seguido de `next()`: hay otra pregunta con el **mismo** `q.topic`, distinta `q.id`, y `attempt === 1`.
    - (c) Dos fallos seguidos: `next()` avanza a la siguiente decisión; `fails` tiene las 2 preguntas.
    - (d) `consec` pasado a `onResult` es `1,2,3` con tres aciertos, y vuelve a `0` tras un fallo.
    - (e) Hacer `answer()` dos veces seguidas solo llama a `onResult` una vez.
    - (f) `ask()` y `next()` fuera de su fase no hacen nada.
    - (g) No se repiten `q.id` en un viaje completo acertando todo con semillas 1 a 10.
    - (h) Con un `questionsByTopic` en el que cada tema tiene 1 sola pregunta, el viaje completo termina sin errores (se reutilizan preguntas).
    - (i) `perStation[i] = { ok, total }`, donde **`total` cuenta respuestas dadas en la estación, incluidas las retransmisiones**, y `ok` cuenta aciertos. Acertando todo, `perStation[2]` es `{ ok: 2, total: 2 }`. Fallando una vez la primera decisión de la estación 2, es `{ ok: 2, total: 3 }`.
    - (j) Dos `create()` seguidos no comparten estado: el segundo empieza en `idle`, con `xp = 0` y `fails = []`.
    - (k) En (h), cada `onAsk` recibe un `item.q` definido.
- [ ] **Paso 2:** `node tests/trip.cjs` falla con `Cannot find module '../trip/flow.js'`.
- [ ] **Paso 3: implementar `trip/flow.js`.** En `build.mjs`, reemplaza `/*__TRIP_CODE__*/` por el contenido de `trip/flow.js` seguido de `\n/*__TRIP_CODE__*/`, siempre con función de reemplazo.
- [ ] **Paso 4:** `for i in $(seq 10); do node tests/trip.cjs || echo FALLO; done` no muestra ningún FALLO. La suite queda verde.
- [ ] **Paso 5: commit.** Mensaje: `feat(trip): máquina de estados del viaje`.

---

### Tarea 4: Three.js r169 incrustado, protecciones del build y validación del vendor

**Archivos:**
- Crear: `vendor/three.module.min.js`, `tests/build_vendor.cjs`
- Modificar: `build.mjs`, `validate.mjs`, `engine.html`

**Interfaces:**
- Produce en el HTML, justo antes de `<script>` (engine.html:337), el bloque `<!-- VENDOR:THREE START --><script type="text/plain" id="three-src" data-version="0.169.0">…</script><!-- VENDOR:THREE END -->`.
- `build.mjs` lee la ruta `process.env.THREE_VENDOR || 'vendor/three.module.min.js'`.

- [ ] **Paso 1: descargar el vendor.**

```bash
D=/tmp/claude-1000/three169 && mkdir -p "$D" && cd "$D" && npm pack three@0.169.0 && tar xzf three-0.169.0.tgz && mkdir -p /home/josma/myprojects/juego/vendor && cp package/build/three.module.min.js /home/josma/myprojects/juego/vendor/ && grep -c 'from"\./\|from '"'"'\./' /home/josma/myprojects/juego/vendor/three.module.min.js
```
Se espera que imprima `0`, sin imports relativos. `grep -c` sale con código 1 cuando no hay coincidencias, y aquí eso es lo correcto. Pesa unos 687 KB y la primera línea es el comentario `@license`.

Después ejecuta `openssl dgst -sha384 vendor/three.module.min.js`. Se espera `7827608db326fa37a423c7f269e099e0f9f2839938267e39c36aacde57e701de444b920ee2128e5cd8ac5414f25330ce`. Si el valor es otro, **detente y avisa**: no es el archivo revisado.

- [ ] **Paso 2: escribir `tests/build_vendor.cjs`, que debe fallar.**
  - Con `child_process.spawnSync('node', ['build.mjs'], { cwd: raíz, env: { ...process.env, THREE_VENDOR: tmp } })`, donde `tmp` es un archivo temporal:
    - (a) Contenido `x</script>y`: código de salida distinto de 0, y `juego_estudio.html` mantiene el mismo `mtimeMs` que antes.
    - (b) Contenido `import a from"./three.core.min.js";`: código de salida distinto de 0.
    - (c) Contenido `a<!--b`: código de salida distinto de 0.
  - Al final, `spawnSync('node', ['build.mjs'])` sin `THREE_VENDOR` sale con código 0. Comprueba también que el HTML contiene `id="three-src" data-version="0.169.0"` y que la secuencia `$&` del vendor real aparece literal dentro del bloque, sin haberse expandido.
- [ ] **Paso 3: implementar.**
  - En `engine.html`, agrega la línea `<!--__THREE__-->` antes de `<script>`.
  - En `build.mjs`:
    - Lee el vendor.
    - Lanza `Error('vendor: contiene </script')` si `/<\/script/i` coincide.
    - Lanza `Error('vendor: import relativo')` si `/from\s*["']\.\//` coincide.
    - Lanza `Error('vendor: contiene <!--')` si `/<!--/` coincide. Dentro de `<script>`, esa secuencia cambia cómo el parser lee el resto.
    - Reemplaza `<!--__THREE__-->` por el bloque **con función**.
  - En `validate.mjs`:
    - Define `const vend = html.match(/<!-- VENDOR:THREE START -->[\s\S]*?<!-- VENDOR:THREE END -->/)` **justo después de leer `html` (línea 4), antes de la línea 23**. Si no está, `bad('Falta el bloque VENDOR:THREE')`.
    - Define `const htmlNoV = vend ? html.replace(vend[0], '') : html`.
    - Usa `htmlNoV` en lugar de `html` en estos cuatro sitios. Los tres primeros son **obligatorios**: se comprobó que cada uno falla con el vendor real.
      - el bucle de palabras prohibidas (línea 23): Three r169 contiene `palegoldenrod`, que coincide con `/LEGO/i`;
      - el recorte `eng` (línea 28): Three contiene `fetch(`;
      - la regex de URLs externas (línea 38): Three contiene `http://www.w3.org/1999/xhtml`;
      - el cálculo de crecimiento (línea 30: `Buffer.byteLength(htmlNoV)`).
    - Valida aparte que el bloque contiene `data-version="0.169.0"`, que no contiene `</script` interno (solo el de cierre) ni `<!--` interno, y que no tiene imports relativos.
    - Extrae el texto del vendor entre `data-version="0.169.0">` y `</script>` y comprueba que su SHA-384 (`crypto.createHash('sha384')`) es igual al valor del Paso 1. Si no, `bad('vendor: hash distinto')`.
- [ ] **Paso 4: suite verde.** `node validate.mjs` → `VALIDACIÓN OK`. `ls -l juego_estudio.html` muestra unos 1.6 MB.
- [ ] **Paso 5: commit.** Incluye `vendor/`. Mensaje: `feat(trip): Three.js r169 incrustado como texto inerte`.

---

### Tarea 5: Vista `trip`, ciclo de vida, carga diferida y respaldo

**Archivos:**
- Modificar: `engine.html` (HTML de `#trip-root`, CSS, vistas, `render()`, delegados, listeners)
- Crear: `tests/trip_engine.cjs`

**Interfaces:**
- Consume: `TRIP_STATIONS` (Tarea 2) y `TripFlow` (Tarea 3, se conecta en la Tarea 6).
- Produce, dentro de la IIFE:
  - `var TD = null, tripGen = 0, threeP = null;`
  - `function dynImport(u)` y `function loadThree()`: exactamente el código del §5 "Carga diferida".
  - `function tripStart()`, `function tripStop()`, `function tripFallback()` y `function tripExit()`. `tripExit()` hace `go('module', { mod: 'M08' })`.
  - `TD = { gen, canvas, scene, flow, onLost, answered }`.
- Contrato de escena, la fábrica que usará la Tarea 7: `F.create(THREE, canvas, stations, opts)` → `Promise<api>`, con `opts = { reducedMotion: boolean }`. La promesa **se rechaza** si el canvas pierde el contexto antes de terminar de compilar. `api` tiene estos métodos:
  - `goTo(i)` → `Promise` que se resuelve **cuando la cámara llega** a la estación `i`. Con `reducedMotion` se resuelve en el siguiente microtask. Mientras viaja, el bucle debe estar corriendo (sin el motivo `'sheet'`).
  - `setLayers(n)`.
  - `lost()`.
  - `look(dx, dy)`: gira la cámara en grados; lo usan las flechas del teclado.
  - `resize()`: hace `setSize(w, h, false)`, ajusta el aspect y **dibuja un cuadro aunque esté en pausa**.
  - `setPaused(reason, on)`.
  - `dispose()`: primero `cancelAnimationFrame` del único rAF pendiente y marca `disposed`; después libera geometrías y materiales, `renderer.dispose()` y `renderer.forceContextLoss()`. Después de `dispose()` no se agenda ningún rAF.
- `reducedMotion` se calcula en `tripStart` con el patrón protegido de engine.html:1679: `var rm = false; try { rm = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) {}`. Sin `matchMedia`, como en jsdom, queda en `false`. **No copies** el patrón de la línea 1133, que da `true` en ese caso.
- **Estructura de `#trip-root` en esta tarea**:
  - Mientras carga: `<p role="status">Preparando el viaje…</p>` y el botón `tripquit`.
  - Con la escena creada: `<canvas id="trip-cv" aria-hidden="true"></canvas><div id="trip-ui"><button class="btn sm ghost trip-quit" data-act="tripquit" aria-label="Salir del viaje">Salir</button></div>`.
  - El flujo (TripFlow) **no arranca en esta tarea**: la Tarea 6 llena `#trip-ui` y conserva ese botón.
- La fábrica se resuelve como `(window.__TRIP_SCENE__ && typeof window.__TRIP_SCENE__.create === 'function') ? window.__TRIP_SCENE__ : (typeof TripScene !== 'undefined' ? TripScene : null)`. Si es `null`, se muestra el respaldo. Del mismo modo, `dynImport` usa `window.__TRIP_IMPORT__` **solo si** `typeof window.__TRIP_IMPORT__ === 'function'`. Así un elemento con `id="__TRIP_IMPORT__"` no cuenta como gancho.
- Respaldo (`tripFallback()`): `<div class="banner up" role="alert"><p>Tu navegador no pudo abrir el viaje 3D.</p><div class="actions"><button class="btn" data-act="tripround">Hacer ronda de M08</button><button class="btn primary" data-act="tripback">Volver</button></div></div>`, con el foco en "Volver".
- CSS de las capas (sin esto, el canvas tapa todo):
  - `#trip-ui{position:absolute; inset:0; pointer-events:none}`;
  - `#trip-ui > *{pointer-events:auto}`;
  - `.trip-quit{min-height:44px; min-width:44px}`;
  - `#trip-root .banner{background:var(--surface)}`.

- [ ] **Paso 1: escribir `tests/trip_engine.cjs`, que debe fallar.**
  - **Copia** de `tests/record.cjs` las funciones `boot`, `norm`, `allQs`, `click`, `modBtn`, `btn`, `findQ`, `correctText` y `optBtn`. **No uses `require('./record.cjs')`**: ejecuta su suite y termina con `process.exit`. En `beforeParse` agrega siempre `w.Element.prototype.scrollIntoView = function () {}`, porque jsdom no lo trae. Además, agrégale opciones para definir en `beforeParse`:
    - `w.__TRIP_IMPORT__`: una función que cuenta llamadas y devuelve una promesa controlable.
    - `w.__TRIP_SCENE__`: una fábrica falsa cuyo `create` cuenta llamadas y devuelve una promesa de un objeto que registra cada método llamado. Su `goTo` devuelve `Promise.resolve()` por defecto, o una promesa controlable si la prueba lo pide. Su `dispose` despacha `webglcontextlost` sobre el canvas **solo la primera vez que se llama**, para no provocar recursión si el orden está mal.
    - `w.URL.createObjectURL = () => 'blob:x'` y `w.URL.revokeObjectURL = () => {}`.
  - Para entrar al viaje: `modBtn(d,'M08')` y luego un clic en `[data-act="trip"]`.
  - Para esperar la cadena de promesas: `await new Promise(r => setTimeout(r, 0))` varias veces.
  - Casos:
    - (a) El botón "Viaja como paquete" existe en M08 y **no** en M01.
    - (b) Al entrar: `#trip-root` sin `hidden`, contiene "Preparando el viaje…" con `role="status"` y un `[data-act="tripquit"]`; `#app` queda vacío y `body` tiene las clases `game` y `trip-on`.
    - (c) Si `__TRIP_IMPORT__` rechaza: aparece "Tu navegador no pudo abrir el viaje 3D." en un `[role="alert"]`, con `[data-act="tripround"]` y `[data-act="tripback"]`, y `document.activeElement` es "Volver". "Volver" lleva a M08 (`.head h1` = "Redes informáticas") y `#trip-root` queda `hidden` y vacío. "Hacer ronda de M08" abre una ronda (`.prompt` existe) y `#trip-root` también queda `hidden`.
    - (c3) Un elemento `<div id="__TRIP_IMPORT__">` en el DOM, sin gancho función, no rompe nada: aparece el respaldo por falta de `createObjectURL`, sin excepción.
    - (d) Sin definir `w.URL.createObjectURL` (jsdom no lo trae): aparece el respaldo y `errors` queda vacío.
    - (e2) Tras un import exitoso: `#three-src` ya no existe y `revokeObjectURL` se llamó 1 vez.
    - (f2) La escena falsa despacha `webglcontextlost` sobre su canvas **dentro de su propio `dispose()`**. Al salir normal no aparece el respaldo y `dispose` se llama 1 sola vez.
    - (e) **Caché:** entrar, que se cree la escena, `tripquit`, volver a entrar → `__TRIP_IMPORT__` se llamó 1 vez y `create` 2 veces.
    - (f) Salir con la escena creada: se llamó `dispose()` y `#trip-root` queda `hidden` y con `innerHTML === ''`.
    - (g) Después de salir, despachar `webglcontextlost` sobre el canvas viejo no muestra el respaldo; `#app` sigue en M08.
    - (h) **Salir mientras carga:** con el import pendiente, `tripquit` lleva a M08. Al resolver el import, `create` no se llama.
    - (i) **(Foco de revisión 3)** Entrar, salir, entrar con el import pendiente y luego resolverlo: `create` se llama 1 vez y la escena queda viva en `#trip-root`.
    - (j) Con la escena creada, despachar `webglcontextlost` en el canvas actual llama a `dispose()` y muestra el respaldo.
    - (k) Si `create` resuelve después de que el jugador ya salió: se llama al `dispose()` de esa escena.
    - (l) **(Foco de revisión 4)** `w.dispatchEvent(new w.Event('resize'))` con la escena creada llama a `resize()`. En la Tarea 6, amplía este caso: con una pregunta abierta, el resize no provoca ningún `setPaused('sheet', false)`.
    - (m) Esc (`keydown` key `Escape`) mientras carga lleva a M08.
  - Usa el mismo formato de reporte que `tests/record.cjs`.
- [ ] **Paso 2:** `node tests/trip_engine.cjs` falla en (a).
- [ ] **Paso 3: implementar.**
  - HTML: `<div id="trip-root" hidden></div>` justo después de `<div class="shell" id="app"></div>` (engine.html:336).
  - CSS: `#trip-root{position:fixed; inset:0; height:100dvh; z-index:50; background:var(--bg)}`, `#trip-cv{position:absolute; inset:0; width:100%; height:100%; touch-action:none; overscroll-behavior:none}` y `body.trip-on{overflow:hidden}`.
  - `vModule()` (engine.html:977): justo **después** del ternario `(REGIONS[m.id] ? … : '')`, concatena `+ (m.id === 'M08' ? '<div><button class="btn sm" data-act="trip">Viaja como paquete</button></div>' : '')`. `REGIONS` solo tiene M01, así que M08 no tiene `<div>` de región donde reutilizar.
  - Delegado de `#app`: `else if (a === 'trip') go('trip');`.
  - `render()`:
    - `tripStop()` después de `worldStop()`.
    - El toggle `game` incluye `V.name === 'trip'`.
    - Agrega `toggle('trip-on', V.name === 'trip')`.
    - Después de `app.innerHTML = h`, `if (V.name === 'trip') tripStart();`.
    - Para `trip`, `h` queda vacío.
  - `tripStart()`, `tripStop()` y el manejo de `gen`, `contextlost` y `hidden` según §5 "Ciclo de vida". El canvas `#trip-cv` lleva `aria-hidden="true"` y se crea en `tripStart` cuando la escena está por crearse.
  - Segundo delegado `tripRoot.addEventListener('click', …)`, registrado una vez, filtrado por `V.name === 'trip'`: en esta tarea maneja `tripquit` (sin respuestas sale directo con `tripExit()`), `tripround` y `tripback`.
  - `keydown` propio del viaje: Esc → mismo comportamiento que `tripquit`.
  - `resize` y `visibilitychange` registrados una vez con `if (TD && TD.scene)`. `visibilitychange` llama a `TD.scene.setPaused('hidden', document.hidden)`.
  - `tripround`: `tripStop()` y luego `startRound({ kind: 'quiz', title: 'Quiz', mid: 'M08', back: { name: 'module', mod: 'M08' } }, itemsFor('quiz', mod('M08'), null))`. Siempre devuelve 8 preguntas, porque `ofType` acepta `tid` nulo.
- [ ] **Paso 4: verificar.** `for i in $(seq 5); do node tests/trip_engine.cjs || echo FALLO; done` y suite verde.
- [ ] **Paso 5: commit.** Mensaje: `feat(trip): vista trip, carga diferida y respaldo`.

---

### Tarea 6: Juego dentro del viaje: HUD, hoja de preguntas, registro, resumen y accesibilidad

**Archivos:**
- Modificar: `engine.html`, `tests/trip_engine.cjs` (casos nuevos)

**Interfaces:**
- Consume: `TripFlow.create(deps)` (Tarea 3), `recordAnswer` (Tarea 1), `prep`, `touch`, `passivePct`, `checkVirtues`, `save`, `fmt`, `mod('M08').byTopic` (o un mapa equivalente de M08 por tema) y la escena de la Tarea 5.
- Produce `function tripRecord(r)` con la fórmula exacta del §4:
  `touch(); var base = r.ok ? 10 * r.q.difficulty + (r.consec >= 3 ? 5 : 0) : 0; var gain = base + Math.floor(base * passivePct() / 100); recordAnswer(r.q, r.ok, false, gain); checkVirtues(); save(); return gain;`
- Estructura de `#trip-root` cuando la escena corre, dentro de un contenedor `#trip-ui` para que el canvas no se destruya:
  - HUD `.trip-hud`:
    - botón `tripquit` con `aria-label="Salir del viaje"`;
    - `.pill` con "Estación N de 10";
    - `.chips.trip-layers` con los primeros `n` de `['Datos','Puerto','IP','Trama']`.
  - `.bar role="img" aria-label="Estación N de 10"`.
  - `#trip-live` con `.sronly` y `aria-live="polite"`.
  - `#trip-sheet`, que según la fase de `flow` contiene:
    - `arrive`: `.qcard` con el chip "Estación N · nombre", el keyPoint con `fmt()` y el botón `tripask` "Ver pregunta" con foco.
    - `ask`: `h2.prompt` y `.opts` con `tripopt` `data-k`, foco en la primera opción, **sin** `.timer`.
    - `result`: opciones desactivadas con clase `ok`/`bad`/`dim`, `.fb good|bad` con `role="status"` y el texto "Correcto" o "Paquete perdido: retransmitiendo", la explicación con `fmt()` y el botón `tripnext` "Continuar" con foco; además `scrollIntoView({ block: 'nearest' })` de la `.fb`.
    - `summary`: aciertos por estación, XP, botón `tripend` "Terminar" (`.btn primary`, con foco) y botón `tripreplay` "Repasar lo que fallé" solo si hay fallos.
  - `#trip-confirm`: el `.banner` de §3, con `tripconfirm` y `tripcancel` y foco en "Seguir".
- `N = i + 1` en todos los textos.
- **Escapado:** todo lo que viene de datos se pinta con `esc(st.name)`, `fmt(q.prompt)`, `fmt(label)`, `fmt(q.explanation)` y `fmt(keyPoint)`. Nunca concatenes texto de datos sin pasarlo por estas funciones.
- **Arranque del flujo**, en `tripStart`, después de la segunda comprobación de `gen` (Tarea 5):

```
TD.flow = TripFlow.create({
  stations: TRIP_STATIONS, questionsByTopic: mod('M08').byTopic, prep: prep, rnd: Math.random,
  onStation: tripOnStation, onAsk: tripOnAsk,
  onResult: function (r) { var g = tripRecord(r); if (!r.ok && TD) TD.scene.lost(); return g; },
  onLayer: function (n) { TD.scene.setLayers(n); tripHud(); }, onSummary: tripOnSummary
});
TD.flow.start();
```
  `rnd: Math.random` es obligatorio: así las pruebas controlan qué pregunta sale sembrando `w.Math.random`.
- **Respuesta:** `tripopt` llama a `TD.flow.answer(k)` y, **cuando retorna**, pinta la hoja `result` con `TD.flow.state()` y el `k` del clic. El callback `onResult` no pinta nada.
- La retroalimentación de fallo incluye, igual que vPlay (engine.html:1078), `<p>Respuesta correcta: <b>fmt(labels[correct])</b></p>` antes de la explicación.
- **Estado "viajando":** el `onStation(i)` del motor hace lo siguiente:
  1. Cierra la hoja (`#trip-sheet` vacío y `hidden`).
  2. Mueve el foco al botón `tripquit`, para que no se pierda en `body`.
  3. `setPaused('sheet', false)`.
  4. `var g = tripGen; TD.scene.goTo(i).then(function () { if (g !== tripGen || !TD) return; … })`.

  Dentro de ese `then`: actualiza HUD y barra, escribe "Estación N: nombre" en `#trip-live`, muestra la hoja `arrive`, hace `setPaused('sheet', true)` y pone el foco en "Ver pregunta". La hoja sigue abierta en `ask` y `result`.

  **Si `#trip-confirm` está abierto** cuando se resuelve `goTo`, ese trabajo se guarda en `TD.pendingArrive` (una función) y se ejecuta al hacer `tripcancel`. No se le quita el foco a "Seguir".
- `scene.setLayers(n)` va en `onLayer`, y `scene.lost()` en `onResult` cuando `!ok`.
- `#trip-live` se crea **vacío una sola vez**, junto con `#trip-ui`, y nunca contiene el resultado.
- Las flechas del teclado llaman a `TD.scene.look(±10, 0)` o `look(0, ±10)`. Con `#trip-confirm` visible o en la fase `arrive`, las teclas 1-9 y Enter se ignoran.
- Las opciones usan **el mismo marcado que vPlay** (engine.html:1066): `<button class="opt" data-act="tripopt" data-k="i"><span class="key mono">i+1</span><span>fmt(label)</span></button>`.
- El keyPoint mostrado es `fmt(mod('M08').tById[kp.topic].keyPoints[kp.index])`, **no** `expect`.

- [ ] **Paso 1: agregar los casos a `tests/trip_engine.cjs`, que deben fallar.** Usan la escena falsa:
  - (n0) **Viajando:** la escena falsa devuelve en `goTo` una promesa controlable. Antes de resolverla:
    - `[data-act="tripask"]` no existe;
    - `document.activeElement` es `[data-act="tripquit"]`;
    - la escena recibió `setPaused('sheet', false)` sin ningún `setPaused('sheet', true)` posterior.

    Después de resolverla aparece la hoja.
  - (n) Tras resolver `goTo(0)`: `.pill` = "Estación 1 de 10", `.bar[aria-label]` = "Estación 1 de 10" y `#trip-live` contiene "Estación 1:". `[data-act="tripask"]` existe y tiene el foco.
  - (o) Clic en `tripask` → `.prompt` y `.opt[data-act="tripopt"]`, sin `.timer`, con el foco en la primera `.opt`. Responder la correcta (usa las copias de `findQ` y `optBtn`) → `.fb.good` con "Correcto", con el foco en `tripnext`. En `localStorage`, `topics['M08:'+q.topic]` termina en `1`, `xp` subió en `10*q.difficulty` y `session` se actualizó. `#trip-live` **no** contiene "Correcto".
  - (p) Responder mal → `.fb.bad` con "Paquete perdido: retransmitiendo" y "Respuesta correcta:", y `qs[q.id].q === true`. `#trip-live` no contiene "Paquete perdido". `tripnext` → otra pregunta del mismo tema.
  - (q) Dos clics seguidos en una opción registran un solo intento (`qs[q.id].a === 1`).
  - (r) Teclas: `1` responde; Enter con el foco en el body continúa; Enter con el foco en un botón no hace nada extra.
  - (s) `tripquit` después de responder abre la confirmación con el texto exacto, y el foco queda en "Seguir". Con la confirmación abierta, la tecla `1` no responde.
    - Esc la cierra y el foco vuelve a `[data-act="tripquit"]` del HUD.
    - Abierta otra vez, un clic en "Seguir" (`tripcancel`) hace lo mismo.
    - `tripconfirm` lleva a M08, llama a `dispose()` y deja `#trip-root` `hidden` y vacío.
  - (s2) **Confirmación durante el viaje:** con `goTo` pendiente, `tripquit` abre la confirmación. Al resolverse `goTo`, el foco sigue en "Seguir" y no aparece `tripask`. `tripcancel` → aparece la hoja `arrive`, con el foco en "Ver pregunta".
  - (t) Recorrido completo acertando todo. Bucle: `tripask` si existe, si no responde la correcta y luego `tripnext`, y **espera ticks** (`await new Promise(r => setTimeout(r, 0))` ×3) después de cada `tripnext`, porque `goTo().then` es asíncrono. Comprueba:
    - en la última estación, `.pill` y `.bar[aria-label]` dicen "Estación 10 de 10";
    - el resumen muestra la XP igual a `S.xp` final menos la inicial;
    - el foco está en `tripend`;
    - `tripreplay` no aparece;
    - `tripend` lleva a M08 sin confirmación, llama a `dispose()` y deja `#trip-root` `hidden` y vacío.
  - (u) Recorrido fallando solo la primera pregunta → `tripreplay` aparece y abre una ronda cuya `.pill` dice `1 / 1`, con `#trip-root` `hidden`. El `.chip` muestra el tipo de pregunta, no "Repaso de fallos". Respóndela **bien** (un fallo con XP alta puede abrir Regeneración) y pulsa `#nextbtn`: la pantalla de resultados muestra `.eyebrow` "Repaso de fallos" (engine.html:1097).
  - (p2) Al fallar, la escena falsa recibió `lost()`.
  - (v) **(Foco de revisión 1)** Siembra `w.Math.random` en `beforeParse` y recorre el viaje hasta que salga una pregunta `tf`. Comprueba que no hay `.timer`. Adelanta `w.performance.now` 13 s y **espera ≥ 250 ms reales**, porque el temporizador de rondas es un `setInterval` de 100 ms (engine.html:794). No debe aparecer `.fb`.
  - (w) **(Foco de revisión 2)** `boot()` sin `seed`: entrar al viaje y responder crea `estudio_isw_v1` con `topics['M08:…']`.
  - (x) `S.boss` no cambia en todo el recorrido.
- [ ] **Paso 2:** los casos nuevos fallan.
- [ ] **Paso 3: implementar.**
  - Agrega los `data-act` restantes (`tripask`, `tripopt`, `tripnext`, `tripconfirm`, `tripcancel`, `tripend`, `tripreplay`) al delegado de `#trip-root`. `tripopt` y `tripnext` exigen `TD && TD.flow`.
  - `TD.answered = true` tras la primera respuesta, para que `tripquit` sepa si debe confirmar.
  - `tripreplay`: primero `var fails = TD.flow.state().fails.slice();`, **después** `tripStop()` (que deja `TD = null`) y luego `startRound({ kind: 'replay', title: 'Repaso de fallos', mid: 'M08', back: { name: 'module', mod: 'M08' } }, shuffle(fails))`.
  - Teclado del viaje según §7, con `if (el.tagName === 'BUTTON') return` para Enter.
  - CSS de la hoja según §7: `max-height:60dvh` (`@media (orientation:landscape){max-height:85dvh}`), `overflow:auto`, fondo `var(--surface)`, `padding-bottom:env(safe-area-inset-bottom)` y `padding-left/right:max(16px, env(safe-area-inset-left/right))`, `position:absolute; left:0; right:0; bottom:0`. Al HUD, `padding-top:env(safe-area-inset-top)` y el mismo `padding-left/right`. `#trip-confirm` va con `position:absolute; left:0; right:0; bottom:0; z-index:2` (encima de la hoja) y con el mismo padding.
  - En `<meta name="viewport">`, agrega `, viewport-fit=cover`.
- [ ] **Paso 4: verificar.** `for i in $(seq 10); do node tests/trip_engine.cjs || echo FALLO; done` y suite verde.
- [ ] **Paso 5: commit.** Mensaje: `feat(trip): preguntas, registro, resumen y accesibilidad del viaje`.

---

### Tarea 7: `trip/scene.js`, la escena 3D real

**Archivos:**
- Crear: `trip/scene.js`, `tests/scene.cjs`
- Modificar: `build.mjs` (inserta `scene.js` en `/*__TRIP_CODE__*/`)

**Interfaces:**
- Produce `var TripScene = (function () { … return { create: create, buildWorld: buildWorld, Pauser: Pauser }; })(); if (typeof module !== 'undefined' && module.exports) module.exports = TripScene;`.
- `create(THREE, canvas, stations, opts)` → `Promise<api>`, con el contrato de la Tarea 5 (incluye `goTo` con promesa, `look`, `resize` que redibuja y el `dispose` ordenado). `opts` admite, solo para pruebas, `renderer`, `raf`, `caf`, `pixelRatio` y `search`. Valores por defecto, **siempre con guarda `typeof`, porque en Node no existen esas globales**:
  - `renderer`: `new THREE.WebGLRenderer({ canvas, antialias: false })`;
  - `raf` / `caf`: `requestAnimationFrame` / `cancelAnimationFrame` de `window`;
  - `pixelRatio`: `typeof devicePixelRatio !== 'undefined' ? devicePixelRatio : 1`;
  - `search`: `typeof location !== 'undefined' ? location.search : ''`.
- **Un solo rAF pendiente a la vez.** Una sola función interna `requestFrame()` agenda el rAF si no hay ninguno pendiente. El callback **limpia el id** antes de dibujar y vuelve a agendar solo si `pauser.running()` o si se pidió un cuadro suelto. `setPaused(…, false)`, `resize()`, `lost()`, `setLayers()` y `goTo()` con `reducedMotion` piden cuadro por `requestFrame()`: dibujan aunque haya pausa, sin abrir un segundo rAF. El bucle calcula `dt` **solo** con `pauser.tick(ts)`.
- **Pérdida de contexto durante la compilación:** `compileAsync` de r169 sondea cada 10 ms y no termina nunca si se pierde el contexto. `create` hace `Promise.race` entre `compileAsync(scene, camera)` y una promesa que rechaza con el evento `webglcontextlost` del canvas. Si rechaza, libera el renderer y propaga el rechazo; el motor muestra el respaldo.
- **Draw calls exactas:** ningún material transparente con `side: THREE.DoubleSide` (r169 los dibuja en 2 pasadas) y ningún arreglo de materiales en una malla (1 llamada por grupo).
- El `<div>` de fps (si `/fps=1/.test(search)`) se agrega a `canvas.parentNode` (`#trip-root`) y se quita en `dispose()`.
- `buildWorld(THREE, stations)` → `{ scene, camera, curve, stops, packet, rings, dispose }`:
  - `curve`: `THREE.CatmullRomCurve3`.
  - `stops`: 10 valores `t ∈ [0,1]`, uno por estación, crecientes.
  - `packet`: el objeto del paquete.
  - `rings`: 4 mallas de anillo.
  - `dispose()`: libera geometrías y materiales.
- `function Pauser()` → `{ set(reason, on), running(), tick(ts) }`:
  - `running()` es `true` solo si no hay ningún motivo activo.
  - `tick(ts)` devuelve `dt = last ? Math.min(50, ts - last) : 16` y actualiza `last`.
  - Al pasar de pausado a corriendo, `last = 0`.
- Valores fijos del §6:
  - `setPixelRatio(Math.min(opts.pixelRatio, 1.5))` y `setSize(canvas.clientWidth, canvas.clientHeight, false)`.
  - **Estilo holograma técnico (spec §6 "Estilo visual")**:
    - sin luces;
    - solo `MeshBasicMaterial`, `LineBasicMaterial` y `PointsMaterial`, como mucho 12 únicos y compartidos;
    - sin texturas, sombras ni postprocesado.
  - Paleta exacta: `BG=0x0b1220`, `GRID=0x1d2b47`, `LINE=0x7da2ff`, `CYAN=0x5ce1ff`, `GOOD=0x5fd39b`, `LOST=0xff8f84`, `CORE=0xf2b04a`.
  - `scene.background = new THREE.Color(BG)`, `scene.fog = new THREE.Fog(BG, 8, 40)`, y el suelo es un `GridHelper(80, 40, LINE, GRID)` con material `transparent`, `opacity 0.35`.
  - Dispositivos: `LineSegments(new EdgesGeometry(geo), lineMat)` más un relleno `Mesh(geo, fillMat)`. `fillMat` es `MeshBasicMaterial` con `transparent: true`, `opacity: 0.12`, `side: FrontSide` y `depthWrite: false`.
  - Partículas: `Points`, con 200 posiciones en un `BufferAttribute` que se actualiza en cada cuadro avanzando sobre `curve` (`needsUpdate = true`). Usan `PointsMaterial({ color: CYAN, size: 0.08, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false })`.
  - Paquete: `LineSegments(new EdgesGeometry(new IcosahedronGeometry(0.3, 0)))` cian más un núcleo `Mesh(IcosahedronGeometry(0.12, 0))` color `CORE`, cuya opacidad pulsa entre 0.6 y 1 a ~1 Hz.
  - Anillos: 4 `TorusGeometry(r, 0.02, 6, 32)` con `MeshBasicMaterial` translúcido de 4 colores (`CYAN`, `LINE`, `GOOD`, `CORE`). `setLayers(n)` los anima con escala 0→1 en 400 ms (easeOutCubic).
  - `goTo(i)`: la cámara recorre el riel desde la posición actual hasta `stops[i]` en 2500 ms (easeInOutCubic) y resuelve al llegar. `lost()`: el paquete y las partículas se tiñen de `LOST` durante 600 ms y luego vuelven a su color.
  - Con `reducedMotion` no hay rotación, pulso ni flujo de partículas, la cámara corta y los anillos aparecen sin animar.
  - Piezas repetidas con `InstancedMesh`.
  - `await renderer.compileAsync(scene, camera)` antes de resolver.
  - Con `opts.reducedMotion`, `goTo` coloca la cámara directamente en `stops[i]`, sin animar.
  - El giro se hace con Pointer Events y `setPointerCapture` sobre el canvas, limitado a ±60° de yaw y ±25° de pitch.
  - Si `search` incluye `fps=1`, se muestra el `<div>` con fps y `renderer.info.render.calls` (ver más arriba).

- [ ] **Paso 1: escribir `tests/scene.cjs`, que debe fallar.**
  - Usa `const THREE = await import(pathToFileURL(path.join(__dirname, '..', 'vendor', 'three.module.min.js')).href)`, `require('../trip/scene.js')` y las estaciones de `trip/stations.mjs`. No hay WebGL: `new WebGLRenderer()` lanza error en Node, así que nunca se crea en `scene.cjs`.
  - Casos:
    - (a) `buildWorld` devuelve 10 `stops` crecientes en `[0,1]`.
    - (b) Con `rings.forEach(r => r.visible = true)`, recorre con `traverseVisible`. La suma de triángulos (`index.count/3` o `position.count/3`, multiplicada por `count` en las `InstancedMesh`) es ≤ 30000.
    - (c) Con los anillos visibles, cuenta con `traverseVisible` los objetos con `o.isMesh || o.isLine || o.isPoints` (cada `InstancedMesh` cuenta **1 vez**, porque también es `isMesh`). El total es ≤ 100.
    - (c2) Hay ≥ 1 `InstancedMesh` (`o.isInstancedMesh`).
    - (c3) Ningún objeto dibujable tiene `Array.isArray(o.material)`, ni un material con `transparent && side === THREE.DoubleSide`.
    - (d) No hay ningún material con `map`. Todos son `MeshBasicMaterial`, `LineBasicMaterial` o `PointsMaterial` (`GridHelper` usa `LineBasicMaterial`). No hay ninguna `Light` en la escena.
    - (d2) `scene.background` es un `Color` con valor `0x0b1220` y `scene.fog` es un `Fog`.
    - (d3) Hay exactamente 1 `Points` con 200 vértices y `material.blending === THREE.AdditiveBlending`. Hay ≥ 3 `LineSegments` cuya geometría es `EdgesGeometry`, que corresponden a teléfono, router y servidor.
    - (e) Hay como mucho 12 materiales únicos.
    - (f) Antes de `dispose()`, junta con `traverse` las geometrías y materiales. Espía `THREE.BufferGeometry.prototype.dispose` y `THREE.Material.prototype.dispose`. Después de `dispose()`, todos fueron liberados, **incluida la geometría de cada `InstancedMesh`**, que `InstancedMesh.dispose()` no libera sola.
    - (f2) Prepara `create()` con lo siguiente:
      - `opts = { reducedMotion: true, renderer: falso, raf: falso, caf: falso, pixelRatio: 3, search: '' }`;
      - un canvas falso `{ clientWidth: 400, clientHeight: 800, parentNode: null, addEventListener(t, f){ guarda }, removeEventListener(){} }`;
      - un renderer falso que registra `setPixelRatio`, `setSize`, `render`, `compileAsync` (devuelve `Promise.resolve()`), `dispose` y `forceContextLoss`, y trae `info: { render: { calls: 0 } }`;
      - un `raf` falso que guarda los pendientes en un `Map` id→callback, con un `caf` que los borra.

      Comprueba:
      - `create` resuelve. `setPixelRatio` recibió `1.5` y `setSize` recibió `(400, 800, false)`.
      - `goTo(3)` resuelve.
      - **Nunca** hay más de 1 rAF pendiente en el `Map`, en toda la prueba.
      - Con `setPaused('sheet', true)`: ejecutar a mano el callback pendiente no agenda otro. Luego `resize()` sube **en 1** las llamadas a `render`.
      - `setPaused('sheet', false)` agenda un rAF, y al ejecutarlo dibuja (`render` +1).
      - `lost()` en pausa pide un cuadro (`render` +1 al ejecutar el pendiente).
      - Con un rAF pendiente, `dispose()` llama a `caf` con ese id, a `renderer.dispose` y a `forceContextLoss`. Después, `setPaused('x', false)` no llama a `raf`.
    - (f3) Si el `compileAsync` falso nunca resuelve y se despacha `webglcontextlost` en el canvas falso, `create` **rechaza** y se llama a `renderer.dispose`.
    - (g) **(Foco de revisión 5)** `Pauser`: con `set('sheet', true)` y luego `set('hidden', true)`, después `set('hidden', false)`, `running()` sigue en `false`; con `set('sheet', false)` pasa a `true`.
    - (h) `tick(1000)` y luego `tick(5000)` devuelven `dt = 50`.
    - (i) Después de reanudar, el primer `tick` devuelve 16.
- [ ] **Paso 2:** `node tests/scene.cjs` falla con `Cannot find module`.
- [ ] **Paso 3: implementar `trip/scene.js`.**
  - Escenario por estación (§2), todo en estilo holograma:
    - una plataforma translúcida con borde de líneas en cada `stops[i]`;
    - dispositivos en contorno más relleno: teléfono en la 1, router en la 6 y servidor en la 8;
    - las piezas repetidas van en `InstancedMesh` de relleno con sus contornos en un solo `LineSegments` combinado: nodos de "Internet" en la 7, y antenas u ondas en la 5 (anillos de onda translúcidos).
  - El paquete y los anillos siguen los valores fijos de arriba.
  - `lost()` usa un `setTimeout` de 600 ms para restaurar los colores y llama a `requestFrame()` al empezar y al terminar. Así se ve aunque la hoja esté abierta. `dispose()` cancela ese timeout.
  - En `build.mjs`, inserta `scene.js` después de `flow.js`.
- [ ] **Paso 4: verificar.** `node tests/scene.cjs` y suite verde. `trip_engine.cjs` sigue pasando porque usa la escena falsa.
- [ ] **Paso 5: commit.** Mensaje: `feat(trip): escena 3D low-poly`.

---

### Tarea 8: Verificación final y prueba manual en el teléfono

**Archivos:**
- Modificar: `README.md` (una línea sobre el viaje y los nuevos tests)

- [ ] **Paso 1: suite completa y repeticiones.** Suite verde. Además:
  - `for i in $(seq 10); do for f in trip trip_engine record record2 m08; do node tests/$f.cjs >/dev/null 2>&1 || echo "FALLO $f"; done; done`, sin ningún FALLO.
  - `node tests/adv/props.cjs 240 777` → 5 PASA.
  - `node tests/adv/fuzz_state.cjs 320 20261111` → 0 casos con problemas y 0 cuelgues.
- [ ] **Paso 1b: cabeceras para Netlify.** Crea `_headers` en la raíz con:
  - `Content-Security-Policy: default-src 'none'; script-src 'unsafe-inline' blob:; style-src 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: no-referrer`
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`

  Así queda listo para el despliegue, aunque desplegar es otra tarea. `blob:` hace falta para el `import()` de Three.
- [ ] **Paso 2: tamaño.** `ls -l juego_estudio.html` da unos 1.6 MB. `node validate.mjs` muestra el crecimiento sin vendor (≤ 90 KB frente a la versión publicada, si se pasa el respaldo como argumento).
- [ ] **Paso 3: prueba manual en escritorio.** Sirve el juego con `python3 -m http.server 8000`, abre `http://localhost:8000/juego_estudio.html?fps=1` y completa un viaje. Debe haber ≥ 30 fps y ≤ 100 calls, la cámara se debe poder girar con el mouse y Esc debe abrir la confirmación.
- [ ] **Paso 4: prueba manual en el teléfono.** La hace el usuario: se le pasa la lista de §9 "Revisión manual" y se apunta el resultado.
- [ ] **Paso 5: commit** del README. Usa la skill superpowers:finishing-a-development-branch.
