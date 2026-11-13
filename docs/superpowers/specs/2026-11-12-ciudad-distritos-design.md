# Ciudad Núcleo: distritos para todo el temario — Tanda 1 (diseño, v2)

Rama: `feat/ciudad-2d`. Sigue a `2026-11-12-ciudad-nucleo-2d-design.md` (capítulo 1 en 2D, ya implementado). v2 incorpora la revisión del spec (§12).

## 1. Propósito y alcance

**Lo que pidió el usuario:** que el mundo abierto cubra todos los temas. Hoy solo existe el Taller Comunal (M02); los demás módulos (180 temas, M01–M10) se estudian fuera de la ciudad y Redes (M08) solo tiene un viaje 3D aparte.

**Decisiones del usuario:**
- Cada distrito completo y pensado a mano (mentores, criaturas, reparaciones, aprendices, torre), por tandas.
- Todos los distritos abiertos desde el inicio.
- La plaza es el centro; cada distrito es su propio mapa y se entra por un portal con fundido.
- El viaje 3D de Redes pasa a 2D dentro del distrito y se borra el motor 3D.
- Orden: Tanda 1 = base común + M02 migrado + M08 + borrar 3D. Tanda 2 = M03, M01, M10. Tanda 3 = M04, M06, M07. Tanda 4 = M05, M09. M11 queda "Próximamente" hasta que exista su guía.
- Introducción para quien juega por primera vez: qué es el juego y qué puede hacer.

**Este spec cubre solo la Tanda 1.** Las tandas 2–4 deben ser **solo datos y texto** en el formato de §4: ningún archivo de código nombra un distrito concreto salvo donde §4.6 lo permite.

**Éxito de la Tanda 1:**
1. Desde la plaza se entra al Taller Comunal y a Nodo Enlace (M08) y se vuelve; los otros 9 portales dicen "Próximamente".
2. Una partida existente conserva todo su progreso de M02 y su posición (también con una pestaña vieja abierta, §5.4).
3. Los 15 temas de M08 se aprenden, practican, prueban y enseñan dentro de la ciudad, y la ruta del paquete funciona en 2D.
4. Un jugador nuevo entiende qué es el juego y cómo se juega sin ayuda externa.
5. No queda código 3D ni Three.js en el repositorio ni en el HTML final.

**Fuera de alcance:** distritos de las tandas 2–4 y M11; poderes nuevos por distrito; tutorial obligatorio paso a paso; merge y deploy (requieren confirmación del usuario).

## 2. Escenas y recorrido

- **Una escena a la vez:** `plaza` o un distrito (`M02`, `M08`). Cada escena tiene su propio mapa prerenderizado a 8 px/m. Tope por escena: 140 × 160 m (1120 × 1280 px).
- **Plaza:** mapa propio con sede, Iris, Espejo y **11 portales** generados desde `ORDER` (§4.1): M02 en el norte (−90°) y los otros 10 en los ángulos y radio 38 de los muros actuales (`−90 + 33·(k+1)`), en el orden de `WALL_DIST` de hoy. Coordenadas sin cambio (centro 0,0; `entry` 0,8,yaw 0). `bounds` −50..50 × −50..40.
  - Portal de un distrito existente: arco neón abierto con el color del distrito y su nombre. **No es sólido.**
  - Portal sin distrito: el muro de La Maraña actual (sólido, como hoy).
- **Entrar (acción explícita y también al pisar):**
  - Al tener un portal a alcance, `#city-act` dice "Entrar a <nombre>" y se activa con toque, E o Enter. Su texto secundario (`textContent`) muestra "<MXX> · <n> temas · <p> % restaurado".
  - Pisar la caja del portal (2 × 2 m, en la boca del arco) también entra.
  - Portal "Próximamente": `#city-act` dice "Ver <MXX>" y abre una hoja corta: "<MXX> · <título del módulo>. Este distrito llegará pronto. Mientras, puedes estudiarlo desde Módulos." con "Ir al módulo" y "Cerrar".
- **Cambio de escena (`cityEnter(sceneId, at)`, en `view.js`):**
  1. Si ya hay un cambio en curso, se ignora. Sube `cityGen`; `#city-ui-main` pasa a `inert`; el mundo actual `setPaused('fade', true)`.
  2. Velo negro: opacidad 1 en 250 ms (0 ms con `prefers-reduced-motion`). **Se avanza con `setTimeout`, nunca con `transitionend`.** El temporizador vive en `CD.fadeT` y `cityTeardown` lo cancela.
  3. Con la pantalla negra: `dispose` del mundo; recálculo de `CD.boxes`, `CD.base`, `CD.items`, `CD.near` y se descarta `CD.teach`; `create` del nuevo.
  4. Al resolver `create` (si `cityGen` no cambió y la vista sigue en `city`): se guardan `scene` y `at` juntos, velo a 0 en 250 ms, se quita `inert`, `#city-live` anuncia "Entraste a <nombre>. Objetivo: <objetivo>." y, si el foco quedó en `body` o en un nodo que ya no existe, va a `#city-pause`.
  5. Si el cambio tarda > 250 ms: `#city-loadbox` muestra "Abriendo <nombre>…".
  6. Si `create` falla: §8.
