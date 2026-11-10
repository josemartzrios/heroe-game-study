# CONTRATO DE EJECUCIÓN — Módulo M03 "Fundamentos de internet"

Este documento añade un módulo al juego **Estudio ISW** ya publicado (módulos M01 y M02 + modo héroe). Es autosuficiente: el ejecutor NO necesita la guía original ni los contratos anteriores.

## Reglas para el ejecutor

1. **Solo añades el módulo M03.** No modifiques el motor (`engine.html`), el modo héroe, los módulos M01 y M02, los IDs existentes ni la clave de `localStorage` (`estudio_isw_v1`): el progreso guardado depende de ellos.
2. **La Parte B es la única fuente de verdad.** No agregues datos, cifras, nombres ni ejemplos que no estén ahí. Si un hecho no aparece en la Parte B, no lo preguntes.
3. Todo el texto visible va en español (México). Los términos técnicos se quedan en inglés cuando así aparecen en la Parte B (router, request, render tree, bytecode...).
4. El validador rechaza ciertas palabras en todo el archivo (nombres de marcas de cómics y juguetes). Por eso **no nombres los motores de JavaScript de Firefox ni de Safari**: di solo "su propio motor". Tampoco escribas la palabra "Flash" con mayúscula ni palabras que contengan "lego" sin acento (por ejemplo "llego"). Si el validador marca una palabra prohibida, cambia la redacción de M03; no toques el validador.
5. M03 repite a propósito algunos temas de M02 (Unicode, DNS, HTTP, HTTPS). Es correcto: escribe preguntas nuevas con los hechos de esta Parte B; no copies ni edites las de M02.
6. No hagas preguntas; ante una ambigüedad elige la opción más simple y anótala en una línea al final. Respuesta final: máximo 3 líneas.

## Parte A — Dónde y cómo insertar

**Si existe la carpeta `/home/claude/juego/`:**

- Antes de tocar nada, copia `juego_estudio.html` (la versión publicada) a tu carpeta temporal como `published_v3.html`. Sirve para comprobar que M01 y M02 no cambian.
- `content.mjs` (M01) y `content_m02.mjs` (M02) están en formato compacto; `build.mjs` los expande y los inyecta en `engine.html` (marcador `/*__MODULES__*/`) para generar `juego_estudio.html`; `validate.mjs` valida.
- Crea `content_m03.mjs` con el mismo formato compacto (exporta `topics, mcq, tf, scenario, error`):
  - `mcq`, `scenario`, `error`: `[tema, dificultad, texto, correcta, [3 incorrectas], explicación]`. En `error`, el texto es solo el fragmento; `build.mjs` arma el enunciado.
  - `tf`: `[tema, dificultad, afirmación, true|false, explicación]`.
- Extiende `build.mjs`: importa `content_m03.mjs`, llama `expand('M03', 'Fundamentos de internet', c3)` y emite su bloque después de `// === MODULE:M02 END ===`. No cambies `expand` ni el orden de M01 y M02.
- Extiende `validate.mjs`: `MODULES` debe tener M01, M02 y M03 en ese orden; marcadores de M03 presentes; bloques M01 y M02 idénticos a `published_v3.html`; M03 validado con `checkModule` y los mínimos de B2; mantén la revisión de palabras prohibidas.
- Si existen las pruebas `smoke.cjs` y `hero.cjs` en la carpeta temporal `jsd/`, deben seguir pasando. Si alguna cuenta módulos, actualiza solo ese número.
- Republica `/home/claude/juego/juego_estudio.html` (misma ruta = misma URL; no pases `icon`).

**Si la carpeta no existe:** lee el artefacto publicado (`https://claude.ai/artifact/XrNzeFC2euPiF55Pex4ycd`), inserta el bloque nuevo justo después de la línea `// === MODULE:M02 END ===` y republica en esa misma URL.

Resultado dentro de `MODULES`:

