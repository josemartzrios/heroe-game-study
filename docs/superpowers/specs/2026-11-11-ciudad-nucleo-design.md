# Diseño: "Ciudad Núcleo", mundo abierto 3D con protagonista (primer corte: prólogo + capítulo 1)

Fecha: 2026-11-11 · Estado: borrador para revisión · Rama: `feat/ciudad-3d` (parte de `feat/viaje-paquete-3d`)

## 1. Propósito

Convertir Estudio ISW en un juego de mundo abierto 3D en **tercera persona tipo GTA**. **Tu héroe es el protagonista**: recorre una ciudad, **aprende** con mentores, **se pone a prueba** contra criaturas y en retos de campo, y **enseña** a los vecinos. Con eso crece en **rango de carrera** y gana **poderes que abren la ciudad**.

La trama gira en torno al **bien común de la ciudad**, no a ser el mejor.

**Restricciones:**
- Navegador. **Teléfono siempre en vertical** y laptop en horizontal normal.
- Un solo HTML autocontenido (`node build.mjs` → `juego_estudio.html`), sin recursos externos en tiempo de ejecución salvo las fuentes de Google.
- Todo el arte se genera por código: low-poly, sin modelos ni texturas.
- **El contenido de M01 a M10 no cambia**: temas, keyPoints, preguntas e IDs. La clave `estudio_isw_v1` y `v: 1` tampoco.
- **Los exámenes se respetan**: estrellas, repaso, XP y jefes con las reglas actuales. El jefe pide 1 estrella por tema, 20 preguntas, sin pistas ni poderes, y se aprueba con 80 %.
- Diseños originales: sin personajes, marcas ni nombres reconocibles. Se mantiene la lista de palabras prohibidas de `validate.mjs`.
- Texto en español de México.

**Éxito del primer corte:** en un teléfono de gama media, en vertical y a ≥ 30 fps, juegas del prólogo hasta restaurar el distrito de Fundamentos, ganar el poder **Planos** y subir a **Junior**. Todo cuenta en estrellas, repaso y XP igual que en el juego actual.

## 2. Trama

**Ciudad Núcleo** funciona gracias a su software. **La Maraña**, una corrupción que nace del código que nadie entiende y del conocimiento guardado por unos pocos, apaga distrito tras distrito. El héroe llega como **Becario** al **Taller Comunal**, el colectivo de ingenieros que cuida la ciudad. La meta es que **la ciudad vuelva a funcionar y no dependa de una sola persona**. Por eso cada distrito se restaura aprendiendo, poniéndose a prueba y **enseñando a los vecinos**.

En el final (capítulo 11), los aprendices de todos los distritos se unen al ataque contra el corazón de La Maraña.

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

**Rangos** (se calculan a partir de los distritos restaurados; no se guardan):

| Distritos restaurados | Rango |
|---|---|
| 0 | Becario |
| 1 | Junior |
| 3 | Semi-senior |
| 6 | Senior |
| 8 | Arquitecto |
| 11 | Tech Lead |

## 3. Ciclo de juego en un distrito (capítulo 1: Taller Comunal, M02)

M02 tiene 23 temas (T01 Bits… T23 LLMs) y 92 mcq, 76 tf, 16 escenarios y 26 de error.

### 3.1 Aprender con mentores
- Hay **23 mentores**, uno por tema, en puestos y talleres del distrito. Sus nombres salen de la lista `MNAMES` del motor.
- **Hablar** abre la hoja **Lección**: título del tema, `summary` y `keyPoints` con `fmt()`, y botones "Practicar" y "Cerrar".
  - Abrirla cuenta como tema aprendido: se agrega `M02:Txx` a `S.stats.learnTopics` (alimenta la virtud Curiosidad, como `data-act="learn"` hoy).
  - "Practicar" inicia la ronda `quiz` de ese tema con las reglas actuales, y al terminar se vuelve a la ciudad.
- Sobre cada mentor flota un indicador holográfico con sus estrellas (0 a 3).

