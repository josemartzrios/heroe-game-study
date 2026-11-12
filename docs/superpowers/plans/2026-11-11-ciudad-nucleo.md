# Ciudad Núcleo (prólogo + capítulo 1): plan de implementación (v2)

> **Para agentes ejecutores:** SUB-SKILL OBLIGATORIA: usa superpowers:subagent-driven-development (recomendada) o superpowers:executing-plans para ejecutar este plan tarea por tarea. Los pasos usan casillas (`- [ ]`) para seguir el avance.

**Objetivo:** reemplazar el mundo 2D por una ciudad 3D en tercera persona. En ella tu héroe aprende, se pone a prueba y enseña hasta restaurar el distrito de Fundamentos (M02).

**Arquitectura:**
- **Lógica pura** en `city/move.js`, `city/story.js` y `city/input.js`, que se prueban con `require`.
- **3D** en `city/hero3d.js` y `city/world.js`, que reciben `THREE`.
- **Interfaz** en `city/view.js`. Se inserta **dentro** de la IIFE del motor y usa `startRound`, `fmt`, `esc`, `S`, etc.
- **Datos** en `city/districts.mjs`, que se escribe como `CITY_DATA`.
- **Lo común con el viaje** en `three/shared.js`.

**Stack:** JS vanilla. ES5 dentro de la IIFE (sin `let`, `const` ni flechas), Three.js r169 ya incrustado, Node 22 y jsdom 31.

**Spec:** `docs/superpowers/specs/2026-11-11-ciudad-nucleo-design.md` (v3). **Léelo completo antes de empezar.** Las secciones §N son de ahí. **Si el plan y el spec difieren, manda el plan.**

## Restricciones globales

- **Un solo HTML:** `node build.mjs` genera `juego_estudio.html`. No se agregan recursos nuevos en tiempo de ejecución.
- **Orientación:** **teléfono siempre en vertical** (el aviso de girar solo aparece en dispositivos táctiles) y **laptop en horizontal normal**.
- **No se tocan** el contenido de M01–M10, sus IDs, `estudio_isw_v1` ni `v: 1`, ni nada entre `// === MODULE:Mxx START/END ===`.
- **Exámenes con las reglas actuales:** `starsOf` pide ≥ 6 respuestas; jefe con 1 estrella por tema, 20 preguntas y 80 %.
- **Escritura en el DOM:** todo texto de datos va a `innerHTML` solo a través de `esc()` o `fmt()`. El botón de acción, `#city-live` y `#city-obj` se escriben solo con `textContent`.
- **Gráficos:** ningún `PointLight`; ningún material `transparent` con `DoubleSide`; nunca dos rAF a la vez (la ciudad usa solo el rAF del mundo).
- **Variables globales en IIFE:** dentro de una IIFE, **nunca** declares `var X` con el mismo nombre que un global que quieras leer. Usa un alias local (`var T3 = …`).
- **Textos fijos (español de México):**
  - **Entrada y carga:** "Entrar a la ciudad", "Preparando la ciudad…", "Tu equipo no puede mostrar la ciudad 3D.", "Ir a los módulos", "Volver", "Se perdió la vista 3D.", "Reintentar", "Salir".
  - **HUD y pausa:** "Pausa", "Correr", "Gira tu teléfono a vertical", "Ir al objetivo", "Lugares cercanos", "Lecciones vistas", "Repaso", "Tu héroe", "Salir al inicio", "Volver a la ciudad".
  - **Lecciones y enseñar:** "Practicar", "Cerrar", "Para la primera estrella hacen falta al menos 6 respuestas", "¿Me explicas {título}?", "Explicar", "N de 3", "De otro tema".
  - **Rondas:** "Reparación", "Batalla", "Enseñar".
  - **Torre, puente y prólogo:** "Te faltan N temas", "Entrar a la torre", "Cruzar el puente", "Próximamente", "Capítulo completo", "Siguiente", "Saltar".
- **Suite** (el "verde" de cada tarea; timeout de 600000 ms):
  `cd /home/josma/myprojects/juego && node build.mjs && node validate.mjs && for f in tests/*.cjs tests/adv/attacks.cjs; do node "$f" >/dev/null 2>&1 || echo "FALLO $f"; done; echo FIN`
  Se espera `OK`, `VALIDACIÓN OK` y `FIN`, sin ninguna línea `FALLO`.
- **Commits** en `feat/ciudad-3d`, terminando con `Co-Authored-By: <modelo> <noreply@anthropic.com>`.
- **Funciones auxiliares de prueba:** copia las de `tests/record.cjs`, `tests/trip_engine.cjs` o `tests/adv/lib.cjs` (reloj falso `FD`). **No hagas `require` de `record.cjs` ni de `trip_engine.cjs`**, porque ejecutan su suite.
- **Cómo leer el estado del motor en jsdom:** `R` y `S` son privados de la IIFE.
  - Vida y energía se leen de los `aria-label` del HUD de batalla ("Vida del villano N de 4", "Energía N de 3").
  - El progreso se lee de `localStorage`.
  - Mientras `vBattleHud` tenga canvas (hasta la Tarea 9), simula `HTMLCanvasElement.prototype.getContext`, como en `tests/record2.cjs:26`.

## Foco de revisión

1. **Volver de una ronda con el teléfono girado:** la ciudad suspendida reanuda con el tamaño correcto. → Tarea 8.
2. **Guardado manipulado** (`__proto__`, ids desconocidos, `city: null`, `at` con `"5"`, `1e308` o `-1e309`): arranca en la plaza, sin progreso falso y sin borrar el resto. → Tareas 1 y 5.
3. **Cruzar la medianoche dentro de la ciudad:** la criatura de ayer vuelve sin salir. → Tarea 13.
4. **Dos dedos a la vez**, y un dedo que se suelta fuera o se cancela: nada se queda pegado. → Tarea 6.
5. **Salir hacia "Tu héroe" y volver cinco veces:** nunca hay más de un mundo ni un contexto WebGL sin liberar. → Tareas 8 y 11.

---

### Tarea 1: Listas blancas en `migrate()` (`hero.look` y `stats`)

**Archivos:** `engine.html` (`migrate`, `plainObj`, ~líneas 489-540). Pruebas: `tests/migrate.cjs`.

**Interfaces:**
- `plainObj(x)`: devuelve verdadero si `x` es un objeto no nulo, no es arreglo y `Object.getPrototypeOf(x) === Object.prototype`.
- `hero.look` se reconstruye en un objeto **nuevo**:
  - por cada slot de `PARTS` (`skin`, `suit`, `head`, `eyes`, `emblem`, `cape`, `hand`), un entero ≥ 0 si es clave propia del guardado; si no, el valor fresco;
  - más `hc` y `capec` solo si son claves propias y cumplen `hex()`.
- `stats` se reconstruye igual, con las claves de `fresh().stats` (`learnTopics` como arreglo de cadenas; `cleared` y `roundsNoPower` como enteros ≥ 0; `bossFailed` como objeto plano de booleanos `true`).
- En los dos casos, sin `Object.assign` sobre datos guardados.

- [ ] **Paso 1: agregar casos a `tests/migrate.cjs`** (con su helper `norm1`), que deben fallar:
  - (N16) `look` con `__proto__` que trae un `capec` malicioso:
    - el `look` guardado no tiene `capec` y su prototipo es `Object.prototype`;
    - al abrir "Tu héroe" no aparece `#pwn` en el DOM.
  - (N17) `look: { skin: 2, constructor: { x: 1 }, extra: 'z' }`: el `look` guardado solo trae claves de slot, con `skin === 2`.
  - (N18) `stats: JSON.parse('{"__proto__":{"cleared":99},"cleared":3}')`: el `stats` guardado trae `cleared === 3`, su prototipo es `Object.prototype` y no tiene claves fuera de las de `fresh().stats`.
- [ ] **Paso 2:** `node tests/migrate.cjs` → fallan N16, N17 y N18.
- [ ] **Paso 3: implementar.**
- [ ] **Paso 4:** suite en verde.
- [ ] **Paso 5: commit** `fix: migrate con listas blancas en hero.look y stats (cierra bypass __proto__)`.

---

### Tarea 2: `three/shared.js`

**Archivos:** crear `three/shared.js` y `tests/three_shared.cjs`; modificar `trip/scene.js` y `build.mjs`.

