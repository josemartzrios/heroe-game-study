# CONTRATO DE EJECUCIÓN — Modo héroe: niveles, avatar, poderes y virtudes

Mejora del motor del juego **Estudio ISW** (publicado en `https://claude.ai/artifact/XrNzeFC2euPiF55Pex4ycd`). Añade niveles por XP, un avatar original de bloques que se personaliza con piezas desbloqueables, superpoderes con efecto en el juego y virtudes de héroe (habilidades blandas) que se ganan con hábitos de estudio.

## Reglas para el ejecutor

1. **Esta vez sí modificas el motor** (`engine.html`). **No toques el contenido de los módulos**: los bloques M01 y M02 deben quedar idénticos byte a byte, igual que sus IDs de pregunta.
2. **No rompas el progreso guardado.** La clave sigue siendo `estudio_isw_v1` y `v: 1`. Solo se añaden campos nuevos; un guardado anterior debe cargar sin perder XP, estrellas, cola de repaso ni jefes.
3. **Propiedad intelectual (obligatorio):** el avatar, sus piezas, los nombres de poderes y las virtudes son **originales**. No uses nombres, logotipos, símbolos, frases célebres ni trajes de personajes de Marvel, DC u otras franquicias, ni el nombre o la figura de LEGO. No combines colores y símbolos que recuerden un traje conocido. Los poderes son arquetipos genéricos (láser, telaraña, velocidad…) y las virtudes son valores humanos, sin atribuirlos a ningún personaje.
4. Todo el texto visible en español (México). No hagas preguntas; ante una ambigüedad elige la opción más simple y anótala en una línea al final. Respuesta final: máximo 4 líneas.
5. Sin librerías nuevas: HTML + CSS + JS vanilla, avatar en SVG inline generado por código. Sigue los tokens de color y tipografía que ya tiene el motor, en tema claro y oscuro.

## Dónde trabajar

- Carpeta `/home/claude/juego/`: `engine.html` (motor con el marcador `/*__MODULES__*/`), `content.mjs` (M01), `content_m02.mjs` (M02), `build.mjs` (genera `juego_estudio.html`), `validate.mjs` (valida contenido; recibe como argumento una copia de la versión publicada para comparar).
- Prueba de flujos en jsdom: `/tmp/claude-0/-home-claude/fdea7e0f-49d4-5a49-b6a4-c0b46809a9df/scratchpad/jsd/smoke.cjs` (`node smoke.cjs` desde esa carpeta).
- Antes de empezar, copia `juego_estudio.html` a la carpeta scratchpad como respaldo de la versión publicada.
- Al terminar, republica `/home/claude/juego/juego_estudio.html` (misma ruta = misma URL).
- **Si la carpeta no existe:** lee el artefacto publicado, aplica los cambios al motor dentro del mismo archivo sin tocar los bloques de módulos y republica en esa URL.

---

# PARTE A — Niveles

## A1. Umbrales de XP

El nivel se calcula siempre a partir de `S.xp` (no se guarda aparte).

| Nivel | XP mínimo | | Nivel | XP mínimo |
|---|---|---|---|---|
| 1 | 0 | | 9 | 2,500 |
| 2 | 100 | | 10 | 3,200 |
| 3 | 250 | | 11 | 4,000 |
| 4 | 450 | | 12 | 5,000 |
| 5 | 700 | | 13 | 6,200 |
| 6 | 1,000 | | 14 | 7,600 |
| 7 | 1,400 | | 15 | 9,200 |
| 8 | 1,900 | | | |

15 es el nivel máximo. En el nivel 15 la barra se muestra llena con el texto "Nivel máximo".

## A2. Dónde se ve

- **Cabecera** (todas las pantallas): avatar en miniatura (28 px), píldora "Nv 4" y una barra delgada de progreso al siguiente nivel con el texto "120 / 200 XP" en `title` y `aria-label`. Tocar el avatar abre la pantalla **Héroe**.
- **Inicio:** tarjeta del héroe arriba de los módulos con avatar grande (120 px), nombre, nivel, barra al siguiente nivel, y el próximo desbloqueo ("Nivel 5: Supervelocidad y capa").
- **Subida de nivel:** se detecta al sumar XP. No interrumpe la ronda: se muestra en la pantalla de resultados como banner "Subiste a nivel N" con la lista de lo desbloqueado (poderes y piezas). Los poderes nuevos se pueden usar desde la siguiente ronda.

