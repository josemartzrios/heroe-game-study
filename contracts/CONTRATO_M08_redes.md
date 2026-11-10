# CONTRATO DE EJECUCIÓN — Módulo M08 "Redes informáticas"

Este documento añade un módulo al juego **Estudio ISW** ya publicado (módulos M01 a M07 + modo héroe). Es autosuficiente: el ejecutor NO necesita la guía original ni los contratos anteriores.

## Reglas para el ejecutor

1. **Solo añades el módulo M08.** No modifiques el motor (`engine.html`), el modo héroe, los módulos M01 a M07, los IDs existentes ni la clave de `localStorage` (`estudio_isw_v1`): el progreso guardado depende de ellos.
2. **La Parte B es la única fuente de verdad.** No agregues protocolos, puertos, cifras, nombres ni ejemplos que no estén ahí. Si un hecho no aparece en la Parte B, no lo preguntes.
3. Todo el texto visible va en español (México). Los nombres de protocolos y siglas se quedan como aparecen en la Parte B (TCP, UDP, HTTP, SSH, MAC, PAN, LAN, ping…).
4. El validador rechaza ciertas palabras en todo el archivo (nombres de marcas de cómics y juguetes). No escribas "Flash" con mayúscula ni palabras que contengan "lego" sin acento (por ejemplo "llego", "delego" o "colegio"). Si el validador marca una palabra, cambia la redacción de M08; no toques esa lista.
5. **Ningún enunciado (`prompt`) de M08 puede ser idéntico a uno de M01 a M07.** M02 y M03 ya tratan IP, DNS, HTTP, HTTPS, OSI y TCP/IP. Entre otros, ya existen estos enunciados exactos, que debes redactar distinto: "¿Cuántas capas tiene el modelo OSI?", "¿En qué capa de TCP/IP están HTTP y DNS?", "¿Qué capas de OSI equivalen a la capa de Aplicación de TCP/IP?", "¿Qué es un protocolo?", "¿Qué hace un router?", "¿Qué puerto usa HTTPS por defecto?", "¿Cuántos bits tiene una dirección IPv4?", "¿Cuántos bits usa IPv6?", "¿Cuál es la diferencia entre IP privada y pública?", "¿Quién asigna la dirección IP al usuario final?", "¿Qué hace el DNS?", "¿Qué es HTTPS?", "TCP/IP tiene 4 capas.", "El modelo OSI es el que internet usa en la práctica.", "HTTP pertenece a la capa de Transporte de TCP/IP.", "HTTPS usa por defecto el puerto 443." El validador debe comprobarlo.
6. En este módulo los distractores deben ser **otros protocolos, otras capas u otros conceptos de la Parte B** (por ejemplo MAC frente a IP, TCP frente a UDP, puerto frente a IP, Telnet frente a SSH). Esa es la dificultad real del tema.
7. No hagas preguntas; ante una ambigüedad elige la opción más simple y anótala en una línea al final. Respuesta final: máximo 3 líneas.

## Parte A — Dónde y cómo insertar

**Si existe la carpeta `/home/claude/juego/`:**

- Antes de tocar nada, copia `juego_estudio.html` (la versión publicada) a tu carpeta temporal como `published_v8.html`. Sirve para comprobar que M01 a M07 no cambian.
- `content.mjs` (M01) y `content_m02.mjs` a `content_m07.mjs` están en formato compacto; `build.mjs` los expande y los inyecta en `engine.html` (marcador `/*__MODULES__*/`) para generar `juego_estudio.html`; `validate.mjs` valida.
- Crea `content_m08.mjs` con el mismo formato compacto (exporta `topics, mcq, tf, scenario, error`):
  - `mcq`, `scenario`, `error`: `[tema, dificultad, texto, correcta, [3 incorrectas], explicación]`. En `error`, el texto es solo el fragmento; `build.mjs` arma el enunciado.
  - `tf`: `[tema, dificultad, afirmación, true|false, explicación]`.
