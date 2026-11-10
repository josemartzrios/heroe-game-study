# CONTRATO DE EJECUCIÓN — Módulo M10 "Ciberseguridad"

Este documento añade el último módulo al juego **Estudio ISW** ya publicado (módulos M01 a M09 + modo héroe). Es autosuficiente: el ejecutor NO necesita ninguna guía ni los contratos anteriores. Como en M09, este módulo no sale de unos apuntes: la Parte B es la fuente original (la lista del OWASP Top 10:2025 se verificó en el sitio oficial de OWASP).

## Reglas para el ejecutor

1. **Solo añades el módulo M10.** No modifiques el motor (`engine.html`), el modo héroe, los módulos M01 a M09, los IDs existentes ni la clave de `localStorage` (`estudio_isw_v1`): el progreso guardado depende de ellos.
2. **La Parte B es la única fuente de verdad.** No agregues ataques, algoritmos, herramientas, cifras, categorías ni ejemplos que no estén ahí. Si un hecho no aparece en la Parte B, no lo preguntes. No cambies los nombres ni el orden de las categorías del OWASP Top 10:2025.
3. **Contenido defensivo.** Las preguntas explican qué es cada ataque, cómo reconocerlo y cómo prevenirlo. No incluyas cargas de ataque (*payloads*) ni pasos para explotar nada, más allá de los ejemplos mínimos que aparecen literalmente en la Parte B.
4. Todo el texto visible va en español (México). Los términos técnicos se quedan como aparecen en la Parte B (OWASP, XSS, CSRF, SQL injection, IDOR, SSRF, JWT, MFA, CORS, CSP, SAST, DAST, CVE, phishing, ransomware, hash, sal…). Usa "llave" (no "clave") para las llaves criptográficas, igual que los módulos anteriores.
5. El validador rechaza ciertas palabras en todo el archivo (nombres de marcas de cómics y juguetes). No escribas "Flash" con mayúscula ni palabras que contengan "lego" sin acento (por ejemplo "llego" o "delego"; "privilegio" sí es válida, porque no contiene esas cuatro letras seguidas). Si el validador marca una palabra, cambia la redacción de M10; no toques esa lista.
6. **Ningún enunciado (`prompt`) de M10 puede ser idéntico a uno de M01 a M09.** Varios módulos ya tocan seguridad. Ya existen estos enunciados exactos, que debes redactar distinto: "¿Qué es un hash?", "¿Qué es un token?", "¿Qué hace el rate limiting?", "¿De qué protege el rate limiting?", "¿Para qué sirve el certificado de un sitio?", "¿Para qué se usan las llaves pública y privada en HTTPS?", "¿Qué logra TLS respecto a la información interceptada?", "TLS es el sucesor de SSL, que quedó obsoleto.", "¿Dónde debe guardarse la llave de API?", "Un formulario de inicio de sesión envía la contraseña al servidor. ¿Cómo debe viajar?", "Una página con formulario de inicio de sesión funciona por HTTP sin cifrar. ¿Qué conviene hacer?", "El modelo genera una consulta SQL a partir de lo que escribe el usuario y tu código la ejecuta tal cual. ¿Qué debes hacer?". El validador debe comprobarlo.
7. En este módulo los distractores deben ser **otros conceptos de la Parte B** (XSS frente a CSRF frente a SQL injection, autenticación frente a autorización, hash frente a cifrado frente a codificación, simétrico frente a asimétrico, vulnerabilidad frente a amenaza frente a riesgo, SAST frente a DAST, DoS frente a DDoS, 401 frente a 403). Esa es la dificultad real del tema.
8. No hagas preguntas; ante una ambigüedad elige la opción más simple y anótala en una línea al final. Respuesta final: máximo 3 líneas.

## Parte A — Dónde y cómo insertar

**Si existe la carpeta `/home/claude/juego/`:**

- Antes de tocar nada, copia `juego_estudio.html` (la versión publicada) a tu carpeta temporal como `published_v10.html`. Sirve para comprobar que M01 a M09 no cambian.
- `content.mjs` (M01) y `content_m02.mjs` a `content_m09.mjs` están en formato compacto; `build.mjs` los expande y los inyecta en `engine.html` (marcador `/*__MODULES__*/`) para generar `juego_estudio.html`; `validate.mjs` valida.
- Crea `content_m10.mjs` con el mismo formato compacto (exporta `topics, mcq, tf, scenario, error`):
  - `mcq`, `scenario`, `error`: `[tema, dificultad, texto, correcta, [3 incorrectas], explicación]`. En `error`, el texto es solo el fragmento; `build.mjs` arma el enunciado.
  - `tf`: `[tema, dificultad, afirmación, true|false, explicación]`.
  - El archivo es largo: escríbelo en dos partes (`m10_a.mjs` con `topics` y `mcq`; `m10_b.mjs` con `tf`, `scenario` y `error`, empezando con una línea en blanco), únelas con `cat` en `content_m10.mjs` y borra las partes.
- Extiende `build.mjs`: importa `content_m10.mjs`, llama `expand('M10', 'Ciberseguridad', c10)` y emite su bloque después de `// === MODULE:M09 END ===`. No cambies `expand` ni el orden de los módulos anteriores.
- Extiende `validate.mjs`: `MODULES` debe tener M01 a M10 en ese orden; marcadores de M10 presentes; bloques M01 a M09 idénticos a `published_v10.html`; M10 (es `MODULES[9]`) validado con `checkModule` y los mínimos de B2; ningún `prompt` de M10 repetido en otro módulo; cobertura de los hechos **[CLAVE]** con expresiones regulares sobre el texto de `mcq` y `tf` (como en M09) y de las semillas de escenarios; comprobación de que los diez nombres de categoría de B1-T07 aparecen literalmente en M10; mantén la revisión de palabras prohibidas.
- En la carpeta temporal `jsd/` hay pruebas (`smoke.cjs`, `hero.cjs`, `m03.cjs` a `m09.cjs`). Deben seguir pasando.
  - En `smoke.cjs` cambia **solo** la línea `Inicio muestra nueve módulos` (texto a "diez" y su `=== 9` a `=== 10`). **No uses un reemplazo global de números**: hay otras comparaciones con 8 y 9 que no deben cambiar (por ejemplo `saved.topics['M01:T09'].length === 8`).
  - Copia `m09.cjs` como `m10.cjs`, cambia `M09` por `M10`, `MODULES[8]` por `MODULES[9]` y el número de temas (de 19 a 20; no cambies otros números), y ejecútala al menos 10 veces (las rondas son aleatorias).
