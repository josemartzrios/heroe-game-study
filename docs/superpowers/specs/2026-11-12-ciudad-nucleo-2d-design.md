# Diseño: Ciudad Núcleo en 2D neón (reemplaza el render 3D) — v2

**Fecha:** 2026-11-12 · **Rama:** `feat/ciudad-2d` (antes `feat/ciudad-3d`, sin mergear) · **Base:** spec `2026-11-11-ciudad-nucleo-design.md` (v3) y su plan, ya implementados.
**v2:** incorpora la revisión `/review` del spec (7 revisores): energía máxima, errores en 2D, Sabiduría, limpieza completa, accesibilidad, presupuesto de rendimiento, flecha, zoom, escala, bonos, seguridad y orden de migración.

## 1. Por qué

El usuario probó la ciudad 3D low-poly en su teléfono: 30 fps (27 draw calls, 2028 triángulos) y no le gustó cómo se ve. Más realismo 3D sería más pesado y no cabe en un HTML para un teléfono de gama media. Decide un **mundo 2D abierto visto desde arriba**, con **pixel art neón nocturno**, y que **todo el juego** use esa interfaz neón.

**Lo que dijo el usuario:**
- Vista desde arriba, movimiento libre (estilo Pokémon o Stardew), estilo **B · neón nocturno**.
- Cámara **media** (personajes de ~28 px) con **pellizco** para acercar y alejar (rueda en laptop).
- **Quitar la edición del aspecto del héroe.** Se quedan poderes y virtudes; las virtudes que solo daban ropa ahora dan **bonos de juego**.
- **Toda la interfaz en neón**: Inicio, módulos, lecciones, rondas, resultados, "Tu héroe" y la ciudad.
- **No guardar código que no se use**: se borra todo lo que quede sin uso.

**Éxito:**
1. En el teléfono, en vertical y sin ahorro de batería: **frame time p95 ≤ 22 ms (≥ 45 fps), meta 16.7 ms (60 fps)**, sin cuadros negros ni errores.
2. El capítulo 1 completo (prólogo → restaurar el Taller → puente) se juega igual que hoy y todo cuenta en estrellas, repaso y XP.
3. Se ve como un juego neón; no quedan pantallas con aspecto de página web; contraste AA.
4. Sigue siendo un solo HTML sin recursos nuevos; la ciudad ya no carga Three.js.
5. Ningún archivo, función, estilo ni prueba sin uso.

**Fuera de alcance:** M11 (Kubernetes), capítulos 2+, Netlify, merge.

## 2. Qué se conserva

- Contenido M01–M10, IDs, `estudio_isw_v1` y `v: 1`. Exámenes: estrellas con ≥ 6 respuestas, repaso, jefe de 20 preguntas con 80 %. Lo fija `tests/preserve_2d.cjs` (63 comprobaciones), que debe seguir en verde en todo momento.
- Toda la lógica de Ciudad Núcleo: `city/districts.mjs` (posiciones en metros), `city/move.js` (`step`, colisiones, `door`, `nearest`, `within`), `city/story.js` (normalización, restauración, rangos, objetivo), las rondas del motor (batalla hasta vida 0 o energía 0 con pool, `repairItems`, `cfg.city`, `cityRestorePending`), y en `city/view.js` el ciclo de vida, suspender y reanudar durante rondas, HUD, pausa con sus 6 opciones, hojas, mentores, criaturas, retos, enseñar, torre, restauración, puente, prólogo y objetivo.
- El viaje 3D de M08 (`trip/*`, `vendor/three.module.min.js`, `loadThree()` y carga diferida) no cambia. `three/shared.js` se queda porque el viaje usa `Pauser`, `compileOrLost` y `disposeScene`; la ciudad 2D solo usa `Pauser`. Se corrige su comentario de cabecera.

## 3. Mundo 2D

### 3.0 Paso previo obligatorio: medir en el teléfono
Antes de escribir el mundo 2D, se publica un HTML de diagnóstico (en el scratchpad, no en el repo) con un rAF vacío y otro que solo copia un canvas de 1120×1880 escalado. El usuario lo abre en su teléfono con y sin ahorro de batería y reporta el p95. Si el rAF vacío ya da 30 fps, el límite es del sistema (modo de bajo consumo) y se le avisa; el criterio de éxito se mide sin ahorro de batería.