- Extiende `build.mjs`: importa `content_m08.mjs`, llama `expand('M08', 'Redes informáticas', c8)` y emite su bloque después de `// === MODULE:M07 END ===`. No cambies `expand` ni el orden de los módulos anteriores.
- Extiende `validate.mjs`: `MODULES` debe tener M01 a M08 en ese orden; marcadores de M08 presentes; bloques M01 a M07 idénticos a `published_v8.html`; M08 validado con `checkModule` y los mínimos de B2; ningún `prompt` de M08 repetido en otro módulo; cobertura de los hechos **[CORREGIDO]** con expresiones regulares (como en los módulos anteriores) y de las semillas de escenarios; mantén la revisión de palabras prohibidas.
- En la carpeta temporal `jsd/` hay pruebas (`smoke.cjs`, `hero.cjs`, `m03.cjs` a `m07.cjs`). Deben seguir pasando; si alguna cuenta módulos, actualiza solo ese número (de 7 a 8). Copia `m07.cjs` como `m08.cjs`, cambia `M07` por `M08`, `MODULES[6]` por `MODULES[7]` y el número de temas (de 13 a 15; no cambies otros números), y ejecútala al menos 10 veces (las rondas son aleatorias).
- Todas las pruebas deben pasar siempre. (La intermitencia que tenía `smoke.cjs` ya se corrigió en su buscador de preguntas; si falla, es un problema real.)
- Republica `/home/claude/juego/juego_estudio.html` (misma ruta = misma URL; no pases `icon`). Actualiza la descripción a "8 módulos".

**Si la carpeta no existe:** lee el artefacto publicado (`https://claude.ai/artifact/XrNzeFC2euPiF55Pex4ycd`), inserta el bloque nuevo justo después de la línea `// === MODULE:M07 END ===` y republica en esa misma URL.

Resultado dentro de `MODULES`:

```js
const MODULES = [
  // === MODULE:M01 START ===  ...sin cambios...  // === MODULE:M01 END ===
  // ... M02 a M07 sin cambios ...
  // === MODULE:M08 START ===
  { id: "M08", title: "Redes informáticas", topics: [...], questions: [...] },
  // === MODULE:M08 END ===
];
```

### Esquema de datos (igual que los módulos anteriores)

```js
{
  id: "M08",
  title: "Redes informáticas",
  topics: [ { id: "T01", title: "...", summary: "2-3 frases", keyPoints: ["...", "..."] } ],
  questions: [
    { id: "M08-Q001", topic: "T01", type: "mcq", difficulty: 1,          // 1 fácil, 2 media, 3 difícil
      prompt: "...", options: ["a","b","c","d"], answer: 0, explanation: "..." },
    { id: "M08-V001", topic: "T05", type: "tf", difficulty: 1,
      prompt: "Afirmación", answer: true, explanation: "..." },
    { id: "M08-S001", topic: "T09", type: "scenario", difficulty: 2,
      prompt: "Situación real", options: ["...","...","...","..."], answer: 2, explanation: "..." },
    { id: "M08-E001", topic: "T03", type: "error", difficulty: 2,
      prompt: "Este fragmento contiene un error:\n“...”\n¿Cuál es el error?",
      options: ["...","...","...","..."], answer: 1, explanation: "Versión correcta: ..." }
  ]
}
```

Reglas: exactamente una opción correcta; 4 opciones distintas en `mcq`, `scenario` y `error`; la posición de la respuesta correcta varía (lo hace `expand`); la explicación dice por qué es correcta y por qué falla la trampa más tentadora. En `summary` y `keyPoints` se puede usar `**negritas**` y `` `código` ``. Cada tema lleva de 3 a 6 `keyPoints`. Los IDs de tema (`T01`…) son propios de cada módulo. Las preguntas no llevan bloques de código de varias líneas.

---

# PARTE B — Módulo M08: Redes informáticas

Las líneas marcadas **[CORREGIDO]** difieren de los apuntes originales; la versión de aquí es la correcta. Las marcadas **[AÑADIDO]** no estaban en los apuntes y completan el tema.

## B1. Base de hechos por tema

### T01 — Qué es una red informática
- Una **red informática** son varias **computadoras autónomas conectadas** que intercambian **datos y recursos**.
- "Computadora" es cualquier dispositivo: un servidor, un smartphone, una laptop, etc. **Autónoma** significa que cada una puede funcionar por sí sola.
- **[AÑADIDO]** Los recursos compartidos pueden ser archivos, impresoras o la propia conexión a internet.
- **ARPANET** fue la red pionera que sentó las bases de internet.
- **[CORREGIDO]** Los apuntes dicen que se creó "por encargo del Departamento de Defensa como medio de comunicación". Precisión: la financió **ARPA**, agencia del Departamento de Defensa, para que **centros de investigación compartieran recursos de cómputo**. No fue una red militar de emergencia (eso es un mito).
- **[AÑADIDO]** ARPANET **no es lo mismo que internet**: fue una de las redes que le dieron origen. Adoptó TCP/IP el 1 de enero de 1983, fecha que suele considerarse el nacimiento de internet.