- **Volver:** cada distrito tiene un portal de salida junto a su entrada (misma mecánica). Se vuelve a la plaza en `back` del portal de ese distrito (radio 33 sobre su ángulo, mirando al centro, fuera de la caja del portal).
- **M02:** se separa de la plaza en su propio mapa y **conserva sus coordenadas**. `bounds` −60..60 × −185..−44; entrada (0, −52, yaw π, mirando al sur); portal de salida en (0, −47). Se borra el puente (datos, cajas, dibujo, hoja, objetivo y `bridgeSeen`).
- **Objetivo y flecha:**
  - Dentro de un distrito: §5.2.
  - En la plaza: si falta el prólogo, Iris; si no, el portal del **distrito recomendado** = el primero no restaurado de `ORDER` entre los que existen: "Entra a <nombre>". Si todos los existentes están restaurados: "Ciudad al día: más distritos pronto" (sin flecha).
- **HUD:** en la plaza, `#city-rest` dice "Distritos <restaurados> de <existentes>"; en un distrito, "<nombre> <p> %".
- **Rangos:** sin cambio de umbrales (Becario 0, Junior 1, Semi-senior 3, Senior 6, Arquitecto 8, Tech Lead 11), contando distritos restaurados.
- **Página de módulo:** si el módulo tiene distrito, botón `<span aria-hidden="true">▶</span> Ir al distrito`, que abre la ciudad en `entry` de ese distrito (pasando antes por el prólogo si no se vio). Se quita "Viaja como paquete".

## 3. Introducción para quien juega por primera vez

1. **Inicio:** bajo el título "Ciudad Núcleo", el texto exacto: "Estudia Ingeniería de Software recorriendo una ciudad: cada distrito es un módulo y cada vecino te enseña un tema." Debajo, una lista de tres elementos, cada uno con un canvas `data-spr` (`mentor`, `creature`, `apprentice`; `aria-hidden="true"`) y su etiqueta visible: "Aprende", "Ponte a prueba", "Enseña".
2. **Primera entrada:** si `S.city.prologue` es falso, la hoja de Iris se abre sola al entrar a la ciudad (en cualquier escena). Cuatro paneles; el chip dice "Prólogo <i> de <total>" calculado de la lista; "Saltar" en todos menos el último:
   1. Ciudad Núcleo — texto actual del panel 1.
   2. La Maraña — texto actual del panel 2.
   3. Tu papel — "Llegas como Becario. Cada distrito es un módulo del temario: restáuralo y subirás de rango hasta Tech Lead. Cada portal abierto de la plaza lleva a un distrito; los demás llegarán pronto."
   4. Cómo se juega — lista con ícono (`aria-hidden`) y texto:
      - Mentor: "Habla con él y lee la lección de su tema."
      - Practicar: "Responde preguntas y gana estrellas."
      - Criatura: "Mezcla varios temas: véncela para probar lo que sabes."
      - Reparar y enseñar: "Arregla la ciudad y explica temas a los aprendices."
      - Torre: "El examen final del módulo restaura el distrito."
      - Controles (§3.6).
   Cerrar o saltar marca `prologue = true`. Hablar con Iris después muestra el panel 4 más, en negrita, el objetivo actual. La hoja de Iris se titula "Iris" (se quita "Directora").
3. **Pistas en el momento:**
   - Región `#city-tip` con `role="status"`, **fuera de `#city-ui-main`** y presente desde que se crea la vista (vacía). Una pista a la vez; las demás esperan en cola (`CD.tips`).
   - Se cierra al tocarla o a los 6 s **de visibilidad real**: el contador se congela mientras haya hoja, pausa o fundido, o el puntero/foco esté sobre ella.
   - Cada pista sale una sola vez (`S.city.tips[id] = true` al mostrarse). Temporizador y cola viven en `CD` y `cityTeardown` los limpia.
   - "¿Cómo se juega?" (§3.4) lista también las pistas ya vistas.
   - Disparo solo cuando cambia `nearId` o al volver a la vista, nunca por cuadro.

   | id | Cuándo | Texto |
   |---|---|---|
   | `talk` | primer mentor a alcance | "Toca «Hablar con…» o pulsa E para aprender su tema." |
   | `star` | al volver a la ciudad, si algún tema de un distrito pasó de 0 a ≥ 1 estrella desde la última vez (línea base `CD.starBase`, se toma al crear la vista) | "Con 1 estrella ya puedes enseñar ese tema a un aprendiz." |
   | `creature` | primera criatura a alcance | "Las criaturas mezclan varios temas: aprende antes de enfrentarlas." |
   | `repair` | primera reparación a alcance | "Repara la ciudad respondiendo sin ayudas." |
   | `tower` | primera vez que una torre queda desbloqueada | "La torre está abierta: es el examen final del distrito." |
   | `portals` | primera vez en la plaza con un distrito restaurado | "Hay más distritos detrás de los portales." |