- Todas las pruebas deben pasar siempre.
- Republica `/home/claude/juego/juego_estudio.html` (misma ruta = misma URL; no pases `icon`). Actualiza la descripción a "10 módulos".

**Si la carpeta no existe:** lee el artefacto publicado (`https://claude.ai/artifact/XrNzeFC2euPiF55Pex4ycd`), inserta el bloque nuevo justo después de la línea `// === MODULE:M09 END ===` y republica en esa misma URL.

Resultado dentro de `MODULES`:

```js
const MODULES = [
  // === MODULE:M01 START ===  ...sin cambios...  // === MODULE:M01 END ===
  // ... M02 a M09 sin cambios ...
  // === MODULE:M10 START ===
  { id: "M10", title: "Ciberseguridad", topics: [...], questions: [...] },
  // === MODULE:M10 END ===
];
```

### Esquema de datos (igual que los módulos anteriores)

```js
{
  id: "M10",
  title: "Ciberseguridad",
  topics: [ { id: "T01", title: "...", summary: "2-3 frases", keyPoints: ["...", "..."] } ],
  questions: [
    { id: "M10-Q001", topic: "T01", type: "mcq", difficulty: 1,          // 1 fácil, 2 media, 3 difícil
      prompt: "...", options: ["a","b","c","d"], answer: 0, explanation: "..." },
    { id: "M10-V001", topic: "T05", type: "tf", difficulty: 1,
      prompt: "Afirmación", answer: true, explanation: "..." },
    { id: "M10-S001", topic: "T09", type: "scenario", difficulty: 2,
      prompt: "Situación real", options: ["...","...","...","..."], answer: 2, explanation: "..." },
    { id: "M10-E001", topic: "T03", type: "error", difficulty: 2,
      prompt: "Este fragmento contiene un error:\n“...”\n¿Cuál es el error?",
      options: ["...","...","...","..."], answer: 1, explanation: "Versión correcta: ..." }
  ]
}
```

Reglas: exactamente una opción correcta; 4 opciones distintas en `mcq`, `scenario` y `error`; la posición de la respuesta correcta varía (lo hace `expand`); la explicación dice por qué es correcta y por qué falla la trampa más tentadora. En `summary` y `keyPoints` se puede usar `**negritas**` y `` `código` ``. Cada tema lleva de 3 a 6 `keyPoints`. Los IDs de tema (`T01`…) son propios de cada módulo. Las preguntas no llevan bloques de código de varias líneas.

---

# PARTE B — Módulo M10: Ciberseguridad

Las líneas marcadas **[CLAVE]** son las ideas que más se confunden o que más importan en la práctica: cada una debe aparecer en al menos una `mcq` o `tf`.

## B1. Base de hechos por tema

### T01 — Fundamentos: la tríada CIA y el riesgo
- La seguridad de la información protege tres propiedades, la **tríada CIA**: **confidencialidad** (solo accede quien está autorizado), **integridad** (los datos no se alteran sin autorización) y **disponibilidad** (el sistema está accesible cuando se necesita).
- Ejemplos: una filtración de datos rompe la confidencialidad; modificar un saldo sin permiso rompe la integridad; un ataque que tumba el sitio rompe la disponibilidad.
- **Activo**: lo que tiene valor y hay que proteger (datos, sistemas, reputación).
- **[CLAVE]** **Vulnerabilidad**: una **debilidad** del sistema. **Amenaza**: algo o alguien que **puede aprovecharla**. **Riesgo**: la **probabilidad** de que ocurra **por su impacto**. No son sinónimos.
- **Exploit**: código o técnica que aprovecha una vulnerabilidad concreta.
- **[CLAVE]** La seguridad total no existe: se trata de **gestionar el riesgo**, reduciéndolo a un nivel aceptable según el valor de lo que se protege.

### T02 — Principios de diseño seguro
- **[CLAVE]** **Mínimo privilegio**: cada usuario, proceso o servicio recibe **solo los permisos indispensables** para su tarea, y nada más.
- **Defensa en profundidad**: **varias capas** de protección independientes; si una falla, las demás siguen protegiendo. Ninguna medida única es suficiente.
- **Seguro por defecto**: la configuración inicial es la más restrictiva; lo que no está permitido de forma explícita queda **denegado** (denegar por defecto).
- **[CLAVE]** **Nunca confíes en la entrada**: todo dato que viene de fuera (formularios, URL, cabeceras, archivos, otras API) se **valida en el servidor**. La validación en el navegador mejora la experiencia, pero **no es una medida de seguridad**, porque el atacante puede saltársela.
- **Superficie de ataque**: el conjunto de puntos por donde se puede atacar un sistema; cuanto menor, mejor (cerrar lo que no se usa).
- **[CLAVE]** La **seguridad por oscuridad** (confiar en que nadie descubrirá cómo funciona el sistema) **no es una defensa** por sí sola.
- **Shift left**: incorporar la seguridad **desde el diseño y el desarrollo**, no al final; corregir pronto es más barato.