### T02 — Medios de comunicación y tipos de señal
- Tres medios principales: **inalámbrico**, **satelital** y **cables**.
- **Inalámbrico**: usa **ondas electromagnéticas** (infrarrojo, bluetooth, wifi).
- **[CORREGIDO]** El **satélite también es inalámbrico** (usa ondas electromagnéticas); los apuntes lo separan por su gran alcance.
- **Cables**: de **cobre** (señales eléctricas) y de **fibra óptica** (pulsos de luz).
- **[CORREGIDO]** Los apuntes llaman a la fibra "el internet más rápido que existe". Precisión: su ventaja es la **capacidad (ancho de banda) y el alcance**, y no sufre interferencia eléctrica; la señal no "viaja más rápido" que por otros medios.
- **[AÑADIDO]** Señal **analógica**: toma **valores continuos** que cambian suavemente. Señal **digital**: toma **niveles discretos** (0 y 1), que son los bits. Las computadoras usan señales digitales, que resisten mejor el ruido porque se pueden regenerar.

### T03 — Modos de transmisión
- **Unicast** (uno a uno): el paquete va dirigido a **un solo destino**. Ejemplo: tu navegador con un servidor web.
- **Multicast** (uno a varios): el paquete llega a un **subconjunto** de dispositivos. Ejemplo: una transmisión en vivo a los suscritos a un canal.
- **Broadcast** (uno a todos): el paquete lo **reciben todas las demás máquinas** de la red, aunque no sea para ellas. Ejemplo: un aviso a todos los dispositivos de la red local.
- **[AÑADIDO]** Los routers no reenvían broadcast hacia internet: se limita a la red local.
- **[AÑADIDO]** **Anycast** (uno al más cercano): el paquete va al **miembro más cercano de un grupo**; lo usan servidores DNS y redes de entrega de contenido.

### T04 — Clasificación de redes por tamaño
- **PAN**: red de uso **personal** (audífonos conectados al smartphone). **[AÑADIDO]** Alcance de pocos metros.
- **LAN**: red de **área local**: una casa, una oficina, una escuela.
- **[CORREGIDO]** Los apuntes dicen "un módem a varios dispositivos en casa". En casa quien **reparte** la conexión a varios dispositivos es el **router**; el **módem** conecta con el proveedor (hoy suelen venir en un solo aparato).
- **MAN**: red de **área metropolitana**, de una **ciudad**.
- **WAN**: red de **área amplia**; **[AÑADIDO]** abarca países o continentes y conecta LAN lejanas entre sí.
- **[CORREGIDO]** Los apuntes llaman a **Internet** "la red más grande que se ha inventado". Precisión: es una **red de redes**: la interconexión de muchas redes (LAN, MAN, WAN) mediante TCP/IP; no es una sola red de un solo dueño.
- **[AÑADIDO]** De menor a mayor: PAN, LAN, MAN, WAN, Internet.

### T05 — Protocolos y capas
- Un **protocolo de red** es un conjunto de **reglas** que permite la comunicación entre computadoras.
- La mayoría de las redes se organizan en una **pila de capas**: cada capa **ofrece servicios a la capa de arriba** y usa los de la de abajo.
- **[AÑADIDO]** Ventaja: se puede cambiar una capa sin afectar a las demás, mientras respete su interfaz.
- **[CORREGIDO]** Los apuntes dicen que cada capa "encapsula sus propios datos, ocultándolos". Precisión: la **encapsulación** consiste en que, al **bajar** por las capas, cada una **añade su propio encabezado** a lo que recibe de la de arriba; en el destino, al **subir**, cada capa **quita** el suyo (desencapsulación).
- **[AÑADIDO]** Nombre de los datos en cada capa: **datos** (aplicación), **segmento** si es TCP o **datagrama** si es UDP (transporte), **paquete** (red), **trama** (enlace) y **bits** (física).
- **[AÑADIDO]** El emisor **baja** por las capas y el receptor **sube**; cada capa "conversa" con su capa equivalente del otro extremo.

