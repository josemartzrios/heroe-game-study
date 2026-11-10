# CONTRATO DE EJECUCIÓN — Módulo M02 "Fundamentos de ingeniería de software"

Este documento añade un módulo al juego **Estudio ISW** ya publicado. Es autosuficiente: el ejecutor NO necesita la guía original ni el contrato anterior.

## Reglas para el ejecutor

1. **Solo añades el módulo M02.** No modifiques el motor, el módulo M01, los IDs de preguntas existentes ni la clave de `localStorage` (`estudio_isw_v1`): el progreso guardado depende de ellos.
2. **La Parte B es la única fuente de verdad.** No agregues datos, cifras, nombres ni ejemplos que no estén ahí. Si un hecho no aparece en la Parte B, no lo preguntes.
3. Todo el texto visible va en español (México). Los términos técnicos se quedan en inglés cuando así aparecen en la Parte B (kernel, driver, bootloader, hash...).
4. No hagas preguntas; ante una ambigüedad elige la opción más simple y anótala en una línea al final. Respuesta final: máximo 3 líneas.

## Parte A — Dónde y cómo insertar

**Si existe la carpeta `/home/claude/juego/`** (misma sesión donde se construyó M01):

- `content.mjs` tiene M01 en formato compacto, `build.mjs` lo expande y lo inyecta en `engine.html` (marcador `/*__MODULES__*/`) para generar `juego_estudio.html`; `validate.mjs` valida.
- Crea `content_m02.mjs` con el mismo formato compacto y extiende `build.mjs` para emitir los dos módulos, cada uno entre sus marcadores. Construye M01 primero y sin cambios.
- Extiende `validate.mjs` para validar M02 con los mínimos de B2.
- Republica `/home/claude/juego/juego_estudio.html` (misma ruta = misma URL).

**Si la carpeta no existe:** lee el artefacto publicado (`https://claude.ai/artifact/XrNzeFC2euPiF55Pex4ycd`), inserta el bloque nuevo justo después de la línea `// === MODULE:M01 END ===` y republica en esa misma URL.

En ambos casos el resultado dentro de `MODULES` debe quedar así:

```js
const MODULES = [
  // === MODULE:M01 START ===
  { ...sin cambios... },
  // === MODULE:M01 END ===
  // === MODULE:M02 START ===
  { id: "M02", title: "Fundamentos de ingeniería de software", topics: [...], questions: [...] },
  // === MODULE:M02 END ===
];
```

### Esquema de datos (igual que M01)

```js
{
  id: "M02",
  title: "Fundamentos de ingeniería de software",
  topics: [ { id: "T01", title: "...", summary: "2-3 frases", keyPoints: ["...", "..."] } ],
  questions: [
    { id: "M02-Q001", topic: "T01", type: "mcq", difficulty: 1,          // 1 fácil, 2 media, 3 difícil
      prompt: "...", options: ["a","b","c","d"], answer: 0, explanation: "..." },
    { id: "M02-V001", topic: "T05", type: "tf", difficulty: 1,
      prompt: "Afirmación", answer: true, explanation: "..." },
    { id: "M02-S001", topic: "T09", type: "scenario", difficulty: 2,
      prompt: "Situación real", options: ["...","...","...","..."], answer: 2, explanation: "..." },
    { id: "M02-E001", topic: "T03", type: "error", difficulty: 2,
      prompt: "Este fragmento contiene un error:\n“...”\n¿Cuál es el error?",
      options: ["...","...","...","..."], answer: 1, explanation: "Versión correcta: ..." }
  ]
}
```

Reglas: exactamente una opción correcta; 4 opciones distintas en `mcq`, `scenario` y `error`; distractores plausibles tomados del mismo tema (nada absurdo); la posición de la respuesta correcta debe variar; la explicación dice por qué es correcta y por qué falla la trampa más tentadora. En `keyPoints` se puede usar `**negritas**` y `` `código` ``. Los IDs de tema (`T01`…) son propios de cada módulo.

---

# PARTE B — Módulo M02: Fundamentos de ingeniería de software

Las líneas marcadas **[CORREGIDO]** difieren de los apuntes originales; la versión de aquí es la correcta.

## B1. Base de hechos por tema

### T01 — Bits, bytes y Unicode
- Una computadora representa toda la información con **bits**: 1 (voltaje alto) y 0 (voltaje bajo). 8 bits forman 1 byte.
- **[CORREGIDO]** La electricidad no es "una onda como el sonido o la luz": es un flujo de carga eléctrica. Dentro de la computadora, un bit es un nivel de voltaje alto o bajo.
- Texto, imágenes, sonido y programas se guardan como secuencias de bits.
- **Unicode** es el estándar que asigna un número único a cada carácter de todos los idiomas y a los emojis; por eso una carita feliz enviada a alguien en Rusia se ve como carita feliz.
- **[CORREGIDO]** UTF-8, UTF-16 y UTF-32 son formas de codificar Unicode en bytes. UTF-8 usa de 1 a 4 bytes por carácter (una letra básica ocupa 1 byte, un emoji 4); UTF-16 usa 2 o 4 bytes; UTF-32 usa siempre 4 bytes. El número indica el tamaño en bits de la unidad mínima, no cuánto ocupa cada carácter. UTF-8 es la codificación más usada en la web.

