# CONTRATO DE EJECUCIÓN — Etapa W2 "Villanos, poderes en batalla e interfaz de juego"

Este documento amplía el **modo aventura** de **Estudio ISW** (publicado en `https://claude.ai/artifact/XrNzeFC2euPiF55Pex4ycd`, versión 12). Es autosuficiente: el ejecutor NO necesita los contratos anteriores.

Hasta ahora el modo aventura tiene la plaza central, la Ciudad de los Sistemas (M01) con 19 mentores y la torre del jefe. Esta etapa añade tres cosas:

1. **Villanos** que rondan por la ciudad y se enfrentan en **batallas de preguntas**.
2. **Poderes con efecto visible** en batalla y dos poderes que también sirven al caminar por el mundo.
3. Un **nuevo aspecto de videojuego** para la pantalla de preguntas y de resultados, en todos los modos.

**Plan actualizado:** W2 (este contrato) · W3: las nueve regiones restantes, cada una con sus mentores y villanos · W4: misiones de aldeanos, terminales rotas, minimapa y sonido.

## Reglas para el ejecutor

1. **Cambios aditivos en `engine.html`.** No cambies el contenido de los módulos (`content*.mjs`), los IDs, la clave `estudio_isw_v1`, `S.v` (sigue en 1) ni las reglas de XP, estrellas, cola de repaso, virtudes, jefe y efectos actuales de los poderes. Una batalla es una ronda normal del motor con una capa visual encima: cada respuesta cuenta igual que en un quiz.
2. **Conserva los textos y selectores que usan las pruebas:** `.playtop` (su texto debe seguir siendo `Salir` + `n / total`, sin nada más dentro), `.prompt`, `.opts`, `.opt` con `span.key` y el texto de la opción en el último `span`, `.fb` (y sus clases `good`/`bad`), `#nextbtn`, `.powers`, `[data-pw]`, `.hint`, `.banner.good`/`.banner.bad`, los textos "Correcto, con ayuda", "Escudo: tu racha", "Ronda perfecta", "Jefe superado", "Subiste a nivel", "Nueva virtud", "Volver al mundo" y las teclas 1–9 y Enter. Lo nuevo se añade alrededor, no en lugar de eso.
3. **Diseños originales.** Los villanos son criaturas inventadas con nombres inventados, inspirados en problemas de diseño de sistemas. No imites personajes, villanos, mascotas ni logotipos existentes.
4. **Sin violencia gráfica:** las batallas son de caricatura (destellos, rayos, estrellitas, el villano se encoge y huye). Nadie muere ni sangra.
5. Un solo archivo, sin imágenes ni librerías nuevas; todo se dibuja con código. El archivo no debe crecer más de **90 KB** respecto a la versión 12.
6. Todo el texto visible va en español (México). Respeta las palabras prohibidas del validador (no escribas "Flash" con mayúscula ni palabras que contengan la secuencia "lego").
7. No hagas preguntas; ante una ambigüedad elige la opción más simple y anótala en una línea al final. Respuesta final: máximo 3 líneas.

## Parte A — Archivos, validación y pruebas

- Antes de tocar nada, copia `juego_estudio.html` a tu carpeta temporal como `published_v12.html` y `engine.html` como `engine_v12.html`.
- Trabaja en `/home/claude/juego/engine.html`; genera con `node build.mjs`; valida con `node validate.mjs <ruta>/published_v12.html`.
- `validate.mjs`: los diez bloques de módulo siguen idénticos; cambia el límite de crecimiento para que compare contra `published_v12.html` con 90 KB; añade que existan `function villainSprite`, `function vBattleHud` (o los nombres que uses, documentados en un comentario) y la constante con los seis villanos de B1; y que cada tema de M01 aparezca exactamente en un villano.
- Pruebas en la carpeta temporal `jsd/`: `smoke.cjs`, `hero.cjs`, `world.cjs` y `m03.cjs` a `m10.cjs` deben pasar **sin modificarse**, 10 veces cada una. Crea `jsd/battle.cjs` (Parte D) y ejecútala al menos 10 veces.
- Revisión visual con Playwright (B6) y republicación en la misma URL, sin `icon`, con la descripción "Juego de estudio de ingeniería de software con 10 módulos, modo aventura con villanos, modo héroe y avatar personalizable."