### T06 — Modelo TCP/IP
- **TCP/IP** significa Transmission Control Protocol / Internet Protocol. Es el modelo **estándar** de internet.
- **[CORREGIDO]** Los apuntes lo llaman "protocolo". Precisión: no es un solo protocolo, sino una **familia de protocolos organizada en 4 capas**.
- De arriba abajo: **Aplicación**, **Transporte**, **Internet**, **Acceso a la red**. Se apoyan unas en otras "como un edificio".
- **Acceso a la red**: conexión física entre dispositivos y medio de transmisión (cable Ethernet, Wi-Fi); define cómo se envían y reciben los datos por la red física.
- **Internet**: **direccionamiento lógico** (direcciones IP) y **enrutamiento** de paquetes; permite que los datos viajen entre redes distintas. **[AÑADIDO]** Aquí viven IP y ICMP (el protocolo de `ping`).
- **Transporte**: servicios entre aplicaciones; **segmentación**, **control de flujo** y, **opcionalmente, fiabilidad**. TCP y UDP.
- **Aplicación**: la capa más cercana al usuario; los protocolos que usan las aplicaciones (HTTP, DNS, SMTP, FTP, SSH).
- "Ningún protocolo es mejor que otro: hay que pensar en el caso de uso de cada uno."

### T07 — Dirección IP
- La **dirección IP** identifica a un dispositivo en la red y permite **enrutar** los paquetes entre redes.
- **IPv4**: **32 bits = 4 bytes** (octetos), escritos como **cuatro números de 0 a 255** separados por puntos. Ejemplo: `126.54.9.70` equivale a `01111110.00110110.00001001.01000110`. Ocho bits forman un byte.
- **[CORREGIDO]** Los apuntes llaman a IPv4 "el estándar actual". Precisión: sigue siendo muy usado, pero **sus direcciones se agotaron** (unos 4,300 millones); **IPv6** (128 bits) lo va reemplazando y los dos conviven.
- **[AÑADIDO]** **IP privada**: solo vale dentro de una red local y **puede repetirse en redes distintas** (rangos `10.x.x.x`, `172.16.x.x` a `172.31.x.x` y `192.168.x.x`). **IP pública**: única en internet.
- **ICANN**: organización **sin ánimo de lucro** que coordina los identificadores únicos de internet (direcciones IP y nombres de dominio). **[AÑADIDO]** No asigna la IP a tu casa: reparte bloques a registros regionales, estos a los ISP y el ISP al usuario.
- La IP es una **asignación lógica** (depende de la red en la que estás) e identifica el origen y el destino finales del paquete, a diferencia de la MAC, que solo sirve dentro de cada red local.

### T08 — Modelo OSI: capas física, enlace y red
- **[CORREGIDO]** Los apuntes escriben "Open System Interconection" y lo llaman "protocolo". El nombre correcto es **Open Systems Interconnection** y es un **modelo de referencia** de **7 capas** (de la ISO), **no un protocolo**: sirve para entender y estandarizar la comunicación. En la práctica internet usa TCP/IP.
- De abajo arriba: **1 Física, 2 Enlace de datos, 3 Red, 4 Transporte, 5 Sesión, 6 Presentación, 7 Aplicación**.
- **Capa 1, Física**: transmite **bits como señales** por el medio (cables, conectores, ondas). **[CORREGIDO]** Los apuntes dicen "la electricidad se convierte en bits aquí"; no es solo electricidad: también **luz** (fibra) y **ondas de radio** (wifi).
- **Capa 2, Enlace de datos**: agrupa los bits en **tramas**, **controla el acceso al medio** y da una transmisión **confiable entre dos nodos directamente conectados**, con **detección (y a veces corrección) de errores**. **[AÑADIDO]** Un **switch** trabaja en esta capa, usando direcciones MAC.
- **Capa 3, Red**: **direccionamiento lógico** (IP) y **enrutamiento** de paquetes entre redes; maneja la congestión. **[AÑADIDO]** Un **router** trabaja en esta capa, usando direcciones IP.
- **Dirección MAC**: identificación **física** asignada por el **fabricante** a la tarjeta de red. **[AÑADIDO]** Tiene **48 bits (6 bytes)** y se usa **solo dentro de la misma red local**; no viaja a otras redes. La IP es **lógica**: una IP privada puede repetirse en redes distintas; la MAC no debería repetirse.