### 3.1 Contrato con la vista (sustituye al del mundo 3D)
`CityWorld2D.create(canvas, D, opts) → Promise<api>` (sin `THREE`). La vista lo resuelve con el patrón protegido actual: `window.__CITY_WORLD__` solo si `__CITY_TEST__ === true`, no es un `Node` y `typeof create === 'function'`; si no, el `CityWorld2D` incrustado.
- **La vista pasa solo** `{ reducedMotion, tick, state }`. Los dobles `raf`, `caf`, `pixelRatio` y `search` solo existen cuando los pasa una prueba directamente a `create`; en producción el mundo usa `requestAnimationFrame`, `devicePixelRatio` y `location.search`. `pixelRatio` se acepta solo si es un número finito y se limita a **[1, 1.5]**.
- **Un solo rAF**, del mundo. En cada cuadro: `dt` del `Pauser` → `opts.tick(dt)` → `opts.state()` → dibuja. Con pausa no agenda cuadros (como hoy); por eso Esc se atiende fuera del tick (comportamiento actual de la vista).
- `state()` devuelve siempre **el mismo objeto reutilizado** con `{ hero:{ x, z, face, speed }, zoom, flags:{ beatenToday, repairs, apprenticesVisible, stars, restored, lit } }`. `face` ∈ `'up'|'down'|'left'|'right'`.
- `api = { resize(), setPaused(reason, on), dispose(), encounter(id) → Promise, dissolve(id) }`. Sin `setLook`.
- **Lo decide el mundo, no la vista:** la orientación (vertical si `alto > ancho` del canvas, recalculada en `resize()`), el encuadre (héroe al **55 %** de la altura en vertical y al centro en horizontal), la posición de la criatura para el encuentro (de `D`), y el desplazamiento de cámara del encuentro (estado interno).
- **Lo decide la vista:** el zoom (ya limitado) y `face`.
- **Errores:**
  - `create` rechaza si `canvas.getContext('2d')` devuelve `null` o si falla el prerenderizado → la vista muestra "No se pudo mostrar la ciudad." con "Ir a los módulos" y "Volver".
  - El mundo escucha `contextlost` del canvas 2D: con la ciudad suspendida la vista marca `lost`; si no, muestra "Se perdió la vista de la ciudad." con "Reintentar" y "Salir". `Reintentar` vuelve a crear el mundo en el `S.city.at` guardado. No hay reintentos automáticos.
- **`dispose()`:** cancela el rAF, resuelve cualquier `encounter` pendiente, quita sus listeners, pone a `width = height = 0` el canvas del mapa (libera memoria en iOS) y quita el contador de fps. Es idempotente; después ningún método agenda cuadros.