```js
const MODULES = [
  // === MODULE:M01 START ===
  { ...sin cambios... },
  // === MODULE:M01 END ===
  // === MODULE:M02 START ===
  { ...sin cambios... },
  // === MODULE:M02 END ===
  // === MODULE:M03 START ===
  { id: "M03", title: "Fundamentos de internet", topics: [...], questions: [...] },
  // === MODULE:M03 END ===
];
```

### Esquema de datos (igual que M01 y M02)

```js
{
  id: "M03",
  title: "Fundamentos de internet",
  topics: [ { id: "T01", title: "...", summary: "2-3 frases", keyPoints: ["...", "..."] } ],
  questions: [
    { id: "M03-Q001", topic: "T01", type: "mcq", difficulty: 1,          // 1 fácil, 2 media, 3 difícil
      prompt: "...", options: ["a","b","c","d"], answer: 0, explanation: "..." },
    { id: "M03-V001", topic: "T05", type: "tf", difficulty: 1,
      prompt: "Afirmación", answer: true, explanation: "..." },
    { id: "M03-S001", topic: "T09", type: "scenario", difficulty: 2,
      prompt: "Situación real", options: ["...","...","...","..."], answer: 2, explanation: "..." },
    { id: "M03-E001", topic: "T03", type: "error", difficulty: 2,
      prompt: "Este fragmento contiene un error:\n“...”\n¿Cuál es el error?",
      options: ["...","...","...","..."], answer: 1, explanation: "Versión correcta: ..." }
  ]
}
```

Reglas: exactamente una opción correcta; 4 opciones distintas en `mcq`, `scenario` y `error`; distractores plausibles tomados del mismo tema (nada absurdo); la posición de la respuesta correcta varía (lo hace `expand`); la explicación dice por qué es correcta y por qué falla la trampa más tentadora. En `summary` y `keyPoints` se puede usar `**negritas**` y `` `código` ``. Cada tema lleva de 3 a 6 `keyPoints`. Los IDs de tema (`T01`…) son propios de cada módulo.

---

# PARTE B — Módulo M03: Fundamentos de internet

Las líneas marcadas **[CORREGIDO]** difieren de los apuntes originales; la versión de aquí es la correcta.

## B1. Base de hechos por tema

### T01 — Entradas, salidas y sistema binario
- Una computadora recibe un dato de entrada (**input**), lo procesa y entrega un resultado (**output**).
- El **código máquina** (machine code) es código binario: la única forma en que la computadora entiende instrucciones y datos.
- Nuestro sistema de conteo es **decimal** (base 10, dígitos del 0 al 9). El sistema **binario** es base 2.
- **[CORREGIDO]** El binario no tiene "8 cantidades para contar": tiene solo **dos dígitos, 0 y 1**. Los números 1, 2, 4, 8, 16, 32, 64 y 128 son los **valores de posición** de los 8 bits de un byte (cada posición vale el doble que la anterior).
- Un **bit** es un dígito binario. **8 bits forman 1 byte**. Un byte puede representar **256 valores distintos, del 0 al 255** (todos los bits en 1: 128+64+32+16+8+4+2+1 = 255).
- Para leer un byte se suman los valores de las posiciones que están en 1. Ejemplo: `01000001` = 64 + 1 = 65.

### T02 — Transistores
- Un **transistor** es un interruptor electrónico diminuto con dos estados: encendido y apagado (1 y 0, verdadero y falso).
- **[CORREGIDO]** Los transistores no "traducen": al combinarse forman **compuertas lógicas**, y con ellas el procesador hace operaciones (sumar, comparar, decidir) sobre los bits.
- **[CORREGIDO]** Antes de los transistores se usaban **tubos de vacío** (bulbos): eran grandes, se calentaban y se fundían con frecuencia; se parecían a un foco, pero no eran focos.
- **[CORREGIDO]** Un procesador actual tiene **miles de millones** de transistores (no solo millones).
- Así pasan los bytes a ser instrucciones: cada instrucción en código máquina es un patrón de bits que enciende o apaga transistores del procesador.