### T09 — Modelo OSI: capas de transporte a aplicación
- **Capa 4, Transporte**: comunicación de **extremo a extremo entre aplicaciones**; los datos se tratan como una **conversación**, no como paquetes sueltos. Protocolos: **TCP** y **UDP**. Aquí se usan los **puertos**.
- **Capa 5, Sesión**: **abre, mantiene y cierra** el diálogo entre aplicaciones. En el modelo se mencionan los **tokens** (control de turnos). **[CORREGIDO]** Los "tokens" de autenticación que se usan hoy en la web los maneja la propia aplicación; no deben confundirse con los de esta capa.
- **Capa 6, Presentación**: **traduce el formato** de los datos para que la aplicación de destino los entienda. **[AÑADIDO]** También se le asocian la **compresión** y el **cifrado**.
- **Capa 7, Aplicación**: contacto directo con el usuario final; ofrece los **protocolos** que usan las aplicaciones (HTTP, FTP, SMTP, DNS, SSH). **[CORREGIDO]** El navegador no "es" la capa de aplicación: usa sus protocolos. La seguridad no es propia de la capa; depende del protocolo (SSH y HTTPS cifran; Telnet y HTTP no).
- **[AÑADIDO]** En TCP/IP no existen sesión ni presentación como capas separadas: sus funciones las asumen la capa de aplicación y protocolos como TLS.

### T10 — TCP y UDP
- Los dos son protocolos de la capa de **transporte** y usan **puertos**.
- **TCP**: **orientado a conexión**; **confirma** la recepción de lo que llega, **reenvía lo que se pierde**, **ordena** los datos y controla el flujo. Es más lento por ese trabajo extra.
- **[CORREGIDO]** Los apuntes dicen que TCP "pide una confirmación para enviar los paquetes". Precisión: el receptor **confirma lo que recibió** y el emisor **retransmite lo que no fue confirmado**.
- **UDP**: **sin conexión, sin confirmación ni reenvío**; es **más ligero y veloz**, pero puede perder o desordenar datos. Se usa en **streaming**, videollamadas, juegos en línea y DNS.
- **[AÑADIDO]** Cuál usar depende del caso: páginas web, correo, descarga de archivos y SSH usan **TCP**; para una videollamada, perder un fotograma es aceptable y esperar su reenvío no, así que conviene **UDP**.

### T11 — Protocolos de aplicación y seguridad
- **[AÑADIDO]** Protocolos de aplicación comunes: **HTTP** y **HTTPS** (web), **FTP** (transferir archivos), **SMTP** (enviar correo), **POP3** (descargar correo), **DNS** (traducir nombres), **DHCP** (asignar IP automáticamente), **SSH** (conexión remota segura) y **Telnet** (conexión remota sin cifrar).
- **[CORREGIDO]** Los apuntes mezclan Telnet, SSH y HTTP en una sola frase confusa. Lo correcto: **Telnet y HTTP envían la información en texto plano** (cualquiera que observe la red puede leerla). Por eso hoy se usan **SSH** (reemplazo cifrado de Telnet) y **HTTPS** (HTTP sobre TLS). HTTP sin cifrar se considera inseguro y la mayoría de los sitios redirige a HTTPS.
- **TLS** es el sucesor de **SSL** (SSL está obsoleto). **[CORREGIDO]** Los apuntes lo ubican en la capa de transporte y dicen que impide que la información "sea interceptada". Precisión: TLS corre **sobre TCP**; **cifra** la conexión, verifica al servidor con un certificado y detecta alteraciones. No impide interceptar los datos: impide que quien los intercepte pueda **leerlos o modificarlos sin que se note**.
- **[AÑADIDO]** Puertos por defecto: HTTP **80**, HTTPS **443**, SSH **22**, Telnet **23**, FTP **21**, SMTP **25**, DNS **53**.

### T12 — Puertos
- **[CORREGIDO]** Los apuntes dicen "un espacio dentro de una IP". Precisión: un **puerto** es un **número de 16 bits (de 0 a 65535)** que identifica **qué aplicación o servicio** de un dispositivo debe recibir los datos. La **IP** identifica el **dispositivo**; el **puerto**, el **servicio**. Analogía: la IP es el edificio y el puerto es el departamento.
- **[AÑADIDO]** Un **socket** es la combinación de IP y puerto, por ejemplo `192.168.0.20:443`.
- **[AÑADIDO]** Puertos **0 a 1023**: "bien conocidos", reservados para servicios estándar (80, 443, 22…). **1024 a 65535**: los usan las aplicaciones, muchos de forma temporal.
- Los puertos pertenecen a la capa de **transporte** (TCP y UDP los usan); IP no tiene puertos.
- **[AÑADIDO]** Ejemplo: tu navegador abre la conexión desde un puerto temporal hacia el puerto 443 del servidor. Un servidor puede ofrecer varios servicios a la vez, cada uno en su puerto.

