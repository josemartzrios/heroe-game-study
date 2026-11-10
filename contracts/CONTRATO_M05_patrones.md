# CONTRATO DE EJECUCIÓN — Módulo M05 "Patrones de diseño"

Este documento añade un módulo al juego **Estudio ISW** ya publicado (módulos M01 a M04 + modo héroe). Es autosuficiente: el ejecutor NO necesita la guía original ni los contratos anteriores.

## Reglas para el ejecutor

1. **Solo añades el módulo M05.** No modifiques el motor (`engine.html`), el modo héroe, los módulos M01 a M04, los IDs existentes ni la clave de `localStorage` (`estudio_isw_v1`): el progreso guardado depende de ellos.
2. **La Parte B es la única fuente de verdad.** No agregues patrones, nombres de clases, fechas ni ejemplos que no estén ahí. Si un hecho no aparece en la Parte B, no lo preguntes.
3. Todo el texto visible va en español (México). Los nombres de los patrones y de sus participantes se quedan como aparecen en la Parte B (Builder, Factory Method, Director, Invocador, Receptor...).
4. El validador rechaza ciertas palabras en todo el archivo (nombres de marcas de cómics y juguetes). No escribas "Flash" con mayúscula ni palabras que contengan "lego" sin acento (por ejemplo "llego", "delego" o "colegio"; "delega" y "delegar" sí se pueden usar). Si el validador marca una palabra, cambia la redacción de M05; no toques esa lista.
5. **Ningún enunciado (`prompt`) de M05 puede ser idéntico a uno de M01 a M04.** M04 ya pregunta por clases, herencia, encapsulamiento y polimorfismo: redacta distinto. El validador debe comprobarlo.
6. En este módulo los distractores de casi todas las preguntas deben ser **otros patrones u otros participantes de la Parte B** (por ejemplo, Adapter frente a Facade, Decorator y Proxy). Esa es la dificultad real del tema.
7. No hagas preguntas; ante una ambigüedad elige la opción más simple y anótala en una línea al final. Respuesta final: máximo 3 líneas.

## Parte A — Dónde y cómo insertar

**Si existe la carpeta `/home/claude/juego/`:**

- Antes de tocar nada, copia `juego_estudio.html` (la versión publicada) a tu carpeta temporal como `published_v5.html`. Sirve para comprobar que M01 a M04 no cambian.
- `content.mjs` (M01), `content_m02.mjs`, `content_m03.mjs` y `content_m04.mjs` están en formato compacto; `build.mjs` los expande y los inyecta en `engine.html` (marcador `/*__MODULES__*/`) para generar `juego_estudio.html`; `validate.mjs` valida.
- Crea `content_m05.mjs` con el mismo formato compacto (exporta `topics, mcq, tf, scenario, error`):
  - `mcq`, `scenario`, `error`: `[tema, dificultad, texto, correcta, [3 incorrectas], explicación]`. En `error`, el texto es solo el fragmento; `build.mjs` arma el enunciado.
  - `tf`: `[tema, dificultad, afirmación, true|false, explicación]`.
- Extiende `build.mjs`: importa `content_m05.mjs`, llama `expand('M05', 'Patrones de diseño', c5)` y emite su bloque después de `// === MODULE:M04 END ===`. No cambies `expand` ni el orden de los módulos anteriores.
- Extiende `validate.mjs`: `MODULES` debe tener M01 a M05 en ese orden; marcadores de M05 presentes; bloques M01 a M04 idénticos a `published_v5.html`; M05 validado con `checkModule` y los mínimos de B2; ningún `prompt` de M05 repetido en otro módulo; mantén la revisión de palabras prohibidas.
- En la carpeta temporal `jsd/` hay pruebas (`smoke.cjs`, `hero.cjs`, `m03.cjs`, `m04.cjs`). Deben seguir pasando; si alguna cuenta módulos, actualiza solo ese número. Copia `m04.cjs` como `m05.cjs`, cambia `M04` por `M05`, `MODULES[3]` por `MODULES[4]` y el número de temas, y ejecútala al menos 10 veces (las rondas son aleatorias).
- Republica `/home/claude/juego/juego_estudio.html` (misma ruta = misma URL; no pases `icon`). Actualiza la descripción a "5 módulos".

**Si la carpeta no existe:** lee el artefacto publicado (`https://claude.ai/artifact/XrNzeFC2euPiF55Pex4ycd`), inserta el bloque nuevo justo después de la línea `// === MODULE:M04 END ===` y republica en esa misma URL.

Resultado dentro de `MODULES`:

```js
const MODULES = [
  // === MODULE:M01 START ===  ...sin cambios...  // === MODULE:M01 END ===
  // === MODULE:M02 START ===  ...sin cambios...  // === MODULE:M02 END ===
  // === MODULE:M03 START ===  ...sin cambios...  // === MODULE:M03 END ===
  // === MODULE:M04 START ===  ...sin cambios...  // === MODULE:M04 END ===
  // === MODULE:M05 START ===
  { id: "M05", title: "Patrones de diseño", topics: [...], questions: [...] },
  // === MODULE:M05 END ===
];
```

### Esquema de datos (igual que los módulos anteriores)

```js
{
  id: "M05",
  title: "Patrones de diseño",
  topics: [ { id: "T01", title: "...", summary: "2-3 frases", keyPoints: ["...", "..."] } ],
  questions: [
    { id: "M05-Q001", topic: "T01", type: "mcq", difficulty: 1,          // 1 fácil, 2 media, 3 difícil
      prompt: "...", options: ["a","b","c","d"], answer: 0, explanation: "..." },
    { id: "M05-V001", topic: "T05", type: "tf", difficulty: 1,
      prompt: "Afirmación", answer: true, explanation: "..." },
    { id: "M05-S001", topic: "T09", type: "scenario", difficulty: 2,
      prompt: "Situación real", options: ["...","...","...","..."], answer: 2, explanation: "..." },
    { id: "M05-E001", topic: "T03", type: "error", difficulty: 2,
      prompt: "Este fragmento contiene un error:\n“...”\n¿Cuál es el error?",
      options: ["...","...","...","..."], answer: 1, explanation: "Versión correcta: ..." }
  ]
}
```

Reglas: exactamente una opción correcta; 4 opciones distintas en `mcq`, `scenario` y `error`; la posición de la respuesta correcta varía (lo hace `expand`); la explicación dice por qué es correcta y por qué falla la trampa más tentadora. En `summary` y `keyPoints` se puede usar `**negritas**` y `` `código` ``. Cada tema lleva de 3 a 6 `keyPoints`. Los IDs de tema (`T01`…) son propios de cada módulo.

---

# PARTE B — Módulo M05: Patrones de diseño

Las líneas marcadas **[CORREGIDO]** difieren de los apuntes originales; la versión de aquí es la correcta. Las marcadas **[AÑADIDO]** no estaban en los apuntes y completan el tema.

## B1. Base de hechos por tema

### T01 — Qué es un patrón de diseño
- Un **patrón de diseño** es una **solución general y reutilizable a un problema frecuente** en el diseño de software.
- **Un patrón NO es un algoritmo ni código para copiar y pegar: es un plan** (una plantilla de diseño) que se adapta a cada caso.
- **[CORREGIDO]** Conocerlos tiene **dos** beneficios (los apuntes solo mencionan uno): (1) son una **caja de herramientas** de soluciones probadas; (2) dan un **vocabulario común**: decir "aquí va un Observer" comunica todo un diseño en una palabra.
- **[AÑADIDO]** Los 23 patrones clásicos se publicaron en **1994** en el libro *Design Patterns*, de cuatro autores conocidos como la **Gang of Four (GoF)**.
- Se dividen en **tres categorías**: **creacionales** (cómo se crean los objetos), **estructurales** (cómo se combinan clases y objetos en estructuras más grandes) y **de comportamiento** (cómo se comunican los objetos y cómo se reparten las responsabilidades).
- **[AÑADIDO]** De los 23: **5 creacionales**, **7 estructurales** y **11 de comportamiento**. Este módulo cubre los 5 creacionales, los 7 estructurales y 7 de comportamiento.
- **[CORREGIDO]** Analogía de la lasaña, completa: las **clases y funciones** son los **ingredientes**; los **patrones** son la **receta**, que adaptas a tus necesidades; un **framework** es un **kit ya armado** con convenciones probadas, donde tú solo completas las partes que faltan.
- **[AÑADIDO]** Un patrón se usa cuando el problema lo pide. Forzar patrones donde no hacen falta complica el código (sobreingeniería).

### T02 — Builder (creacional)
- **Problema**: crear un objeto complejo con muchas partes u opciones obliga a un constructor enorme, con muchos parámetros difíciles de leer.
- **Solución**: **construir el objeto paso a paso**, separando su construcción de su representación final.
- Ejemplo: un `Automovil` con `motor`, `ruedas`, `color`, `tieneGPS` y `tieneAireAcondicionado`. Una interfaz `AutomovilBuilder` define métodos como `definirMotor()`, `definirColor()` y `conGPS()`.
- Los **Concrete Builder** (por ejemplo `SedanBuilder`) implementan esa interfaz y construyen versiones específicas.
- El **Director** es **opcional**: conoce el orden de los pasos y reutiliza la lógica de construcción para crear distintos objetos con las mismas partes.
- Ventajas: la lógica de construcción queda fuera de la clase `Automovil`; el código cliente es más legible; varios builders producen representaciones distintas.