### T03 — Código ASCII
- **ASCII** es una tabla que asigna un número a cada letra, dígito y símbolo del alfabeto inglés, para poder guardarlos como bits.
- ASCII usa **7 bits**: define **128 caracteres** (del 0 al 127).
- Las mayúsculas van en orden: **A = 65**, B = 66, C = 67 … **Z = 90**. Las minúsculas empiezan en **a = 97**.
- Para guardar una letra: letra → número ASCII → binario. Ejemplo: "A" → 65 → `01000001`.
- Limitación: ASCII no incluye acentos, la ñ, otros alfabetos ni emojis.

### T04 — Unicode y UTF-8
- **Unicode** es un estándar que busca representar todos los caracteres de todos los sistemas de escritura del mundo (y emojis). A cada carácter le asigna un número único.
- **[CORREGIDO]** Unicode no "usa más de un byte" por sí mismo: Unicode asigna los números; las **codificaciones** UTF-8, UTF-16 y UTF-32 definen cómo guardar esos números en bytes.
- **UTF-8** usa **de 1 a 4 bytes** por carácter, según el carácter. Es la codificación más usada en la web.
- **UTF-8 es compatible con ASCII**: los 128 caracteres de ASCII ocupan 1 byte y tienen el mismo valor en UTF-8. Un texto ASCII ya es UTF-8 válido. Por eso se dice que UTF-8 es una extensión universal de ASCII.
- Caracteres como "ñ" o "é" ocupan 2 bytes en UTF-8; un emoji ocupa 4.

### T05 — Pixeles y color RGB
- Cada **pixel** de una pantalla se compone de **3 subpixeles**: rojo, verde y azul (**RGB**: Red, Green, Blue).
- Cada color se guarda en **1 byte**: un valor de **0 a 255**. Un pixel RGB ocupa **3 bytes** (24 bits).
- Combinaciones: negro `(0,0,0)`, blanco `(255,255,255)`, rojo `(255,0,0)`, verde puro `(0,255,0)`, azul `(0,0,255)`, amarillo `(255,255,0)` (rojo + verde), gris `(128,128,128)`.
- Con 3 bytes se pueden representar 256 × 256 × 256 = **16,777,216 colores** (unos 16.7 millones).
- Regla práctica: los tres valores iguales dan un tono de gris; todos en 0 es negro y todos en 255 es blanco.

### T06 — La infraestructura de internet
- **[CORREGIDO]** Internet no es solo "la red de cables": es una **red de redes**, miles de redes independientes interconectadas en todo el mundo que se entienden gracias a protocolos comunes.
- La columna vertebral sí es física: la gran mayoría del tráfico entre continentes (más del 95 %) viaja por **cables submarinos de fibra óptica**; los satélites mueven una parte muy pequeña.
- **[CORREGIDO]** No todo el recorrido es por cable: el último tramo puede ser inalámbrico (wifi, red celular, satélite). Pero el router, la antena celular o la estación satelital terminan conectados a la red cableada.
- Un **router** dirige los datos entre redes; el de tu casa conecta tu red local con la red de tu proveedor.
- Un **ISP** (Internet Service Provider, proveedor de servicios de internet) invierte en infraestructura para llevar la conexión como servicio hasta cada casa. Generalmente son empresas privadas.

### T07 — ARPANET y el nacimiento de los protocolos
- **ARPANET (1969)** fue la primera red que conectó computadoras distantes en Estados Unidos. Es la antecesora de internet.
- **[CORREGIDO]** La financió **ARPA**, una agencia del Departamento de Defensa, en plena Guerra Fría, pero su objetivo era que universidades y centros de investigación **compartieran recursos de cómputo**, entonces escasos y caros. Que se diseñó como vía de comunicación de emergencia para sobrevivir a una guerra es un mito popular.
- **[CORREGIDO]** Sus primeros cuatro nodos (1969) fueron UCLA, el Stanford Research Institute (SRI), la Universidad de California en Santa Bárbara y la Universidad de Utah: no eran solo universidades estatales (SRI es un instituto de investigación).
- El primer mensaje se envió el 29 de octubre de 1969, de UCLA a SRI. Se quería escribir "LOGIN", pero el sistema se cayó y solo llegó "LO".
- Un **protocolo** es un conjunto de reglas para que las computadoras se comuniquen. ARPANET empezó con un protocolo llamado **NCP**.
- **TCP/IP**, diseñado por **Vint Cerf y Bob Kahn** (1974), define cómo se envía la información entre redes distintas. ARPANET lo adoptó el **1 de enero de 1983**, fecha que suele considerarse el nacimiento de internet.