### T13 — OSI frente a TCP/IP
- **OSI**: 7 capas; modelo **teórico de referencia**. **TCP/IP**: 4 capas; lo que internet **usa en la práctica**.
- Equivalencias: **Aplicación + Presentación + Sesión** de OSI = **Aplicación**; **Transporte** = **Transporte**; **Red** = **Internet**; **Enlace + Física** = **Acceso a la red**.
- **[AÑADIDO]** TCP/IP **nació antes** (1974; ARPANET lo adoptó en 1983); OSI llegó después como modelo de referencia. TCP/IP no es "un OSI simplificado".
- **[AÑADIDO]** OSI sirve para **enseñar y diagnosticar**: ubicar en qué capa está un fallo (cable desconectado: capa 1; IP mal configurada: capa 3; puerto bloqueado: capa 4).
- Cada capa necesita de las demás: en el modelo ninguna capa es opcional.

### T14 — Ancho de banda, latencia y Wireshark
- **Ancho de banda**: la **capacidad máxima** de un enlace, es decir, **cuántos bits por segundo** pueden pasar. Analogía: la anchura de una tubería.
- **[CORREGIDO]** Los apuntes dicen "megabytes" y luego dan unidades en bits. Precisión: se mide en **bits por segundo** (bps, kbps, Mbps, Gbps), no en megabytes. **1 byte = 8 bits**, así que **100 Mbps ≈ 12.5 MB/s**.
- **[AÑADIDO]** Más ancho de banda **no hace que un bit viaje más rápido**: permite que pasen más a la vez. La **latencia** es el tiempo que tarda un dato en llegar (se mide en milisegundos) y es independiente. El **throughput** es lo que realmente se logra.
- **Wireshark**: **analizador de protocolos** (*packet sniffer*); **captura paquetes** y los muestra para analizarlos capa por capa. **[CORREGIDO]** Los apuntes destacan "su sencilla interfaz"; lo importante es qué permite: ver el tráfico. En HTTP o Telnet el contenido se ve en **texto plano**; en HTTPS o SSH solo se ve **cifrado**.
- **[AÑADIDO]** Es gratuito y de código abierto. Sirve para diagnosticar fallos, aprender protocolos y auditar seguridad; solo debe usarse en redes propias o con permiso.

### T15 — Reconocer la capa
- **Cable, wifi, señal, bits** → Física (OSI 1) / Acceso a la red.
- **MAC, tramas, switch** → Enlace de datos (OSI 2) / Acceso a la red.
- **IP, paquetes, router, enrutamiento** → Red (OSI 3) / Internet.
- **TCP, UDP, puertos, segmentos** → Transporte (OSI 4).
- **Abrir, mantener y cerrar el diálogo; tokens** → Sesión (OSI 5).
- **Formato, traducción, compresión, cifrado** → Presentación (OSI 6).
- **HTTP, DNS, SMTP, FTP, SSH** → Aplicación (OSI 7).
- Identificadores: **MAC** (enlace, física, local), **IP** (red, lógica, origen y destino finales), **puerto** (transporte, identifica el servicio).
- Confusiones frecuentes: IP frente a MAC; TCP frente a UDP; IP frente a puerto; OSI frente a TCP/IP; Telnet frente a SSH; HTTP frente a HTTPS; switch frente a router (switch: MAC, capa 2; router: IP, capa 3).

## B2. Banco de preguntas — cantidades mínimas

| Tipo | Mínimo | Regla |
|---|---|---|
| `mcq` | 60 | 4 por tema; al menos 1 de dificultad 3 por tema |
| `tf` | 45 | 3 por tema; aprox. mitad verdaderas y mitad falsas (entre 21 y 25 verdaderas) |
| `scenario` | 19 | Los 19 de B3 |
| `error` | 23 | Exactamente los de B4, redactados como pregunta de 4 opciones |

Cada hecho **[CORREGIDO]** debe aparecer en al menos una `mcq` o `tf` (además de su pregunta `error`, si la tiene). Las `tf` falsas deben ser falsas por un hecho concreto de B1, no por un matiz de redacción. En T15 incluye preguntas "¿en qué capa está…?" en los dos sentidos (de la tecnología a la capa y de la capa a la tecnología) y de comparación entre parecidos (IP frente a MAC, switch frente a router).

## B3. Escenarios (respuesta correcta entre corchetes)

Donde la respuesta es un nombre (medio, modo, red, capa, protocolo), las cuatro opciones son del mismo tipo, tomadas de B1.

