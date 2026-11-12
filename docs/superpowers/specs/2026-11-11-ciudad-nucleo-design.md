# Diseño: "Ciudad Núcleo", mundo abierto 3D con protagonista (primer corte: prólogo + capítulo 1)

Fecha: 2026-11-11 · Estado: v3, corregido tras dos `/review` (spec y plan) · Rama: `feat/ciudad-3d` (parte de `feat/viaje-paquete-3d`)

## 1. Propósito

Convertir Estudio ISW en un juego de mundo abierto 3D en **tercera persona tipo GTA**. **Tu héroe es el protagonista**: recorre una ciudad, **aprende** con mentores, **se pone a prueba** contra criaturas y en retos de campo, y **enseña** a los vecinos. Así crece en **rango de carrera** y gana **poderes que abren la ciudad**. La trama gira en torno al **bien común de la ciudad**, no a ser el mejor.

**Restricciones:**
- Navegador. **Teléfono siempre en vertical** y laptop en horizontal normal.
- Un solo HTML autocontenido (`node build.mjs` → `juego_estudio.html`), sin recursos externos en tiempo de ejecución salvo las fuentes de Google.
- Arte generado por código: low-poly, sin modelos ni texturas.
- **El contenido de M01–M10 no cambia** (temas, keyPoints, preguntas, IDs), ni la clave `estudio_isw_v1` ni `v: 1`.
- **Los exámenes se respetan**: estrellas, repaso, XP y jefes con las reglas actuales. El jefe pide 1 estrella por tema, 20 preguntas, sin pistas ni poderes, y se aprueba con 80 %.
- Diseños originales, sin personajes, marcas ni nombres reconocibles. Se mantiene la lista de palabras prohibidas de `validate.mjs`. Texto en español de México.

**Éxito del primer corte:** en un teléfono de gama media, en vertical y a ≥ 30 fps, juegas del prólogo hasta restaurar el distrito de Fundamentos, ganar el poder **Planos** y subir a **Junior**. Todo cuenta en estrellas, repaso y XP como en el juego actual.

## 2. Trama

**Ciudad Núcleo** funciona gracias a su software. **La Maraña**, una corrupción que nace del código que nadie entiende y del conocimiento guardado por unos pocos, apaga distrito tras distrito. El héroe llega como **Becario** al **Taller Comunal**, el colectivo de ingenieros que cuida la ciudad. La meta es que **la ciudad vuelva a funcionar y no dependa de una sola persona**. Por eso cada distrito se restaura aprendiendo, poniéndose a prueba y **enseñando a los vecinos**. En el final (capítulo 11), los aprendices de todos los distritos se unen contra el corazón de La Maraña.

| Cap. | Distrito | Módulo | Servicio que se restaura | Poder que se gana |
|---|---|---|---|---|
| 1 | Taller Comunal | M02 Fundamentos | Obras y planos | **Planos** (ver y construir puentes ocultos) |
| 2 | Archivo | M04 Historia | Memoria de la ciudad | Memoria |
| 3 | Plaza de la Red | M03 Internet | Correo y nombres | Nombres (DNS) |
| 4 | Puerto de Datos | M08 Redes | Comunicaciones (incluye "Viaja como paquete") | Enrutamiento |
| 5 | Fábrica de Objetos | M06 POO | Producción | Instanciar |
| 6 | Barrio de Cimientos | M07 SOLID | Estructuras | Cimientos |
| 7 | Mercado de Patrones | M05 Patrones | Comercio | Plantillas |
| 8 | Torre de Control | M01 Diseño de sistemas | Tráfico y transporte | Balanceo |
| 9 | Puerto de Contenedores | M11 Contenedores y Kubernetes (nuevo, subproyecto aparte) | Logística | Orquestación |
| 10 | Fortaleza | M10 Ciberseguridad | Banco y datos | Cifrado |
| 11 | Laboratorio | M09 IA | Corazón de La Maraña | Final |

**Rangos** (se calculan con los distritos restaurados; no se guardan):

| Distritos restaurados | Rango |
|---|---|
| 0 | Becario |
| 1 | Junior |
| 3 | Semi-senior |
| 6 | Senior |
| 8 | Arquitecto |
| 11 | Tech Lead |