### T08 — Modelos OSI y TCP/IP
- **OSI** es un modelo teórico de referencia con **7 capas**. De arriba abajo: Aplicación, Presentación, Sesión, Transporte, Red, Enlace de datos y Física. Sirve para estudiar y explicar las redes.
- **TCP/IP** es el modelo que internet usa en la práctica (el estándar actual). Tiene **4 capas**: Aplicación, Transporte, Internet (también llamada de red) y Acceso a la red.
- Equivalencias: Aplicación + Presentación + Sesión de OSI = **Aplicación** de TCP/IP. Enlace de datos + Física de OSI = **Acceso a la red** de TCP/IP. Transporte y Red se corresponden uno a uno.
- Ejemplos por capa en TCP/IP: **HTTP y DNS** están en Aplicación; **TCP** en Transporte; **IP** en Internet.
- TCP se encarga de que los datos lleguen completos y en orden; IP, de las direcciones y de la ruta.

### T09 — DNS
- Las computadoras se localizan en la red por su **dirección IP**, un número difícil de recordar.
- El **DNS** (Domain Name System) traduce nombres de dominio fáciles de recordar (como `ejemplo.com`) a direcciones IP. Funciona como la agenda de contactos de internet.
- El DNS se creó en **1983** (Paul Mockapetris): es anterior a la Web.
- El DNS es un protocolo de la capa de Aplicación.
- Al escribir un dominio, el navegador primero pregunta al DNS qué IP le corresponde y después se conecta a esa IP.

### T10 — La Web y Tim Berners-Lee
- **[CORREGIDO]** **Internet y la Web no son lo mismo.** Internet es la infraestructura (la red de redes). La **Web** (World Wide Web) es un servicio que funciona sobre internet: documentos y aplicaciones enlazados por hipervínculos, a los que se accede con un navegador. El correo electrónico y las videollamadas también usan internet y no son la Web.
- **Tim Berners-Lee** inventó la Web mientras trabajaba en el **CERN** (laboratorio europeo de física). La propuso en **1989**.
- Creó sus tres piezas: **HTML** (lenguaje para dar estructura a la información), **URL** (dirección de cada recurso) y **HTTP** (protocolo para pedir y entregar recursos, en la capa de Aplicación).
- A finales de **1990** tenía funcionando el **primer servidor web** y el **primer navegador**, llamado **WorldWideWeb**. El primer sitio web se abrió al público en 1991.
- Un **servidor web** es una computadora siempre disponible (24x7) que entrega recursos a quien los pide.
- En **1993** el CERN liberó la tecnología de la Web al dominio público: cualquiera podía usarla gratis y sin pedir permiso. Eso permitió su crecimiento.

### T11 — URI y URL
- Un **URI** (Uniform Resource Identifier) es el término genérico: cualquier cadena que **identifica** un recurso.
- Una **URL** (Uniform Resource Locator) es un URI que además dice **cómo y dónde acceder** al recurso.
- **Toda URL es un URI, pero no todo URI es una URL.** Ejemplo de URI que no es URL: el ISBN de un libro (`urn:isbn:...`) lo identifica, pero no dice dónde encontrarlo.
- Partes de una URL, con `https://ejemplo.com/productos?id=5`: **esquema o protocolo** (`https`), **dominio** (`ejemplo.com`), **ruta** (`/productos`) y **parámetros de consulta** (`?id=5`).

