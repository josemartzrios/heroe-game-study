# Ciudad Núcleo: distritos (Tanda 1) — Plan de implementación (v2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convertir Ciudad Núcleo en plaza + un mapa por distrito, migrar el Taller Comunal (M02), agregar Nodo Enlace (M08) con la ruta del paquete en 2D, una introducción para jugadores nuevos, y borrar todo el 3D.

**Architecture:** Los distritos son datos (`city/districts/*.mjs`) que `build.mjs` inyecta como `CITY_DATA`. Un solo motor (`move`, `story`, `world2d`, `sprites2d`, `view`) trabaja sobre la escena activa (`CD.scene`). El guardado pasa a `S.city.d[mid]` con listas blancas, migración y espejo plano de M02. La ruta del paquete reutiliza la máquina de estados `TripFlow` como `CityRoute`.

**Tech Stack:** HTML único generado por `node build.mjs`; JS ES5 dentro de la IIFE de `engine.html`; datos ESM (`.mjs`) solo en build; pruebas Node 22 + jsdom 31 + fast-check (solo pruebas); humo con Playwright/Chromium desde el scratchpad.

**Spec:** `docs/superpowers/specs/2026-11-12-ciudad-distritos-design.md` (v2). El spec es la autoridad; ante conflicto, gana el spec y se anota un `Ruling:` en el ledger.

## Global Constraints

- ES5 en todo lo que va al HTML (sin `let`/`const`/flechas/clases/`Array.from` en `city/*.js` y `engine.html`); los `.mjs` (solo build) pueden usar ES moderno.
- Alias para no tapar globales en la IIFE (`CM` = CityMove, `SP` = CitySprites, `T3` = Three3D mientras exista). Ningún `var CityX` local que tape al global.
- Texto de datos a `innerHTML` solo con `esc()`/`fmt()` (también atributos `data-*`); HUD, carteles, pistas y anuncios con `textContent`.
- Claves del guardado nunca indexan datos sin `hasOwnProperty` sobre los datos; `d` se construye recorriendo `Object.keys(D.districts)`.
- Ganchos de prueba solo con `window.__CITY_TEST__ === true` y listados en la guarda de `validate.mjs`. **No crear ganchos nuevos**: las pruebas que necesitan interceptar algo reescriben el HTML antes de cargarlo en jsdom (como hace hoy `tests/adv/plan_districts_props.cjs`).
- "No guardar código que no se use": lo reemplazado se borra en la misma tarea (salvo lo que el plan mueve explícitamente en una tarea posterior); nada queda comentado.
- Ningún archivo de código nombra un distrito concreto salvo `city/districts.mjs` (imports) y el registro de poderes (`planos`) de `engine.html` (spec §4.6). Desde Task 5b lo comprueba `validate.mjs`.
- Textos visibles: copiar exactos del spec (§2, §3, §4.4, §4.5, §5.6, §8). Las pruebas comparan `textContent` con igualdad exacta.
- `ORDER = ['M02', 'M08', 'M03', 'M01', 'M10', 'M04', 'M06', 'M07', 'M05', 'M09', 'M11']`. Rangos `[[0,'Becario'],[1,'Junior'],[3,'Semi-senior'],[6,'Senior'],[8,'Arquitecto'],[11,'Tech Lead']]`.
- Constantes nuevas junto a las actuales de `view.js`: `CITY_FADE_MS = 250`, `CITY_TIP_MS = 6000`.
- Presupuesto: un rAF, ≤ 200 partículas, `pr` en [1, 1.5], mapa ≤ 1120 × 1280 px por escena.
- Commits terminan con la línea `Co-Authored-By:` del modelo que ejecuta. Con suite verde se comitea `juego_estudio.html` recompilado.
- **Tramo en rojo (Tasks 3, 4, 5a):** el HTML compilado no funciona entre esos commits. Llevan el prefijo `wip(city):`, **no** incluyen `juego_estudio.html` (`git checkout juego_estudio.html` antes de comitear) y el ledger anota "suite en rojo hasta Task 5b". Task 5b deja todo verde.
- **Nunca correr dos `node build.mjs` a la vez** (las pruebas de build reescriben `juego_estudio.html`). Los subagentes que corren pruebas lo hacen de a uno.
- `SUITE`: `cd /home/josma/myprojects/juego && node build.mjs && node validate.mjs && for f in tests/*.cjs tests/adv/attacks.cjs; do node "$f" >/dev/null 2>&1 || echo "FALLO $f"; done; echo FIN` — verde = solo `FIN`.
- `ADV`: `for f in tests/adv/*.cjs; do node "$f" >/dev/null 2>&1 || echo "FALLO $f"; done; echo FIN` (varios minutos; en segundo plano).
- Para ver por qué falla un archivo: `node tests/<archivo>.cjs | grep FAIL`.

## Review Focus

1. **Partida vieja real con M02 restaurado** (jefe M02 aprobado, 8 enseñados, `at` dentro de M02, `bridgeSeen: true`): aparece en M02, restaurado, rango Junior, sin volver a celebrar. → Task 5a.
2. **Ronda de M08 que se resuelve** (batalla, reparación, enseñanza): escribe en `d.M08`; `beatenToday` de M08 lee `d.M08`, nunca el espejo plano (los ids `r01`, `a01` existen en ambos distritos). → Task 5a.
3. **Salir al inicio con `create` pendiente** (después del `dispose`), que luego resuelve o rechaza: sin errores, sin rAF vivo, sin banner fuera de la ciudad, y al volver se abre la escena guardada. → Task 5b.
4. **Solo teclado**: plaza → portal M08 (E) → mentor (E) → cerrar (Esc) → salida → plaza, sin foco en `body`, y sostener una tecla al llegar no cruza la salida. → Task 5b.
5. **Una pestaña con el código viejo guarda encima**: M02 se conserva por el espejo; M08 vuelve a cero (límite conocido, anotado). → Task 5a.

---

## Mapa de archivos