### T03 — Factory Method (creacional)
- **Problema**: el código cliente crea objetos con `new DocumentoPDF()` o `new DocumentoWord()` y queda atado a esas clases concretas.
- **Solución**: definir un **método de creación** en una clase creadora y dejar que **las subclases decidan qué clase concreta instanciar**.
- Ejemplo: la interfaz `Documento` tiene las implementaciones `DocumentoPDF` y `DocumentoWord`. `CreadorDocumento` declara el método abstracto `crearDocumento()`; `CreadorPDF` y `CreadorWord` lo implementan y devuelven su tipo de documento.
- El código cliente trabaja solo con `CreadorDocumento` y `Documento`: no conoce las clases concretas.
- Para agregar `DocumentoCSV` se crean `DocumentoCSV` y `CreadorCSV`; **el código cliente no se modifica**.
- Aplica el principio "**programar para una interfaz, no para una implementación**" y reduce el acoplamiento.
- Factory Method crea **un** tipo de producto por creador.

### T04 — Abstract Factory (creacional)
- **Problema**: hay que crear **familias de objetos relacionados** que deben combinar entre sí.
- **Solución**: una **fábrica por familia**; cada fábrica crea todos los productos de su familia y garantiza que sean compatibles.
- Ejemplo: una aplicación con tema claro y tema oscuro. La `Fábrica de Tema Claro` crea botones, ventanas y menús claros; la `Fábrica de Tema Oscuro` crea la versión oscura de todos. La interfaz siempre se ve consistente.
- Cambiar de familia es cambiar de fábrica; el resto del código no cambia.
- **[AÑADIDO]** Diferencia con Factory Method: **Factory Method crea un producto**; **Abstract Factory crea una familia de productos relacionados**.

### T05 — Singleton (creacional)
- **Objetivo**: asegurar que una clase tenga **una sola instancia** y dar un **punto de acceso global** a ella.
- Ejemplo: `ConexionBD`, una conexión única a la base de datos, para no gastar recursos de más y mantener la coherencia.
- **Cómo**: el **constructor es privado** (nadie puede hacer `new` desde fuera) y un **método estático** `obtenerInstancia()` devuelve la única instancia, creándola la primera vez si aún no existe.
- La clase guarda la instancia en un **atributo de clase privado** (`_instancia`).
- **[CORREGIDO]** En Python, `__init__` **no crea** la instancia: solo **inicializa** un objeto que ya fue creado. La creación única se controla en `__new__` o en un método de clase como `obtener_instancia()`.
- Analogía: es el único administrador autorizado para hablar con la base de datos. Ese administrador puede manejar varias sesiones o conexiones por dentro.
- **[AÑADIDO]** Desventaja: es **estado global**; crea dependencias ocultas y dificulta las pruebas. Se usa con moderación.

### T06 — Prototype (creacional)
- **Problema**: crear ciertos objetos desde cero es largo o costoso.
- **Solución**: **clonar un objeto existente** en lugar de construir uno nuevo con `new`. El objeto original funciona como plantilla o **prototipo**.
- El propio objeto sabe copiarse: se le pide que se clone a sí mismo.
- Ejemplo: en un editor de diapositivas tienes un cuadro de texto con fuente, color y tamaño ya configurados; en vez de configurarlo otra vez, lo **duplicas**.
- La copia es un objeto independiente: después se puede modificar sin afectar al original.

### T07 — Adapter (estructural)
- **Problema**: dos clases no pueden trabajar juntas porque sus **interfaces son incompatibles**.
- **Solución**: un adaptador que funciona como **capa de traducción**: implementa la interfaz que tu sistema espera y por dentro usa el componente incompatible.
- Ejemplo: una librería externa con una interfaz distinta a la de tu sistema. Creas `AdaptadorLibreria`.
- Funcionamiento: (1) el cliente llama a la interfaz objetivo; (2) el adaptador recibe la llamada; (3) la traduce al formato que la librería entiende; (4) llama a la librería; (5) si hace falta, traduce el resultado al formato que el cliente espera.
- **No se modifica** ni el código del cliente ni el de la librería.
- Analogía: un adaptador de enchufe.

