# Ciudad Núcleo: distritos para todo el temario — Tanda 1 (diseño)

Rama: `feat/ciudad-2d`. Sigue a `2026-11-12-ciudad-nucleo-2d-design.md` (capítulo 1 en 2D, ya implementado).

## 1. Propósito y alcance

**Lo que pidió el usuario:** que el mundo abierto cubra todos los temas. Hoy solo existe el Taller Comunal (M02); los demás módulos (180 temas en total, M01–M10) se estudian fuera de la ciudad y Redes (M08) solo tiene un viaje 3D aparte.

**Decisiones del usuario:**
- Cada distrito completo y pensado a mano (mentores, criaturas, reparaciones, aprendices, torre), por tandas.
- Todos los distritos abiertos desde el inicio.
- La plaza es el centro; cada distrito es su propio mapa, se entra por un portal con fundido.
- El viaje 3D de Redes pasa a 2D dentro del distrito y se borra el motor 3D.
- Orden: Tanda 1 = base común + M02 migrado + M08 + borrar 3D. Tanda 2 = M03, M01, M10. Tanda 3 = M04, M06, M07. Tanda 4 = M05, M09. M11 queda "Próximamente" hasta que exista su guía.
- Introducción para quien juega por primera vez: qué es el juego y qué puede hacer.

**Este spec cubre solo la Tanda 1.** Las tandas 2–4 serán solo datos y texto con este mismo formato.

**Éxito de la Tanda 1:**
1. Desde la plaza se entra al Taller Comunal y a Nodo Enlace (M08) y se vuelve; los otros 9 portales dicen "Próximamente".
2. Una partida existente conserva todo su progreso de M02 y su posición.
3. Los 15 temas de M08 se aprenden, practican, prueban y enseñan dentro de la ciudad, y la ruta del paquete funciona en 2D.
4. Un jugador nuevo entiende qué es el juego y cómo se juega sin ayuda externa.
5. No queda código 3D ni Three.js en el repositorio ni en el HTML final.

**Fuera de alcance:** distritos de las tandas 2–4 y M11; poderes nuevos por distrito; tutorial obligatorio paso a paso; merge y deploy (requieren confirmación del usuario).

## 2. Escenas y recorrido

- **Una escena a la vez:** `plaza` o un distrito (`M02`, `M08`). Cada escena tiene su propio mapa prerenderizado a 8 px/m. Tope por distrito: 140 × 160 m (1120 × 1280 px).
- **Plaza:** mapa propio con sede, Iris, Espejo y **11 portales**: el norte (ángulo −90°) es M02, como hoy la calle al Taller; los 10 muros actuales (`WALL_DIST`, mismos ángulos y radio 38) son los demás. Las coordenadas de la plaza no cambian (centro en 0,0; `spawn` 0,8); su `bounds` es −50..50 × −50..40.
  - Portal de un distrito existente: arco neón abierto con el color del distrito y su nombre.
  - Portal de un distrito que no existe: el muro de La Maraña actual con cartel "Próximamente" (colisiona como hoy).
- **Cruzar un portal:** el héroe entra en la caja del portal → fundido de 0.5 s (instantáneo con `prefers-reduced-motion`) → aparece en `entry` del distrito. Durante el fundido la entrada y el cruce de portales quedan bloqueados (sin doble cambio de escena).
- **Volver:** cada distrito tiene un portal de salida junto a su entrada; al cruzarlo se vuelve a la plaza en el punto de regreso del portal del distrito (radio 33 sobre su ángulo, mirando al centro).
- **M02:** se separa de la plaza en su propio mapa y **conserva sus coordenadas** (`rect` −60..60 × −185..−50). Su entrada y su portal de salida quedan en el borde norte (z ≈ −52). **Se borra el puente** (`bridge`, sus cajas, su dibujo, su hoja y `bridgeSeen`).
- **Objetivo y flecha:**
  - Dentro de un distrito: el objetivo de ese distrito (§5.2).
  - En la plaza: si falta el prólogo, Iris; si no, el portal del **distrito recomendado** = el primero no restaurado en `ORDER` (`M02, M08, M03, M01, M10, M04, M06, M07, M05, M09, M11`) entre los que existen. Etiqueta: "Entra a <nombre del distrito>". Si todos los existentes están restaurados: "Ciudad al día: más distritos pronto".
  - Al restaurar un distrito, su objetivo final es "Vuelve a la plaza" (sustituye a "Cruza el puente").