| Archivo | Responsabilidad |
|---|---|
| `city/layout.mjs` (nuevo) | Reparto de lugares en calles (`makeLayout`), solo build |
| `content_expand.mjs` (nuevo) | `expandModule()` y `moduleSource()`: módulo compacto → objeto → texto; lo usan `build.mjs`, `validate.mjs` y pruebas |
| `city/check_district.mjs` (nuevo) | Reglas genéricas de un distrito (spec §4.3), solo build |
| `city/districts/m02.mjs`, `m08.mjs`, `m08_route.mjs` (nuevos) | Datos de cada distrito y estaciones de la ruta |
| `city/districts.mjs` | Rangos, `ORDER`, plaza con portales, import de distritos |
| `city/move.js` | Movimiento, colisiones por escena, `portalAt` |
| `city/story.js` | Guardado (normalizar/migrar), restauración, rango, objetivo |
| `city/route.js` (nuevo, desde `trip/flow.js`) | `CityRoute`: máquina de estados de la ruta |
| `city/sprites2d.js` | Atlas de sprites desde `CITY_DATA` |
| `city/world2d.js` | Mundo por escena, pads y cable (y `Pauser` desde Task 8b) |
| `city/view.js` | Vista de la ciudad sobre `CD.scene`, `cityEnter`, portales |
| `city/intro.js` (nuevo) | Prólogo, pistas, "¿Cómo se juega?", controles |
| `city/route_view.js` (nuevo) | Hojas y HUD de la ruta |
| `engine.html` | `bossPassedOf`, `cityD`, `cfg.city.mid`, espejo, inicio, página de módulo |
| `build.mjs`, `validate.mjs`, `_headers` | Inyección, validador, guarda, CSP |

**Ya hecho antes del plan (no repetir):** `load()` respalda en `KEY + '_bak'` todo guardado inutilizable (JSON roto, versión desconocida, `migrate` que lanza) sin pisar un respaldo previo; `clipName()` recorta el nombre sin partir emojis; `migrate()` borra claves propias `__proto__` de `topics`, `qs` y `boss`; `normYaw` idempotente. Pruebas: `tests/adv/plan_districts_props.cjs`, `tests/adv/spec_districts_attack.cjs`.

---

### Task 1: `makeLayout` y M02 como archivo de distrito

**Files:**
- Create: `city/layout.mjs`, `city/districts/m02.mjs`, `tests/city_layout.cjs`, `tests/fixtures/m02_coords.json`
- Modify: `city/districts.mjs` (importa M02 de su archivo; la forma exportada **no cambia** en esta tarea)
- Delete: `tests/plan_layout_feasibility.cjs` (lo reemplaza `city_layout.cjs`)

**Interfaces:**
- Produces: `makeLayout({ reserve = [], streetX, streetZ, xRange: [min, max], zRange: [hi, lo], step = 8, min = 7 })` → `{ take() }`. Recorrido: para cada `z` de `streetZ`, `x` de `xRange[0]` a `xRange[1]` en pasos de `step`; luego para cada `x` de `streetX`, `z` de `zRange[0]` a `zRange[1]` bajando de a `step`. Un punto entra si está a ≥ `min` de todos los ya aceptados y de cada `reserve`. `take()` devuelve `{ x, z }` en ese orden y lanza `Error('faltan lugares')` al agotarse.
- Produces: `export const district` en `m02.mjs` (formato spec §4.2): `id 'M02'`, `name 'Taller Comunal'`, `style 'taller'`, `seed 7`, `celebrate` de spec §4.4, torre `{ id:'torre', x:0, z:-162, w:8, d:8, h:20 }`, `need 8`, mismos nombres y temas de hoy, etiquetas de reparación con artículo: "el semáforo", "la puerta de arranque", "la grúa trabada", "la terminal con humo", "el candado roto", "el farol apagado", "el buzón sin dirección", "el letrero borrado", "la ventanilla de peticiones", "la cerradura sin llave". Layout: `makeLayout({ reserve: [[0,-162]], streetX: [-28,0,28], streetZ: [-80,-108,-136], xRange: [-52,52], zRange: [-58,-170] })` (el puente no influye: comprobado).

- [ ] **Step 1: Generar el fixture** antes de tocar `districts.mjs`: `node -e` que importa `./city/districts.mjs` y escribe en `tests/fixtures/m02_coords.json` `{ "<id>": [x, z] }` para mentores, criaturas (`area`), reparaciones y aprendices.
- [ ] **Step 2: Escribir `tests/city_layout.cjs`** (estilo `ok(name, cond)` de `tests/city_story.cjs`):
  - `M02 conserva coordenadas`: cada id de `m02.mjs` coincide con el fixture.
  - `torre igual`: `{x:0, z:-162, w:8, d:8, h:20}`.
  - `makeLayout lanza al agotarse`: `{ streetX:[0], streetZ:[], xRange:[0,0], zRange:[0,-8] }` → dos `take()` y el tercero lanza `'faltan lugares'`.
  - `reserve excluye`: con `reserve:[[0,0]]`, ningún punto a < 7 m de (0,0).
- [ ] **Step 3: Correr y ver fallar** — `node tests/city_layout.cjs` → FAIL (no existe `city/layout.mjs`).
- [ ] **Step 4: Implementar** `layout.mjs` y `m02.mjs`; `districts.mjs` arma su export actual (incluidos `rect`, puente y etiquetas **sin** artículo, porque `view.js` aún antepone "el"; los artículos se usan desde Task 3) a partir de `m02.mjs`. Borrar `tests/plan_layout_feasibility.cjs`.
- [ ] **Step 5: Correr** — `node tests/city_layout.cjs && SUITE` → PASS, `FIN`.
- [ ] **Step 6: Commit** — `feat(city): makeLayout y datos de M02 en su propio archivo`

---

### Task 2: M08, ruta, `expandModule` y validador genérico

**Files:**
- Create: `content_expand.mjs`, `city/districts/m08.mjs`, `city/check_district.mjs`, `tests/validate_districts.cjs`
- Move: `trip/stations.mjs` → `city/districts/m08_route.mjs` (`git mv`) y actualizar **todos** sus importadores: `build.mjs`, `tests/trip.cjs`, `tests/scene.cjs`, `tests/scene_extra.cjs`, `tests/adv/trip_props.cjs`, `tests/spec_districts_feasibility.cjs`
- Modify: `build.mjs` (usa `moduleSource(expandModule(...))`; salida **idéntica byte a byte**), `validate.mjs` (aplica `checkDistrict` a los `.mjs` de distrito), `tests/build_validate.cjs` (copia al directorio temporal también `content_expand.mjs`, `city/check_district.mjs`, `city/layout.mjs` y `city/districts/`)
- Delete: `tests/plan_m08_geometry.cjs` (lo reemplaza `validate_districts.cjs`)