### T02 — Arranque del computador
- Al encender, lo primero que se ejecuta es el **firmware**, un programa guardado en un chip de memoria persistente de la tarjeta madre. En las PC es el **UEFI** (Unified Extensible Firmware Interface), sucesor del BIOS.
- **[CORREGIDO]** El firmware ejecuta el **POST** (Power-On Self-Test), que verifica que los componentes estén conectados y funcionando. No está "grabado en los transistores": es un programa almacenado en un chip de memoria.
- Después el firmware busca en el almacenamiento el **bootloader** (cargador de arranque), que carga el kernel del sistema operativo en la memoria RAM.
- Orden: encendido → firmware y POST → bootloader → kernel → sistema operativo listo.
- En smartphones el arranque también lo inicia un bootloader. En Android se ejecuta el Primary Boot Loader. **[CORREGIDO]** En iPhone es el Boot ROM, llamado **SecureROM** (no "Secure Room").
- En una PC el almacenamiento es una unidad aparte; en un smartphone es un chip soldado a la tarjeta madre.

### T03 — Transistores y chips
- Un **transistor** es un interruptor diminuto controlado por señales eléctricas: deja pasar o corta la corriente.
- Combinando transistores se hacen operaciones lógicas y matemáticas. Un microprocesador (chip) moderno tiene miles de millones de transistores.
- Los chips se fabrican en **silicio**, que se obtiene de la arena.
- Los transistores más pequeños se graban con **litografía ultravioleta extrema (EUV)**. La empresa ASML es la única que fabrica máquinas EUV. **[CORREGIDO]** ASML fabrica las máquinas, no los chips.
- **Ley de Moore:** el número de transistores en un circuito integrado se duplica aproximadamente cada dos años. Es una observación empírica de Gordon Moore (1965), no una ley física; ha sido motor del avance del cómputo y se ha desacelerado.

### T04 — CPU
- La **CPU** (Unidad Central de Procesamiento) ejecuta las instrucciones de los programas: cálculos, lógica y movimiento de datos desde y hacia la RAM.
- **[CORREGIDO]** Los programas se cargan del almacenamiento a la RAM y la CPU los ejecuta desde la RAM; no trabaja directamente sobre el disco.
- En una PC la CPU es un chip independiente (por ejemplo, Intel Core i7). En un smartphone va dentro de un System on a Chip (SoC).
- **Hertz:** 1 Hz es un ciclo por segundo. Una CPU de 3 GHz realiza 3 mil millones de ciclos por segundo.
- La arquitectura y el diseño interno determinan cuánto trabajo hace la CPU en cada ciclo.
- El enfriamiento permite que la CPU mantenga su velocidad máxima; si se calienta demasiado, reduce su velocidad para protegerse.
- Un **núcleo** es una unidad de procesamiento individual. Con varios núcleos, la CPU ejecuta varias tareas realmente al mismo tiempo.
- La CPU tiene una memoria **caché**: pequeña, muy rápida y ubicada dentro del procesador, para los datos que más usa.
- **[CORREGIDO]** La CPU solo ejecuta **código máquina** (binario). El lenguaje ensamblador es la versión legible de ese código y un programa ensamblador lo traduce. Los lenguajes de alto nivel se compilan a código máquina.

### T05 — Memoria y almacenamiento
- Jerarquía, de más rápida y pequeña a más lenta y grande: caché del procesador → RAM → SSD → disco duro mecánico (HDD).
- **[CORREGIDO]** Tiempos de acceso aproximados: caché, de 1 a unas decenas de nanosegundos; RAM, alrededor de 100 nanosegundos; SSD, microsegundos; HDD, milisegundos. Los valores exactos varían; lo importante es el orden.
- La **RAM** guarda los programas y datos en uso. Cada bit se guarda en un condensador diminuto: cargado es 1 y descargado es 0. **[CORREGIDO]** El condensador no "transforma energía en bits": almacena carga eléctrica, y la pierde sin electricidad.
- Memoria **volátil** (se pierde al apagar): caché del procesador y RAM. Memoria **persistente** (se conserva): disco duro, SSD y el chip del firmware UEFI.
- **HDD:** mecánico, con platos que giran como un disco de vinilo. **SSD:** celdas de memoria flash, sin partes móviles y mucho más veloz.
- **[CORREGIDO]** Al borrar un archivo normalmente solo se elimina su referencia en el índice del sistema de archivos; los datos siguen ahí hasta que se sobrescriben, y por eso a veces se pueden recuperar. No es cierto que "nunca se borran": al sobrescribirse desaparecen, y en los SSD modernos (función TRIM) se borran físicamente poco después.
- **[CORREGIDO]** El **memristor** fue teorizado en 1971 (Leon Chua) y fabricado por primera vez en 2008 (HP). Es una resistencia con memoria: su resistencia depende de la corriente que ha pasado por ella y la conserva sin energía. Podría unir memoria y procesamiento en un componente, pero sigue siendo tecnología experimental.

### T06 — Sistema operativo y kernel
- El **sistema operativo (SO)** es el software base: intermediario entre el hardware y las aplicaciones. Crea estándares para que los programadores no tengan que conocer las especificaciones técnicas de cada dispositivo.
- Flujo: aplicación → API (llamadas al sistema) → sistema operativo → driver → hardware.
- **[CORREGIDO]** El **kernel** es el núcleo del SO. Es software, no un dispositivo. Gestiona CPU, memoria y dispositivos, y controla los accesos y la seguridad (por eso una computadora puede tener datos separados para distintos usuarios).
- Un **driver** es software que le indica al SO cómo comunicarse con un dispositivo de hardware.
- Un **proceso** es un programa en ejecución (se ven en el administrador de tareas). El SO reparte el tiempo de CPU entre los procesos.
- **[CORREGIDO]** Con un solo núcleo, el SO alterna entre procesos tan rápido que parecen simultáneos, aunque es secuencial (concurrencia). Con varios núcleos, sí se ejecutan procesos realmente al mismo tiempo (paralelismo).
- **[CORREGIDO]** El SO da prioridad al mouse y al teclado en el uso de **CPU** (planificación e interrupciones), no "en la memoria RAM".
- **Anillos de protección:** anillo 0 para el kernel, con acceso total al hardware; anillo 3 para las aplicaciones, con acceso restringido, que piden servicios al kernel mediante llamadas al sistema. Los anillos 1 y 2 casi no se usan. En la práctica los drivers suelen ejecutarse en el anillo 0.
- El SO empezó con interfaz de solo texto (CLI, línea de comandos) y después llegó la interfaz gráfica.
- El SO protege tus datos con credenciales (usuario y contraseña).
- **[CORREGIDO]** No todo software que controla hardware tiene un SO: los dispositivos embebidos más simples ejecutan firmware directamente sobre el hardware. Los equipos complejos (médicos, astronómicos) sí suelen tener uno.