### T08 — Decorator (estructural)
- **Objetivo**: **añadir comportamiento** a un objeto individual **de forma dinámica**, sin modificar su clase.
- **Cómo**: el decorador **envuelve** al objeto original, implementa **la misma interfaz** y agrega su comportamiento **antes o después** de delegar la llamada al objeto envuelto.
- Ejemplo: añadir logging o caché a `ServicioAutenticacion` con `ServicioAutenticacionConLogging` y `ServicioAutenticacionConCache`.
- Los decoradores **se pueden apilar**: un decorador puede envolver a un objeto ya decorado.
- Aplica **composición sobre herencia**: evita crear una subclase por cada combinación (como `ServicioAutenticacionConLoggingYCache`).
- Como tiene la misma interfaz, el cliente usa el objeto decorado igual que el original.

### T09 — Facade (estructural)
- **Objetivo**: dar una **interfaz simple** a un conjunto complejo de clases o subsistemas.
- Analogía: el botón "capturar" de la cámara del teléfono. Por dentro se enfoca, se ajusta la exposición, se balancean los blancos y se guarda la imagen; tú solo presionas un botón.
- Ejemplo: `ProcesadorDeImagenesFacade` coordina tres subsistemas (`SubSistemaImagen` carga, `SubSistemaFiltros` filtra, `SubSistemaAlmacenamiento` guarda) y ofrece métodos de alto nivel como `procesar_imagen_con_sepia`.
- La fachada **llama a los subsistemas en el orden correcto** y oculta esa complejidad al cliente.
- **[AÑADIDO]** La fachada **no elimina ni reemplaza** los subsistemas: siguen existiendo y se pueden usar directamente si hace falta. Tampoco añade funciones nuevas: solo simplifica el acceso.

### T10 — Bridge (estructural)
- **Objetivo**: **separar una abstracción de su implementación** para que las dos puedan cambiar por separado. Separa el "qué hace" del "cómo lo hace".
- Analogía: un control remoto universal. El control es la **Abstracción**; el televisor o el DVD son la **Implementación**. Puedes añadir un control nuevo o un dispositivo nuevo sin afectar al otro lado.
- Ejemplo: formas (`Círculo`, `Cuadrado`) y maneras de dibujarlas (`Renderizar en pantalla`, `Imprimir en 3D`). Cualquier forma se combina con cualquier manera de dibujar.
- **Evita la explosión de clases**: sin Bridge haría falta una clase por combinación (`CirculoConPantalla`, `CuadradoConImpresora`…).
- **[AÑADIDO]** Diferencia con Adapter: **Bridge se diseña desde el principio** para que dos dimensiones crezcan por separado; **Adapter se aplica después**, para conectar cosas que ya existen y son incompatibles.

### T11 — Composite (estructural)
- **Objetivo**: tratar **igual** a un objeto individual y a un grupo de objetos.
- Organiza los objetos en una **estructura de árbol**: hojas (objetos simples) y compuestos (grupos que contienen hojas u otros grupos).
- Analogía: archivos y carpetas. Un archivo es una unidad; una carpeta agrupa archivos y otras carpetas. La orden "borrar" funciona igual para un archivo que para una carpeta con todo su contenido.
- Ejemplo: en un juego, un hechizo de curación se aplica igual a un personaje que a un `Equipo` entero.
- El cliente **no necesita distinguir** si trata con un elemento o con un grupo: usa la misma interfaz.

### T12 — Flyweight (estructural)
- **Objetivo**: **ahorrar memoria** cuando hay miles de objetos casi idénticos.
- **Cómo**: los datos que se repiten se guardan **una sola vez** y todos los objetos los **comparten**; cada objeto guarda solo lo que lo hace distinto.
- Ejemplo: un bosque con mil árboles en un videojuego. Todos comparten un solo objeto `Árbol Modelo` (la textura y el modelo); cada árbol solo guarda **su posición** en el mapa.
- El objeto compartido es el flyweight.
- No añade funciones ni cambia interfaces: su único propósito es reducir el uso de memoria.

### T13 — Proxy (estructural)
- Un **proxy** es un **intermediario o representante** de otro objeto: el cliente habla con el proxy en lugar de hablar con el objeto real.
- El proxy tiene **la misma interfaz** que el objeto real; para el cliente la experiencia es la misma.
- Puede hacer algo **antes o después** de pasar la llamada: **comprobar permisos**, usar **caché** o retrasar la creación del objeto real hasta que se necesite.
- Ejemplo: `VideoProxy` comprueba si tienes permiso para ver un video o si ya está en caché antes de cargarlo de nuevo.
- **[AÑADIDO]** Diferencia con Decorator: los dos envuelven y comparten interfaz, pero el **Proxy controla el acceso** al objeto, mientras que el **Decorator le añade comportamiento**.