### T03 — Autenticación y autorización
- **[CLAVE]** **Autenticación**: comprobar **quién eres**. **Autorización**: comprobar **qué puedes hacer**. Primero se autentica y después se autoriza.
- Factores de autenticación: **algo que sabes** (contraseña, PIN), **algo que tienes** (teléfono, llave física) y **algo que eres** (huella, rostro).
- **MFA** (autenticación multifactor): exigir **dos o más factores de tipos distintos**. Dos contraseñas no son MFA, porque son el mismo tipo de factor.
- Una aplicación de códigos o una llave física son más seguras que los códigos por **SMS**, que pueden interceptarse o desviarse.
- **[CLAVE]** Códigos HTTP: **401** significa que **no estás autenticado**; **403**, que estás autenticado pero **no tienes permiso**.
- La autorización se comprueba **en el servidor y en cada petición**; ocultar un botón en la interfaz no protege la función.

### T04 — Contraseñas
- **[CLAVE]** Las contraseñas **nunca se guardan en texto plano ni cifradas de forma reversible**: se guarda su **hash**.
- **Sal** (*salt*): valor **aleatorio y único por usuario** que se combina con la contraseña antes de calcular el hash. Hace que dos contraseñas iguales tengan hashes distintos y vuelve inútiles las tablas precalculadas (*rainbow tables*). La sal no es secreta: se guarda junto al hash.
- **[CLAVE]** Se usan algoritmos **lentos a propósito** y diseñados para contraseñas: **bcrypt, scrypt o Argon2**. **MD5 y SHA-1 no sirven** para contraseñas: están obsoletos y son demasiado rápidos, lo que facilita probar millones de combinaciones.
- **Fuerza bruta**: probar muchas contraseñas hasta acertar. **Credential stuffing**: probar en un sitio **credenciales filtradas de otro sitio**; funciona porque la gente reutiliza contraseñas.
- Defensas: limitar los intentos (rate limiting y bloqueo temporal), MFA y revisar contra listas de contraseñas filtradas.
- Para el usuario: importa más la **longitud** que los símbolos raros, una contraseña **distinta por sitio** y un **gestor de contraseñas**.

### T05 — Sesiones, cookies y JWT
- HTTP no guarda estado; para recordar al usuario se usa una **sesión**: el servidor entrega un identificador que el navegador reenvía en cada petición, normalmente en una **cookie**.
- Atributos de seguridad de las cookies: **`HttpOnly`** (el JavaScript de la página **no puede leerla**; reduce el robo de sesión mediante XSS), **`Secure`** (solo viaja por **HTTPS**) y **`SameSite`** (limita su envío en peticiones que vienen **de otros sitios**; mitiga CSRF).
- **JWT** (JSON Web Token): token con tres partes separadas por puntos: **cabecera, contenido (*payload*) y firma**.
- **[CLAVE]** Un JWT va **firmado, no cifrado**: cualquiera que lo tenga puede **leer su contenido**. La firma solo garantiza que **no fue alterado**. No se guardan secretos ni contraseñas dentro.
- El servidor debe **validar la firma y la expiración** en cada petición. Conviene que duren poco.
- **[CLAVE]** Quien roba el identificador de sesión o el token **puede hacerse pasar por el usuario** (secuestro de sesión). Un token guardado en `localStorage` es legible por el JavaScript de la página y, por tanto, queda expuesto si hay XSS.
- Al cerrar sesión, la sesión se invalida **en el servidor**, no solo se borra en el navegador.

### T06 — Criptografía básica
- **Cifrado simétrico**: **la misma llave** cifra y descifra (ejemplo: **AES**). Es rápido; el problema es compartir la llave de forma segura.
- **Cifrado asimétrico**: un par de llaves, **pública y privada** (ejemplo: **RSA**). Lo que se cifra con la pública solo se descifra con la privada. Es más lento.
- **Hash**: función de **un solo sentido** que produce una huella de tamaño fijo (ejemplo: **SHA-256**). No se puede "descifrar". Sirve para verificar integridad.
- **[CLAVE]** **Codificar no es cifrar**: **Base64** es una codificación que cualquiera puede revertir **sin llave**; no protege nada. Cifrar es reversible **con llave**; un hash **no es reversible**.
- **Firma digital**: se firma con la **llave privada** y se verifica con la **pública**; da integridad y autenticidad del autor.
- Los datos se protegen **en tránsito** (TLS/HTTPS) y **en reposo** (cifrado de disco o de base de datos).
- **[CLAVE]** **No inventes tu propia criptografía**: usa algoritmos y librerías estándar, revisados públicamente. La seguridad debe depender de la **llave**, no de mantener en secreto el algoritmo.

### T07 — OWASP y el Top 10
- **OWASP** (Open Worldwide Application Security Project) es una **fundación sin fines de lucro** y una comunidad abierta dedicada a mejorar la seguridad del software. Sus materiales son gratuitos.
- **[CLAVE]** El **OWASP Top 10** es un **documento de concientización** con los diez riesgos de seguridad más críticos en aplicaciones web. **No es una norma, ni una ley, ni una lista completa**: es el punto de partida mínimo.
- Se actualiza cada varios años. La edición vigente es la **2025** (la octava); la anterior es la de 2021.
- **OWASP Top 10:2025**, en orden:
  - **A01 Broken Access Control** (control de acceso roto)
  - **A02 Security Misconfiguration** (configuración de seguridad incorrecta)
  - **A03 Software Supply Chain Failures** (fallas en la cadena de suministro de software)
  - **A04 Cryptographic Failures** (fallas criptográficas)
  - **A05 Injection** (inyección)
  - **A06 Insecure Design** (diseño inseguro)
  - **A07 Authentication Failures** (fallas de autenticación)
  - **A08 Software or Data Integrity Failures** (fallas de integridad de software o datos)
  - **A09 Security Logging & Alerting Failures** (fallas de registro y alertas de seguridad)
  - **A10 Mishandling of Exceptional Conditions** (manejo incorrecto de condiciones excepcionales)