### T07 — Familias de sistemas operativos
- El SO nace de la necesidad de ejecutar varios programas en una misma computadora y acceder a distintos archivos.
- **[CORREGIDO]** UNIX (1969, Bell Labs) no fue el primer sistema operativo ni todos derivan de él. macOS e iOS derivan de Unix; Linux es "tipo Unix", escrito desde cero en 1991 por Linus Torvalds; **Windows no deriva de Unix**.
- **Windows:** lo usa la mayoría de las computadoras de escritorio; es de código cerrado.
- **Linux:** lo usa la mayoría de los servidores; es de código abierto.
- **macOS:** basado en Unix (por eso se parece a Linux en estructura), pero cerrado.
- **iOS:** tiene el mismo núcleo que macOS. **Android:** está basado en el kernel de Linux.
- Windows y Linux se usan tanto en escritorio como en servidores.

### T08 — Archivos, formatos y extensiones
- El sistema de archivos se organiza como un árbol. En Linux la raíz es `/` (una sola). En Windows cada unidad tiene su propia raíz con letra (el disco principal es `C:`).
- Carpetas típicas bajo la raíz: usuarios (dividida por usuario, con Escritorio, Documentos y Descargas), sistema operativo (drivers, configuraciones y archivos del núcleo) y aplicaciones.
- El ícono de guardar es un disquete porque antes la información se guardaba y trasladaba en disquetes.
- El **formato** de un archivo es cómo está organizado su contenido. La **extensión** (`.jpg`, `.pdf`) es el sufijo del nombre que indica el formato y con qué programa abrirlo. Windows y macOS ocultan las extensiones por defecto.
- El formato real está en el contenido: muchos archivos empiezan con una **cabecera** que identifica el formato (un PDF empieza con `%PDF`). Si la cabecera se daña, el archivo puede no abrirse; a veces se repara, pero requiere conocimientos avanzados. Cambiar la extensión no convierte el archivo a otro formato.
- HTML, JavaScript y Python son **texto plano** con una estructura lógica interna. **CSV** (Comma Separated Values) es texto plano con datos organizados como tabla y separados por comas.
- **Esteganografía:** técnica para ocultar información dentro de otro archivo (por ejemplo, un Excel dentro de una imagen JPG). Se usa en seguridad informática y espionaje. Oculta que el mensaje existe; el cifrado, en cambio, lo vuelve ilegible.
- **[CORREGIDO]** Windows (OneDrive) y macOS (iCloud) ofrecen sincronizar el Escritorio y Documentos con la nube, a veces activado por defecto, pero es opcional: se puede desactivar y guardar en el disco local. Lo sincronizado vive también en servidores de un data center.

### T09 — Permisos y privilegios
- En un hosting compartes una computadora con miles de usuarios, así que hacen falta permisos, accesos y privilegios de ejecución.
- Permisos: `r` leer (read), `w` escribir (write), `x` ejecutar (execute), `-` sin permiso.
- Se asignan a tres clases, en este orden: **dueño**, **grupo** y **otros**. Ejemplo: `rwxr-xr--` significa dueño todo, grupo leer y ejecutar, otros solo leer.
- Combinaciones: `rwx` permiso total; `rw-` leer y escribir; `r--` solo lectura; `--x` solo ejecutar; `r-x` leer y ejecutar (útil para scripts o programas); `---` sin permisos.
- Notación numérica: r = 4, w = 2, x = 1; se suman por clase. 7 = `rwx`, 6 = `rw-`, 5 = `r-x`, 4 = `r--`, 0 = `---`.
- Ejemplos: **640** = `rw-r-----`; **400** = `r--------`; **777** = `rwxrwxrwx`; **755** = `rwxr-xr-x`.
- 777 es riesgoso: cualquiera puede leer, modificar y ejecutar el archivo.
- Los permisos los gestiona el administrador (en Linux, el usuario `root`) y se cambian con el comando `chmod`.

### T10 — SoC, GPU y NPU
- **System on a Chip (SoC):** integra CPU, GPU, memoria y otros componentes en un solo chip. Nace para reducir el consumo de electricidad, el espacio y el número de chips; es el corazón de los teléfonos. Los transistores de la CPU y de la GPU están muy cerca unos de otros, pero son distintos.
- Los SoC de los teléfonos usan arquitectura ARM; las PC tradicionales usan x86-64.
- **[CORREGIDO]** No es cierto que los teléfonos tengan "16 núcleos" de CPU y más que una PC. Ejemplo: el Apple A18 Pro tiene CPU de 6 núcleos, GPU de 6 núcleos y un motor neuronal (NPU) de 16 núcleos. Las CPU de PC actuales tienen de 4 a más de 20 núcleos.
- **Memoria unificada:** en un SoC, la CPU, la GPU y la NPU comparten la misma memoria, lo que facilita ejecutar IA en el teléfono. En el modelo anterior, la GPU y su memoria estaban aparte.
- **GPU** (unidad de procesamiento gráfico): hace muchísimos cálculos simples en paralelo. La industria de los videojuegos impulsó su desarrollo. La **VRAM** es la memoria propia de una GPU dedicada, donde se cargan los datos que procesa.
- **[CORREGIDO]** Los modelos modernos de IA (deep learning) se entrenan en GPU por su procesamiento en paralelo; no "los primeros modelos de IA".
- **CUDA:** plataforma de NVIDIA para programar sus GPU en cómputo general. Solo funciona con GPU de NVIDIA.
- **NPU** (unidad de procesamiento neuronal): acelera redes neuronales con operaciones matriciales en paralelo; es muy eficiente para procesamiento de imágenes y reconocimiento de voz.