**Interfaces:**
- Produces: `expandModule(id, title, c)` → `{ id, title, topics, questions }` (cada pregunta con `id`, `type`, `topic` y el resto de campos que hoy genera `expand`) y `moduleSource(m)` → el mismo texto JS que hoy produce `expand`.
- Produces: `export const district` en `m08.mjs` con spec §4.5 y esta geometría fija:
  - `bounds {minX:-60,maxX:60,minZ:-70,maxZ:60}`, `entry {x:0,z:52,yaw:0}`, `exit {x:0,z:57,w:6,d:2}`, manzanas 20 × 20 con centros x ∈ {−42,−14,14,42} × z ∈ {30,2,−26,−54}, calles `x [-28,0,28]`, `z [16,-12,-40]`, torre `{id:'torre',x:0,z:-64,w:8,d:8,h:20}`, `seed 11`.
  - `route.pads` (S0–S9): `(0,44) (0,30) (0,16) (-14,16) (-28,2) (-28,-12) (-14,-12) (0,-26) (0,-40) (0,-54)`.
  - Layout: `makeLayout({ reserve: [[0,-64],[0,52], ...pads], streetX:[-28,0,28], streetZ:[16,-12,-40], xRange:[-52,52], zRange:[52,-68] })`.
- Produces: `checkDistrict(dist, mod, opts)` en `city/check_district.mjs` → `string[]`; cada error empieza con `R<n>:` (regla de spec §4.3). Calcula sus propias cajas: `CityMove.layoutBuildings(dist)` + torre + borde (carga `city/move.js` con `vm`, como hoy `validate.mjs:383`). `opts = { forbidden }`. **No contiene números de un distrito concreto**: "10 estaciones y suma de `ask` 18" se comprueba en `tests/validate_districts.cjs`.

- [ ] **Step 1: Escribir `tests/validate_districts.cjs`**:
  - `M02 válido` y `M08 válido`: `checkDistrict` → `[]`.
  - `M08 ruta`: 10 estaciones, suma de `ask` 18, 10 pads.
  - Mutaciones sobre copias de M08; cada una exige un error que empiece con la regla indicada: `R1` quitar `m01`; `R1` nombre de mentor repetido; `R2` agregar T01 a `capas`; `R2` criatura solo con T01 (< 8 preguntas); `R3` reparación con T01; `R4` aprendiz `correct` en T02 con una copia del módulo sin las `error` de T02; `R4` aprendiz con nombre de mentor; `R4` `need` 10; `R5` id `__proto__`; `R6` palabra prohibida en un nombre; `R7` mentor en el centro de la manzana (−14,2); `R7` dos puntos a 3 m; `R7` `bounds` de 150 × 130; `R8` `kp` desalineado; `R8` `ask` 3; `R8` `expect` de 10 caracteres; `R8` 9 pads.
- [ ] **Step 2: Correr y ver fallar** — `node tests/validate_districts.cjs` → FAIL.
- [ ] **Step 3: Implementar.** `validate.mjs` reemplaza el bloque fijo de M02 por `checkDistrict` sobre `m02.mjs` y `m08.mjs`, y el bloque `TRIP_STATIONS` por las comprobaciones de la ruta de M08; el bloque del vendor sigue hasta Task 8b.
- [ ] **Step 4: Correr** — `node tests/validate_districts.cjs && node tests/spec_districts_feasibility.cjs && SUITE` → PASS, `FIN`; `git diff --stat juego_estudio.html` → sin cambios.
- [ ] **Step 5: Commit** — `feat(city): datos de Nodo Enlace (M08), expandModule y validador genérico de distritos`

---

### Task 3: Núcleo lógico por escenas (datos, `move`, `story`) — `wip`

**Files:**
- Modify: `city/districts.mjs`, `city/move.js`, `city/story.js`, `validate.mjs` (lee el `CITY_DATA` nuevo; regla 9 de portales y regla 10 de rangos)
- Test: reescribir `tests/city_story.cjs` y `tests/city_move.cjs`; actualizar `tests/spec_districts_feasibility.cjs` (sin `rect`); adaptar `tests/adv/spec_districts_attack.cjs`; ampliar `tests/validate_districts.cjs` (mutaciones `R9`)

**Interfaces:**
- Produces `CITY_DATA = { ranks, order, radius: 0.4, plaza, districts: { M02, M08 } }`. `plaza = { name: 'Plaza', bounds {minX:-50,maxX:50,minZ:-50,maxZ:40}, entry {x:0,z:8,yaw:0}, hq, director, mirror, portals }`. `portals[k] = { dist, angle, x, z, w: 6, d: 2, back: {x, z, yaw} }`, uno por `ORDER`: M02 a −90°; los otros 10 a `-90 + 33·(k+1)` en el orden `M04, M03, M08, M06, M07, M05, M01, M11, M10, M09`; radio 38 (redondeo a 2 decimales como hoy); `back` a radio 33 con `yaw` mirando al centro. M02: `bounds` −60..60 × −185..−44, `entry {x:0,z:-52,yaw:Math.PI}`, `exit {x:0,z:-47,w:6,d:2}`, sin `rect` ni puente.
- Produces en `CityMove`: `scene(D, sceneId)` → `D.plaza`, `D.districts[id]` (con `own`) o `null`; `boxesFor(D, sceneId)` (edificios, torre, sede, muros de portales sin distrito, borde); `portalAt(D, sceneId, x, z)` → `dist` (en la plaza, solo portales de distritos existentes), `'plaza'` (en la `exit` de un distrito) o `null`.
- Produces en `CityStory`: `normalizeCity(raw, D, bossPassedOf, todayStr)`, `taughtCount(C, D, mid)`, `restoration(C, D, mid, bossPassed)`, `applyRestore(C, D, bossPassedOf)` → `{ changed: string[] }`, `rankOf(C, D)`, `apprenticesAvailable(C, D, mid, starsOf)`, `nextObjective(C, D, sceneId, ctx)`, `LEGACY_M02_RECT`, `mirror(C)`. Toda llamada a `bossPassedOf` va dentro de `try` (si lanza → `false`), con `=== true` y solo con claves de `D.districts`. Objetivos de la plaza: `{kind:'director', id:'iris', label:'Habla con Iris'}`, `{kind:'portal', id:mid, label:'Entra a ' + name}`, `{kind:'none', id:null, label:'Ciudad al día: más distritos pronto'}`. En un distrito: `{kind:'route', id:'pad'+done, label:'Ruta del paquete · estación <done+1> de <n>'}`, `{kind:'plaza', id:'exit', label:'Vuelve a la plaza'}`, el resto como hoy; reparaciones `'Repara ' + label`.

