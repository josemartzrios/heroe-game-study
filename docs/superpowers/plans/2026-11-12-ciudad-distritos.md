# Ciudad Núcleo: distritos (Tanda 1) — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convertir Ciudad Núcleo en plaza + un mapa por distrito, migrar el Taller Comunal (M02), agregar Nodo Enlace (M08) con la ruta del paquete en 2D, una introducción para jugadores nuevos, y borrar todo el 3D.

**Architecture:** Los distritos son datos (`city/districts/*.mjs`) que `build.mjs` inyecta como `CITY_DATA`. Un solo motor (`move`, `story`, `world2d`, `sprites2d`, `view`) trabaja sobre la escena activa (`CD.scene`). El guardado pasa a `S.city.d[mid]` con listas blancas, migración y espejo plano de M02. La ruta del paquete reutiliza la máquina de estados `TripFlow` como `CityRoute`.

**Tech Stack:** HTML único generado por `node build.mjs`; JS ES5 dentro de la IIFE de `engine.html`; datos ESM (`.mjs`) solo en build; pruebas Node 22 + jsdom 31 + fast-check (solo pruebas); humo con Playwright/Chromium desde el scratchpad.

**Spec:** `docs/superpowers/specs/2026-11-12-ciudad-distritos-design.md` (v2). El spec es la autoridad; ante conflicto, gana el spec.

## Global Constraints