---

# PARTE B — Diseño

## B1. Los villanos de la Ciudad de los Sistemas

Seis villanos. Cada uno representa un problema de diseño de sistemas y lleva sus preguntas de un grupo de temas de M01. Entre todos cubren los 19 temas, sin repetir.

| ID | Nombre | Temas | Frase al encontrarlo | Aspecto (pixel art, unos 20 × 22 px lógicos) |
|---|---|---|---|---|
| `lag` | **Lagartijo Lento** | T01, T02, T03, T04 | "Todo lo que pidas llegará… tarde. Muy tarde." | Lagartija morada con reloj de arena en la espalda; camina dejando un rastro de puntitos. |
| `cuello` | **Cuello de Botella** | T06, T09, T17 | "Por aquí solo pasa una petición a la vez." | Botella verde con brazos cortos y ceño fruncido; el cuello de la botella es su "cabeza". |
| `unico` | **Gólem del Punto Único** | T07, T08, T12 | "Si yo caigo, cae todo. Y no pienso caer." | Gólem de piedra gris con un solo ojo rojo grande al centro y una grieta en el pecho. |
| `cache` | **Fantasma Obsoleto** | T10, T13, T14 | "Lo que sabes ya caducó. Yo me encargué." | Fantasma azul pálido semitransparente con una etiqueta de fecha vieja colgando. |
| `monolito` | **Monolito Gruñón** | T15, T16, T18 | "Todo junto, todo pegado, nada se despliega solo." | Bloque rectangular café oscuro con cara enojada y engranes trabados a los lados. |
| `clon` | **Duplicador** | T05, T11, T19 | "¿Pagaste una vez? Yo hago que pagues dos." | Criatura naranja doble (dos cabezas iguales) que se mueve en zigzag. |

- Constante `VILLAINS` (lista de objetos con `id`, `mod: 'M01'`, `name`, `topics`, `line`, colores y patrulla). Los temas usan los IDs `T01`…`T19` de M01.
- **Sprites:** `villainSprite(id, frame)` dibuja cada villano con rectángulos en un canvas fuera de pantalla, con contorno oscuro de 1 px del color base (nunca negro puro), 2 cuadros de animación (respiración o paso) y una sombra. Se guardan en caché. Para el retrato de batalla se usa el mismo sprite escalado (B3).
- Deben leerse claramente distintos entre sí y del héroe y los mentores: silueta y color propios.

## B2. Villanos en el mapa

- Cada villano patrulla un tramo de **calle** de la ciudad (casillas de camino) de ida y vuelta, de 4 a 6 casillas, a un paso cada 600 ms. Reparte los seis tramos por distintas calles; ninguno pasa frente a la puerta de un mentor ni por la casilla de entrada.
- Se detiene si su siguiente casilla está ocupada por el héroe o es intransitable, y se queda quieto mientras haya un diálogo abierto o el héroe esté a su lado.
- Bloquea el paso como cualquier personaje. Sobre él flota un icono rojo de calavera de caricatura (un círculo con dos puntos y una "x"; nada realista) mientras no esté derrotado.
- **Encuentro:** al interactuar con él (E, Espacio, Enter o "Hablar"), o al elegirlo en el panel "Lugares" (sección nueva "Villanos" que lista los seis con su estado), aparece un diálogo con su retrato, nombre, su frase y los temas que domina ("Domina: T06 Escalabilidad y load balancer, …"), con los botones **"¡A la batalla!"** y **"Mejor después"**.
- **Derrotado:** se guarda en `S.world.beaten[id] = 'AAAA-MM-DD'` (fecha local de hoy, con la función `today()` existente). Mientras su fecha sea la de hoy, no aparece en el mapa; en "Lugares" figura como "Derrotado hoy". Al día siguiente regresa ("¡Volví! ¿Todavía te acuerdas de mí?"), para repasar.
- Contador en la barra del mundo de la ciudad: "Villanos: 2 de 6 derrotados hoy".
- Cuando el héroe vence a los seis el mismo día, el guardián de la torre lo menciona: "Limpiaste la ciudad de villanos. ¡Así se hace!" (además de su texto normal).