## 3. Ciclo de juego en un distrito (capítulo 1: Taller Comunal, M02)

M02 tiene 23 temas (T01 Bits… T23 LLMs) y 92 mcq, 76 tf, 16 escenarios y 26 de error. Cada tema tiene exactamente 4 mcq y de 5 a 9 keyPoints. Todo lo que se cita aquí está verificado contra `content_m02.mjs`.

### 3.1 Aprender con mentores
- Hay **23 mentores**, uno por tema, con **nombres propios en `city/districts.mjs`** (23 únicos). `MNAMES` del motor se conserva si otra parte lo usa.
- **Hablar** abre la hoja **Lección**: título, `summary` y `keyPoints` con `fmt()`, más los botones "Practicar" y "Cerrar".
  - Abrirla agrega `M02:Txx` a `S.stats.learnTopics`, si no estaba (virtud Curiosidad, igual que `data-act="learn"` hoy).
  - "Practicar" inicia la ronda `quiz` del tema con las reglas actuales: **de 4 a 8 preguntas según el tema**. La hoja avisa: "Para la primera estrella hacen falta al menos 6 respuestas".
- Sobre cada mentor flota un indicador holográfico con sus estrellas (0 a 3).

### 3.2 Ponerse a prueba

**Criaturas de La Maraña.** Hay 6 en el distrito, con datos en `districts.mjs`. Entre todas cubren T01–T23 exactamente una vez.

| Id | Nombre | Temas | Preguntas mcq+tf disponibles |
|---|---|---|---|
| `bit` | Bit Errante | T01, T02, T03 | 21 |
| `silicio` | Cuello de Silicio | T04, T05, T10 | 22 |
| `kernel` | Kernel en Pánico | T06, T07, T08, T09 | 30 |
| `eco` | Eco Roto | T12, T13, T14, T15, T16 | 37 |
| `huerfano` | Dato Huérfano | T11, T17, T18, T19, T20 | 37 |
| `alucina` | Alucinación | T21, T22, T23 | 21 |

- Rondan por un área asignada. Al acercarte (≤ 2.2 m) y pulsar la acción hay un **encuentro**: la cámara encuadra al héroe frente a la criatura ~1 s (al instante con movimiento reducido).
- Luego viene la **batalla**, con esta regla nueva y explícita:
  - Vida 4 y energía 3, poderes permitidos.
  - Preguntas de `battleItems({ mod: 'M02', topics, n: 8 })`, solo mcq y tf, sin repetir.
  - **La batalla termina solo cuando la vida de la criatura llega a 0 (ganas) o tu energía llega a 0 (pierdes)**. Si se acaban las 8 preguntas, se sacan más del mismo banco sin repetir.
  - **Se elimina la victoria "por puntos"** (`en/3 > hp/4`, engine.html:967), que hoy da por vencido a un villano con vida 1 (ataque B7 de `tests/adv/city_base_attack.cjs`).
- Al ganar se vuelve a la ciudad, la criatura se disuelve en partículas y queda vencida **por hoy** en `S.city.beaten[id]`.
- `beatenToday(id)` lee `S.city.beaten` y **se evalúa en el momento de pintar e interactuar**, sin guardarse en la entidad. Así la criatura de ayer vuelve al cruzar la medianoche sin salir (ataque B10).

**Retos de campo.** Hay 10, fijos en `districts.mjs`, cada uno con un **tema distinto** de entre los 13 que tienen ≥ 2 preguntas scenario+error: T01, T02, T05, T06, T09, T10, T13, T14, T15, T16, T18, T20, T22.
- Cada reto es un objeto roto visible: semáforo loco, grúa trabada, terminal con humo, farol apagado.
- "Reparar" inicia una ronda **de tipo `repair`**: 2 preguntas sin repetir del pool scenario+error del tema, con un selector nuevo `repairItems(mod, tid)` y el título "Reparación".
- **Se repara si las 2 son correctas sin ayuda** (sin láser, pista, foto ni regeneración, igual que el `assisted` de `finalize`). Entonces `S.city.repairs[id] = true`. Si no, sigue roto y se puede reintentar.