### 3.2 Escala, cuadrícula y dibujo
- **Unidades:** 1 m = **8 px CSS** con zoom 1. El zoom va de **1 a 1.75** en px CSS; el canvas de pantalla mide `css × pixelRatio` (≤ 1.5). La escala final por cuadro se redondea al **múltiplo de 0.25 px de dispositivo más cercano** y el dibujo usa `imageSmoothingEnabled = false`.
- **Sprites:** cuadrícula de **14×14 px dibujada a ×2** (28 px CSS con zoom 1 ≈ 3.5 m en el mundo, estilizado). El punto de apoyo es el centro de los pies, sobre `(x, z)`. La colisión sigue siendo el círculo de 0.4 m de `move.js`; los edificios se dibujan exactamente sobre sus cajas para que no se vea al héroe dentro de un muro. La altura `h` de las cajas solo la usa el dibujo (sombra proyectada de 0.25 m por metro de altura hacia el sureste).
- **Mapa fijo prerenderizado una sola vez** en un canvas fuera de pantalla **a 8 px/m sin multiplicar por `pixelRatio` ni por zoom** (1120×1880 = 2.1 Mpx, ~8.4 MB; una prueba exige `w·h ≤ 4 Mpx`): suelo, calles con líneas cian, plaza, sede, espejo, torre, edificios de `CityMove.layoutBuildings` (relleno oscuro, borde neón por manzana, ventanas encendidas deterministas), muros de La Maraña con letrero "Próximamente". El puente tiene dos versiones (cerrado y construido) que se dibujan encima según `flags.restored`. **El brillo neón va horneado aquí y en los sprites.**
- **Cada cuadro:** se copia del mapa solo el rectángulo visible y encima, en este orden: sombras, retos (naranja con chispas / verde reparado), faroles (8, encendidos según `flags.lit`), NPC visibles (Iris, 23 mentores con **1 a 3 ★ por cantidad** y color, 6 criaturas flotando si no están vencidas hoy, aprendices con "?" si están visibles), el héroe, la neblina de La Maraña sobre el distrito mientras no esté restaurado y las partículas. Solo se dibuja lo que cae en pantalla con 1 m de margen.
- **Prohibido por cuadro:** `shadowBlur`, `filter`, `globalCompositeOperation` distinto de `source-over`, crear canvas, `getImageData`/`putImageData` y `toDataURL`. Una prueba falla si el mundo asigna `shadowBlur` o `filter`.
- **Partículas:** un arreglo fijo de 200 reutilizado (sin crear objetos por cuadro).
- **Restauración:** sin neblina, faroles encendidos, ventanas del Taller más brillantes y puente construido.
- **Encuentro:** la cámara se desplaza hacia la criatura en 0.6 s y resuelve. **Disolver:** 0.7 s de partículas moradas.
- **Movimiento reducido** (se vuelve a leer en cada `resize()` y al entrar): sin flotar, sin neblina animada, sin chispas ni faroles que laten, sin desplazamiento de cámara (el encuentro resuelve al instante) y al disolver solo un fundido de 0.3 s sin partículas.
- **Destellos:** ningún elemento parpadea más de 3 veces por segundo.
- **`?fps=1`:** un `div` con `textContent` que muestra solo números: fps, frame time p95, ms de tick, ms de dibujo, NPC dibujados y partículas vivas.

### 3.3 Sprites (`city/sprites2d.js`)
- Pixel art generado por código en canvas, sin imágenes. **Un atlas por tipo** (héroe, personas, criaturas, objetos), cada uno en un solo canvas; el dibujo usa rectángulos de origen.
- Héroe fijo neón: traje cian, 2 cuadros de caminar × 4 direcciones. Iris, mentores y aprendices: variantes de paleta por id (`hash`), con las variantes que salen solo de ids de `CITY_DATA` (nunca del guardado). Las 6 criaturas con formas distintas, moradas y magenta. Retos roto y reparado, farol, estrella y "?".
- `CitySprites.frame(kind, variant, face, step) → { img, sx, sy, w, h }`.
- `CitySprites.paintIcons(root)`: pinta todos los `canvas[data-spr="hero"]` dentro de `root`. El motor la llama **una sola vez al final de `render()`**. Esos canvas llevan `aria-hidden="true"`; si `getContext` falla quedan vacíos sin romper la pantalla (el nombre y el nivel siguen en texto).
- La caché es global y única (no se rehace al entrar y salir de la ciudad).

### 3.4 Entrada (`city/input.js`)
- **Se queda:** joystick por `pointerId` (cuarto inferior izquierdo, radio 48 px), margen de gestos del sistema, teclado WASD/flechas, Shift, E/Enter y Esc.
- **Sale:** arrastre de cámara, `consumeCamera`, teclas Q/Z.
- **Entra:**
  - **Pellizco:** dos punteros que no son del joystick y que nacen en zona libre (`isFree`). Un dedo que nace en la zona del joystick es siempre joystick, aunque haya un pellizco en curso. Al quedar un solo dedo del pellizco, el pellizco termina y ese dedo no hace nada hasta soltarse.
  - **Rueda:** `wheel` con `{ passive: false }` registrado solo en el root de la ciudad; `preventDefault` solo cuando la ciudad está visible y sin pausa ni hoja (incluye `ctrlKey`, el pellizco del trackpad). Se cuenta un paso por cada ~120 ms, sea cual sea `deltaMode`; `deltaY` no finito se ignora.
  - **Teclas `+` y `-`** (también `=`), un paso cada una.
  - `consumeZoom()` → `{ factor, steps }`: `factor` es el multiplicativo acumulado del pellizco (cada evento limitado a [0.5, 2]) y `steps` es la suma de pasos de rueda y teclas (±1).