4. **Pausa:** botón "¿Cómo se juega?" que abre el panel 4 y la lista de pistas vistas.
5. **Movimiento reducido:** sin fundido animado (§2), sin paquete animado (§5.3).
6. **Controles** (textos exactos; se muestran las líneas táctiles si `matchMedia('(any-pointer: coarse)')` y las de teclado si `(any-pointer: fine)`; en híbridos, ambas):
   - Táctil: "Arrastra en la parte izquierda de la pantalla para caminar. Pellizca para acercar o alejar."
   - Teclado: "WASD o flechas para caminar. E o Enter para hablar. Rueda o +/− para el zoom. Esc para pausa."
   - Siempre: "Desde el nivel 5 puedes correr (botón Correr o Shift)."

## 4. Datos

### 4.1 Archivos

- `city/layout.mjs` (solo build): `makeLayout({ reserve: [[x, z], ...], streetX, streetZ, xRange, zRange, step: 8, min: 7 })` → `{ take() }`. Los lugares se calculan al crear, excluyendo `reserve` (torre y otros fijos). Lanza error si `take()` se queda sin lugares. **Debe reproducir exactamente las coordenadas actuales de M02** (prueba).
- `city/districts/m02.mjs`, `city/districts/m08.mjs`: un distrito cada uno (formato §4.2).
- `city/districts/m08_route.mjs`: estaciones de la ruta (hoy `trip/stations.mjs`, sin cambios de contenido).
- `city/districts.mjs`: rangos, `ORDER = ['M02', 'M08', 'M03', 'M01', 'M10', 'M04', 'M06', 'M07', 'M05', 'M09', 'M11']`, plaza (portales generados desde `ORDER`) e import de los distritos existentes. `CITY_DATA = { ranks, order, radius, plaza, districts }`.

### 4.2 Formato de un distrito

```
{ id: 'M08', name, colors: { a, b }, style: 'taller' | 'red', seed,
  bounds: { minX, maxX, minZ, maxZ }, entry: { x, z, yaw }, exit: { x, z, w, d },
  streets: { x: [...], z: [...] }, blocks: [[x, z], ...],
  mentors: [{ id, topic, name, x, z }], creatures: [{ id, name, topics, area: { x, z, r } }],
  repairs: [{ id, topic, label, x, z }], apprentices: [{ id, topic, name, mode: 'explain'|'correct', x, z }],
  tower: { id: 'torre', x, z, w, d, h }, need,
  celebrate: { text, power?: { id, name } },
  route?: { stations, pads: [{ x, z }] } }
```

- **Ids:** mentores `m01…`, criaturas por nombre corto, reparaciones `r01…`, aprendices `a01…`; únicos dentro del distrito.
- `label` de reparación incluye su artículo ("el semáforo", "la antena sin sentido"); el objetivo es "Repara " + label. En M02 se agregan los artículos a las etiquetas actuales.
- `style` es un enum cerrado en esta tanda: `taller` (edificios y ventanas de hoy) y `red` (además, antenas en las azoteas y franjas de rack en fachadas). Faroles y niebla son comunes a todos.
- La plaza tiene `bounds`, `entry`, `hq`, `director`, `mirror` y `portals: [{ dist, angle, x, z, w, d, back: { x, z, yaw } }]`.

### 4.3 Reglas (validador genérico por distrito en `validate.mjs`; un fallo aborta la build)

Sustituye a los checks fijos de M02 de hoy (23 mentores, 6 criaturas, 10 retos, 12 aprendices, `need` 8, 10 muros, puente) **y conserva todas las demás reglas actuales**:

1. Cada tema del módulo tiene exactamente un mentor; ningún mentor apunta a un tema inexistente; nombres de mentor únicos.
2. Los temas de las criaturas cubren el módulo completo sin repetirse; cada criatura tiene de 2 a 5 temas y ≥ 8 preguntas `mcq` + `tf` entre sus temas (lo que pide `battleItems`).
3. Reparaciones con temas distintos y cada una con ≥ 2 preguntas entre `scenario` y `error`.
4. Aprendices con temas distintos y existentes, `mode` válido, `correct` solo con ≥ 1 pregunta `error`, nombres únicos y sin chocar con un mentor; `need` ≤ número de aprendices.
5. Ids con `idOk` (minúsculas, dígitos, `_` y `-`; ni `__proto__` ni nombres de `Object.prototype`), únicos dentro del distrito.
6. Palabras prohibidas (lista actual) ausentes en nombres y etiquetas.
7. Puntos dentro de `bounds`, separados ≥ 4 m, y a ≥ 0.6 m de toda caja sólida (`entry`, puertas de torre y salida incluidas). `bounds` ≤ 140 × 160 m.
8. `route` (si existe): 1 `kp` por estación que apunta a un keyPoint real y contiene `expect` (15–40 caracteres, tema de la estación); `ask` ∈ {1, 2}; las estaciones cubren todos los temas del módulo; un `pad` por estación; para M08, suma de `ask` = 18 y 10 estaciones.
9. Portales: un `dist` por elemento de `ORDER`, sin repetir; `back` fuera de toda caja y de todo portal.
10. Rangos iguales a la tabla de §2.

### 4.4 M02 (Taller Comunal)

Mismos mentores, criaturas, reparaciones (con artículo), aprendices, torre, `need` 8, semilla y coordenadas que hoy. `style: 'taller'`. `celebrate`: texto "El Taller Comunal vuelve a funcionar y ya no depende de una sola persona.", `power: { id: 'planos', name: 'Planos' }`.