### 3.3 Enseñar
- Hay **12 puestos de aprendiz** en `districts.mjs`, cada uno con un tema distinto y un nombre propio que no se repite con los mentores. El aprendiz **solo aparece** si tienes `starsOf(M02, tema) ≥ 1` y no le has enseñado.
- Cada puesto tiene un formato fijo:
  - **Explicar.** El aprendiz pregunta "¿Me explicas {título}?". Se muestran 6 keyPoints, 3 del tema y 3 de otros temas del distrito, mezclados y con `fmt()`.
    - Son casillas con `aria-pressed` y un contador "N de 3". El botón "Explicar" se activa solo con 3 elegidas.
    - **Es correcto si los 3 son del tema.** Da +15 XP directo (`S.xp += 15`, `checkVirtues()`, `save()`), sin tocar historial ni cola.
    - Si fallas, se marcan los que eran de otro tema y, al reintentar, se vuelven a sortear y mezclar los 6.
  - **Corregir.** El aprendiz dice algo equivocado: una pregunta `error` del tema presentada como su explicación, y tú eliges la corrección. Se registra como una respuesta normal: `touch()` → `xpBase`/`xpWithPassive` → `recordAnswer` → `checkVirtues()` → `save()`.
    - **Solo se puede asignar a temas con ≥ 1 pregunta `error`** (hay 15).
- Si aciertas: `S.city.taught[puesto] = true`, el aprendiz se va contento y sube el medidor. Si fallas, se queda y puedes reintentar.

### 3.4 Jefe y restauración
- **Torre del Taller:** inicia `startRound` con `kind: 'boss'`, `mid: 'M02'` y las reglas actuales. Si `bossUnlocked(M02)` no se cumple, la hoja dice cuántos temas faltan y cuáles.
- **El distrito se restaura** cuando `S.boss.M02.passed === true` **y** hay **8 aprendices** enseñados, contando solo ids válidos de `CITY_DATA`. Entonces:
  - `S.city.restored.M02 = true` y `S.city.powers.planos = true`;
  - el rango pasa a Junior;
  - se muestra la hoja de celebración;
  - La Maraña se retira del distrito y se construye el puente al Archivo ("Próximamente").
- **Medidor:** `0.5 × min(taught, 8) / 8 + 0.5 × (jefe aprobado ? 1 : 0)`, mostrado como entero de 0 a 100 %. Cada aprendiz enseñado enciende un farol.

### 3.5 Objetivo activo (flecha y texto del HUD)
`story.nextObjective(state)` devuelve `{ kind, id, label }` según el primer caso que se cumpla:
1. Prólogo no visto → la directora.
2. Distrito restaurado → el puente. Si el puente ya se vio → **"Capítulo completo"**, guardado en `bridgeSeen`.
3. Torre, si el jefe está desbloqueado y no aprobado.
4. **Avance por grupo de criatura**, en el orden de la tabla de §3.2. Un grupo está **incompleto** si cumple cualquiera de estas:
   - algún mentor del grupo no tiene lección abierta;
   - algún tema del grupo tiene 0 estrellas;
   - su criatura **nunca** ha sido vencida.

   Para el primer grupo incompleto, el objetivo es, en este orden: el mentor sin lección, luego el tema por practicar, luego la criatura.
5. Reto sin reparar.
6. Aprendiz disponible.
7. Criatura no vencida hoy (repaso opcional).

El HUD muestra la flecha más un texto corto con distancia, por ejemplo "Habla con Ana · 24 m". Cuando cambia el objetivo, `#city-live` lo anuncia.

## 4. Ciudad y prólogo

- **Ciudad central:** plaza de ~30 m de radio con la **sede del Taller Comunal**. Ahí están la directora (Iris), que da el prólogo y las misiones, y el **espejo**, que abre "Tu héroe". De la plaza salen 11 caminos; diez terminan en un **muro de La Maraña** (partículas moradas y negras con acento holograma) con un letrero "Próximamente".
- **Distrito Taller Comunal**, al norte de la plaza, de ~120 × 120 m:
  - calles en cuadrícula con ~40 edificios low-poly;
  - 23 puestos de mentor, 6 áreas de criaturas, 10 retos y 12 puestos de aprendiz;
  - la torre al fondo y el puente cerrado hasta restaurar.