### 3.2 Ponerse a prueba
- **Criaturas de La Maraña.** Hay 6 en el distrito, con datos en `city/districts.mjs`:

  | Id | Nombre | Temas |
  |---|---|---|
  | `bit` | Bit Errante | T01, T02, T03 |
  | `silicio` | Cuello de Silicio | T04, T05, T10 |
  | `kernel` | Kernel en Pánico | T06, T07, T08, T09 |
  | `eco` | Eco Roto | T12, T13, T14, T15, T16 |
  | `huerfano` | Dato Huérfano | T11, T17, T18, T19, T20 |
  | `alucina` | Alucinación | T21, T22, T23 |

  - Las 6 cubren los 23 temas exactamente una vez.
  - Rondan por un área asignada. Al acercarte (≤ 2.2 m) y pulsar la acción, hay un **encuentro**: la cámara encuadra al héroe frente a la criatura durante ~1 s (al instante con movimiento reducido).
  - Después empieza la **batalla por preguntas actual** (`startRound` con `cfg.villain = { id, name, topics }`, vida 4 y energía 3, poderes permitidos), con 8 preguntas mcq o tf de sus temas.
  - Al ganar se vuelve a la ciudad, la criatura se disuelve en partículas y queda vencida **por hoy**: `S.city.beaten[id] = today()`, como ya hace `beatenToday`.
- **Retos de campo.** Hay 10, fijos en `districts.mjs`. Cada uno es un objeto roto visible (semáforo loco, grúa trabada, terminal con humo, farol apagado…) ligado a un tema que tenga ≥ 2 preguntas de escenario o de error.
  - "Reparar" inicia una ronda con 2 preguntas de ese tema (`scenario` o `error`), con `back` hacia la ciudad.
  - **Se repara si las 2 son correctas.** Entonces se guarda `S.city.repairs[id] = true` y el objeto se ve funcionando. Si no, sigue roto y se puede reintentar.

### 3.3 Enseñar
- Hay **12 puestos de aprendiz** en `districts.mjs`, cada uno ligado a un tema distinto. El aprendiz **solo aparece** si tienes `starsOf(M02, tema) ≥ 1` y no le has enseñado.
- Hay dos formatos, fijados por puesto:
  - **Explicar.** El aprendiz pregunta "¿Me explicas {título del tema}?". Se muestran 6 keyPoints: 3 del tema y 3 de otros temas del distrito, mezclados, con `fmt()`. Eliges 3. **Es correcto si los 3 son del tema.** Da +15 XP directo (`S.xp += 15`, `checkVirtues()`, `save()`); no toca historial ni cola, porque no es una pregunta del banco.
  - **Corregir.** El aprendiz dice algo equivocado: una pregunta `error` del tema, presentada como su explicación. Eliges la corrección. Se registra como una respuesta normal: `touch()` → `xpBase`/`xpWithPassive` → `recordAnswer` → `checkVirtues()` → `save()`.
- Si aciertas, se guarda `S.city.taught[puesto] = true`, el aprendiz se va contento y sube el **medidor de restauración**. Si fallas, el aprendiz se queda y se puede reintentar.

### 3.4 Jefe y restauración
- **Torre del Taller:** su puerta inicia `startRound` con `kind: 'boss'` y `mid: 'M02'`, con las reglas actuales. Si `bossUnlocked(M02)` no se cumple, la hoja dice cuántos temas faltan y cuáles son, con el mismo texto que la pantalla del módulo.
- **El distrito se restaura** cuando `S.boss.M02.passed === true` **y** hay **8 aprendices** enseñados. Entonces:
  - se guarda `S.city.restored.M02 = true` y `S.city.powers.planos = true`;
  - el rango pasa a Junior;
  - se muestra una hoja de celebración;
  - en el mundo, La Maraña se retira del distrito y se construye el puente hacia el Archivo, que muestra "Próximamente".
- **Medidor de restauración:** `0.5 × min(taught, 8) / 8 + 0.5 × (jefe aprobado ? 1 : 0)`, mostrado en %. Cada aprendiz enseñado enciende un farol del distrito.

### 3.5 Objetivo activo (flecha del HUD)
`story.nextObjective(state)` devuelve el primer caso que se cumpla, en este orden:
1. Prólogo no visto → la directora.
2. Mentor de un tema sin lección abierta, en orden T01…T23.
3. Tema con 0 estrellas → su mentor (practicar).
4. Criatura no vencida hoy.
5. Reto sin reparar.
6. Aprendiz disponible.
7. Torre si el jefe está desbloqueado y no aprobado.
8. Distrito restaurado → el puente.