## B3. La batalla

Una batalla es una ronda del motor con `kind: 'battle'`, `title: 'Batalla'`, `back: { name: 'world' }` y los datos del villano en `cfg.villain`.

- **Preguntas:** 6, tomadas de los temas del villano, mezclando tipos: hasta 3 de opción múltiple, 1 o 2 de verdadero o falso, y 1 de escenario o de caza el error si los temas las tienen; siempre de temas distintos mientras se pueda. Cada respuesta actualiza historial, estrellas, XP y repaso igual que un quiz (usa `finalize` sin cambios). Las preguntas de verdadero o falso **no** tienen temporizador en batalla.
- **Marcadores:**
  - El **villano** tiene **4 puntos de vida**. Cada respuesta correcta le quita 1.
  - El **héroe** tiene **3 de energía** (corazones). Cada respuesta incorrecta le quita 1, salvo si el poder Escudo protegió esa respuesta.
  - Con 3 aciertos seguidos aparece el texto "¡Combo!" (solo visual; el bono de racha del motor ya existe).
- **Fin anticipado:** la batalla termina en cuanto el villano llega a 0 (**victoria**) o el héroe llega a 0 (**derrota**). Para terminar antes, recorta `R.items` hasta la pregunta actual antes de llamar a `finish()`, para que los resultados cuenten solo las preguntas contestadas. Si se contestan las 6 sin llegar a ningún 0, gana quien tenga más proporción de vida (en la práctica, con 6 preguntas, 4 aciertos dan victoria).
- **Victoria:** "¡Victoria! *Nombre del villano* huyó de la ciudad." Se marca `beaten`. **Derrota:** "*Nombre del villano* escapó esta vez. Habla con los mentores de sus temas y vuelve a intentarlo." No se pierde XP, estrellas ni nada guardado.
- Al volver al mundo (resultados → "Volver al mundo"), el héroe aparece donde estaba y, si ganó, el villano ya no está y sale un destello en su lugar.

### HUD de batalla (`vBattleHud`)
Entre `.playtop` y la barra de progreso, una franja "arena" (no dentro de `.playtop`):
- A la izquierda el héroe (su `heroSprite` mirando a la derecha, escalado ×3 con `image-rendering: pixelated`, dentro de un canvas pequeño) con su nombre y la energía en corazones (♥ llenos y vacíos, con texto accesible "Energía 2 de 3").
- A la derecha el villano (su sprite ×3 mirando a la izquierda) con su nombre y una barra de vida de 4 segmentos ("Vida del villano 3 de 4").
- Animaciones al contestar (CSS, 300–500 ms): acierto → destello y sacudida del villano, número "-1" que sube y se desvanece; fallo → sacudida del héroe y un corazón que se apaga; escudo → un domo azul alrededor del héroe. Con `prefers-reduced-motion` no hay sacudidas ni números flotantes; solo cambian los marcadores.
- Una región `aria-live="polite"` anuncia "Le quitaste 1 de vida a *villano*." o "Perdiste 1 de energía." tras cada respuesta.

## B4. Poderes

### En batalla (y en cualquier ronda)
Los poderes funcionan **exactamente igual que hoy** (mismas condiciones, usos y efectos en XP). Esta etapa solo les da un efecto visual, y en batalla el Escudo además protege la energía:

| Poder | Efecto visual |
|---|---|
| Visión láser | Un rayo turquesa cruza las dos opciones tachadas antes de tacharlas. |
| Telaraña | La tarjeta de la pregunta se "envuelve" con un patrón de hilos y se desliza fuera. |
| Mente detective | La pista aparece con una lupa que se agranda. |
| Supervelocidad | Líneas de velocidad en el temporizador. |
| Escudo | Domo azul alrededor del héroe en el HUD (o del botón del poder fuera de batalla). En batalla, si fallas con el escudo activo, **no pierdes energía**. |
| Regeneración | Brillo verde alrededor de las opciones al reintentar. En batalla, si el reintento acierta, el héroe **recupera 1 de energía** (hasta el máximo de 3). |
| Memoria fotográfica | Los puntos clave aparecen como un "flash" de cámara blanco suave. |
| Teletransportación | La pregunta se desvanece en partículas y aparece la nueva. |