- **Prólogo:** tres paneles en una hoja (Ciudad Núcleo, La Maraña, llegas al Taller), con "Saltar". Se ve una vez (`S.city.prologue = true`).

## 5. Controles, cámara, HUD y estados

### 5.1 Cámara en tercera persona
- Brazo de 6 m, altura 2.6 m, inclinación −15° (límites −35° a 10°).
- Se acorta si una caja de colisión corta el brazo (rayo contra AABB).
- Se re-centra detrás del héroe al caminar. **Con movimiento reducido no gira sola.**
- FOV vertical de 70°. En vertical, el héroe va en el tercio inferior (`setViewOffset`) y el brazo de cámara se ajusta para que entre la ciudad. En la laptop se usa la vista horizontal normal, sin offset.
- `camera.far` ≈ 62 m, el fin de la niebla.

### 5.2 Teléfono (siempre vertical)
- **Zonas y dedos:** cada `pointerId` se asigna a la zona donde empezó el toque y la conserva hasta soltar.
  - **Joystick:** cuarto inferior izquierdo, con un margen igual al área segura + 16 px desde los bordes izquierdo e inferior, para no chocar con los gestos del sistema. Aparece donde tocas. Inclinación < 0.7 camina; ≥ 0.7 corre si el nivel es ≥ 5.
  - **Cámara:** arrastrar en el resto de la zona libre (ni HUD, ni botones, ni hoja).
  - Se puede **caminar y girar la cámara a la vez** con dos dedos.
- `#city-root` lleva `touch-action:none` y `overscroll-behavior:none`, y el `body` no hace scroll en esta vista.
- **Botones:** abajo a la derecha, el de **acción contextual** ("Hablar con Ana", "Reparar semáforo", "Enseñar a Luis", "Entrar a la torre", "Enfrentar a Bit Errante") y "Correr" desde el nivel 5. Arriba a la izquierda, **"Pausa"** (≥ 44 px, dentro del área segura).
- **Correr** es un interruptor que se guarda en `S.city.run`. El joystick a fondo solo corre si el interruptor está activo.
- **Aviso de girar:** un dispositivo táctil (`pointer: coarse`) en horizontal con altura < 500 px ve "Gira tu teléfono a vertical" y el juego se pausa. Una tablet en horizontal (altura ≥ 500 px) juega con la hoja a 85dvh.

### 5.3 Laptop y teclado
- WASD o flechas para moverse, Shift para correr, **Q/Z para girar la cámara** (y arrastrar con el mouse, sin bloqueo del puntero), E o Enter para la acción, Esc para la pausa.
- El menú de pausa trae **"Ir al objetivo"**, que abre directamente la hoja del objetivo activo, y **"Lugares cercanos"**, una lista de lo que hay a ≤ 15 m. Así se puede jugar todo sin cámara ni vista.

### 5.4 HUD y pausa
- **HUD** (área segura): Pausa, rango, barra de XP y nivel, medidor de restauración, y flecha con texto del objetivo.
- **Pausa:** Ir al objetivo, Lugares cercanos, Lecciones vistas, Repaso (ronda `review` actual), Tu héroe y Salir al inicio.

### 5.5 Movimiento
- Círculo de 0.4 m contra cajas en XZ (lineal, ~100 cajas).
- 4 m/s caminando y 7 m/s corriendo, con aceleración de 0.15 s (`k = min(1, dt/0.15)`), **dt ≤ 50 ms** y una piel de colisión de 1e-4 m. Sin salto (llega en el cap. 5).
- **Guarda contra NaN:** si un componente de la posición, el `yaw` o el `dt` no es finito, se vuelve a la última posición válida.

### 5.6 Estados

| Estado | Qué se ve | Salidas |
|---|---|---|
| Cargando | "Preparando la ciudad…" (`role="status"`) | "Salir" |
| Sin WebGL o falla la carga | "Tu equipo no puede mostrar la ciudad 3D." | "Ir a los módulos", "Volver" |
| Se pierde el contexto en plena partida | "Se perdió la vista 3D." | "Reintentar" (vuelve a montar en la misma posición), "Salir" |
| Pausa | Menú de pausa | |
| Aviso de girar | "Gira tu teléfono a vertical" | |
| Hoja abierta | Lección, diálogo, enseñar o celebración | |

