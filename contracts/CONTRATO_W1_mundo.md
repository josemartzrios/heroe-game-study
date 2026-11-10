# CONTRATO DE EJECUCIÓN — Etapa W1 "Modo aventura: motor del mundo, héroe mejorado y primera región"

Este documento añade al juego **Estudio ISW** (10 módulos + modo héroe, publicado en `https://claude.ai/artifact/XrNzeFC2euPiF55Pex4ycd`) un **modo aventura**: un mundo 2D visto desde arriba donde el héroe camina y **aprende hablando con mentores**. Es la primera de cuatro etapas. Es autosuficiente: el ejecutor NO necesita los contratos anteriores.

**Plan completo (solo W1 se ejecuta ahora):**
- **W1 (este contrato):** motor del mundo, sprite del héroe, retrato del héroe mejorado, plaza central y la región de M01 completa.
- W2: misiones de aldeanos (escenarios), terminales rotas (caza el error), repaso como "ecos" que reaparecen.
- W3: las nueve regiones restantes, cada una con su estilo.
- W4: minimapa, sonido opcional y pulido.

## Reglas para el ejecutor

1. **Esta etapa sí modifica `engine.html`**, pero solo de forma aditiva. No cambies el contenido de los módulos (`content*.mjs`), los IDs, la clave `estudio_isw_v1`, `S.v` (sigue en 1), las reglas de XP, estrellas, poderes, virtudes ni jefe. Los modos actuales (Aprender, Quiz, Relámpago, ¿Qué usarías?, Caza el error, Repaso, Jefe) siguen funcionando igual y pasan a llamarse, en conjunto, **modo rápido** (solo en textos nuevos; no renombres botones existentes).
2. **Un solo archivo, sin recursos externos.** Todo el arte (mapa, sprites, mentores) se dibuja con código en `<canvas>` o SVG. Sin imágenes, sin librerías nuevas, sin `fetch`. El archivo publicado no debe crecer más de 120 KB respecto a la versión actual.
3. **Exploración tranquila, sin combate.** No hay vida, daño, enemigos ni tiempo límite en el mundo. Se aprende hablando con mentores; el reto es la ronda de preguntas que el mentor ofrece (las rondas existentes del motor).
4. **Nada de personajes, marcas ni diseños reconocibles**: los mentores, edificios y el héroe son originales. Los mentores no llevan nombres de personas reales.
5. Todo el texto visible va en español (México). Respeta la revisión de palabras prohibidas del validador (no escribas "Flash" con mayúscula ni palabras que contengan la secuencia "lego").
6. No hagas preguntas; ante una ambigüedad elige la opción más simple y anótala en una línea al final. Respuesta final: máximo 3 líneas.

## Parte A — Archivos, respaldo, validación y pruebas

- Antes de tocar nada, copia `juego_estudio.html` a tu carpeta temporal como `published_v11.html` y `engine.html` como `engine_v11.html`.
- Trabaja en `/home/claude/juego/engine.html`; genera con `node build.mjs` y valida con `node validate.mjs <ruta>/published_v11.html`.
- `validate.mjs`: los diez bloques de módulo deben seguir **idénticos** a `published_v11.html` (extiende la lista de comparación a M01–M10). Añade comprobaciones: existen `function vWorld`, `function heroSprite` (o equivalente nombrado en B4) y la cadena `data-act="world"`; el archivo publicado no supera en más de 120 KB a `published_v11.html`; no hay `<img`, `fetch(` ni `new Image` en el motor.
- Pruebas en la carpeta temporal `jsd/` (`smoke.cjs`, `hero.cjs`, `m03.cjs` a `m10.cjs`): **todas deben seguir pasando sin cambios**, 10 veces cada una.
- Crea `jsd/world.cjs` (detalles en la Parte D) y ejecútala al menos 10 veces.
- Republica `/home/claude/juego/juego_estudio.html` en la misma URL (sin `icon`), con descripción "Juego de estudio de ingeniería de software con 10 módulos, modo aventura, modo héroe y avatar personalizable."

---

# PARTE B — Diseño

## B1. Cómo entra el jugador

- **Inicio:** encima de la lista de módulos, una tarjeta destacada "Modo aventura" con el texto "Explora el mundo y aprende hablando con mentores." y un botón `data-act="world"` "Entrar al mundo". La primera vez abre la **plaza central**; después, el último lugar visitado.
- **Vista de módulo de M01:** un botón "Explorar esta región" (`data-act="world" data-id="M01"`) que abre la región de M01 junto a su entrada.
- Dentro del mundo, una barra superior con: botón "← Salir al inicio", nombre del lugar (por ejemplo "Ciudad de los Sistemas"), dominio del módulo en % y un botón "Lugares" (ver B6).
- La cabecera normal del juego (XP, días, nivel, avatar) se mantiene arriba.