- **Rangos:** sin cambio de umbrales (Becario 0, Junior 1, Semi-senior 3, Senior 6, Arquitecto 8, Tech Lead 11), contando distritos restaurados.
- **Página de módulo:** si el módulo tiene distrito, botón "▶ Ir al distrito" que abre la ciudad en `entry` de ese distrito. Se quita "Viaja como paquete".

## 3. Introducción para quien juega por primera vez

1. **Inicio:** bajo el título "Ciudad Núcleo", el texto exacto: "Estudia Ingeniería de Software recorriendo una ciudad: cada distrito es un módulo y cada vecino te enseña un tema." Debajo, tres íconos pixel (canvas `data-spr`, mentor, criatura y aprendiz) con las etiquetas "Aprende", "Ponte a prueba" y "Enseña".
2. **Primera entrada:** si `S.city.prologue` es falso, la hoja de Iris se abre sola al entrar a la ciudad (en cualquier escena, también desde "Ir al distrito"). Cuatro paneles, con "Saltar" en todos menos el último:
   1. Ciudad Núcleo — texto actual del panel 1.
   2. La Maraña — texto actual del panel 2.
   3. Tu papel — "Llegas como Becario. Cada distrito es un módulo del temario: restáuralo y subirás de rango hasta Tech Lead. Todos los portales de la plaza están abiertos."
   4. Cómo se juega — lista con ícono:
      - Mentor: "Habla con él y lee la lección de su tema."
      - Practicar: "Responde preguntas y gana estrellas."
      - Criatura: "Mezcla varios temas: véncela para probar lo que sabes."
      - Reparar y enseñar: "Arregla la ciudad y explica temas a los aprendices."
      - Torre: "El examen final del módulo restaura el distrito."
      - Controles, según `matchMedia('(pointer: coarse)')`: táctil "Arrastra en la mitad izquierda para caminar. Pellizca para acercar o alejar."; si no, "WASD o flechas para caminar, Shift para correr, E o Enter para hablar, rueda para el zoom."
   Cerrar o saltar marca `prologue = true`. Hablar con Iris después muestra el panel 4.
3. **Pistas en el momento:** aviso corto que no bloquea ni pausa (`role="status"`), se cierra solo a los 6 s o al tocarlo. Cada una sale una sola vez (`S.city.tips[id] = true`). Una a la vez; si otra está visible, espera a que se cierre.

   | id | Cuándo | Texto |
   |---|---|---|
   | `talk` | primer mentor a alcance de "Hablar" | "Toca Hablar para aprender su tema." (laptop: "Pulsa E para aprender su tema.") |
   | `star` | primera estrella ganada en un tema de distrito (se muestra al volver a la ciudad) | "Con 1 estrella ya puedes enseñar ese tema a un aprendiz." |
   | `creature` | primera criatura a alcance | "Las criaturas mezclan varios temas: aprende antes de enfrentarlas." |
   | `repair` | primera reparación a alcance | "Repara la ciudad respondiendo sin ayudas." |
   | `tower` | primera vez que una torre queda desbloqueada | "La torre está abierta: es el examen final del distrito." |
   | `portals` | primera vez en la plaza con un distrito restaurado | "Hay más distritos detrás de los portales." |
4. **Pausa:** botón "¿Cómo se juega?" que abre el panel 4.
5. **Carteles de portal:** al tener un portal a alcance, la etiqueta de acción muestra "<MXX> · <nombre> · <n> temas · <p> % restaurado" (p = `restoration` del distrito, §5.2). Portal "Próximamente": "<MXX> · Próximamente".

## 4. Datos

### 4.1 Archivos