### T12 — Navegadores, JavaScript y estándares
- **[CORREGIDO]** Netscape no fue "el precursor" de JavaScript: **JavaScript se creó dentro de Netscape**. Lo hizo **Brendan Eich en 1995**, en unos 10 días, para el navegador Netscape Navigator.
- JavaScript **no es Java**: el nombre parecido fue una decisión de mercadotecnia.
- JavaScript permitió que las páginas dejaran de ser documentos estáticos y reaccionaran al usuario.
- **[CORREGIDO]** Chrome no inventó la interactividad: existía desde 1995. Lo que **Google** aportó con **Chrome (2008)** fue el motor **V8**, que ejecuta JavaScript mucho más rápido e hizo viables aplicaciones web complejas dentro del navegador.
- Cuando cada navegador implementaba las cosas a su manera, las páginas se veían o funcionaban distinto en cada uno. Por eso se necesitaron estándares.
- El **W3C** (World Wide Web Consortium), fundado por Tim Berners-Lee en **1994**, impulsa estándares abiertos de la Web como HTML y CSS.
- **[CORREGIDO]** El estándar de JavaScript no es del W3C: se llama **ECMAScript** y lo publica **Ecma International** desde 1997.

### T13 — HTTP: petición, respuesta y métodos
- **HTTP** es el protocolo con el que se comunican cliente y servidor en la Web. Funciona por pares: el **cliente** (el navegador) envía una **petición** (request) y el **servidor** devuelve una **respuesta** (response).
- El cliente siempre inicia la comunicación; el servidor no envía nada si no se lo piden.
- **[CORREGIDO]** El navegador **no habla con la base de datos**. La petición llega al **servidor web**; el servidor consulta la base de datos si lo necesita y arma la respuesta.
- Métodos HTTP (indican la acción sobre un recurso), con el ejemplo de productos:
  - **GET** `/products/{sku}`: leer.
  - **POST** `/products`: crear.
  - **PUT** `/products/{sku}`: actualizar reemplazando el recurso completo.
  - **PATCH** `/products/{sku}`: actualización parcial (solo algunos campos).
  - **DELETE** `/products/{sku}`: borrar.
- POST va a la colección (`/products`) porque el recurso todavía no existe; los demás apuntan a un recurso concreto (`/products/{sku}`).
- HTTP sin cifrar usa por defecto el **puerto 80**.

### T14 — HTTPS y TLS
- **HTTPS** es HTTP sobre una conexión cifrada. Usa por defecto el **puerto 443**.
- **[CORREGIDO]** Lo que cifra la conexión es el protocolo **TLS**. **SSL** es su antecesor: está obsoleto y es inseguro, aunque por costumbre se siga diciendo "certificado SSL".
- **[CORREGIDO]** El **certificado** no cifra los datos: sirve para **demostrar la identidad del servidor** (que el sitio es quien dice ser) y contiene su llave pública, con la que se establece el cifrado.
- **[CORREGIDO]** No es "100 % encriptado": HTTPS cifra el **contenido** (la ruta de la URL, los encabezados, el cuerpo, las contraseñas), pero quien observa la red todavía puede ver la **dirección IP** del servidor y normalmente el **nombre de dominio** que visitas.
- Con HTTP normal, cualquiera en el camino (por ejemplo, en un wifi público) puede leer lo que envías, como los datos de una tarjeta.
- HTTPS no garantiza que el sitio sea honesto: solo que la conexión con ese dominio es privada y auténtica.

### T15 — Lo que entiende el navegador: JavaScript y WebAssembly
- **[CORREGIDO]** El navegador interpreta **HTML** (estructura) y **CSS** (estilos), que no son lenguajes de programación, y **ejecuta** dos lenguajes: **JavaScript** y **WebAssembly**.
- **WebAssembly (Wasm)** es un formato **binario de bajo nivel** que el navegador ejecuta a velocidad cercana a la de un programa nativo.
- **[CORREGIDO]** El navegador **no compila C ni C++**. El desarrollador compila **antes** su código C, C++ o Rust a un archivo WebAssembly (`.wasm`) con sus propias herramientas; el navegador solo descarga y ejecuta ese binario.
- WebAssembly **complementa** a JavaScript, no lo reemplaza: se usa para tareas pesadas (juegos, edición de video o imagen, cálculos), mientras JavaScript maneja la página.
- WebAssembly es un estándar del W3C desde **2019**.