- ES5 en todo lo que va al HTML (sin `let`/`const`/flechas/clases en `city/*.js` y `engine.html`); `.mjs` de datos pueden usar ES moderno (solo build).
- Alias para no tapar globales en la IIFE (`CM` = CityMove, `SP` = CitySprites, etc.). Ningún `var CityX` local que tape al global.
- Texto de datos a `innerHTML` solo con `esc()`/`fmt()` (también atributos `data-*`); HUD, carteles, pistas y anuncios con `textContent`.
- Claves del guardado nunca indexan datos sin `hasOwnProperty` sobre los datos; `d` se construye recorriendo `Object.keys(D.districts)`.
- Ganchos de prueba solo con `window.__CITY_TEST__ === true` y listados en la guarda de `validate.mjs`.
- "No guardar código que no se use": todo lo reemplazado se borra en la misma tarea; nada queda comentado.
- Ningún archivo de código nombra un distrito concreto salvo `city/districts.mjs` (imports) y el registro de poderes (`planos`) de `engine.html` (spec §4.6).
- Textos visibles: copiar exactos del spec (§2, §3, §4.4, §4.5, §5.6, §8).
- `ORDER = ['M02', 'M08', 'M03', 'M01', 'M10', 'M04', 'M06', 'M07', 'M05', 'M09', 'M11']`. Rangos `[[0,'Becario'],[1,'Junior'],[3,'Semi-senior'],[6,'Senior'],[8,'Arquitecto'],[11,'Tech Lead']]`.
- Presupuesto: un rAF, ≤ 200 partículas, `pr` en [1, 1.5], mapa ≤ 1120 × 1280 px por escena.
- Cada commit incluye `juego_estudio.html` recompilado y termina con `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Nunca correr dos `node build.mjs` a la vez** (las pruebas de build reescriben `juego_estudio.html`).
- Suite estándar (`SUITE`): `cd /home/josma/myprojects/juego && node build.mjs && node validate.mjs && for f in tests/*.cjs tests/adv/attacks.cjs; do node "$f" >/dev/null 2>&1 || echo "FALLO $f"; done; echo FIN` — verde = solo `FIN`.
- Suite adversarial (`ADV`): `for f in tests/adv/*.cjs; do node "$f" >/dev/null 2>&1 || echo "FALLO $f"; done; echo FIN` (tarda varios minutos; correr en segundo plano).

## Review Focus

1. **Partida vieja real con M02 restaurado** (jefe M02 aprobado, 8 enseñados, `at` dentro de M02, `bridgeSeen: true`): al entrar aparece en M02, restaurado, rango Junior, sin volver a celebrar. → prueba en Task 5 (`legacy save restaurado entra a M02 sin celebrar`).
2. **Ronda iniciada en M08 que se resuelve** (batalla ganada, reparación, enseñanza): el resultado se escribe en `d.M08`, nunca en `d.M02` ni en el espejo plano. → Task 5 (`cityResolve escribe en d.M08`).
3. **Salir al inicio o perder la pestaña durante el fundido**: sin errores de consola, sin rAF vivo, y al volver a la ciudad se abre la escena guardada. → Task 5 (`salir durante el fundido`).
4. **Solo teclado**: plaza → portal M08 (E) → mentor (E) → cerrar hoja (Esc) → salida → plaza, sin que el foco quede en `body`. → Task 5 (`recorrido solo teclado`).
5. **Resize u orientación justo al llegar a una escena**: el mapa nuevo se encuadra con su `bounds` (no con los de la escena anterior). → Task 4 (`resize tras create usa bounds de la escena`).

---

## Mapa de archivos

| Archivo | Responsabilidad |
|---|---|
| `city/layout.mjs` (nuevo) | Reparto de lugares en calles (`makeLayout`), solo build |
| `city/check_district.mjs` (nuevo) | Reglas de un distrito (spec §4.3), solo build |
| `city/districts/m02.mjs` (nuevo) | Datos del Taller Comunal |
| `city/districts/m08.mjs` (nuevo) | Datos de Nodo Enlace |
| `city/districts/m08_route.mjs` (nuevo, desde `trip/stations.mjs`) | Estaciones de la ruta |
| `city/districts.mjs` | Rangos, `ORDER`, plaza con portales, import de distritos |
| `city/move.js` | Movimiento, colisiones por escena, `portalAt` |
| `city/story.js` | Guardado (normalizar/migrar), restauración, rango, objetivo |
| `city/route.js` (nuevo, desde `trip/flow.js`) | `CityRoute`: máquina de estados de la ruta |
| `city/sprites2d.js` | Atlas de sprites desde `CITY_DATA` |
| `city/world2d.js` | Mundo por escena, `Pauser` interno, pads y cable |
| `city/view.js` | Vista de la ciudad sobre `CD.scene`, `cityEnter`, portales |
| `city/intro.js` (nuevo) | Prólogo, pistas, "¿Cómo se juega?", controles |
| `city/route_view.js` (nuevo) | Hojas y HUD de la ruta (funciones movidas de `engine.html`) |
| `engine.html` | `bossPassedOf`, `cityD`, `cfg.city.mid`, espejo, `_bak`, inicio, página de módulo |
| `build.mjs`, `validate.mjs`, `_headers` | Inyección, validador genérico, guarda, CSP |

---

### Task 1: `makeLayout` y M02 como archivo de distrito

**Files:**
- Create: `city/layout.mjs`, `city/districts/m02.mjs`, `tests/city_layout.cjs`
- Modify: `city/districts.mjs` (importa M02 de su archivo; la forma exportada **no cambia** en esta tarea)

**Interfaces:**
- Produces: `makeLayout({ reserve, streetX, streetZ, xRange: [min, max], zRange: [hi, lo], step = 8, min = 7 })` → `{ take() }` — `take()` devuelve `{ x, z }` y lanza `'faltan lugares'` al agotarse. Recorre igual que hoy: primero cada `z` de `streetZ` con `x` de `xRange[0]` a `xRange[1]` en pasos de `step`, luego cada `x` de `streetX` con `z` de `zRange[0]` a `zRange[1]` bajando de a `step`; un punto entra si está a ≥ `min` de los ya tomados y de `reserve`.
- Produces: `export const district` en `m02.mjs` con el formato §4.2 (sin `bridge`, sin `route`), `style: 'taller'`, `celebrate` de spec §4.4, etiquetas de reparación con artículo: "el semáforo", "la puerta de arranque", "la grúa trabada", "la terminal con humo", "el candado roto", "el farol apagado", "el buzón sin dirección", "el letrero borrado", "la ventanilla de peticiones", "la cerradura sin llave".

- [ ] **Step 1: Escribir la prueba**

`tests/city_layout.cjs` (estilo `ok(name, cond)` como `tests/city_story.cjs`):
- `M02 conserva coordenadas`: para cada mentor, criatura (`area`), reparación y aprendiz, `x`/`z` iguales a `tests/fixtures/m02_coords.json`. Ese archivo se genera **antes de tocar `districts.mjs`**, con un `node -e` que importa el `districts.mjs` actual y vuelca `{id: [x, z]}`; se comitea con la prueba.
- `torre igual`: `{x:0, z:-162, w:8, d:8, h:20}`.
- `makeLayout lanza al agotarse`: con `streetX:[0], streetZ:[], zRange:[0,-8]`, el tercer `take()` lanza.
- `reserve excluye`: con `reserve:[[0,0]]`, ningún punto devuelto a < 7 m de (0,0).

- [ ] **Step 2: Correr y ver fallar**

Run: `node tests/city_layout.cjs`
Expected: FAIL (no existe `city/layout.mjs`).

- [ ] **Step 3: Implementar `city/layout.mjs` y `city/districts/m02.mjs`**; `districts.mjs` arma su export actual (incluido el puente, que se quita en Task 3) a partir de `m02.mjs`. Para que M02 dé idénticas coordenadas, `reserve` = `[[0,-162],[0,-178]]` en esta tarea (el puente aún reserva su lugar; Task 3 quita `[0,-178]` y la prueba demuestra que no cambia nada).

- [ ] **Step 4: Correr**

Run: `node tests/city_layout.cjs && SUITE`
Expected: todo PASS; `SUITE` imprime solo `FIN`.

- [ ] **Step 5: Commit** — `feat(city): makeLayout y datos de M02 en su propio archivo`

---

### Task 2: M08, ruta y validador genérico de distritos

**Files:**
- Create: `city/districts/m08.mjs`, `city/districts/m08_route.mjs` (mover `trip/stations.mjs` con `git mv`), `city/check_district.mjs` (solo build), `tests/validate_districts.cjs`
- Modify: `build.mjs` (importa estaciones del nuevo archivo), `validate.mjs` (usa `checkDistrict`), `tests/spec_districts_feasibility.cjs` (rutas nuevas)

**Interfaces:**
- Consumes: `makeLayout` (Task 1).
- Produces: `export const district` en `m08.mjs` con todos los valores de spec §4.5 (geometría, nombres, ids `m01–m15`, criaturas, `r01–r08`, `a01–a09`, `need` 6, `celebrate` sin `power`, `route: { stations, pads }` con 10 pads sobre las calles de la entrada a la torre, reservados en `makeLayout`).
- Produces: `export function checkDistrict(dist, mod, opts)` en `city/check_district.mjs` → arreglo de errores (strings) con las reglas 1–8 de spec §4.3; `mod` = módulo expandido (`topics`, `questions` con `type`/`topic`), `opts = { boxes, forbidden }`. `validate.mjs` lo importa y lo aplica a M02 (forma actual) y a M08 en esta tarea, y a cada distrito de `CITY_DATA.districts` desde Task 3.

- [ ] **Step 1: Escribir la prueba** `tests/validate_districts.cjs`: importa `checkDistrict` de `city/check_district.mjs` y el módulo M08 expandido (misma función `expand` que `build.mjs`; si no es importable, exportarla de un `.mjs` común en este paso) y comprueba:
  - `M02 válido` y `M08 válido`: 0 errores.
  - Errores esperados (una mutación cada uno sobre una copia de M08): `tema sin mentor` (quitar `m01`), `tema repetido` (agregar T01 a `capas`), `criatura < 8 preguntas` (criatura nueva solo con T01), `reparación sin preguntas` (r con T01), `correct sin error` (aprendiz T02 `correct` con una copia del módulo sin las preguntas `error` de T02), `id __proto__`, `punto en edificio` (mentor en el centro de una manzana), `need > aprendices`, `kp desalineado`, `suma de ask ≠ 18`.
- [ ] **Step 2: Correr y ver fallar** — `node tests/validate_districts.cjs` → FAIL (no hay `checkDistrict`).
- [ ] **Step 3: Implementar** `m08.mjs`, mover estaciones, `checkDistrict` (reutiliza `idOk`, `FORBID`, `forbidden` y `count` actuales), y reemplazar en `validate.mjs` el bloque fijo de M02 y el de `TRIP_STATIONS` por llamadas a `checkDistrict` (el bloque del vendor sigue hasta Task 8).
- [ ] **Step 4: Correr** — `node tests/validate_districts.cjs && node tests/spec_districts_feasibility.cjs && SUITE` → PASS, `FIN`.
- [ ] **Step 5: Commit** — `feat(city): datos de Nodo Enlace (M08) y validador genérico de distritos`

---

### Task 3: Núcleo lógico por escenas (datos, `move`, `story`)

Esta tarea cambia la forma de `CITY_DATA`; `engine.html`/`view.js`/`world2d.js` se adaptan en Tasks 4–5. **Al terminar esta tarea solo se exigen verdes sus pruebas nombradas**; `SUITE` vuelve a verde al final de Task 5 (anotarlo en el ledger).

**Files:**
- Modify: `city/districts.mjs`, `city/move.js`, `city/story.js`, `city/districts/m02.mjs` (sin puente), `validate.mjs` (portales, regla 9)
- Test: reescribir `tests/city_story.cjs`, `tests/city_move.cjs`; adaptar `tests/adv/spec_districts_attack.cjs` a la forma nueva

**Interfaces:**
- Produces `CITY_DATA = { ranks, order, radius, plaza, districts: { M02, M08 } }`; `plaza = { bounds: {minX:-50,maxX:50,minZ:-50,maxZ:40}, entry: {x:0,z:8,yaw:0}, hq, director, mirror, portals }`; `portals[k] = { dist, angle, x, z, w: 6, d: 2, back: {x, z, yaw} }` para los 11 de `ORDER` (M02 a −90°, el resto a `-90 + 33·(k+1)` en el orden de hoy `M04, M03, M08, M06, M07, M05, M01, M11, M10, M09`), radio 38, `back` a radio 33 mirando al centro. M02: `bounds` −60..60 × −185..−44, `entry {x:0,z:-52,yaw:Math.PI}`, `exit {x:0,z:-47,w:6,d:2}`.
- Produces en `CityMove`: `scene(D, sceneId)` → objeto escena (`D.plaza` o `D.districts[id]` con `own`); `boxesFor(D, sceneId)` (sin `restored`); `portalAt(D, sceneId, x, z)` → `dist` del portal (en la plaza) o `'plaza'` (salida de un distrito) o `null`; un portal de un distrito **existente** no es sólido; uno inexistente sí (caja del muro).
- Produces en `CityStory` (firmas de spec §5.3): `normalizeCity(raw, D, bossPassedOf, todayStr)`, `taughtCount(C, D, mid)`, `restoration(C, D, mid, bossPassed)`, `applyRestore(C, D, bossPassedOf)` → `{ changed: [mid] }`, `rankOf(C, D)`, `apprenticesAvailable(C, D, mid, starsOf)`, `nextObjective(C, D, sceneId, ctx)`, `LEGACY_M02_RECT`, `mirror(C)` (copia `d.M02.{beaten,repairs,taught}` a los planos). `ctx` gana `routeDone` implícito vía `C.d[mid].route`. Objetivo en la plaza: `{ kind: 'portal', id: mid, label: 'Entra a ' + name }` / `{ kind: 'director', … }` / `{ kind: 'none', label: 'Ciudad al día: más distritos pronto' }`.

- [ ] **Step 1: Escribir las pruebas** (casos exactos de spec §11 "Guardado" e "Historia"):
  - `city_story.cjs`: `fresh tiene d.M02 y d.M08 con route.done 0`; `migración plana → d.M02`; `at viejo en M02 → scene M02 mismas coords`; `at z=-46 → M02`; `at z=-190 → M02 recortado a -185`; `at calle (0,-38) → back del portal M02`; `d gana sobre planos`; `d null/[]/"x" → migra`; `scene __proto__/constructor/toString/M99 → plaza`; `d.__proto__ y ids de M08 en d.M02 descartados`; `route.done NaN,"3",3.7,-1,Infinity → 0; 99 → 10`; `bossPassedOf no función → sin restaurar, no lanza`; `restored y powers recalculados; M08 restaurado sin poder`; `bridgeSeen descartado`; `mirror copia d.M02`; `applyRestore idempotente, changed lista`; `rankOf: 0 → Becario, 1 → Junior, 2 → Junior`; `objetivo plaza: director → Entra a Taller Comunal → (M02 restaurado) Entra a Nodo Enlace → (ambos) Ciudad al día`; `objetivo M08 ruta entre criaturas y reparaciones con label 'Ruta del paquete · estación 1 de 10'`; `objetivo distrito restaurado → Vuelve a la plaza`; `reparación label 'Repara el semáforo'`.
  - `city_move.cjs`: `boxesFor plaza incluye 9 muros Próximamente y no los portales M02/M08`; `portalAt en la boca del portal M08 → 'M08'`; `portalAt en exit de M02 → 'plaza'`; `boxesFor M02 sin puente`; `entry y back fuera de cajas y portales`.
  - `spec_districts_attack.cjs`: propiedades P1–P6 a la forma nueva (P2: ids por distrito; P4: dentro de `bounds` de la escena; P6 por cada `mid`), P7 `nunca contiene una clave de escena o distrito no propia`; ≥ 5000 ejecuciones.
- [ ] **Step 2: Correr y ver fallar** — `node tests/city_story.cjs; node tests/city_move.cjs` → FAIL (firmas viejas).
- [ ] **Step 3: Implementar** datos, `move.js` y `story.js` según spec §5.1–§5.3 (reutilizar `pick`, `plainObj`, `validDate`, `normYaw`). Agregar a `validate.mjs` la regla 9 (portales) y quitar la comprobación de `roads.length` y puente.
- [ ] **Step 4: Correr** — `node build.mjs && node validate.mjs && node tests/city_story.cjs && node tests/city_move.cjs && node tests/city_layout.cjs && node tests/validate_districts.cjs && node tests/adv/spec_districts_attack.cjs` → todo PASS.
- [ ] **Step 5: Commit** — `feat(city): escenas, guardado por distrito y migración en move/story`

---

### Task 4: Mundo y sprites por escena

**Files:**
- Modify: `city/world2d.js`, `city/sprites2d.js`, `build.mjs` (orden de inyección sin `Three3D` para la ciudad)
- Test: `tests/city_world2d.cjs`, `tests/city_sprites.cjs` (reescribir lo de M02/puente; mover aquí las pruebas de `Pauser` de `tests/three_shared.cjs` y `tests/scene.cjs:52-60`)

**Interfaces:**
- Consumes: `CityMove.scene`, `boxesFor(D, sceneId)` (Task 3).
- Produces: `CityWorld2D.create(canvas, D, sceneId, opts)` → Promise<api>, `api = { resize, setPaused(reason, on), dispose, encounter(id), dissolve(id), stats(), setRoute(done) }`; `opts` igual que hoy (`reducedMotion`, `tick`, `state`, `onLost`). `CityWorld2D.Pauser` expuesto solo si `window.__CITY_TEST__ === true` (y en `require`).
- Produces: `CitySprites.frame(kind, variant, face, step)` con `variant` = `mid + ':' + id` para personas y criaturas (`'iris'` sin prefijo); variantes generadas desde `CITY_DATA` (todos los distritos); forma/colores por hash del variant. `paintIcons(root)` pinta `data-spr` ∈ `hero | mentor | creature | apprentice`.
- Ruling previsto: los ids se repiten entre distritos (`m01` en M02 y M08), por eso la variante lleva el `mid`.

- [ ] **Step 1: Escribir las pruebas** (canvas falso como hoy):
  - `create(plaza)` dibuja 11 portales (2 arcos abiertos con el color del distrito, 9 muros) y no lanza; `create(M02)` sin puente; `create(M08)` con `style 'red'` (antenas: al menos un `fillRect` en la franja de azotea por edificio).
  - `chispas sin reparaciones no lanzan` (plaza, 300 ticks sin `onLost`).
  - `setRoute(n)` no vuelve a llamar a `buildMap` (espía) y cambia el color de los pads `< n`.
  - `resize tras create usa bounds de la escena` (Review Focus 5): crear M08, `resize`, el encuadre calcula con 120 × 130 m.
  - `Pauser`: las pruebas movidas pasan.
  - Sprites: `frame('person','M08:m01',…)` distinto de `frame('person','M02:m01',…)`; variante desconocida no lanza y usa la primera; `paintIcons` pinta los 4 tipos.
- [ ] **Step 2: Correr y ver fallar** — `node tests/city_world2d.cjs; node tests/city_sprites.cjs` → FAIL.
- [ ] **Step 3: Implementar** según spec §6 (pads y cable precalculados en `create` y dibujados por cuadro; `Pauser` copiado dentro de `world2d.js`, sin alias `T3`; chispas con guarda de lista vacía).
- [ ] **Step 4: Correr** — `node build.mjs && node tests/city_world2d.cjs && node tests/city_sprites.cjs` → PASS.
- [ ] **Step 5: Commit** — `feat(city): mundo y sprites por escena, Pauser interno`

---

### Task 5: Motor y vista con escenas y portales

**Files:**
- Modify: `engine.html` (spec §5.5, botón "Ir al distrito", quitar "Viaja como paquete" de la página de M08), `city/view.js`
- Test: reescribir lo afectado en `tests/city_engine.cjs`, `tests/city_rounds.cjs`, `tests/preserve_2d.cjs`, `tests/migrate.cjs`, `tests/review_gaps.cjs`, `tests/record2.cjs`; nuevo `tests/city_scenes.cjs`

**Interfaces:**
- Consumes: Tasks 3–4.
- Produces en `engine.html`: `bossPassedOf(mid)`, `cityD(mid)`, `cfg.city = { kind, id, mid }`, `cityRestorePending` como arreglo de mids, `save()` llama a `CityStory.mirror(S.city)` antes de serializar, `load()` con `_bak`, `migrate()` sin `__proto__`.
- Produces en `view.js`: `CD.scene`, `cityEnter(sceneId, at)`, `cityCelebrate(mid, pre)`, `cityPortal(o)` (acción del portal), banner de error con "Reintentar"; `cityZone` y `cityBridge` borrados; `citySave()` escribe `scene` y `at`.

- [ ] **Step 1: Escribir las pruebas** `tests/city_scenes.cjs` (boot jsdom como `city_engine.cjs`, mundo falso que registra `create(canvas, D, sceneId)`):
  - `entra por botón`: héroe junto al portal M08 → `#city-act` "Entrar a Nodo Enlace" → clic → tras 250 ms `create` con `'M08'`, `S.city.scene === 'M08'`, `at` = `entry` de M08.
  - `entra al pisar` la caja del portal.
  - `Próximamente`: portal M03 → `#city-act` "Ver M03" → hoja "M03 · Fundamentos de internet" con "Este distrito llegará pronto." e "Ir al módulo". Portal M11 (sin módulo) → hoja "M11 · Próximamente" sin "Ir al módulo" (ruling: M11 no tiene módulo todavía).
  - `vuelve a back` del portal M08 al pisar la salida.
  - `doble entrada ignorada` (dos clics durante el fundido → 1 `create`).
  - `no espera transitionend` (con `prefers-reduced-motion`, el cambio termina sin disparar eventos de transición).
  - `salir durante el fundido` (Review Focus 3): `quit` a los 100 ms → 0 errores, `create` tardío descartado, sin rAF vivo; volver a la ciudad abre la escena guardada.
  - `error al crear M08` → escena plaza, banner `role="alert"` "No se pudo abrir Nodo Enlace." con foco en "Reintentar"; "Reintentar" vuelve a intentar.
  - `anuncio y foco`: `#city-live` "Entraste a Nodo Enlace. Objetivo: …", foco en `#city-pause`; `#city-ui-main` con `inert` durante el fundido.
  - `HUD`: plaza "Distritos 0 de 2"; M08 "Nodo Enlace 0 %".
  - `Ir al distrito` desde la página de M08 abre en `entry` de M08.
  - `ninguna lectura de M02 en M08`: envolver `CITY_DATA.districts.M02` con un Proxy que cuenta accesos al recorrer M08 (abrir mentor, practicar, batalla, enseñar) → 0.
  - `cityResolve escribe en d.M08` (Review Focus 2): ganar batalla `ruido`, reparación `r01`, enseñanza `a01` en M08 → solo `d.M08` cambia; espejo plano = `d.M02`.
  - `legacy save restaurado entra a M02 sin celebrar` (Review Focus 1).
  - `celebración M08`: restaurar M08 → hoja con el texto de `celebrate` y sin "Poder nuevo".
  - `recorrido solo teclado` (Review Focus 4).
  - `guardado ilegible deja _bak`: `localStorage[KEY] = '{"v":1,'` (JSON roto) → tras arrancar y guardar, `localStorage[KEY + '_bak']` contiene exactamente ese texto. El mismo `catch` de `load()` cubre el fallo de `JSON.parse` y el de `migrate`.
- [ ] **Step 2: Correr y ver fallar** — `node build.mjs && node tests/city_scenes.cjs` → FAIL.
- [ ] **Step 3: Implementar** spec §2, §5.5, §6 y §8 en `engine.html` y `view.js`. Reescribir las pruebas existentes listadas a la forma nueva sin quitar lo que comprueban (puente → portal; `beaten` plano → `d.M02`).
- [ ] **Step 4: Correr** — `node tests/city_scenes.cjs && SUITE` → PASS, solo `FIN` (las pruebas del viaje 3D siguen pasando hasta Task 8).
- [ ] **Step 5: Commit** — `feat(city): escenas y portales en la vista; progreso por distrito en el motor`

---

### Task 6: Pruebas adversariales a la forma nueva

**Files:**
- Modify: `tests/adv/review_attack.cjs`, `tests/adv/spec2d_attack.cjs`, `tests/adv/city_fuzz.cjs`, `tests/adv/city_base_attack.cjs`, `tests/adv/lib.cjs`/`runner.cjs` si usan `spawn`
- Delete: `tests/adv/plan_city_oracle.cjs` (oráculo de implementaciones de referencia del plan anterior); sus comprobaciones `REAL=1` que sigan aplicando se portan a `tests/adv/spec_districts_attack.cjs`

- [ ] **Step 1:** Correr `ADV` en segundo plano y listar los `FALLO`.
- [ ] **Step 2:** Adaptar cada archivo: puente → portal; `roads[].wall` → `portals` sin distrito; forma plana → `d[mid]`; `city_fuzz` teletransporta también a M08 y a los portales; agregar a `city_fuzz` el cambio de escena aleatorio (`cityEnter` con ids válidos e inválidos) sin errores.
- [ ] **Step 3: Correr** — `ADV` → solo `FIN`.
- [ ] **Step 4: Commit** — `test(city): ataques y fuzzing sobre escenas y guardado por distrito`

---

### Task 7: Introducción

**Files:**
- Create: `city/intro.js`, `tests/city_intro.cjs`
- Modify: `city/view.js` (quitar `CITY_PROLOGUE`, `cityPrologue`, `cityPrologueDone`; llamar a la intro), `engine.html` (texto e íconos de inicio; CSS de `#city-tip`), `build.mjs` (inyectar `intro.js` en `/*__CITY_VIEW__*/` después de `view.js`)

**Interfaces:**
- Produces (funciones de la IIFE, como las de `view.js`): `cityIntroOpen(i)`, `cityIntroDone()`, `cityHowTo()`, `cityTip(id)`, `cityTipsCheck(reason)` con `reason` ∈ `near | resume | tower | plaza`, `cityControlsHtml()`; `CITY_INTRO` (4 paneles con textos de spec §3.2); `CITY_TIPS` (tabla de spec §3.3). `CD.tips = { q: [], t: null, left: 6000 }`, `CD.starBase`.

- [ ] **Step 1: Escribir las pruebas** `tests/city_intro.cjs` (spec §11 "Introducción"): texto de inicio exacto y lista con 3 canvas `aria-hidden` y etiquetas; Iris se abre sola con chip "Prólogo 1 de 4" y no la segunda vez; "Saltar" marca `prologue`; hablar con Iris después → panel 4 + objetivo en negrita; título "Iris"; cada pista sale una vez y se guarda; `#city-tip` fuera de `#city-ui-main`, existe vacío al crear la vista; contador congelado con hoja abierta (avanzar 10 s con hoja → sigue visible; cerrar hoja + 6 s → se va); cola: dos pistas seguidas salen una tras otra; `star` sale al volver de una ronda que dio la primera estrella; pausa → "¿Cómo se juega?" con pistas vistas; controles: `any-pointer: coarse` → solo táctil, `fine` → solo teclado, ambos → ambos; línea "Desde el nivel 5 puedes correr…" siempre; teardown limpia el temporizador (0 errores tras salir con pista visible).
- [ ] **Step 2: Correr y ver fallar** — `node build.mjs && node tests/city_intro.cjs` → FAIL.
- [ ] **Step 3: Implementar** spec §3.
- [ ] **Step 4: Correr** — `node tests/city_intro.cjs && SUITE` → PASS, `FIN`.
- [ ] **Step 5: Commit** — `feat(city): introducción para jugadores nuevos, pistas y cómo se juega`