- `city/layout.mjs` (build): el reparto actual de `districts.mjs` como helper reutilizable: `makeLayout({ streetX, streetZ, xRange, zRange, step: 8, min: 7 })` → `{ spot(x, z), take() }`. Lanza error si faltan lugares.
- `city/districts/m02.mjs` y `city/districts/m08.mjs`: un distrito cada uno (formato §4.2).
- `city/districts/m08_route.mjs`: estaciones de la ruta (hoy `trip/stations.mjs`, sin cambios de contenido).
- `city/districts.mjs`: rangos, `ORDER`, plaza (con `portals` en vez de `roads`) e import de los distritos existentes. `CITY_DATA = { ranks, order, radius, plaza, districts }`.

### 4.2 Formato de un distrito

```
{ id: 'M08', name, colors: { a, b }, seed,
  bounds: { minX, maxX, minZ, maxZ }, entry: { x, z, yaw }, exit: { x, z, w, d },
  streets: { x: [...], z: [...] }, blocks: [[x, z], ...],
  mentors: [{ id, topic, name, x, z }], creatures: [{ id, name, topics, area: { x, z, r } }],
  repairs: [{ id, topic, label, x, z }], apprentices: [{ id, topic, name, mode: 'explain'|'correct', x, z }],
  tower: { id: 'torre', x, z, w, d, h }, need,
  route?: { stations, pads: [{ x, z }] } }
```

La plaza tiene el mismo esqueleto mínimo de escena (`bounds`, `entry` = `spawn`) más `hq`, `director`, `mirror`, `portals: [{ dist, angle, x, z, w, d, back: { x, z, yaw } }]`.

### 4.3 Reglas (las comprueba `validate.mjs`; un fallo aborta la build)

1. Cada tema del módulo tiene exactamente un mentor; ningún mentor apunta a un tema inexistente.
2. La unión de los temas de las criaturas es el módulo completo y ningún tema se repite; cada criatura tiene de 2 a 5 temas.
3. Toda reparación usa un tema con al menos 2 preguntas entre `scenario` y `error` (lo que pide `repairItems`).
4. Todo aprendiz `correct` usa un tema con al menos una pregunta `error`.
5. `need` ≤ número de aprendices.
6. Ids únicos dentro del distrito; todos los puntos dentro de `bounds`, fuera de edificios y torre, y con separación ≥ 7 m.
7. `bounds` ≤ 140 × 160 m.
8. `route` (si existe): cada `kp` apunta a un keyPoint real que contiene `expect`, y hay un `pad` por estación.
9. Cada `dist` de un portal existe en `ORDER`; hay exactamente 11 portales.

### 4.4 M02 (Taller Comunal)

Mismos mentores, criaturas, reparaciones, aprendices, torre, `need` 8, semilla y coordenadas que hoy. Se quita el puente. Su `bounds` pasa a −60..60 × −185..−46.

### 4.5 M08 (Nodo Enlace)

- Colores verde `#3dff9a` y cian `#5ce1ff`; edificios con antenas y racks (variante de dibujo por distrito, misma función de mapa).
- **Mentores (T01–T15):** Alma, Baltasar, Celia, Darío, Estela, Fausto, Greta, Hernán, Irene, Julián, Lía, Mateo, Noemí, Óscar, Paula (en ese orden de tema).
- **Criaturas:**

  | id | nombre | temas |
  |---|---|---|
  | `ruido` | Ruido Blanco | T01, T02, T03 |
  | `perdido` | Paquete Perdido | T04, T07, T14 |
  | `capas` | Capa Confusa | T05, T08, T09, T13 |
  | `handshake` | Handshake Roto | T06, T10, T12 |
  | `espia` | Espía del Canal | T11, T15 |

- **Reparaciones:** T02 cable cortado · T03 antena sin sentido · T04 router de casa sin salida · T07 dirección IP duplicada · T10 conexión a medias · T11 candado HTTPS roto · T12 puerto bloqueado · T14 enlace saturado.
- **Aprendices (`need` 6):** Brisa T01 explicar · Ciro T02 corregir · Delia T04 explicar · Eloy T05 explicar · Flor T07 corregir · Gus T08 explicar · Iker T10 corregir · Luna T12 explicar · Teo T13 corregir.
- **Torre:** jefe de M08 (`S.boss.M08`).
- **Ruta del paquete:** 10 pads en las calles, en el orden de las estaciones S0–S9.

