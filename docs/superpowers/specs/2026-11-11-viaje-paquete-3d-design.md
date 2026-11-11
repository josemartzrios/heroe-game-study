# Diseño: "Viaja como paquete", piloto 3D de M08 Redes

Fecha: 2026-11-11 · Estado: borrador v5, corregido tras tres revisiones (`/review`) con todas las mejoras

## 1. Propósito y alcance

**Objetivo:** que el espacio 3D *enseñe* el concepto, no que lo decore. El jugador es un paquete que viaja de su teléfono a un servidor web y vive en primera persona la encapsulación, el router, la red y los puertos.

**Alcance del piloto:** solo M08 "Redes informáticas". No cambia el comportamiento de los demás módulos, del mundo 2D (incluida su región de Redes), del modo héroe ni del jefe.

**Restricciones:**
- Primero móvil, en navegador; también funciona en escritorio con mouse y teclado.
- Sigue siendo **un solo HTML** autocontenido (`juego_estudio.html`), válido para WhatsApp y Netlify.
- La clave de `localStorage` `estudio_isw_v1` y los IDs existentes no cambian.
- **Nada de contenido nuevo sobre redes:** el texto educativo del viaje sale de los `keyPoints` y preguntas existentes de M08 (regla de la Parte B de `contracts/CONTRATO_M08_redes.md`).
- **Los exámenes se respetan:** el viaje no reemplaza rondas, repaso ni jefe; no escribe en `S.boss`; no usa poderes.

**Criterios de éxito:**
- El viaje se completa en un teléfono de gama media a ≥ 30 fps, sin tirones, con la pestaña en ≤ ~300 MB.
- Three.js no se parsea ni se ejecuta hasta que se entra al viaje. El único costo fijo es el texto incrustado (~0.7 MB). El nodo del DOM se borra tras el primer import, pero el motor de JS conserva el texto fuente del módulo durante la sesión, así que el costo cambia de sitio y no desaparece. Es aceptable.
- Salir y volver a entrar varias veces no hace crecer la memoria (Three se importa una sola vez por sesión).
- Cada respuesta del viaje actualiza historial del tema (estrellas, dominio), cola de repaso, XP, sesión y racha de días con las **mismas reglas** que una respuesta de ronda (§4).
- `tests/record.cjs`, `tests/record2.cjs` y el resto de la suite siguen pasando sin cambios.

## 2. El viaje y sus estaciones

Recorrido sobre rieles: la cámara avanza sola por una curva y el jugador puede girarla (opcional, nunca hace falta para avanzar). En cada estación el avance se detiene para tomar una decisión.

| # | Estación | Qué se ve | Temas |
|---|---|---|---|
| 0 | Prólogo: la red | Vista aérea de dispositivos autónomos conectados | T01 |
| 1 | Aplicación (tu teléfono) | Nace el mensaje del navegador | T05, T11 |
| 2 | Transporte | Elegir TCP o UDP; se agrega el puerto | T09, T10, T12 |
| 3 | Red | Se estampan IP de origen y destino | T07 |
| 4 | Enlace y física | Envoltura en trama; el paquete se vuelve señal | T08, T02 |
| 5 | El medio inalámbrico | Del teléfono al router por wifi (ondas); ancho de banda | T02, T14 |
| 6 | Router de casa | El router reparte la conexión de la LAN y la saca a la WAN | T04 |
| 7 | Cable e Internet | Por cable hacia la red de redes; envío unicast; latencia | T02, T03, T04, T14 |
| 8 | Servidor | Desencapsulación en orden inverso; entrada al puerto | T05, T12, T11 |
| 9 | Epílogo | OSI frente a TCP/IP; reto "reconoce la capa" | T06, T13, T15 |

Los 15 temas de M08 aparecen al menos una vez. Todos tienen ≥ 8 preguntas. El orden 5 → 6 → 7 sigue el keyPoint de T04 (content_m08.mjs): en casa, el router reparte la conexión.

**Numeración:** la columna `#` es el índice interno (0-9). Al jugador siempre se le muestra **N = índice + 1** ("Estación 1 de 10" … "Estación 10 de 10"), en el HUD, en los anuncios y en las pruebas, igual que `vPlay` muestra `R.i + 1` (engine.html:1050).