---

### Task 8: Ruta del paquete en 2D y borrado del 3D

**Files:**
- Create: `city/route.js` (`git mv trip/flow.js`), `city/route_view.js`, `tests/city_route_view.cjs`
- Move/Modify: `tests/trip.cjs` → `tests/city_route.cjs` (apunta a `city/route.js`, agrega `from`); la parte de `TripFlow` de `tests/adv/trip_props.cjs` → `tests/adv/route_props.cjs`
- Modify: `engine.html` (quitar todo lo del viaje), `city/view.js` (pads como lugares de la escena; objetivo `route`), `city/story.js` (si hace falta para `route`), `build.mjs`, `validate.mjs`, `_headers`, `README.md`
- Delete: `vendor/three.module.min.js`, `trip/scene.js`, `trip/`, `three/`, `tests/build_vendor.cjs`, `tests/scene.cjs`, `tests/scene_extra.cjs`, `tests/three_shared.cjs`, `tests/trip_engine.cjs`, `tests/trip_extra.cjs`, `tests/adv/trip_fuzz.cjs`, `tests/adv/trip_props.cjs`
- Modify: `tests/build_validate.cjs` (quitar vendor/trip; agregar casos de la guarda)

**Interfaces:**
- Consumes: `api.setRoute(done)` (Task 4), objetivo `route` (Task 3).
- Produces: `CityRoute.create(deps)` = `TripFlow.create` + `deps.from` (0..n−1; inválido → 0). En `route_view.js`: `cityRouteOpen(i)`, `cityRouteRecord(r)` (= `tripRecord`), `cityRouteOpts(item, picked)` (= `tripOpts`), `cityRouteAsk`, `cityRouteResult`, `cityRouteSummary`, `CITY_ROUTE_LAYERS = ['Datos','Puerto','IP','Trama']`.