- Todo visual se omite con `prefers-reduced-motion`.
- La barra de poderes muestra el icono existente de cada poder más grande, con el número de usos restantes en una insignia y su nombre debajo.

### En el mundo
Dos poderes ganan un uso al caminar, solo si el héroe ya alcanzó su nivel:
- **Supervelocidad (nivel 5): correr.** Manteniendo Shift (o el nuevo botón táctil "Correr", que se activa y desactiva al tocarlo) el héroe avanza a 70 ms por casilla en lugar de 140 ms, con líneas de velocidad detrás. Sin nivel 5 el botón no aparece.
- **Mente detective (nivel 4): analizar.** En el diálogo de encuentro con un villano aparece "Analizar" (con el icono de la lupa), que muestra cuáles de sus temas tienen menos estrellas ("Su punto débil para ti: T09 Sharding, 0 estrellas") para que el jugador decida si primero habla con ese mentor. Sin nivel 4 la opción no aparece.
- Ninguno se gasta ni afecta XP.

## B5. Nueva interfaz de juego para preguntas y resultados

Se aplica a **todas las rondas** (modo rápido, mundo, repaso, jefe y batalla) y a la pantalla de resultados. El resto del sitio (inicio, módulos, héroe, mundo) queda como está.

**Dirección visual:** "arena de videojuego nocturna". Es un estilo deliberadamente oscuro e igual en tema claro y oscuro (así lo permiten las reglas del sitio para un mundo visual propio), con colores definidos explícitamente.

- Fondo de la vista de ronda y de resultados: azul noche `#141a33` con un patrón sutil de cuadrícula de píxeles o estrellas (CSS, sin imágenes), ocupando todo el ancho visible detrás de la columna.
- Tarjeta de la pregunta: `#1f2850`, borde de 2 px `#3a4580` y sombra inferior marcada de 4 px `#0b1022` (efecto "bloque").
- **Opciones** como botones gruesos de videojuego: fondo `#2a3466`, texto `#f2f4ff`, borde inferior de 4 px más oscuro que baja 2 px al presionar; la insignia `.key` como un cuadro de color con el número (1 cian `#4fd2ff`, 2 amarillo `#ffd23f`, 3 rosa `#ff7ab6`, 4 verde `#7dff9b`, con número oscuro). Al pasar el ratón o con foco, borde dorado `#ffd23f` y un leve brillo.
- **Correcta:** fondo `#1d5c3a`, borde `#3fd16b` y un brillo verde. **Incorrecta:** fondo `#5c1d2a`, borde `#ff5a5f`. **Atenuada** y **tachada** se ven claramente desactivadas.
- **Retroalimentación** `.fb`: panel con título grande ("¡Correcto!" o "¡Incorrecto!", conservando los textos actuales dentro), XP ganado como una insignia dorada que aparece con un pequeño salto, y la explicación en texto normal legible.
- **Encabezados del juego** (chip del tipo de pregunta, "Combo", nombres en el HUD, título de resultados): fuente **Press Start 2P** de Google Fonts, solo para textos cortos de hasta 14 px, con respaldo `ui-monospace, monospace`. Preguntas, opciones y explicaciones siguen en Inter, para que se lean bien.
- Barra de progreso de la ronda como segmentos tipo "barra de experiencia" en dorado.
- **Resultados:** título grande ("¡Ronda completada!", "¡Victoria!", "Derrota" o los textos actuales del jefe), una **calificación** decorativa según el porcentaje (S 100 %, A ≥ 80 %, B ≥ 60 %, C < 60 %) en un sello grande, el XP como contador que sube en 600 ms (sin animación con movimiento reducido) y los botones con el mismo estilo grueso.
- **Contraste:** todo texto cumple AA (4.5:1) sobre su fondo; revísalo con un script que calcule las razones de los pares de colores usados.
- A 400 px de ancho no hay desplazamiento horizontal; botones de al menos 44 px de alto.