- [ ] **Step 1: Escribir las pruebas** (casos de spec §11 "Guardado" e "Historia"):
  - `city_story.cjs`:
    - forma: `fresh` tiene `d.M02` (sin `route`) y `d.M08` con `route.done 0`; `scene 'plaza'`; `tips {}`.
    - migración: planos → `d.M02`; `at` en M02 → `scene M02` mismas coords; `z=-46` → M02; `x=65,z=-100` → M02 con `x=60`; `z=-190` → M02 recortado a −185; `at (0,-38)` → `back` del portal M02; `at (20,10)` → plaza mismas coords; `at` dentro de la sede → `entry` de la plaza; con `scene` presente no se usa `LEGACY_M02_RECT`; `bridgeSeen` descartado.
    - `d`: `d` plano gana sobre planos; `d` plano sin `M02` → `d.M02` vacío (no se rellena desde planos); `d.M02 null` → vacío; `d` `null`/`[]`/`"x"` → migra desde planos.
    - lista blanca: `scene` `__proto__`/`constructor`/`toString`/`M99` → plaza; `d.__proto__` descartado; `d.M08.repairs.r09`, `d.M08.taught.a10`, `d.M02.beaten.ruido` y `d.M08.beaten.bit` descartados; `d.M02.route` no aparece; `tips {__proto__:{}, talk:"true", x:true}` → `{}`; `tips {talk:true}` se conserva.
    - `route.done`: `NaN`, `"3"`, `3.7`, `-1`, `Infinity`, `-0`, `route: 5`, `route: null` → 0; `10` → 10; `99` → 10.
    - `bossPassedOf`: no función, función que lanza y función que devuelve `"true"` → sin restaurar y sin lanzar; solo se llamó con `M02` y `M08`.
    - restauración: M08 con jefe + 6 enseñados y `route.done 0` → restaurado (la ruta no bloquea); `powers` solo `planos` con M02; `applyRestore` idempotente y `changed` = mids nuevos; `rankOf`: 0 → Becario, 1 → Junior, 2 → Junior.
    - objetivos: plaza `director` → `Entra a Taller Comunal` → (M02 restaurado) `Entra a Nodo Enlace` → (ambos) `Ciudad al día: más distritos pronto`; M08 con criaturas vencidas y `done 3` → `Ruta del paquete · estación 4 de 10`; distrito restaurado → `Vuelve a la plaza`; `Repara el semáforo`.
    - `mirror(C)`: planos iguales a `d.M02` y copias (no la misma referencia).
  - `city_move.cjs`: en la plaza hay 9 muros sólidos y los portales M02 y M08 no son sólidos; `portalAt` en la boca del portal M08 → `'M08'` y en el muro M03 → `null`; `portalAt` en `exit` de M02 → `'plaza'`; M02 sin puente; `entry` y cada `back` fuera de cajas y de portales.
  - `validate_districts.cjs`: `R9` portal repetido y `back` dentro de una caja.
  - `spec_districts_attack.cjs`: generadores con `scene` ∈ {plaza, M02, M08, basura}, `at` dentro de cada `bounds` y de `LEGACY_M02_RECT`, `d` con claves de ambos distritos e ids cruzados; P2 por distrito; P4 dentro de `bounds` de la escena, fuera de cajas **y de portales**; P6 por `mid`; P7 ninguna clave no propia; ≥ 5000 ejecuciones.
- [ ] **Step 2: Correr y ver fallar** — `node tests/city_story.cjs; node tests/city_move.cjs` → FAIL.
- [ ] **Step 3: Implementar** spec §5.1–§5.3 (reutilizar `pick`, `plainObj`, `validDate`, `normYaw`).
- [ ] **Step 4: Correr** — `node build.mjs && node validate.mjs && node tests/city_story.cjs && node tests/city_move.cjs && node tests/city_layout.cjs && node tests/validate_districts.cjs && node tests/adv/spec_districts_attack.cjs` → todo PASS (`SUITE` en rojo: esperado).
- [ ] **Step 5: Commit** sin `juego_estudio.html` — `wip(city): escenas, guardado por distrito y migración en move/story (suite en rojo hasta Task 5b)`

---

### Task 4: Mundo y sprites por escena — `wip`

**Files:**
- Modify: `city/world2d.js`, `city/sprites2d.js`
- Test: `tests/city_world2d.cjs`, `tests/city_sprites.cjs`

**Interfaces:**
- Consumes: `CityMove.scene`, `boxesFor(D, sceneId)` (Task 3).
- Produces: `CityWorld2D.create(canvas, D, sceneId, opts)` → Promise<api>; `api = { resize, setPaused(reason, on), dispose, encounter(id), dissolve(id), stats(), setRoute(done) }`; `opts` como hoy. `Pauser` sigue en `three/shared.js` hasta Task 8b (sin copias).
- Produces: `CitySprites.frame(kind, variant, face, step)` con `variant` = `mid + ':' + id` para personas y criaturas (`'iris'` sin prefijo); variantes generadas desde `CITY_DATA` de todos los distritos; forma y colores por hash del `variant`; variante desconocida → la primera, sin lanzar. `paintIcons(root)` pinta `data-spr` ∈ `hero | mentor | creature | apprentice`.