### 4.5 M08 (Nodo Enlace)

- `colors` verde `#3dff9a` y cian `#5ce1ff`; `style: 'red'`.
- Geometría: `bounds` −60..60 × −70..60 (120 × 130 m); entrada (0, 52, yaw 0, mirando al norte) y portal de salida en (0, 57); manzanas de 20 × 20 con centros x ∈ {−42, −14, 14, 42} y z ∈ {30, 2, −26, −54}; calles en x ∈ {−28, 0, 28} y z ∈ {16, −12, −40}; torre en (0, −64). `makeLayout` con esas calles, `reserve` torre y pads, `step` 8, `min` 7.
- **Mentores (T01–T15, `m01`–`m15`):** Alma, Baltasar, Celia, Darío, Estela, Fausto, Greta, Hernán, Irene, Julián, Lía, Mateo, Noemí, Óscar, Paula.
- **Criaturas:**

  | id | nombre | temas |
  |---|---|---|
  | `ruido` | Ruido Blanco | T01, T02, T03 |
  | `perdido` | Paquete Perdido | T04, T07, T14 |
  | `capas` | Capa Confusa | T05, T08, T09, T13 |
  | `handshake` | Handshake Roto | T06, T10, T12 |
  | `espia` | Espía del Canal | T11, T15 |

- **Reparaciones (`r01`–`r08`):** T02 "el cable cortado" · T03 "la antena sin sentido" · T04 "el router de casa sin salida" · T07 "la dirección IP duplicada" · T10 "la conexión a medias" · T11 "el candado HTTPS roto" · T12 "el puerto bloqueado" · T14 "el enlace saturado".
- **Aprendices (`a01`–`a09`, `need` 6):** Brisa T01 explicar · Ciro T02 corregir · Delia T04 explicar · Eloy T05 explicar · Flor T07 corregir · Gus T08 explicar · Iker T10 corregir · Luna T12 explicar · Teo T13 corregir.
- **Torre:** jefe de M08 (`S.boss.M08`).
- **Ruta del paquete:** 10 pads sobre las calles, en el orden S0–S9, de la entrada (S0) a la torre (S9).
- `celebrate`: "Nodo Enlace vuelve a conectar la ciudad: los paquetes llegan a su destino." Sin poder.

### 4.6 Lo que sí nombra un distrito en código

Solo `city/districts.mjs` (imports) y el registro de poderes de `engine.html` (`planos`, como hoy). Todo lo demás lee `CITY_DATA` y la escena activa.

## 5. Guardado y lógica

### 5.1 Forma de `S.city`

```
{ prologue, run, tips: { talk?, star?, creature?, repair?, tower?, portals? },
  scene: 'plaza' | <id de distrito>, at: { x, z, yaw },
  d: { M02: { beaten, repairs, taught }, M08: { beaten, repairs, taught, route: { done } } },
  restored: {...}, powers: {...},
  beaten, repairs, taught }   // espejo de d.M02 (§5.4)
```

`normalizeCity(raw, D, bossPassedOf, todayStr)` — nunca lanza:
- `bossPassedOf`: si no es función, se trata como `() => false`.
- `d`: se construye **recorriendo `Object.keys(D.districts)`**, nunca las claves del guardado. Para cada `mid`: `beaten`, `repairs`, `taught` con `pick` (ids del distrito, `hasOwnProperty`, fechas válidas no futuras, `true` estricto). Siempre existe `d[mid]` para cada distrito de los datos; si tiene `route`, `route.done` = `v` si `Number.isInteger(v) && v >= 0` (recortado a `stations.length`), si no 0. Claves extra se descartan.
- `scene`: se acepta solo si es `'plaza'` o `own.call(D.districts, scene)`; si no, `'plaza'`.
- `at`: coordenadas recortadas a `bounds` de la escena como hoy (`CM.coord`); si el punto cae dentro de una caja sólida → `entry` de la escena; si cae dentro de la caja de un portal → `back` de ese portal (o `entry` del distrito, si es su salida). `yaw` normalizado a [0, 2π) de forma idempotente y sin −0.
- `tips`: solo los 6 ids, valor `true` estricto.
- `restored` y `powers` se recalculan siempre: `restored[mid]` ⇔ `bossPassedOf(mid)` y `taughtCount` ≥ `need`. Si el distrito tiene `celebrate.power`, `powers[power.id] = true`.
- **Idempotente:** `normalizeCity(normalizeCity(x)) ≡ normalizeCity(x)` (prueba de propiedad).

### 5.2 Migración

- Si `raw.d` es un objeto plano, **gana `d`** y los campos planos se ignoran (son el espejo).
- Si no (ausente, `null`, arreglo, texto): se migra desde los campos planos `beaten`, `repairs`, `taught` → `d.M02`.
- Posición, cuando falta `scene`: `LEGACY_M02_RECT = { minX: −70, maxX: 70, minZ: −195, maxZ: −44 }` (constante en `story.js`, "solo migración", cerrado; cubre todo lo que el mundo viejo aceptaba al sur de la plaza, y luego se recorta a `bounds` de M02). Si `at` cae dentro → `scene 'M02'`, mismas coordenadas; si no → `scene 'plaza'`, mismas coordenadas. Luego se aplican las reglas de `at` de §5.1 (una posición vieja en la calle de la plaza queda recortada o va a `back` del portal M02).
- `bridgeSeen` se descarta.