- [ ] **Step 1: Escribir las pruebas**
  - `city_route.cjs`: las 30 de `trip.cjs` + `from 3 empieza en S3`, `from -1/NaN/99 → 0`.
  - `city_route_view.cjs`: pad activo = `pads[done]`, la flecha apunta ahí; abrir estación → chip "Estación 1 de 10 · Prólogo: la red" y keyPoint; responder → `route.done` 1, guardado, `setRoute(1)` llamado, anuncio; cerrar a mitad → "Retomarás en la estación 1." y `done` sin cambio; reanudar tras recargar empieza en `done`; HUD "Capas: …"; terminar la 10.ª → resumen de sesión con "Repasar lo que fallé" si hubo fallos; con `done = 10`, pad S0 ofrece "Recorrer otra vez" y solo al confirmar vuelve a 0; movimiento reducido → sin animación del paquete; XP por respuesta igual a `xpBase` + pasiva.
  - `build_validate.cjs`: la build falla si reaparece cualquiera de los identificadores de spec §7 o `blob:` en `_headers`; el HTML final no contiene `three` (sin distinguir mayúsculas, excluyendo texto del temario: buscar `three.module`, `THREE`, `Three3D`, `TripScene`).
- [ ] **Step 2: Correr y ver fallar** — `node build.mjs && node tests/city_route.cjs; node tests/city_route_view.cjs; node tests/build_validate.cjs` → FAIL.
- [ ] **Step 3: Implementar** spec §5.6 y §7 (mover funciones de `engine.html` a `route_view.js` renombradas, sin reescribirlas; borrar el resto). README: quitar el viaje 3D y describir escenas y distritos.
- [ ] **Step 4: Correr** — `SUITE` → `FIN`; `ADV` (segundo plano) → `FIN`; `ls vendor trip three 2>&1` → no existen; `grep -c "blob:" _headers` → 0.
- [ ] **Step 5: Commit** — `feat(city): ruta del paquete en Nodo Enlace y adiós al 3D`