### T16 — Internet de las Cosas y 5G
- El **Internet de las Cosas (IoT)** es la red de objetos físicos (dispositivos, aparatos, vehículos) equipados con **sensores, software y conectividad**, que intercambian datos con otros dispositivos y sistemas a través de internet.
- Ejemplos: un termostato inteligente, un reloj que mide el pulso, un foco controlado desde el celular, sensores en una fábrica.
- **[CORREGIDO]** **5G** no "significa" baja latencia: significa **quinta generación** de redes móviles. Sus ventajas frente a 4G son **mayor velocidad**, **menor latencia** y **muchos más dispositivos conectados por zona**.
- **Latencia** es el tiempo que tarda un dato en ir y volver; baja latencia significa respuesta casi inmediata.
- La capacidad de conectar muchísimos dispositivos hace que 5G sea importante para el IoT.
- 5G es una tecnología de acceso inalámbrico: las antenas siguen conectadas a la red por fibra óptica.

### T17 — Renderizado del navegador (Critical Rendering Path)
- El **Critical Rendering Path** es la secuencia de pasos con la que el navegador convierte HTML, CSS y JavaScript en pixeles en la pantalla. En orden: **DOM → CSSOM → Render tree → Layout → Paint**.
- **DOM** (Document Object Model): el navegador lee el HTML y construye un **árbol de nodos**, uno por cada elemento.
- **CSSOM** (CSS Object Model): el navegador lee todos los estilos CSS y construye otro árbol con ellos.
- **Render tree**: combina el DOM y el CSSOM en un solo árbol que contiene **solo lo que se va a ver**. Los elementos con `display: none` y los que no se muestran (como `<head>`) **no entran** al render tree.
- **[CORREGIDO]** **Layout** no "crea la estructura según las etiquetas" (eso es el DOM): calcula la **geometría**, es decir, el **tamaño y la posición** exactos de cada caja según el tamaño de la ventana.
- **Paint**: con las cajas ya ubicadas, el navegador **pinta los pixeles**: texto, colores, bordes, imágenes.
- **JavaScript** puede modificar el DOM y el CSSOM; cuando lo hace, el navegador tiene que repetir pasos (recalcular layout y volver a pintar).

### T18 — El motor de JavaScript V8
- Un **motor de JavaScript** es el programa dentro del navegador que lee y ejecuta el código JavaScript.
- **V8** es el motor de **Google**. Está escrito en **C++** y es uno de los más populares.
- **[CORREGIDO]** V8 no es "el motor del navegador" en general: lo usan **Chrome**, **Edge** y también **Node.js** (JavaScript fuera del navegador). Firefox y Safari usan su propio motor.
- Pasos: (1) **parsear**: leer el código y entender su estructura, lo que produce un árbol de sintaxis (**AST**); (2) convertirlo a **bytecode**, que ejecuta un intérprete; (3) el código que se ejecuta muchas veces se compila a **código máquina** optimizado mientras el programa corre (compilación **JIT**, just in time).
- **[CORREGIDO]** El bytecode no es el final del proceso: la velocidad de V8 viene de la compilación JIT a código máquina.
- **Bytecode**: representación intermedia, más compacta que el código fuente y más fácil de ejecutar, pero todavía no es código máquina.

## B2. Banco de preguntas — cantidades mínimas

| Tipo | Mínimo | Regla |
|---|---|---|
| `mcq` | 72 | 4 por tema; al menos 1 de dificultad 3 por tema |
| `tf` | 54 | 3 por tema; aprox. mitad verdaderas y mitad falsas (entre 24 y 30 verdaderas) |
| `scenario` | 14 | Los 14 de B3 |
| `error` | 22 | Exactamente los de B4, redactados como pregunta de 4 opciones |

Cada hecho **[CORREGIDO]** debe aparecer en al menos una `mcq` o `tf` (además de su pregunta `error`). Las `tf` falsas deben ser falsas por un hecho concreto de B1, no por un matiz de redacción.

## B3. Escenarios (respuesta correcta entre corchetes)

