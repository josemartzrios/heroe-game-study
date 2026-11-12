# Ciudad Núcleo (prólogo + capítulo 1): plan de implementación

> **Para agentes ejecutores:** SUB-SKILL OBLIGATORIA: usa superpowers:subagent-driven-development (recomendada) o superpowers:executing-plans para ejecutar este plan tarea por tarea. Los pasos usan casillas (`- [ ]`) para seguir el avance.

**Objetivo:** reemplazar el mundo 2D por una ciudad 3D en tercera persona donde tu héroe aprende, se pone a prueba y enseña, hasta restaurar el distrito de Fundamentos (M02).

**Arquitectura:**
- La lógica pura va en `city/story.js`, `city/move.js` y `city/input.js`, que se prueban con `require`.
- El 3D va en `city/world.js` y `city/hero3d.js`, que reciben `THREE` como parámetro.
- La interfaz de la ciudad va en `city/view.js`. Se inserta **dentro** de la IIFE del motor y usa sus funciones (`startRound`, `fmt`, `esc`, `S`…).
- Los datos van en `city/districts.mjs`, que se escribe como `CITY_DATA`.
- `three/shared.js` concentra lo común con el viaje (`Pauser`, `compileOrLost`, `disposeScene`, `mergeBoxes`).

**Stack:** JS vanilla (ES5 en el motor, sin `let`/`const`/flechas dentro de la IIFE). Three.js r169 ya incrustado, Node 22 y jsdom 31.

**Spec:** `docs/superpowers/specs/2026-11-11-ciudad-nucleo-design.md` (v2). **Léelo completo antes de empezar.** Las secciones §N son de ahí. **Si el plan y el spec difieren, manda el plan.** El plan añade `city/view.js` y precisa el contrato del mundo (Tarea 8).

## Restricciones globales

- Un solo HTML: `node build.mjs` genera `juego_estudio.html`. Sin recursos nuevos en tiempo de ejecución.
- No cambian el contenido de M01–M10, sus IDs, la clave `estudio_isw_v1` ni `v: 1`. No se toca nada entre los marcadores `// === MODULE:Mxx START/END ===`.
- Exámenes con las reglas actuales: estrellas (`starsOf` pide ≥ 6 respuestas), repaso y jefe (1 estrella por tema, 20 preguntas, 80 %).
- Todo texto de datos va a `innerHTML` solo con `esc()` o `fmt()`. El botón de acción, `#city-live` y el texto del objetivo se escriben solo con `textContent`.
- Ningún `PointLight`. Ningún material transparente con `DoubleSide`.
- Textos fijos (español de México):
  - "Entrar a la ciudad"
  - "Preparando la ciudad…"
  - "Tu equipo no puede mostrar la ciudad 3D."
  - "Ir a los módulos"
  - "Volver"
  - "Se perdió la vista 3D."
  - "Reintentar"
  - "Salir"
  - "Pausa"
  - "Gira tu teléfono a vertical"
  - "Ir al objetivo"
  - "Lugares cercanos"
  - "Lecciones vistas"
  - "Repaso"
  - "Tu héroe"
  - "Salir al inicio"
  - "Volver a la ciudad"
  - "Practicar"
  - "Cerrar"
  - "Para la primera estrella hacen falta al menos 6 respuestas"
  - "¿Me explicas {título}?"
  - "Explicar"
  - "N de 3"
  - "Reparación"
  - "Batalla"
  - "Próximamente"
- **Suite** (el "verde" de cada tarea; córrela con timeout de 600000 ms):
  `cd /home/josma/myprojects/juego && node build.mjs && node validate.mjs && for f in tests/*.cjs tests/adv/attacks.cjs; do node "$f" >/dev/null 2>&1 || echo "FALLO $f"; done; echo FIN`
  Se espera `OK`, `VALIDACIÓN OK` y `FIN`, sin ninguna línea `FALLO`.
- Commits en `feat/ciudad-3d`. Cada mensaje termina con `Co-Authored-By: <modelo> <noreply@anthropic.com>`.
- Copia funciones auxiliares de `tests/record.cjs` o `tests/trip_engine.cjs`; **no hagas `require`** de esos archivos, porque ejecutan su suite.

## Foco de revisión

1. **Volver de una ronda con el teléfono girado:** la ciudad suspendida debe reanudar con el tamaño correcto, sin quedar en 1×1. → Tarea 8.
2. **Guardado con `__proto__`, ids desconocidos, `at` con `1e308` o NaN:** debe arrancar en la plaza, sin progreso falso. → Tareas 1 y 4.
3. **Cruzar la medianoche dentro de la ciudad:** la criatura de ayer vuelve sin salir. → Tarea 12.
4. **Dos dedos a la vez** (caminar y girar la cámara) y un dedo que se suelta fuera de la pantalla: nada se queda pegado. → Tarea 6.
5. **Salir de la ciudad hacia "Tu héroe" por el espejo o el menú:** se libera WebGL y al volver se monta de nuevo una sola escena. → Tarea 8.

---

### Tarea 1: Cerrar el bypass con `__proto__` en `migrate()`

**Archivos:** modificar `engine.html` (`migrate`, `plainObj`, ~línea 489-540). Pruebas: `tests/migrate.cjs` (agregar casos).

**Interfaces:**
- Produce `plainObj(x)`: verdadero solo si `x` es un objeto no nulo, no es arreglo y `Object.getPrototypeOf(x) === Object.prototype`.
- `hero.look` se reconstruye en un objeto **nuevo**:
  - por cada slot de `PARTS` (`skin`, `suit`, `head`, `eyes`, `emblem`, `cape`, `hand`), un entero ≥ 0 si existe como clave propia, o el valor fresco si no;
  - más `hc` y `capec` solo si son claves propias que cumplen `hex()`.
  - Sin `Object.assign` con datos guardados.

- [ ] **Paso 1: agregar casos a `tests/migrate.cjs`, que deben fallar.** Usa su helper `norm1`.
  - (N16) `{ hero: { name: 'Zed', welcomed: true, look: JSON.parse('{"skin":1,"__proto__":{"capec":"\\"/><img id=pwn src=x>"}}') } }`: el guardado `out.hero.look` no tiene `capec` y `Object.getPrototypeOf(out.hero.look) === Object.prototype`. Además, en el DOM no existe `#pwn` después de abrir "Tu héroe".
  - (N17) `look: { skin: 2, constructor: { x: 1 }, extra: 'z' }`: el guardado solo tiene las claves de los slots, con `skin === 2`.
- [ ] **Paso 2:** `node tests/migrate.cjs` → N16 y N17 fallan.
- [ ] **Paso 3: implementar** lo descrito en Interfaces.
- [ ] **Paso 4:** suite verde.
- [ ] **Paso 5: commit.** Mensaje: `fix: hero.look reconstruido con lista blanca (cierra bypass __proto__)`.

---

### Tarea 2: `three/shared.js` (compartido por el viaje y la ciudad)

**Archivos:** crear `three/shared.js` y `tests/three_shared.cjs`. Modificar `trip/scene.js` y `build.mjs`.