**Encapsulación visible:** el paquete gana anillos de color al bajar por las capas y los pierde en orden inverso en el servidor. Los anillos no llevan texto (sin texturas). Las etiquetas van en el HUD HTML como una pila de chips sincronizada con la escena: `Datos · Puerto · IP · Trama`.

**Duración:** ~8–12 min, con 1–2 decisiones por estación (10–20 preguntas por viaje).

## 3. Mecánica de decisiones

Ciclo por estación:
1. **Ver:** la cámara llega a la estación y se anuncia "Estación N: nombre". En la hoja inferior aparece el `keyPoint` del tema, renderizado con `fmt()` (engine.html:353) para que las `**negritas**` y el `` `código` `` no salgan con asteriscos, y un botón **"Ver pregunta"** que recibe el foco. El jugador lee a su ritmo; nada avanza solo.
2. **Decidir:** al tocar "Ver pregunta", el bucle de render se detiene y aparece una pregunta del banco de M08 de un tema de esa estación (mcq, tf, scenario o error), sin repetir dentro del mismo viaje. En el viaje las `tf` **no** tienen temporizador.
3. **Consecuencia:**
   - **Acierto:** feedback "Correcto" y botón "Continuar". El paquete avanza y, si toca, gana su capa.
   - **Error:** feedback "Paquete perdido: retransmitiendo" con la explicación de la pregunta, luego otra pregunta del mismo tema (retransmisión).
   - **Dos errores seguidos en la misma decisión:** el viaje sigue de todos modos. La pregunta fallada ya entró a la cola de repaso por el registro normal.
   - Si un tema se queda sin preguntas nuevas, se reutiliza una ya vista en este viaje.
   - Desde el primer toque las opciones quedan desactivadas hasta la siguiente pregunta, para que un doble toque no registre dos veces.

**Resumen final:** el camino recorrido con el paquete completo, aciertos por estación y XP ganada. Tiene dos botones:
- **"Terminar"** (`tripend`, `.btn primary`, recibe el foco): vuelve a M08 sin confirmación.
- **"Repasar lo que fallé"** (`tripreplay`): abre `startRound({ kind: 'replay', title: 'Repaso de fallos', mid: 'M08', back: { name: 'module', mod: 'M08' } }, shuffle(fallosDelViaje))`, con el mismo patrón que `data-act="replay"` (engine.html:2108). No usa `kind: 'review'`, que abriría la cola global de todos los módulos. Si el viaje no tuvo fallos, el botón no se muestra (`startRound` no hace nada con una lista vacía, engine.html:777).

**Salir a medias:** "Salir" siempre visible. Si ya hubo respuestas, pide una confirmación breve: un `.banner` dentro de `#trip-root` con el texto "¿Salir del viaje? Lo que respondiste ya quedó guardado." y dos botones, "Salir" (`tripconfirm`) y "Seguir" (`tripcancel`). El foco va a "Seguir". Esc o "Seguir" cierran la confirmación y el foco vuelve al botón "Salir" del HUD. Con la confirmación abierta, Esc no la vuelve a abrir. El siguiente viaje empieza desde el principio, porque el estado del viaje no se guarda.

## 4. Conexión con el progreso

El registro de progreso hoy vive en `finalize()` (engine.html:823-866), mezclado con el estado de ronda `R`. Se separa así, **sin cambiar el comportamiento de las rondas**:

```
// engine.html, nueva función. Solo escribe en S.
function recordAnswer(q, ok, assisted, gain) {
  S.xp += gain;
  // historial del tema (líneas 845-846 actuales)
  // cola de repaso S.qs (líneas 847-856 actuales)
}
```

**Orden obligatorio para quien la llame:** `touch()` → calcular `gain` → `recordAnswer(...)` → `checkVirtues()` → `save()`. `touch()` va primero porque actualiza `S.session` (la graduación de la cola usa `r.gs !== S.session`) y la racha de días (de ella depende `passivePct()`, engine.html:802). Por eso `touch()` no va dentro de `recordAnswer`.