- [ ] **Step 1: Escribir las pruebas** (canvas falso de `tests/city_world2d.cjs`; medir con `f.maps`, `f.created` y espías de contexto):
  - `create('plaza')`: 2 arcos abiertos con el color de su distrito y 9 muros; `create('M02')` sin puente; `create('M08')` con `style 'red'` (al menos un `fillRect` en la franja de azotea por edificio).
  - Tamaño del mapa: 800 × 720 (plaza), 960 × 1128 (M02), 960 × 1040 (M08); todos ≤ 1120 × 1280.
  - `resize tras create usa bounds de la escena`: crear M08 y `resize`; el rectángulo de origen de cada `drawImage` del mapa cae dentro de 960 × 1040.
  - Chispas: 300 ticks en plaza, M02 y M08 sin `onLost` ni errores.
  - Límites por cuadro en las 3 escenas y en M08 con `setRoute(5)` animando el paquete: ≤ 200 partículas, sin `shadowBlur`/`filter`, `f.created` constante.
  - `setRoute(n)`: `f.maps[0].wsets` igual antes y después (no se redibuja el mapa); pads `< n` con el trazo del ✓ en su posición; pads `> n` solo contorno (`strokeRect` sin `fillRect` en su caja); pad `n` relleno con el color del distrito.
  - Un segundo `create` no reconstruye atlas: `f.created` sube en 1.
  - Sprites: `frame('person','M08:m01',…)` ≠ `frame('person','M02:m01',…)`; variante desconocida no lanza; `paintIcons` pinta los 4 tipos.
- [ ] **Step 2: Correr y ver fallar** — `node build.mjs && node tests/city_world2d.cjs; node tests/city_sprites.cjs` → FAIL.
- [ ] **Step 3: Implementar** spec §6 (pads y cable precalculados en `create` y dibujados por cuadro; chispas con guarda de lista vacía; colores y `style` desde la escena).
- [ ] **Step 4: Correr** — `node tests/city_world2d.cjs && node tests/city_sprites.cjs` → PASS.
- [ ] **Step 5: Commit** sin `juego_estudio.html` — `wip(city): mundo y sprites por escena (suite en rojo hasta Task 5b)`

---

### Task 5a: Motor: progreso por distrito — `wip`

**Files:**
- Modify: `engine.html` (spec §5.5, salvo lo ya hecho)
- Create: `tests/city_progress.cjs`, `tests/fixtures/story_old.js` (copia de `city/story.js` tal como está en el commit anterior a Task 3)
- Test: reescribir lo afectado en `tests/migrate.cjs`, `tests/city_rounds.cjs`, `tests/record2.cjs`, `tests/review_gaps.cjs`

**Interfaces:**
- Produces: `bossPassedIn(boss, mid)` (lee un objeto `boss`; la usa `migrate`, que corre antes de que exista `S`) y `bossPassedOf(mid)` = `bossPassedIn(S.boss, mid)` (la usan `finish` y la vista); `cityD(mid)`; `cfg.city = { kind, id, mid }`; `cityResolve` y `beatenToday(mid, id)` sobre `cityD(mid)`; `cityRestorePending` = arreglo de mids; `save()` llama a `CityStory.mirror(S.city)` antes de serializar; `fresh()` usa `normalizeCity({}, CITY_DATA, function () { return false; }, today())`.

- [ ] **Step 1: Escribir `tests/city_progress.cjs`** (boot jsdom del HTML compilado, estilo `city_engine.cjs`):
  - `migrate antes de S`: guardado con jefe M02 aprobado y 8 enseñados → arranca restaurado, sin lanzar.
  - `legacy save restaurado entra a M02 sin celebrar` (Review Focus 1): rango Junior, `scene 'M02'`, sin hoja de celebración.
  - `cityResolve escribe en d.M08` (Review Focus 2): resolver batalla `ruido`, reparación `r01` y enseñanza `a01` con `mid 'M08'` → solo cambia `d.M08`; `d.M02` y los planos intactos.
  - `beatenToday lee d.M08`: con `d.M02.repairs.r01 = true`, el objetivo de M08 sigue pidiendo `Repara el cable cortado`.
  - `espejo tras save`: `localStorage` contiene `beaten/repairs/taught` planos iguales a `d.M02`.
  - `pestaña vieja` (Review Focus 5): guardado nuevo con progreso en M02 y M08 → normalizar con `tests/fixtures/story_old.js` y serializar → cargar con el código nuevo: M02 intacto, M08 en cero. Anotar el límite en el ledger.
  - `celebración`: restaurar M08 desde una ronda → `cityRestorePending` `['M08']`; al volver a la ciudad, hoja con el texto de `celebrate` de M08 y sin "Poder nuevo".
- [ ] **Step 2: Correr y ver fallar** — `node build.mjs && node tests/city_progress.cjs` → FAIL.
- [ ] **Step 3: Implementar** en `engine.html`; reescribir las pruebas listadas a la forma nueva sin quitar lo que comprueban (`s.city.beaten.bit` → `s.city.d.M02.beaten.bit`).
- [ ] **Step 4: Correr** — `node tests/city_progress.cjs && node tests/migrate.cjs && node tests/city_rounds.cjs && node tests/record2.cjs && node tests/review_gaps.cjs && node tests/adv/plan_districts_props.cjs` → PASS (las pruebas de la vista siguen en rojo hasta 5b).
- [ ] **Step 5: Commit** sin `juego_estudio.html` — `wip(city): progreso por distrito en el motor (suite en rojo hasta Task 5b)`

---

### Task 5b: Vista con escenas y portales

**Files:**
- Modify: `city/view.js`, `city/input.js` (`isFree`), `engine.html` (botón "Ir al distrito", quitar "Viaja como paquete", CSS del velo y del banner), `validate.mjs` (regla estática §4.6)
- Create: `tests/city_scenes.cjs`
- Test: reescribir lo afectado en `tests/city_engine.cjs`, `tests/preserve_2d.cjs`, `tests/city_input.cjs`

**Interfaces:**
- Consumes: Tasks 3, 4 y 5a.
- Produces en `view.js`: `CD.scene`, `CD.fading`, `CD.fadeT`, `cityEnter(sceneId, at)`, `cityPortal(o)`, `cityCelebrate(mid, pre)`, `cityErrorBanner(name)`. `cityInert()` y `cityBlocked()` consideran `CD.fading`. `cityEnter` conserva el input (no lo recrea) y llama a `CD.input.releaseAll()` al llegar. `citySave()` escribe `scene` y `at`. Se borran `cityZone` y `cityBridge`. El banner de error vive fuera de `#city-ui-main`; "Cerrar" lleva el foco a `#city-pause`.
- Produces en `input.js`: `isFree` excluye también `#city-tip`, el banner de error y el velo.
- Produces en `validate.mjs`: falla si `city/*.js` o el código de vista de `engine.html` contienen los literales `'M02'`/`'M08'`, salvo `planos` en el registro de poderes.