- **[CLAVE]** El número uno es **Broken Access Control**, no la inyección. En 2025, **Injection** bajó al quinto lugar e incluye a **XSS**; **Security Misconfiguration** subió del quinto al segundo.
- Novedades de 2025: **A03** amplía la categoría de componentes vulnerables y desactualizados de 2021 a toda la cadena de suministro; **A10** es nueva; **SSRF**, que en 2021 era una categoría propia, quedó **dentro de A01**.
- Otros recursos de OWASP: **ASVS** (estándar para verificar la seguridad de una aplicación), las **Cheat Sheets** (guías prácticas por tema), **ZAP** (herramienta gratuita para analizar aplicaciones web) y listas específicas como el **API Security Top 10** y el **Top 10 para aplicaciones con LLM**.

### T08 — A01: control de acceso roto
- Ocurre cuando un usuario puede **actuar fuera de sus permisos**: ver o modificar datos de otros, o usar funciones reservadas.
- **IDOR** (referencia directa insegura a objetos): cambiar un identificador en la petición (por ejemplo, de `/facturas/124` a `/facturas/125`) y obtener el recurso de otra persona, porque el servidor **no comprueba que te pertenezca**.
- **Escalada de privilegios horizontal**: acceder a recursos de **otro usuario del mismo nivel**. **Vertical**: obtener funciones de un **nivel superior** (un usuario normal que logra actuar como administrador).
- **[CLAVE]** Defensa: comprobar la autorización **en el servidor, en cada petición y para cada recurso**; **denegar por defecto**. Ocultar enlaces o botones en la interfaz **no es control de acceso**.
- Usar identificadores difíciles de adivinar ayuda, pero **no sustituye** la comprobación de permisos.
- **SSRF** (falsificación de peticiones del lado del servidor): el atacante consigue que **el servidor haga peticiones** a destinos que elige, por ejemplo a servicios internos que no son accesibles desde fuera. Defensa: validar y restringir con lista de permitidos las direcciones a las que el servidor puede conectarse.

### T09 — A05: inyección y SQL injection
- Hay **inyección** cuando datos no confiables se **interpretan como parte de un comando o una consulta**.
- **SQL injection**: la entrada del usuario se **concatena** en una consulta SQL y altera su lógica. Ejemplo clásico: escribir `' OR '1'='1` en un campo para que la condición sea siempre verdadera.
- Consecuencias: leer, modificar o borrar datos y saltarse el inicio de sesión.
- **[CLAVE]** Defensa principal: **consultas parametrizadas** (*prepared statements*), que envían la consulta y los datos **por separado**, de modo que la entrada nunca se interpreta como código SQL. Los ORM las usan por defecto.
- **[CLAVE]** **No construyas consultas concatenando cadenas**. Escapar caracteres a mano o filtrar palabras "peligrosas" (lista de bloqueo) es frágil y se puede evadir.
- Complementos: **validar la entrada con lista de permitidos** (aceptar solo lo esperado) y dar a la cuenta de la base de datos el **mínimo privilegio**.
- El mismo principio aplica a la **inyección de comandos** del sistema operativo: no construir comandos con entrada del usuario.

### T10 — XSS (Cross-Site Scripting)
- **XSS**: el atacante logra que **su JavaScript se ejecute en el navegador de otros usuarios** dentro de un sitio legítimo. En el Top 10:2025 forma parte de A05 Injection.
- Tipos: **almacenado** (el script queda guardado en el servidor, por ejemplo en un comentario, y se sirve a todos los que lo ven), **reflejado** (el script viaja en la petición, por ejemplo en un enlace, y el servidor lo devuelve en la respuesta) y **basado en DOM** (el JavaScript de la propia página inserta el dato de forma insegura, sin pasar por el servidor).
- Consecuencias: robar sesiones, actuar en nombre del usuario, modificar la página o redirigir a sitios falsos.
- **[CLAVE]** Defensa principal: **escapar (codificar) la salida según el contexto** donde se inserta (HTML, atributo, JavaScript, URL). Los frameworks modernos escapan por defecto; el riesgo aparece al usar las funciones que insertan HTML sin escapar.
- **CSP** (Content Security Policy): cabecera con la que el servidor indica al navegador **de dónde puede cargar y ejecutar scripts**; es una capa adicional, no sustituye el escape.
- La cookie `HttpOnly` limita el robo de la sesión, pero **no impide el XSS**.
- **[CLAVE]** XSS ataca a los **usuarios del sitio** (se ejecuta en su navegador); SQL injection ataca a la **base de datos** (se ejecuta en el servidor).

### T11 — CSRF, política del mismo origen y CORS
- **CSRF** (falsificación de petición entre sitios): un sitio malicioso hace que **el navegador de una víctima autenticada envíe una petición no deseada** a otro sitio (por ejemplo, una transferencia).
- **[CLAVE]** Funciona porque el navegador **adjunta las cookies automáticamente**, también cuando la petición la origina otro sitio. El atacante **no ve la respuesta ni roba la cookie**: solo provoca la acción.
- Defensas: **tokens anti-CSRF** (un valor secreto e impredecible que el servidor exige en cada petición que cambia datos), cookies con **`SameSite`** y no usar GET para acciones que modifican datos.
- **[CLAVE]** Diferencia con XSS: en **XSS** el atacante **ejecuta código** dentro del sitio; en **CSRF** solo **aprovecha la sesión abierta** para enviar una petición. Si hay XSS, las defensas contra CSRF se pueden saltar.
- **Política del mismo origen** (*same-origin policy*): el navegador impide que el JavaScript de un origen **lea respuestas** de otro. Un **origen** es **esquema + host + puerto**.
- **[CLAVE]** **CORS** es un mecanismo con el que el **servidor indica al navegador** qué otros orígenes pueden leer sus respuestas: **relaja** la política del mismo origen. **No es autenticación ni protege contra CSRF**, y quien llama a la API sin navegador no está sujeto a CORS.