- No se agrega `user-scalable=no` ni `maximum-scale` al viewport; el resto de las pantallas conserva el zoom del navegador.

### 3.5 Vista (`city/view.js`)
- Usa `CityWorld2D` y ya no llama a `loadThree()`. "Preparando la ciudad…" se muestra mientras se prerenderiza el mapa; si tarda menos de 250 ms no se muestra (evita el parpadeo).
- **Zoom:** dueño único. `zoom = clamp(zoom × factor, 1, 1.75)` y luego `zoom = clamp(round((zoom + 0.25 × steps) / 0.25) × 0.25, 1, 1.75)`. NaN cae a 1. No se guarda. Botones "Acercar" y "Alejar" (≥ 44 px) en la pausa.
- **Dirección:** `CityMove.step` deja de recibir `camYaw` (el movimiento es relativo a la pantalla: `mz = -1` es arriba, −z). `step` sigue calculando `yaw`, que se queda interno y en `S.city.at.yaw`. Una función pura nueva `CityMove.faceOf(yaw)` lo redondea a 90° (en el empate gana el eje vertical); la vista solo actualiza `face` cuando `speed > 0.1` y al entrar lo calcula desde `at.yaw`.
- **Flecha del objetivo:** `ang = atan2(dx, −dz)` en grados, con ▲ = 0° y giro horario (arriba 0°, derecha 90°, abajo 180°, izquierda 270°). Con distancia < 1 m la flecha se oculta. Se escribe `transform` solo si el ángulo redondeado cambió.
- **Trabajo por tick:**
  - La lista de lugares disponibles se recalcula solo cuando cambian los flags (al iniciar, al reanudar, al cerrar una hoja y al cambiar de día). `cityUpdateNear` usa un bucle simple de mínimo, sin copiar ni ordenar.
  - El objetivo (`nextObjective`) se recalcula solo cuando cambian los flags; cada 0.25 s solo se actualizan distancia y ángulo, y el texto solo si cambió el entero.
  - `citySave()` periódico solo si `at` se movió más de 1 m desde el último guardado; siempre al pausar, suspender, salir y perder el contexto (como hoy).
- Sale de la vista: `CITY_TILT0`, `CITY_TILT_MIN`, `CITY_TILT_MAX`, `cityAngDiff`, `cityPortrait`, el re-centrado, `cam.yaw`/`tilt`/`arm`, el paso de `look` y `PARTS` al mundo y el comentario de cabecera que cita `loadThree`.

## 4. Héroe sin editor de aspecto

- **"Tu héroe"**: icono del héroe, nombre editable (máx. 20, igual que hoy), nivel y barra, poderes y virtudes.
- **Inicio y cabecera:** el icono del héroe reemplaza al avatar. Se quita la tarjeta "Llegó el modo héroe / Crear mi héroe".
- **Subir de nivel:** el aviso menciona solo poderes nuevos.
- **Guardado:** `migrate()` reconstruye el héroe con lista blanca: `o.hero = { name: (texto ? recortado a 20 : 'Héroe') }`. Así desaparecen `look`, `welcomed` y cualquier clave extra o `__proto__`. `fresh()` crea `hero: { name: 'Héroe' }`.
- **Vuelta atrás:** si se abre una versión anterior con un guardado nuevo, rehace un `look` por defecto y vuelve a mostrar la tarjeta de bienvenida. No se pierde progreso.

### 4.1 Virtudes
Todas las recompensas salen de constantes; nada se calcula con valores del guardado. Los textos `reward` de las 9 virtudes se reescriben sin piezas:

| Virtud | Cómo se gana (igual) | Recompensa |
|---|---|---|
| Constancia | 3 días seguidos | +10 % de XP con racha ≥ 3 |
| Curiosidad | Aprender en 10 temas | Mente detective con 2 usos por ronda |
| Humildad | 10 preguntas sacadas del repaso | +5 XP por acierto en Repaso |
| **Valentía** | Intentar un jefe | **Energía máxima 4 en las batallas** |
| **Enfoque** | Ronda perfecta de ≥ 8 sin ayuda | **+10 XP en cada ronda perfecta siguiente** |
| Integridad | 10 rondas sin poderes | +10 % de XP en rondas sin poderes |
| Resiliencia | Aprobar un jefe antes reprobado | Escudo con 2 usos por ronda |
| **Liderazgo** | Aprobar un jefe | **+5 XP al enseñar a un aprendiz** |
| **Sabiduría** | 100 % de dominio en un módulo | **Memoria fotográfica con 2 usos por ronda** |

- **Energía máxima:** `startRound` fija `R.battle.max = S.virtues.valentia ? 4 : 3` y `R.battle.en = R.battle.max`. Lo usan los 4 sitios que hoy tienen el 3 escrito a mano: la creación, el tope de Regenerar (`en < max`), los corazones y el aria ("Energía N de max").
- **Enfoque:** solo si ya se tenía al empezar la ronda. En `finish()`, junto al bono de Integridad y antes de `R.lvl1`: suma a `R.xp` y `S.xp` (se mantiene R.xp = S.xp) y resultados muestra "Bono de Enfoque: +10 XP".
- **Liderazgo:** solo si ya se tenía (no es retroactivo). Explicar: `S.xp += 15 + 5` y el texto de la hoja muestra la cifra calculada ("+20 XP"). Corregir: en `finish()`, si `cfg.city.kind === 'teach' && R.ok === 1`, +5 a `R.xp` y `S.xp` antes de `R.lvl1`, mostrado como "Bono de Liderazgo: +5 XP".
- Los bonos fijos (Enfoque, Liderazgo, Humildad) no cuentan para el tope de +20 %, que sigue aplicando solo a los porcentajes (Constancia e Integridad).

### 4.2 Batalla: preguntas agotadas
Si una batalla se queda sin preguntas (sin pool) con vida > 0 y energía > 0, termina como **"Empate"**: no se marca vencida, no cuenta como derrota y el banner dice "Se acabaron las preguntas: vuelve a intentarlo". Hoy no ocurre en el juego (cada criatura tiene entre 21 y 37 preguntas), pero el código debe ser correcto. Así la prueba D6 de `tests/adv/spec2d_attack.cjs` pasa a verde.

## 5. Interfaz neón en todo el juego

- **Tokens en `:root`:** fondo `#0d1230`, superficie `#151c45`, cian `#5ce1ff`, magenta `#ff4fd8`, verde `#7dff8a`, amarillo `#ffd76a`, **rojo `#ff5a5f`**, texto `#e8ecff`, y adorno `#2e3a7a` (solo para separadores; nunca como único borde de un control).
- **Contraste:** todo texto ≥ 4.5:1; bordes e indicadores de controles ≥ 3:1 (cian o verde). El botón principal es magenta con **texto `#0d1230`** (6.4:1).
- **Respuestas:** la correcta lleva borde verde y **✓**, la elegida incorrecta borde rojo y **✗**, y cada una un texto oculto ("respuesta correcta" / "tu respuesta"). El color nunca es la única señal.
- **Tamaños:** todo control ≥ 44×44 px (incluidos los que hoy son chicos: `.btn.sm`, `.linkbtn` y el icono de la cabecera).
- **Letra pixel** ("Press Start 2P", que ya se carga) solo en textos fijos y cortos: títulos de pantalla, "Pausa", "VS" y el rango. Mínimo 14 px e interlineado ≥ 1.5. Las chips, los nombres, el objetivo del HUD, las preguntas y las lecciones van en la letra de lectura. No se agregan orígenes de fuentes nuevos.
- **Pantallas:** Inicio (título "Ciudad Núcleo", botón "▶ Entrar a la ciudad", icono del héroe, repaso y módulos como fichas), módulo, tema, lección, rondas, resultados, "Tu héroe" y las hojas, la pausa y el HUD de la ciudad.
- Es un cambio de estilos y de algunos textos de títulos; no cambia la estructura ni los `data-act`.
- `prefers-reduced-motion` sigue quitando animaciones y brillos que laten.