**Interfaces:**
- Produce `var Three3D = (function(){…return { Pauser, compileOrLost, disposeScene, mergeBoxes };})(); if (typeof module !== 'undefined' && module.exports) module.exports = Three3D;`:
  - `Pauser()` → `{ set(reason, on), running(), tick(ts) }`. Se **mueve sin cambios** desde `trip/scene.js`.
  - `compileOrLost(renderer, scene, camera, canvas)` → `Promise`. Es `Promise.race` entre `renderer.compileAsync` (o `compile`) y el evento `webglcontextlost` del canvas. Rechaza si se pierde el contexto y siempre quita su listener.
  - `disposeScene(scene)` libera cada geometría y material único (con `Set`) que encuentre con `traverse`.
  - `mergeBoxes(THREE, parts)` → `BufferGeometry` indexada con `position`, `normal` y `color`. `parts` es `[{ w, h, d, x, y, z, color: 0xRRGGBB, rotY? }]`. Hace la fusión propia de varias `BoxGeometry`, sin `uv`.
- `trip/scene.js` usa `Three3D.Pauser`, `Three3D.compileOrLost` y `Three3D.disposeScene`. Sigue exportando `Pauser` como alias (`Pauser: Three3D.Pauser`) para que `tests/scene.cjs` no cambie.
- `build.mjs` inserta `three/shared.js` **antes** de `flow.js` en `/*__TRIP_CODE__*/`. `tests/scene.cjs` y `scene_extra.cjs` hacen `require('../three/shared.js')` vía `global.Three3D` si hace falta.

- [ ] **Paso 1: escribir `tests/three_shared.cjs`, que debe fallar.** Usa Three real (`vendor/three.module.min.js` con `pathToFileURL(path.join(__dirname,'..','vendor','three.module.min.js')).href`).
  - (a) Casos del `Pauser`: dos motivos; el primer `tick` tras reanudar devuelve 16; dt ≤ 50.
  - (b) `compileOrLost`: resuelve con un renderer falso cuyo `compileAsync` resuelve; rechaza si se despacha `webglcontextlost` mientras `compileAsync` no resuelve; el listener se quita en los dos casos.
  - (c) `disposeScene`: con espías en `BufferGeometry.prototype.dispose` y `Material.prototype.dispose`, libera todo una sola vez aunque se compartan.
  - (d) `mergeBoxes` con 3 cajas → 36 índices × 3 = 108; el atributo `color` existe y no hay `uv`.
- [ ] **Paso 2:** `node tests/three_shared.cjs` → `Cannot find module`.
- [ ] **Paso 3: implementar y refactorizar** `trip/scene.js`. En `trip/scene.js`, `require` no aplica; en el HTML, `Three3D` es global dentro de la IIFE. Para las pruebas en Node, `scene.js` hace `var Three3D = (typeof Three3D !== 'undefined') ? Three3D : require('../three/shared.js');` dentro de su IIFE.
- [ ] **Paso 4:** suite verde; `scene`, `scene_extra`, `trip_engine` y `trip` sin cambios. `node tests/adv/trip_props.cjs 300 20261111` sin ningún FAIL.
- [ ] **Paso 5: commit.** Mensaje: `refactor: three/shared.js común (Pauser, compileOrLost, disposeScene, mergeBoxes)`.

---

### Tarea 3: `city/districts.mjs`, `CITY_DATA` y validación

**Archivos:** crear `city/districts.mjs`. Modificar `build.mjs`, `validate.mjs` y `engine.html` (ancla).

**Interfaces:** produce `export const city`, escrita como `var CITY_DATA = <JSON>;` en la ancla nueva `/*__CITY__*/` (dentro de la IIFE, después de `/*__TRIP__*/`):
```
{ ranks: [[0,'Becario'],[1,'Junior'],[3,'Semi-senior'],[6,'Senior'],[8,'Arquitecto'],[11,'Tech Lead']],
  bounds: { minX:-70, maxX:70, minZ:-190, maxZ:40 },
  spawn: { x:0, z:8, yaw:0 },                       // yaw 0 mira hacia -z (norte)
  plaza: { r:30, director:{ id:'iris', name:'Iris', x:-6, z:-4 }, mirror:{ id:'espejo', x:6, z:-4 },
           roads: [{ dist:'M04', angle:… , wall:{ x, z } }, …10 más] },   // 10 muros a r=38; el norte (M02) no tiene muro
  districts: { M02: { name:'Taller Comunal', seed:7, rect:{ minX:-60, maxX:60, minZ:-170, maxZ:-50 },
     blocks: [[x,z], …16 centros: x∈{-42,-14,14,42}, z∈{-66,-94,-122,-150}],
     mentors:   [{ id:'m01', topic:'T01', name:'…', x, z }, … 23],
     creatures: [{ id:'bit', name:'Bit Errante', topics:['T01','T02','T03'], area:{ x, z, r:6 } }, … 6, la tabla de §3.2],
     repairs:   [{ id:'r01', topic:'T01', label:'semáforo', x, z }, … 10, temas de §3.2],
     apprentices:[{ id:'a01', topic:'T??', name:'…', mode:'explain'|'correct', x, z }, … 12],
     tower: { id:'torre', x:0, z:-162 }, bridge: { id:'puente', x:0, z:-176, to:'M04' }, need: 8 } },
  villainsM01: [ …copia exacta de VILLAINS de engine.html:1820, con mod/topics… ] }
```
- Hay 23 nombres de mentor únicos y 12 de aprendiz únicos que no se repiten con los mentores. Son nombres de pila comunes, sin personas reales famosas.
- Los `id` cumplen `/^[a-z0-9_-]+$/`.
- Las posiciones las eliges tú, siempre dentro de `rect` (o del círculo de la plaza), sobre calles. `validate.mjs` comprueba que no quedan dentro de edificios usando `CityMove.layoutBuildings` (Tarea 5). Hasta entonces, valida solo los límites.

- [ ] **Paso 1: escribir primero en `validate.mjs` las reglas de §9 (spec), que deben fallar.**
  - Extrae `var CITY_DATA = ({[\s\S]*?});` con `vm.runInNewContext`.
  - Mentores: 23, temas T01–T23 sin repetir, nombres únicos.
  - Criaturas: 6, cubren cada tema una vez, cada una con ≥ 8 preguntas mcq+tf (se cuentan con `MODULES`), sin palabras prohibidas.
  - Retos: 10, temas distintos, cada uno con ≥ 2 preguntas scenario+error.
  - Aprendices: 12, temas distintos; los de `correct` con ≥ 1 pregunta `error`; nombres que no chocan con los mentores; `need === 8`.
  - Ids seguros: no son `__proto__`, `constructor`, `prototype` ni ningún nombre de `Object.getOwnPropertyNames(Object.prototype)`.
  - `ranks` igual a la tabla. `villainsM01` cubre T01–T19 de M01 exactamente una vez.
  - Todas las posiciones dentro de `bounds`, y las de M02 dentro de `rect`. La distancia entre interactuables es ≥ 4 m.