## 4. Ciudad y prólogo

- **Ciudad central:** una plaza (radio ~30 m) con la **sede del Taller Comunal**. Ahí están la directora (Iris), que da el prólogo y las misiones, y el **espejo**, que abre la pantalla actual de "Tu héroe". De la plaza salen 11 caminos a los distritos. Diez terminan en un **muro de La Maraña** (partículas moradas y negras con acento holograma) y un letrero "Próximamente".
- **Distrito Taller Comunal**, al norte de la plaza, de ~120 × 120 m:
  - calles en cuadrícula con ~40 edificios low-poly;
  - 23 puestos de mentor, 6 áreas de criaturas, 10 retos, 12 puestos de aprendiz;
  - la torre del jefe al fondo y el puente (cerrado hasta restaurar) hacia el Archivo.
- **Prólogo:** tres paneles de texto en una hoja sobre la escena (Ciudad Núcleo, La Maraña, llegas al Taller). Tienen botón "Saltar" y se ven una vez (`S.city.prologue = true`).

## 5. Controles, cámara y HUD

- **Cámara en tercera persona:**
  - brazo de 6 m, altura 2.6 m, inclinación por defecto −15°, con límites de −35° a 10°;
  - se acorta si una caja de colisión corta el brazo (prueba rayo contra AABB);
  - se re-centra detrás del héroe al caminar (más suave con movimiento reducido).
  - **En vertical** el héroe va en el tercio inferior (`setViewOffset`) y el FOV horizontal nunca baja de 60°.
- **Teléfono (vertical):**
  - joystick dinámico en el cuarto inferior izquierdo: inclinación < 0.7 camina, ≥ 0.7 corre si el nivel es ≥ 5;
  - arrastrar en el resto de la zona libre gira la cámara;
  - abajo a la derecha, el **botón de acción contextual** (texto según lo cercano: "Hablar con Ana", "Reparar semáforo", "Enseñar a Luis", "Entrar a la torre") y el botón "Correr" desde el nivel 5;
  - si un dispositivo táctil (`pointer: coarse`) está en horizontal con altura < 500 px, aparece el aviso "Gira tu teléfono a vertical" y el juego se pausa.
- **Laptop:** WASD o flechas para moverse, Shift para correr, arrastrar con el mouse para la cámara (sin bloqueo del puntero), E o Enter para la acción y Esc para la pausa.
- **HUD** (área segura): rango, barra de XP y nivel; medidor de restauración; flecha de objetivo. El **menú de pausa** tiene lecciones vistas, Repaso (la ronda `review` actual), Tu héroe y Salir al inicio.
- **Movimiento:**
  - círculo de 0.4 m contra cajas en XZ;
  - velocidad 4 m/s caminando y 7 m/s corriendo, con aceleración de 0.15 s;
  - sin salto (llega en el capítulo 5).
  - Choca con edificios, muros de La Maraña y el borde del mundo.
- **Hojas** (lección, diálogo, enseñar, celebración, pausa):
  - siguen el patrón del viaje: hoja inferior de ≤ 50dvh, foco en su lugar, `aria-live` y confirmaciones con `alertdialog` + `inert`;
  - todo el texto de datos pasa por `esc()` o `fmt()`;
  - el bucle 3D se pausa mientras hay una hoja abierta.

## 6. Arquitectura

### 6.1 Archivos nuevos (los inserta `build.mjs` en la IIFE, como el viaje)

| Archivo | Responsabilidad | Formato |
|---|---|---|
| `city/districts.mjs` | Solo datos: capítulos, rangos, poderes; distrito M02 (mentores, criaturas, retos, aprendices, torre, puente, cajas de colisión, áreas); villanos de M01 guardados para el capítulo 8 | ESM; `build.mjs` lo escribe como `var CITY_DATA = <JSON>` |
| `city/story.js` | Lógica pura del capítulo: `restoration`, `rankOf`, `nextObjective`, `apprenticesAvailable`, `isRestored`, `applyRestore` | `var CityStory = (function(){…})()` + `module.exports` |
| `city/move.js` | Matemática pura: movimiento con aceleración, colisión círculo-AABB, brazo de cámara contra AABB, interactuable más cercano | igual que `story.js` |
| `city/input.js` | Joystick táctil, arrastre de cámara y teclado → `{ mx, mz, run, yawDelta, pitchDelta, action }` | igual; recibe el elemento raíz por parámetro |
| `city/world.js` | Three: plaza, distrito, muros de La Maraña, personajes de una malla con colores por vértice, sombras falsas, indicadores holograma, faroles de restauración | `var CityWorld = …`, recibe `THREE` |
| `city/hero3d.js` | Héroe low-poly a partir de `S.hero.look` y `PARTS`: piel, traje, cabeza con 3 o 4 variantes, capa; animación procedural de caminar y correr | `var CityHero = …`, recibe `THREE` y los colores |