## 6. Seguridad (invariantes que no se pierden)

- Todo texto de datos (nombre del héroe, títulos, etiquetas, keyPoints) va a `innerHTML` solo con `esc()` o `fmt()`. El botón de acción, `#city-live`, `#city-obj` y el div de `?fps=1` usan solo `textContent`. Si algún nombre se dibuja en canvas, solo con `fillText`.
- `migrate()` mantiene las listas blancas de `S.city`, `stats` y `boss` y la nueva del héroe (§4).
- Ganchos de prueba (`__CITY_WORLD__`, `__CITY_TEST_API__`, `__CITY_ROUND__`) solo con `window.__CITY_TEST__ === true`. Los ganchos del viaje (`__TRIP_IMPORT__`, `__TRIP_SCENE__`) pasan a exigir lo mismo.
- La CSP de `_headers` no se afloja: `blob:` sigue en `script-src` por el viaje. Como la ciudad no usa imágenes, `img-src` pasa a `'none'`. Sin `toDataURL`→`<img>`, sin Workers, sin `'unsafe-eval'`.

## 7. Limpieza (nada sin uso)

**Archivos que se borran:** `city/world.js`, `city/hero3d.js`, `tests/city_world.cjs`, `tests/city_hero.cjs`.

**`three/shared.js`:** sale `mergeBoxes`; se corrige el comentario de cabecera.

**`city/move.js`:** salen `cameraArm`, `rayBox` y el parámetro `camYaw` de `step`; entra `faceOf`; se corrige el comentario de cabecera ("tercera persona").

**`city/input.js`:** salen el arrastre de cámara, `consumeCamera` y Q/Z; entra `consumeZoom`.

**`city/districts.mjs` y `validate.mjs`:** sale `villainsM01` y su regla.

**`city/view.js`:** lo listado en §3.5, el listener `webglcontextlost` y los textos "3D".

**Motor (`engine.html`):**
- `PARTS`, `SLOTS`, `avatarSvg`, `shade`, `lay`, `slotBox`, `unlocked`, `reqText`, `fixLook` (también su llamada al cargar y en `resetyes`), `hex`, el bloque `lookSrc`/`lookNew` de `migrate`, `brandNew` (se usa `fresh`), `hasProgress`, `heroCard` (se reemplaza por el icono), las piezas en `unlocksAt`/`nextUnlockText`/`unlockCount`, las acciones `piece`, `random`, `welcome` y `welcomeclose`, y la tarjeta de bienvenida.
- Estilos: `.piece`, `.pieces`, `.herocard`, `.avwrap`, `.avbtn`, `.lvlbox`, `.herolay`, `.welcome`, `@keyframes breathe`, `.fig`/`.vfig` (los reemplaza el icono), y todo estilo sin selector vivo tras el tema neón.
- Textos: "Recorre la ciudad en 3D" de la tarjeta de Inicio.

**`build.mjs`:** sale la inserción de `world.js` y `hero3d.js`. **`sprites2d.js` y `world2d.js` entran en el ancla `/*__CITY_VIEW__*/`, antes de `view.js`** (ahí ya existe `Three3D`, insertado en `/*__TRIP__*/`).

**Pruebas que se actualizan (dobles y semillas):** los mundos falsos con firma `create(THREE, …)` y `setLook` en `tests/record2.cjs`, `tests/adv/city_fuzz.cjs`, `tests/adv/city_base_attack.cjs` y `tests/city_engine.cjs` (que además deja de comprobar `opts.look` y `portrait`); las semillas con `look`/`welcomed` en `tests/m03.cjs`–`m10.cjs`, `record.cjs`, `city_engine.cjs`, `city_rounds.cjs` y `hero.cjs` se limpian, salvo en `migrate.cjs`, donde quedan como dato viejo que debe borrarse. Las búsquedas "de 3" de `city_rounds.cjs` y `city_base_attack.cjs` pasan a leer el máximo.