**Interfaces:**
- **Exporta** `var Three3D = (function(){ … return { Pauser, compileOrLost, disposeScene, mergeBoxes }; })(); if (typeof module !== 'undefined' && module.exports) module.exports = Three3D;`.
- **`Pauser()`:** devuelve `{ set(reason, on), running(), has(reason), tick(ts) }`.
  - Es el `Pauser` de `trip/scene.js` más `has(reason)`: verdadero si ese motivo está activo.
- **`compileOrLost(renderer, scene, camera, canvas)`:** devuelve una `Promise`.
  - Compite `renderer.compileAsync` (o `compile`) contra el evento `webglcontextlost` del canvas.
  - Rechaza si se pierde el contexto, y siempre quita su listener.
- **`disposeScene(scene)`:** libera cada geometría y material único encontrado con `traverse`.
- **`mergeBoxes(THREE, parts)`:** devuelve una `BufferGeometry` indexada con `position`, `normal` y `color`, sin `uv`.
  - `parts` es `[{ w, h, d, x, y, z, color: 0xRRGGBB, rotY? }]`.
  - Con `rotY` gira posiciones **y normales**.
- **En `trip/scene.js`,** dentro de su IIFE: `var T3 = (typeof Three3D !== 'undefined') ? Three3D : require('../three/shared.js');`. **Alias distinto**, ver Restricciones globales.
  - Usa `T3.Pauser`, `T3.compileOrLost` y `T3.disposeScene`, y sigue exportando `Pauser: T3.Pauser`.
  - `tests/scene.cjs` y `tests/scene_extra.cjs` **no cambian**.
- **En `build.mjs`:** inserta `three/shared.js` antes de `flow.js` en `/*__TRIP_CODE__*/`.

- [ ] **Paso 1: escribir `tests/three_shared.cjs`** (Three real vía `pathToFileURL(path.join(__dirname,'..','vendor','three.module.min.js')).href`), que debe fallar:
  - (a) `Pauser`: con dos motivos activos no corre; el primer `tick` tras reanudar da 16; dt ≤ 50; `has('sheet')` refleja el estado.
  - (b) `compileOrLost`: resuelve con un `compileAsync` falso que resuelve; rechaza al despachar `webglcontextlost`; en los dos casos el listener desaparece.
  - (c) `disposeScene`: con espías, cada geometría y material compartido se libera una sola vez.
  - (d) `mergeBoxes` con 3 cajas (una con `rotY: Math.PI/2`): `index.count === 108`, 72 vértices, existe `color`, no hay `uv`, y la normal +X de la caja rotada pasa a ±Z.
  - (e) **Prueba de navegador simulado:** evalúa el texto concatenado de `three/shared.js` + `trip/scene.js` dentro de una IIFE en `vm` sin `require`. `TripScene.Pauser` existe y no lanza `require is not defined`.
- [ ] **Paso 2:** confirmar que falla.
- [ ] **Paso 3: implementar** y refactorizar `trip/scene.js`.
- [ ] **Paso 4:** suite en verde. Además, `node tests/adv/trip_props.cjs 300 20261111` no debe dar ningún `FAIL`.
- [ ] **Paso 5: commit** `refactor: three/shared.js común (Pauser, compileOrLost, disposeScene, mergeBoxes)`.

---

### Tarea 3: `city/districts.mjs`, anclas y validación

**Archivos:** crear `city/districts.mjs`; modificar `build.mjs`, `validate.mjs` y `engine.html` (anclas).

**Interfaces:**
- **Dos anclas nuevas en `engine.html`, cada una en su propia línea:**
  - **`/*__CITY__*/`** justo **antes** de `function fresh() {` (~línea 480). Ahí van `CITY_DATA`, `move.js`, `story.js` e `input.js`, que deben existir antes de `var S = load()` (línea ~556).
  - **`/*__CITY_VIEW__*/`** justo después de `/*__TRIP__*/` (~línea 1280). Ahí van `hero3d.js`, `world.js` y `view.js`.
- **En `build.mjs`:**
  - `out = out.replace('/*__CITY__*/', () => 'var CITY_DATA = ' + JSON.stringify(city) + ';\n  /*__CITY_CODE__*/')`;
  - lo mismo con `/*__CITY_VIEW__*/` → `'/*__CITY_VIEW_CODE__*/'`;
  - error si falta cualquiera de las dos anclas;
  - antes de escribir, borrar las anclas `*_CODE__` que sobren.
- **`export const city`:**
```
{ ranks: [[0,'Becario'],[1,'Junior'],[3,'Semi-senior'],[6,'Senior'],[8,'Arquitecto'],[11,'Tech Lead']],
  bounds: { minX:-70, maxX:70, minZ:-195, maxZ:40 }, radius: 0.4,
  spawn: { x:0, z:8, yaw:0 },                                   // yaw 0 mira a -z (norte)
  plaza: { r:30, director:{ id:'iris', name:'Iris', x:-6, z:-4 }, mirror:{ id:'espejo', name:'Espejo', x:6, z:-4 },
           roads: [ …10 { dist:'M04'|…, angle, wall:{ x, z, w:6, d:2, h:4 } } a r=38, el norte (M02) sin muro ] },
  districts: { M02: { name:'Taller Comunal', seed:7, rect:{ minX:-60, maxX:60, minZ:-185, maxZ:-50 },
     blocks: 16 centros [[x,z]] con x∈{-42,-14,14,42} y z∈{-66,-94,-122,-150},
     mentors:     23 × { id:'m01'…, topic:'T01'…, name, x, z },
     creatures:   6 × { id, name, topics, area:{ x, z, r:6 } },   // la tabla de §3.2
     repairs:     10 × { id:'r01'…, topic, label, x, z },         // temas de §3.2
     apprentices: 12 × { id:'a01'…, topic, name, mode:'explain'|'correct', x, z },
     tower: { id:'torre', x:0, z:-162, w:8, d:8, h:20 },
     bridge: { id:'puente', x:0, z:-178, w:6, d:10, to:'M04' }, need: 8 } },
  villainsM01: [ …copia exacta de VILLAINS (engine.html ~1820)… ] }
```
  - Nombres: 23 de mentor y 12 de aprendiz, todos únicos y sin repetirse entre grupos.
  - Ids con `/^[a-z0-9_-]+$/`.
  - Las posiciones las eliges tú, sobre calles y dentro de `rect` o del círculo de la plaza.

- [ ] **Paso 1: escribir primero en `validate.mjs` las reglas de §9 del spec**, que deben fallar:
  - Extraer `var CITY_DATA = ({[\s\S]*?});` con `vm.runInNewContext`.
  - **Mentores:** 23, con temas T01–T23 sin repetir y nombres únicos.
  - **Criaturas:** 6; cubren cada tema una vez; cada una tiene ≥ 8 preguntas mcq+tf (contadas con `MODULES`); sin palabras prohibidas.
  - **Retos:** 10, de temas distintos, cada uno con ≥ 2 preguntas scenario+error.
  - **Aprendices:** 12, de temas distintos. Los de `correct` necesitan ≥ 1 pregunta `error`. Sus nombres no chocan con los de mentores. `need === 8`.
  - **Ids seguros:** fuera de `__proto__`, `constructor`, `prototype` y `Object.getOwnPropertyNames(Object.prototype)`.
  - **`ranks`** igual a la tabla. **`villainsM01`** cubre T01–T19 de M01 una vez.
  - **Posiciones:** todas dentro de `bounds`; las de M02 dentro de `rect` (torre y puente incluidos). Distancia ≥ 4 m entre interactuables.
- [ ] **Paso 2:** `node build.mjs && node validate.mjs` → "Falta CITY_DATA".
- [ ] **Paso 3: implementar** (`city/districts.mjs`, anclas y `build.mjs`).
- [ ] **Paso 4:** suite en verde.
- [ ] **Paso 5: commit** `feat(city): datos del capítulo 1, anclas y validación`.

---

### Tarea 4: `city/move.js` (matemática pura)

**Archivos:** crear `city/move.js` y `tests/city_move.cjs`; modificar `build.mjs` (en `/*__CITY_CODE__*/`) y `validate.mjs`.

**Interfaces:** `var CityMove` (IIFE + `module.exports` protegido) con:
- **`isNum(v)`:** devuelve `typeof v === 'number' && Number.isFinite(v)`.
- **`coord(v, min, max, fallback)`:** si `isNum(v)`, `v` acotado a `[min, max]`; si no, `fallback`.
- **`layoutBuildings(district)`:** devuelve `[{ x, z, w, d, h, color }]`, determinista con `mulberry32(district.seed)`.
  - 2 o 3 edificios por manzana; `w` y `d` entre 5 y 9; `h` entre 4 y 14.
  - Dentro de 20×20 alrededor del centro de la manzana; `color` es un índice de 0 a 5.