- [ ] **Paso 2:** `node build.mjs && node validate.mjs` → "Falta CITY_DATA".
- [ ] **Paso 3: implementar.** Crea `city/districts.mjs`. En `engine.html`, agrega `/*__CITY__*/` en una línea propia justo después de la línea `/*__TRIP__*/`. En `build.mjs`:
  - `import { city } from './city/districts.mjs'`;
  - `out = out.replace('/*__CITY__*/', () => 'var CITY_DATA = ' + JSON.stringify(city) + ';\n  /*__CITY_CODE__*/')`;
  - lanza un error si falta el ancla;
  - antes de escribir, quita las anclas `/*__CITY_CODE__*/` que queden.
- [ ] **Paso 4:** suite verde.
- [ ] **Paso 5: commit.** Mensaje: `feat(city): datos del capítulo 1 y validación`.

---

### Tarea 4: `city/story.js` (lógica pura)

**Archivos:** crear `city/story.js` y `tests/city_story.cjs`. Modificar `build.mjs` (insertar en `/*__CITY_CODE__*/`).

**Interfaces:** produce `var CityStory = (function(){…})(); module.exports` (protegido). Los tipos: `D = CITY_DATA`, `C = S.city`.
- `normalizeCity(raw, D, bossPassed)` → `C` nuevo según §6.4:
  - listas blancas por id de `D.districts.M02`, comprobadas con `Object.prototype.hasOwnProperty.call`;
  - `beaten` con fechas `YYYY-MM-DD`;
  - `repairs` y `taught` con `true`;
  - `prologue` y `run` booleanos;
  - `at` con `CityMove.coord` (si `CityMove` no existe todavía en Node, implementa aquí un `coord` local con el mismo contrato que la Tarea 5);
  - `restored` y `powers` **recalculados**: `M02` restaurado si `bossPassed && taughtCount(C, D) >= D.districts.M02.need`.
- `taughtCount(C, D)` → número de ids de aprendiz de M02 con `C.taught[id] === true`.
- `restoration(C, D, bossPassed)` → entero de 0 a 100, con `round(100 × (0.5 × min(t,8)/8 + 0.5 × bossPassed))`.
- `isRestored(C, D, bossPassed)` → booleano.
- `applyRestore(C, D, bossPassed)` → `{ changed }`. Si se cumple y no estaba, pone `restored.M02` y `powers.planos`.
- `rankOf(C, D)` → nombre según `D.ranks` y el número de distritos restaurados.
- `apprenticesAvailable(C, D, starsOf)` → arreglo de aprendices no enseñados con `starsOf(topic) >= 1`. `starsOf` es una función que se le pasa.
- `nextObjective(C, D, ctx)` → `{ kind, id, label }`, con el orden exacto de §3.5. `ctx` es `{ learned(topic), stars(topic), beatenEver(id), beatenToday(id), bossUnlocked, bossPassed }`.
  - `kind ∈ 'director'|'bridge'|'tower'|'mentor'|'practice'|'creature'|'repair'|'apprentice'|'none'`.
  - `label`: "Habla con {nombre}", "Practica {título corto}" (usa el nombre del mentor), "Enfrenta a {criatura}", "Repara el {label}", "Enseña a {nombre}", "Entra a la torre", "Cruza el puente".
  - Para "nunca vencida", `ctx.beatenEver(id)` es verdadero si la criatura existe en `C.beaten`.

- [ ] **Paso 1: escribir `tests/city_story.cjs`, que debe fallar.** Carga `D` desde `city/districts.mjs` (`await import`).
  - `normalizeCity`:
    - `JSON.parse('{"taught":{"__proto__":{"a01":true},"constructor":true,"a01":true,"zz":true}}')` → `taught` solo `{ a01: true }` con prototipo `Object.prototype`;
    - `at: { x: 1e308, z: NaN }` → el spawn;
    - `at` dentro de un edificio → el spawn (solo después de la Tarea 5; márcalo con un comentario y agrégalo en la Tarea 5);
    - `powers: { planos: true }` sin jefe → `powers` vacío;
    - con 8 enseñados y `bossPassed` → `restored.M02` y `powers.planos`.
  - `restoration`: 0, 50 (8 enseñados sin jefe), 50 (jefe sin enseñados) y 100.
  - `rankOf`: 0 restaurados → "Becario"; 1 → "Junior".
  - `nextObjective`, en orden:
    - prólogo sin ver → `director`;
    - restaurado → `bridge`;
    - jefe desbloqueado y no aprobado → `tower`;
    - nada aprendido → `mentor m01` con label "Habla con {nombre de m01}";
    - T01–T03 aprendidos con 0 estrellas en T02 → `practice` del mentor de T02;
    - grupo 1 completo con estrellas y `bit` nunca vencido → `creature bit`;
    - todos los grupos completos → `repair`, luego `apprentice`, luego `creature` no vencida hoy, luego `none`.
  - `apprenticesAvailable` filtra por estrellas y por ya enseñados.
- [ ] **Paso 2:** falla con `Cannot find module`.
- [ ] **Paso 3: implementar** y agregar la inserción en `build.mjs` (`city/story.js` en `/*__CITY_CODE__*/`).
- [ ] **Paso 4:** `node tests/city_story.cjs` y suite verde.
- [ ] **Paso 5: commit.** Mensaje: `feat(city): story.js (restauración, rangos, objetivo, normalización)`.

---

### Tarea 5: `city/move.js` (matemática pura)

**Archivos:** crear `city/move.js` y `tests/city_move.cjs`. Modificar `build.mjs`, y `validate.mjs` (las posiciones no pueden estar dentro de edificios).

**Interfaces:** produce `var CityMove`, con estas funciones:
- `coord(v, min, max, fallback)` → `v` acotado si es finito, o `fallback`.
- `layoutBuildings(district)` → `[{ x, z, w, d, h, color }]`, determinista:
  - `mulberry32(district.seed)`, la misma función que `tests/trip.cjs`;
  - 2 o 3 edificios por manzana de `district.blocks`;
  - `w`, `d` de 5 a 9 y `h` de 4 a 14, dentro de una manzana de 20 × 20 alrededor del centro;
  - `color`, índice 0-5 de una paleta del distrito.
- `boxesFor(D)` → AABB `[{ minX, maxX, minZ, maxZ }]`: edificios de M02, la torre (8×8), los 10 muros de la plaza (6×2 orientados de forma aproximada como AABB), el puente cerrado mientras `!restored` y el borde de `bounds`.
- `step(state, intent, dt, boxes, opts)` → nuevo `{ x, z, yaw, vx, vz, speed }`:
  - velocidad 4 m/s caminando y 7 m/s corriendo (`intent.run` y `opts.canRun`);
  - aceleración hacia el objetivo en 0.15 s;
  - movimiento relativo al `camYaw` (`intent.mx`, `intent.mz` en [−1, 1]);
  - círculo de 0.4 m resuelto contra `boxes` por eje (primero X, luego Z);
  - si algo sale no finito, devuelve el `state` anterior.