### T11 — Algoritmos y lenguajes
- Un **algoritmo** es un conjunto finito de pasos definidos para resolver un problema, con un principio y un fin.
- Los lenguajes de programación son la herramienta para expresar algoritmos. Lo importante no es saber muchos lenguajes, sino saber crear algoritmos que resuelvan problemas.
- **Compilado:** un compilador traduce todo el código a lenguaje de máquina antes de ejecutarlo; el resultado es un archivo ejecutable (`.exe` en Windows). Ejemplos: C y C++.
- **Java** se compila a **bytecode**, que ejecuta la Java Virtual Machine (JVM); así el mismo programa corre en distintos sistemas operativos.
- **Interpretado:** un intérprete ejecuta el código directamente, sin generar antes un ejecutable. Ejemplos: JavaScript en el navegador y Python.
- **[CORREGIDO]** "Interpretado" no significa siempre "línea a línea sin compilar": los motores modernos de JavaScript compilan el código mientras se ejecuta (JIT) y Python lo convierte internamente a bytecode. La diferencia práctica es que un lenguaje compilado entrega un ejecutable antes de correr y uno interpretado necesita su intérprete al momento de ejecutarse.

### T12 — Cómo funciona internet
- Internet es una red de redes. Un mensaje se convierte en bytes y se divide en **paquetes** que viajan siguiendo reglas llamadas protocolos.
- **[CORREGIDO]** El wifi conecta tu dispositivo con el router de forma inalámbrica; el módem conecta tu casa con el proveedor de internet. (Los apuntes mezclaban wifi y módem.)
- Ruta típica: dispositivo → router/módem → **ISP** (Internet Service Provider) → **IXP** (Internet Exchange Point, donde se interconectan las redes de distintos ISP) → servidores en un data center.
- La mayor parte del tráfico viaja por cables de fibra óptica, incluidos cables submarinos.
- El servidor es el intermediario: recibe el mensaje y lo entrega al destinatario.
- **Red celular (5G):** el teléfono se conecta por radio a antenas repartidas por la ciudad; las antenas están conectadas a la red por cable.
- **Internet satelital:** la antena de tu casa envía una señal de radio al satélite, que la reenvía a una estación terrestre conectada a internet.
- **[CORREGIDO]** No todas las solicitudes recorren toda la ruta: grandes compañías instalan servidores con copias de su contenido (caché o CDN) dentro o cerca de las redes de los ISP para responder más rápido. No es "una copia de sus bases de datos del ISP".
- La nube son los servidores de los data centers de grandes empresas.

### T13 — Direcciones IP
- Cada dispositivo en internet o en una red local tiene una dirección IP (Internet Protocol). "Computadora" aquí es cualquier dispositivo.
- **IPv4:** 4 bytes = 32 bits, escritos como cuatro números de 0 a 255. **[CORREGIDO]** La dirección más alta es `255.255.255.255` (no 255.255.255.55). Permite unos 4,300 millones de direcciones.
- **[CORREGIDO]** **IPv6** se creó por la escasez de direcciones IPv4. Usa **128 bits** y se escribe en hexadecimal en 8 grupos. La diferencia de fondo es el tamaño, no la notación. IPv4 sigue siendo el más usado y ambos conviven.
- **[CORREGIDO]** La **IANA** (Internet Assigned Numbers Authority) reparte grandes bloques de direcciones a los registros regionales (LACNIC para Latinoamérica y el Caribe); estos los entregan a los ISP, y el ISP asigna la dirección al usuario. La IANA no asigna direcciones a usuarios finales.
- **IP pública y privada:** el router asigna IP privadas a los dispositivos de tu red local (por ejemplo `192.168.0.20`); la IP pública es la que el ISP da a tu conexión. Son distintas.
- **NAT:** el router hace que todos los dispositivos de la casa salgan a internet compartiendo la misma IP pública.

### T14 — DNS y dominios
- El **DNS** (Domain Name System) traduce nombres de dominio a direcciones IP, porque los números son difíciles de recordar.
- **[CORREGIDO]** Antes del DNS (creado en 1983), los nombres se guardaban en un único archivo llamado `HOSTS.TXT`, mantenido de forma central y copiado a cada computadora de la red. No escalaba. No era un archivo que se compartieran los ISP.
- **Top Level Domain (TLD):** la terminación del dominio. `.com` y `.org` son genéricos; `.mx` es de país.
- **[CORREGIDO]** Un dominio no se compra para siempre: se **registra** (se renta) por periodos, normalmente anuales, con un registrador (por ejemplo, Namecheap). Te da el derecho de usar ese nombre y apuntarlo a una IP.
- **A Record:** registro DNS que indica a qué dirección IPv4 apunta el dominio.
- Tener una página web es rentar una computadora en un data center (hosting), lo que conocemos como la nube.
- *Omitido a propósito:* los apuntes afirman que un registrador concreto revende dominios por los que mostraste interés. Es una acusación no comprobada; no la incluyas en el juego.