- **`boxesFor(D, restored)`:** devuelve AABB `[{ minX, maxX, minZ, maxZ, h }]`: edificios de M02, la torre, los 10 muros de la plaza, el puente (solo si `!restored`) y 4 cajas de borde en `bounds`.
- **`step(state, intent, dt, boxes, opts)`:** devuelve `{ x, z, yaw, vx, vz, speed }`.
  - **`dt = min(dt, 0.05)`**. Si `dt` o cualquier campo de `state` no cumple `isNum`, devuelve `{ x: opts.safe.x, z: opts.safe.z, yaw: opts.safe.yaw, vx:0, vz:0, speed:0 }`.
  - Velocidad objetivo 4 o 7 m/s (`intent.run && opts.canRun`). Movimiento relativo a `opts.camYaw` (`intent.mx`, `intent.mz` en [−1, 1]).
  - **Aceleración** con `k = min(1, dt / 0.15)` hacia la velocidad objetivo.
  - **Colisión:** círculo de radio `r` contra cada caja, resuelta por eje (primero X, luego Z), empujando a `r + 1e-4` (piel).
    - Hay solape si `d² < (r − 1e-6)²`.
    - En el paso X se ignoran las cajas con las que ya había solape antes de moverse.
- **`cameraArm(target, yaw, pitch, len, boxes)`:**
  - Recorre un rayo desde `target` (altura 1.6) hasta la posición de la cámara, contra las cajas con altura `h`.
  - Devuelve `min(len, max(0.3, hit − 0.2))`, o `len` si no hay impacto o alguna entrada no es finita.
- **`nearest(pos, items, maxDist)`** y **`within(pos, items, r)`:** items `[{ id, kind, name, x, z }]`, ordenados por distancia.

- [ ] **Paso 1: escribir `tests/city_move.cjs`**, que debe fallar. Copia como regresiones los contraejemplos de `tests/adv/plan_city_oracle.cjs`:
  - **`coord`:**
    - `"5"`, `[]`, `null`, `NaN` y `-Infinity` → `fallback`;
    - `1e308` → `max`;
    - `-5` dentro del rango → `-5`.
  - **`layoutBuildings`:** con la misma semilla da el mismo resultado; entre 32 y 48 edificios; todos dentro de su manzana.
  - **`step`:**
    - (túnel) caja de grosor 0 a 7 m/s con `dt = 0.12` y con `dt = 0.5` → no la cruza;
    - un muro de 6×2 resiste 100 pasos;
    - diagonal contra una esquina → desliza;
    - costura de dos cajas contiguas (el caso A/B del oráculo) → avanza sin retroceder más de 0.01 m;
    - acelera en unos 0.15 s, y con `dt = 0.5` la velocidad no pasa de 7;
    - `state.vz = Infinity` → devuelve `opts.safe` con velocidad 0;
    - solo corre con `canRun`.
  - **`cameraArm`:**
    - sin cajas → `len`;
    - con una caja en medio → menor que `len`;
    - target a 0.5 m de un muro trasero → la cámara no queda dentro de la caja;
    - yaw `NaN` → `len`.
  - **`nearest` y `within`:** ordenan y filtran.
- [ ] **Paso 2:** confirmar que falla.
- [ ] **Paso 3: implementar** e insertar en `build.mjs`.
  - `validate.mjs`: con `layoutBuildings(M02)`, ningún interactuable queda dentro de un edificio (margen de 0.6 m).
- [ ] **Paso 4:** suite en verde. Las comprobaciones S1–S8 y C1–C3 de `node tests/adv/plan_city_oracle.cjs` dejan de fallar si el oráculo se apunta a `CityMove`. Agrega al oráculo una sección que importe `city/move.js` y repita S1–S8 y C1–C3 contra la implementación real.
- [ ] **Paso 5: commit** `feat(city): move.js (movimiento con tope de dt y piel, colisiones, cámara, cercanos)`.

---

### Tarea 5: `city/story.js` (lógica pura)

**Archivos:** crear `city/story.js` y `tests/city_story.cjs`; modificar `build.mjs` (en `/*__CITY_CODE__*/`, después de `move.js`).

**Interfaces:** `var CityStory`, con `var CM = (typeof CityMove !== 'undefined') ? CityMove : require('./move.js');` dentro de su IIFE.
- **`normalizeCity(raw, D, bossPassed, todayStr)`:** devuelve un `C` nuevo.
  - **Arranque:** si `!plainObj(raw)`, `raw = {}`; lo mismo para cada subobjeto.
  - **Listas blancas** por id de `D.districts.M02`, comprobando con `hasOwnProperty`:
    - `beaten`: fechas válidas `YYYY-MM-DD` (comprobadas con `Date` y ≤ `todayStr`);
    - `repairs` y `taught`: valor `true`;
    - `prologue`, `run` y `bridgeSeen`: booleanos.
  - **`at`:**
    - si `x` o `z` no cumplen `isNum`, `at = spawn` completo;
    - si no, se acotan a `[bounds.min + radius, bounds.max − radius]`;
    - `yaw` se reduce módulo 2π si es finito; si no, `spawn.yaw`;
    - si la posición cae dentro de `boxesFor(D, false)` (con margen `radius`), `at = spawn`.
  - **`restored` y `powers`:** se recalculan siempre.
- **`taughtCount(C, D)`.**
- **`restoration(C, D, bossPassed)`:** entero de 0 a 100. Usa `!!bossPassed`.
- **`isRestored(C, D, bossPassed)`.**
- **`applyRestore(C, D, bossPassed)`:** devuelve `{ changed }`.
  - **Idempotente:** pone o quita `restored.M02` y `powers.planos` según la condición.
  - `changed` es verdadero solo si `restored.M02` pasó de falso a verdadero.
- **`rankOf(C, D)`.**
- **`apprenticesAvailable(C, D, starsOf)`.**
- **`nextObjective(C, D, ctx)`:** devuelve `{ kind, id, label }`, con `ctx = { learned(topic), stars(topic), beatenEver(id), beatenToday(id), bossUnlocked, bossPassed }`. Orden (spec §3.5 v3):
  1. Prólogo no visto → `director`.
  2. Restaurado y `!C.bridgeSeen` → `bridge`. Restaurado y ya visto → `done` ("Capítulo completo").
  3. `bossUnlocked && !bossPassed` → `tower`.
  4. El **primer grupo incompleto** en el orden de las criaturas de §3.2. Un grupo está **incompleto** si algún mentor del grupo no tiene lección, o algún tema tiene 0 estrellas, o su criatura nunca fue vencida. Dentro del grupo: mentor sin lección → `mentor`; tema con 0 estrellas → `practice`; criatura nunca vencida → `creature`.
  5. Reto sin reparar → `repair`.
  6. Aprendiz disponible → `apprentice`.
  7. Criatura no vencida hoy → `creature`.
  8. `none`.

  Etiquetas: "Habla con {nombre}", "Practica con {nombre}", "Enfrenta a {criatura}", "Repara el {label}", "Enseña a {nombre}", "Entra a la torre", "Cruza el puente", "Capítulo completo".

- [ ] **Paso 1: escribir `tests/city_story.cjs`**, que debe fallar. Copia como regresiones O1–O4 y N1–N6 de `tests/adv/plan_city_oracle.cjs`:
  - **`normalizeCity`:**
    - `city` igual a `null`, `[]` o `"x"` → `C` válido vacío, sin lanzar;
    - `taught` con `__proto__`, `constructor`, `a01` y `zz` → solo `{ a01: true }`, con el prototipo intacto;
    - `at: { x: "5", z: 8 }` → `spawn`; `at: { x: 1e308, z: NaN }` → `spawn`; `yaw: -Infinity` → `spawn.yaw`;
    - `x` acotado → `≤ maxX − 0.4`; `at` dentro de un edificio → `spawn`;
    - `beaten: { bit: '9999-99-99', eco: null }` → vacío;
    - `powers.planos` sin jefe → vacío; 8 enseñados con el jefe → `restored` y `planos`.
  - **`applyRestore`:**
    - `restored.M02` puesto con `powers` vacío → agrega `planos`;
    - sin condición → los quita.
  - **`restoration`:** 0, 50, 50 y 100; con `bossPassed` `undefined` o `"true"` da un entero.
  - **`rankOf`:** "Becario" y "Junior".
  - **`nextObjective`:**
    - prólogo → `director`;
    - restaurado → `bridge` y, con `bridgeSeen`, `done`;
    - `tower`;
    - T01–T03 sin lección → `mentor m01`;
    - T02 con 0 estrellas → `practice`;
    - grupo 1 completo menos la criatura → `creature bit`;
    - todos los grupos completos → `repair` → `apprentice` → `creature` hoy → `none`;
    - una partida simulada completa termina en `done` y pide las 6 criaturas como "nunca vencida".