1. (T01) Lees el byte `00001010` y necesitas su valor decimal. → [10: se suman las posiciones en 1, que valen 8 y 2]
2. (T03) Un programa guarda la palabra "CAB" en ASCII. ¿Qué números almacena? → [67, 65, 66]
3. (T04) Un sistema antiguo que solo acepta ASCII recibe el nombre "Peña" y muestra símbolos raros. ¿Qué codificación resuelve el problema sin romper los textos ASCII que ya existen? → [UTF-8, porque es compatible con ASCII y representa la ñ con más bytes]
4. (T05) Necesitas el color amarillo puro en RGB. → [(255, 255, 0): rojo y verde al máximo, azul en cero]
5. (T05) Una imagen sin comprimir mide 100 × 100 pixeles en RGB. ¿Cuánto ocupa? → [30,000 bytes: 10,000 pixeles × 3 bytes]
6. (T06) Una videollamada entre México y España se corta por una falla de infraestructura entre continentes. ¿Qué es lo más probable que haya fallado? → [Un cable submarino de fibra óptica, que es por donde viaja casi todo el tráfico intercontinental]
7. (T08) Estás depurando por qué los datos llegan incompletos o en desorden. ¿Qué capa de TCP/IP revisas? → [Transporte, donde TCP se encarga de la entrega completa y en orden]
8. (T09) Escribes un dominio y el navegador dice que no encuentra el sitio, pero si escribes la dirección IP del servidor sí carga. → [Falla la resolución DNS: el nombre no se está traduciendo a su IP]
9. (T11) Tienes el ISBN de un libro y quieres saber si es URL o solo URI. → [Solo URI: identifica el libro, pero no dice dónde ni cómo acceder a él]
10. (T13) Una tienda quiere cambiar solo el precio de un producto que ya existe, sin enviar el resto de sus datos. → [PATCH /products/{sku}]
11. (T13) Vas a registrar un producto nuevo que todavía no tiene SKU en el sistema. → [POST /products]
12. (T14) Vas a pagar con tarjeta desde el wifi de una cafetería. ¿Qué debes verificar? → [Que el sitio use HTTPS, para que TLS cifre los datos entre tu navegador y el servidor]
13. (T15) Tu equipo tiene un editor de video escrito en C++ y lo quiere ejecutar dentro del navegador con buen rendimiento. → [Compilar el código C++ a WebAssembly y cargarlo desde la página junto con JavaScript]
14. (T17) Un elemento tiene `display: none` y te preguntan en cuál de las estructuras del navegador aparece. → [Está en el DOM, pero no en el render tree]

Reparte la dificultad de los escenarios entre 2 y 3. Los distractores deben ser alternativas del mismo tema (otro método HTTP, otra capa, otro valor RGB, etc.).

## B4. Caza el error (fragmento con error → corrección)