### 6.2 Motor (`engine.html`)
- **Vista `city`:** monta `#city-root` (fuera de `#app`), con el mismo `loadThree()`, un token de generación propio (`cityGen`), `cityStart`/`cityStop`, respaldo sin WebGL y liberación completa al salir.
- **Suspender en lugar de destruir:** al abrir una ronda desde la ciudad (práctica, batalla, reto, corregir, jefe), la ciudad se **oculta y se pausa sin liberarse**. Al terminar, "Volver a la ciudad" la reanuda en el mismo lugar. Solo se libera al ir a Inicio o a un módulo, o con `webglcontextlost`.
- **Inicio:** la tarjeta "Modo aventura" pasa a "Entrar a la ciudad" (`data-act="city"`).
- **Guardado:** `S.city` se guarda al abrir una hoja, al pausar y cada 5 s en movimiento.

### 6.3 Retirar el mundo 2D
- Se eliminan del motor `vWorld`, `worldStart`/`worldStop`/`worldEnter`, `MAPS`, `REGIONS`, los sprites 2D (`heroSprite`, `villainSprite`, `paintSprites` del mundo), los mentores 2D, el diálogo 2D y su teclado, junto con sus estilos.
- **La batalla se conserva como lógica:** `R.battle`, `battleOver` y `vBattleHud`, este último sin los canvas de sprite, con la vida y la energía en HTML más el nombre de la criatura.
- `S.world` se elimina en `migrate()`. `S.world.run` pasa a `S.city.run`.
- **Pruebas:**
  - `tests/world.cjs` y `tests/battle.cjs` se reemplazan por pruebas de ciudad.
  - Los casos de batalla de `tests/record2.cjs` (I5 a I7) se adaptan para iniciar la batalla con una criatura de la ciudad, **sin cambiar sus aserciones de progreso**.
  - `tests/adv/gen.cjs` deja de generar `world`.
- **`validate.mjs`:** deja de exigir `vWorld`, `heroSprite` y `data-act="world"`. Ahora exige `function vCity`, `data-act="city"` y `CITY_DATA`, y valida los datos de la ciudad (§9).

### 6.4 Estado guardado

`S.city` y su normalización en `migrate()`:
```
S.city = { prologue: bool, at: { x, z, yaw }, run: bool,
           beaten: { criaturaId: 'YYYY-MM-DD' }, repairs: { retoId: true },
           taught: { puestoId: true }, restored: { M02: true }, powers: { planos: true } }
```
- Cada campo se normaliza con `plainObj`/`num`/`hex` como en la Tarea 0 del viaje.
- `at` se acota al mundo; si no es válido, vuelve a la entrada de la plaza.
- Lo que no se pueda reparar se descarta.

## 7. Rendimiento

- ≥ 30 fps en gama media, **≤ 80k triángulos visibles, ≤ 150 draw calls** y pixelRatio ≤ 1.5.
- **Geometría estática:** cada distrito combinada en pocas mallas, con un helper propio para fusionar (r169 no trae `mergeGeometries` en el núcleo). Lo repetido (edificios, árboles, faroles) va en `InstancedMesh`.
- **Personajes:** cada NPC es **una sola malla** con colores por vértice; ~45 NPC son ~45 llamadas. El héroe tiene extremidades separadas para animarlas.
- **Luz y efectos:** `MeshLambertMaterial` con colores por vértice, una `HemisphereLight` y una `DirectionalLight`, sin sombras reales (círculos de sombra instanciados). Acentos holograma con materiales unlit y blending aditivo. Niebla a ~60 m.
- **Bucle:** un solo rAF con el `Pauser` del viaje (motivos `sheet`, `hidden`, `suspended`) y dt ≤ 50 ms. `compileAsync` compite contra `webglcontextlost`.
- **Tamaño:** el HTML queda en ~1.8 MB (hoy 1.63 MB). La regla de crecimiento de `validate.mjs` se mide sin el bloque vendor.