- [ ] **Paso 2:** confirmar que falla.
- [ ] **Paso 3: implementar** e insertar en `build.mjs`.
- [ ] **Paso 4:** suite en verde. Agrega al oráculo una sección que importe `city/story.js` y repita O1–O4 y N1–N6. Todo debe quedar en verde.
- [ ] **Paso 5: commit** `feat(city): story.js (normalización segura, restauración idempotente, objetivo)`.

---

### Tarea 6: `city/input.js`

**Archivos:** crear `city/input.js` y `tests/city_input.cjs`; modificar `build.mjs` (en `/*__CITY_CODE__*/`).

**Interfaces:** `var CityInput.create(root, opts)` devuelve `{ intent(), consumeCamera(), consumeAction(), consumePause(), dispose() }`.
- **`opts = { safe(), isFree(el), now() }`:**
  - `safe()` devuelve `{ left, bottom }` en px; en el motor sale de la Tarea 8;
  - `now` vale por defecto `root.ownerDocument.defaultView.performance.now`;
  - el teclado se escucha en `root.ownerDocument.defaultView`.
- **Zonas por `pointerId`:**
  - **Joystick:** se crea en el cuarto inferior izquierdo (x < 50 % y y > 75 % del `getBoundingClientRect` de `root`), siempre que no caiga en el margen `safe().left + 16` ni `safe().bottom + 16`. Un toque en ese margen **no hace nada**.
  - **Cámara:** cualquier otro dedo en una zona libre (`isFree`).
  - Cada dedo conserva su zona hasta `pointerup` o `pointercancel`.
  - La captura de puntero es opcional: `if (root.setPointerCapture) try { root.setPointerCapture(id) } catch (e) {}`.
- **`intent()`** devuelve `{ mx, mz, mag, run }`:
  - el joystick tiene radio de 48 px;
  - `run` es verdadero si `mag ≥ 0.7`;
  - WASD y las flechas dan `mx` y `mz`; Shift activa `run`.
- **`consumeCamera()`** devuelve `{ yaw, pitch }` en grados acumulados: arrastre × 0.25 °/px; Q/Z dan ±90 °/s según `opts.now()`.
- **`consumeAction()`:** verdadero una vez por cada pulsación de E o Enter. Se ignora Enter si `document.activeElement` es un `BUTTON`.
- **`consumePause()`:** verdadero una vez por cada Esc.
- **Teclas ignoradas:** las de juego (movimiento, Q/Z, E/Enter) se ignoran si el foco está en `INPUT` o `TEXTAREA`.

- [ ] **Paso 1: escribir `tests/city_input.cjs`**, que debe fallar.
  - **Preparación en jsdom:** un `div` con `getBoundingClientRect` simulado a 390×844, `setPointerCapture` y `releasePointerCapture` simulados en `Element.prototype`, y `now` controlable. Cada prueba empieza sin teclas presionadas.
  - **Casos:**
    - (a) Un dedo abajo a la izquierda que se mueve 48 px a la derecha da `mx ≈ 1`, `mag ≈ 1` y `run`.
    - (b) Un arrastre de 40 px en zona libre da `yaw` 10.
    - (c) **(Foco de revisión 4)** Joystick y cámara funcionan a la vez. Un `pointercancel` del joystick devuelve `intent()` a 0. Un `pointerup` despachado en `root` del dedo de cámara termina el arrastre.
    - (d) `isFree` falso no crea nada.
    - (e) Un toque en el margen izquierdo, o en uno inferior con `safe().bottom = 34`, no hace nada.
    - (f) W + Shift dan `mz = −1` y `run`. Q 0.5 s da `yaw ≈ −45`; Z da `+45`.
    - (g) E → `consumeAction()` es verdadero una vez y luego falso. Enter con el foco en un botón no cuenta. Esc → `consumePause()`.
    - (h) Después de `dispose()`, los eventos no hacen nada.
- [ ] **Paso 2:** confirmar que falla.
- [ ] **Paso 3: implementar.**
- [ ] **Paso 4:** suite en verde.
- [ ] **Paso 5: commit** `feat(city): input.js (joystick por pointerId, cámara, Q/Z, E/Enter, Esc)`.

---

### Tarea 7: Batalla y rondas que vuelven a la ciudad (motor)

**Archivos:** `engine.html` (`battleItems`, `startRound`, `next`, `finish`, `beatenToday`, `fresh`, `migrate`, `vResults`, `goBack` y la batalla del mundo 2D ~línea 2349). Pruebas: `tests/battle.cjs`, `tests/record2.cjs` (I6 e I7), `tests/adv/city_base_attack.cjs` (B7) y la nueva `tests/city_rounds.cjs`.

**Interfaces:**
- **`battleItems(v)`** con `v = { mod, topics, n }`:
  - pool barajado de preguntas mcq+tf de esos temas, sin repetir;
  - devuelve el arreglo de los primeros `n` con la propiedad `arr.pool` = el resto.
- **`startRound(cfg, items)`:** después de crear `R`, hace `R.battlePool = (items && items.pool) ? items.pool.slice() : []`.
- **`next()`:** si `R.battle && !battleOver() && R.i + 1 >= R.items.length && R.battlePool.length`, agrega `R.battlePool.shift()` a `R.items` antes de avanzar.
- **`finish()`:**
  - `R.won = R.battle.hp <= 0`. Se elimina la victoria por puntos.
  - Luego se llama a `cityResolve()` si existe `R.cfg.city`:
    - `battle` → `S.city.beaten[id] = today()` si `R.won`;
    - `repair` → `S.city.repairs[id] = true` si `R.ok === 2 && R.assisted === 0`;
    - `teach` → `S.city.taught[id] = true` si `R.ok === 1`.
  - Después, **siempre** (con o sin `cfg.city`): `var rs = CityStory.applyRestore(S.city, CITY_DATA, !!(S.boss.M02 && S.boss.M02.passed === true)); if (rs.changed) cityRestorePending = true;`. `cityRestorePending` es una variable de la IIFE que consume `view.js`.
  - Todo esto va **antes** de `save()`.
- **`beatenToday(id)`:** `S.city.beaten[id] === today()`. Mientras exista el mundo 2D, sus villanos también usan `S.city.beaten`.
- **`fresh()`:** incluye `city: CityStory.normalizeCity({}, CITY_DATA, false, today())`.
- **`migrate()`**, **al final**, después de normalizar `o.boss`:
  ```
  var bp = !!(o.boss.M02 && o.boss.M02.passed === true);
  var oldRun = (plainObj(o.world) && typeof o.world.run === 'boolean') ? o.world.run : null;
  var hadRun = plainObj(o.city) && typeof o.city.run === 'boolean';
  o.city = CityStory.normalizeCity(o.city, CITY_DATA, bp, today());
  if (!hadRun && oldRun !== null) o.city.run = oldRun;
  ```
- **`repairItems(mod, tid)`:** 2 preguntas barajadas del pool scenario+error del tema.
- **`vResults` y `goBack`:** si `back.name === 'city'`, el botón dice "Volver a la ciudad" y lleva a `{ name: 'city' }`.
- **Batalla del mundo 2D** (hasta la Tarea 9): llama a `battleItems({ mod: vv.mod, topics: vv.topics, n: 8 })` y pasa `city: { kind: 'battle', id: vv.id }`.
- **Gancho de prueba:** solo si `window.__CITY_TEST__ === true`: `window.__CITY_ROUND__ = { startRound: startRound, battleItems: battleItems, repairItems: repairItems };`.