1. "El sistema binario solo tiene 8 cantidades para contar: 1, 2, 4, 8, 16, 32, 64 y 128." → El binario tiene dos dígitos, 0 y 1; esos números son los valores de posición de los 8 bits de un byte. (T01)
2. "Un byte puede representar 128 valores distintos." → Representa 256 valores, del 0 al 255. (T01)
3. "Antes de los transistores, las computadoras usaban focos gigantes; hoy un procesador tiene millones de transistores." → Usaban tubos de vacío, y un procesador actual tiene miles de millones de transistores. (T02)
4. "ASCII usa 8 bits y define 256 caracteres, incluidos los acentos y la ñ." → ASCII usa 7 bits y define 128 caracteres; no incluye acentos ni ñ. (T03)
5. "Unicode usa siempre más de un byte por carácter." → Unicode solo asigna números; en UTF-8 los caracteres ASCII ocupan 1 byte y el resto de 2 a 4. (T04)
6. "Internet solo es posible mediante cables: ningún tramo de la conexión es inalámbrico." → El último tramo puede ser wifi, red celular o satélite; lo cableado es la columna vertebral. (T06)
7. "Internet es simplemente la red de cables que conecta las computadoras del mundo." → Es una red de redes interconectadas que se entienden mediante protocolos comunes; los cables son solo su parte física. (T06)
8. "ARPANET se creó como vía de comunicación de emergencia para sobrevivir a una guerra." → Su objetivo era compartir recursos de cómputo entre centros de investigación; lo otro es un mito popular. (T07)
9. "ARPANET usó TCP/IP desde su primer día, en 1969." → Empezó con el protocolo NCP y adoptó TCP/IP el 1 de enero de 1983. (T07)
10. "El modelo OSI tiene 4 capas y es el que internet usa en la práctica; TCP/IP es un modelo teórico de 7 capas." → Es al revés: OSI es el modelo teórico de 7 capas y TCP/IP, de 4 capas, es el que se usa. (T08)
11. "La Web e internet son lo mismo." → Internet es la infraestructura; la Web es un servicio que funciona sobre ella, igual que el correo electrónico. (T10)
12. "Tim Berners-Lee creó internet en 1989." → Creó la Web (HTML, URL y HTTP) en el CERN; internet ya existía. (T10)
13. "Un URI siempre indica cómo acceder al recurso; una URL solo lo identifica." → Es al revés: el URI identifica, y la URL además indica cómo y dónde acceder. (T11)
14. "Netscape fue el precursor de JavaScript, que después creó Google para Chrome." → JavaScript lo creó Brendan Eich en Netscape en 1995; Google aportó el motor V8 en 2008. (T12)
15. "El W3C publica el estándar del lenguaje JavaScript." → El estándar de JavaScript es ECMAScript, de Ecma International; el W3C impulsa estándares como HTML y CSS. (T12)
16. "En HTTP, el navegador envía su petición directamente a la base de datos." → La petición llega al servidor web, y es el servidor quien consulta la base de datos. (T13)
17. "PUT se usa para crear un recurso nuevo en /products y POST para actualizarlo por completo." → POST crea en /products; PUT actualiza reemplazando el recurso completo en /products/{sku}. (T13)
18. "En HTTPS, el certificado SSL es el que encripta el 100 % de la conexión." → Cifra el protocolo TLS; el certificado demuestra la identidad del servidor, y la IP y el dominio siguen visibles en la red. (T14)
19. "El navegador compila el código C y C++ para poder ejecutarlo." → El desarrollador lo compila antes a WebAssembly; el navegador solo ejecuta ese binario. (T15)
20. "5G significa baja latencia." → 5G significa quinta generación de redes móviles; la baja latencia es una de sus ventajas. (T16)
21. "En el layout, el navegador crea la estructura de la página a partir de las etiquetas HTML." → Eso es el DOM; el layout calcula el tamaño y la posición de cada caja. (T17)
22. "V8 convierte JavaScript en bytecode y ahí termina: nunca genera código máquina." → El código que más se ejecuta se compila a código máquina optimizado con JIT. (T18)

---

# PARTE D — Criterios de aceptación

Verifica antes de entregar (con script):

- [ ] Los bloques M01 y M02 son idénticos a los de `published_v3.html`; `engine.html` no cambió.
- [ ] M03 cumple el esquema: IDs únicos con prefijo `M03-`, `topic` existente, `answer` dentro de rango, 4 opciones distintas donde corresponde.
- [ ] Se cumplen los mínimos de B2 y los 18 temas tienen `summary`, `keyPoints`, al menos 4 `mcq` (una de dificultad 3) y 3 `tf`; entre 24 y 30 `tf` verdaderas.
- [ ] Los 14 escenarios de B3 y los 22 errores de B4 están presentes.
- [ ] Ninguna pregunta afirma algo que contradiga o no esté en B1. La revisión de palabras prohibidas pasa.
- [ ] El inicio muestra tres módulos; M03 abre su mapa con 18 temas; un quiz, un relámpago, un "¿Qué usarías?", un "Caza el error" y el jefe final de M03 funcionan; el progreso guardado y el héroe no se pierden.
- [ ] `smoke.cjs` y `hero.cjs` siguen pasando; el archivo abre sin errores de consola y se republica en la misma URL.