- **`finalize()`** sigue calculando `gain` exactamente igual (racha `R.consec`, bono tf, ayudas, `passivePct()`, humildad en `review`) y mantiene `R.ok/R.xp/R.baseXp/R.assisted/R.log`, la batalla y el escudo. De la línea 844 (`R.xp += gain; S.xp += gain;`) **conserva** `R.xp += gain`. Solo `S.xp += gain` y las líneas 845-856 pasan a `recordAnswer(q, ok, assisted, gain)`. Lo verifica `tests/record.cjs`, que debe pasar sin modificarse.
- **Quién guarda qué en el viaje:** `flow` lleva el contador de aciertos seguidos (`consec`), la lista de fallos y la XP acumulada. Por cada respuesta llama a `onResult({ q, ok, consec })`. El motor hace `touch()`, calcula `gain`, llama a `recordAnswer`, `checkVirtues()` y `save()`, y **devuelve `gain`**. `flow` lo suma para el resumen. La fórmula vive solo en el motor.
- **El viaje** usa la misma fórmula que una ronda sin poderes (engine.html:833-839): `base = ok ? 10 * q.difficulty + (consecViaje >= 3 ? 5 : 0) : 0` y `gain = base + Math.floor(base * passivePct() / 100)`. `passivePct()` es un porcentaje, no una suma. Usa su propio contador de aciertos seguidos, `assisted` siempre es `false` y no hay bono tf ni humildad (esa solo aplica en `review`).
- **El viaje no pasa por `finish()`**, así que no cuenta para `S.stats.roundsNoPower`, el bono de integridad ni la virtud enfoque. Es una decisión explícita: esas virtudes premian rondas, y el viaje no es una ronda.

## 5. Arquitectura e integración

### Formato de los archivos
El motor es un `<script>` clásico (engine.html:337). `const MODULES` va al inicio, fuera de la IIFE (338-342), y la IIFE empieza en la línea 344 y termina en la 2151. No admite `import` ni `export`.

- `trip/stations.mjs`: **solo datos**, en ESM. `build.mjs` lo importa en Node y lo escribe como `var TRIP_STATIONS = <JSON.stringify>;` en el ancla `/*__TRIP__*/`. Es un patrón nuevo: `expand()` genera literales dentro de `MODULES` y no sirve aquí. Cada estación guarda `id`, `name`, `topics` y `kp: [{ topic, index, expect }]`, donde `expect` es un fragmento corto del `keyPoint` esperado. Así `validate.mjs` detecta si alguien reordena los keyPoints.
- `trip/flow.js`: máquina de estados sin Three.js, escrita como `var TripFlow = (function () { … return { create: create }; })(); if (typeof module !== 'undefined' && module.exports) module.exports = TripFlow;`. `create(deps)` recibe `{ stations, questionsByTopic, rnd, onStation, onAsk, onResult, onLayer, onSummary }`. No hay bus de eventos: son callbacks directos. Expone `start()`, `ask()` (lo dispara "Ver pregunta"), `answer(k)`, `next()` y `state()`. `onResult` devuelve `gain` (§4).
- `trip/scene.js`: Three.js, escrito como `var TripScene = (function () { … return { create: create }; })();`. `create(THREE, canvas, stations, opts)` devuelve una promesa (ver `compileAsync`, §6) de `{ goTo(i), setLayers(n), lost(), look(dx, dy), resize(), setPaused(reason, on), dispose() }`. Detalles del contrato:
  - `goTo(i)` devuelve una promesa que se resuelve **cuando la cámara llega**. Con reduced-motion se resuelve al instante. La hoja de la estación se muestra solo después de esa promesa (estado "viajando"), así que mientras viaja el bucle corre sin el motivo `'sheet'`.
  - `look(dx, dy)` gira la cámara (flechas del teclado).
  - `resize()` redibuja un cuadro aunque esté en pausa.
  - `dispose()` cancela primero el único rAF pendiente y después libera los recursos. No hace `import`: recibe `THREE` como parámetro.
- `vendor/three.module.min.js`: **Three.js r169 (0.169.0)** con versión fija y su encabezado de licencia MIT. A partir de r171 el archivo importa `./three.core.min.js`, y una ruta relativa no se resuelve desde un `blob:`, así que **no se actualiza** sin rediseñar la carga.