## B2. Vista `world` y ciclo de dibujo

- Añade la vista `world` a `render()`: `vWorld()` devuelve el HTML del contenedor (barra superior, `<canvas>`, caja de diálogo vacía, controles táctiles y panel de lugares oculto). Después de `app.innerHTML = h`, si `V.name === 'world'` se inicia el mundo (`worldStart()`); al cambiar a cualquier otra vista, el ciclo se detiene (`worldStop()`).
- **Mientras se está en el mundo, no se llama a `render()`** para los diálogos ni los menús: la caja de diálogo y los paneles se actualizan en sus propios nodos, para no destruir el canvas.
- Ciclo con `requestAnimationFrame`, solo mientras `V.name === 'world'` y la pestaña está visible (`document.hidden` → pausa). Sin `setInterval`. Paso de tiempo con `dt` limitado a 50 ms.
- **Resolución:** casilla lógica de **16 px**. El canvas ocupa el ancho de la columna y una altura de `min(62vh, 520px)` (mínimo 260 px). La escala de dibujo es un entero (2 o 3) elegido para que se vean unas 15 casillas de ancho en escritorio y unas 11 en el teléfono; `imageSmoothingEnabled = false`; tamaño interno del canvas multiplicado por `devicePixelRatio`, con un máximo de 2.
- **Rendimiento:** la capa fija de cada mapa (suelo, caminos, edificios, decoración) se pinta **una vez** en un canvas fuera de pantalla a resolución lógica y en cada cuadro se copia solo la porción visible con `drawImage`. Los sprites del héroe y de los mentores se guardan en caché (B4). Objetivo: 60 cuadros por segundo en una laptop normal; nada pesado por cuadro.
- **Sin canvas:** si `getContext('2d')` devuelve `null`, el mundo no falla: muestra el aviso "Tu navegador no puede dibujar el mapa; usa la lista de lugares." y abre el panel de lugares (B6), que permite todo lo mismo sin mapa.
- Tema claro y oscuro: el canvas usa su propia paleta (B5), igual en ambos temas; la interfaz alrededor (barra, diálogo, botones) usa los tokens existentes.

## B3. Movimiento e interacción

- **Movimiento por casillas** (estilo RPG clásico): el héroe avanza de casilla en casilla con una transición suave de 140 ms; mientras se mantiene la tecla sigue caminando. Cuatro direcciones; si se gira sin poder avanzar, solo cambia de dirección.
- **Teclado** (solo con `V.name === 'world'`, sin modificadores y sin el foco en un campo de texto): flechas o WASD para moverse; **E, Espacio o Enter** para hablar o interactuar con lo que tiene enfrente; **Esc** cierra el diálogo o el panel abierto. Las teclas de movimiento llaman a `preventDefault` para que la página no se desplace.
- **Táctil y ratón:** debajo del canvas, una cruceta de cuatro botones (mantener presionado = caminar, con `pointerdown`/`pointerup`/`pointercancel`/`pointerleave`) y un botón "Hablar". Se muestran siempre en pantallas táctiles (`(pointer: coarse)`) y en escritorio quedan visibles pero compactos. Los botones tienen `aria-label` ("Mover arriba", etc.).
- **Colisiones:** paredes, edificios, decoración, agua y mentores bloquean el paso. Las puertas de edificio no se cruzan (el mentor está afuera).
- **Interactuar:** si la casilla de enfrente tiene un mentor, un letrero o un portal, se abre su diálogo. Cuando el héroe está junto a algo interactivo aparece un pequeño indicador "E" sobre él (o "Toca Hablar" en táctil).
- La posición y dirección del héroe se guardan en `S.world` (B8) al cambiar de mapa, al abrir un diálogo y al salir del mundo; no en cada paso.

## B4. El héroe: sprite del mundo y retrato mejorado