1. (T02) Quieres conectar dos edificios con un enlace de mucha capacidad y sin interferencia eléctrica. → [Fibra óptica] (opciones: cable de cobre, bluetooth, infrarrojo)
2. (T03) Un servidor envía una transmisión en vivo solo a los usuarios suscritos a un canal. → [Multicast] (opciones: unicast, broadcast, anycast)
3. (T04) Conectas tus audífonos inalámbricos al smartphone. → [PAN]
4. (T04) Un municipio conecta las cámaras y los semáforos de toda la ciudad en una sola red. → [MAN]
5. (T04) Una empresa une sus oficinas de México, Chile y España en una sola red. → [WAN]
6. (T05) Al enviar datos, la capa de transporte les añade su propio encabezado antes de pasarlos a la capa de abajo. ¿Cómo se llama ese proceso? → [Encapsulación] (opciones: desencapsulación, enrutamiento, segmentación)
7. (T06) Un técnico revisa el direccionamiento lógico y el enrutamiento entre redes. ¿Qué capa de TCP/IP examina? → [Internet] (opciones: Acceso a la red, Transporte, Aplicación)
8. (T07) Dos casas distintas tienen un dispositivo con la IP `192.168.0.20` y no hay ningún conflicto. ¿Por qué? → [Son IP privadas: solo valen dentro de su red local y pueden repetirse] (opciones en texto: porque la MAC resuelve el conflicto; porque ICANN asigna una IP distinta a cada casa; porque IPv6 permite repetir direcciones)
9. (T07) Un compañero afirma que `300.12.5.8` es una dirección IPv4 válida. ¿Qué respondes? → [No: cada número de una IPv4 va de 0 a 255] (opciones en texto)
10. (T08) Dos computadoras conectadas directamente por cable se identifican entre sí con una dirección asignada por el fabricante de su tarjeta de red. ¿Cuál es? → [Dirección MAC] (opciones: IP pública, puerto, dominio)
11. (T09) Una aplicación necesita convertir los datos recibidos (descomprimirlos y descifrarlos) a un formato que pueda entender. ¿Qué capa OSI lo hace? → [Presentación] (opciones: Sesión, Aplicación, Transporte)
12. (T10) Una videollamada pierde un fotograma, pero debe seguir en vivo sin esperar reenvíos. ¿Qué protocolo de transporte conviene? → [UDP] (opciones: TCP, IP, HTTPS)
13. (T10) Descargas un archivo y no puede faltar ningún byte ni llegar desordenado. ¿Qué protocolo de transporte conviene? → [TCP] (opciones: UDP, IP, DNS)
14. (T11) Un administrador entra por Telnet a un servidor desde una cafetería. ¿Cuál es el riesgo y qué usarías en su lugar? → [Telnet envía todo en texto plano; usar SSH] (opciones en texto)
15. (T11) Una página con formulario de inicio de sesión funciona por HTTP sin cifrar. ¿Qué conviene hacer? → [Pasarla a HTTPS] (opciones: pasarla a Telnet, a UDP, a FTP)
16. (T12) Un servidor web y un servidor SSH funcionan en la misma IP. ¿Cómo sabe la máquina a cuál entregar cada conexión? → [Por el puerto] (opciones: por la dirección MAC, por la capa física, por el ancho de banda)
17. (T13) Se desconecta el cable de red de una computadora. ¿En qué capa OSI está el fallo? → [Física] (opciones: Enlace de datos, Red, Transporte)
18. (T14) Contratas 100 Mbps y descargas un archivo de 100 MB. ¿Cuánto tardaría aproximadamente en el mejor caso? → [Unos 8 segundos] (opciones: un segundo, unos 12 segundos, unos 100 segundos)
19. (T15) En Wireshark ves una trama con una dirección MAC de origen y una de destino. ¿A qué capa OSI pertenece esa información? → [Enlace de datos] (opciones: Red, Transporte, Física)

Reparte la dificultad de los escenarios entre 2 y 3.

## B4. Caza el error (fragmento con error → corrección)