### Build (`build.mjs`)
- Ancla nueva `/*__TRIP__*/` dentro de la IIFE del motor, donde se insertan `TRIP_STATIONS`, `flow.js` y `scene.js`.
- Three va fuera del script del motor, entre marcadores:
  `<!-- VENDOR:THREE START --><script type="text/plain" id="three-src">…</script><!-- VENDOR:THREE END -->`.
- Toda inserción nueva usa `tpl.replace(anchor, () => texto)` (o `split/join`). Con una cadena de reemplazo, secuencias como `$&` dentro del código minificado corromperían el HTML sin dar error.
- `build.mjs` **falla** si el vendor contiene `</script` o un import relativo (`from"./` / `from './`).

### Cambios en `engine.html`
- `recordAnswer()` extraída (§4).
- Vista nueva `trip`. `render()` llama a `tripStop()` al inicio, junto a `worldStop()`, y a `tripStart()` después del `innerHTML` cuando `V.name === 'trip'`. Así cualquier `go()` libera la escena. En la vista `trip`, `#app` queda **vacío** (no hay `vTrip()`): todo lo visible vive en `#trip-root`.
- El canvas del viaje vive en un contenedor propio **fuera de `#app`** (`#trip-root`, hijo de `body`). Durante el viaje **nunca** se llama a `render()`: la capa de preguntas y el HUD se actualizan en sus propios contenedores.
- `#trip-root` cubre toda la pantalla, **incluido el header**. Durante el viaje solo se sale con "Salir" o Esc (las dos pasan por la confirmación del §3) o cuando falla la carga. No hay atajo por el header que se salte la confirmación.
- **Eventos:** el delegado de clics actual solo escucha en `#app` (engine.html:2078) y no ve `#trip-root`. Al iniciar el motor se registra **una sola vez** un segundo delegado `tripRoot.addEventListener('click', …)` que atiende las acciones del viaje (lista abajo). **Filtra por `V.name === 'trip'`, no por `TD`**: así "Salir", Esc y los botones del respaldo funcionan mientras carga, si la carga falla y tras `webglcontextlost`, porque en esos tres estados `TD` es null. Solo `tripopt` y `tripnext`, que tocan la escena y el flujo, exigen además `TD`.
- Acciones propias, todas atendidas por el delegado de `#trip-root`:
  - `tripopt` / `tripnext`: responder y continuar.
  - `tripquit`: pide confirmación si hubo respuestas; si no, sale directo.
  - `tripconfirm` / `tripcancel`: confirma o cancela la salida.
  - `tripask`: "Ver pregunta" tras el keyPoint.
  - `tripend`: botón "Terminar" del resumen, sale sin confirmación.
  - `tripreplay`: "Repasar lo que fallé", con los fallos que guarda `flow`, no `R.log`.
  - `tripround`: respaldo "Hacer ronda de M08", hace `tripStop()` y luego `startRound` del quiz de M08.
  - `tripback`: respaldo "Volver", sale sin confirmación.

  No se reutilizan `opt`, `next`, `quit` ni `back`, que operan sobre la ronda `R` y regresarían a la última ronda jugada. Al salir siempre se vuelve a `{ name: 'module', mod: 'M08' }`.
- Botón "Viaja como paquete" en la pantalla de M08 (`data-act="trip"` en el delegado de `#app`, hace `go('trip')`). El doble toque no importa: el primer toque ya vuelve a pintar `#app` y quita el botón, y `threeP` más `tripGen` evitan dos cargas o dos escenas.
- `trip` se agrega al `toggle('game', …)` de `render()` (engine.html:1186) para que la tarjeta use los estilos de `body.game .qcard`.
- `<meta name="viewport">` gana `viewport-fit=cover`. Esa etiqueta viene del arreglo de charset, todavía sin comitear (engine.html:1-3). **Se comitea antes de empezar** la implementación.

### Carga diferida (una sola vez por sesión)
```
var threeP = null;
function dynImport(u) { return (window.__TRIP_IMPORT__ || function (x) { return import(x); })(u); }
function loadThree() {
  if (threeP) return threeP;
  try {
    var el = document.getElementById('three-src');
    var url = URL.createObjectURL(new Blob([el.textContent], { type: 'text/javascript' }));
  } catch (e) { return Promise.reject(e); }   // sin Blob URL → respaldo, nunca un throw síncrono
  threeP = dynImport(url).then(function (m) { URL.revokeObjectURL(url); el.remove(); return m; },
                           function (e) { URL.revokeObjectURL(url); threeP = null; throw e; });
  return threeP;
}
```
Así el módulo no se duplica en memoria al reentrar. Si falla, se puede volver a intentar.