### T15 — HTTP: peticiones, cookies y códigos
- **Modelo cliente/servidor:** el navegador (cliente) pide un recurso y el servidor responde.
- Una petición HTTP tiene un método, una URL, cabeceras (headers) y, a veces, un cuerpo (body).
- **GET:** pide datos. Sus parámetros viajan en la URL, son visibles y quedan en el historial del navegador; por eso no se usa para datos sensibles.
- **[CORREGIDO]** **POST:** envía los datos en el **body** de la petición, no en los headers. POST por sí solo no cifra nada: lo que cifra es HTTPS.
- **Cookies:** datos pequeños que el servidor pide al navegador guardar, asociados a un dominio. El navegador los reenvía en cada petición a ese dominio; sirven, por ejemplo, para mantener la sesión iniciada.
- **Familias de códigos de respuesta:** 2xx éxito, 3xx redirección, 4xx error del cliente, 5xx error del servidor.
- **200** petición exitosa. **201** recurso creado.
- **[CORREGIDO]** Las redirecciones habituales son **301** (permanente) y **302** (temporal); el 300 casi no se usa.
- **401** sin credenciales válidas (no autenticado). **403** autenticado pero sin permiso. **404** el recurso no existe.
- **[CORREGIDO]** **500** es un error interno del servidor (falla o mala configuración). "Servidor ocupado o no disponible" es **503**.
- Las aplicaciones móviles no usan HTML para su estructura: intercambian datos con el servidor en JSON (o XML) mediante APIs.

### T16 — HTTPS, cifrado y WebSockets
- **Cifrado de llave pública (asimétrico):** cada quien tiene un par de llaves. La pública se comparte con todos; la privada se mantiene en secreto.
- **[CORREGIDO]** Para enviar un mensaje cifrado se usa la llave pública **del destinatario**, y solo la llave privada del destinatario puede descifrarlo. (Los apuntes decían "tu llave pública" y "tu propia llave privada".)
- **Cifrado de extremo a extremo** (por ejemplo, WhatsApp): el servidor transporta el mensaje cifrado y no puede leerlo; solo el destinatario lo descifra.
- **[CORREGIDO]** **HTTPS** es HTTP sobre TLS. Transfiere cualquier recurso (HTML, imágenes, JSON), no solo HTML. Las llaves pública y privada se usan solo al inicio de la conexión (handshake) para verificar la identidad del servidor y acordar una **clave de sesión simétrica**; con esa clave se cifra el resto de la comunicación, porque es más rápida.
- **WebSocket** (`wss://` es su versión segura): conexión abierta, bidireccional y persistente, usada para tiempo real (chats). Empieza con una petición HTTP inicial que funciona como "apretón de manos", en la que el cliente pide "mejorar" (upgrade) la conexión. Después, cliente y servidor pueden enviarse mensajes en cualquier momento.
- En HTTP normal solo el cliente inicia la comunicación; en WebSocket el servidor también puede enviar datos sin que se los pidan.

### T17 — Servidores y la nube
- Un **servidor** es una computadora o programa que gestiona recursos y provee servicios a otros dispositivos (clientes) en una red.
- Tres formas de tener uno: **on-premise** (máquinas físicas que la empresa compra y mantiene en sus instalaciones), **local** (el que un desarrollador levanta en su propia computadora para desarrollo o pruebas) y **en la nube** (servidores virtuales o físicos mantenidos por un proveedor externo como AWS, Azure o Google Cloud, a los que se accede por internet).
- Tipos de servidor:
  - **Web:** almacena y entrega páginas web y contenido estático (HTML, CSS, imágenes); se especializa en peticiones HTTP.
  - **De aplicaciones:** procesa la lógica de negocio y genera contenido dinámico; suele trabajar junto a un servidor web.
  - **De bases de datos:** almacena, gestiona y recupera la información.
  - **De correo:** envía, recibe y almacena correos electrónicos.
  - **De archivos:** almacenamiento y acceso centralizado a documentos en una red.
  - **De impresión:** gestiona las solicitudes de impresión de múltiples usuarios.
  - **De video streaming:** distribuye video en tiempo real de manera optimizada.
  - **DNS:** traduce nombres de dominio a direcciones IP.
  - **Proxy:** intermediario entre el cliente y otros servidores; intercepta las peticiones y, según ciertas reglas, las envía al servidor de destino.

### T18 — Máquinas virtuales y contenedores
- Ambos resuelven el mismo problema: ejecutar varias aplicaciones en una sola máquina de forma segura y eficiente.
- **[CORREGIDO]** Antes se acostumbraba dedicar un servidor físico a cada aplicación, lo que dejaba gran parte de su capacidad sin usar. (No es que un servidor "solo pudiera ejecutar una aplicación".)
- **Máquina virtual (VM):** una computadora dentro de tu computadora, cada una con su propio sistema operativo completo. El software que divide un servidor físico en varias VM se llama **hipervisor**.
- Las VM son muy seguras y aisladas, pero consumen muchos recursos y tardan más en encender.
- Usos de las VM: correr varios sistemas operativos independientes en un mismo equipo, aislar entornos (dev, QA, prod) y reducir costos de hardware.
- El negocio de la nube funciona gracias a las VM: el proveedor divide un servidor físico en muchas VM independientes y, si un cliente necesita más CPU, RAM o almacenamiento, le asigna más VM o agranda las existentes.
- **Contenedor:** empaqueta solo la aplicación y sus dependencias, y **comparte el kernel** del sistema operativo de la máquina anfitriona. Por eso es muy rápido y ligero, y permite ejecutar cientos a la vez. Ejemplo: Docker.
- Limitación: un contenedor solo puede ejecutar aplicaciones compatibles con el sistema operativo de la máquina anfitriona. Al compartir kernel, su aislamiento es menor que el de una VM.