## 8. Accesibilidad

- Todo se puede jugar con teclado.
- Las hojas tienen el foco gestionado, `alertdialog` en las confirmaciones, `inert` en lo de atrás y `scrollIntoView` del foco.
- `#city-live` (`aria-live="polite"`) anuncia el distrito al entrar y el objetivo nuevo al cambiar.
- Con movimiento reducido: sin balanceo de cámara, re-centrado suave, encuentro sin animación y criaturas que se disuelven sin partículas.
- El canvas lleva `aria-hidden`; toda la información está en HTML.

## 9. Validación (`validate.mjs`)

- `CITY_DATA` existe y M02 tiene 23 mentores con temas únicos que cubren T01 a T23.
- Las 6 criaturas cubren cada tema de M02 exactamente una vez, y sus nombres no contienen palabras prohibidas.
- Cada reto apunta a un tema con ≥ 2 preguntas de escenario o de error. Hay 12 puestos de aprendiz con temas distintos y existentes; se necesitan 8 para restaurar.
- La tabla de rangos es la de §2, y los villanos de M01 guardados cubren los temas de M01.
- Se mantienen las reglas actuales: bloques MODULE idénticos, hash del vendor y palabras prohibidas sin contar el vendor.

## 10. Pruebas

- **Unitarias (Node):** `tests/city_story.cjs`, `tests/city_move.cjs` y `tests/city_input.cjs` (jsdom mínimo para eventos).
- **Escena real sin WebGL:** `tests/city_world.cjs` con Three r169 y renderer falso. Verifica límites de triángulos y draw calls, un NPC = una malla, materiales permitidos y `dispose` completo, más `tests/city_hero.cjs`.
- **Integración en jsdom:** `tests/city_engine.cjs` con mundo falso (gancho `__CITY_WORLD__`, igual que `__TRIP_SCENE__`). Cubre:
  - entrar, salir y suspender o reanudar en rondas;
  - hablar con un mentor (learnTopics);
  - práctica con vuelta a la ciudad;
  - batalla ganada y perdida (`beaten`);
  - reto reparado y no reparado;
  - enseñar en los dos formatos;
  - jefe bloqueado y desbloqueado;
  - restauración con poder y rango;
  - prólogo una vez;
  - aviso de girar en táctil horizontal;
  - migración de `S.world` a `S.city`.
- **Se adaptan** `record2.cjs` (I5 a I7, batalla desde la ciudad, mismas aserciones) y `tests/adv/gen.cjs`. Se retiran `world.cjs` y `battle.cjs`.
- **Ataque:** `tests/adv/city_fuzz.cjs` (sesiones de eventos al azar: movimiento, acción, hojas, rondas, salir y entrar, contextlost) y propiedades de `story.js`.
- **Humo en Chromium** con WebGL a 390×844 en vertical: entrar, caminar, hablar, batallar y salir, con capturas, fps y draw calls.
- **Manual en el teléfono:** fluidez, joystick, cámara, lectura de las hojas, aviso de girar y salir y entrar 5 veces.

## 11. Hitos de construcción

| Hito | Resultado jugable |
|---|---|
| H1 | Caminar con el héroe por la plaza y el Taller (cámara, controles, colisiones, HUD básico); mundo 2D retirado; `S.city` y migración |
| H2 | 23 mentores con lección y práctica, y vuelta a la ciudad |
| H3 | 6 criaturas con encuentro y batalla; 10 retos de campo |
| H4 | Aprendices (explicar y corregir), torre del jefe, restauración, poder Planos, rango Junior, prólogo y flecha de objetivo |

## 12. Fuera de alcance de este spec

- Capítulos 2 a 11 (un subproyecto por distrito).
- **Contenido de M11** (contenedores y Kubernetes): subproyecto aparte. Yo redacto una guía, el usuario la revisa, y luego vienen preguntas y validación.
- Repaso como "ecos" en la ciudad, mapa o minimapa, sonido y música, salto, viaje rápido.
- "Viaja como paquete" como misión del capítulo 4 (por ahora sigue en la pantalla de M08).
- Batalla final con aprendices.