### Ciclo de vida de la escena
- **Token de generación** `tripGen` (entero): `tripStop()` lo incrementa siempre, y `tripStart()` lo incrementa y guarda su valor en `gen`.
- `tripStart()`: muestra "Preparando el viaje…" y espera `loadThree()`. Cuando resuelve, si `gen !== tripGen || V.name !== 'trip'`, **aborta sin crear nada**: el jugador salió mientras cargaba. Si no, espera `TripScene.create(...)` (incluye `compileAsync`) y **vuelve a comprobar `gen`** después de ese `await`. Si cambió, hace `dispose()` de la escena recién creada y aborta. Si no, crea `TripFlow` y arranca. Si la carga falla con el mismo `gen`, muestra el respaldo.
- `tripStop()`: incrementa `tripGen`. Si hay escena, hace `cancelAnimationFrame`, **quita el listener `webglcontextlost`** (si no, `forceContextLoss()` lo dispararía y mostraría el respaldo en cada salida normal), hace `dispose()` de geometrías, materiales y renderer, `renderer.forceContextLoss()`, quita el canvas y deja `TD = null`. **Siempre** termina con `tripRoot.hidden = true; tripRoot.innerHTML = ''`, para que el HUD, la hoja, el resumen o el respaldo no sigan tapando la app. `tripStart()` hace `tripRoot.hidden = false`.
- Los listeners globales `resize` y `visibilitychange` se registran **una sola vez** al iniciar el motor y verifican `if (TD)`. El de `keydown` del viaje es **un listener propio** (no se toca el de rondas de engine.html:2138, que depende de `R`) y filtra por `V.name === 'trip'`, como el delegado de clics, para que Esc funcione también mientras carga y en el respaldo. El registro único sigue el patrón del mundo con `WD` (engine.html:2074). Tras un resize se dibuja un cuadro aunque el bucle esté en pausa.
- `webglcontextlost` en el canvas (solo si `TD && ev.target === TD.canvas`) llama a `tripStop()` y después muestra el aviso de respaldo en `#trip-root` (que vuelve a `hidden = false` solo para el aviso). Lo respondido ya quedó guardado.

### Sin WebGL o si la carga falla
Se usa un `.banner` con el texto "Tu navegador no pudo abrir el viaje 3D." y dos `.btn` dentro de `#trip-root`: "Hacer ronda de M08" (`tripround`, quiz normal del módulo) y "Volver" (`tripback`). Los dos funcionan con `TD` en null. El resto del juego sigue funcionando.

## 6. Rendimiento

- ≥ 30 fps en gama media, ≤ ~30k triángulos y **≤ 100 draw calls** (`renderer.info.render.calls`, que también se muestra con `?fps=1`). En móvil, el costo de CPU por malla pesa más que los triángulos. Las piezas repetidas (dispositivos, postes, nodos) usan `InstancedMesh`, que está en el núcleo de r169. `mergeGeometries` no está: es un addon.
- **Toda la escena se construye al entrar**, sin cargar estaciones por tramos. Hay unos 8 materiales compartidos por color y se hace `await renderer.compileAsync(scene, camera)` (existe en r169) antes del primer cuadro, para que no haya tirones al llegar a una estación ni se congele "Preparando el viaje…".
- Sin sombras en tiempo real ni texturas. Colores planos, 1 luz direccional y 1 ambiental.
- `antialias: false` y `setPixelRatio(Math.min(devicePixelRatio, 1.5))`.
- **Pausa con motivos:** `setPaused(reason, on)` lleva un conjunto de motivos (`'sheet'` cuando la hoja con keyPoint o pregunta está abierta, `'hidden'` con `document.hidden`). El bucle corre **solo si el conjunto está vacío**. Así, volver de otra app con una pregunta abierta no lo reanuda. `dt = last ? Math.min(50, ts - last) : 16` (el tope de 50 ms es el de engine.html:1759). Además, **nuevo respecto al mundo 2D**, al reanudar se pone `last = 0`, para que la cámara no salte estaciones al volver de otra app. La posición en el riel viene del estado de `flow`, no del reloj absoluto.
- Medidor de fps opcional con `?fps=1`.
- Tamaño estimado: ~0.9 MB hoy → ~1.6 MB.