### T19 — Bases de datos: llaves primarias y foráneas
- Las bases de datos se alojan en servidores configurados para almacenar, gestionar y servir datos.
- Usan **motores** de bases de datos, como MySQL o PostgreSQL, que permiten a múltiples usuarios acceder a la información de manera eficiente y segura.
- Las bases relacionales son estrictas con lo que guardan: tablas con columnas y un tipo de dato por columna (int, string, date).
- **Llave primaria (PK):** identificador único de cada registro de una tabla.
- **Llave foránea (FK):** columna que hace referencia a la llave primaria de otra tabla para vincularlas.
- **[CORREGIDO]** Ejemplo: la tabla Usuarios tiene `usuario_id` como llave primaria. La tabla Posts tiene `post_id` como llave primaria y `usuario_id` como llave foránea. Es decir, `usuario_id` es primaria en Usuarios y foránea en Posts (no ambas cosas en Posts).
- **[CORREGIDO]** Evitar la redundancia es un objetivo de diseño (normalización), no una regla absoluta: a veces se duplican datos a propósito para leer más rápido (desnormalización).

### T20 — Blockchain y Bitcoin
- En la banca tradicional, el banco lleva en su base de datos (centralizada) el registro de las transacciones: si transfieres 100 pesos, se descuentan de tu cuenta y se suman a la del destinatario.
- **Blockchain** es un libro contable distribuido: cada computadora de la red (nodo) tiene una copia actualizada. Es descentralizada: no hay una entidad central que sirva como fuente de verdad, así que las operaciones se legitiman con un mecanismo matemático.
- **[CORREGIDO]** En Bitcoin las llaves no cifran ni descifran mensajes. La **llave privada firma** las transacciones (prueba que eres el dueño del dinero) y solo la tienes tú; la **llave pública** permite a cualquiera **verificar** esa firma, y de ella se deriva la dirección para recibir dinero.
- La base de datos está formada por **bloques**; cada bloque agrupa un número limitado de transacciones.
- **Hash:** huella de tamaño fijo calculada a partir de los datos; cualquier cambio en los datos cambia el hash. Bitcoin usa SHA-256.
- Cada bloque guarda el hash del bloque anterior; eso forma la cadena. Si alguien altera una transacción de un bloque ya minado, su hash cambia y deja de coincidir con el guardado en el bloque siguiente, lo que invalida ese bloque y todos los posteriores. De ahí viene la **inmutabilidad**.
- Un **nodo** valida y guarda la cadena. Un **minero** es un nodo que además compite por crear bloques.
- **Minería / Proof of Work:** los mineros compiten por ser el primero en encontrar un número (el **nonce**) que haga que el hash del bloque cumpla cierta condición. Es una adivinanza numérica: no hay atajos, solo probar muchísimas combinaciones, por eso importa la capacidad de cómputo. **[CORREGIDO]** No es "resolver ecuaciones".
- **Recompensa:** bitcoins nuevos más las comisiones de las transacciones. Incentiva a invertir en hardware y energía, lo que asegura la red.
- **Mempool:** sala de espera de las transacciones pendientes de entrar en un bloque. Minar un bloque es procesar y confirmar un conjunto de transacciones, que pasan a ser parte permanente del historial.
- Se añade un bloque nuevo aproximadamente cada 10 minutos.
- **[CORREGIDO]** Lo finito es la cantidad de bitcoins: como máximo **21 millones**. La recompensa por bloque se reduce a la mitad aproximadamente cada cuatro años (halving). Las transacciones no son finitas.
- Bitcoin fue creado por **Satoshi Nakamoto**, un seudónimo; publicó el diseño en 2008 y nadie sabe quién es.
- **Ataque del 51 %:** quien controle más de la mitad del poder de minado puede reescribir bloques recientes y gastar dos veces sus propias monedas. No puede gastar monedas ajenas, porque necesitaría sus llaves privadas.

### T21 — Computación cuántica
- La computación clásica usa bits; la cuántica usa **qubits** (bits cuánticos).
- Un qubit puede estar en **superposición**: una combinación de 0 y 1 al mismo tiempo, en distintas proporciones. Analogía: un bit es una bombilla encendida o apagada; un qubit puede estar encendido y apagado a la vez. Al medirlo, se obtiene 0 o 1.
- Los qubits son extremadamente frágiles y requieren condiciones muy controladas, como temperaturas cercanas al cero absoluto en muchos casos.
- Las computadoras cuánticas no reemplazarán a tu laptop para navegar: son máquinas especializadas en tipos específicos de problemas que son intratables incluso para las supercomputadoras clásicas.
- **[CORREGIDO]** Frente a Bitcoin: el algoritmo de **Grover** solo daría una ventaja cuadrática al minar, que es limitada. La amenaza mayor es el algoritmo de **Shor**, que podría obtener la llave privada a partir de la llave pública y así romper las firmas digitales. Las computadoras cuánticas actuales todavía no tienen esa capacidad.
- Riesgo teórico de un minero cuántico muy superior: centralizaría la minería y podría llegar a un ataque del 51 %.