### T14 — Command (comportamiento)
- **Objetivo**: **encapsular una solicitud como un objeto**. Así las solicitudes se pueden **guardar, poner en cola, ejecutar en secuencia y deshacer**.
- Participantes, con el ejemplo del control remoto: cada acción (reproducir, pausar) es un objeto `Comando` con un método `ejecutar()`; el `ControlRemoto` es el **Invocador**; el `DispositivoMultimedia` es el **Receptor**, que contiene la lógica real.
- **[CORREGIDO]** El flujo correcto: el **Invocador llama a `ejecutar()`** del comando, y **el comando llama al Receptor**. El comando no "se envía" al receptor: el comando ya conoce a su receptor.
- **Desacoplamiento**: el Invocador no sabe **cómo** se hace la acción; solo sabe que tiene un comando que ejecutar.
- Se pueden añadir comandos nuevos ("adelantar 10 segundos") sin modificar el control remoto.
- Guardar comandos en una lista permite **macros**. Con un historial se puede **deshacer**, siempre que cada comando sepa revertir su acción.

### T15 — Iterator (comportamiento)
- **[CORREGIDO]** **Objetivo**: recorrer los elementos de una colección **de forma secuencial y uniforme, sin exponer su representación interna**. Lo que aporta no es eficiencia, sino una manera estándar de recorrer.
- Ejemplo: una playlist. Los botones "siguiente" y "anterior" dejan pasar de canción sin saber si las canciones están en una lista, un array u otra estructura.
- La lógica de recorrido vive en una clase aparte (`PlaylistIterator`), separada de la estructura interna de `Playlist`.
- Interfaz típica: `hasNext()` (¿hay más elementos?) y `next()` (dame el siguiente). En Python: `__iter__` y `__next__`.
- El cliente solo interactúa con el iterador.

### T16 — Observer (comportamiento)
- **Objetivo**: que unos objetos se **suscriban** a otro y reciban una **notificación automática** cuando cambia.
- Participantes: el **Sujeto** (el que cambia) y los **Observadores** (los suscritos). Es una dependencia **uno-a-muchos**.
- Ejemplo: un objeto que representa el estado de una conexión de red (Sujeto) y varios widgets de la interfaz que lo muestran (Observadores).
- Pasos: (1) **registro**: los observadores se suscriben con `agregar_observador()`; (2) **notificación**: al cambiar, el Sujeto llama a `notificar_observadores()`; (3) **actualización**: recorre sus observadores y llama al `actualizar()` de cada uno; (4) **reacción**: cada observador reacciona a su manera; (5) **desregistro**: con `eliminar_observador()`.
- Evita el **polling**: los observadores no tienen que consultar constantemente al Sujeto para saber si cambió.
- El Sujeto no necesita saber qué hace cada observador.

### T17 — Strategy (comportamiento)
- **[CORREGIDO]** **Objetivo**: definir una **familia de algoritmos intercambiables**, cada uno en su propia clase y todos con **la misma interfaz**, para resolver un mismo problema de distintas formas.
- Participantes, con el ejemplo de pagos: el **Contexto** (`PaymentService`) guarda una referencia a una estrategia y **le delega** el trabajo; la **interfaz** (`PaymentProcessor`, con `process(amount)`) es común a todas; las **estrategias concretas** (como `PayPalProcessor`) implementan cada método de pago.
- **[CORREGIDO]** La interfaz **no decide** nada: quien **elige** la estrategia es el **cliente** (el código que usa `PaymentService`), con `setProcessor()`. El Contexto solo delega.
- La estrategia se puede **cambiar en tiempo de ejecución**.
- Evita llenar el Contexto de `if/else` para cada variante; añadir un método de pago es añadir una clase.

### T18 — State (comportamiento)
- **Objetivo**: que un objeto **cambie su comportamiento cuando cambia su estado interno**.
- **Cómo**: en lugar de muchos `if-else` o `switch`, se crea **una clase por estado**; el objeto delega su comportamiento en el objeto que representa su estado actual.
- Ejemplo: un personaje de videojuego puede estar `Parado`, `Corriendo` o `Saltando`. El botón de salto hace algo distinto en cada estado; el personaje delega en `EstadoParado`, `EstadoCorriendo` o `EstadoSaltando`.
- **[AÑADIDO]** Diferencia con Strategy: la estructura es parecida, pero en **Strategy el cliente elige** el algoritmo desde fuera; en **State el objeto pasa de un estado a otro** por su propia lógica conforme ocurren cosas.