- [ ] **Step 1: Escribir `tests/city_scenes.cjs`** (boot jsdom; partidas con `prologue: true`; mundo falso que registra `create(canvas, D, sceneId)`, `setPaused` y `dispose`; textos con igualdad exacta):
  - Entrada por botón: junto al portal M08, `#city-act` = "Entrar a Nodo Enlace" y su texto secundario = "M08 · 15 temas · 0 % restaurado"; clic → `setPaused('fade', true)` antes de `dispose`; tras `CITY_FADE_MS`, `create` con `'M08'`; `S.city.scene === 'M08'`; `at` = `entry` de M08.
  - Entrada al pisar la caja del portal.
  - Durante el fundido: `#city-ui-main` tiene `inert`; pulsar E, flechas o abrir y cerrar una hoja no hace nada y `inert` sigue; dos clics → un `create`.
  - Sin `transitionend`: con `prefers-reduced-motion`, el cambio termina sin eventos de transición.
  - Llegada: `#city-live` = "Entraste a Nodo Enlace. Objetivo: " + el objetivo calculado + "."; foco en `#city-pause` si estaba en `body`; un foco en un nodo válido se conserva.
  - Sostener S al llegar a M08 durante 1 s no cruza la salida (Review Focus 4).
  - Si `create` tarda > 250 ms: `#city-loadbox` = "Abriendo Nodo Enlace…".
  - Próximamente: portal M03 → `#city-act` "Ver M03" → hoja con título "M03 · Fundamentos de internet", texto "Este distrito llegará pronto. Mientras, puedes estudiarlo desde Módulos.", botones "Ir al módulo" y "Cerrar". Portal M11 → hoja "M11 · Próximamente" sin "Ir al módulo" (ruling: M11 aún no tiene módulo; anotarlo en el ledger y en §13).
  - Volver: pisar la salida de M08 → plaza en `back` del portal M08.
  - Error al crear M08: escena plaza, `localStorage` con `scene 'plaza'`, banner `role="alert"` fuera de `#city-ui-main` con "No se pudo abrir Nodo Enlace." y foco en "Reintentar"; sigue visible 10 s después; "Reintentar" vuelve a intentar; "Cerrar" lo quita y enfoca `#city-pause`. Si también falla la plaza → "No se pudo mostrar la ciudad.".
  - Salir con `create` pendiente (Review Focus 3): `quit` después del `dispose`; luego `create` resuelve → el mundo tardío recibe `dispose`; variante en que rechaza → sin banner ni errores. Un caso con el `CityWorld2D` real y `raf`/`caf` inyectados: `pend.size === 0` y el mapa tardío queda en 0 × 0.
  - Fugas: 20 ciclos plaza ↔ M08 → listeners de `window` y del canvas, rAF pendientes y mapas con tamaño ≠ 0 constantes.
  - HUD: plaza "Distritos 0 de 2"; M08 "Nodo Enlace 0 %".
  - "Ir al distrito" desde la página de M08 abre en `entry` de M08; con `prologue: false` pasa antes por el prólogo.
  - Recorrido solo teclado (Review Focus 4).
- [ ] **Step 2: Correr y ver fallar** — `node build.mjs && node tests/city_scenes.cjs` → FAIL.
- [ ] **Step 3: Implementar** spec §2, §6 y §8 en `view.js`, `input.js` y `engine.html`, y la regla estática de `validate.mjs`. Reescribir las pruebas listadas a la forma nueva (puente → portal).
- [ ] **Step 4: Correr** — `node tests/city_scenes.cjs && SUITE` → PASS, solo `FIN` (el viaje 3D sigue vivo hasta Task 8b).
- [ ] **Step 5: Commit** con `juego_estudio.html` — `feat(city): escenas y portales; progreso por distrito`

---

### Task 6: Pruebas adversariales a la forma nueva

**Files:**
- Modify: `tests/adv/review_attack.cjs`, `tests/adv/spec2d_attack.cjs`, `tests/adv/city_fuzz.cjs`, `tests/adv/city_base_attack.cjs`; en `tests/adv/lib.cjs` y `tests/adv/runner.cjs`, `D.spawn` → `D.plaza.entry`
- Delete: `tests/adv/plan_city_oracle.cjs`; sus comprobaciones `REAL=1` que sigan aplicando (velocidades de `move.js`; `restoration` entero 0..100 con jefe no booleano) se portan a `tests/adv/spec_districts_attack.cjs`

- [ ] **Step 1:** Correr `ADV` en segundo plano y listar los `FALLO`.
- [ ] **Step 2:** Adaptar: puente → portal; `roads[].wall` → portales sin distrito; forma plana → `d[mid]`; `city_fuzz` teletransporta también a M08 y a bocas de portal, y agrega `cityEnter` aleatorio con ids válidos e inválidos (`__proto__`, `M99`) sin errores.
- [ ] **Step 3: Correr** — `ADV` → solo `FIN`.
- [ ] **Step 4: Commit** — `test(city): ataques y fuzzing sobre escenas y guardado por distrito`

---

### Task 7: Introducción

**Files:**
- Create: `city/intro.js`, `tests/city_intro.cjs`
- Modify: `city/view.js` (quitar `CITY_PROLOGUE`, `cityPrologue` y `cityPrologueDone`; la hoja de Iris se titula "Iris"), `engine.html` (texto e íconos de inicio; CSS de `#city-tip`), `build.mjs` (inyecta `intro.js` en `/*__CITY_VIEW__*/` después de `view.js`)

**Interfaces:**
- Produces (funciones de la IIFE, como las de `view.js`): `CITY_INTRO` (4 paneles, spec §3.2), `CITY_TIPS` (tabla de spec §3.3), `cityIntroOpen(i)`, `cityIntroDone()`, `cityHowTo()`, `cityTip(id)`, `cityTipsCheck(reason)` con `reason` ∈ `near | resume | tower | plaza`, `cityControlsHtml()`. Estado: `CD.tips = { q: [], t: null, left: CITY_TIP_MS, frozen: false }` y `CD.starBase`.