### T22 — Redes neuronales
- Una **red neuronal** reconoce patrones complejos y transforma datos aparentemente inconexos en información útil.
- Tiene una capa de entrada, **capas ocultas** y una capa de salida. Las capas ocultas son el verdadero "cerebro": sus neuronas hacen operaciones matemáticas para extraer patrones.
- Las conexiones entre neuronas tienen **pesos**, que son los valores que la red aprende.
- La cantidad de capas y neuronas es crucial: demasiadas consumen recursos de más y pueden causar **sobreajuste** (overfitting): la red memoriza los datos de entrenamiento y falla con datos nuevos.
- **Entrenamiento**, en orden: (1) **inicialización**: se asignan valores aleatorios a los pesos; (2) **alimentación de datos**: se introducen ejemplos con su respuesta correcta, como miles de imágenes de números escritos a mano; (3) **propagación hacia adelante**: los datos atraviesan la red y generan una predicción; (4) **detección de errores**: se compara la predicción con el resultado correcto; (5) **retropropagación**: se ajustan los pesos para reducir el error.
- **[CORREGIDO]** La retropropagación calcula cuánto contribuyó cada peso al error, y con eso se ajustan los pesos (descenso de gradiente). **Sigmoide y ReLU son funciones de activación**: se aplican dentro de cada neurona durante la propagación hacia adelante; no son el mecanismo que ajusta los pesos.
- El ciclo se repite muchas veces hasta que el error es pequeño.

### T23 — LLMs
- Los grandes modelos de lenguaje (LLM) predicen el siguiente **token**, parecido a cómo completamos frases: "el gato maúlla y el perro…" → "ladra".
- **Tokens:** unidades en que se fragmenta el lenguaje; pueden ser palabras completas, fragmentos de palabra o caracteres.
- **Embeddings:** cada token se ubica como un vector en un espacio multidimensional. Las palabras similares quedan cerca (gato, perro, lobo); hay relaciones vectoriales (rey − hombre + mujer ≈ reina) y patrones como el tiempo verbal (caminé/caminar es similar a nadé/nadar).
- Con el lenguaje tokenizado y vectorizado, una red neuronal aprende las probabilidades de conexión entre tokens. La arquitectura que usan los LLM se llama **Transformer** (2017).
- **Atención:** mecanismo con el que el modelo da más peso a las palabras relevantes del contexto. En "el gato maúlla y el perro…", presta atención a "gato" y "maúlla" para predecir "ladra".
- **Temperatura:** parámetro de variabilidad. Baja: elige casi siempre el token más probable (más predecible). Alta: puede elegir opciones menos probables (más creativo).
- **[CORREGIDO]** Etapas para llegar a un asistente conversacional: preentrenamiento (predecir el siguiente token con enormes cantidades de texto) → ajuste con conversaciones → **RLHF** (Aprendizaje por Refuerzo con Retroalimentación Humana). En RLHF, evaluadores humanos califican las respuestas: se recompensa al modelo cuando responde bien y se le penaliza cuando no. Así aprende a mantener conversaciones coherentes, a saber cuándo dejar de generar texto y a tener un estilo consistente. El RLHF fue una pieza clave, no la única, para pasar de un generador de texto como GPT a un asistente como ChatGPT.

## B2. Banco de preguntas — cantidades mínimas

| Tipo | Mínimo | Regla |
|---|---|---|
| `mcq` | 92 | 4 por tema; al menos 1 de dificultad 3 por tema |
| `tf` | 69 | 3 por tema; aprox. mitad verdaderas y mitad falsas (entre 31 y 38 verdaderas) |
| `scenario` | 16 | Los 16 de B3 |
| `error` | 26 | Exactamente los de B4, redactados como pregunta de 4 opciones |

Cada línea [CORREGIDO] debe aparecer en al menos una pregunta `mcq` o `tf`, además de su pregunta `error` cuando la tenga.

## B3. Escenarios (respuesta correcta entre corchetes)

1. Necesitas correr tres sistemas operativos distintos, totalmente aislados, en un mismo servidor físico. [Máquinas virtuales] (T18)
2. Quieres ejecutar cientos de copias ligeras de una aplicación que arranquen en segundos sobre el mismo sistema operativo. [Contenedores] (T18)
3. Un script debe poder leerlo y ejecutarlo cualquiera, pero solo su dueño debe poder modificarlo. [Permisos 755, `rwxr-xr-x`] (T09)
4. Un archivo con claves secretas: solo el dueño debe poder leerlo y nadie debe poder modificarlo ni ejecutarlo. [Permisos 400, `r--------`] (T09)
5. Un formulario de inicio de sesión envía la contraseña al servidor. ¿Cómo debe viajar? [Con POST, en el body, sobre HTTPS] (T15)
6. Un chat necesita que el servidor envíe mensajes al cliente al instante, sin que el cliente esté preguntando. [WebSocket (`wss://`)] (T16)
7. Llega una petición sin credenciales a un recurso protegido de tu API. ¿Qué código respondes? [401] (T15)
8. Tu API creó un registro nuevo tras recibir un POST. ¿Qué código respondes? [201] (T15)
9. Vas a entrenar una red neuronal con millones de operaciones matriciales en paralelo. ¿Qué hardware usas? [GPU] (T10)
10. Registraste un dominio y quieres que apunte a la dirección IPv4 de tu servidor. ¿Qué configuras? [Un A Record en el DNS] (T14)
11. Llevas una hora escribiendo un documento y se va la luz sin haber guardado. ¿Por qué se perdió y dónde debió estar? [Estaba solo en la RAM, que es volátil; debió guardarse en almacenamiento persistente (SSD o disco duro)] (T05)
12. Usas un LLM para extraer datos de facturas y necesitas respuestas consistentes y predecibles. [Temperatura baja] (T23)
13. Tu red neuronal acierta casi todo con los datos de entrenamiento, pero falla con datos nuevos. ¿Qué ocurre? [Sobreajuste: la red memorizó los datos de entrenamiento] (T22)
14. Quieres enviarle a Ana un mensaje que solo ella pueda leer. ¿Con qué llave lo cifras? [Con la llave pública de Ana] (T16)
15. Una empresa regulada debe tener sus servidores físicamente dentro de sus propias instalaciones. [Servidores on-premise] (T17)
16. En casa hay cinco dispositivos y el proveedor de internet solo te da una IP pública. ¿Qué permite que todos naveguen? [NAT en el router] (T13)