## 5. Guardado y lógica

### 5.1 Forma de `S.city`

```
{ prologue, run, tips: { talk?, star?, creature?, repair?, tower?, portals? },
  scene: 'plaza' | 'M02' | 'M08', at: { x, z, yaw },
  d: { M02: { beaten, repairs, taught }, M08: { beaten, repairs, taught, route: { done } } },
  restored: {...}, powers: {...} }
```

- `normalizeCity(raw, D, bossPassedOf, todayStr)`: `bossPassedOf(mid)` → boolean. Listas blancas como hoy, ahora por distrito:
  - `scene` desconocida → `plaza` en `spawn`.
  - `d[mid]` solo para distritos existentes; ids solo los de ese distrito; fechas válidas y no futuras; `true` estricto.
  - `tips`: solo los 6 ids, valor `true`.
  - `route.done`: entero recortado a 0..número de estaciones.
  - `at` dentro de `bounds` de la escena y fuera de sus cajas; si no, `entry` de la escena.
  - `restored` y `powers` se recalculan siempre: `restored[mid]` ⇔ jefe aprobado y `taught` ≥ `need`. M02 restaurado ⇒ `powers.planos`.
- **Migración (guardado sin `d`):** `beaten`, `repairs`, `taught` planos → `d.M02`. Si `at` cae dentro del `rect` de M02 → `scene: 'M02'` con las mismas coordenadas; si no → `scene: 'plaza'` con las mismas coordenadas (validadas). `bridgeSeen` se descarta.

### 5.2 Historia por distrito (`city/story.js`)

- `taughtCount(C, D, mid)`, `restoration(C, D, mid, bossPassed)`, `applyRestore(C, D, bossPassedOf)` (idempotente; `changed` lista los distritos que pasaron a restaurados), `rankOf(C, D)`, `apprenticesAvailable(C, D, mid, starsOf)`.
- `nextObjective(C, D, scene, ctx)`:
  - En un distrito: el orden actual (criaturas con sus mentores y estrellas → reparaciones → aprendices → criaturas de hoy), con la torre primero si está desbloqueada y sin aprobar. En M08, entre criaturas y reparaciones: si `route.done` < 10, `{ kind: 'route', label: 'Recorre la ruta del paquete' }` (recomendado, no requisito para restaurar). Restaurado → `{ kind: 'plaza', label: 'Vuelve a la plaza' }`.
  - En la plaza: §2.
- `ctx` y las estrellas/aprendido usan el módulo del distrito (`mod(mid)`, claves `mid + ':' + topic`).

### 5.3 Ruta del paquete (`city/route.js`)

- `TripFlow` pasa a `city/route.js` como `CityRoute`, con un cambio: `deps.from` (estación inicial, 0..n−1) para reanudar.
- Llegar a un pad abre la hoja: chip "Estación n de 10 · <nombre>", el keyPoint de la estación y "Ver pregunta"; luego las mismas preguntas y reintento que hoy. Al terminar la estación: `route.done = n`, se guarda, se enciende el tramo de cable hasta el pad siguiente y un paquete (sprite) lo recorre; el HUD muestra las capas (`Datos`, `Puerto`, `IP`, `Trama`) según `layers`.
- Solo el pad `done` (el siguiente) está activo; los anteriores encendidos, los siguientes apagados. Al terminar la 10.ª: hoja de resumen con XP y fallos (como `onSummary` hoy).
- XP por respuesta: igual que hoy (`xpBase` + pasiva, `recordAnswer`).
- Cerrar la hoja a mitad de una estación no la cuenta; se reanuda desde esa estación.

## 6. Motor