---

### Task 9: Humo en navegador y cierre

**Files:**
- Create (scratchpad, no se comitea): script Playwright `smoke_districts.mjs`
- Modify: `docs/superpowers/specs/2026-11-12-ciudad-distritos-design.md` (§13 "Cambios de la implementación" con los rulings del ledger)

- [ ] **Step 1:** Script Playwright (Chromium) sobre `juego_estudio.html` servido localmente: teléfono 390 × 844 y laptop 1280 × 800; partida nueva → prólogo → cerrar → caminar al portal M08 (teclado/`page.mouse`) → entrar → mentor → salir → plaza. Capturas de plaza, M02, M08 en ambos tamaños.
- [ ] **Step 2: Correr** — Expected: 0 errores de consola, 6 capturas; revisar cada captura (portales visibles, HUD sin tapar el mapa en vertical, pads y cable en M08).
- [ ] **Step 3:** Escribir §13 del spec con los rulings y desviaciones.
- [ ] **Step 4: Correr** — `SUITE` → `FIN`.
- [ ] **Step 5: Commit** — `docs(city): cambios de la implementación de distritos`
- [ ] **Step 6 (punto de control del usuario):** pedir al usuario que pruebe en su teléfono con `?fps=1` en plaza, M02 y M08 y confirme fps.