### 5.3 Historia por distrito (`city/story.js`)

- `taughtCount(C, D, mid)`, `restoration(C, D, mid, bossPassed)`, `applyRestore(C, D, bossPassedOf)` → `{ changed: [mids que pasaron a restaurados] }` (idempotente), `rankOf(C, D)`, `apprenticesAvailable(C, D, mid, starsOf)`.
- `nextObjective(C, D, sceneId, ctx)`:
  - En un distrito: torre primero si está desbloqueada y sin aprobar; luego, por criatura, mentor sin aprender → practicar sin estrella → enfrentar; si el distrito tiene `route` y `route.done` < `stations.length`: `{ kind: 'route', label: 'Ruta del paquete · estación <done+1> de <n>' }` con la flecha a `pads[done]` (recomendado, no requisito); luego reparaciones, aprendices y criaturas de hoy. Restaurado → `{ kind: 'plaza', label: 'Vuelve a la plaza' }`.
  - En la plaza: §2.
- `ctx` (estrellas, aprendido, jefe) se arma con `mod(sceneId)` y claves `sceneId + ':' + topic`.

### 5.4 Compatibilidad con una pestaña vieja

Durante esta versión `save()` escribe también los campos planos `beaten`, `repairs`, `taught` como **copia de `d.M02`**. Una pestaña con el código anterior lee esos campos y no pierde el progreso de M02; al volver al código nuevo, gana `d` (§5.2). El espejo se elimina en una versión posterior (nota en el ledger).

### 5.5 Cambios en `engine.html`

- `bossPassedOf(mid)` = `!!(S.boss[mid] && S.boss[mid].passed === true)`: única fuente, usada por `fresh`, `migrate`, `finish` y la vista.
- `cityD(mid)` devuelve `S.city.d[mid]`.
- `cfg.city` lleva `mid`; `cityResolve` y `beatenToday(mid, id)` leen y escriben `cityD(cfg.city.mid)`.
- `finish()`: `applyRestore(S.city, CITY_DATA, bossPassedOf)`; `cityRestorePending` pasa a ser una lista de mids; `cityCelebrate(mid)` usa `celebrate` del distrito y el rango ("Poder nuevo: <name>." solo si hay `power`).
- `migrate()`: claves `__proto__` se saltan al copiar `topics`, `qs` y `boss` (como `pick`).
- `load()`: si `migrate` lanza, se copia el texto crudo a `KEY + '_bak'` antes de devolver `null`, para que el siguiente `save()` no lo destruya sin respaldo.

### 5.6 Ruta del paquete (`city/route.js`, `city/route_view.js`)

- `TripFlow` pasa a `city/route.js` como `CityRoute` con un cambio: `deps.from` (estación inicial, 0..n−1). Sus pruebas se conservan apuntando al nuevo archivo.
- Lo que pasa de `engine.html` a `city/route_view.js` (renombrado, sin reescribir): `tripRecord`, `tripOnAsk`, `tripOpts`, `tripShowResult`, `TRIP_LAYERS` y el HUD de capas. Se borran `loadThree`, `dynImport`, `tripScenePath`, `tripFallback`, `tripStart`, `tripStop`, `tripExit`.
- Llegar al pad activo y tocar "Estación <n> de <total>" abre la hoja: chip "Estación <n> de <total> · <nombre>", el keyPoint y "Ver pregunta"; luego las mismas preguntas y reintento que hoy.
- Al terminar una estación: `route.done = n`, guardado, `api.setRoute(done)` y anuncio en `#city-live`.
- Pads: el activo pulsa en el color del distrito; los terminados llevan un ✓ dibujado; los siguientes, contorno apagado (forma distinta, no solo color). Cable: tramos sobre las calles, encendidos hasta `pads[done]`.
- Paquete: un sprite que recorre el último tramo encendido en 0.8 s; con movimiento reducido aparece directamente al final.
- HUD: una sola pill de texto "Capas: Datos · Puerto · IP · Trama" con las capas alcanzadas.
- Cerrar la hoja a mitad de una estación no la cuenta y avisa "Retomarás en la estación <n>."
- Al terminar la última: resumen **de esta sesión** (XP y fallos desde que se retomó) con "Repasar lo que fallé" si hubo fallos. Con `done = total`, el pad S0 ofrece "Recorrer otra vez" (vuelve a 0 solo al confirmar; no quita nada más).
- XP por respuesta: igual que hoy (`xpBase` + pasiva, `recordAnswer`).

## 6. Motor