1. "ARPANET e internet son exactamente la misma red." → ARPANET fue la red pionera, una de las que dieron origen a internet; no son lo mismo. (T01)
2. "La fibra óptica transmite los datos como señales eléctricas." → Los transmite como pulsos de luz; las señales eléctricas son del cable de cobre. (T02)
3. "El satélite no es un medio inalámbrico porque no usa ondas electromagnéticas." → Sí usa ondas electromagnéticas: es inalámbrico. (T02)
4. "Una señal digital toma cualquier valor continuo, y una señal analógica solo toma los valores 0 y 1." → Es al revés: la analógica es continua y la digital usa niveles discretos (bits). (T02)
5. "En broadcast el paquete llega únicamente a un subconjunto de dispositivos." → En broadcast llega a todos; el subconjunto es multicast. (T03)
6. "Una LAN abarca varias ciudades y una WAN solo una casa." → Es al revés: LAN es local y WAN es de área amplia. (T04)
7. "Internet es una sola red física que pertenece a una única organización." → Es una red de redes interconectadas mediante TCP/IP. (T04)
8. "En la encapsulación, cada capa oculta los datos de las demás sin añadirles nada." → Al bajar, cada capa añade su propio encabezado; al subir, cada una quita el suyo. (T05)
9. "TCP/IP es un único protocolo de siete capas." → Es una familia de protocolos organizada en cuatro capas. (T06)
10. "Una dirección IPv4 tiene 128 bits." → Tiene 32 bits; los 128 bits son de IPv6. (T07)
11. "ICANN asigna directamente a cada usuario su dirección IP." → ICANN coordina los identificadores; los bloques se reparten a registros regionales, de ahí a los ISP y el ISP asigna al usuario. (T07)
12. "El modelo OSI es un protocolo de red que se usa para enviar los datos en internet." → Es un modelo de referencia de 7 capas, no un protocolo; internet usa TCP/IP. (T08)
13. "La capa física solo se ocupa de transmitir electricidad." → Transmite bits como señales eléctricas, de luz (fibra) o de radio (wifi). (T08)
14. "La dirección MAC es lógica y la asigna el proveedor de internet; la IP es física y la asigna el fabricante." → Es al revés: la MAC es física y la asigna el fabricante; la IP es lógica. (T08)
15. "La capa de sesión convierte los datos al formato que entiende la aplicación." → Eso lo hace la capa de presentación; la sesión abre, mantiene y cierra el diálogo. (T09)
16. "TCP es más veloz porque no confirma la recepción, y UDP reenvía lo que se pierde." → Es al revés: TCP confirma y retransmite (más lento); UDP no confirma (más veloz). (T10)
17. "Telnet es el protocolo seguro para conexión remota y SSH envía todo en texto plano." → Es al revés: Telnet envía texto plano; SSH cifra. (T11)
18. "TLS impide que alguien intercepte la información que viaja por la red." → No impide interceptarla: impide que quien la intercepte pueda leerla o modificarla sin que se note. (T11)
19. "El puerto identifica al dispositivo en internet y la IP identifica a la aplicación." → Es al revés: la IP identifica el dispositivo y el puerto, el servicio. (T12)
20. "El modelo OSI tiene cuatro capas y TCP/IP tiene siete." → Es al revés: OSI tiene siete y TCP/IP cuatro. (T13)
21. "El ancho de banda se mide en megabytes por segundo, y 100 Mbps equivalen a 100 megabytes por segundo." → Se mide en bits por segundo; 100 Mbps equivalen a unos 12.5 MB/s. (T14)
22. "Wireshark solo puede capturar tráfico cifrado, porque el texto plano no se puede capturar." → Captura todo el tráfico: el texto plano se ve legible y el cifrado solo se ve cifrado. (T14)
23. "Un router decide a dónde enviar los datos usando direcciones MAC, en la capa de enlace." → El router usa direcciones IP en la capa de red; el switch es el que usa MAC en la capa de enlace. (T15)

---

# PARTE D — Criterios de aceptación

Verifica antes de entregar (con script):

- [ ] Los bloques M01 a M07 son idénticos a los de `published_v8.html`; `engine.html` no cambió.
- [ ] M08 cumple el esquema: IDs únicos con prefijo `M08-`, `topic` existente, `answer` dentro de rango, 4 opciones distintas donde corresponde.
- [ ] Se cumplen los mínimos de B2 y los 15 temas tienen `summary`, `keyPoints`, al menos 4 `mcq` (una de dificultad 3) y 3 `tf`; entre 21 y 25 `tf` verdaderas.
- [ ] Los 19 escenarios de B3 y los 23 errores de B4 están presentes.
- [ ] Ningún `prompt` de M08 es idéntico a uno de otro módulo. Ninguna pregunta afirma algo que contradiga o no esté en B1. La revisión de palabras prohibidas pasa.
- [ ] El inicio muestra ocho módulos; M08 abre su mapa con 15 temas; un quiz, un relámpago, un "¿Qué usarías?", un "Caza el error" y el jefe final de M08 funcionan; el progreso guardado y el héroe no se pierden.
- [ ] `smoke.cjs`, `hero.cjs` y `m03.cjs` a `m08.cjs` pasan; el archivo abre sin errores de consola y se republica en la misma URL.