**Guarda en `validate.mjs`** (una sola lista cerrada, acotada a la ciudad y al héroe): falla si el HTML generado contiene `avatarSvg`, `PARTS`, `fixLook`, `setLook`, `mergeBoxes`, `cameraArm`, `consumeCamera`, `CityHero`, `welcomed` o una llamada a `loadThree` fuera del bloque del viaje, o si `__CITY_WORLD__`/`__CITY_TEST_API__` aparecen fuera de una condición `__CITY_TEST__ === true`.

## 8. Orden de implementación

1. Medición previa en el teléfono (§3.0).
2. `sprites2d.js` y `world2d.js` con su contrato y sus pruebas, sin conectar.
3. `input.js` (zoom) y `move.js` (`faceOf`, sin `camYaw` ni `cameraArm`).
4. `view.js` conectada al mundo 2D; se borran `world.js` y `hero3d.js`.
5. Batalla (`R.battle.max`, Empate) y virtudes nuevas.
6. Héroe sin editor y `migrate` del héroe.
7. Tema neón y accesibilidad.
8. Limpieza final, guarda de `validate.mjs`, CSP y ganchos del viaje.
9. Humo en Chromium y prueba del usuario en el teléfono.

En cada paso la suite completa queda en verde, incluido `preserve_2d.cjs`. `tests/adv/spec2d_attack.cjs` pasa entero desde el paso 5 (hoy su caso D6 falla a propósito: es el Empate de §4.2).

## 9. Pruebas

- **Nuevas:**
  - `tests/city_world2d.cjs`: canvas y contexto falsos que cuentan llamadas. Un solo rAF; pausa sin cuadros; `resize` suspendido o 0×0 sin redimensionar; `dispose` deja el mapa en 0×0, resuelve `encounter` y no agenda más; mapa ≤ 4 Mpx; solo se dibujan los NPC en pantalla; ≤ 200 partículas; nunca se asigna `shadowBlur` ni `filter`; los flags cambian lo dibujado; `getContext` nulo y `contextlost`.
  - `tests/city_sprites.cjs`: un atlas por tipo, 4 direcciones × 2 cuadros, variantes solo de ids válidos, `paintIcons` tolera `getContext` nulo.
- **Se actualizan:**
  - `city_input.cjs`: pellizco frente a joystick (dedo en el joystick, dedo restante, inicio sobre botón), rueda limitada por tiempo, `ctrlKey`, `+`/`-`, sin cámara.
  - `city_move.cjs` y el oráculo: `faceOf` (4 direcciones y empates), `step` sin `camYaw`, sin `cameraArm`.
  - `city_engine.cjs`: sin `loadThree` en la ciudad, flecha en 4 direcciones y oculta a < 1 m, zoom con límites y NaN, errores 2D con sus textos, guardado periódico solo con movimiento.
  - `three_shared.cjs`: sin `mergeBoxes`.
  - `hero.cjs` y `migrate.cjs`: sin piezas; héroe reconstruido (`look`, `welcomed`, `__proto__` y claves extra desaparecen; nombre recortado a 20).
  - Virtudes: Valentía (4 corazones, Regenerar hasta 4, aria "de 4"), Enfoque (+10 solo si ya se tenía, R.xp = S.xp), Liderazgo (20 al explicar, +5 al corregir), Sabiduría (Memoria fotográfica ×2).
  - Accesibilidad: ✓/✗ y texto oculto en las respuestas, controles ≥ 44 px.
- **Se conservan:** `preserve_2d.cjs`, `spec2d_attack.cjs`, rondas, batalla, migración de `S.city`, ataques y fuzzing (`city_base_attack`, `city_fuzz`, `fuzz_state`, `props`, `attacks`).
- **Humo en Chromium** en 390×844 y 1280×800 con `?fps=1` (p95 y ms de dibujo en el registro); **prueba del usuario en el teléfono** sin ahorro de batería: p95 ≤ 22 ms.