- `CityMove.boxesFor(scene)`: edificios, torre, sede, muros "Próximamente" y borde de la escena. Sin puente.
- `CityWorld2D.create(canvas, scene, opts)`: dibuja cualquier escena; `buildMap` lee colores y variante del distrito. `api` igual que hoy más lo que haga falta para pads/cable de la ruta. Sprites compartidos entre escenas (los atlas no se rehacen).
- `view.js`: `cityEnter(sceneId, at)` hace el cambio de escena: bloquea entrada → fundido → `dispose` del mundo anterior → `create` del nuevo → guarda `scene` y `at` → desbloquea. `view.js` ya mide ~610 líneas: la lógica de la introducción (paneles y pistas) va en `city/intro.js` y la de la ruta en `city/route_view.js` para no crecer más.
- `Pauser` pasa de `three/shared.js` a `city/pauser.js`.
- Build: ancla de ciudad recibe `pauser`, `route`, `intro`, `route_view`; se quita `/*__TRIP__*/` y todo lo que inyecta (`Three3D`, `TripFlow`, `TripScene`, `TRIP_STATIONS`, `#three-src`).

## 7. Borrado del 3D

Se borran: `vendor/three.module.min.js`, `trip/` completo (lo útil se mueve, §5.3), `three/` completo (`Pauser` se mueve), `loadThree`, `dynImport`, `tripScenePath`, `trip*` de `engine.html`, `#trip-root` y su CSS, la vista `trip`, el botón "Viaja como paquete", los ganchos `__TRIP_IMPORT__` y `__TRIP_SCENE__`, y las pruebas de la escena 3D. Las pruebas de `TripFlow` se conservan apuntando a `city/route.js`. `blob:` sale de `script-src` en `_headers` si nada más lo usa.

`validate.mjs` agrega a la guarda de identificadores retirados: `Three3D`, `TripScene`, `TRIP_STATIONS`, `trip-root`, `tripStop`, `loadThree`, `three-src`, `three.module`, `bridgeSeen`.

## 8. Errores

- Fallo al crear el mundo de un distrito → vuelve a la plaza con el aviso "No se pudo abrir el distrito." (`role="alert"`); la partida no se pierde. Si falla la plaza → mensaje actual "No se pudo mostrar la ciudad.".
- Pérdida del contexto durante el juego → "Se perdió la vista de la ciudad." como hoy.
- Guardado dañado → §5.1 (nunca lanza).
- Doble cruce de portal o pulsaciones durante el fundido → ignorados.

## 9. Rendimiento

Un solo mapa vivo; el anterior se deja a 0 × 0 en `dispose`. Atlas de sprites compartidos. Mismo presupuesto: un rAF, ≤ 200 partículas, `pr` en [1, 1.5]. El HTML final baja ~690 KB al salir Three.js. `?fps=1` sirve para medir cada escena.

## 10. Pruebas

- **Datos:** reglas §4.3 sobre M02 y M08; un distrito mal formado (tema sin mentor, tema repetido en criaturas, reparación sin preguntas) hace fallar `validate.mjs`.
- **Guardado:** migración de una partida vieja (progreso M02 a `d.M02`, posición conservada en M02 y en la plaza, `bridgeSeen` descartado); escena inválida → plaza; ids cruzados entre distritos descartados; `route.done` recortado; propiedades y fuzzing de `normalizeCity` (nunca lanza, resultado siempre válido, idempotente).
- **Historia:** objetivo en cada distrito y en la plaza (portal recomendado en `ORDER`); restauración y rango con varios distritos; `applyRestore` idempotente; la ruta aparece entre criaturas y reparaciones y no bloquea la restauración.
- **Escenas:** plaza → M08 → plaza aparece en `back` del portal M08; fundido bloquea doble entrada; error al crear el mundo devuelve a la plaza con aviso; "Ir al distrito" abre en `entry`.
- **Introducción:** Iris se abre sola la primera vez y no la segunda; cada pista sale una vez y no pausa; "¿Cómo se juega?" en pausa; controles según `pointer: coarse`; texto de inicio exacto.
- **Ruta:** pruebas de `TripFlow` migradas; `from` reanuda; cerrar a mitad no cuenta; cable y pads según `done`.
- **Limpieza:** guarda de identificadores retirados; el HTML final no contiene `three` ni `TripScene`.
- **Humo (Playwright):** capturas de la plaza, M02 y M08, teléfono vertical y laptop horizontal; recorrido plaza → M08 → plaza sin errores de consola.