- `cameraArm(target, yaw, pitch, len, boxes)` → largo ≤ `len` (rayo contra AABB en XZ más altura; mínimo 1.2 m).
- `nearest(pos, items, maxDist)` → el item más cercano con `dist ≤ maxDist`, o `null`. `items` son `[{ id, kind, x, z }]`.
- `within(pos, items, r)` → items a ≤ r, ordenados por distancia.

- [ ] **Paso 1: escribir `tests/city_move.cjs`, que debe fallar.**
  - `coord`: 1e308 → max, NaN → fallback, −5 dentro del rango → −5.
  - `layoutBuildings` es igual dos veces con la misma semilla; 32 a 48 edificios; ninguno sale de su manzana.
  - `step`:
    - avanzar hacia un muro no lo atraviesa (`x` se queda a ≥ 0.4 del borde);
    - en diagonal contra una esquina desliza por el eje libre;
    - acelera en ~0.15 s;
    - corre solo con `canRun`;
    - con `dt` NaN devuelve el estado previo.
  - `cameraArm`: sin cajas → `len`; con una caja en medio → menor que `len` y ≥ 1.2.
  - `nearest` y `within` ordenan y filtran por distancia.
- [ ] **Paso 2:** falla.
- [ ] **Paso 3: implementar.** Inserta en `build.mjs` (antes de `story.js`). En `validate.mjs`, con `layoutBuildings(M02)`, ningún interactuable queda dentro de un edificio con margen de 0.6 m. Agrega a `tests/city_story.cjs` el caso pendiente: `at` dentro de un edificio → spawn.
- [ ] **Paso 4:** suite verde.
- [ ] **Paso 5: commit.** Mensaje: `feat(city): move.js (movimiento, colisiones, cámara, cercanos)`.

---

### Tarea 6: `city/input.js` (táctil y teclado)

**Archivos:** crear `city/input.js` y `tests/city_input.cjs`. Modificar `build.mjs`.

**Interfaces:** produce `var CityInput`, con `create(root, opts)` → `{ intent(), consumeCamera(), dispose() }`:
- `opts = { safeLeft, safeBottom, isFree(el) }`. `isFree(el)` es verdadero si el toque no cayó sobre el HUD, un botón o la hoja.
- **Zonas por `pointerId`:** un `pointerdown` en el cuarto inferior izquierdo (x < 50 % del ancho, y > 75 % del alto, fuera del margen `safe* + 16`) crea un joystick con origen ahí. Otro dedo en zona libre gira la cámara. Cada dedo conserva su zona hasta `pointerup` o `pointercancel` (también si se suelta fuera, con `setPointerCapture`).
- `intent()` → `{ mx, mz, mag, run }`:
  - joystick con radio de 48 px y `mag` en [0, 1];
  - `run` verdadero si `mag ≥ 0.7`;
  - teclado: WASD y flechas dan mx/mz, Shift da `run`.
- `consumeCamera()` → `{ yaw, pitch }` en grados, acumulados desde la última llamada: arrastre × 0.25 °/px, y Q/Z ±90 °/s mientras están presionadas (con dt interno).
- `root` lleva `touch-action:none` (lo pone el CSS de la Tarea 8).

- [ ] **Paso 1: escribir `tests/city_input.cjs` (jsdom mínimo con un `div` raíz de 390×844 simulado), que debe fallar.**
  - (a) Un dedo abajo a la izquierda que se mueve 48 px a la derecha da `mx ≈ 1`, `mag ≈ 1` y `run` verdadero.
  - (b) Un dedo en zona libre que arrastra 40 px da `yaw` de 10.
  - (c) **(Foco de revisión 4)** Dos dedos a la vez (joystick y cámara) funcionan juntos. Si el dedo del joystick termina con `pointercancel`, `intent()` vuelve a 0.
  - (d) Un toque sobre un elemento no libre (`isFree` falso) no crea nada.
  - (e) Un toque en el margen izquierdo de 16 px no crea el joystick.
  - (f) W más Shift da `mz = −1` y `run`; Q mantenida 0.5 s da `yaw ≈ −45`.
  - (g) Después de `dispose()`, los eventos no tienen efecto.
- [ ] **Paso 2:** falla.
- [ ] **Paso 3: implementar** e insertar en `build.mjs`.
- [ ] **Paso 4:** suite verde.
- [ ] **Paso 5: commit.** Mensaje: `feat(city): input.js (joystick por pointerId, cámara, teclado)`.

---

### Tarea 7: Batalla y rondas que vuelven a la ciudad (motor)

**Archivos:** modificar `engine.html` (`battleItems`, `next`, `finish`, `beatenToday`, `fresh`, `migrate`, `vResults`, `goBack`). Pruebas: `tests/record2.cjs` (I6 e I7) y `tests/adv/city_base_attack.cjs` (B7 debe pasar, sin modificarlo).

**Interfaces:**
- `battleItems(v)` con `v = { mod, topics, n }`. Pool mcq+tf de esos temas, barajado y sin repetir; devuelve los primeros `n` (8) y guarda el resto en `R.battlePool` (lo asigna `startRound` si `cfg.villain`).
- `next()`: si `R.battle` y `!battleOver()` y `R.i + 1 >= R.items.length` y `R.battlePool.length`, agrega una pregunta del pool a `R.items` **antes** de avanzar.
- `finish()`:
  - `R.won = R.battle.hp <= 0`; **se elimina la victoria por puntos**;
  - después, `cityResolve()` si `R.cfg.city`: `battle` → `S.city.beaten[id] = today()` si `R.won`; `repair` → `S.city.repairs[id] = true` si `R.ok === 2 && R.assisted === 0`; `teach` → `S.city.taught[id] = true` si `R.ok === 1`;
  - luego `CityStory.applyRestore(S.city, CITY_DATA, !!(S.boss.M02 && S.boss.M02.passed))`;
  - todo **antes** de `save()`.
- `beatenToday(id)` → `S.city.beaten[id] === today()`. Se elimina `S.world.beaten`.
- `fresh()` incluye `city: CityStory.normalizeCity({}, CITY_DATA, false)`. Mientras exista el mundo 2D, `world` sigue (lo quita la Tarea 9).
- `migrate()`: `o.city = CityStory.normalizeCity(o.city, CITY_DATA, bossPassed)`; si `o.world` existe y `o.world.run` es booleano, `o.city.run = o.world.run`.
- `repairItems(mod, tid)` → 2 preguntas barajadas del pool scenario+error del tema.
- `vResults`: el botón de vuelta dice "Volver a la ciudad" si `R.cfg.back.name === 'city'`. `goBack()` va a `{ name: 'city' }`.
- `vBattleHud()` sigue igual en esta tarea (los sprites los quita la Tarea 9).