---

# PARTE B — Avatar original de bloques

## B1. Figura

SVG con `viewBox="0 0 120 160"`, construido solo con rectángulos redondeados y formas simples. Proporciones propias:

- **Cabeza:** rectángulo de 46 × 42, `rx` 12, centrada arriba, con dos ojos (círculos) y una boca (línea curva corta).
- **Torso:** rectángulo de 52 × 44, `rx` 8, con el emblema centrado.
- **Brazos:** dos rectángulos de 14 × 40, `rx` 7, a los lados del torso, ligeramente inclinados; terminan en un cuadrado redondeado (mano) de 14 × 12.
- **Piernas:** dos rectángulos de 22 × 38, `rx` 6, separados por 4 px, con un rectángulo más oscuro de calzado.
- **Capa** (si se tiene): forma detrás del cuerpo, desde los hombros hasta las rodillas.

El aspecto es de juguete armable genérico, propio de este juego. Cada pieza se dibuja en su propia capa `<g>` con colores tomados de la paleta de piezas (B3), con contorno de 2 px en un tono más oscuro del mismo color para que se lea en tema claro y oscuro. La figura no se anima, salvo un rebote breve al desbloquear una pieza (respetando `prefers-reduced-motion`).

## B2. Ranuras y piezas

Cada ranura tiene piezas; una pieza se desbloquea por nivel (Nv) o por virtud (V, ver Parte D). Lo desbloqueado en el nivel 1 está disponible desde el inicio.

| Ranura | Piezas (desbloqueo) |
|---|---|
| **Piel** | 6 tonos de piel (Nv 1) |
| **Traje** (color de torso y piernas) | Azul acero, Verde bosque, Gris grafito, Arena (Nv 1) · Vino (Nv 3) · Turquesa (Nv 6) · Morado (Nv 9) · Dorado (Nv 15) |
| **Cabeza** | Cabello corto, Cabello largo (Nv 1) · Casco de aviador (Nv 4) · Casco con antena (Nv 8) · Casco de cristal (Nv 12) |
| **Ojos** | Ninguno, Lentes redondos (Nv 1) · Visor láser (Nv 2) · Antifaz (Nv 5) · Gafas de laboratorio (V Curiosidad) · Visor dorado (V Enfoque) |
| **Emblema** | Ninguno, Círculo (Nv 1) · Llaves `{ }` (Nv 2) · Rayo (Nv 5) · Hexágono (Nv 7) · Engrane (V Humildad) · `01` (V Constancia) · Nube (Nv 10) · Etiqueta `</>` (V Sabiduría) · Escudo (V Integridad) |
| **Capa** | Ninguna (Nv 1) · Capa corta (Nv 5) · Capa larga (Nv 11) · Capa con borde (V Valentía) |
| **Accesorio de mano** | Ninguno (Nv 1) · Lanzador de telaraña (Nv 3) · Lupa (Nv 4) · Escudo redondo con un hexágono (Nv 6) · Laptop (Nv 13) · Banda de brazo (V Liderazgo) · Reloj de arena (V Resiliencia) |

Cada emblema es una figura geométrica simple o un símbolo de programación dibujado con trazos, nunca un logotipo existente.

## B3. Paleta de piezas

Define los colores de piezas como constantes del motor (no como tokens de tema): 6 tonos de piel desde claro a oscuro y los 8 colores de traje de B2, cada uno con su tono de contorno 25 % más oscuro. El avatar se ve igual en tema claro y oscuro; solo el fondo detrás de él usa tokens del tema.

## B4. Pantalla Héroe (editor)

Ruta nueva `hero`, accesible desde el avatar de la cabecera y desde la tarjeta del inicio.

- Avatar grande a la izquierda (arriba en móvil), campo **Nombre del héroe** (`input` con `id="hero-name"`, máximo 20 caracteres, por defecto "Héroe"; se escapa al mostrarlo).
- Una sección por ranura con las piezas como botones-muestra. Las bloqueadas aparecen atenuadas con candado y el texto de su requisito ("Nivel 8" o "Virtud: Enfoque"); no se pueden elegir. La elegida tiene borde de acento y `aria-pressed="true"`.
- Botón **Aleatorio** (combina solo piezas desbloqueadas) y el cambio se guarda al instante.
- Debajo: lista de **Poderes** (desbloqueados y bloqueados, con su efecto) y lista de **Virtudes** (ganadas y pendientes, con su condición y progreso, por ejemplo "6 / 10 temas").