- [ ] **Step 1: Escribir `tests/city_intro.cjs`** (textos exactos de spec §3):
  - Inicio: texto exacto; lista de 3 elementos con canvas `aria-hidden="true"` y etiquetas "Aprende", "Ponte a prueba", "Enseña".
  - Iris se abre sola la primera vez (chip "Prólogo 1 de 4") y no la segunda; "Saltar" en los paneles 1–3 y ausente en el 4; foco en el primer botón al abrir y en `#city-pause` al cerrar; "Saltar" marca `prologue`; hablar con Iris después → panel 4 + objetivo en negrita; título "Iris".
  - Pistas: cada una sale una vez y queda en `S.city.tips`; `#city-tip` existe vacío al crear la vista y está fuera de `#city-ui-main`; no pausa el mundo; cola de dos pistas en orden; tocarla la cierra y no mueve al héroe.
  - Congelado del contador: con hoja, con pausa, con fundido y con foco o puntero encima, avanzar 10 s → sigue visible; al quitar la causa, se va a los 6 s.
  - Disparos: `talk`, `creature` y `repair` al cambiar `nearId`; `tower` al desbloquearse la torre; `portals` al entrar a la plaza con un distrito restaurado; `star` al volver de una ronda con la primera estrella; `cityTipsCheck` se llama 0 veces en 300 ticks sin cambio de `nearId`.
  - Pausa → "¿Cómo se juega?" con las pistas vistas.
  - Controles: `any-pointer: coarse` → solo táctil; `fine` → solo teclado; ambos → ambos; "Desde el nivel 5 puedes correr (botón Correr o Shift)." siempre.
  - Teardown con una pista visible → 0 errores y temporizador cancelado.
- [ ] **Step 2: Correr y ver fallar** — `node build.mjs && node tests/city_intro.cjs` → FAIL.
- [ ] **Step 3: Implementar** spec §3.
- [ ] **Step 4: Correr** — `node tests/city_intro.cjs && SUITE` → PASS, `FIN`.
- [ ] **Step 5: Commit** — `feat(city): introducción para jugadores nuevos, pistas y cómo se juega`

---

### Task 8a: Ruta del paquete en 2D

**Files:**
- Create: `city/route.js` (copia de `trip/flow.js` + `from`; `trip/flow.js` se borra en 8b), `city/route_view.js`, `tests/city_route.cjs` (copia de `tests/trip.cjs` apuntando a `city/route.js`), `tests/city_route_view.cjs`, `tests/adv/route_props.cjs` (la parte de `TripFlow` de `tests/adv/trip_props.cjs`, apuntando a `CityRoute`)
- Modify: `city/view.js` (pads como lugares de la escena; objetivo `route`), `build.mjs` (inyecta `route.js` en `/*__CITY_CODE__*/` y `route_view.js` en `/*__CITY_VIEW__*/`)

**Interfaces:**
- Produces: `CityRoute.create(deps)` = `TripFlow.create` + `deps.from` (entero 0..n−1; cualquier otro valor → 0).
- Produces en `route_view.js`: `CD.route = { flow, from, xp, fails }`, **una instancia por visita a M08** (se crea al tocar el primer pad; se descarta en `cityEnter` y en `cityTeardown`). `onStation` solo actualiza el pad activo: la estación se abre al tocar el pad. Cerrar la hoja a mitad descarta `flow` y crea otro con `from = done`, conservando `xp` y `fails` de la visita. Funciones (adaptadas a `cityOpenSheet` y `data-act="cx"`, no copiadas):

  | Viejo (`engine.html`) | Nuevo (`route_view.js`) | Cambio |
  |---|---|---|
  | `tripOnStation` | `cityRouteOpen(i)` | hoja de la ciudad, chip "Estación n de N · nombre" |
  | `tripOnAsk` | `cityRouteAsk(item)` | contenedor `#city-sheet` |
  | `tripOpts` | `cityRouteOpts(item, picked)` | `data-act="cx" data-c="ropt"` |
  | `tripShowResult` | `cityRouteResult(k)` | foco con `cFocus` |
  | `tripRecord` | `cityRouteRecord(r)` | igual (XP y `recordAnswer`) |
  | `tripOnSummary` | `cityRouteSummary(s)` | resumen de la visita |
  | `tripHud` + `TRIP_LAYERS` | `cityRouteHud()` + `CITY_ROUTE_LAYERS` | pill "Capas: …" |

- [ ] **Step 1: Escribir las pruebas**:
  - `city_route.cjs`: las de `trip.cjs` + `from 3 empieza en S3`; `from` −1, `NaN`, 3.5, `"3"`, `Infinity` y 10 → 0.
  - `city_route_view.cjs`: la flecha apunta a `pads[done]`; tocar un pad que no es el activo no abre nada; abrir → chip "Estación 1 de 10 · Prólogo: la red" y keyPoint; responder bien → `done` 1, guardado, `setRoute(1)`, anuncio en `#city-live`; propiedad (≥ 500 secuencias aleatorias de tocar pads, responder y cerrar): `done` solo sube de a 1 o vuelve a 0 al confirmar "Recorrer otra vez"; cerrar a mitad → "Retomarás en la estación 1." sin cambio de `done`; reanudar tras recargar empieza en `done`; HUD "Capas: Datos"; retomar en `done 7` con fallos de una visita anterior → el resumen solo cuenta esta visita; terminar la 10.ª → resumen con "Repasar lo que fallé" si hubo fallos; con `done 10` el pad S0 ofrece "Recorrer otra vez" y no crea `flow` con `from 10`; al confirmar, `done` = 0 y `xp`, `qs`, `beaten` sin cambios; con movimiento reducido el paquete no se anima; XP por respuesta = `xpBase` + pasiva.