- [ ] **Paso 1: escribir las pruebas que deben fallar.**
  - `node tests/adv/city_base_attack.cjs` → B7 falla hoy (victoria por puntos).
  - En `tests/record2.cjs` I6 e I7, con la batalla iniciada todavía desde el mundo 2D:
    - el vencido pasa a `s.city.beaten.cuello`;
    - I6 termina con "¡Victoria!" **y la vida del villano en 0**, conservando el registro de progreso por respuesta (S.topics, S.qs, S.xp);
    - I7 exige que `cuello` no quede vencido;
    - quita las aserciones que dependan de exactamente 6 preguntas y agrega "la ronda llega a vida 0 o energía 0".
  - Agrega `tests/city_rounds.cjs` (jsdom) con el gancho `window.__CITY_ROUND__` (definido solo si existe `window.__CITY_TEST__`, ver Paso 3), que expone `startRound`, `battleItems` y `repairItems`:
    - una batalla de M02 `bit` con `n: 8` y política "fallar solo con escudo" nunca termina con vida > 0 y "¡Victoria!";
    - `repairItems('M02','T15')` da 2 preguntas scenario/error del tema;
    - una reparación con 2 aciertos marca `repairs.r??` y con 1 acierto no;
    - con láser (asistido) no marca nada;
    - `vResults` con `back:{name:'city'}` muestra "Volver a la ciudad".
- [ ] **Paso 2:** confirma que fallan.
- [ ] **Paso 3: implementar.** El gancho de prueba solo se crea si `window.__CITY_TEST__ === true`, que las pruebas ponen en `beforeParse`: `if (window.__CITY_TEST__ === true) window.__CITY_ROUND__ = { startRound: startRound, battleItems: battleItems, repairItems: repairItems };`.
- [ ] **Paso 4:** suite verde y B7 pasa. B10 sigue fallando hasta la Tarea 9, donde se reescribe porque prueba el mundo 2D.
- [ ] **Paso 5: commit.** Mensaje: `feat(city): batalla hasta vida/energía 0, rondas con cfg.city, S.city en migrate`.

---

### Tarea 8: Vista `city`: ciclo de vida, suspender y reanudar, estados, HUD y pausa (con mundo falso)

**Archivos:** crear `city/view.js` (dentro de la IIFE, en `/*__CITY_CODE__*/` después de `input.js`) y `tests/city_engine.cjs`. Modificar `engine.html` (`render`, delegado de `#app`, CSS, `<div id="city-root" hidden></div>` después de `#trip-root`, tarjeta de Inicio) y `build.mjs`.

**Interfaces:**
- **Contrato del mundo** (lo cumplen `CityWorld` de la Tarea 11 y el falso `window.__CITY_WORLD__`): `create(THREE, canvas, D, opts)` → `Promise<api>`.
  - `opts = { reducedMotion, look, PARTS, state(), pixelRatio?, raf?, caf?, renderer? }`. `state()` devuelve `{ hero:{ x,z,yaw,speed }, cam:{ yaw,pitch,arm }, flags:{ beatenToday:{id:1}, repairs:{id:1}, taught:{id:1}, apprenticesVisible:{id:1}, restored:bool, lit:int } }`.
  - `api = { resize(), setPaused(reason, on), dispose(), encounter(id) → Promise, dissolve(id), setLook(look) }`.
  - El mundo llama a `state()` en cada cuadro dentro de su rAF, aplica los transforms y dibuja.
  - El falso se acepta solo si `typeof window.__CITY_WORLD__.create === 'function'`, y se lee una vez por `cityStart`.
- **En `view.js`:**
  - `var CD = null, cityGen = 0;` con `CD = { gen, canvas, world, input, hero, cam, sheet, paused, suspended }`.
  - `cityStart()`, `cityStop()`, `citySuspend()`, `cityResume()`, `cityTick(dt)`.
  - `cityTick(dt)` usa `CityInput` + `CityMove.step` + `CityMove.cameraArm`, guarda `S.city.at` cada 5 s y no corre si hay una hoja, una pausa o está suspendida.
    - **Correr:** `run = levelOf(S.xp) >= 5 && S.city.run && intent.run`. El botón "Correr" (visible desde el nivel 5) alterna `S.city.run` y lo guarda; Shift también corre si `S.city.run` está activo.
    - **Re-centrado:** al moverse, el yaw de la cámara se acerca al del héroe a 90 °/s, salvo con `prefers-reduced-motion` (patrón protegido de engine.html, `rm = false` sin `matchMedia`), en cuyo caso no gira sola.
    - Al entrar, `#city-live` anuncia "Taller Comunal" o "Plaza central" según la zona, con `textContent`.
  - `cityFallback(kind)` con `kind ∈ 'nowebgl'|'lost'` (textos de §5.6). "Reintentar" llama a `cityStop(); cityStart()` en la misma posición.
  - `cityOpenSheet(html, focusSel)` y `cityCloseSheet()`, con el patrón de hojas del viaje (`#city-sheet`, `scrollIntoView`, foco).
  - El HUD tiene `#city-pause` ("Pausa", ≥ 44 px), rango, XP, restauración, flecha más `#city-obj` (texto con `textContent`), `#city-act` (acción contextual, `textContent`) y "Correr" si el nivel es ≥ 5.
  - El menú de pausa trae: Ir al objetivo, Lugares cercanos (`CityMove.within(hero, interactuables, 15)`), Lecciones vistas, Repaso, Tu héroe y Salir al inicio.
  - **Gancho de prueba** (solo si `window.__CITY_TEST__ === true`): `window.__CITY_WORLD__.teleport = function (x, z) {…}` mueve al héroe y actualiza el cercano.
- **`render()`:** reemplaza la llamada actual por esta regla:
  ```
  var keepCity = V.name === 'city' || ((V.name === 'play' || V.name === 'results') && R && R.cfg && R.cfg.back && R.cfg.back.name === 'city');
  if (keepCity && V.name !== 'city') citySuspend(); else if (!keepCity) cityStop();
  ```
  Después de `app.innerHTML`: `if (V.name === 'city') { if (CD && CD.suspended) cityResume(); else cityStart(); }`.
  - Al suspender: `#city-root` va `hidden` y el `Pauser` recibe el motivo `suspended`.
  - Al reanudar: `hidden=false`, `world.resize()` y se quita `suspended`.
  - `resize()` no hace nada si el canvas mide 0 o está suspendida.
- **CSS:** `#city-root` (fijo, `100dvh`, `touch-action:none`, `overscroll-behavior:none`, `z-index:50`), `body.city-on{overflow:hidden}`, capas `#city-ui{pointer-events:none}` con hijos `auto`, y aviso de girar `#city-rotate` con `@media (orientation:landscape) and (max-height:499px) and (pointer:coarse)`.
- **Inicio:** la tarjeta "Modo aventura" muestra "Entrar a la ciudad" con `data-act="city"` → `go('city')`.