## 7. Interfaz móvil y accesibilidad

**Pantalla:**
- `#trip-root` va en posición fija a `100dvh`. El canvas lleva `touch-action: none` y `overscroll-behavior: none` y se gira con Pointer Events y `setPointerCapture`. El scroll del `body` se bloquea solo en la vista `trip`.
- HUD superior: "Salir" (≥ 44 px, `aria-label="Salir del viaje"`), píldora "Estación N de 10", `.bar role="img" aria-label="Estación N de 10"` y la pila de chips de capas. Usa `padding` con `env(safe-area-inset-top/left/right)`.
- Capa de pregunta: hoja inferior con fondo opaco `var(--surface)`, `max-height: 60dvh` (85dvh en horizontal) y scroll interno, con `padding-bottom: env(safe-area-inset-bottom)` y `padding-left/right: max(16px, env(safe-area-inset-left/right))`, para que en horizontal la muesca no tape `.opt .key`. Tras responder se hace `scrollIntoView({ block: 'nearest' })` de la `.fb` dentro de la hoja. Reutiliza `.qcard`, `.opt` y `.fb`, pero con `data-act` propios. Las dos orientaciones están permitidas.

**Accesibilidad:**
- El canvas lleva `aria-hidden="true"`, porque toda la información está en HTML.
- Región `.sronly aria-live="polite"`: anuncia **solo la llegada**, "Estación N: nombre". El keyPoint no se anuncia ahí: está en la hoja y el foco va a "Ver pregunta". El resultado ("Correcto" / "Paquete perdido: retransmitiendo") lo anuncia **solo** la `.fb` con su `role="status"` (engine.html:1077), para que no se lea dos veces.
- Foco: "Ver pregunta" al llegar, la primera opción al abrir la pregunta, "Continuar" después de responder, "Terminar" en el resumen y "Seguir" en la confirmación.
- Teclado (listener propio del viaje, §5): 1-9 eligen opción; Enter continúa, salvo cuando el foco está en un botón (`if (el.tagName === 'BUTTON') return`, como engine.html:2142), para no avanzar dos veces; Esc abre la confirmación o la cierra si ya está abierta; las flechas giran la cámara (opcional).
- **`prefers-reduced-motion`:** sin trayecto de cámara. Entre estaciones hay un corte o un fundido corto, la pérdida no sacude nada (solo texto y color) y la cámara no gira sola.

**Estados:** cargando ("Preparando el viaje…", `role="status"`, con "Salir" activo), viaje, pregunta, resultado, resumen y respaldo sin WebGL.

## 8. Validación (`validate.mjs`)

- Antes de la lista de palabras prohibidas (línea 23) y de las reglas del motor (`<img`, `fetch(`, `new Image`, URLs externas; líneas 28-29 y 38) se **recorta** el bloque entre `VENDOR:THREE START/END`. Three contiene de forma legítima `fetch(`, `http://www.w3.org/1999/xhtml` y `palegoldenrod`, que coincide con `/LEGO/i`.
- El vendor se valida aparte: existe, declara la versión `169`, no contiene `</script` ni imports relativos.
- La regla de crecimiento (línea 30, ≤ 90 KB frente a la versión publicada) se calcula **sin el bloque vendor**. Así sigue protegiendo el código propio.
- Estaciones: cada tema de `TRIP_STATIONS` existe en M08, los 15 temas están cubiertos y cada `kp` apunta a un índice que existe y cuyo texto incluye su `expect`.
- Los bloques `MODULE:M01..M10` no cambian: nada del viaje va dentro de esos marcadores.

## 9. Pruebas