### T19 — Mediator (comportamiento)
- **Objetivo**: reducir las conexiones directas entre muchos objetos haciendo que **todos se comuniquen a través de un mediador**.
- Analogía: un jefe de equipo que coordina la comunicación.
- Ejemplo: en un chat, los usuarios no se envían mensajes directamente: los mandan a un `ChatroomMediator`, que los reparte a los usuarios correctos.
- Un usuario nuevo solo necesita conocer al mediador, no a todos los demás.
- **[AÑADIDO]** Diferencia con Observer: en Observer un sujeto avisa a sus suscriptores (un sentido); en Mediator un objeto central **coordina la comunicación entre varios** participantes.

### T20 — Visitor (comportamiento)
- **Objetivo**: **añadir una operación nueva** a un grupo de clases **sin modificar esas clases**.
- **Cómo**: la operación vive en un objeto **visitante** que recorre la estructura y sabe qué hacer con cada tipo de elemento.
- Ejemplo: un compilador con un árbol de sintaxis abstracta (nodos de clases, métodos y variables). Para "exportar a XML" se crea `ExportarXMLVisitor`; para optimizar, `OptimizarCodigoVisitor`. Las clases del árbol no se tocan.
- Cada operación nueva es un visitante nuevo.
- **[AÑADIDO]** Costo: si se añade un **tipo de elemento nuevo** a la estructura, hay que actualizar **todos** los visitantes. Conviene cuando la estructura es estable y las operaciones cambian.

### T21 — Principios detrás de los patrones
- **Programar para una interfaz, no para una implementación**: el código depende de tipos abstractos (como `Documento`), no de clases concretas (como `DocumentoPDF`). Así se puede cambiar la implementación sin tocar al cliente.
- **Composición sobre herencia**: para añadir o combinar comportamientos, es preferible **combinar objetos** que crear subclases. La herencia se fija al escribir el código; la composición se puede cambiar mientras el programa corre.
- **Acoplamiento**: cuánto depende una clase de otra. Los patrones buscan **bajo acoplamiento**: que un cambio en una clase no obligue a cambiar muchas otras.
- **[AÑADIDO]** **Abierto/cerrado**: el código debe estar abierto a la extensión y cerrado a la modificación. Se añade funcionalidad con clases nuevas, sin modificar el código que ya funciona (como añadir `CreadorCSV` en Factory Method).
- **Delegar**: un objeto pasa parte de su trabajo a otro objeto especializado (el Contexto a la estrategia, el decorador al objeto envuelto).

### T22 — Patrones que se confunden
- **Adapter, Facade, Decorator y Proxy** envuelven a otros objetos, pero con intenciones distintas:
  - **Adapter**: **cambia la interfaz** para hacerla compatible con la que espera el cliente.
  - **Facade**: da una **interfaz nueva y más simple** a todo un conjunto de clases.
  - **Decorator**: **misma interfaz**, **añade comportamiento**.
  - **Proxy**: **misma interfaz**, **controla el acceso**.
- **Factory Method** crea un producto; **Abstract Factory** crea familias; **Builder** arma un objeto complejo paso a paso; **Prototype** clona uno existente; **Singleton** garantiza una sola instancia.
- **Strategy** y **State**: en Strategy el cliente elige el algoritmo; en State el objeto cambia de estado por sí mismo.
- **Composite** y **Decorator**: los dos usan composición; Composite agrupa **muchos** objetos en un árbol, Decorator envuelve **uno** para añadirle comportamiento.
- **Bridge** y **Adapter**: Bridge se planea desde el diseño; Adapter se aplica después.
- **Observer** y **Mediator**: Observer notifica en un sentido a los suscriptores; Mediator coordina la comunicación entre varios.
- Por categoría: **creacionales**: Builder, Factory Method, Abstract Factory, Singleton, Prototype. **Estructurales**: Adapter, Decorator, Facade, Bridge, Composite, Flyweight, Proxy. **De comportamiento** (los de este módulo): Command, Iterator, Observer, Strategy, State, Mediator, Visitor.

## B2. Banco de preguntas — cantidades mínimas

| Tipo | Mínimo | Regla |
|---|---|---|
| `mcq` | 88 | 4 por tema; al menos 1 de dificultad 3 por tema |
| `tf` | 66 | 3 por tema; aprox. mitad verdaderas y mitad falsas (entre 30 y 36 verdaderas) |
| `scenario` | 22 | Los 22 de B3 |
| `error` | 23 | Exactamente los de B4, redactados como pregunta de 4 opciones |

Cada hecho **[CORREGIDO]** debe aparecer en al menos una `mcq` o `tf` (además de su pregunta `error`, si la tiene). Las `tf` falsas deben ser falsas por un hecho concreto de B1, no por un matiz de redacción. En T22 incluye preguntas de clasificación ("¿a qué categoría pertenece…?") y de comparación entre patrones parecidos.