### 5.7 Hojas
- Siguen el patrón del viaje: hoja inferior de ≤ 50dvh, foco en su lugar con `scrollIntoView`, `aria-live`, y `alertdialog` + `inert` en las confirmaciones.
- **Todo dato pasa por `esc()` o `fmt()`.** El botón de acción y `#city-live` se actualizan solo con `textContent`. Los anchos en `style` son enteros acotados de 0 a 100.
- El bucle 3D se pausa mientras hay una hoja abierta.

## 6. Arquitectura

### 6.1 Archivos nuevos (los inserta `build.mjs` en la IIFE, como el viaje)

| Archivo | Responsabilidad | Formato |
|---|---|---|
| `three/shared.js` | **Compartido por el viaje y la ciudad**: `Pauser`, `compileOrLost(renderer, scene, camera, canvas)` (carrera `compileAsync` contra `webglcontextlost`), `disposeScene(scene)` y `mergeBoxes(parts)` (fusión propia de geometrías: mismas claves de atributos, sin `uv`). `trip/scene.js` pasa a usarlo sin cambiar su comportamiento. | `var Three3D = (function(){…})()` + `module.exports` |
| `city/districts.mjs` | Solo datos: capítulos, rangos, poderes; distrito M02 (mentores con nombre, criaturas, retos, aprendices con nombre, torre, puente, cajas de colisión, áreas, manzanas); villanos de M01 guardados para el cap. 8 | ESM → `var CITY_DATA = <JSON>` |
| `city/story.js` | Lógica pura: `restoration`, `rankOf`, `nextObjective`, `apprenticesAvailable`, `isRestored`, `applyRestore`, `normalizeCity` | IIFE + `module.exports` |
| `city/move.js` | Matemática pura: movimiento, colisión círculo-AABB, brazo de cámara contra AABB, interactuable más cercano, `coord()` y guarda NaN | IIFE + `module.exports` |
| `city/input.js` | Zonas y `pointerId`, joystick, cámara y teclado → `{ mx, mz, run, yawDelta, pitchDelta, action }` | IIFE + `module.exports`; recibe el elemento raíz |
| `city/world.js` | Three: plaza, distrito **fusionado por manzana (4 a 9 trozos)**, muros de La Maraña (un `Points` por muro, pocas partículas y tamaño pequeño), NPC de una malla con colores por vértice, sombras, indicadores y faroles (**un `InstancedMesh` por grupo**, faroles emisivos, **nunca `PointLight`**) | `var CityWorld = …`, recibe `THREE` |
| `city/hero3d.js` | `CityHero.create(THREE, look, PARTS)`: héroe low-poly con piel, traje, **las 5 cabezas** de `PARTS.head` (`hair_s`, `hair_l`, `aviator`, `antenna`, `crystal`) y capa. Índices fuera de rango → `PARTS[s][0]`. Colores como enteros `parseInt(hex.slice(1),16)` solo si cumplen `hex()`. Animación de caminar y correr. | IIFE, recibe `THREE` |

### 6.2 Motor (`engine.html`)
- **Vista `city`:**
  - monta `#city-root` (fuera de `#app`) con `loadThree()`, un token `cityGen`, `cityStart`/`cityStop`, los estados de §5.6 y la liberación completa;
  - el gancho de prueba `__CITY_WORLD__` solo se acepta si es un objeto con `create` de tipo función, y se lee una vez al arrancar.
- **Suspender en lugar de destruir**, con lista de lo que se conserva: `render()` llama a `cityStop()` **salvo** que `V.name === 'city'`, o que `V.name` sea `play` o `results` y `R.cfg.back.name === 'city'`.
  - Mientras está suspendida, `#city-root` va `hidden`, el `Pauser` tiene el motivo `suspended` y `resize()` no hace nada con tamaño 0 ni suspendida.
  - Al reanudar se llama a `resize()` y se quita `suspended`.
  - Cualquier otra vista (Inicio, módulo, "Tu héroe", tema, aprender) libera la ciudad.