### Sprite del mundo (`heroSprite(look, dir, frame)`)
- Pixel art dibujado con rectángulos en un canvas fuera de pantalla de **16 × 24 px lógicos** (ocupa una casilla y sobresale media casilla hacia arriba), con una sombra elíptica suave bajo los pies.
- **Cuatro direcciones** (abajo, arriba, izquierda, derecha) y **cuatro cuadros de caminata** (quieto, paso izquierdo, quieto, paso derecho) a unos 8 cuadros por segundo al moverse; quieto, un balanceo de 1 px cada segundo.
- Se construye con las mismas piezas del editor (`PARTS` y `S.hero.look`):
  - **Piel** y **traje** con sus colores (`f` relleno, `s` sombra); contorno de 1 px en un tono oscuro del color de cada parte (con `shade`), nunca negro puro.
  - **Cabeza:** cabello corto o largo (largo cae por los lados y la espalda); casco de aviador (café con gafas en la frente), casco con antena (gris con antena de 2 px y punto que parpadea suavemente), casco de cristal (burbuja translúcida con un brillo).
  - **Ojos:** en las vistas de frente y de lado, lentes, visor láser (franja turquesa), antifaz, gafas de laboratorio o visor dorado. De espaldas no se ven.
  - **Emblema:** un detalle de 3 × 3 px claro en el pecho, solo de frente.
  - **Capa:** detrás del cuerpo; se ve sobre todo de espaldas y de lado, y ondea 1 px al caminar. La capa con borde lleva el borde dorado.
  - **Accesorio de mano:** una versión mínima (lupa, escudo, laptop, reloj de arena, lanzador o banda) en la mano visible.
- Caché por combinación de `look + dir + frame`; se regenera solo si cambia el look.

### Retrato mejorado (`avatarSvg`)
- Rediseña el dibujo de `avatarSvg` **conservando su firma** `avatarSvg(look, size, vb, label)`, el `viewBox` por defecto `0 0 120 160`, el atributo `role`/`aria-label` y que **todas las piezas de `PARTS` sigan representadas** (no quites ninguna opción).
- Mejoras: proporciones más heroicas (hombros más anchos, cintura marcada), **cuello**, **orejas**, **cejas**, nariz sugerida, mejillas con un toque de color; cabello con mechón y volumen; traje con **cuello, cinturón y botas con suela**; manos con forma (no rectángulos); **sombreado** en un lado de cada pieza (capa semitransparente del tono `s`) y **brillos** suaves (blanco con opacidad 0.2–0.3); contornos uniformes en un tono oscuro de cada parte.
- **Sin `<defs>` ni `id`** dentro del SVG (en la página hay varios avatares a la vez y los `id` chocarían): todo el sombreado se hace con formas y opacidad, sin degradados por referencia.
- En la pantalla Héroe, el retrato grande tiene una animación de respiración suave (escala vertical 1–1.5 %, 3 s) que se desactiva con `prefers-reduced-motion` (la regla global existente ya lo hace).
- El avatar pequeño de la cabecera debe seguir viéndose claro a 28 px.

## B5. Mapas

### Generador común
- Los mapas se generan con código y un **generador pseudoaleatorio con semilla** (por ejemplo mulberry32 con la semilla derivada del ID del mapa), así que siempre salen iguales.
- Tipos de casilla mínimos: suelo, suelo con variación, camino, agua, muro/valla, edificio (techo y pared), puerta, decoración bloqueante, decoración no bloqueante (flores, piedritas), portal y letrero.
- Debe servir para cualquier módulo (W3 lo reutilizará): recibe el módulo y una **paleta de región** y coloca un mentor por tema.

### Plaza central (`hub`)
- Mapa de unas 26 × 20 casillas: una plaza con fuente al centro (agua decorativa con brillo animado de bajo costo) y **diez portales**, uno por módulo, en dos filas, cada uno con un letrero que muestra su ID.
- **Letrero:** al interactuar muestra el título del módulo, su dominio en % y el estado del jefe.
- **Portal de M01:** abierto (anillo de color animado); al interactuar se entra a la Ciudad de los Sistemas, junto a su entrada.
- **Portales de M02 a M10:** cerrados (gris, sin animación). Al interactuar: "Esta región abrirá pronto. Mientras, puedes practicar el módulo en el modo rápido." con botones "Ir al modo rápido" (abre la vista del módulo) y "Cerrar".
- El héroe aparece por primera vez frente a la fuente; un letrero de bienvenida junto a él explica los controles: "Camina con las flechas o WASD. Habla con E, Espacio o Enter. En el teléfono usa los botones."