## B3. Escenarios (respuesta correcta entre corchetes)

En todos, las cuatro opciones son nombres de patrones (el correcto y tres parecidos de B1), salvo donde se indica.

1. (T02) Una clase `Pedido` tiene 12 opciones, casi todas opcionales, y su constructor ya es ilegible. → [Builder]
2. (T03) Tu aplicación exporta reportes en PDF y Word; cada mes piden un formato nuevo y no quieres modificar el código cliente cada vez. → [Factory Method]
3. (T04) Tu aplicación tiene tema claro y oscuro; botones, ventanas y menús deben ser siempre del mismo tema. → [Abstract Factory]
4. (T05) Toda la aplicación debe compartir un único objeto de configuración, accesible desde cualquier parte. → [Singleton]
5. (T06) Un usuario configuró un cuadro de texto con fuente, color y tamaño, y quiere diez más iguales sin repetir la configuración. → [Prototype]
6. (T07) Compraste una librería de pagos cuyos métodos tienen nombres y formatos distintos a los que usa tu sistema, y no puedes modificarla. → [Adapter]
7. (T08) Quieres añadir registro de eventos y caché a un servicio que ya funciona, poder combinarlos, y no tocar su clase ni crear una subclase por combinación. → [Decorator]
8. (T09) Convertir un video exige llamar a cinco subsistemas en un orden exacto; quieres que el resto de la aplicación llame a un solo método. → [Facade]
9. (T10) Tienes 4 formas y 3 maneras de dibujarlas, y no quieres escribir 12 clases, una por combinación. → [Bridge]
10. (T11) Un explorador de archivos debe calcular el tamaño de un archivo y el de una carpeta con subcarpetas usando la misma operación. → [Composite]
11. (T12) Un mapa muestra 50,000 árboles idénticos salvo por su posición, y la memoria se agota. → [Flyweight]
12. (T13) Antes de cargar un video pesado quieres comprobar permisos y revisar si ya está en caché, sin que el cliente note diferencia en la interfaz. → [Proxy]
13. (T14) Un editor de texto necesita deshacer acciones y grabar macros. → [Command]
14. (T15) Quieres recorrer las canciones de una playlist sin depender de si están guardadas en una lista o en un array. → [Iterator]
15. (T16) Cuando cambia el estado de la conexión, varios widgets de la pantalla deben enterarse solos, sin preguntar cada segundo. → [Observer]
16. (T17) El usuario elige en la pantalla de pago entre tarjeta, PayPal o transferencia, y el servicio debe usar el algoritmo elegido en ese momento. → [Strategy]
17. (T18) Un personaje responde distinto al botón de salto según esté parado, corriendo o saltando, y el código tiene un `switch` enorme. → [State]
18. (T19) En una sala de chat cada usuario guarda referencias a todos los demás y añadir uno nuevo obliga a tocar a todos. → [Mediator]
19. (T20) Tienes un árbol de sintaxis estable y cada mes piden una operación nueva sobre sus nodos (exportar, optimizar), sin modificar las clases de los nodos. → [Visitor]
20. (T01) Un compañero propone usar cinco patrones en un script de 40 líneas que funciona y no va a crecer. ¿Qué respondes? → [Que no hace falta: un patrón se usa cuando el problema lo pide; forzarlos complica el código] (opciones en texto, no nombres de patrones)
21. (T21) Tu código hace `new DocumentoPDF()` en treinta lugares, y cambiar a otro formato obliga a tocarlos todos. ¿Qué principio se rompió? → [Programar para una interfaz, no para una implementación] (opciones: los principios de T21)
22. (T22) Dos clases envuelven a otra y tienen su misma interfaz; una añade registro de eventos y la otra bloquea a usuarios sin permiso. ¿Qué patrón es cada una? → [La primera es Decorator y la segunda es Proxy] (opciones: parejas de patrones)

Reparte la dificultad de los escenarios entre 2 y 3.

## B4. Caza el error (fragmento con error → corrección)