- [ ] **Paso 1: actualizar y escribir las pruebas**, que deben fallar con el motor actual:
  - **`tests/battle.cjs`** (todavía entra por el mundo 2D): el vencido pasa a `s.city.beaten.<id>`. Las aserciones de "4/4" o "4/6" se reemplazan por "victoria solo con vida 0" y "la ronda termina con vida 0 o energía 0".
  - **`tests/record2.cjs` I6 e I7:** cambian igual, `s.city.beaten.cuello`. Se conserva el registro de progreso por respuesta (S.topics, S.qs, S.xp).
  - **`tests/adv/city_base_attack.cjs` B7:** con la regla nueva, la secuencia de B7 sigue respondiendo hasta vida 0 o energía 0. Nunca muestra "¡Victoria!" con la vida del villano mayor que 0. Se adapta su lectura a `s.city.beaten`.
  - **`tests/city_rounds.cjs`** (con `__CITY_TEST__`):
    - batalla de M02 `bit` con `n: 8` y la política del B7 → nunca "¡Victoria!" con vida > 0, y termina;
    - la primera ronda de la sesión con `battleItems` no lanza;
    - `repairItems('M02','T15')` da 2 preguntas del tema;
    - reparación con 2 aciertos marca `repairs`; con 1 no; con láser no;
    - `vResults` con `back:{name:'city'}` muestra "Volver a la ciudad";
    - un jefe M02 aprobado **sin** `cfg.city`, con 8 enseñados guardados, deja `restored.M02` en el guardado.
- [ ] **Paso 2:** confirmar que fallan.
- [ ] **Paso 3: implementar.**
- [ ] **Paso 4:** suite en verde. `city_base_attack.cjs`: B7 pasa. B10 se reescribe en la Tarea 9.
- [ ] **Paso 5: commit** `feat(city): batalla hasta vida/energía 0, pool por ronda, cfg.city, S.city en migrate`.

---

### Tarea 8: Vista `city` (ciclo de vida, suspender y reanudar, estados, HUD, pausa, girar)

**Archivos:** crear `city/view.js` (en `/*__CITY_VIEW_CODE__*/`) y `tests/city_engine.cjs`. Modificar `engine.html` (`render`, delegado de `#app`, CSS, `<div id="city-root" hidden></div>` después de `#trip-root`, Inicio, listener de `visibilitychange`) y `build.mjs`.

**Interfaces:**

**Contrato del mundo.** Lo cumplen `CityWorld` (Tarea 11) y el falso `window.__CITY_WORLD__`. El falso solo se acepta si `window.__CITY_TEST__ === true`, si no es un `Node` y si `typeof create === 'function'`.
- `create(THREE, canvas, D, opts)` devuelve `Promise<api>`.
- `opts = { reducedMotion, portrait, look, PARTS, tick(dt), state(), pixelRatio?, raf?, caf?, renderer? }`.
- **Un solo rAF**, el del mundo. En cada cuadro:
  - `dt` sale del `Pauser`;
  - llama a `opts.tick(dt)` y después a `opts.state()`;
  - aplica las transformaciones y dibuja.
- `state()` devuelve:
  `{ hero:{ x,z,yaw,speed }, cam:{ yaw,pitch,arm }, flags:{ beatenToday:{id:1}, repairs:{id:1}, apprenticesVisible:{id:1}, stars:{ mentorId:0..3 }, restored:bool, lit:0..8 } }`
- `api = { resize(), setPaused(reason, on), dispose(), encounter(id) → Promise, dissolve(id), setLook(look) }`.
  - `dispose()` hace `cancelAnimationFrame`, `disposeScene`, `renderer.dispose()` y `renderer.forceContextLoss()`.

**`view.js`.**
- Estado: `var CD = null, cityGen = 0, cityRestorePending = false;` (esta última se declara en el motor, Tarea 7) y `CD = { gen, canvas, world, input, hero, cam, sheet, paused, suspended, lost, lastObjId, safe }`.
- **`cityStart()`:**
  - si `CD` está vivo y no suspendido, no hace nada;
  - si no, muestra la carga (`<p role="status">Preparando la ciudad…</p>` y "Salir"), `loadThree()`, crea el mundo y comprueba `gen` después de cada `await`.
- **`cityStop()`:** idempotente. Hace `dispose` y deja `#city-root` en `hidden` y vacío.
- **`citySuspend()`:** idempotente. `hidden` + `setPaused('suspended', true)`.
- **`cityResume()`:** idempotente.
  - Si `CD.lost` → `cityFallback('lost')`.
  - Si no → quita `hidden`, llama a `world.resize()` y a `setPaused('suspended', false)`.
  - Si `cityRestorePending`, abre la celebración (en la Tarea 14).
- **`webglcontextlost`:**
  - con la ciudad suspendida → `CD.lost = true`;
  - si no → `cityFallback('lost')`.
- **`cityTick(dt)`**, que llama el mundo:
  - no hace nada con hoja abierta, pausa, aviso de girar o ciudad suspendida;
  - `CityInput.intent` → `CityMove.step` (con `safe` = la última posición válida) → `cam.yaw` y `cam.pitch` con `consumeCamera()` (pitch entre −35° y 10°) → `CityMove.cameraArm`;
  - **re-centrado:** al moverse, el yaw de la cámara se acerca al del héroe a 90 °/s, salvo con `reducedMotion`;
  - **correr:** `run = levelOf(S.xp) >= 5 && S.city.run && intent.run`;
  - `consumeAction()` → la acción del interactuable más cercano; `consumePause()` → pausa o cierra la hoja;
  - guarda `S.city.at` cada 5 s.
- **Área segura:** un elemento de medición `<div id="city-safe" style="position:fixed;left:0;bottom:0;padding-left:env(safe-area-inset-left);padding-bottom:env(safe-area-inset-bottom);visibility:hidden">`; `safe()` lee su `getComputedStyle`.
- **HUD:**
  - `#city-pause` ("Pausa", ≥ 44 px, `env(safe-area-inset-*)`), rango, XP, `#city-restore` (porcentaje) y una flecha más `#city-obj`;
  - `#city-obj` muestra "{label} · {Math.round(m)} m" con `textContent`; `#city-live` (`aria-live="polite"`) anuncia **solo cuando cambia el `id` del objetivo** y al entrar ("Plaza central" o "Taller Comunal");
  - `#city-act`: acción contextual con `textContent`, solo visible con un interactuable a ≤ 2.2 m;
  - "Correr" (desde el nivel 5) alterna `S.city.run` y lo guarda.
- **Pausa:** `role="dialog"`, `aria-modal="true"` e `inert` en `#city-ui-main`. Opciones:
  - **Ir al objetivo:** abre la hoja o acción del objetivo.
  - **Lugares cercanos:** una lista de `<button>` con nombre y distancia, de `CityMove.within(hero, interactuables, 15)`. Cada botón abre la misma hoja o acción que si estuvieras junto a ese lugar.
  - **Lecciones vistas**, **Repaso**, **Tu héroe** y **Salir al inicio**.
- **Hojas (`cityOpenSheet(html, focusSel)` y `cityCloseSheet()`):**
  - foco al selector y `scrollIntoView` del elemento enfocado;
  - al cerrar, el foco vuelve a `#city-act`, o a `#city-pause` si no hay acción;
  - guarda `S.city` al abrir;
  - pausa el mundo con `setPaused('sheet')`.
- **Aviso de girar:** `matchMedia('(orientation: landscape) and (max-height: 499px) and (pointer: coarse)')`, con el patrón protegido (si no existe `matchMedia`, nunca se activa).
  - Al activarse: `#city-rotate` visible, `setPaused('rotate', true)` e `inert` en `#city-ui-main`.
  - La laptop (`pointer: fine`) nunca lo ve.
- **Estados:**
  - "Tu equipo no puede mostrar la ciudad 3D." → "Ir a los módulos" (`go('module', { mod: 'M02' })`) y "Volver" (`go('home')`).
  - "Se perdió la vista 3D." → "Reintentar" (`cityStop(); cityStart()`, en el `S.city.at` guardado) y "Salir".
- **`visibilitychange`:** en el mismo listener que ya existe (engine.html ~1505), agrega `if (CD && CD.world) CD.world.setPaused('hidden', document.hidden);`.
- **Ganchos de prueba,** solo si `window.__CITY_TEST__ === true`:
  - `window.__CITY_TEST_API__ = { teleport(x, z), objective() }`, para mover al héroe y leer el objetivo.

**`render()` en el motor:**
```
var keepCity = V.name === 'city' || ((V.name === 'play' || V.name === 'results') && R && R.cfg && R.cfg.back && R.cfg.back.name === 'city');
if (!keepCity) cityStop(); else if (V.name !== 'city') citySuspend();
… app.innerHTML = h …
if (V.name === 'city') { if (CD && CD.suspended) cityResume(); else cityStart(); }
```

**CSS:**
- `#city-root` fijo a `100dvh`, con `touch-action:none`, `overscroll-behavior:none` y `z-index:50`;
- `body.city-on{overflow:hidden}`;
- `#city-ui-main{pointer-events:none}` con sus hijos en `auto`;
- `#city-rotate` cubre toda la pantalla;
- `#city-sheet` con `max-height:50dvh` y `@media (orientation:landscape) and (min-height:500px){max-height:85dvh}` (tablets y laptop).
- La laptop se ve en horizontal normal.