---

# PARTE C — Superpoderes

## C1. Reglas generales

- Cada poder desbloqueado tiene **1 uso por ronda**, salvo lo que diga una virtud (Parte D).
- Disponibles en Quiz, Relámpago, ¿Qué usarías?, Caza el error, Repaso y Repasar lo que fallé. **No se pueden usar en el Jefe final** (la barra de poderes no aparece).
- Durante una pregunta se ve una **barra de poderes** debajo del enunciado: un botón por poder desbloqueado con su nombre, un ícono geométrico simple y los usos restantes. Un poder que no aplica a la pregunta actual aparece deshabilitado con un `title` que diga por qué. Después de responder, la barra se oculta.
- Se usan con toque o teclado (los botones son enfocables). No reemplazan las teclas 1–4 ni Enter.

## C2. Lista de poderes

| Poder | Nivel | Efecto | Aplica a | ¿Asistido? |
|---|---|---|---|---|
| **Visión láser** | 2 | Elimina dos opciones incorrectas (quedan la correcta y una incorrecta). Las eliminadas se tachan y se deshabilitan. | mcq, scenario, error | Sí |
| **Telaraña** | 3 | Atrapa la pregunta y la manda al final de la ronda; se responde después. Detiene el temporizador si lo hay. | Todas; no disponible en la última pregunta pendiente | No |
| **Mente detective** | 4 | Muestra una pista: el título del tema y su `summary`. | Todas | Sí |
| **Supervelocidad** | 5 | Suma 6 segundos al temporizador de la pregunta actual. | Solo Relámpago | No (pero esa pregunta no da bono de rapidez) |
| **Escudo** | 6 | Se activa antes de responder; si fallas, tu racha de aciertos consecutivos no se reinicia. Se consume solo si fallas. | Todas | No |
| **Regeneración** | 8 | Si fallas, en lugar de mostrar la respuesta aparece "Fallaste. ¿Usar Regeneración e intentar otra vez?" con dos botones. Si aceptas, la opción elegida queda tachada y vuelves a elegir. Solo se ofrece si tienes el uso disponible. | mcq, scenario, error | Sí, si aciertas en el segundo intento |
| **Memoria fotográfica** | 10 | Despliega los `keyPoints` del tema dentro de la tarjeta de la pregunta. | Todas | Sí |
| **Teletransportación** | 12 | Cambia la pregunta por otra del mismo tema y tipo que no esté en la ronda. Deshabilitado si no hay otra disponible. | Todas | No |

## C3. Puntuación de una respuesta asistida

Una respuesta es **asistida** si antes de responderla se usó Visión láser, Mente detective o Memoria fotográfica, o si se acertó en el segundo intento con Regeneración.

- **Acierto asistido:** da el **50 %** del XP que correspondería, redondeado hacia abajo, incluido el bono de racha. Mantiene la racha de aciertos consecutivos.
- En el historial del tema (`S.topics`) se registra **0.5** en lugar de 1. Las estrellas siguen usando el promedio de los últimos 10.
- **Cola de repaso:** un acierto asistido **no** cuenta como uno de los 2 aciertos para salir de la cola, y si la pregunta no estaba en la cola, **entra** en ella.
- Un fallo con o sin poderes se trata como un fallo normal.
- En la pantalla de resultados se muestra cuántas respuestas fueron asistidas y qué poderes se usaron.

---

# PARTE D — Virtudes de héroe (habilidades blandas)

Valores que muestran los héroes clásicos, ganados con hábitos de estudio. Se ganan una sola vez y quedan para siempre. Al ganar una, la pantalla de resultados (o el inicio, si se gana ahí) muestra un banner con su nombre, una frase original que explica la virtud y lo que desbloquea.