- **Rondas desde la ciudad:** `startRound({ kind, title, mid: 'M02', back: { name: 'city' }, city: { kind: 'practice'|'battle'|'repair'|'teach'|'boss', id } }, items)`.
  - `finish()` resuelve `R.cfg.city` **antes de `save()`**:
    - `battle` → `S.city.beaten[id] = today()` solo si `R.battle.hp <= 0`;
    - `repair` → `S.city.repairs[id] = true` si `R.ok === 2 && R.assisted === 0`;
    - `teach` (formato corregir) → `S.city.taught[id] = true` si `R.ok === 1`.
  - Después llama a `story.applyRestore(S)`. Es **el único punto** donde se evalúa la restauración, junto con el formato "explicar", que lo llama al acertar.
  - `vResults` muestra "Volver a la ciudad" cuando `back.name === 'city'`.
- **Inicio:** la tarjeta "Modo aventura" pasa a "Entrar a la ciudad" (`data-act="city"`). **`vModule` deja de mostrar "Explorar esta región"**.
- **Guardado:** `S.city` se guarda al abrir una hoja, al pausar y cada 5 s en movimiento.

### 6.3 Retirar el mundo 2D (lista completa)
- **Se elimina del motor:**
  - `vWorld`, `worldStart`/`worldStop`/`worldEnter`/`worldSave`, `MAPS`, `REGIONS`, `worldFresh`;
  - los sprites 2D (`heroSprite`, `villainSprite`, `VSPR`) y `paintSprites`;
  - los mentores, el diálogo y el teclado del mundo, los listeners de `WD` y sus estilos.
- **También cambian:**
  - `render()` deja de llamar a `worldStop()` y `paintSprites()`;
  - `vModule` pierde el botón de región (engine.html:1049);
  - `fresh()` crea `city` y no `world` (engine.html:484);
  - `finish()` y `beatenToday` usan `S.city.beaten` (engine.html:967 y 1885);
  - `goBack` y la etiqueta de `vResults` dejan de depender de `'world'` (engine.html:1199).
- **Se conserva como lógica de batalla:** `R.battle`, `battleOver` y `vBattleHud`, este sin canvas de sprite (vida y energía en HTML con el nombre de la criatura).
  - `battleItems(v)` pasa a ser `battleItems({ mod, topics, n })`: solo mcq y tf, sin repetir y con relleno.
  - `VILLAINS` de M01 se muda a `districts.mjs`.
- **`migrate()`:** lee `o.world.run` para `city.run` **antes** de hacer `delete o.world`.
- **`validate.mjs`:**
  - retira las reglas que exigen `vWorld`, `heroSprite`, `villainSprite`, `var VILLAINS = [` y `data-act="world"`, y el recorte `VILLAINS`…`VSPR` (líneas 30-39);
  - el chequeo de cobertura de los villanos de M01 pasa a `CITY_DATA` (§9);
  - exige `function vCity`, `data-act="city"` y `CITY_DATA`.
- **Pruebas:**
  - Se retiran `tests/world.cjs` y `tests/battle.cjs`.
  - `tests/record2.cjs` I6 e I7 se adaptan a una criatura de M02 iniciada desde la ciudad (con el gancho del mundo falso). Cambian las claves de tema (`VT`) y la ruta `s.city.beaten.<id>`, y **se conserva su lógica**: R F R R R → 4/5 con 5 entradas, y 3 fallos → derrota sin XP ni vencido.
  - Con la regla nueva (§3.2), I6 debe terminar al llegar la vida a 0. La aserción "4/5" se reemplaza por "victoria con vida 0" más el registro de progreso de cada respuesta.
  - `tests/migrate.cjs` (N11, N14) pasa a comprobar `city` en lugar de `world`.
  - `tests/adv/gen.cjs` deja de generar `world` y genera `city`.
  - `tests/adv/city_base_attack.cjs` B7 y B10 deben pasar.

