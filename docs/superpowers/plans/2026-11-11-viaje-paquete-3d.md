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
- Suite completa (el "verde" de cada tarea):
  `cd /home/josma/myprojects/juego && node build.mjs && node validate.mjs && for f in tests/*.cjs; do node "$f" >/dev/null 2>&1 || echo "FALLO $f"; done; echo FIN`
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

### Tarea 1: Comitear el arreglo de charset y extraer `recordAnswer()`

**Archivos:**
- Modificar: `engine.html:1-3` (ya modificado, falta comitear), `engine.html:823-866` (`finalize`)
- Pruebas: `tests/record.cjs`, `tests/record2.cjs` (existentes, no se tocan)

**Interfaces:**
- Produce: `function recordAnswer(q, ok, assisted, gain)` dentro de la IIFE. Hace `S.xp += gain`, actualiza el historial `S.topics[m.id + ':' + q.topic]` (antes líneas 845-846, usa `qmap[q.id].m.id`) y la cola `S.qs[q.id]` (antes 847-856). No llama a `touch`, `checkVirtues` ni `save`, y no lee `R`.

- [ ] **Paso 1: comitear el arreglo de charset pendiente**

```bash
cd /home/josma/myprojects/juego && git add engine.html juego_estudio.html && git commit -m "Declarar charset UTF-8, doctype y viewport" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
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
  - Usa `require('../trip/flow.js')`, las estaciones de `trip/stations.mjs` (vía `await import`), las preguntas de M08 desde `MODULES` en `juego_estudio.html` (como `allQs` en `tests/record.cjs`), `prep` como identidad con `{ q, labels: q.options || ['Verdadero','Falso'], correct: tf ? (q.answer ? 0 : 1) : q.answer }` y un `rnd` con semilla (mulberry32).
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
    - (i) `perStation[2].total === 2`.
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

- [ ] **Paso 2: escribir `tests/build_vendor.cjs`, que debe fallar.**
  - Con `child_process.spawnSync('node', ['build.mjs'], { cwd: raíz, env: { ...process.env, THREE_VENDOR: tmp } })`, donde `tmp` es un archivo temporal:
    - (a) Contenido `x</script>y`: código de salida distinto de 0, y `juego_estudio.html` mantiene el mismo `mtimeMs` que antes.
    - (b) Contenido `import a from"./three.core.min.js";`: código de salida distinto de 0.
  - Al final, `spawnSync('node', ['build.mjs'])` sin `THREE_VENDOR` sale con código 0. Comprueba también que el HTML contiene `id="three-src" data-version="0.169.0"` y que la secuencia `$&` del vendor real aparece literal dentro del bloque, sin haberse expandido.
- [ ] **Paso 3: implementar.**
  - En `engine.html`, agrega la línea `<!--__THREE__-->` antes de `<script>`.
  - En `build.mjs`:
    - Lee el vendor.
    - Lanza `Error('vendor: contiene </script')` si `/<\/script/i` coincide.
    - Lanza `Error('vendor: import relativo')` si `/from\s*["']\.\//` coincide.
    - Reemplaza `<!--__THREE__-->` por el bloque **con función**.
  - En `validate.mjs`:
    - Define `const vend = html.match(/<!-- VENDOR:THREE START -->[\s\S]*?<!-- VENDOR:THREE END -->/)` **justo después de leer `html` (línea 4), antes de la línea 23**. Si no está, `bad('Falta el bloque VENDOR:THREE')`.
    - Define `const htmlNoV = vend ? html.replace(vend[0], '') : html`.
    - Usa `htmlNoV` en lugar de `html` para:
      - el bucle de palabras prohibidas (línea 23). **Es obligatorio:** Three r169 contiene `palegoldenrod`, que coincide con `/LEGO/i`;
      - el recorte `eng` (línea 28);
      - la regex de URLs externas (línea 38);
      - el cálculo de crecimiento (línea 30: `Buffer.byteLength(htmlNoV)`).
    - Valida aparte que el bloque contiene `data-version="0.169.0"`, que no contiene `</script` interno (solo el de cierre) y que no tiene imports relativos.
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
- Contrato de escena, la fábrica que usará la Tarea 7: `F.create(THREE, canvas, stations, opts)` → `Promise<api>`, con `opts = { reducedMotion: boolean }`. `api` tiene estos métodos:
  - `goTo(i)` → `Promise` que se resuelve **cuando la cámara llega** a la estación `i`. Con `reducedMotion` se resuelve en el siguiente microtask. Mientras viaja, el bucle debe estar corriendo (sin el motivo `'sheet'`).
  - `setLayers(n)`.
  - `lost()`.
  - `look(dx, dy)`: gira la cámara en grados; lo usan las flechas del teclado.
  - `resize()`: hace `setSize(w, h, false)`, ajusta el aspect y **dibuja un cuadro aunque esté en pausa**.
  - `setPaused(reason, on)`.
  - `dispose()`: primero `cancelAnimationFrame` del único rAF pendiente y marca `disposed`; después libera geometrías y materiales, `renderer.dispose()` y `renderer.forceContextLoss()`. Después de `dispose()` no se agenda ningún rAF.
- `reducedMotion` se calcula en `tripStart` con el patrón protegido de engine.html:1133 (`try { … matchMedia('(prefers-reduced-motion: reduce)').matches } catch (e) { false }`). jsdom no tiene `matchMedia`.
- **Estructura de `#trip-root` en esta tarea**:
  - Mientras carga: `<p role="status">Preparando el viaje…</p>` y el botón `tripquit`.
  - Con la escena creada: `<canvas id="trip-cv" aria-hidden="true"></canvas><div id="trip-ui"><button class="btn sm ghost trip-quit" data-act="tripquit" aria-label="Salir del viaje">Salir</button></div>`.
  - El flujo (TripFlow) **no arranca en esta tarea**: la Tarea 6 llena `#trip-ui` y conserva ese botón.
- La fábrica se resuelve como `window.__TRIP_SCENE__ || (typeof TripScene !== 'undefined' ? TripScene : null)`. Si es `null`, se muestra el respaldo.

- [ ] **Paso 1: escribir `tests/trip_engine.cjs`, que debe fallar.**
  - **Copia** de `tests/record.cjs` las funciones `boot`, `norm`, `allQs`, `click`, `modBtn`, `btn`, `findQ`, `correctText` y `optBtn`. **No uses `require('./record.cjs')`**: ejecuta su suite y termina con `process.exit`. En `beforeParse` agrega siempre `w.Element.prototype.scrollIntoView = function () {}`, porque jsdom no lo trae. Además, agrégale opciones para definir en `beforeParse`:
    - `w.__TRIP_IMPORT__`: una función que cuenta llamadas y devuelve una promesa controlable.
    - `w.__TRIP_SCENE__`: una fábrica falsa cuyo `create` cuenta llamadas y devuelve una promesa de un objeto que registra cada método llamado.
    - `w.URL.createObjectURL = () => 'blob:x'` y `w.URL.revokeObjectURL = () => {}`.
  - Para entrar al viaje: `modBtn(d,'M08')` y luego un clic en `[data-act="trip"]`.
  - Para esperar la cadena de promesas: `await new Promise(r => setTimeout(r, 0))` varias veces.
  - Casos:
    - (a) El botón "Viaja como paquete" existe en M08 y **no** en M01.
    - (b) Al entrar: `#trip-root` sin `hidden`, contiene "Preparando el viaje…" con `role="status"` y un `[data-act="tripquit"]`; `#app` queda vacío y `body` tiene las clases `game` y `trip-on`.
    - (c) Si `__TRIP_IMPORT__` rechaza: aparece "Tu navegador no pudo abrir el viaje 3D." con `[data-act="tripround"]` y `[data-act="tripback"]`. "Volver" lleva a M08 (`.head h1` = "Redes informáticas"). "Hacer ronda de M08" abre una ronda (`.prompt` existe).
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
    - (l) **(Foco de revisión 4)** `w.dispatchEvent(new w.Event('resize'))` con la escena creada llama a `resize()`.
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
- **Estado "viajando":** el `onStation(i)` del motor hace lo siguiente:
  1. Cierra la hoja (`#trip-sheet` vacío y `hidden`).
  2. Mueve el foco al botón `tripquit`, para que no se pierda en `body`.
  3. `setPaused('sheet', false)`.
  4. `var g = tripGen; TD.scene.goTo(i).then(function () { if (g !== tripGen || !TD) return; … })`.

  Dentro de ese `then`: actualiza HUD y barra, escribe "Estación N: nombre" en `#trip-live`, muestra la hoja `arrive`, hace `setPaused('sheet', true)` y pone el foco en "Ver pregunta". La hoja sigue abierta en `ask` y `result`.
- `scene.setLayers(n)` va en `onLayer`, y `scene.lost()` en `onResult` cuando `!ok`.
- `#trip-live` se crea **vacío una sola vez**, junto con `#trip-ui`, y nunca contiene el resultado.
- Las flechas del teclado llaman a `TD.scene.look(±10, 0)` o `look(0, ±10)`. Con `#trip-confirm` visible o en la fase `arrive`, las teclas 1-9 y Enter se ignoran.
- Las opciones usan **el mismo marcado que vPlay** (engine.html:1066): `<button class="opt" data-act="tripopt" data-k="i"><span class="key mono">i+1</span><span>fmt(label)</span></button>`.
- El keyPoint mostrado es `fmt(mod('M08').tById[kp.topic].keyPoints[kp.index])`, **no** `expect`.

- [ ] **Paso 1: agregar los casos a `tests/trip_engine.cjs`, que deben fallar.** Usan la escena falsa:
  - (n0) **Viajando:** la escena falsa devuelve en `goTo` una promesa controlable. Antes de resolverla, `[data-act="tripask"]` no existe y la escena recibió `setPaused('sheet', false)` sin ningún `setPaused('sheet', true)` posterior. Después de resolverla aparece la hoja.
  - (n) Tras resolver `goTo(0)`: `.pill` = "Estación 1 de 10" y `#trip-live` contiene "Estación 1:". `[data-act="tripask"]` existe y tiene el foco.
  - (o) Clic en `tripask` → `.prompt` y `.opt[data-act="tripopt"]`, sin `.timer`. Responder la correcta (usa `findQ` y `optBtn` de `record.cjs`) → `.fb.good` con "Correcto". En `localStorage`, `topics['M08:'+q.topic]` termina en `1`, `xp` subió en `10*q.difficulty` y `session` se actualizó.
  - (p) Responder mal → `.fb.bad` con "Paquete perdido: retransmitiendo" y `qs[q.id].q === true`. `tripnext` → otra pregunta del mismo tema.
  - (q) Dos clics seguidos en una opción registran un solo intento (`qs[q.id].a === 1`).
  - (r) Teclas: `1` responde; Enter con el foco en el body continúa; Enter con el foco en un botón no hace nada extra.
  - (s) `tripquit` después de responder abre la confirmación con el texto exacto; el foco queda en "Seguir". Esc la cierra y el foco vuelve a `[data-act="tripquit"]` del HUD. Con la confirmación abierta, la tecla `1` no responde. `tripconfirm` lleva a M08.
  - (t) Recorrido completo acertando todo (bucle: `tripask` si existe, si no responde la correcta y luego `tripnext`) → el resumen muestra la XP igual a `S.xp` final menos la inicial. `tripreplay` no aparece. `tripend` lleva a M08 sin confirmación.
  - (u) Recorrido fallando solo la primera pregunta → `tripreplay` aparece y abre una ronda cuya `.pill` dice `1 / 1`. El `.chip` muestra el tipo de pregunta, no "Repaso de fallos"; ese título solo sale en `.eyebrow` de resultados (engine.html:1097). Al responderla, la pantalla de resultados muestra `.eyebrow` "Repaso de fallos".
  - (p2) Al fallar, la escena falsa recibió `lost()`.
  - (v) **(Foco de revisión 1)** Siembra `w.Math.random` en `beforeParse` y recorre el viaje hasta que salga una pregunta `tf`. Comprueba que no hay `.timer`. Adelanta `w.performance.now` 13 s y **espera ≥ 250 ms reales**, porque el temporizador de rondas es un `setInterval` de 100 ms (engine.html:794). No debe aparecer `.fb`.
  - (w) **(Foco de revisión 2)** `boot()` sin `seed`: entrar al viaje y responder crea `estudio_isw_v1` con `topics['M08:…']`.
  - (x) `S.boss` no cambia en todo el recorrido.
- [ ] **Paso 2:** los casos nuevos fallan.
- [ ] **Paso 3: implementar.**
  - Agrega los `data-act` restantes (`tripask`, `tripopt`, `tripnext`, `tripconfirm`, `tripcancel`, `tripend`, `tripreplay`) al delegado de `#trip-root`. `tripopt` y `tripnext` exigen `TD && TD.flow`.
  - `TD.answered = true` tras la primera respuesta, para que `tripquit` sepa si debe confirmar.
  - `tripreplay` hace `tripStop()` y luego `startRound({ kind: 'replay', title: 'Repaso de fallos', mid: 'M08', back: { name: 'module', mod: 'M08' } }, shuffle(fails))`.
  - Teclado del viaje según §7, con `if (el.tagName === 'BUTTON') return` para Enter.
  - CSS de la hoja según §7: `max-height:60dvh` (`@media (orientation:landscape){max-height:85dvh}`), `overflow:auto`, fondo `var(--surface)`, `padding-bottom:env(safe-area-inset-bottom)` y `padding-left/right:max(16px, env(safe-area-inset-left/right))`. Al HUD, `padding-top:env(safe-area-inset-top)`.
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
- `create(THREE, canvas, stations, opts)` → `Promise<api>`, con el contrato de la Tarea 5 (incluye `goTo` con promesa, `look`, `resize` que redibuja y el `dispose` ordenado). `opts` admite, solo para pruebas, `renderer`, `raf` y `caf`. Si faltan, se usan `new THREE.WebGLRenderer(...)`, `requestAnimationFrame` y `cancelAnimationFrame` de `window`. Hay **un solo rAF pendiente a la vez**: `setPaused(…, false)` no agenda otro si ya hay uno.
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
  - `new THREE.WebGLRenderer({ canvas, antialias: false })` y `setPixelRatio(Math.min(devicePixelRatio, 1.5))`.
  - 1 `DirectionalLight` y 1 `AmbientLight`.
  - Unos 8 `MeshLambertMaterial` compartidos, sin texturas ni sombras.
  - Piezas repetidas con `InstancedMesh`.
  - `await renderer.compileAsync(scene, camera)` antes de resolver.
  - Con `opts.reducedMotion`, `goTo` coloca la cámara directamente en `stops[i]`, sin animar.
  - El giro se hace con Pointer Events y `setPointerCapture` sobre el canvas, limitado a ±60° de yaw y ±25° de pitch.
  - Si `location.search` incluye `fps=1`, se muestra un `<div>` con fps y `renderer.info.render.calls`.

- [ ] **Paso 1: escribir `tests/scene.cjs`, que debe fallar.**
  - Usa `const THREE = await import(pathToFileURL(path.join(__dirname, '..', 'vendor', 'three.module.min.js')).href)`, `require('../trip/scene.js')` y las estaciones de `trip/stations.mjs`. No hay WebGL: `new WebGLRenderer()` lanza error en Node, así que nunca se crea en `scene.cjs`.
  - Casos:
    - (a) `buildWorld` devuelve 10 `stops` crecientes en `[0,1]`.
    - (b) Con `rings.forEach(r => r.visible = true)`, recorre con `traverseVisible`. La suma de triángulos (`index.count/3` o `position.count/3`, multiplicada por `count` en las `InstancedMesh`) es ≤ 30000.
    - (c) Con los anillos visibles, cuenta con `traverseVisible` los objetos con `o.isMesh || o.isLine || o.isPoints` (cada `InstancedMesh` cuenta **1 vez**, porque también es `isMesh`). El total es ≤ 100.
    - (c2) Hay ≥ 1 `InstancedMesh` (`o.isInstancedMesh`).
    - (d) No hay ningún material con `map`; todos son `MeshLambertMaterial` o `MeshBasicMaterial`.
    - (e) Hay como mucho 8 materiales únicos.
    - (f) Antes de `dispose()`, junta con `traverse` las geometrías y materiales. Espía `THREE.BufferGeometry.prototype.dispose` y `THREE.Material.prototype.dispose`. Después de `dispose()`, todos fueron liberados, **incluida la geometría de cada `InstancedMesh`**, que `InstancedMesh.dispose()` no libera sola.
    - (f2) `create()` con `opts = { reducedMotion: true, renderer: falso, raf: falso, caf: falso }` y un canvas falso `{ clientWidth: 400, clientHeight: 800, addEventListener(){}, removeEventListener(){} }`.
      - El renderer falso registra `setPixelRatio`, `setSize`, `render`, `compileAsync` (que devuelve `Promise.resolve()`), `dispose` y `forceContextLoss`, y trae `info: { render: { calls: 0 } }`.
      - Comprueba: resuelve; `goTo(3)` resuelve; `resize()` con `setPaused('sheet', true)` llama a `render` 1 vez.
      - `dispose()` llama a `caf`, `renderer.dispose` y `forceContextLoss`, y después ningún `setPaused(…, false)` llama a `raf`.
      - Dos `setPaused('x', false)` seguidos agendan 1 solo rAF.
    - (g) **(Foco de revisión 5)** `Pauser`: con `set('sheet', true)` y luego `set('hidden', true)`, después `set('hidden', false)`, `running()` sigue en `false`; con `set('sheet', false)` pasa a `true`.
    - (h) `tick(1000)` y luego `tick(5000)` devuelven `dt = 50`.
    - (i) Después de reanudar, el primer `tick` devuelve 16.
- [ ] **Paso 2:** `node tests/scene.cjs` falla con `Cannot find module`.
- [ ] **Paso 3: implementar `trip/scene.js`.**
  - Escenario por estación (§2): un nodo o plataforma por estación sobre el riel.
  - Dispositivos: teléfono en la 1, router en la 6 y servidor en la 8. Las piezas repetidas son nodos de "Internet" en la 7 y torres o postes en la 5.
  - El paquete es un cubo con hasta 4 anillos visibles según `setLayers(n)`.
  - `lost()` hace un parpadeo rojo del paquete durante 600 ms, sin sacudidas con `reducedMotion`.
  - En `build.mjs`, inserta `scene.js` después de `flow.js`.
- [ ] **Paso 4: verificar.** `node tests/scene.cjs` y suite verde. `trip_engine.cjs` sigue pasando porque usa la escena falsa.
- [ ] **Paso 5: commit.** Mensaje: `feat(trip): escena 3D low-poly`.

---

### Tarea 8: Verificación final y prueba manual en el teléfono

**Archivos:**
- Modificar: `README.md` (una línea sobre el viaje y los nuevos tests)

- [ ] **Paso 1: suite completa y repeticiones.** Suite verde. Además: `for i in $(seq 10); do for f in trip trip_engine record record2 m08; do node tests/$f.cjs >/dev/null 2>&1 || echo "FALLO $f"; done; done`, sin ningún FALLO.
- [ ] **Paso 2: tamaño.** `ls -l juego_estudio.html` da unos 1.6 MB. `node validate.mjs` muestra el crecimiento sin vendor (≤ 90 KB frente a la versión publicada, si se pasa el respaldo como argumento).
- [ ] **Paso 3: prueba manual en escritorio.** Sirve el juego con `python3 -m http.server 8000`, abre `http://localhost:8000/juego_estudio.html?fps=1` y completa un viaje. Debe haber ≥ 30 fps y ≤ 100 calls, la cámara se debe poder girar con el mouse y Esc debe abrir la confirmación.
- [ ] **Paso 4: prueba manual en el teléfono.** La hace el usuario: se le pasa la lista de §9 "Revisión manual" y se apunta el resultado.
- [ ] **Paso 5: commit** del README. Usa la skill superpowers:finishing-a-development-branch.