## B6. Guardado

- `S.world.beaten` (objeto, por defecto `{}`) se añade en `worldFresh()` y en `migrate()` para progresos anteriores.
- Si `S.world.run` (preferencia de correr activada en táctil) se usa, también va con valor por defecto.
- Nada más cambia en el guardado.

---

# PARTE C — Revisión visual

Con Playwright, sin errores de consola (salvo la carga de fuentes, si el entorno no tiene red) y sin desplazamiento horizontal, en escritorio (1280 × 800) y teléfono (400 × 800), en tema claro y oscuro:
1. La ciudad con al menos dos villanos visibles en pantalla.
2. El diálogo de encuentro con "Analizar" (progreso sembrado de nivel 5 o más).
3. Una batalla antes de contestar, con el HUD completo.
4. Una batalla justo después de acertar, y otra justo después de fallar.
5. Una pregunta del modo rápido (Quiz de M02) con la nueva interfaz y la barra de poderes.
6. Resultados de una victoria y de una ronda normal.

Revisa cada captura antes de publicar: los villanos se distinguen entre sí, el HUD no tapa la pregunta, y los textos se leen bien.

---

# PARTE D — Pruebas y criterios de aceptación

## `jsd/battle.cjs`
Usa el mismo arranque de `world.cjs` (contexto de canvas falso y `requestAnimationFrame` manual, `w.__raf(ms)`). Comprueba como mínimo:

1. En la ciudad, el panel "Lugares" tiene una sección "Villanos" con 6 entradas, y la barra muestra "Villanos: 0 de 6".
2. Elegir a Cuello de Botella abre su diálogo con su frase, la lista "Domina" con T06, T09 y T17, y "¡A la batalla!".
3. Con nivel menor a 4 no hay "Analizar"; con nivel 4 o más sí, y muestra un tema con su número de estrellas.
4. "¡A la batalla!" abre una ronda con `.playtop` en el formato de siempre, el HUD con "Energía 3 de 3" y "Vida del villano 4 de 4", y todas las preguntas de la ronda son de T06, T09 o T17.
5. Contestar bien 4 seguidas termina la batalla con victoria: los resultados dicen "¡Victoria!" y muestran 4 preguntas; `S.world.beaten.cuello` es la fecha de hoy; el historial de esos temas creció.
6. Al volver al mundo, Cuello de Botella figura como "Derrotado hoy", el contador dice "1 de 6" y no está en el mapa (su casilla es transitable).
7. Con `beaten.cuello` de ayer, vuelve a aparecer y saluda con "¡Volví!".
8. Contestar mal 3 seguidas da derrota: "escapó esta vez"; no hay `beaten` para ese villano; el XP no baja.
9. Con nivel 6 o más, activar Escudo y fallar deja la energía en 3 y conserva el aviso "Escudo: tu racha".
10. Con nivel 8 o más, fallar, aceptar Regeneración y acertar sube la energía de 2 a 3.
11. Con nivel 5 o más existe el botón "Correr"; con nivel menor no.
12. Sin errores de consola en todo el recorrido, y un progreso guardado de la versión anterior (sin `beaten`) carga bien.

## Criterios de aceptación
- [ ] Bloques M01 a M10 idénticos a `published_v12.html`; crecimiento de 90 KB o menos; sin imágenes, `fetch` ni librerías nuevas (salvo la fuente Press Start 2P añadida a la hoja de Google Fonts existente).
- [ ] `smoke.cjs`, `hero.cjs`, `world.cjs`, `m03.cjs` a `m10.cjs` pasan sin modificarse; `battle.cjs` pasa 10 de 10.
- [ ] Las rondas de cualquier modo usan la nueva interfaz; las batallas añaden el HUD; los poderes tienen su efecto visual; Supervelocidad y Mente detective funcionan en el mundo según el nivel.
- [ ] Contraste AA comprobado con script; capturas de la Parte C revisadas.
- [ ] Se republica en la misma URL.