- [ ] **Step 2: Correr y ver fallar** — `node build.mjs && node tests/city_route.cjs; node tests/city_route_view.cjs` → FAIL.
- [ ] **Step 3: Implementar** spec §5.6.
- [ ] **Step 4: Correr** — `node tests/city_route.cjs && node tests/city_route_view.cjs && node tests/adv/route_props.cjs && SUITE` → PASS, `FIN`.
- [ ] **Step 5: Commit** — `feat(city): ruta del paquete en Nodo Enlace`

---

### Task 8b: Borrado del 3D y guarda

**Files:**
- Delete: `vendor/three.module.min.js`, `trip/` (completo), `three/` (completo), `tests/build_vendor.cjs`, `tests/scene.cjs`, `tests/scene_extra.cjs`, `tests/three_shared.cjs`, `tests/trip.cjs`, `tests/trip_engine.cjs`, `tests/trip_extra.cjs`, `tests/adv/trip_fuzz.cjs`, `tests/adv/trip_props.cjs`
- Modify: `city/world2d.js` (`Pauser` interno, devuelto en el objeto de `CityWorld2D` sin condición; se quita el alias `T3`), `tests/city_world2d.cjs` (recibe las pruebas de `Pauser` de `three_shared.cjs` y `scene.cjs:52-60` **antes** de borrarlos), `engine.html` (todo lo del viaje: `loadThree`, `dynImport`, `tripScenePath`, `tripFallback`, `tripStart`, `tripStop`, `tripExit`, `TD`, `tripGen`, `threeP`, `#trip-root` y su CSS, la vista `trip`, `<!--__THREE__-->`, `/*__TRIP__*/`), `build.mjs` (`THREE_VENDOR`, vendor y anclas del viaje; `CITY_DATA` se inyecta con `JSON.stringify(...).replace(/</g, '\\u003c')`), `validate.mjs`, `_headers`, `tests/build_validate.cjs`, `README.md`
- Create: `tests/xss_data.cjs`

**Interfaces:**
- Produces en `validate.mjs` (la guarda se aplica al código del motor **sin** el literal `var CITY_DATA = …;`): literales con `includes` — `Three3D`, `TripScene`, `TripFlow`, `TRIP_STATIONS`, `trip-root`, `tripStop`, `loadThree`, `three-src`, `three.module`, `__TRIP_IMPORT__`, `__TRIP_SCENE__`, `dynImport`, `createObjectURL`, `bridgeSeen`, `cityZone`; `/\bimport\s*\(/` para `import(`; falla si `_headers` contiene `blob:`; falla si en `city/*.js` un `innerHTML` recibe un nombre o etiqueta de datos sin `esc(`/`fmt(` (mismo criterio que hoy para `view.js`, extendido a todo `city/`).

- [ ] **Step 1: Escribir las pruebas**:
  - `build_validate.cjs`: la build falla si reaparece cada literal de la guarda y con `import('x')`, `import (u)` e `import(u)`; no falla si un texto del temario dentro de `CITY_DATA` menciona `import(`; falla con `blob:` en `_headers`.
  - `xss_data.cjs`: reescribe en el HTML compilado los nombres, etiquetas, nombres de estación y `celebrate.text` de `CITY_DATA` con `<img src=x onerror=alert(1)>` y `</script>`; abre plaza, M02, M08, un mentor, una criatura, una reparación, un aprendiz, una estación y la celebración → 0 elementos `img` y 0 errores.
  - `city_world2d.cjs`: pruebas de `Pauser` movidas, sobre `CityWorld2D.Pauser`.
  - El HTML final no contiene `Three3D`, `TripScene`, `three.module` ni `THREE`.
- [ ] **Step 2: Correr y ver fallar** — `node build.mjs && node tests/build_validate.cjs; node tests/xss_data.cjs` → FAIL.
- [ ] **Step 3: Implementar** spec §7 y §9. README: quitar el viaje 3D y describir plaza, portales y distritos.
- [ ] **Step 4: Correr** — `SUITE` → `FIN`; `ADV` (segundo plano) → `FIN`; `ls -d vendor trip three 2>&1 | grep -c "No such"` → 3; `grep -c "blob:" _headers` → 0; `wc -c juego_estudio.html` ≈ 690 KB menos que antes de la tarea.
- [ ] **Step 5: Commit** — `feat(city): adiós al 3D; guarda de identificadores y CSP sin blob`

---

### Task 9: Humo en navegador y cierre

**Files:**
- Create (scratchpad, no se comitea): `smoke_districts.mjs` (Playwright, Chromium)
- Modify: `docs/superpowers/specs/2026-11-12-ciudad-distritos-design.md` (§13 "Cambios de la implementación" con los rulings del ledger)

- [ ] **Step 1: Escribir el script** sobre `juego_estudio.html` servido localmente:
  - Contextos: teléfono `{ viewport: 390×844, hasTouch: true, isMobile: true }`, teléfono chico `320×640` (táctil) y laptop `1280×800`; una pasada extra del teléfono con `emulateMedia({ reducedMotion: 'reduce' })`.
  - Recorrido: partida nueva → prólogo → cerrar → caminar al portal M08 (táctil: arrastre en el 45 % izquierdo con eventos táctiles; laptop: teclado) → entrar → mentor → salir → plaza.
  - Comprobaciones en cada contexto y escena: 0 errores de consola; alto de `.city-hud` ≤ 25 % del viewport; los rectángulos de `.city-hud`, `#city-tip` y `#city-act` no se cruzan; `document.documentElement.scrollWidth <= innerWidth`; en táctil, el panel 4 muestra la línea táctil.
  - Capturas: plaza, M02, M08, M08 con la ruta activa y una pista visible, hoja "Próximamente" y banner de error (forzar el fallo reescribiendo el HTML), en los tres tamaños.
- [ ] **Step 2: Correr** — Expected: 0 errores y todas las comprobaciones verdaderas; revisar las capturas (portales visibles, pads distinguibles por forma).
- [ ] **Step 3:** Escribir §13 del spec con los rulings y desviaciones (incluidos M11 sin módulo y el límite de la pestaña vieja para M08).
- [ ] **Step 4: Correr** — `SUITE` → `FIN`.
- [ ] **Step 5: Commit** — `docs(city): cambios de la implementación de distritos`
- [ ] **Step 6 (punto de control del usuario):** pedir al usuario que pruebe en su teléfono con `?fps=1` en plaza, M02 y M08 y confirme fps.