### 6.4 Estado guardado y `normalizeCity`
```
S.city = { prologue: bool, at: { x, z, yaw }, run: bool,
           beaten: { criaturaId: 'YYYY-MM-DD' }, repairs: { retoId: true },
           taught: { puestoId: true }, restored: { M02: true }, powers: { planos: true }, bridgeSeen: bool }
```
`story.normalizeCity(raw, CITY_DATA)` (llamado desde `migrate()`):
- **Reconstruye con listas blancas sobre objetos nuevos**, sin `Object.assign` con datos guardados.
- Por cada id **que exista en `CITY_DATA`**, comprobado con `Object.prototype.hasOwnProperty.call`, copia el valor solo si es exactamente `true`, o `/^\d{4}-\d{2}-\d{2}$/` en `beaten`. Las claves `__proto__`, `constructor` o desconocidas se ignoran.
- **`restored` y `powers` se recalculan** con las condiciones (jefe aprobado + 8 aprendices válidos), sin confiar en los booleanos guardados.
- **`at`:** si `x` o `z` no son números (`typeof === 'number' && Number.isFinite`), `at = spawn` completo. Si lo son, se acotan a los límites menos el radio (0.4 m).
  - `yaw` se reduce módulo 2π solo si es finito; si no, vale el `yaw` del spawn.
  - Si la posición cae dentro de una caja o de una zona bloqueada (puente cerrado, detrás de La Maraña), se usa el spawn.
- **Arranque y fechas:** si `raw` (o cualquier subobjeto) no es un objeto plano, se trata como vacío. Las fechas de `beaten` deben ser válidas y no posteriores a hoy.
- **Restauración:** `applyRestore` es idempotente: pone o quita `restored` y `powers` según la condición. Se llama siempre en `finish()`, también si el jefe se aprueba desde la pantalla del módulo.
- **Este mismo patrón se aplica a `hero.look`**: copiar solo las claves conocidas de `PARTS` a un objeto nuevo, más `hc`/`capec` si cumplen `hex()`. Cierra el bypass actual con `__proto__` (engine.html:493). `plainObj` exige además `Object.getPrototypeOf(x) === Object.prototype`.

## 7. Rendimiento

- ≥ 30 fps en gama media, **≤ 80k triángulos visibles, ≤ 150 draw calls** y pixelRatio ≤ 1.5.
- **Geometría:** estática fusionada **por manzana** (4 a 9 trozos) con `mergeBoxes`; lo repetido en `InstancedMesh`.
- **Personajes:** cada NPC es **una malla** con colores por vértice y se anima solo con su transform (sin reescribir `position`). El héroe tiene extremidades separadas.
- **Luz y efectos:**
  - `MeshLambertMaterial` con colores por vértice, una `HemisphereLight` y una `DirectionalLight`, **nunca `PointLight`** (los faroles son emisivos);
  - sombras falsas instanciadas;
  - acentos holograma unlit con blending aditivo y `FrontSide`;
  - niebla y `camera.far` a ~62 m.
- **Bucle:** un solo rAF con `Pauser` (motivos `sheet`, `hidden` y `suspended`), dt ≤ 50 ms, `compileOrLost`.
- **Escena de carga en el H1:** 40 edificios, 45 NPC falsos, los 10 muros y las sombras, **medida en el teléfono real con `?fps=1`** (fps y draw calls), también pegado a un muro, antes de construir H2 a H4.
- **Tamaño:** el HTML queda en ~1.8 MB. La regla de crecimiento ya se mide sin el bloque vendor.

## 8. Accesibilidad

- Todo se puede jugar con teclado (Q/Z para la cámara), y también sin vista: "Ir al objetivo" y "Lugares cercanos" en la pausa.
- Las hojas tienen el foco gestionado, `alertdialog`, `inert` y `scrollIntoView`.
- `#city-live` anuncia el distrito al entrar y el objetivo al cambiar. El canvas lleva `aria-hidden`.
- **Movimiento reducido:** sin balanceo, **sin giro automático de la cámara**, encuentro sin animación y criaturas que se disuelven sin partículas.

## 9. Validación (`validate.mjs`)

- `CITY_DATA` existe.
- **Mentores:** 23, con temas únicos que cubren T01–T23 y 23 nombres únicos.
- **Criaturas:** las 6 cubren cada tema de M02 una vez, cada una con ≥ 8 preguntas mcq+tf, y sus nombres no tienen palabras prohibidas.
- **Retos:** 10, con temas distintos y ≥ 2 preguntas scenario+error.
- **Aprendices:** 12 puestos con temas distintos; los de "corregir" con ≥ 1 pregunta `error`; nombres que no chocan con los mentores; 8 para restaurar.
- **Ids:** cumplen `/^[a-z0-9_-]+$/` y no son `__proto__`, `constructor`, `prototype` ni nombres de `Object.prototype`.
- **Tabla de rangos** = §2. Los villanos de M01 guardados cubren los temas de M01.
- Se mantienen las reglas actuales: bloques MODULE idénticos, hash del vendor y palabras prohibidas sin contar el vendor.