- [ ] **Paso 1: escribir `tests/city_engine.cjs`, que debe fallar** (ganchos `__TRIP_IMPORT__`, `__CITY_WORLD__` falso y `__CITY_TEST__` en `beforeParse`).
  - (a) Inicio tiene `[data-act="city"]` con "Entrar a la ciudad"; al tocarlo, `#city-root` se ve con "Preparando la ciudad…" y luego se crea el mundo falso.
  - (b) Si el import rechaza → "Tu equipo no puede mostrar la ciudad 3D." con "Ir a los módulos" y "Volver".
  - (c) `webglcontextlost` en el canvas → "Se perdió la vista 3D."; "Reintentar" crea un mundo nuevo (create 2 veces, dispose 1).
  - (d) "Pausa" abre el menú con sus 6 opciones; "Salir al inicio" libera (dispose) y deja `#city-root` `hidden` y vacío.
  - (e) **(Foco de revisión 5)** "Tu héroe" desde la pausa libera la ciudad. Al volver con "Entrar a la ciudad", create se llama otra vez y solo existe un canvas.
  - (f) **(Foco de revisión 1)** Una ronda iniciada con `__CITY_ROUND__.startRound({…, back:{name:'city'}, city:{kind:'battle', id:'bit'}}, …)` suspende (sin dispose). Un `resize` mientras está suspendida no llama a `world.resize`. "Volver a la ciudad" reanuda (sin create nuevo) y llama a `world.resize` una vez.
  - (g) El aviso de girar existe en el CSS con la media query exacta.
  - (h) Con `teleport` junto a la directora (`plaza.director`), `#city-act` dice "Hablar con Iris".
  - (i) `S.city.at` se guarda al pausar.
- [ ] **Paso 2:** falla.
- [ ] **Paso 3: implementar.**
- [ ] **Paso 4:** suite verde. `trip_engine.cjs` sigue verde, porque el viaje y la ciudad no se pisan.
- [ ] **Paso 5: commit.** Mensaje: `feat(city): vista city (ciclo de vida, suspender/reanudar, estados, HUD, pausa)`.

---

### Tarea 9: Retirar el mundo 2D

**Archivos:** modificar `engine.html`, `validate.mjs`, `tests/record2.cjs`, `tests/migrate.cjs`, `tests/adv/gen.cjs` y `tests/adv/city_base_attack.cjs` (solo B10). Borrar `tests/world.cjs` y `tests/battle.cjs`.

**Interfaces:**
- Se eliminan, con sus estilos (`/* Modo aventura */` y las clases `.w*`, `#wcv`, de engine.html:206 en adelante):
  - `vWorld`, `worldStart`, `worldStop`, `worldEnter`, `worldSave`, `wEl`, `MAPS`, `getMap`, `REGIONS`, `HUBPAL`, `worldFresh`;
  - el mapa, la cámara y el dibujo 2D, `heroSprite`, `villainSprite`, `VSPR`, `paintSprites`;
  - los mentores 2D, `MNAMES` (si nada más lo usa), el diálogo del mundo, el teclado `WKEYS` y los listeners con `WD`;
  - las acciones `data-act="w"` y `data-act="world"`.
- `render()` deja de llamar a `worldStop()` y `paintSprites()`. `vModule` pierde el botón "Explorar esta región". `fresh()` no crea `world`. `migrate()` hace `delete o.world` después de copiar `run`. `vBattleHud()` pinta vida y energía en HTML sin canvas.
- `VILLAINS` ya vive en `CITY_DATA.villainsM01` (Tarea 3). `battleItems` ya no lo usa.
- `validate.mjs` quita las reglas de engine.html relativas a `vWorld`, `heroSprite`, `data-act="world"`, `villainSprite`, `var VILLAINS = [` y el recorte `VILLAINS`…`VSPR`. Agrega `function cityStart`, `data-act="city"` y `CITY_DATA`.

- [ ] **Paso 1: reescribir primero las pruebas afectadas, que deben fallar con el motor actual.**
  - `tests/record2.cjs` I6 e I7: inician la batalla desde la ciudad con el mundo falso y `__CITY_ROUND__`, contra `bit` (M02, temas T01–T03).
    - `VT` pasa a `['M02:T01','M02:T02','M02:T03']` y el vencido a `s.city.beaten.bit`.
    - Se conserva la lógica: I6 llega a victoria con vida 0 registrando cada respuesta; I7 pierde con 3 fallos, XP +0 y `bit` sin vencer.
  - `tests/migrate.cjs` N11 y N14: comprueban que `world` ya no existe en el guardado y que `city.run` toma `world.run`.
  - `tests/adv/gen.cjs`: genera `city` en lugar de `world`.
  - `tests/adv/city_base_attack.cjs` B10: reescríbelo para la ciudad. Con `S.city.beaten.bit = hoy`, adelanta el reloj +25 h dentro de la ciudad: `CityStory.nextObjective`/`flags.beatenToday` ya no la incluyen y la acción "Enfrentar a Bit Errante" vuelve a aparecer al hacer `teleport` a su área.
  - Una prueba en `city_engine.cjs`: la pantalla de M01 se pinta sin errores y no tiene `[data-act="world"]`.
- [ ] **Paso 2:** confirma que fallan.
- [ ] **Paso 3: retirar el código** y borrar `tests/world.cjs` y `tests/battle.cjs`.
- [ ] **Paso 4:** suite verde; `node tests/adv/city_base_attack.cjs` sin ningún FAIL; `node tests/adv/attacks.cjs` y `node tests/adv/fuzz_state.cjs 320 20261111` sin fallos.
- [ ] **Paso 5: commit.** Mensaje: `refactor: retirar el mundo 2D (la ciudad 3D lo reemplaza)`.

---

### Tarea 10: `city/hero3d.js`

**Archivos:** crear `city/hero3d.js` y `tests/city_hero.cjs`. Modificar `build.mjs`.

**Interfaces:** produce `var CityHero`, con `create(THREE, look, PARTS)` → `{ group, setPose(speed, t), dispose() }`:
- Cuerpo low-poly de cajas: cabeza, torso, 2 brazos, 2 piernas y capa opcional, cada uno su malla (el héroe sí se anima).
- Colores de `PARTS[slot][look[slot]] || PARTS[slot][0]`, con `f` como color principal y `s` como sombra. Se convierten con `parseInt(hex.slice(1), 16)` solo si cumplen `/^#[0-9a-f]{6}$/i`; si no, `0x888888`.
- `look.hc` y `look.capec` reemplazan el color del pelo y de la capa si cumplen `hex()`.
- Las 5 cabezas de `PARTS.head` según el campo que identifica el estilo (`hair_s`, `hair_l`, `aviator`, `antenna`, `crystal`): pelo corto, pelo largo, gorra con gafas, antena y cristal (octaedro translúcido `FrontSide`).
- `setPose(speed, t)`: balanceo de brazos y piernas ∝ `speed` (0 = quieto).
- Material: `MeshLambertMaterial`; el cristal usa `MeshBasicMaterial` transparente `FrontSide`.

- [ ] **Paso 1: escribir `tests/city_hero.cjs` (Three real), que debe fallar.**
  - (a) Cada una de las 5 cabezas crea un grupo sin lanzar y con geometría distinta.
  - (b) Look con índices 999 o −1 → usa `PARTS[s][0]` sin lanzar.
  - (c) `capec: '"/><img>'` se ignora y queda el color del traje.
  - (d) `setPose(7, 0.3)` cambia la rotación de las piernas; `setPose(0, t)` las deja en 0.
  - (e) `dispose()` libera todas las geometrías y materiales (con espías).
  - (f) No hay `PointLight` ni `DoubleSide`.
  - `PARTS` se extrae del HTML construido con regex y `vm`, como `MODULES` en `validate.mjs`.