## B4. Caza el error (fragmento con error → corrección)

1. "La electricidad es una onda, igual que el sonido, y la computadora interpreta esa onda como bits." → Un bit es un nivel de voltaje alto (1) o bajo (0); la electricidad es flujo de carga. (T01)
2. "UTF-8 significa que cada carácter ocupa 8 bits." → UTF-8 usa de 1 a 4 bytes por carácter. (T01)
3. "En los iPhone, el primer código de arranque se llama Secure Room." → Se llama SecureROM (el Boot ROM). (T02)
4. "El POST está grabado en los transistores del chip." → Lo ejecuta el firmware (UEFI), un programa guardado en un chip de memoria. (T02)
5. "Las CPU ejecutan directamente el lenguaje ensamblador." → Ejecutan código máquina; el ensamblador es su versión legible y hay que traducirlo. (T04)
6. "Al borrar un archivo, los datos nunca se borran realmente." → Se elimina la referencia; los datos duran hasta sobrescribirse, y en SSD con TRIM se borran poco después. (T05)
7. "El memristor nació hace dos décadas y realiza las operaciones matemáticas de un transistor." → Teorizado en 1971 y fabricado en 2008; es una resistencia con memoria, aún experimental. (T05)
8. "El kernel es un dispositivo que traduce las órdenes del usuario al hardware." → Es software: el núcleo del sistema operativo. (T06)
9. "El sistema operativo siempre ejecuta los procesos de forma secuencial; nunca hay ejecución simultánea real." → Con varios núcleos sí hay ejecución simultánea (paralelismo). (T06)
10. "El sistema operativo le da prioridad en la memoria RAM al mouse y al teclado." → Es prioridad en el uso de CPU, no en la RAM. (T06)
11. "Todo software que interactúa con hardware necesita un sistema operativo." → Los dispositivos embebidos simples ejecutan firmware sin sistema operativo. (T06)
12. "Windows, Linux y macOS evolucionaron de UNIX." → Windows no deriva de Unix; macOS sí, y Linux es tipo Unix escrito desde cero. (T07)
13. "Windows y Mac ya no dejan guardar datos en tu disco duro: todo queda en la nube." → La sincronización con la nube es opcional y se puede desactivar. (T08)
14. "Los smartphones tienen 16 núcleos de CPU, muchos más que una PC, que tiene de 4 a 8." → Los 16 núcleos son del motor neuronal (NPU); la CPU del A18 Pro tiene 6, y las PC tienen de 4 a más de 20. (T10)
15. "Los primeros modelos de inteligencia artificial fueron entrenados en GPU." → Son los modelos modernos de deep learning los que se entrenan en GPU. (T10)
16. "La dirección IPv4 más alta es 255.255.255.55." → Es 255.255.255.255. (T13)
17. "IPv6 se diferencia de IPv4 solo en que se escribe en hexadecimal." → La diferencia de fondo es que usa 128 bits en lugar de 32. (T13)
18. "La IANA asigna la dirección IP a cada usuario final." → La IANA reparte bloques a registros regionales, estos a los ISP, y el ISP asigna al usuario. (T13)
19. "Antes del DNS, los proveedores de internet compartían entre sí un archivo llamado host." → Era un único archivo HOSTS.TXT mantenido de forma central y copiado a cada computadora. (T14)
20. "Con POST, los datos sensibles viajan encapsulados en los headers." → Viajan en el body; y lo que cifra es HTTPS, no POST. (T15)
21. "El código 500 significa que el servidor está ocupado." → 500 es error interno del servidor; ocupado o no disponible es 503. (T15)
22. "HTTPS cifra todo el tráfico con las llaves pública y privada." → Esas llaves se usan solo en el handshake; el resto se cifra con una clave de sesión simétrica. (T16)
23. "En Bitcoin, la llave pública cifra el mensaje y la llave privada lo descifra." → La privada firma la transacción y la pública verifica la firma. (T20)
24. "En Bitcoin las transacciones son finitas." → Lo finito son los bitcoins: 21 millones como máximo. (T20)
25. "La mayor amenaza cuántica para Bitcoin es el algoritmo de Grover, que permitiría minar mucho más rápido." → Grover da una ventaja limitada; la amenaza mayor es Shor, que rompería las firmas digitales. (T21)
26. "En la retropropagación, la red ajusta los pesos mediante funciones como sigmoide o ReLU." → Sigmoide y ReLU son funciones de activación; los pesos se ajustan según su contribución al error (descenso de gradiente). (T22)

---

# PARTE D — Criterios de aceptación

Verifica antes de entregar (con script si puedes ejecutar código):

- [ ] M01 queda idéntico: mismos IDs, mismos textos, mismos marcadores.
- [ ] M02 cumple el esquema: IDs únicos con prefijo `M02-`, `topic` existente, `answer` dentro de rango, 4 opciones distintas donde corresponde.
- [ ] Se cumplen los mínimos de B2 y los 23 temas tienen `summary`, `keyPoints`, al menos 4 `mcq` (una de dificultad 3) y 3 `tf`.
- [ ] Los 16 escenarios de B3 y los 26 errores de B4 están presentes.
- [ ] Ninguna pregunta afirma algo que contradiga o no esté en B1. Ninguna menciona la acusación omitida de T14.
- [ ] El inicio muestra dos módulos; M02 abre su mapa con 23 temas; un quiz, un relámpago y el jefe final de M02 funcionan; el progreso de M01 no se pierde.
- [ ] El archivo abre sin errores de consola y se republica en la misma URL.