## 10. Pruebas

- **Unitarias:**
  - `tests/three_shared.cjs`: `Pauser`, `compileOrLost`, `disposeScene` y `mergeBoxes`, con Three real.
  - `tests/city_story.cjs`: `nextObjective` en el orden de §3.5, `normalizeCity` con `__proto__`, `constructor`, ids desconocidos, `1e308`, NaN y posición dentro de una caja, recálculo de `restored`/`powers`, y rangos.
  - `tests/city_move.cjs`.
  - `tests/city_input.cjs`: dedos por `pointerId`, dos dedos a la vez y teclado Q/Z.
- **Escena real sin WebGL:**
  - `tests/city_world.cjs`: triángulos y draw calls con todo visible, un NPC = una malla, sin `PointLight`, ≥ 1 `InstancedMesh` por grupo, materiales permitidos, `far` ≈ 62 y `dispose` completo.
  - `tests/city_hero.cjs`: las 5 cabezas y look fuera de rango.
- **Integración en jsdom:** `tests/city_engine.cjs` con mundo falso (`__CITY_WORLD__`). El contrato del falso es `create()`, más:
  - `nearest()` para el interactuable cercano;
  - `act()` para disparar la acción;
  - `position()`.

  Debe cubrir:
  - entrar, suspender y reanudar en rondas;
  - liberar al ir a "Tu héroe", a un módulo o a Inicio;
  - mentor y learnTopics;
  - práctica;
  - batalla ganada (vida 0) y perdida;
  - reto con y sin ayuda;
  - explicar (acierto, fallo y re-sorteo) y corregir;
  - jefe bloqueado y desbloqueado;
  - restauración con poder y rango;
  - prólogo una vez;
  - aviso de girar;
  - botón Pausa;
  - Ir al objetivo;
  - estados sin WebGL y contexto perdido con Reintentar;
  - migración de `world` a `city`;
  - `<img onerror>` en `hero.name`, `hc` y `capec` sin que aparezca ningún `img`.
- **Se adaptan** `record2.cjs` (I6/I7), `migrate.cjs` y `tests/adv/gen.cjs`. Se retiran `world.cjs` y `battle.cjs`.
- **Ataque:**
  - `tests/adv/city_base_attack.cjs` (B7 y B10 pasan);
  - `tests/adv/city_fuzz.cjs` (sesiones de eventos al azar: movimiento, acción, hojas, rondas, salir y entrar, contextlost);
  - propiedades de `story.js`.
- **Humo en Chromium** con WebGL a 390×844 en vertical (entrar, caminar, hablar, batallar, salir), con capturas, fps y draw calls.
- **Manual en el teléfono:** escena de carga del H1, fluidez, joystick y cámara con dos dedos, gestos del sistema, aviso de girar, y salir y entrar 5 veces.

## 11. Hitos

| Hito | Resultado jugable |
|---|---|
| H1 | `three/shared.js` (y el viaje pasa a usarlo); caminar por la plaza y el Taller con cámara, controles, colisiones, HUD con Pausa y estados; **escena de carga medida en el teléfono**; mundo 2D retirado; `S.city`, `normalizeCity` y arreglo de `hero.look` |
| H2 | 23 mentores con lección y práctica; suspender y reanudar |
| H3 | 6 criaturas con encuentro y batalla (regla nueva); 10 retos |
| H4 | Aprendices (explicar y corregir), torre, restauración, Planos, Junior, prólogo, objetivo con texto, Ir al objetivo y Lugares cercanos |

## 12. Fuera de alcance

- Capítulos 2 a 11.
- **Contenido de M11** (guía redactada por mí → revisión del usuario → preguntas).
- Ecos de repaso, mapa o minimapa, sonido, salto, viaje rápido.
- "Viaja como paquete" como misión del cap. 4.
- Batalla final con aprendices.
- CSP con hash generada por `build.mjs` (recomendada por seguridad; se registra como mejora aparte).