### T12 — A02: configuración de seguridad incorrecta
- El sistema es vulnerable no por un fallo del código, sino por **cómo está configurado**.
- Ejemplos: **credenciales por defecto** sin cambiar (`admin`/`admin`), **modo de depuración activado en producción**, **mensajes de error detallados** visibles para el usuario, servicios o puertos innecesarios abiertos, almacenamiento en la nube **público por error**, listado de directorios activado y software sin actualizar.
- **[CLAVE]** Los errores que ve el usuario deben ser **genéricos**; el detalle (traza del error, consulta, versión) va **al registro interno**. Una traza de error le da pistas al atacante.
- **Hardening** (endurecimiento): quitar o desactivar todo lo que no se usa y aplicar configuraciones seguras.
- **Cabeceras de seguridad**: el servidor puede indicar al navegador políticas de protección (por ejemplo CSP o forzar HTTPS).
- Defensa: configuraciones **automatizadas y repetibles**, iguales en todos los entornos pero con **credenciales distintas** en cada uno, y revisiones periódicas.

### T13 — A04: fallas criptográficas y manejo de secretos
- Fallas típicas: transmitir datos sensibles **sin cifrar** (HTTP), usar **algoritmos obsoletos** (MD5, SHA-1), llaves débiles o **escritas en el código**, no validar certificados y guardar contraseñas sin hash adecuado.
- Primero hay que **clasificar los datos**: saber cuáles son sensibles (contraseñas, datos personales, tarjetas, salud) y **no guardar lo que no se necesita**.
- **Secretos**: contraseñas, llaves de API, tokens y llaves privadas.
- **[CLAVE]** Los secretos **nunca van en el código ni en el repositorio**: se inyectan con **variables de entorno** o un **gestor de secretos**.
- **[CLAVE]** Si un secreto se sube a un repositorio, **hay que rotarlo** (revocarlo y generar uno nuevo). **Borrarlo en un commit posterior no basta**: sigue en el historial.
- Los secretos se rotan periódicamente y se usa uno distinto por entorno.

### T14 — A03 y A08: cadena de suministro e integridad
- La mayor parte del código de una aplicación son **dependencias de terceros**: una vulnerabilidad en una librería es una vulnerabilidad en tu aplicación.
- **CVE**: identificador público de una vulnerabilidad conocida. **CVSS**: puntuación de su **gravedad**, de 0 a 10.
- **SCA** (análisis de composición de software): herramientas que revisan las dependencias y avisan de las que tienen vulnerabilidades conocidas. **SBOM**: inventario de los componentes de un software.
- **[CLAVE]** Defensas: **mantener las dependencias actualizadas**, fijar versiones con un **archivo de bloqueo** (*lockfile*), instalar solo desde fuentes confiables y eliminar lo que no se usa.
- **Typosquatting**: publicar un paquete malicioso con un **nombre casi igual** al de uno popular, esperando un error de tecleo.
- **A08 (integridad)**: usar código o datos **sin verificar que no fueron alterados**: actualizaciones sin firma, un pipeline de CI/CD manipulado o **deserialización insegura** (reconstruir objetos a partir de datos no confiables). Defensa: firmas digitales, verificación de hashes y proteger el pipeline.
- **[CLAVE]** Diferencia: **A03** trata de **de dónde viene** el software (dependencias, compilación, distribución); **A08**, de **verificar la integridad** de lo que se ejecuta o se procesa.

### T15 — A06 y A10: diseño inseguro y condiciones excepcionales
- **Diseño inseguro**: la falla está **en el diseño**, no en la implementación: falta un control que nadie pensó. **[CLAVE]** Un diseño inseguro **no se arregla con una implementación perfecta**.
- Ejemplos: recuperar la cuenta con "preguntas secretas" fáciles de averiguar; no limitar los intentos de un código de verificación; no poner límite a cuántas veces se usa un cupón.
- **Modelado de amenazas** (*threat modeling*): analizar el diseño preguntando **qué puede salir mal**, quién atacaría y cómo, y qué controles hacen falta. Se hace **antes de programar**.
- **A10, manejo incorrecto de condiciones excepcionales**: el sistema se comporta de forma insegura ante errores o situaciones anómalas.
- **[CLAVE]** **Fallar cerrado** (*fail closed* o fallar seguro): ante un error, **denegar**. **Fallar abierto** (*fail open*): ante un error, permitir. Si falla la comprobación de permisos, el acceso se **deniega**.
- Otros casos de A10: excepciones sin capturar que dejan datos a medias, errores que revelan información interna y no validar valores límite o faltantes.

### T16 — A09: registros, alertas y respuesta a incidentes
- Sin registros (*logs*) y sin alertas, un ataque puede pasar **inadvertido** durante meses.
- Qué registrar: **inicios de sesión** (exitosos y fallidos), **fallos de control de acceso**, cambios de permisos y operaciones sensibles, con fecha, usuario y origen.
- **[CLAVE]** Qué **no** registrar: **contraseñas, tokens, datos de tarjetas** ni otros datos sensibles. Los registros también hay que protegerlos.
- **[CLAVE]** Registrar no basta: hacen falta **monitoreo y alertas** que avisen a alguien que pueda actuar. La edición 2025 del Top 10 cambió el nombre de la categoría para subrayar las alertas.
- **Respuesta a incidentes**, en orden: **preparación, detección, contención, erradicación, recuperación y lecciones aprendidas**.
- **Contener** (aislar lo afectado para que el daño no se extienda) va **antes** de erradicar y recuperar. Tras el incidente se analiza la causa sin buscar culpables.

### T17 — Ingeniería social y malware
- **Ingeniería social**: **manipular a las personas** para que entreguen información o realicen una acción. Ataca al eslabón humano, no a la tecnología.
- **Phishing**: mensajes que **suplantan a una entidad confiable** para robar credenciales o instalar malware. **Spear phishing**: phishing **dirigido a una persona u organización concreta**, con datos personalizados.
- Señales: urgencia, remitente o dominio parecido pero distinto, enlaces que no coinciden con el texto y peticiones inusuales de datos o pagos.
- **Malware**: software malicioso. **Ransomware**: malware que **cifra los datos de la víctima y exige un pago** por recuperarlos.
- **[CLAVE]** La mejor defensa contra el ransomware son las **copias de seguridad probadas y aisladas** del sistema principal; pagar el rescate no garantiza recuperar los datos.
- **[CLAVE]** MFA reduce mucho el daño del phishing, porque la contraseña robada **no basta**. La capacitación ayuda, pero el sistema no debe depender de que nadie se equivoque nunca.