1. "Un patrón de diseño es un algoritmo listo para copiar y pegar en el proyecto." → Un patrón no es un algoritmo ni código: es un plan que se adapta a cada caso. (T01)
2. "Los patrones clásicos son 32 y se dividen en creacionales y estructurales." → Son 23 y se dividen en tres categorías: creacionales, estructurales y de comportamiento. (T01)
3. "En el patrón Builder el Director es obligatorio: sin él no se puede construir el objeto." → El Director es opcional; sirve para reutilizar la lógica de construcción. (T02)
4. "En Factory Method, el código cliente decide con new qué clase concreta instanciar." → Esa decisión se delega a las subclases creadoras; el cliente solo conoce las interfaces. (T03)
5. "Factory Method crea familias completas de objetos relacionados; Abstract Factory crea un solo producto." → Es al revés: Factory Method crea un producto y Abstract Factory, familias. (T04)
6. "En Python, el constructor __init__ es el que crea la instancia única del Singleton." → `__init__` solo inicializa un objeto ya creado; la creación se controla en `__new__` o en un método de clase. (T05)
7. "En Singleton el constructor es público para que cualquiera pueda crear la instancia." → El constructor es privado; la instancia se obtiene con un método estático. (T05)
8. "Prototype crea cada objeto nuevo llamando a new y configurándolo desde cero." → Prototype clona un objeto existente, que sirve de plantilla. (T06)
9. "Para usar el Adapter hay que modificar el código de la librería externa." → El adaptador envuelve a la librería y traduce las llamadas; no se modifica ni la librería ni el cliente. (T07)
10. "El Decorator añade funcionalidades creando una subclase por cada combinación posible." → El Decorator envuelve al objeto y usa composición, justo para evitar esas subclases. (T08)
11. "Un decorador tiene una interfaz distinta a la del objeto que envuelve." → Implementa la misma interfaz, por eso se usa igual que el original. (T08)
12. "La Facade reemplaza a los subsistemas: una vez creada, ya no existen." → La fachada solo simplifica el acceso; los subsistemas siguen existiendo. (T09)
13. "Bridge sirve para conectar dos clases que ya existen y tienen interfaces incompatibles." → Eso es Adapter; Bridge separa abstracción e implementación desde el diseño. (T10)
14. "En Composite, el cliente debe comprobar si trata con un objeto individual o con un grupo." → El cliente trata a ambos igual, con la misma interfaz. (T11)
15. "Flyweight ahorra memoria guardando una copia completa de los datos en cada objeto." → Los datos repetidos se guardan una sola vez y se comparten. (T12)
16. "El Proxy tiene una interfaz distinta a la del objeto real, así que el cliente debe adaptarse." → Tiene la misma interfaz; para el cliente la experiencia es igual. (T13)
17. "En Command, el Invocador contiene la lógica para reproducir o pausar." → Esa lógica está en el Receptor; el Invocador solo llama a `ejecutar()`. (T14)
18. "El Iterator proporciona una forma eficiente de recorrer una colección exponiendo su estructura interna." → Permite recorrerla de forma secuencial y uniforme sin exponer su representación interna. (T15)
19. "En Observer, los observadores consultan al Sujeto cada cierto tiempo para saber si cambió." → Eso es polling; en Observer el Sujeto notifica automáticamente a sus observadores. (T16)
20. "En Strategy, la interfaz decide qué algoritmo se usa." → El cliente elige la estrategia y el Contexto le delega el trabajo. (T17)
21. "Con el patrón State, el objeto usa un gran switch para decidir qué hacer en cada estado." → Con State hay una clase por estado y el objeto delega en su estado actual. (T18)
22. "Con Mediator, cada objeto conoce a todos los demás y les habla directamente." → Todos se comunican a través del mediador y solo lo conocen a él. (T19)
23. "Con Visitor, para añadir una operación nueva hay que modificar cada clase de la estructura." → Se crea un visitante nuevo; las clases de la estructura no se tocan. (T20)

---

# PARTE D — Criterios de aceptación

Verifica antes de entregar (con script):

- [ ] Los bloques M01 a M04 son idénticos a los de `published_v5.html`; `engine.html` no cambió.
- [ ] M05 cumple el esquema: IDs únicos con prefijo `M05-`, `topic` existente, `answer` dentro de rango, 4 opciones distintas donde corresponde.
- [ ] Se cumplen los mínimos de B2 y los 22 temas tienen `summary`, `keyPoints`, al menos 4 `mcq` (una de dificultad 3) y 3 `tf`; entre 30 y 36 `tf` verdaderas.
- [ ] Los 22 escenarios de B3 y los 23 errores de B4 están presentes.
- [ ] Ningún `prompt` de M05 es idéntico a uno de otro módulo. Ninguna pregunta afirma algo que contradiga o no esté en B1. La revisión de palabras prohibidas pasa.
- [ ] El inicio muestra cinco módulos; M05 abre su mapa con 22 temas; un quiz, un relámpago, un "¿Qué usarías?", un "Caza el error" y el jefe final de M05 funcionan; el progreso guardado y el héroe no se pierden.
- [ ] `smoke.cjs`, `hero.cjs`, `m03.cjs`, `m04.cjs` y `m05.cjs` pasan; el archivo abre sin errores de consola y se republica en la misma URL.