- **`tests/record.cjs`** (56 comprobaciones) y **`tests/record2.cjs`** (51: orden `touch` → gain, `checkVirtues` → `save`, `R.xp` mostrado igual a `S.xp` guardado, batalla, jefe y escudo) ya existen. Fijan el comportamiento actual del registro y deben pasar **sin modificarse** antes y después de extraer `recordAnswer`.
- **`tests/trip.cjs`** (nuevo, unitario): hace `require('../trip/flow.js')` con dependencias falsas y un `rnd` con semilla. Casos: recorre todas las estaciones en orden; `onStation` recibe el índice 0-9 y la UI muestra N = índice + 1; `consec` sube con aciertos y vuelve a 0 con un fallo; la lista de fallos y la XP acumulada (suma de lo que devuelve `onResult`) son correctas; un acierto avanza; un error retransmite con otra pregunta del mismo tema; dos errores continúan; no se repiten preguntas mientras haya disponibles y se reutilizan cuando se agotan; `onLayer` sube y luego baja en el servidor; un doble `answer()` se ignora; salir a medias no deja estado. Se corre ≥ 10 veces.
- **Ganchos solo para pruebas** (jsdom no tiene `URL.createObjectURL`, y un `import()` dinámico aborta el proceso). Son **dos**:
  - `window.__TRIP_IMPORT__`: reemplaza el `import()` dentro de `dynImport` (ver el código de la carga diferida en §5). Todo pasa por el `loadThree()` real, con su caché.
  - `window.__TRIP_SCENE__`: reemplaza `TripScene`.

  Las pruebas los definen en `beforeParse` y simulan `URL.createObjectURL` / `revokeObjectURL`. En producción no existen.
- **`tests/trip_engine.cjs`** (nuevo, integración en jsdom):
  - Con `__TRIP_IMPORT__` rechazando: aparece el respaldo sin errores de consola.
  - Sin `URL.createObjectURL` simulado: también aparece el respaldo, sin excepciones síncronas.
  - Con los dos ganchos (import falso que cuenta llamadas y escena falsa que registra llamadas): se responde una estación y en `localStorage` cambian `S.topics`, `S.qs`, `S.xp` y `S.session` según §4. La XP del resumen es la suma de los `gain` devueltos.
  - Salir con "Salir", con confirmación, llama a `dispose()` y vuelve a M08. "Seguir" y Esc cancelan la confirmación.
  - **Caché:** entrar, salir y volver a entrar llama a `__TRIP_IMPORT__` **una sola vez**.
  - Salir normal **no** muestra el respaldo (el `webglcontextlost` de `forceContextLoss()` no lo dispara).
  - **Salir mientras carga** (import falso con una promesa que se resuelve después): la escena falsa nunca se crea. "Salir" y Esc responden con `TD` en null.
  - Después de cualquier salida (Salir, Terminar, respaldo, `go()`), `#trip-root` queda `hidden` y vacío, y `#app` muestra M08.
  - Respaldo: "Hacer ronda de M08" abre el quiz de M08 y "Volver" regresa a M08, con `TD` en null.
  - "Terminar" en el resumen sale sin confirmación.
  - Los clics en `#trip-root` (`tripopt`/`tripnext`) llegan al flujo.
  - "Repasar lo que fallé" abre `replay` con los fallos del viaje y no aparece si no hubo fallos.
- `build.mjs` falla con un vendor que tenga `</script` o un import relativo (prueba con un archivo falso).
- La suite existente (`smoke`, `hero`, `world`, `battle`, `m03`–`m10`) sigue pasando.
- **Revisión manual en el teléfono:** fluidez a ≥ 30 fps con `?fps=1`, giro con el dedo sin que la página haga scroll, orientación horizontal, salir y volver a entrar 5 veces sin que crezca la memoria, y regresar de otra app a mitad del viaje.

## 9b. Endurecimiento previo y despliegue

- Antes del refactor de `recordAnswer`, `migrate()` normaliza los tipos del estado guardado. Los ataques de `tests/adv/attacks.cjs` mostraron que un `estudio_isw_v1` corrupto impedía arrancar o congelaba `finalize()`. También se endurece `touch()` contra el reloj que retrocede, se avisa cuando `save()` falla y se validan los colores del héroe (self-XSS). El detalle está en la Tarea 0 del plan.
- Se agrega `_headers` con una CSP compatible con el `import()` desde `blob:`, para cuando se despliegue en Netlify.

## 10. Fuera de alcance

- Escenas 3D para otros módulos.
- Reemplazar la región 2D de Redes.
- Persistir el progreso dentro de un viaje.
- Audio, modelos o texturas externas.
- Despliegue a Netlify (tarea aparte).