### T18 — Ataques de red y disponibilidad
- **DoS** (denegación de servicio): saturar un sistema para que **deje de atender a los usuarios legítimos**; ataca la **disponibilidad**. **DDoS**: lo mismo, pero **desde muchos equipos a la vez** (a menudo una *botnet*, una red de equipos infectados).
- **Man-in-the-middle** (MITM): el atacante se **coloca entre dos partes** para leer o alterar la comunicación; es típico en redes wifi públicas. Defensa: **TLS/HTTPS** con validación del certificado.
- **Firewall**: filtra el tráfico de red según reglas (direcciones, puertos). **WAF** (firewall de aplicaciones web): filtra **peticiones HTTP** buscando patrones de ataque como inyección o XSS.
- **[CLAVE]** Un WAF es una **capa adicional**: no sustituye corregir la vulnerabilidad en el código.
- **VPN**: túnel cifrado entre un dispositivo y una red.
- **Rate limiting** (limitar el número de peticiones por cliente) y una **CDN** ayudan a absorber abusos y picos de tráfico.

### T19 — Pruebas de seguridad y DevSecOps
- **SAST** (análisis estático): examina el **código fuente sin ejecutarlo**. **DAST** (análisis dinámico): prueba la **aplicación en ejecución** desde fuera, como lo haría un atacante. **SCA**: revisa las dependencias.
- **Prueba de penetración** (*pentest*): ataque simulado y **autorizado**, hecho por especialistas, para encontrar vulnerabilidades antes que un atacante real.
- **[CLAVE]** La diferencia entre hacking ético y delito es la **autorización**: probar la seguridad de un sistema sin permiso es ilegal, aunque la intención sea buena.
- **Bug bounty**: programa que **recompensa** a investigadores externos por reportar vulnerabilidades. **Divulgación responsable**: avisar primero al responsable y darle tiempo para corregir antes de hacerlo público.
- **Zero-day** (día cero): vulnerabilidad para la que **aún no existe parche**.
- **[CLAVE]** **DevSecOps**: integrar la seguridad en **todo el ciclo de desarrollo** (revisión de código, análisis automáticos en el pipeline de CI/CD, parches frecuentes); es **responsabilidad de todo el equipo**, no solo de un área de seguridad al final.
- **Aplicar parches** con rapidez importa: muchos ataques usan vulnerabilidades conocidas que ya tenían corrección.

### T20 — Reconocer el ataque
- **SQL injection** (la entrada altera una consulta; ataca la base de datos; se previene con consultas parametrizadas) frente a **XSS** (script en el navegador de otros usuarios; se previene escapando la salida) frente a **CSRF** (petición no deseada con la sesión de la víctima; se previene con tokens anti-CSRF y `SameSite`).
- **IDOR** (cambiar un identificador para ver datos ajenos; control de acceso) frente a **SSRF** (hacer que el servidor pida recursos internos).
- **Autenticación** (quién eres; 401) frente a **autorización** (qué puedes hacer; 403).
- **Codificación** (Base64, sin llave, reversible por cualquiera) frente a **cifrado** (reversible con llave) frente a **hash** (no reversible). **Simétrico** (una llave) frente a **asimétrico** (par pública y privada).
- **Vulnerabilidad** (debilidad) frente a **amenaza** (quien puede aprovecharla) frente a **riesgo** (probabilidad por impacto).
- **Fuerza bruta** (probar muchas contraseñas) frente a **credential stuffing** (credenciales filtradas de otro sitio) frente a **phishing** (engañar a la persona para que las entregue).
- **DoS** (un origen) frente a **DDoS** (muchos orígenes). **SAST** (código sin ejecutar) frente a **DAST** (aplicación en ejecución). **Firewall** (tráfico de red) frente a **WAF** (peticiones HTTP).

## B2. Banco de preguntas — cantidades mínimas

| Tipo | Mínimo | Regla |
|---|---|---|
| `mcq` | 80 | 4 por tema; al menos 1 de dificultad 3 por tema |
| `tf` | 60 | 3 por tema; aprox. mitad verdaderas y mitad falsas (entre 27 y 33 verdaderas) |
| `scenario` | 26 | Los 26 de B3 |
| `error` | 28 | Exactamente los de B4, redactados como pregunta de 4 opciones |

Cada hecho **[CLAVE]** debe aparecer en al menos una `mcq` o `tf` (además de su pregunta `error`, si la tiene). Las `tf` falsas deben ser falsas por un hecho concreto de B1, no por un matiz de redacción. En T07 incluye al menos una pregunta que pida ubicar una categoría en la lista 2025 (por ejemplo, cuál es la A01) y una sobre qué cambió respecto a 2021. En T20 todas las preguntas son de comparación entre parecidos, en los dos sentidos (de la descripción al nombre y del nombre a la descripción).

## B3. Escenarios (respuesta correcta entre corchetes)

Donde la respuesta es un nombre de ataque, principio o técnica, las cuatro opciones son del mismo tipo, tomadas de B1.