- [ ] **Paso 2:** falla.
- [ ] **Paso 3: implementar** e insertar en `build.mjs`.
- [ ] **Paso 4:** suite verde.
- [ ] **Paso 5: commit.** Mensaje: `feat(city): héroe 3D a partir del avatar`.

---

### Tarea 11: `city/world.js`, escena de carga y humo real (cierre del H1)

**Archivos:** crear `city/world.js` y `tests/city_world.cjs`. Modificar `build.mjs` y `city/view.js` (usar `CityWorld` cuando no hay mundo falso).

**Interfaces:** produce `var CityWorld`, con `create` según el contrato de la Tarea 8, y además `buildWorld(THREE, D, opts)` → `{ scene, camera, chunks, npcs, dispose }` para las pruebas.
- **Estilo §6 / §7:**
  - cielo en degradado (fondo `Color` más `Fog(BG, 20, 62)`) y `camera.far = 62`;
  - `HemisphereLight` y `DirectionalLight`, sin `PointLight`;
  - suelo y calles;
  - edificios de `CityMove.layoutBuildings(M02)` fusionados **por manzana** con `Three3D.mergeBoxes` (4 a 9 trozos) y `MeshLambertMaterial({ vertexColors: true })`;
  - plaza con la sede del Taller y el espejo;
  - **10 muros de La Maraña** como un solo `Points` (pocas partículas, `size` ≤ 0.12, aditivo), más letreros;
  - la torre y el puente;
  - **NPC** (directora, 23 mentores, 6 criaturas, 12 aprendices): **una malla cada uno**, con `mergeBoxes` y colores por vértice, animados solo con su transform;
  - **un `InstancedMesh` por grupo** de sombras, indicadores de estrellas y faroles (emisivos).
- Usa `Three3D.Pauser`, `compileOrLost` y `disposeScene`. El héroe viene de `CityHero.create(THREE, opts.look, opts.PARTS)`.
- En cada cuadro: `opts.state()` → transforms del héroe, la cámara (detrás de `hero` con `cam.arm`, `yaw` y `pitch`; en vertical, `setViewOffset` con el héroe en el tercio inferior y el FOV horizontal ≥ 60°) y la visibilidad según `flags`.
- `encounter(id)`: encuadre de 1 s (al instante con `reducedMotion`). `dissolve(id)`: oculta la criatura (con partículas, sin ellas con movimiento reducido).
- Con `?fps=1`, un `div` de fps y calls en `#city-root`, que se quita en `dispose`.

- [ ] **Paso 1: escribir `tests/city_world.cjs` (Three real y renderer falso, como `tests/scene.cjs`), que debe fallar.**
  - (a) Con todo visible: triángulos ≤ 80000 y objetos dibujables (`isMesh || isLine || isPoints`) ≤ 150.
  - (b) Cada NPC es exactamente 1 malla.
  - (c) Hay ≥ 1 `InstancedMesh` por grupo (sombras, indicadores, faroles) y 0 `PointLight`.
  - (d) Materiales solo Lambert, Basic, Points o LineBasic; ningún `transparent && DoubleSide`.
  - (e) `camera.far` entre 55 y 70 y `scene.fog.far` ≈ 62.
  - (f) Edificios fusionados en 4 a 9 mallas.
  - (g) `dispose` libera todo (con espías).
  - (h) `create` con renderer, raf y canvas falsos resuelve. Ejecutar un cuadro llama a `opts.state()`. `setPaused('sheet', true)` detiene los rAF. Después de `dispose` no se agenda ningún rAF.
- [ ] **Paso 2:** falla.
- [ ] **Paso 3: implementar** e insertar en `build.mjs` después de `hero3d.js`.
- [ ] **Paso 4: verificar.**
  - Suite verde.
  - **Humo en Chromium** con el Playwright local (`/home/josma/dev/career-ops/node_modules/playwright-core`, script en el scratchpad, no en el repo) a 390×844 en vertical y con `?fps=1`: entrar, caminar 3 s con el teclado, abrir Pausa, salir. Guarda capturas y anota fps y calls. No debe haber errores de consola.
- [ ] **Paso 5: commit.** Mensaje: `feat(city): mundo 3D low-poly (plaza, Taller, NPC, Maraña)`.
- [ ] **Paso 6 (punto de control del H1, lo hace el usuario):** sirve el HTML y pídele que lo abra en su teléfono con `?fps=1`, camine por el distrito y se pegue a un muro. Anota fps y calls en el registro. **Si queda por debajo de 30 fps, detente y avisa antes de la Tarea 12.**

---

### Tarea 12: Mentores, lección y práctica (H2)

**Archivos:** modificar `city/view.js`. Pruebas: `tests/city_engine.cjs` (agregar casos).

**Interfaces:**
- Interactuables: la directora, el espejo, los mentores, las criaturas no vencidas hoy (evaluado en el momento, **nunca guardado en la entidad**), los retos sin reparar, los aprendices visibles, la torre y el puente. Distancia de acción: 2.2 m.
- **Mentor:**
  - `#city-act` dice "Hablar con {nombre}";
  - la hoja Lección muestra `fmt(title)`, `fmt(summary)`, `keyPoints` con `fmt` y el aviso "Para la primera estrella hacen falta al menos 6 respuestas", con los botones "Practicar" y "Cerrar";
  - abrirla agrega `M02:Txx` a `S.stats.learnTopics` si no estaba, con `checkVirtues()` y `save()`;
  - "Practicar" llama a `startRound({ kind:'quiz', title:'Quiz', mid:'M02', back:{ name:'city' }, city:{ kind:'practice', id:mentorId } }, itemsFor('quiz', mod('M02'), topic))`.
- **Directora:** abre el prólogo si `!S.city.prologue`; si no, muestra el objetivo actual. **Espejo:** va a "Tu héroe".
- **Pausa → Lecciones vistas:** lista de temas en `learnTopics` de M02; cada uno abre su lección.

- [ ] **Paso 1: agregar casos, que deben fallar.**
  - `teleport` junto a m01 → "Hablar con {nombre}"; acción → la hoja con el título de T01 y `learnTopics` incluye `M02:T01`.
  - "Practicar" → ronda (`.prompt`) y la ciudad queda suspendida. Al terminar, "Volver a la ciudad" reanuda en la misma posición, y el historial `topics['M02:T01']` creció.
  - El espejo va a "Tu héroe" y libera la ciudad.
  - Un `keyPoint` con `**negritas**` sale como `<strong>`.
- [ ] **Paso 2:** falla.
- [ ] **Paso 3: implementar.**
- [ ] **Paso 4:** suite verde.
- [ ] **Paso 5: commit.** Mensaje: `feat(city): mentores con lección y práctica`.

---

### Tarea 13: Criaturas y retos de campo (H3)

**Archivos:** modificar `city/view.js`. Pruebas: `tests/city_engine.cjs` (agregar casos).