**Inicio:** se **agrega** una tarjeta o botón "Entrar a la ciudad" (`data-act="city"`, `go('city')`) **sin quitar todavía** "Explora el mundo". La Tarea 9 lo reemplaza.

- [ ] **Paso 1: escribir `tests/city_engine.cjs`**, que debe fallar. En `beforeParse` se definen `__TRIP_IMPORT__`, `URL.createObjectURL`, `__CITY_TEST__ = true` y `__CITY_WORLD__` falso.
  - **El mundo falso** registra las llamadas a cada método. Su `create` guarda `opts`, y la prueba puede ejecutar `opts.tick(16)` y `opts.state()` a mano.
  - **Casos:**
    - (a) Inicio tiene `[data-act="city"]` con "Entrar a la ciudad". Al tocarlo aparece "Preparando la ciudad…" en un `role="status"`, junto con "Salir", y después se crea el mundo.
    - (a2) "Salir" durante la carga lleva a Inicio y no crea nada.
    - (b) Si el import rechaza, o si `create()` rechaza, aparece "Tu equipo no puede mostrar la ciudad 3D.". "Ir a los módulos" abre M02; "Volver" abre Inicio.
    - (c) `webglcontextlost` muestra "Se perdió la vista 3D.". "Reintentar" provoca `create` ×2 y `dispose` ×1, y la nueva posición del héroe es igual a la guardada.
    - (c2) Pérdida de contexto con la ciudad suspendida: al volver a la ciudad aparece "Se perdió la vista 3D." y no se reanuda.
    - (d) "Pausa" abre el diálogo con sus 6 opciones. "Salir al inicio" provoca `dispose` (que llama a `renderer.dispose` y `forceContextLoss` en el falso) y deja `#city-root` en `hidden` y vacío.
    - (e) **(Foco de revisión 5)** Ir 5 veces seguidas a "Tu héroe" y volver a la ciudad deja `create` ×6, `dispose` ×5 y siempre un solo `canvas` en `#city-root`.
    - (f) **(Foco de revisión 1)** Una ronda con `back:{name:'city'}`:
      - la suspende (sin `dispose`); responder varias preguntas no la reanuda ni crea otra;
      - un `resize` durante la suspensión no llama a `world.resize`;
      - "Volver a la ciudad" la reanuda (sin un `create` nuevo) y llama a `world.resize` una sola vez.
    - (g) Con un `matchMedia` falso que activa la consulta, `#city-rotate` es visible, el mundo recibe `setPaused('rotate', true)` y `#city-ui-main` queda `inert`. Con `pointer:fine` no pasa nada.
    - (h) `teleport` junto a la directora → `#city-act` dice "Hablar con Iris". E abre su hoja; Esc la cierra y el foco vuelve a `#city-act`.
    - (i) `S.city.at` se guarda al pausar. `visibilitychange` con `hidden` provoca `setPaused('hidden', true)`.
    - (j) "Lugares cercanos" después de `teleport` a la plaza → lista de botones que incluye "Iris"; al tocarlo se abre su hoja.
    - (k) `#city-obj` muestra "Habla con Iris · N m" con un número entero. `#city-live` cambia cuando cambia el objetivo, pero no al moverse 1 m.
- [ ] **Paso 2:** confirmar que falla.
- [ ] **Paso 3: implementar.**
- [ ] **Paso 4:** suite en verde. `world.cjs` sigue pasando, porque "Explora el mundo" sigue ahí.
- [ ] **Paso 5: commit** `feat(city): vista city (ciclo de vida, suspender/reanudar, estados, HUD, pausa, girar)`.

---

### Tarea 9: Retirar el mundo 2D

**Archivos:** `engine.html`, `validate.mjs`, `tests/record2.cjs`, `tests/migrate.cjs`, `tests/adv/gen.cjs` y `tests/adv/city_base_attack.cjs` (B1–B12). Borrar `tests/world.cjs` y `tests/battle.cjs`.

**Interfaces:**
- **Se elimina de `engine.html`**, junto con sus estilos (`/* Modo aventura */`, las clases `.w*` y `#wcv`):
  - el mundo: `vWorld`, `worldStart`, `worldStop`, `worldEnter`, `worldSave`, `wEl`, `MAPS`, `getMap`, `REGIONS`, `HUBPAL` y `worldFresh`;
  - el dibujo del mapa 2D: `heroSprite`, `villainSprite`, `VSPR` y `paintSprites`;
  - los mentores 2D y `MNAMES` (si ya no se usa), el diálogo del mundo, `WKEYS` y los listeners con `WD`;
  - las acciones `data-act="w"` y `data-act="world"`, y la tarjeta "Explora el mundo". La de "Entrar a la ciudad" queda como la única de modo aventura.
- **Cambios en el resto del motor:**
  - `render()` sin `worldStop()` ni `paintSprites()`;
  - `vModule` sin "Explorar esta región";
  - `fresh()` sin `world`;
  - `migrate()` hace `delete o.world` después de leer `run`;
  - `vBattleHud()` muestra vida y energía en HTML, sin canvas, con los mismos `aria-label`.
- **`validate.mjs`:**
  - quita las reglas de `vWorld`, `heroSprite`, `data-act="world"`, `villainSprite`, `var VILLAINS = [` y el recorte `VILLAINS`…`VSPR`;
  - agrega `function cityStart`, `data-act="city"` y `CITY_DATA`.

- [ ] **Paso 1: reescribir primero las pruebas afectadas**, que deben fallar contra el motor actual:
  - **`tests/record2.cjs` I6 e I7:** la batalla empieza desde la ciudad con el mundo falso (`__CITY_TEST_API__.teleport` al área de `bit` y E), contra `bit`.
    - `VT` pasa a `['M02:T01','M02:T02','M02:T03']` y se usa `s.city.beaten.bit`.
    - I6 gana con vida 0 y registra cada respuesta. I7 pierde con 3 fallos, +0 XP y sin vencido.
  - **`tests/adv/city_base_attack.cjs`:** `enterBattle` y `enterBattle2` se reescriben sobre la ciudad (mundo falso, `teleport` y E), con ids de M02 y `s.city.beaten` en B1–B12.
    - **B10:** con `S.city.beaten.bit = hoy`, el reloj adelantado 25 h (`FD`) dentro de la ciudad hace que `teleport` al área de `bit` vuelva a mostrar "Enfrentar a Bit Errante".
  - **`tests/migrate.cjs` N11 y N14:** `world` ya no existe en el guardado y `city.run` toma el valor de `world.run`.
  - **`tests/adv/gen.cjs`:** genera `city` en lugar de `world`.
  - **`tests/city_engine.cjs`:** la pantalla de M01 no tiene `[data-act="world"]` y se pinta sin errores; Inicio ya no tiene "Explora el mundo".
- [ ] **Paso 2:** confirmar que fallan.
- [ ] **Paso 3: retirar el código** y borrar `tests/world.cjs` y `tests/battle.cjs`.
- [ ] **Paso 4: verificar.** Suite en verde. `node tests/adv/city_base_attack.cjs`, `node tests/adv/attacks.cjs` y `node tests/adv/fuzz_state.cjs 320 20261111` sin ningún `FAIL`.
- [ ] **Paso 5: commit** `refactor: retirar el mundo 2D (la ciudad 3D lo reemplaza)`.

---

### Tarea 10: `city/hero3d.js`

**Archivos:** crear `city/hero3d.js` y `tests/city_hero.cjs`; modificar `build.mjs` (en `/*__CITY_VIEW_CODE__*/`).

**Interfaces:** `var CityHero.create(THREE, look, PARTS)` devuelve `{ group, setPose(speed, t), dispose() }`.
- **Cuerpo:** de cajas, cada una en su propia malla: cabeza, torso, 2 brazos, 2 piernas y la capa si `look.cape >= 1` (`cape[0]` es `'none'`).
- **Colores:** **solo `skin` y `suit` tienen `f` y `s`**; se usa `(PARTS.skin[look.skin] || PARTS.skin[0]).f` y lo mismo con `suit`.
  - Pelo: `look.hc` si cumple `hex()`; si no, `'#3b2a20'`.
  - Capa: `look.capec` si cumple `hex()`; si no, la sombra del traje (`suit.s`).
  - Todos los colores se convierten con `parseInt(hex.slice(1), 16)`; si un hex no es válido, `0x888888`.