1. (T01) Un ataque deja fuera de línea la tienda en línea durante seis horas, sin robar ni alterar datos. ¿Qué propiedad de la tríada CIA se afectó? → [Disponibilidad] (opciones: confidencialidad, integridad, autenticación)
2. (T01) Alguien modifica sin permiso las calificaciones guardadas en un sistema escolar. ¿Qué propiedad se afectó? → [Integridad] (opciones: confidencialidad, disponibilidad, autorización)
3. (T02) El servicio que genera reportes solo necesita leer la base de datos, pero se conecta con una cuenta de administrador. ¿Qué principio se viola? → [Mínimo privilegio] (opciones: defensa en profundidad, seguro por defecto, shift left)
4. (T02) Un formulario valida el formato del correo solo con JavaScript en el navegador. ¿Qué falta? → [Validar también en el servidor: la validación del navegador se puede saltar] (opciones en texto)
5. (T03) Un usuario con sesión iniciada intenta entrar al panel de administración sin ser administrador. ¿Qué código HTTP corresponde? → [403] (opciones: 401, 404, 200)
6. (T03) Un sistema pide contraseña y, además, una segunda contraseña. ¿Es MFA? → [No: son dos factores del mismo tipo (algo que sabes)] (opciones en texto)
7. (T04) Tras una filtración en otro sitio, miles de cuentas de tu aplicación reciben intentos de inicio de sesión con correos y contraseñas reales. ¿Qué ataque es? → [Credential stuffing] (opciones: fuerza bruta, phishing, SQL injection)
8. (T04) Vas a guardar las contraseñas de los usuarios. ¿Qué eliges? → [Hash con sal usando bcrypt, scrypt o Argon2] (opciones: cifrarlas con AES para poder recuperarlas; hash MD5 sin sal; codificarlas en Base64)
9. (T05) Quieres que el JavaScript de la página no pueda leer la cookie de sesión. ¿Qué atributo le pones? → [`HttpOnly`] (opciones: `Secure`, `SameSite`, `Base64`)
10. (T05) Un compañero guarda el número de tarjeta del usuario dentro del contenido de un JWT "porque va protegido". ¿Qué le dices? → [Un JWT va firmado, no cifrado: cualquiera que lo tenga puede leer su contenido] (opciones en texto)
11. (T06) Necesitas comprobar que un archivo descargado no fue alterado. ¿Qué usas? → [Un hash, como SHA-256] (opciones: Base64, cifrado simétrico, una cookie)
12. (T06) Un compañero "protege" una contraseña en un archivo de configuración convirtiéndola a Base64. ¿Cuál es el problema? → [Base64 es una codificación: cualquiera la revierte sin llave] (opciones en texto)
13. (T08) Cambias el número de la URL de `/pedidos/1001` a `/pedidos/1002` y ves el pedido de otra persona. ¿Qué vulnerabilidad es? → [IDOR, un fallo de control de acceso] (opciones: XSS, CSRF, SQL injection)
14. (T08) Una función que descarga una imagen a partir de una URL permite que alguien haga que el servidor consulte direcciones de la red interna. ¿Qué vulnerabilidad es? → [SSRF] (opciones: CSRF, XSS almacenado, IDOR)
15. (T09) El código arma una consulta SQL concatenando lo que el usuario escribe en el campo de búsqueda. ¿Cómo lo corriges? → [Con consultas parametrizadas] (opciones: escondiendo el campo con CSS, codificando la entrada en Base64, añadiendo un token anti-CSRF)
16. (T10) Alguien publica un comentario con un script y, desde entonces, se ejecuta en el navegador de todos los que abren la página. ¿Qué ataque es? → [XSS almacenado] (opciones: XSS reflejado, CSRF, SQL injection)
17. (T11) Con tu sesión del banco abierta en otra pestaña, visitas una página que, sin que lo notes, envía una transferencia desde tu cuenta. ¿Qué ataque es? → [CSRF] (opciones: XSS, IDOR, man-in-the-middle)
18. (T12) En producción, un error muestra al usuario la traza completa con la consulta SQL y la versión del servidor. ¿Qué categoría del Top 10 describe el problema? → [Security Misconfiguration] (opciones: Injection, Insecure Design, Authentication Failures)
19. (T13) Subiste por error una llave de API a un repositorio público y ya borraste el archivo en otro commit. ¿Qué falta? → [Rotar la llave: sigue en el historial del repositorio] (opciones en texto)
20. (T14) Vas a instalar una librería y notas que el nombre del paquete tiene una letra cambiada respecto al original. ¿Qué ataque sospechas? → [Typosquatting] (opciones: phishing, DDoS, deserialización insegura)
21. (T15) El servicio de permisos no responde y la aplicación, para no interrumpir, deja pasar a todos. ¿Cómo se llama ese comportamiento y qué debería hacer? → [Fallar abierto; debería fallar cerrado y denegar] (opciones en texto)
22. (T16) Detectas que un servidor está comprometido. Según la respuesta a incidentes, ¿qué haces primero? → [Contener: aislar el servidor para que el daño no se extienda] (opciones: restaurar las copias de seguridad, escribir las lecciones aprendidas, reinstalar todo de inmediato)
23. (T17) Recibes un correo "de tu banco" con tono urgente y un enlace a un dominio parecido pero distinto que pide tu contraseña. ¿Qué es? → [Phishing] (opciones: ransomware, DDoS, CSRF)
24. (T17) Una mañana todos los archivos de la empresa aparecen cifrados y un mensaje exige un pago. ¿Qué ataque es y qué defensa habría ayudado más? → [Ransomware; copias de seguridad probadas y aisladas] (opciones en texto)
25. (T18) Miles de equipos infectados envían peticiones a tu sitio al mismo tiempo hasta tumbarlo. ¿Qué ataque es? → [DDoS] (opciones: DoS desde un solo origen, man-in-the-middle, fuerza bruta)
26. (T19) Un conocido quiere "probar la seguridad" del sitio de una empresa sin avisarle, para ayudarla. ¿Qué le dices? → [Sin autorización es ilegal, aunque la intención sea buena] (opciones en texto)

Reparte la dificultad de los escenarios entre 2 y 3.

## B4. Caza el error (fragmento con error → corrección)