**Interfaces:**
- **Criatura:**
  - `#city-act` dice "Enfrentar a {nombre}";
  - la acción ejecuta `CD.world.encounter(id)`, y al resolver llama a `startRound({ kind:'battle', title:'Batalla', mid:'M02', back:{ name:'city' }, villain:{ id, name, mod:'M02', topics }, city:{ kind:'battle', id } }, battleItems({ mod:'M02', topics, n:8 }))`;
  - al volver con victoria, `world.dissolve(id)`.
- **Reto:**
  - `#city-act` dice "Reparar {label}";
  - la ronda es `startRound({ kind:'repair', title:'Reparación', mid:'M02', back:{ name:'city' }, city:{ kind:'repair', id } }, repairItems('M02', topic))`;
  - `vPlay` muestra el chip "Reparación" cuando `kind === 'repair'` (agrega `repair` a la lógica de títulos y chips sin tocar las demás).

- [ ] **Paso 1: agregar casos, que deben fallar.**
  - Batalla contra `bit` ganada (vida 0) → `beaten.bit = hoy`, el mundo falso recibió `dissolve('bit')` y la acción ya no ofrece a `bit`.
  - Batalla perdida → sin `beaten`.
  - **(Foco de revisión 3)** Con `beaten.bit = hoy`, adelantar el reloj +25 h sin salir hace que la acción vuelva a ofrecer "Enfrentar a Bit Errante".
  - Reto con 2 aciertos → `repairs[id]`, y el objeto ya no aparece en Lugares cercanos como "Reparar…".
  - Reto con un fallo → sigue disponible.
- [ ] **Paso 2:** falla.
- [ ] **Paso 3: implementar.**
- [ ] **Paso 4:** suite verde.
- [ ] **Paso 5: commit.** Mensaje: `feat(city): criaturas con encuentro y batalla, retos de campo`.

---

### Tarea 14: Enseñar, torre, restauración, prólogo y objetivo (H4)

**Archivos:** modificar `city/view.js`. Pruebas: `tests/city_engine.cjs` (agregar casos).

**Interfaces:**
- **Aprendiz** (solo visibles los de `CityStory.apprenticesAvailable`). `#city-act` dice "Enseñar a {nombre}".
  - `explain`: hoja "¿Me explicas {título}?" con 6 keyPoints (3 del tema y 3 de otros temas de M02 al azar), botones `aria-pressed`, contador "N de 3" y "Explicar" activo solo con 3.
    - Si acierta: `S.xp += 15`, `taught[id] = true`, `applyRestore`, `checkVirtues()` y `save()`.
    - Si falla: marca los de otro tema; "Reintentar" vuelve a sortear.
  - `correct`: `startRound({ kind:'error', title:'Enseñar', mid:'M02', back:{ name:'city' }, city:{ kind:'teach', id } }, [una pregunta error del tema al azar])`.
- **Torre:** "Entrar a la torre". Si `bossUnlocked(mod('M02'))`, lanza `startRound({ kind:'boss', … , back:{ name:'city' }, city:{ kind:'boss', id:'torre' } }, itemsFor('boss', mod('M02')))`. Si no, una hoja con "Te faltan N temas" y la lista de temas con 0 estrellas.
- **Restauración:** cuando `applyRestore` devuelve `changed`, sale la hoja de celebración (Planos y Junior). `flags.restored = true` hace que el mundo retire La Maraña del distrito y muestre el puente. "Cruzar el puente" abre una hoja "Próximamente".
- **Prólogo:** tres paneles con "Siguiente" y "Saltar"; al terminar, `S.city.prologue = true`.
- **Objetivo:** cada vez que cambia el estado, `CityStory.nextObjective` → `#city-obj` muestra "{label} · {m} m" con `textContent`, la flecha apunta al objetivo y `#city-live` lo anuncia. Pausa → "Ir al objetivo" abre directamente su hoja o acción.

- [ ] **Paso 1: agregar casos, que deben fallar.**
  - Sin estrellas en T05, el aprendiz de T05 no aparece; con 1 estrella, sí.
  - `explain` correcto → +15 XP y `taught`; con 2 elegidas, "Explicar" está desactivado; fallar marca los de otro tema y "Reintentar" cambia el orden.
  - `correct` con acierto → `taught` y la pregunta registrada en `qs`.
  - Torre bloqueada → "Te faltan".
  - Con el jefe aprobado (guardado) y 8 enseñados → al enseñar el octavo sale la celebración, `restored.M02`, `powers.planos` y el rango "Junior" en el HUD.
  - El prólogo sale una vez; "Saltar" lo marca visto.
  - "Ir al objetivo" sin prólogo abre la hoja de la directora.
  - **(Foco de revisión 2)** Un guardado con `taught` de 8 ids basura más `powers.planos` sin jefe → rango "Becario" y puente cerrado.
  - Nombre de héroe `<img id=pwn src=x>` → no hay `#pwn` en el HUD ni en las hojas.
- [ ] **Paso 2:** falla.
- [ ] **Paso 3: implementar.**
- [ ] **Paso 4:** suite verde.
- [ ] **Paso 5: commit.** Mensaje: `feat(city): enseñar, torre, restauración, prólogo y objetivo`.

---

### Tarea 15: Fuzzing de la ciudad, verificación final y documentación

**Archivos:** crear `tests/adv/city_fuzz.cjs`. Modificar `README.md`.

- [ ] **Paso 1: escribir `tests/adv/city_fuzz.cjs`** con el patrón de `tests/adv/trip_fuzz.cjs` (workers y perro guardián).
  - Sesiones de 20 a 60 eventos al azar: teclas de movimiento, Q/Z, acción, `teleport` a interactuables al azar, abrir y cerrar hojas, responder rondas al azar, Pausa y sus opciones, salir y entrar, resize, `visibilitychange` y `webglcontextlost`.
  - Invariantes tras cada evento:
    - sin errores de consola;
    - si `V.name` no es `city` ni una ronda que vuelve a ella, `#city-root` está `hidden` y vacío;
    - mundos vivos ≤ 1;
    - `S.city.at` finito y dentro de `bounds`;
    - `estudio_isw_v1` es JSON válido;
    - `restored.M02` implica jefe aprobado y 8 enseñados válidos.
- [ ] **Paso 2: verificar.**
  - Suite verde.
  - `node tests/adv/city_fuzz.cjs 150 20261111` → 0 fallos y 0 cuelgues.
  - `node tests/adv/city_base_attack.cjs`, `attacks.cjs`, `props.cjs 240 777` y `fuzz_state.cjs 320 20261111` sin fallos.
  - Humo en Chromium (390×844 vertical) del capítulo completo usando `teleport` en modo de prueba, con capturas.
- [ ] **Paso 3:** agrega a `README.md` una sección corta sobre Ciudad Núcleo (cómo entrar, archivos `city/*` y pruebas).
- [ ] **Paso 4: commit.** Mensaje: `test(city): fuzzing de la ciudad y documentación`.
- [ ] **Paso 5: lista manual para el usuario** (§10 del spec): teléfono en vertical, joystick y cámara con dos dedos, gestos del sistema, aviso de girar, salir y entrar 5 veces, y jugar el capítulo completo.