- **Cabeza:** por `(PARTS.head[look.head] || PARTS.head[0]).k`:
  - `hair_s`: pelo corto;
  - `hair_l`: pelo largo;
  - `aviator`: gorra con gafas;
  - `antenna`: antena;
  - `crystal`: octaedro `MeshBasicMaterial` translúcido con `FrontSide`.
- **`setPose(speed, t)`:** balanceo proporcional a `speed`; con `speed` 0 queda quieto. La vista pasa `speed = 0` si hay `reducedMotion`.
- **Material:** `MeshLambertMaterial`, salvo el cristal.

- [ ] **Paso 1: escribir `tests/city_hero.cjs`**, que debe fallar. Usa Three real; `PARTS` se extrae con `html.match(/var PARTS = (\{[\s\S]*?\n  \});/)` y `vm.runInNewContext('(' + m[1] + ')')`.
  - (a) Las 5 cabezas, cada una con geometría distinta.
  - (b) Índices `999` y `-1` usan `[0]` sin lanzar.
  - (c) Con `cape: 1` y `capec: '"/><img>'`, la capa usa `suit.s`.
  - (d) `setPose(7, 0.3)` mueve las piernas; `setPose(0, t)` las deja en 0.
  - (e) `dispose()` libera todo (comprobado con espías).
  - (f) No hay `PointLight` ni `DoubleSide`.
- [ ] **Paso 2:** confirmar que falla.
- [ ] **Paso 3: implementar.**
- [ ] **Paso 4:** suite en verde.
- [ ] **Paso 5: commit** `feat(city): héroe 3D a partir del avatar`.

---

### Tarea 11: `city/world.js`, escena de carga y humo real (cierre de H1)

**Archivos:** crear `city/world.js` y `tests/city_world.cjs`; modificar `build.mjs` (en `/*__CITY_VIEW_CODE__*/`, antes de `view.js`) y `city/view.js` (usa `CityWorld` cuando no hay falso).

**Interfaces:** `var CityWorld`, con `create` según el contrato de la Tarea 8, más `buildWorld(THREE, D, opts)` → `{ scene, camera, chunks, npcs, dispose }`.
- **Cámara:** perspectiva con **FOV vertical de 70°**.
  - En vertical (`opts.portrait`): `setViewOffset` con el héroe en el tercio inferior y la cámara a la distancia del brazo.
  - En la laptop (horizontal), sin offset.
  - `setViewOffset` pisa el `aspect`: vuelve a aplicarlo con el tamaño real en cada `resize()`.
  - `camera.far = 62`.
- **Escena:**
  - fondo de color + `Fog(BG, 20, 62)`, más `HemisphereLight` y `DirectionalLight` (ningún `PointLight`);
  - suelo y calles;
  - edificios de `CityMove.layoutBuildings(M02)` fusionados **por manzana** con `Three3D.mergeBoxes` (de 4 a 9 trozos), con `MeshLambertMaterial({ vertexColors: true })`;
  - la plaza, la sede y el espejo;
  - **un `Points` por muro de La Maraña**: ≤ 60 partículas, `size` ≤ 0.12, aditivo, `depthWrite:false`, animado solo con la transformación del objeto (sin reescribir `position`);
  - letreros, la torre y el puente.
- **NPC:** directora, 23 mentores, 6 criaturas y 12 aprendices. **Una malla por NPC** (`mergeBoxes` con colores por vértice), animada solo con su transformación.
- **Un `InstancedMesh` por grupo:**
  - sombras;
  - indicadores de estrellas (la escala o el color por instancia según `flags.stars`);
  - faroles emisivos (encendidos según `flags.lit`).
- **Partículas de disolución:** un solo `Points` creado en `buildWorld` y reutilizado.
- **`dispose`:** llama a `disposeScene`, `renderer.dispose()` y `renderer.forceContextLoss()`.
- **`?fps=1`:** un `div` en `#city-root` con fps, `renderer.info.render.calls` y `triangles`. Se quita en `dispose`.

- [ ] **Paso 1: escribir `tests/city_world.cjs`**, que debe fallar. Usa Three real con renderer, raf y canvas falsos, como en `tests/scene.cjs`.
  - (a) Con todo visible: triángulos (`index ? index.count/3 : position.count/3`, multiplicado por `count` en `InstancedMesh`) ≤ 80000, y dibujables ≤ 150. Ninguna geometría con `groups.length > 0` y ningún material en arreglo.
  - (b) Cada NPC es 1 malla.
  - (c) Hay ≥ 1 `InstancedMesh` para sombras, indicadores y faroles, y 0 `PointLight`.
  - (d) Materiales: solo Lambert, Basic, Points o LineBasic; ningún `transparent && DoubleSide`.
  - (e) `camera.far` entre 55 y 70; `fog.far ≈ 62`; FOV de 70.
  - (f) Edificios en 4 a 9 mallas.
  - (g) `dispose` libera todo, con espías también sobre `renderer.dispose` y `forceContextLoss`.
  - (h) `create` resuelve. Un cuadro llama a `opts.tick` y luego a `opts.state`. Con `setPaused('sheet', true)` no se agenda ningún rAF; tras `dispose`, tampoco. Nunca hay más de un rAF pendiente.
  - (i) `resize()` con `setPaused('suspended', true)` o con un canvas de 0×0 no llama a `setSize`.
- [ ] **Paso 2:** confirmar que falla.
- [ ] **Paso 3: implementar.**
- [ ] **Paso 4: verificar.**
  - Suite en verde.
  - **Humo en Chromium** con el Playwright local (`/home/josma/dev/career-ops/node_modules/playwright-core`; el script va en el scratchpad, no en el repo), a 390×844 en vertical y en 1280×800 en horizontal, con `?fps=1`.
  - Pasos del humo: entrar, caminar 3 s, pegarse a un muro y abrir Pausa.
  - Debe cumplir `renderer.info.render.calls ≤ 150` y `triangles ≤ 80000` en cada caso, sin errores de consola. Guarda capturas.
- [ ] **Paso 5: commit** `feat(city): mundo 3D low-poly (plaza, Taller, NPC, Maraña)`.
- [ ] **Paso 6 (punto de control de H1, lo hace el usuario):** sirve el HTML y pide que lo abra en su teléfono con `?fps=1`, camine y se pegue a un muro. Anota fps y calls en el registro. **Si queda por debajo de 30 fps, detente y avisa antes de la Tarea 12.**

---

### Tarea 12: Mentores, lección y práctica (H2)

**Archivos:** `city/view.js`. Pruebas: `tests/city_engine.cjs`.

**Interfaces:**
- **Interactuables:** directora, espejo, mentores, criaturas no vencidas hoy (`beatenToday` se evalúa **en el momento**, nunca se guarda en la entidad), retos sin reparar, aprendices visibles, torre y puente. Acción a ≤ 2.2 m.
- **Mentor:**
  - `#city-act` muestra "Hablar con {nombre}".
  - La hoja Lección contiene `fmt(title)`, `fmt(summary)`, los keyPoints con `fmt` y el aviso de las 6 respuestas, más los botones "Practicar" y "Cerrar".
  - Al abrirla: agrega `M02:Txx` a `learnTopics`, llama a `checkVirtues()` y guarda.
  - "Practicar" llama a `startRound({ kind:'quiz', title:'Quiz', mid:'M02', back:{ name:'city' }, city:{ kind:'practice', id } }, itemsFor('quiz', mod('M02'), topic))`.
- **Directora:** abre el prólogo si no se ha visto; si no, muestra el objetivo.
- **Espejo:** `go('hero')`.
- **Pausa → Lecciones vistas:** lista de botones, uno por tema de M02 que esté en `learnTopics`; cada uno abre su lección.

- [ ] **Paso 1: agregar casos**, que deben fallar:
  - `teleport` a m01 → "Hablar con {nombre}". E abre la Lección con el título de T01, `learnTopics` incluye `M02:T01` y el foco queda en "Practicar".
  - "Practicar" abre la ronda con la ciudad suspendida. Al volver con "Volver a la ciudad", la posición es la misma y `topics['M02:T01']` creció.
  - Desde "Lugares cercanos", el botón de un mentor abre su Lección.
  - "Ir al objetivo" con T01 aprendido y 0 estrellas en T02 abre la Lección del mentor de T02.
  - El espejo va a "Tu héroe" y libera la ciudad.
  - Un keyPoint con `**negritas**` se muestra como `<strong>`.