### Región M01 — "Ciudad de los Sistemas"
- Estilo: ciudad tecnológica con calles de concreto claro, pasto entre manzanas, **racks de servidores** y **antenas** como decoración bloqueante, faroles, y edificios de techos azules y grises con ventanas iluminadas.
- Paleta sugerida (ajústala para que se lea bien): pasto `#7fb069`/`#6fa05b`, camino `#d9d4c7`, borde de camino `#b9b2a3`, pared `#e8e3d8`, techo A `#3d6fa8`, techo B `#5b6270`, ventana `#ffd76a`, rack `#2f3947` con luces `#3fd16b`, agua `#4a9fd8`.
- **Distribución:** los temas de M01 (19) se reparten en **parcelas** de 8 × 7 casillas organizadas en una cuadrícula de 4 columnas, separadas por calles de 2 casillas. Cada parcela tiene una casa de 4 × 3 con puerta, y el **mentor de pie frente a la puerta**, mirando hacia abajo. Una placa junto a la casa muestra el ID del tema (`T01`…).
- **Entrada** al sur, con un portal de regreso a la plaza. **Torre del jefe** al norte, centrada: edificio más alto (5 × 4) con una puerta sellada.
- Las parcelas siguen el orden de los temas desde la entrada hacia el norte, para sugerir una ruta, pero todo el mapa está abierto desde el principio.

## B6. Mentores y diálogo

- **Un mentor por tema.** Nombre: un nombre de pila de una lista fija de 20 nombres en español (por ejemplo Ana, Bruno, Carla, Diego, Elena, Fermín, Gala, Héctor, Inés, Joaquín, Karla, Luis, Marta, Nico, Olga, Pablo, Rosa, Sergio, Tere, Víctor), asignado por posición del tema, más su papel: "Mentora de *título del tema*" o "Mentor de *título del tema*".
- **Sprite del mentor:** el mismo generador del héroe con un `look` derivado de la semilla del tema (solo piezas de nivel 1, sin capa), para que cada uno se vea distinto; mira hacia el héroe al hablar.
- **Marcador sobre el mentor:** un "!" amarillo si nunca has hablado con él; después, sus **estrellas del tema** (0 a 3, con `starsOf`) en pequeño.
- **Caja de diálogo** (DOM, debajo o encima del canvas, `role="dialog"`, `aria-live="polite"`, foco en su primer botón): retrato pequeño del mentor (usa el sprite escalado o `avatarSvg` con su look), nombre y texto. Avanza con "Siguiente" (o E/Espacio/Enter); "Saltar" lleva directo al menú.
  1. Saludo: "Hola, *nombre del héroe*. Soy *nombre*. Te voy a contar sobre *título del tema*."
  2. El `summary` del tema.
  3. Un `keyPoint` por pantalla, con su formato (`fmt`: negritas y código), con un contador "Punto 2 de 5".
  4. Menú: **"Ponme a prueba"** (ronda `quiz` de ese tema), **"Explícame otra vez"** (vuelve al paso 2) y **"Hasta luego"**. Si el tema tiene preguntas de `scenario` o `error`, añade también "¿Qué usarías?" o "Caza el error" para ese tema.
- Al terminar de leer todos los puntos clave por primera vez, el tema cuenta como aprendido exactamente como hoy en el modo Aprender (`S.stats.learnTopics` y `checkVirtues()`), y se marca `S.world.talked['M01:T01'] = true`.
- **Si vuelves a hablar** con un mentor con quien ya hablaste, el saludo cambia ("¡Volviste, *héroe*! ¿Repasamos o te pongo a prueba?") y se va directo al menú (con "Explícame otra vez" disponible).
- **Panel "Lugares"** (accesible y alternativa sin canvas): lista de los mentores de la región actual con ID, título y estrellas, más los letreros y portales. Elegir uno **lleva al héroe a la casilla frente a él** y abre su diálogo. En la plaza lista los diez portales.

## B7. Rondas desde el mundo y la torre del jefe

- Las rondas se lanzan con el `startRound` existente, con `back: { name: 'world' }`. Al terminar, la pantalla de resultados funciona igual; su botón de volver regresa al mundo, **frente al mismo mentor**, con la posición guardada. "Salir" a mitad de ronda también vuelve al mundo.
- Al volver tras una ronda, el mentor dice una línea según el resultado: 80 % o más "¡Excelente! Dominas este tema."; entre 50 % y 79 % "Vas bien. Repasa los puntos clave y vuelve a intentarlo."; menos de 50 % "Escucha otra vez la explicación y lo intentamos de nuevo." Después, el menú.
- **Torre del jefe:** al interactuar con la puerta:
  - Si `bossUnlocked(m)` es falso: "La torre se abre cuando tengas al menos una estrella en todos los temas. Te faltan *n*." y la lista de los temas sin estrella (botón para ir a cada mentor con el panel de lugares).
  - Si es verdadero: el guardián (un sprite propio, con armadura gris y capa morada) dice "Veinte preguntas de toda la ciudad. Necesitas 80 % para superarme." con "Enfrentar al jefe" (ronda `boss` existente) y "Todavía no".
  - Si el jefe ya se superó, la torre muestra un estandarte dorado y el guardián felicita al héroe.

## B8. Guardado