1. "La tríada CIA significa confidencialidad, integridad y autenticación." → La A es de disponibilidad (*availability*), no de autenticación. (T01)
2. "Vulnerabilidad, amenaza y riesgo son tres nombres para lo mismo." → La vulnerabilidad es la debilidad; la amenaza, quien puede aprovecharla; el riesgo, la probabilidad por el impacto. (T01)
3. "Validar los datos en el navegador es suficiente para proteger el servidor." → La validación del navegador se puede saltar: siempre se valida en el servidor. (T02)
4. "Mantener en secreto cómo funciona el sistema es una defensa suficiente." → La seguridad por oscuridad no es una defensa por sí sola. (T02)
5. "La autenticación decide qué puede hacer un usuario y la autorización comprueba quién es." → Es al revés: la autenticación comprueba quién eres y la autorización, qué puedes hacer. (T03)
6. "El código 403 significa que el usuario no ha iniciado sesión." → Eso es 401; 403 significa que está autenticado pero no tiene permiso. (T03)
7. "Las contraseñas se guardan cifradas con AES para poder recuperarlas si el usuario las olvida." → Se guarda su hash con sal (bcrypt, scrypt o Argon2); no deben poder recuperarse. (T04)
8. "MD5 es un buen algoritmo para guardar contraseñas porque es muy rápido." → MD5 está obsoleto, y ser rápido es un defecto para contraseñas: se usan algoritmos lentos como bcrypt, scrypt o Argon2. (T04)
9. "La sal es un valor secreto, el mismo para todos los usuarios." → Es aleatoria y única por usuario, y no es secreta: se guarda junto al hash. (T04)
10. "El contenido de un JWT está cifrado, así que es seguro guardar secretos dentro." → Un JWT va firmado, no cifrado: su contenido se puede leer. (T05)
11. "El atributo `HttpOnly` hace que la cookie solo viaje por HTTPS." → Eso lo hace `Secure`; `HttpOnly` impide que JavaScript lea la cookie. (T05)
12. "Base64 es un algoritmo de cifrado." → Es una codificación: se revierte sin llave. (T06)
13. "Un hash se puede descifrar si se tiene la llave correcta." → Un hash es de un solo sentido: no tiene llave ni se descifra. (T06)
14. "En el cifrado simétrico se usa una llave pública para cifrar y una privada para descifrar." → Eso es el cifrado asimétrico; el simétrico usa la misma llave. (T06)
15. "El OWASP Top 10 es una norma legal que lista todas las vulnerabilidades posibles." → Es un documento de concientización con los diez riesgos más críticos; no es una norma ni una lista completa. (T07)
16. "En el OWASP Top 10:2025, el primer lugar es Injection." → El primer lugar es Broken Access Control; Injection es el quinto. (T07)
17. "Ocultar el botón de 'Eliminar' a los usuarios sin permiso es suficiente control de acceso." → La autorización se comprueba en el servidor en cada petición. (T08)
18. "La mejor defensa contra SQL injection es filtrar palabras como DROP y SELECT." → La defensa principal son las consultas parametrizadas; las listas de bloqueo se pueden evadir. (T09)
19. "El XSS se ejecuta en la base de datos del servidor." → Se ejecuta en el navegador de los usuarios; lo que ataca la base de datos es SQL injection. (T10)
20. "En un ataque CSRF, el atacante roba la cookie de sesión de la víctima." → No la roba: aprovecha que el navegador la envía automáticamente para provocar una petición. (T11)
21. "CORS es un mecanismo de autenticación que protege a la API de cualquier cliente." → CORS relaja la política del mismo origen en el navegador; no es autenticación ni afecta a clientes sin navegador. (T11)
22. "En producción conviene mostrar al usuario la traza completa del error para que pueda reportarlo." → Al usuario se le muestra un mensaje genérico; el detalle va al registro interno. (T12)
23. "Si subes una contraseña a un repositorio, basta con borrarla en el siguiente commit." → Sigue en el historial: hay que rotarla. (T13)
24. "Las vulnerabilidades de las librerías de terceros no afectan a mi aplicación, porque no es mi código." → Una vulnerabilidad en una dependencia es una vulnerabilidad en tu aplicación. (T14)
25. "Si falla la comprobación de permisos, lo correcto es permitir el acceso para no afectar al usuario." → Se debe fallar cerrado: ante un error, denegar. (T15)
26. "Conviene registrar las contraseñas que escriben los usuarios para depurar los errores de inicio de sesión." → Nunca se registran contraseñas, tokens ni datos sensibles. (T16)
27. "Un WAF hace innecesario corregir las vulnerabilidades del código." → Es una capa adicional; la vulnerabilidad se corrige en el código. (T18)
28. "SAST prueba la aplicación en ejecución y DAST analiza el código fuente sin ejecutarlo." → Es al revés: SAST analiza el código sin ejecutarlo y DAST prueba la aplicación en ejecución. (T19)

---

# PARTE D — Criterios de aceptación

Verifica antes de entregar (con script):

- [ ] Los bloques M01 a M09 son idénticos a los de `published_v10.html`; `engine.html` no cambió.
- [ ] M10 cumple el esquema: IDs únicos con prefijo `M10-`, `topic` existente, `answer` dentro de rango, 4 opciones distintas donde corresponde.
- [ ] Se cumplen los mínimos de B2 y los 20 temas tienen `summary`, `keyPoints`, al menos 4 `mcq` (una de dificultad 3) y 3 `tf`; entre 27 y 33 `tf` verdaderas.
- [ ] Los 26 escenarios de B3 y los 28 errores de B4 están presentes; cada hecho **[CLAVE]** aparece en una `mcq` o `tf`; los diez nombres del Top 10:2025 aparecen tal cual.
- [ ] Ningún `prompt` de M10 es idéntico a uno de otro módulo. Ninguna pregunta afirma algo que contradiga o no esté en B1. La revisión de palabras prohibidas pasa.
- [ ] El inicio muestra diez módulos; M10 abre su mapa con 20 temas; un quiz, un relámpago, un "¿Qué usarías?", un "Caza el error" y el jefe final de M10 funcionan; el progreso guardado y el héroe no se pierden.
- [ ] `smoke.cjs`, `hero.cjs` y `m03.cjs` a `m10.cjs` pasan; el archivo abre sin errores de consola y se republica en la misma URL.