- [ ] **Paso 2:** confirmar que falla.
- [ ] **Paso 3: implementar.**
- [ ] **Paso 4:** suite en verde.
- [ ] **Paso 5: commit** `feat(city): mentores con lección y práctica`.

---

### Tarea 13: Criaturas y retos de campo (H3)

**Archivos:** `city/view.js`. Pruebas: `tests/city_engine.cjs`.

**Interfaces:**
- **Criatura:**
  - `#city-act` muestra "Enfrentar a {nombre}".
  - La acción llama a `CD.world.encounter(id)` y, cuando resuelve:
    `startRound({ kind:'battle', title:'Batalla', mid:'M02', back:{ name:'city' }, villain:{ id, name, mod:'M02', topics }, city:{ kind:'battle', id } }, battleItems({ mod:'M02', topics, n:8 }))`.
  - Al volver con victoria: `world.dissolve(id)`.
- **Reto:**
  - `#city-act` muestra "Reparar {label}".
  - `startRound({ kind:'repair', title:'Reparación', mid:'M02', back:{ name:'city' }, city:{ kind:'repair', id } }, repairItems('M02', topic))`.
  - `vPlay` muestra el chip "Reparación" cuando `kind === 'repair'`. Solo se agrega ese caso a títulos y chips.

- [ ] **Paso 1: agregar casos**, que deben fallar:
  - Batalla ganada contra `bit` (vida 0): `beaten.bit = hoy`, se llama a `dissolve('bit')` y la acción ya no ofrece a `bit`. Si se pierde, no se marca nada.
  - Desde "Lugares cercanos", el botón de una criatura y el de un reto inician su ronda.
  - **(Foco de revisión 3)** Con `beaten.bit = hoy` y el reloj adelantado 25 h (`FD`) sin salir de la ciudad, la acción vuelve a ofrecer "Enfrentar a Bit Errante".
  - Reto con 2 aciertos: queda marcado en `repairs` y desaparece de "Lugares cercanos". Con un fallo sigue disponible.
- [ ] **Paso 2:** confirmar que falla.
- [ ] **Paso 3: implementar.**
- [ ] **Paso 4:** suite en verde.
- [ ] **Paso 5: commit** `feat(city): criaturas con encuentro y batalla, retos de campo`.

---

### Tarea 14: Enseñar, torre, restauración, prólogo y objetivo (H4)

**Archivos:** `city/view.js`. Pruebas: `tests/city_engine.cjs`.

**Interfaces:**
- **Aprendices:** solo los de `apprenticesAvailable`. `#city-act` muestra "Enseñar a {nombre}". Hay dos modos:
  - **`explain`:**
    - Hoja "¿Me explicas {título}?" con 6 keyPoints: 3 del tema y 3 de otros temas de M02, elegidos al azar con `Math.random`.
    - Son botones con `aria-pressed`, más un contador "N de 3" en `aria-live="polite"`. La **4.ª selección queda bloqueada** (no cambia nada). "Explicar" solo se activa con 3 elegidos.
    - **Si acierta:** `S.xp += 15`, `taught[id] = true`, `applyRestore`, `checkVirtues()` y `save()`.
    - **Si falla:** cada keyPoint ajeno se marca con el **texto** "De otro tema", además del color. "Reintentar" vuelve a sortear los 3 distractores y el orden.
  - **`correct`:** `startRound({ kind:'error', title:'Enseñar', mid:'M02', back:{ name:'city' }, city:{ kind:'teach', id } }, [una pregunta error del tema al azar])`.
- **Torre:** "Entrar a la torre".
  - Si el jefe está desbloqueado: `startRound({ kind:'boss', title:'Jefe final', mid:'M02', back:{ name:'city' }, city:{ kind:'boss', id:'torre' } }, itemsFor('boss', mod('M02')))`.
  - Si no: una hoja "Te faltan N temas" con la lista de temas en 0 estrellas.
- **Restauración:**
  - Si `cityRestorePending` (o el `changed` de "explicar") → hoja de celebración (Planos y Junior) y `cityRestorePending = false`.
  - Con `flags.restored`, el mundo retira La Maraña y muestra el puente.
  - "Cruzar el puente" abre "Próximamente" y fija `S.city.bridgeSeen = true`. El objetivo pasa a "Capítulo completo".
- **Prólogo:** 3 paneles con "Siguiente" y "Saltar". Al terminar, `S.city.prologue = true`.
- **Objetivo:**
  - Cuando cambia el estado: `nextObjective` → `#city-obj` y la flecha.
  - `#city-live` anuncia solo si cambió el `id`.
  - "Ir al objetivo" abre directamente su hoja o acción.

- [ ] **Paso 1: agregar casos**, que deben fallar:
  - **Aparición de aprendices:** sin estrellas en T05 no aparece el aprendiz de T05; con 1 estrella, sí.
  - **`explain`:**
    - con 3 correctos, +15 XP y `taught`;
    - con 2 elegidos, "Explicar" está desactivado;
    - una 4.ª selección no cambia `aria-pressed` y el contador sigue en "3 de 3";
    - al fallar, aparece "De otro tema" en los ajenos;
    - con `Math.random` sembrado, "Reintentar" cambia el **conjunto** de los 6.
  - **`correct`:** si acierta, queda en `taught` y la pregunta se registra en `qs`.
  - **Torre bloqueada:** muestra "Te faltan".
  - **Restauración:** con el jefe aprobado y 7 enseñados, enseñar al 8.º muestra la celebración y deja `restored.M02`, `powers.planos` y "Junior" en el HUD.
  - **Jefe aprobado al final:** con 8 enseñados, aprobar el jefe desde la torre muestra la celebración al volver a la ciudad.
  - **Puente:** después de "Cruzar el puente", el objetivo es "Capítulo completo".
  - **Prólogo:** aparece una sola vez; "Saltar" lo marca como visto.
  - **(Foco de revisión 2)** Un guardado con 8 ids basura en `taught`, `powers.planos` y sin jefe muestra "Becario" y el puente cerrado.
  - **Nombre malicioso:** con el nombre del héroe `<img id=pwn src=x>` no aparece `#pwn` en el HUD ni en las hojas.
- [ ] **Paso 2:** confirmar que falla.
- [ ] **Paso 3: implementar.**
- [ ] **Paso 4:** suite en verde.
- [ ] **Paso 5: commit** `feat(city): enseñar, torre, restauración, prólogo y objetivo`.

---

### Tarea 15: Fuzzing de la ciudad, verificación final y documentación

**Archivos:** crear `tests/adv/city_fuzz.cjs`; modificar `README.md`.

- [ ] **Paso 1: escribir `tests/adv/city_fuzz.cjs`** con el patrón de `trip_fuzz.cjs` (workers y perro guardián).
  - **Sesiones:** de 20 a 60 eventos al azar entre:
    - movimiento, Q/Z, E/Enter y Esc;
    - `teleport` a interactuables;
    - hojas y rondas respondidas al azar;
    - Pausa y sus opciones;
    - salir y entrar;
    - `resize`, `visibilitychange`, `webglcontextlost` y `matchMedia` de girar.
  - **Invariantes:**
    - ningún error de consola;
    - si `V.name` no es `city` ni una ronda que vuelve a la ciudad, `#city-root` está en `hidden` y vacío;
    - como mucho un mundo vivo;
    - `S.city.at` es finito y está dentro de `bounds` (menos el radio);
    - el guardado es JSON válido;
    - `restored.M02` implica jefe aprobado y 8 enseñados válidos.
- [ ] **Paso 2: verificar.**
  - Suite en verde.
  - `node tests/adv/city_fuzz.cjs 150 20261111` → 0 fallos y 0 cuelgues.
  - `city_base_attack.cjs`, `plan_city_oracle.cjs`, `attacks.cjs`, `props.cjs 240 777` y `fuzz_state.cjs 320 20261111` sin fallos.
  - Humo en Chromium del capítulo completo, en vertical (390×844) y en horizontal (1280×800).
- [ ] **Paso 3:** agregar una sección corta en `README.md`: cómo entrar a Ciudad Núcleo, los archivos `city/*` y `three/shared.js`, y las pruebas.
- [ ] **Paso 4: commit** `test(city): fuzzing de la ciudad y documentación`.
- [ ] **Paso 5: lista manual para el usuario.**
  - En el teléfono, en vertical: joystick y cámara con dos dedos, gestos del sistema, aviso de girar, y salir y entrar 5 veces.
  - En la laptop, en horizontal: teclado (WASD, Q/Z, E y Esc).
  - Jugar el capítulo completo.