| Virtud | Cómo se gana | Recompensa |
|---|---|---|
| **Constancia** | Racha de 3 días seguidos estudiando | Emblema `01` · pasivo: +10 % de XP mientras tu racha sea de 3 días o más |
| **Curiosidad** | Abrir "Aprender" en 10 temas distintos (de cualquier módulo) | Gafas de laboratorio · Mente detective tiene 2 usos por ronda |
| **Humildad** | Sacar 10 preguntas de la cola de repaso | Emblema engrane · pasivo: +5 XP por cada acierto en el modo Repaso |
| **Valentía** | Intentar un Jefe final por primera vez (aprobado o no) | Capa con borde |
| **Enfoque** | Completar una ronda perfecta de 8 preguntas o más, sin respuestas asistidas | Visor dorado |
| **Integridad** | Completar 10 rondas sin usar ningún poder | Emblema escudo · pasivo: las rondas en que no usas poderes dan +10 % de XP |
| **Resiliencia** | Aprobar un Jefe final que antes reprobaste | Reloj de arena · Escudo tiene 2 usos por ronda |
| **Liderazgo** | Aprobar el Jefe final de cualquier módulo | Banda de brazo |
| **Sabiduría** | Llegar a 100 % de dominio en un módulo | Etiqueta `</>` |

Los pasivos de XP se suman entre sí con un tope de **+20 %** y se aplican a las respuestas no asistidas. Las frases de cada virtud son originales y cortas; ninguna cita ni parafrasea frases célebres de personajes.

---

# PARTE E — Datos y migración

Añade a `fresh()` (y, por tanto, a cualquier guardado anterior al cargar):

```js
hero: {
  name: "Héroe",
  look: { skin: 0, suit: 0, head: 0, eyes: 0, emblem: 0, cape: 0, hand: 0 },  // índices de pieza
  welcomed: false
},
virtues: {},              // { constancia: <timestamp>, ... }
stats: { learnTopics: [], cleared: 0, roundsNoPower: 0, bossFailed: {} }
```

- `load()` ya rellena las claves de nivel superior que falten; además rellena las subclaves faltantes de `hero.look` y `stats`.
- Si una pieza elegida está bloqueada (por ejemplo, tras reiniciar), se cambia a la primera desbloqueada de su ranura.
- La primera vez que alguien con progreso anterior abre el juego (`welcomed: false`), el inicio muestra una tarjeta "Llegó el modo héroe" con su nivel actual y lo que ya tiene desbloqueado, y un botón **Crear mi héroe** que abre el editor. Al cerrarla, `welcomed` pasa a `true`.
- "Reiniciar progreso" también reinicia héroe, virtudes y estadísticas.

---

# PARTE F — Criterios de aceptación

Verifica antes de entregar. Amplía `validate.mjs` y `smoke.cjs`:

- [ ] Los bloques M01 y M02 son idénticos a la versión publicada (compara contra el respaldo). Ambos módulos siguen funcionando.
- [ ] Un guardado de la versión anterior (sin `hero`, `virtues` ni `stats`) carga con el mismo XP, estrellas, cola y jefes, y muestra la tarjeta de bienvenida una sola vez.
- [ ] El nivel corresponde a la tabla A1 en los límites (99 → 1, 100 → 2, 9,199 → 14, 9,200 → 15).
- [ ] Cada poder: aparece solo desde su nivel, tiene un uso por ronda, aplica solo donde dice C2 y no aparece en el Jefe final.
- [ ] Efectos verificados en prueba: Láser deja exactamente 2 opciones activas y una es la correcta; Telaraña mueve la pregunta al final; Supervelocidad suma 6 s; Escudo conserva la racha tras un fallo; Regeneración permite un segundo intento sin revelar la respuesta; Teletransportación cambia la pregunta por otra del mismo tema y tipo.
- [ ] Puntuación asistida según C3: 50 % de XP, 0.5 en el historial y entrada a la cola de repaso.
- [ ] Cada virtud se gana con su condición y aplica su recompensa; el tope de +20 % se respeta.
- [ ] El editor solo deja elegir piezas desbloqueadas, guarda al instante y el avatar se dibuja en cabecera, inicio y editor.
- [ ] El archivo no contiene `Marvel`, `DC Comics`, `LEGO`, ni nombres de personajes de franquicias (búscalos con un script: al menos Spider, Batman, Superman, Cyclops, Wolverine, Hulk, Iron Man, Thor, Wonder Woman, Flash, Avengers, X-Men).
- [ ] Sin errores de consola; funciona sin `localStorage`; usable a 360 px y con teclado.
- [ ] Se republica en la misma URL.