- **Escena activa:** `CD.scene` (id) es la única fuente en `view.js`. Toda lectura de distrito usa `CITY_DATA.districts[CD.scene]` y `mod(CD.scene)`; ninguna función de `view.js` ni `world2d.js` nombra `M02`. `cityZone` se borra (la zona es la escena).
- `CityMove.boxesFor(D, sceneId)`: edificios, torre, sede, muros "Próximamente" y borde de la escena. Se quita el parámetro `restored` (solo existía por el puente).
- `CityMove.portalAt(D, sceneId, x, z)` → id del portal cuya caja contiene el punto o `null`.
- `CityWorld2D.create(canvas, D, sceneId, opts)` → `api = { resize, setPaused, dispose, encounter, dissolve, stats, setRoute(done) }`.
  - `buildMap` lee `colors` y `style` de la escena; los pads y el cable **no** van en el mapa prerenderizado: se precalculan como rectángulos en `create` y se dibujan por cuadro (≤ 10 pads + tramos visibles + 1 sprite, sin `shadowBlur`).
  - Las chispas toman muros y reparaciones de la escena y se saltan si la lista está vacía.
  - `Pauser` se mueve **dentro de `world2d.js`** (único consumidor); sus pruebas pasan a `tests/city_world2d.cjs`. Se quita el alias `T3`.
- **Sprites (`city/sprites2d.js`):** la lista de variantes se genera desde `CITY_DATA` (todos los ids de mentores, aprendices y criaturas de todos los distritos); la forma de cada variante sale de un hash del id (como hoy para personas). `paintIcons` pinta `hero`, `mentor`, `creature` y `apprentice`.
- **Archivos nuevos de vista:** `city/intro.js` (paneles, pistas, "¿Cómo se juega?"; recibe `cityPrologue` y `cityPrologueDone`) y `city/route_view.js` (§5.6). `view.js` no crece.
- **Build:** el ancla de ciudad recibe `route`, `intro` y `route_view`; se quitan `/*__TRIP__*/`, `/*__TRIP_CODE__*/`, `THREE_VENDOR` y todo lo que inyectan.

## 7. Borrado del 3D y del puente

Se borran:
- `vendor/three.module.min.js`, `trip/` completo, `three/` completo.
- En `engine.html`: lo listado en §5.6, `#trip-root` y su CSS, la vista `trip`, `TD`, `tripGen`, `threeP`, el botón "Viaja como paquete", los ganchos `__TRIP_IMPORT__` y `__TRIP_SCENE__`.
- En `build.mjs`: `THREE_VENDOR`, el bloque `VENDOR:THREE` y el ancla del viaje.
- En `validate.mjs`: los checks del vendor (hash, `three-src`) y el bloque `TRIP_STATIONS` (pasa a la regla 8 de §4.3).
- `blob:` sale de `script-src` en `_headers` (solo lo usaba `loadThree`).
- Pruebas: `tests/build_vendor.cjs`, `tests/scene.cjs`, `tests/scene_extra.cjs`, `tests/three_shared.cjs` (sus pruebas de `Pauser` pasan antes a `city_world2d.cjs`), `tests/trip_engine.cjs`, `tests/trip_extra.cjs`, `tests/adv/trip_fuzz.cjs` y la parte de escena de `tests/adv/trip_props.cjs` (la de `TripFlow` se migra). `tests/trip.cjs` se reapunta a `city/route.js`.
- Puente: `bridge`, `bridgeSeen`, sus cajas, dibujo, hoja y objetivo, y sus pruebas (se reescriben con la forma nueva).

`validate.mjs` agrega a la guarda de identificadores retirados: `Three3D`, `TripScene`, `TripFlow`, `TRIP_STATIONS`, `trip-root`, `tripStop`, `loadThree`, `three-src`, `three.module`, `__TRIP_IMPORT__`, `__TRIP_SCENE__`, `dynImport`, `createObjectURL`, `import(`, `bridgeSeen`, `cityZone`; falla si `_headers` contiene `blob:`; y comprueba que los archivos de `city/` solo escriben `innerHTML` con `esc()`/`fmt()` (mismo criterio que hoy para `view.js`). Los ganchos de prueba nuevos, si los hay, se protegen con `window.__CITY_TEST__ === true` y se listan en la guarda.

## 8. Errores

- Fallo al crear el mundo de un distrito → se crea la plaza y aparece un banner que no se cierra solo: "No se pudo abrir <nombre>." con "Reintentar" (foco) y "Cerrar" (`role="alert"`). La partida no se pierde (`scene` queda en `plaza`).
- Si falla también la plaza → mensaje actual "No se pudo mostrar la ciudad.".
- Pérdida del contexto durante el juego → "Se perdió la vista de la ciudad." como hoy.
- Salir de la ciudad durante un fundido → `cityTeardown` cancela el temporizador y `cityGen` descarta el `create` tardío (sin rAF huérfano).
- Guardado dañado → §5.1–§5.2 (nunca lanza; respaldo en `_bak` si `migrate` lanza).
- Doble cruce de portal o pulsaciones durante el fundido → ignorados.

## 9. Seguridad

- Textos de datos en `innerHTML` solo con `esc()`/`fmt()`, también en atributos `data-*`; carteles, pistas, HUD y anuncios con `textContent`.
- `route.done` y cualquier número del guardado pasan por `Number.isInteger` antes de usarse como índice.
- Claves del guardado nunca se usan como índice sin `hasOwnProperty` sobre los datos (§5.1).

## 10. Rendimiento