- Nuevo campo `S.world`, con valor por defecto en `fresh()` y en `migrate()` (para progresos guardados antes de esta etapa):
  `{ at: 'hub', pos: {}, talked: {} }`, donde `pos[mapa] = { x, y, d }` (d = 'down' | 'up' | 'left' | 'right').
- Si una posición guardada cae en una casilla bloqueada o fuera del mapa, se usa el punto de entrada de ese mapa.
- "Reiniciar progreso" también reinicia `S.world` (ya ocurre si `brandNew()` usa `fresh()`).
- El editor del héroe, el nombre y el look se reflejan en el mundo al volver a entrar.

---

# PARTE C — Accesibilidad y teléfono

- Todo lo que se puede hacer en el mapa se puede hacer con el panel "Lugares" y el teclado, sin ver el canvas.
- El canvas tiene `role="img"` y un `aria-label` que dice el lugar y lo que hay enfrente ("Ciudad de los Sistemas. Frente a ti: Mentora de Escalabilidad."), actualizado al detenerse.
- Botones táctiles de al menos 44 × 44 px; la cruceta no tapa el canvas. A 400 px de ancho no hay desplazamiento horizontal.
- `prefers-reduced-motion`: sin balanceo, sin brillo del agua ni anillos animados; la caminata se mantiene (es necesaria para entender el movimiento) pero sin transición si el usuario lo prefiere (salto de casilla en casilla).

---

# PARTE D — Pruebas y criterios de aceptación

## `jsd/world.cjs`
Basada en el `boot` de `smoke.cjs`. En `beforeParse`: sustituye `HTMLCanvasElement.prototype.getContext` por una función que devuelve un contexto falso (un `Proxy` cuyas propiedades son funciones vacías, `measureText` devuelve `{ width: 0 }` y `canvas` apunta al elemento) y sustituye `requestAnimationFrame` por una cola que la prueba ejecuta a mano con tiempos crecientes (`w.__raf(ms)`). Comprueba como mínimo:

1. El inicio muestra el botón "Entrar al mundo" y no hay errores de consola.
2. Entrar abre la plaza: hay `canvas`, botón "Lugares" y la cruceta; `S.world.at === 'hub'` tras salir.
3. Mantener la flecha derecha (eventos `keydown`/`keyup` en `document` y varios pasos de `__raf`) cambia la posición guardada al salir.
4. El panel "Lugares" de la plaza lista 10 portales; el de M02 muestra el aviso de región cerrada.
5. Entrar a M01 desde el panel: el panel lista 19 mentores.
6. Hablar con el mentor de T01 recorre saludo, resumen y todos sus puntos clave; al final `S.stats.learnTopics` contiene `M01:T01` y `S.world.talked['M01:T01'] === true`.
7. "Ponme a prueba" abre una ronda (`.prompt` visible); al contestar bien todas y volver, se está de nuevo en el mundo (canvas presente), el mentor muestra la línea de "¡Excelente!" y `starsOf` del tema es mayor que 0.
8. La torre del jefe sin estrellas muestra el aviso con "Te faltan"; con un progreso sembrado con estrellas en los 19 temas, ofrece "Enfrentar al jefe" y abre una ronda de 20 preguntas.
9. Con `getContext` devolviendo `null`, el mundo muestra el aviso y el panel de lugares, sin errores de consola.
10. Un progreso guardado sin `world` (de la versión anterior) carga sin errores y conserva XP, héroe y estrellas.
11. Al salir del mundo, la cola de `requestAnimationFrame` deja de recibir nuevas peticiones (el ciclo se detuvo).

## Criterios de aceptación
- [ ] Los bloques M01 a M10 son idénticos a `published_v11.html`; el archivo creció 120 KB o menos; no hay imágenes, `fetch` ni librerías nuevas.
- [ ] `smoke.cjs`, `hero.cjs`, `m03.cjs` a `m10.cjs` pasan sin modificarse; `world.cjs` pasa 10 de 10 veces.
- [ ] El modo rápido funciona igual que antes; el progreso guardado de antes se conserva.
- [ ] En el navegador: la plaza y la ciudad se ven nítidas (pixel art sin difuminar), el héroe camina en cuatro direcciones con su look, los mentores tienen "!" o estrellas, y el retrato mejorado se ve en la pantalla Héroe y en la cabecera.
- [ ] Revisión visual con Playwright: capturas de la plaza, la ciudad, un diálogo abierto y la pantalla Héroe, en escritorio (1280 × 800) y teléfono (400 × 800), en tema claro y oscuro; sin errores de consola y sin desplazamiento horizontal. Revisa las capturas antes de publicar.
- [ ] Se republica en la misma URL.