Un solo mapa vivo; el anterior se deja a 0 × 0 en `dispose`, y `dispose`/`create` ocurren con la pantalla negra (sin destello). El mundo viejo se pausa durante el fundido. Atlas compartidos. Mismo presupuesto: un rAF, ≤ 200 partículas, `pr` en [1, 1.5]. Encender la ruta no redibuja el mapa. El HTML final baja ~690 KB. `?fps=1` sirve para medir cada escena.

## 11. Pruebas

- **Datos:** reglas §4.3 sobre M02 y M08; distritos mal formados a propósito (tema sin mentor, tema repetido en criaturas, criatura con < 8 preguntas, reparación sin preguntas, aprendiz `correct` sin `error`, id `__proto__`, punto dentro de un edificio) hacen fallar el validador. `makeLayout` reproduce las coordenadas actuales de M02. Se reapunta `tests/spec_districts_feasibility.cjs` a los archivos nuevos.
- **Guardado:** migración de una partida vieja (progreso a `d.M02`, posición conservada en M02 y en la plaza, franja −50..−44 en M02, calle vieja y portal → `back`, `bridgeSeen` descartado); `d` gana sobre los planos; `d` no plano → migración; `scene` `__proto__`/`constructor`/`toString`/desconocida → plaza; `d.__proto__` y ids cruzados entre distritos descartados; `route.done` con NaN, "3", 3.7, −1, Infinity → 0 y > total → total; espejo plano igual a `d.M02` tras `save()`; `bossPassedOf` no función → sin restaurar y sin lanzar; `load()` con `migrate` que lanza deja `_bak`. Propiedades y fuzzing (`tests/adv/spec_districts_attack.cjs`, adaptado a la forma nueva): nunca lanza, solo ids válidos, idempotente (incluido yaw), sin contaminación de prototipo.
- **Historia:** objetivo en cada distrito y en la plaza (`ORDER`); restauración y rango con varios distritos; `applyRestore` idempotente y `changed` como lista; la ruta aparece entre criaturas y reparaciones y no bloquea la restauración; celebración de M08 sin poder.
- **Escenas:** plaza → M08 → plaza aparece en `back`; entrada por botón y por pisar; "Próximamente" abre su hoja; fundido bloquea doble entrada y no espera `transitionend`; salir durante el fundido no deja rAF; error al crear devuelve a la plaza con banner y "Reintentar"; "Ir al distrito" abre en `entry`; foco y anuncio al llegar; `inert` durante el fundido; ninguna lectura de M02 al recorrer M08; chispas en una escena sin reparaciones no lanzan.
- **Introducción:** texto de inicio exacto e íconos; Iris se abre sola la primera vez y no la segunda; chip "n de 4"; cada pista sale una vez, no pausa, su contador se congela con hoja abierta y la región está fuera de `#city-ui-main`; "¿Cómo se juega?" en pausa con pistas vistas; controles según `any-pointer` (táctil, teclado, ambos).
- **Ruta:** pruebas de `TripFlow` migradas; `from` reanuda; cerrar a mitad no cuenta y avisa; `setRoute` enciende pads y cable sin redibujar el mapa; resumen de sesión; "Recorrer otra vez".
- **Limpieza:** guarda de identificadores retirados; el HTML final no contiene `three` ni `TripScene`; `_headers` sin `blob:`.
- **Humo (Playwright):** capturas de la plaza, M02 y M08, teléfono vertical y laptop horizontal; recorrido plaza → M08 → plaza sin errores de consola.
- Las pruebas que hoy dependen del puente, `bridgeSeen`, la forma plana, `boxesFor(D, restored)` o `D.plaza.roads` (lista en el informe de revisión: `city_story`, `city_engine`, `city_move`, `city_world2d`, `migrate`, `preserve_2d`, `city_rounds`, `review_gaps`, `record2`, `adv/plan_city_oracle`, `adv/review_attack`, `adv/spec2d_attack`, `adv/city_fuzz`, `adv/city_base_attack`) se reescriben a la forma nueva sin perder lo que comprueban.

## 12. Cambios de v2 (revisión del spec)

- Agregado: cambios en `engine.html` (§5.5), escena activa única en `view.js`/`world2d.js` (§6), sprites desde datos (§6), validador genérico que conserva las reglas actuales (§4.3), claves con `hasOwnProperty` (§5.1), `bossPassedOf` tolerante y respaldo `_bak` (§5.1, §5.5), migración sin ambigüedades con `LEGACY_M02_RECT` y precedencia de `d` (§5.2), espejo para pestaña vieja (§5.4), portales con acción explícita, foco, anuncio e `inert` (§2), pistas que no se pierden (§3.3), controles correctos e híbridos (§3.6), ruta con resumen de sesión, repetición, flecha al pad y API `setRoute` (§5.6, §6), fundido sin `transitionend` y sin rAF huérfano (§2, §8), chispas sin listas vacías (§6), celebración desde datos (§4.4–4.5, §5.5), artículos en las etiquetas (§4.2), geometría de M08 (§4.5), HUD en la plaza (§2), `Pauser` dentro de `world2d.js` (§6), lista completa de borrados y guarda ampliada (§7).
- Corregido en el código durante la revisión: `normalizeCity` no era idempotente con yaw negativos diminutos (`city/story.js`, función `normYaw`; prueba `REG` en `tests/adv/spec_districts_attack.cjs`).

## 13. Cambios de la implementación (rulings y desviaciones)

Decididos durante la ejecución del plan, con lo que cuesta si estaban equivocados.

**Escenas y datos**
- **Portal y salida:** el disparador es toda su caja (6 × 2 m), no los "2 × 2 m en la boca" de §2: con un portal de 6 m, activar solo 2 m confundía y `back`/`entry` están a 5 m de la caja. Portales y salida son ítems con radio propio (r = 4 m) para el botón "Entrar a…" / "Volver a la plaza" (el texto secundario va en `#city-act .act-sub`); los pads de la ruta usan r = 2,5 m. Coste si se equivoca: ajustar `w`/`d`/`r`.
- **Guardado:** `at` se acota a `bounds` ± radio (como ya hacía el código). `scene` presente pero desconocida → plaza en su entrada sin usar `at`; `scene` ausente → migración con `LEGACY_M02_RECT`. `city/story.js` es el único código que nombra `M02` (solo para migrar). Coste: perder la posición de un guardado corrupto.
- **Validación:** `validate.mjs` valida el `CITY_DATA` que viaja en el HTML (cada distrito contra su módulo en `MODULES`, y R9/R10 de la plaza) en vez de importar `m02`/`m08`. Regla estática: `view`, `world2d`, `sprites2d`, `input`, `intro`, `route` y `route_view` no contienen literales `'Mxx'`.
- **Sprites:** `CitySprites.init(doc)` es idempotente por documento y `setData(D)` por objeto de datos; las variantes salen de `CITY_DATA`. El primer distrito conserva su aspecto anterior; los demás usan el hash del variante completo y desfasan la forma de criatura.
- **Mundo 2D:** `CityWorld2D` exporta `{ create, Pauser }` (`Pauser` se movió de `three/shared.js`). `setRoute(n)`: la primera llamada solo fija el estado; avanzar exactamente +1 lanza el paquete 800 ms (sin movimiento reducido). Cable en tramos en L. Pads: terminado ✓, activo relleno, siguientes solo contorno.
- **Vista:** token `c.wtok` por creación de mundo (un `onLost` de un mundo ya liberado no cuenta); el foco al terminar el fundido va a `#city-pause` si estaba en `body`, desconectado u oculto.
- **M11:** no tiene módulo todavía. Su portal está en la plaza con el muro "Próximamente" y la hoja no ofrece "Ir al módulo". Para sumarlo: su archivo en `city/districts/` y quitar el muro.

**Introducción y ruta**
- El prólogo se abre solo en `cityStart.ready` si `S.city.prologue` es falso (no en `cityEnter`); "Ir al distrito" sin prólogo pasa por él al llegar. Las pistas cuentan 6 s por tick (sin `setTimeout`), así que se congelan solas con hoja, pausa o fundido.
- `city/route.js` es una copia de `TripFlow` con `deps.from`. El aviso "Retomarás en la estación N." va a `#city-live`; el resumen sale de la visita (`CD.route`), no del flujo; cerrar la hoja a mitad descarta el flujo y lo recrea con `from = done`, conservando XP y fallos de la visita.

**Borrado del 3D y seguridad**
- El botón "Viaja como paquete" convivió con "Ir al distrito" hasta la 8b y se quitó junto con todo el 3D. `CITY_DATA` se inyecta con `<` escapado (`\u003c`) y `_headers` ya no permite `blob:`.
- La regla de `validate.mjs` sobre `esc()`/`fmt()` en `innerHTML` es heurística (por línea); la garantía real es `tests/xss_data.cjs` (cargas `<img onerror>` y `</script>` en nombres, etiquetas, estaciones y celebración; quitar `esc()` hace fallar la prueba).

**Hallazgos del humo en navegador (Chromium, 390×844, 320×640, 1280×800 y movimiento reducido) y su arreglo**
- La pista (`#city-tip`) quedaba dibujada sobre la hoja abierta y en 320 px tapaba "Cerrar" (el contador estaba congelado, así que no se iba). Ahora `cityInert()` la oculta mientras haya hoja, pausa, aviso de girar o fundido; su texto y su cuenta quedan pendientes y vuelve al cerrar. Prueba: `(c6)–(c10)` de `tests/city_intro.cjs`.
- En 320 × 640 el HUD medía 161 px (25,2 %, más que el límite del 25 %). Con `@media (max-width:360px)` baja a 125 px (19,5 %).
- Resultado final del humo: 156 comprobaciones en verde (0 errores de consola, HUD ≤ 25 % del alto, hud/pista/botón de acción sin cruzarse, sin scroll horizontal, hojas dentro de la pantalla, banner "No se pudo abrir Nodo Enlace." con Reintentar al forzar el fallo del mapa).

**Límites conocidos**
- Una pestaña abierta con el código anterior que guarde después de la nueva conserva M02 (por el espejo plano) pero deja el progreso de M08 en cero.
- Fuera de lo pedido y anotado para después: `?fps=1` sigue activo en producción; `_headers` sin HSTS/COOP y las fuentes de Google sin SRI; la CSP conserva `'unsafe-inline'` (propuesta: hash del único script); `migrate` no limita el número de claves; `view.js` y `finish()`/`migrate()` son largos.
