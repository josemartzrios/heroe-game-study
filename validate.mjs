import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync(new URL('./juego_estudio.html', import.meta.url), 'utf8');
// Three.js incrustado como texto inerte: se valida aparte y se excluye de las reglas del motor
const vend = html.match(/<!-- VENDOR:THREE START -->[\s\S]*?<!-- VENDOR:THREE END -->/);
const htmlNoV = vend ? html.replace(vend[0], '') : html;
const backupPath = process.argv[2];
const m = html.match(/const MODULES = (\[[\s\S]*?\n\]);/);
if (!m) throw new Error('No se encontró MODULES');
const MODULES = vm.runInNewContext(m[1]);
const errs = [];
const bad = (s) => errs.push(s);

// ---------- M01 idéntico a la versión publicada ----------
const block = (src, id) => {
  const a = src.indexOf(`// === MODULE:${id} START ===`), b = src.indexOf(`// === MODULE:${id} END ===`);
  return a < 0 || b < 0 ? null : src.slice(a, b);
};
if (backupPath) {
  const old = fs.readFileSync(backupPath, 'utf8');
  for (const id of ['M01', 'M02', 'M03', 'M04', 'M05', 'M06', 'M07', 'M08', 'M09', 'M10']) if (block(old, id) !== block(html, id)) bad(`El bloque ${id} cambió respecto a la versión publicada`);
}
// Palabras prohibidas (IP ajena) en todo el archivo
const forbidden = [/Marvel/i, /DC Comics/i, /LEGO/i, /Spider/i, /Batman/i, /Superman/i, /Cyclops/i, /Wolverine/i, /Hulk/i, /Iron Man/i, /\bThor\b/, /Wonder Woman/i, /\bFlash\b/, /Avengers/i, /X-Men/i];
for (const re of forbidden) if (re.test(htmlNoV)) bad('Palabra prohibida: ' + re);
if (MODULES.length !== 10 || MODULES.map((m) => m.id).join() !== 'M01,M02,M03,M04,M05,M06,M07,M08,M09,M10') bad('MODULES debe tener M01..M10 en ese orden');
if (!html.includes("'estudio_isw_v1'")) bad('Falta la clave localStorage');
// Ciudad Núcleo
for (const s of ['function cityStart', 'data-act="city"', 'CITY_DATA']) if (!html.includes(s)) bad('Falta en el motor: ' + s);
{ const eng = htmlNoV.slice(0, htmlNoV.indexOf('// === MODULE:M01 START ===')) + htmlNoV.slice(htmlNoV.indexOf('// === MODULE:M10 END ==='));
  for (const re of [/<img/i, /fetch\(/, /new Image/]) if (re.test(eng)) bad('El motor usa un recurso no permitido: ' + re); }
if (process.argv[2]) { const oldLen = (await import('fs')).readFileSync(process.argv[2]).length, grow = Buffer.byteLength(htmlNoV) - oldLen; console.log('Crecimiento respecto a la versión publicada:', grow, 'bytes'); if (grow > 90 * 1024 && /v12/.test(process.argv[2])) bad('El archivo creció más de 90 KB respecto a la versión 12'); }
// Limpieza y seguridad: identificadores retirados y ganchos de prueba protegidos (solo el motor, sin el contenido de los módulos)
{ const eng = htmlNoV.slice(0, htmlNoV.indexOf('// === MODULE:M01 START ===')) + htmlNoV.slice(htmlNoV.indexOf('// === MODULE:M10 END ==='));
  for (const id of ['avatarSvg', 'PARTS', 'fixLook', 'setLook', 'mergeBoxes', 'cameraArm', 'consumeCamera', 'CityHero', 'welcomed', 'villainsM01']) if (new RegExp('\\b' + id + '\\b').test(eng)) bad('Identificador retirado en el motor: ' + id);
  for (const g of ['__CITY_TEST_API__', '__CITY_ROUND__', '__CITY_WORLD__']) {
    const re = new RegExp('window\\.' + g + '\\s*=(?!=)', 'g'); let m;
    while ((m = re.exec(eng))) if (!/__CITY_TEST__ === true/.test(eng.slice(Math.max(0, m.index - 300), m.index))) bad('Gancho de prueba sin proteger (' + g + '): debe asignarse solo con window.__CITY_TEST__ === true');
  }
  const ci = eng.indexOf('function cityStart('), cj = eng.indexOf('function citySuspend(');
  if (ci >= 0 && cj > ci && /loadThree/.test(eng.slice(ci, cj))) bad('La ciudad no debe llamar a loadThree');
}
// Batalla
for (const s of ['function vBattleHud']) if (!html.includes(s)) bad('Falta en el motor: ' + s);
for (const id of ['M01', 'M02', 'M03', 'M04', 'M05', 'M06', 'M07', 'M08', 'M09', 'M10']) for (const s of ['START', 'END']) if (!html.includes(`// === MODULE:${id} ${s} ===`)) bad(`Falta marcador ${id} ${s}`);
if (/https?:\/\/(?!fonts\.googleapis\.com|ejemplo\.com)/.test(htmlNoV.replace(/<link[^>]*>/g, ''))) bad('Hay URLs externas en el cuerpo');

// ---------- Validación genérica por módulo ----------
function checkModule(mod, prefix, min, nTopics) {
  const tids = new Set(mod.topics.map((t) => t.id));
  const ids = new Set();
  const count = { mcq: 0, tf: 0, scenario: 0, error: 0 };
  const perTopic = {}, nm = {}, nt = {}, diff3 = {};
  let trues = 0;
  for (const q of mod.questions) {
    if (ids.has(q.id)) bad(`${prefix} ID repetido ${q.id}`);
    ids.add(q.id);
    if (!q.id.startsWith(prefix + '-')) bad(`${q.id}: prefijo incorrecto`);
    if (!tids.has(q.topic)) bad(`${q.id}: tema inexistente ${q.topic}`);
    if (![1, 2, 3].includes(q.difficulty)) bad(`${q.id}: dificultad`);
    if (!q.prompt || !q.explanation) bad(`${q.id}: falta prompt o explicación`);
    count[q.type] = (count[q.type] || 0) + 1;
    perTopic[q.topic] = (perTopic[q.topic] || 0) + 1;
    if (q.type === 'mcq') { nm[q.topic] = (nm[q.topic] || 0) + 1; if (q.difficulty === 3) diff3[q.topic] = true; }
    if (q.type === 'tf') {
      nt[q.topic] = (nt[q.topic] || 0) + 1;
      if (typeof q.answer !== 'boolean') bad(`${q.id}: answer no booleano`);
      if (q.answer) trues++;
      if (q.options) bad(`${q.id}: tf no debe tener options`);
    } else {
      if (!Array.isArray(q.options) || q.options.length !== 4) bad(`${q.id}: no tiene 4 opciones`);
      else {
        if (!(Number.isInteger(q.answer) && q.answer >= 0 && q.answer < 4)) bad(`${q.id}: answer fuera de rango`);
        if (new Set(q.options).size !== 4) bad(`${q.id}: opciones repetidas`);
      }
    }
  }
  for (const k in min) if (count[k] < min[k]) bad(`${prefix}: faltan ${k}: ${count[k]} < ${min[k]}`);
  if (mod.topics.length !== nTopics) bad(`${prefix}: no hay ${nTopics} temas`);
  for (const t of mod.topics) {
    if (!t.summary || !t.keyPoints?.length) bad(`${prefix} tema incompleto ${t.id}`);
    if (!perTopic[t.id]) bad(`${prefix} tema sin preguntas ${t.id}`);
    if ((nm[t.id] || 0) < 4) bad(`${prefix} ${t.id}: menos de 4 mcq`);
    if (!diff3[t.id]) bad(`${prefix} ${t.id}: sin mcq de dificultad 3`);
    if ((nt[t.id] || 0) < 3) bad(`${prefix} ${t.id}: menos de 3 tf`);
  }
  // posiciones de la respuesta correcta repartidas
  const pos = [0, 0, 0, 0];
  mod.questions.filter((q) => q.type !== 'tf').forEach((q) => pos[q.answer]++);
  const tot = pos.reduce((a, b) => a + b, 0);
  if (pos.some((p) => p / tot < 0.15)) bad(`${prefix}: posiciones de respuesta desbalanceadas ${pos}`);
  console.log(prefix, 'conteo', JSON.stringify(count), 'total', mod.questions.length, 'tf verdaderas', trues, 'posiciones', pos.join('/'));
  return { count, trues, perTopic };
}

checkModule(MODULES[0], 'M01', { mcq: 76, tf: 57, scenario: 16, error: 16 }, 19);
const m02 = MODULES[1];
const r2 = checkModule(m02, 'M02', { mcq: 92, tf: 69, scenario: 16, error: 26 }, 23);
if (r2.trues < 31 || r2.trues > 38) bad(`M02: verdaderas fuera de 31..38 (${r2.trues})`);

// ---------- Contenido de M02 contra la Parte B ----------
const mt = m02.questions.filter((q) => q.type === 'mcq' || q.type === 'tf').map((q) => q.prompt + ' ' + (q.options || []).join(' ') + ' ' + q.explanation).join('\n');
const corr = {
  'T01 voltaje': /voltaje/i, 'T01 UTF-8 1 a 4 bytes': /1 a 4 bytes/, 'T02 POST firmware': /POST.*(firmware|chip de memoria)/s,
  'T02 SecureROM': /SecureROM/, 'T03 ASML máquinas no chips': /máquinas.*no (los )?chips|no los chips|no fabrica/is, 'T03 Moore empírica': /empírica/i,
  'T04 RAM no disco': /desde (la RAM|ahí)|Directamente del disco/i, 'T04 código máquina': /código máquina/i,
  'T05 órdenes de magnitud': /nanosegundos.*microsegundos.*milisegundos/s, 'T05 condensador': /condensador/i, 'T05 borrado': /referencia|sobrescrib/i, 'T05 memristor 2008': /2008/,
  'T06 kernel software': /kernel es software/i, 'T06 concurrencia': /concurrencia/i, 'T06 prioridad CPU': /uso de CPU|prioridad.*CPU/i, 'T06 firmware sin SO': /firmware sin sistema operativo/i,
  'T07 Windows no Unix': /Windows no deriva de Unix/i, 'T07 Linux 1991': /1991/,
  'T08 nube opcional': /opcional/i, 'T10 núcleos A18': /A18 Pro/, 'T10 deep learning GPU': /modernos de IA/i,
  'T11 JIT': /JIT/, 'T12 wifi/módem': /módem/i, 'T12 caché/CDN ISP': /caché o CDN|servidores con copias/i,
  'T13 IPv4 máx': /255\.255\.255\.255/, 'T13 128 bits': /128 bits/, 'T13 IANA': /IANA/,
  'T14 HOSTS.TXT': /HOSTS\.TXT/, 'T14 registrar': /registra|no se compra/i, 'T15 POST body': /body/i, 'T15 503': /503/, 'T15 301/302': /301/,
  'T16 llave del destinatario': /llave pública de Ana/, 'T16 handshake': /handshake/i,
  'T18 antes un servidor por app': /dedicar un servidor|no podían ejecutar más de una/i, 'T19 PK/FK ejemplo': /PK en Usuarios y FK en Posts/,
  'T19 redundancia': /redundancia/i, 'T20 llave firma': /firma/i, 'T20 21 millones': /21 millones/, 'T20 nonce no ecuaciones': /ecuaciones/,
  'T21 Shor': /Shor/, 'T22 sigmoide ReLU activación': /función de activación|funciones de activación/i, 'T23 RLHF no única': /no la única|única pieza/i,
};
for (const [k, re] of Object.entries(corr)) if (!re.test(mt)) bad('[CORREGIDO] sin cubrir en mcq/tf: ' + k);

// 8 escenarios y 26 errores presentes (por tema/prefijo)
const seeds = ['tres sistemas operativos', 'cientos de copias', 'solo su dueño debe poder modificarlo', 'claves secretas', 'inicio de sesión', 'WebSocket', 'sin credenciales', 'registro nuevo', 'matriciales', 'A Record', 'se va la luz', 'extraer datos de facturas', 'Sobreajuste', 'llave pública de Ana', 'on-premise', 'NAT'];
for (const s of seeds) if (!m02.questions.some((q) => q.type === 'scenario' && (q.prompt + q.options.join(' ') + q.explanation).includes(s))) bad('Falta escenario: ' + s);

// Prohibido: la acusación omitida
const all = JSON.stringify(m02);
for (const re of [/GoDaddy|Go Daddy/i, /lorem/i, /revende/i]) if (re.test(all)) bad('Texto prohibido en M02: ' + re);

// ---------- M03 ----------
const m03 = MODULES[2];
const r3 = checkModule(m03, 'M03', { mcq: 72, tf: 54, scenario: 14, error: 22 }, 18);
if (r3.trues < 24 || r3.trues > 30) bad(`M03: verdaderas fuera de 24..30 (${r3.trues})`);
const t3 = m03.questions.filter((q) => q.type === 'mcq' || q.type === 'tf').map((q) => q.prompt + ' ' + (q.options || []).join(' ') + ' ' + q.explanation).join('\n');
const corr3 = {
  'T01 dos dígitos': /Dos: 0 y 1|dos dígitos/i, 'T01 256 valores': /256/, 'T02 tubos de vacío': /tubos de vacío/i, 'T02 miles de millones': /miles de millones/i, 'T02 compuertas': /compuertas lógicas/i,
  'T03 128 caracteres': /128 caracteres/, 'T03 A=65': /65/, 'T04 UTF-8 1 a 4': /1 a 4/, 'T04 compatible ASCII': /compatible con ASCII/i,
  'T05 3 bytes': /3 bytes|3\b/, 'T05 16 millones': /16,777,216/, 'T06 red de redes': /red de redes/i, 'T06 cables submarinos': /submarinos/i,
  'T07 mito': /mito|compartir recursos/i, 'T07 NCP': /NCP/, 'T07 1983': /1983/, 'T08 7 capas': /7 capas|\b7\b/, 'T08 4 capas': /4 capas/,
  'T09 DNS 1983': /1983/, 'T10 CERN': /CERN/, 'T10 Web no es internet': /servicio/i, 'T10 1993': /1993/, 'T11 ISBN': /ISBN/,
  'T12 Brendan Eich': /Brendan Eich/, 'T12 V8 2008': /2008/, 'T12 ECMAScript': /ECMAScript/, 'T13 PATCH': /PATCH/, 'T13 servidor web no BD': /base de datos/i,
  'T14 puerto 443': /443/, 'T14 TLS': /TLS/, 'T14 certificado identidad': /identidad/i, 'T14 IP visible': /dirección IP|IP y/i,
  'T15 wasm compilado antes': /antes/i, 'T16 quinta generación': /quinta generación|Generación/i, 'T16 fibra': /fibra/i,
  'T17 layout geometría': /tamaño y la posición/i, 'T17 display none': /display: none/, 'T18 JIT': /JIT/, 'T18 Chrome Edge Node': /Node\.js/,
};
for (const [k, re] of Object.entries(corr3)) if (!re.test(t3)) bad('[CORREGIDO M03] sin cubrir: ' + k);
const seeds3 = ['00001010', 'CAB', 'Peña', 'amarillo', '100 × 100', 'cable submarino', 'incompletos o en desorden', 'no encuentra el sitio', 'ISBN', 'solo el precio', 'todavía no tiene SKU', 'wifi de una cafetería', 'editor de video', 'display: none'];
for (const s of seeds3) if (!m03.questions.some((q) => q.type === 'scenario' && (q.prompt + q.options.join(' ') + q.explanation).includes(s))) bad('Falta escenario M03: ' + s);
console.log('Por tema M03:', JSON.stringify(r3.perTopic));
// ---------- M04 ----------
const m04 = MODULES[3];
const r4 = checkModule(m04, 'M04', { mcq: 68, tf: 51, scenario: 15, error: 22 }, 17);
if (r4.trues < 23 || r4.trues > 28) bad(`M04: verdaderas fuera de 23..28 (${r4.trues})`);
const t4 = m04.questions.filter((q) => q.type === 'mcq' || q.type === 'tf').map((q) => q.prompt + ' ' + (q.options || []).join(' ') + ' ' + q.explanation).join('\n');
const corr4 = {
  'T01 lenguaje formal': /lenguaje formal/i, 'T01 paradigma estilo': /estilo/i,
  'T03 Dijkstra 1968': /Dijkstra/, 'T03 ciclos ya existían': /ya existían/i, 'T04 instancia de la clase': /instancia de la clase/i,
  'T05 abstracción esencial': /esencial/i, 'T05 herencia subclase': /subclase/i, 'T05 encapsulamiento acceso': /acceso directo/i,
  'T09 RxJS': /RxJS/, 'T10 ENIAC': /ENIAC/, 'T10 EDSAC programa almacenado': /programa almacenado/i,
  'T12 abstraen hardware': /abstraen/i, 'T12 Fortran alto nivel': /alto nivel de uso amplio/i, 'T12 compilador fuente a máquina': /código fuente/i,
  'T14 error en ejecución': /tiempo de ejecución/i, 'T15 p-code': /p-code/, 'T15 Java 1995': /1995/, 'T15 bytecode JVM': /bytecode/,
  'T16 ECMAScript 1997': /1997/, 'T17 deadlock entre sí': /se esperan entre sí/i, 'T17 inanición': /inanición/i,
};
for (const [k, re] of Object.entries(corr4)) if (!re.test(t4)) bad('[CORREGIDO M04] sin cubrir: ' + k);
const seeds4 = ['Python es un paradigma', 'cinco partes del programa', 'saltos GO TO', 'nombre y precio', 'saldo de una cuenta', 'Perro y Gato', 'area()', 'variable global', 'una sola vez', 'abuelo', 'varios sensores', 'otro procesador distinto', 'errores de sintaxis se detecten', 'Windows, Linux y macOS', 'hilo A'];
for (const s of seeds4) if (!m04.questions.some((q) => q.type === 'scenario' && (q.prompt + q.options.join(' ') + q.explanation).includes(s))) bad('Falta escenario M04: ' + s);
// ningún prompt de M04 repetido en otros módulos
const normP = (s) => s.replace(/\s+/g, ' ').trim().toLowerCase();
const otros = new Set(MODULES.slice(0, 3).flatMap((m) => m.questions.map((q) => normP(q.prompt))));
for (const q of m04.questions) if (otros.has(normP(q.prompt))) bad(`${q.id}: prompt repetido en otro módulo`);
console.log('Por tema M04:', JSON.stringify(r4.perTopic));
// ---------- M05 ----------
const m05 = MODULES[4];
const r5 = checkModule(m05, 'M05', { mcq: 88, tf: 66, scenario: 22, error: 23 }, 22);
if (r5.trues < 30 || r5.trues > 36) bad(`M05: verdaderas fuera de 30..36 (${r5.trues})`);
const t5 = m05.questions.filter((q) => q.type === 'mcq' || q.type === 'tf').map((q) => q.prompt + ' ' + (q.options || []).join(' ') + ' ' + q.explanation).join('\n');
const corr5 = {
  'T01 vocabulario común': /vocabulario común/i, 'T01 kit armado': /kit/i, 'T05 __new__': /__new__/, 'T14 ejecutar()': /ejecutar\(\)/,
  'T15 sin exponer': /sin exponer/i, 'T17 cliente elige': /cliente elige|elige la estrategia/i, 'T01 sobreingeniería': /sobreingeniería|forzar patrones/i,
  'T22 Decorator y Proxy': /Decorator y Proxy/, 'T20 todos los visitantes': /todos los visitantes/i, 'T21 abierto/cerrado': /extensión/i,
};
for (const [k, re] of Object.entries(corr5)) if (!re.test(t5)) bad('[CORREGIDO M05] sin cubrir: ' + k);
const seeds5 = ['diez parámetros', 'new DocumentoPDF()', 'tema claro y tema oscuro', 'conexión a la base de datos', 'duplicar un cuadro de texto', 'librería externa', 'registro de eventos y caché', 'tres subsistemas', 'impresión 3D', 'equipo entero', 'mil árboles', 'video pesado', 'control remoto', 'playlist', 'precio de una acción', 'PayPal', 'switch gigante', 'chat', 'árbol de sintaxis', 'por si acaso', 'acoplamiento', 'permisos de acceso'];
for (const s of seeds5) if (!m05.questions.some((q) => q.type === 'scenario' && (q.prompt + q.options.join(' ') + q.explanation).includes(s))) bad('Falta escenario M05: ' + s);
const otros5 = new Set(MODULES.slice(0, 4).flatMap((m) => m.questions.map((q) => normP(q.prompt))));
for (const q of m05.questions) if (otros5.has(normP(q.prompt))) bad(`${q.id}: prompt repetido en otro módulo`);
console.log('Por tema M05:', JSON.stringify(r5.perTopic));
// ---------- M06 ----------
const m06 = MODULES[5];
const r6 = checkModule(m06, 'M06', { mcq: 56, tf: 42, scenario: 16, error: 18 }, 14);
if (r6.trues < 19 || r6.trues > 23) bad(`M06: verdaderas fuera de 19..23 (${r6.trues})`);
const t6 = m06.questions.filter((q) => q.type === 'mcq' || q.type === 'tf').map((q) => q.prompt + ' ' + (q.options || []).join(' ') + ' ' + q.explanation).join('\n');
const corr6 = {
  'T01 conceptos no físicos': /no son físicas|no es físico|no sean cosas físicas|conceptos/i, 'T04 __new__': /__new__/, 'T04 no crea': /no crea|ya existe|ya fue creado/i,
  'T06 sobrescribir': /sobrescrib/i, 'T06 no eliminar': /eliminar/i, 'T06 super().__init__': /super\(\)\.__init__/,
  'T08 referencia guardada': /guarda una referencia|referencia como atributo/i, 'T10 ciclo de vida': /ciclo de vida/i, 'T10 Casa/Habitacion': /Habitacion/,
  'T12 orden de fuerza': /Dependencia, asociación, agregación, composición/, 'T13 rombo relleno': /rombo relleno/i, 'T14 mismo método a su manera': /mismo método cada uno a su manera/i,
};
for (const [k, re] of Object.entries(corr6)) if (!re.test(t6)) bad('[CORREGIDO M06] sin cubrir: ' + k);
const seeds6 = ['300 alumnos', 'frenar', 'color y su marca', 'conversión de unidades', 'Camion', 'Guau', 'añadir `raza`', 'UsuarioWeb', 'inscrito', 'jugadores', 'habitaciones', 'Calculadora', 'herede de `Motor`', 'rombo relleno', 'punteada con triángulo hueco', 'perros y gatos'];
for (const s of seeds6) if (!m06.questions.some((q) => q.type === 'scenario' && (q.prompt + q.options.join(' ') + q.explanation).includes(s))) bad('Falta escenario M06: ' + s);
const otros6 = new Set(MODULES.slice(0, 5).flatMap((m) => m.questions.map((q) => normP(q.prompt))));
for (const q of m06.questions) if (otros6.has(normP(q.prompt))) bad(`${q.id}: prompt repetido en otro módulo`);
console.log('Por tema M06:', JSON.stringify(r6.perTopic));
// ---------- M07 ----------
const m07 = MODULES[6];
const r7 = checkModule(m07, 'M07', { mcq: 54, tf: 39, scenario: 17, error: 18 }, 13);
if (r7.trues < 17 || r7.trues > 22) bad(`M07: verdaderas fuera de 17..22 (${r7.trues})`);
const t7 = m07.questions.filter((q) => q.type === 'mcq' || q.type === 'tf').map((q) => q.prompt + ' ' + (q.options || []).join(' ') + ' ' + q.explanation).join('\n');
const corr7 = {
  'T01 tolerancia a fallos': /siga funcionando|seguir funcionando|sigue funcionando/i, 'T01 robustez sin colapsar': /sin colapsar/i, 'T01 usabilidad clara': /claro y fácil/i,
  'T02 Single Responsibility': /Single Responsibility/, 'T03 responsabilidad no es método': /no es lo mismo que método/i, 'T12 síntoma': /síntoma/i, 'T12 inyección técnica': /técnica/i,
  'T08 área 16': /\b16\b/, 'T09 no un método': /exactamente un método/i, 'T13 SRP frente a ISP': /SRP e ISP/,
};
for (const [k, re] of Object.entries(corr7)) if (!re.test(t7)) bad('[CORREGIDO M07] sin cubrir: ' + k);
const seeds7 = ['tres servidores', 'método de envío nuevo', 'tres sistemas de la empresa', 'tres equipos distintos', 'ImpresorFactura', 'otro `elif`', 'interfaz `Descuento`', 'obtiene 16', 'Pinguino', 'base `Shape`', 'deja vacíos', 'Coder', 'RepositorioMySQL', 'RepositorioPedidos', 'entrega agua', 'brazo cortador', 'script de 30 líneas'];
for (const s of seeds7) if (!m07.questions.some((q) => q.type === 'scenario' && (q.prompt + q.options.join(' ') + q.explanation).includes(s))) bad('Falta escenario M07: ' + s);
const otros7 = new Set(MODULES.slice(0, 6).flatMap((m) => m.questions.map((q) => normP(q.prompt))));
for (const q of m07.questions) if (otros7.has(normP(q.prompt))) bad(`${q.id}: prompt repetido en otro módulo`);
console.log('Por tema M07:', JSON.stringify(r7.perTopic));
// ---------- M08 ----------
const m08 = MODULES[7];
const r8 = checkModule(m08, 'M08', { mcq: 60, tf: 45, scenario: 19, error: 23 }, 15);
if (r8.trues < 21 || r8.trues > 25) bad(`M08: verdaderas fuera de 21..25 (${r8.trues})`);
const t8 = m08.questions.filter((q) => q.type === 'mcq' || q.type === 'tf').map((q) => q.prompt + ' ' + (q.options || []).join(' ') + ' ' + q.explanation).join('\n');
const corr8 = {
  'T01 mito guerra': /mito/i, 'T01 ARPANET no es internet': /ARPANET/, 'T02 satélite inalámbrico': /satélite/i, 'T02 fibra luz': /pulsos de luz/i,
  'T03 anycast': /más cercano/i, 'T07 ICANN': /ICANN/, 'T07 privada': /privada/i, 'T08 MAC fabricante': /fabricante/i, 'T09 sesión': /abre, mantiene y cierra/i,
  'T09 navegador': /navegador/i, 'T11 TLS': /sin que se note/i, 'T11 Telnet': /texto plano/i, 'T13 TCP/IP antes': /nació antes/i, 'T14 Mbps': /12\.5/, 'T14 Wireshark': /Wireshark/,
};
for (const [k, re] of Object.entries(corr8)) if (!re.test(t8)) bad('[CORREGIDO M08] sin cubrir: ' + k);
const real8 = ['sin interferencia eléctrica', 'suscritos a un canal', 'audífonos', 'semáforos', 'México, Chile y España', 'añade su propio encabezado', 'direccionamiento lógico y el enrutamiento', '192.168.0.20', '300.12.5.8', 'asignada por el fabricante', 'descomprimirlos', 'pierde un fotograma', 'ningún byte', 'Telnet', 'inicio de sesión', 'misma IP', 'cable de red', '100 Mbps', 'MAC de origen'];
for (const s of real8) if (!m08.questions.some((q) => q.type === 'scenario' && (q.prompt + q.options.join(' ') + q.explanation).includes(s))) bad('Falta escenario M08: ' + s);
const otros8 = new Set(MODULES.slice(0, 7).flatMap((m) => m.questions.map((q) => normP(q.prompt))));
for (const q of m08.questions) if (otros8.has(normP(q.prompt))) bad(`${q.id}: prompt repetido en otro módulo`);
console.log('Por tema M08:', JSON.stringify(r8.perTopic));
// ---------- M09 ----------
const m09 = MODULES[8];
const r9 = checkModule(m09, 'M09', { mcq: 76, tf: 57, scenario: 24, error: 26 }, 19);
if (r9.trues < 26 || r9.trues > 31) bad(`M09: verdaderas fuera de 26..31 (${r9.trues})`);
const t9 = m09.questions.filter((q) => q.type === 'mcq' || q.type === 'tf').map((q) => q.prompt + ' ' + (q.options || []).join(' ') + ' ' + q.explanation).join('\n');
const corr9 = {
  'T01 jerarquía': /no toda IA es un LLM/i, 'T02 siguiente token': /siguiente token/i, 'T02 pesos no cambian': /pesos .{0,40}no cambian|no cambian/i,
  'T03 token no palabra': /75/, 'T03 costo/límite': /unidad de costo/i, 'T03 salida cuesta más': /salida suelen costar más|salida suelen costar/i,
  'T04 sin estado': /no guarda estado/i, 'T04 reenvía historial': /reenv/i, 'T04 más contexto': /más contexto no siempre|pasar por alto detalles/i,
  'T05 temperatura 0': /no garantiza/i, 'T05 no determinista': /no determinista/i, 'T06 más probable': /más probable/i, 'T06 no eliminan': /no las elimina|no elimina|desaparecen por completo/i,
  'T07 claro específico': /claro y específico|específico/i, 'T07 colega': /colega/i, 'T08 validar': /validar/i, 'T08 iterativo': /casos de prueba|empírico|iterativ/i,
  'T09 system no seguridad': /no es un mecanismo de seguridad/i, 'T09 streaming': /latencia percibida/i, 'T09 llave servidor': /servidor/i,
  'T10 cercanos': /cercanos|cercanía/i, 'T11 no modifica': /no modifica los pesos/i, 'T11 no elimina': /no las elimina/i,
  'T12 orden': /primero el prompt/i, 'T12 RAG cambia': /conocimiento que cambia|actualizar los documentos/i,
  'T13 no ejecuta': /solicitud estructurada/i, 'T13 descripción': /parte del prompt|ocupan tokens/i,
  'T14 workflow vs agente': /pasos están fijos/i, 'T14 simple': /más simple/i, 'T15 MxN': /M × N/, 'T15 no reemplaza': /no reemplaza|reemplaza a tool use/i,
  'T16 no distingue': /no distingue/i, 'T16 salida no confiable': /no confiable/i, 'T17 evals cada vez': /cada vez que cambia/i, 'T17 compromiso': /más lentos? y caros?|más lento y caro/i,
  'T18 responsable': /responsable/i, 'T18 más importan': /importan más/i,
};
for (const [k, re] of Object.entries(corr9)) if (!re.test(t9)) bad('[CLAVE M09] sin cubrir: ' + k);
const real9 = ['fecha de corte', '2,000 tokens', 'olvida', 'repositorio completo', 'cinco categorías', 'cortadas a media frase', 'no existe', 'arregla esto', 'mismo formato', 'varios pasos', 'llave de API en el JavaScript', 'pantalla queda en blanco', 'auto usado', 'documentación interna', 'estilo muy particular', 'clima actual', 'mismos tres pasos', 'producción', 'tres aplicaciones de IA', 'misma máquina', 'texto oculto', 'consulta SQL', 'system prompt y quieres', 'asistente de código te entrega'];
for (const s of real9) if (!m09.questions.some((q) => q.type === 'scenario' && (q.prompt + q.options.join(' ') + q.explanation).includes(s))) bad('Falta escenario M09: ' + s);
const otros9 = new Set(MODULES.slice(0, 8).flatMap((m) => m.questions.map((q) => normP(q.prompt))));
for (const q of m09.questions) if (otros9.has(normP(q.prompt))) bad(`${q.id}: prompt repetido en otro módulo`);
const m09txt = JSON.stringify(m09);
for (const re of [/GPT/, /Claude/, /Gemini/, /Copilot/, /Cursor/, /OpenAI/]) if (re.test(m09txt)) bad('M09 menciona producto: ' + re);
console.log('Por tema M09:', JSON.stringify(r9.perTopic));
// ---------- M10 ----------
const m10 = MODULES[9];
const r10 = checkModule(m10, 'M10', { mcq: 80, tf: 60, scenario: 26, error: 28 }, 20);
if (r10.trues < 27 || r10.trues > 33) bad(`M10: verdaderas fuera de 27..33 (${r10.trues})`);
const t10 = m10.questions.filter((q) => q.type === 'mcq' || q.type === 'tf').map((q) => q.prompt + ' ' + (q.options || []).join(' ') + ' ' + q.explanation).join('\n');
const corr10 = {
  'T01 vulnerabilidad/amenaza/riesgo': /quien puede aprovecharla/i, 'T01 gestionar el riesgo': /gestionar el riesgo/i,
  'T02 mínimo privilegio': /permisos indispensables/i, 'T02 validar servidor': /en el servidor/i, 'T02 oscuridad': /cómo funciona el sistema/i,
  'T03 autenticación/autorización': /quién eres/i, 'T03 401/403': /401/, 'T04 hash': /hash con sal|su hash/i, 'T04 lentos': /bcrypt|Argon2/, 'T04 MD5': /MD5/,
  'T05 JWT firmado': /firmado, no cifrado/i, 'T05 HttpOnly': /HttpOnly/, 'T06 codificar': /codificar no es cifrar/i, 'T06 no inventes': /inventar tu propia criptografía/i,
  'T07 concientización': /concientización/i, 'T07 A01': /Broken Access Control/, 'T07 Injection quinto': /quinto/i,
  'T08 servidor cada petición': /en cada petición/i, 'T09 parametrizadas': /consultas parametrizadas/i, 'T09 concatenar/bloqueo': /lista de bloqueo|Escapar caracteres a mano/i,
  'T10 escapar': /escapar la salida/i, 'T10 usuarios vs base': /ataca a los usuarios del sitio|ataca a la base de datos/i,
  'T11 cookies automáticas': /adjunta las cookies automáticamente/i, 'T11 CORS': /CORS/, 'T12 genéricos': /genéric/i,
  'T13 secretos no en código': /variables de entorno/i, 'T13 rotar': /rotar/i, 'T14 lockfile': /lockfile/i, 'T14 A03 vs A08': /A03/,
  'T15 fallar cerrado': /fallar cerrado|Fallar cerrado/, 'T15 diseño': /diseño inseguro/i, 'T16 no registrar': /contraseñas, tokens/i, 'T16 alertas': /alertas/i,
  'T17 copias': /copias de seguridad/i, 'T17 MFA': /MFA/, 'T18 WAF': /capa adicional/i, 'T19 autorización': /sin autorización/i, 'T19 DevSecOps': /DevSecOps/,
};
for (const [k, re] of Object.entries(corr10)) if (!re.test(t10)) bad('[CLAVE M10] sin cubrir: ' + k);
const top10 = ['Broken Access Control', 'Security Misconfiguration', 'Software Supply Chain Failures', 'Cryptographic Failures', 'Injection', 'Insecure Design', 'Authentication Failures', 'Software or Data Integrity Failures', 'Security Logging & Alerting Failures', 'Mishandling of Exceptional Conditions'];
const m10txt = JSON.stringify(m10);
for (const n of top10) if (!m10txt.includes(n)) bad('M10 falta categoría Top 10: ' + n);
const real10 = ['seis horas', 'calificaciones', 'cuenta de administrador', 'formato del correo', 'panel de administración', 'segunda contraseña', 'filtración en otro sitio', 'guardar las contraseñas', 'cookie de sesión', 'número de tarjeta', 'archivo descargado', 'Base64', '/pedidos/1001', 'descarga una imagen', 'consulta SQL concatenando', 'comentario con un script', 'sesión del banco', 'traza completa', 'llave de API a un repositorio', 'letra cambiada', 'servicio de permisos', 'servidor está comprometido', 'tono urgente', 'archivos de la empresa', 'Miles de equipos', 'sin avisarle'];
for (const s of real10) if (!m10.questions.some((q) => q.type === 'scenario' && (q.prompt + q.options.join(' ') + q.explanation).includes(s))) bad('Falta escenario M10: ' + s);
const otros10 = new Set(MODULES.slice(0, 9).flatMap((m) => m.questions.map((q) => normP(q.prompt))));
for (const q of m10.questions) if (otros10.has(normP(q.prompt))) bad(`${q.id}: prompt repetido en otro módulo`);
console.log('Por tema M10:', JSON.stringify(r10.perTopic));






console.log('Por tema M02:', JSON.stringify(r2.perTopic));

// ---------- Viaje 3D: vendor Three.js ----------
{
  const THREE_SHA384 = '7827608db326fa37a423c7f269e099e0f9f2839938267e39c36aacde57e701de444b920ee2128e5cd8ac5414f25330ce';
  if (!vend) bad('Falta el bloque VENDOR:THREE');
  else {
    const open = '<script type="text/plain" id="three-src" data-version="0.169.0">', close = '</script><!-- VENDOR:THREE END -->';
    const a = vend[0].indexOf(open), z = vend[0].lastIndexOf(close);
    if (a < 0) bad('vendor: falta data-version="0.169.0"');
    else if (z < 0) bad('vendor: falta el cierre del bloque');
    else {
      const body = vend[0].slice(a + open.length, z);
      if (/<\/script/i.test(body)) bad('vendor: contiene </script interno');
      if (/<!--/.test(body)) bad('vendor: contiene <!-- interno');
      if (/from\s*["']\.\//.test(body)) bad('vendor: import relativo');
      if ((await import('node:crypto')).createHash('sha384').update(body).digest('hex') !== THREE_SHA384) bad('vendor: hash distinto');
    }
  }
}
// ---------- Ciudad Núcleo: CITY_DATA ----------
{
  const mt = htmlNoV.match(/var CITY_DATA = (\{[\s\S]*?\n?\});\n/);
  if (!mt) bad('Falta CITY_DATA');
  else {
    const D = vm.runInNewContext('(' + mt[1] + ')');
    const m2 = MODULES.find((m) => m.id === 'M02'), m1 = MODULES.find((m) => m.id === 'M01');
    const dist = D.districts && D.districts.M02;
    if (!dist) bad('CITY_DATA.districts.M02 no existe');
    else {
      const FORBID = new Set(['__proto__', 'constructor', 'prototype', ...Object.getOwnPropertyNames(Object.prototype)]);
      const idOk = (id) => typeof id === 'string' && /^[a-z0-9_-]+$/.test(id) && !FORBID.has(id);
      const topics = m2.topics.map((t) => t.id);
      const count = (types, tid) => m2.questions.filter((q) => types.includes(q.type) && q.topic === tid).length;
      const allIds = [];
      const take = (arr, what) => arr.forEach((o) => { if (!idOk(o.id)) bad(`${what}: id inseguro ${o.id}`); allIds.push(o.id); });
      // mentores
      if (dist.mentors.length !== 23) bad('Debe haber 23 mentores');
      if (new Set(dist.mentors.map((x) => x.topic)).size !== 23 || topics.some((t) => !dist.mentors.some((x) => x.topic === t))) bad('Los mentores deben cubrir T01–T23 una vez');
      if (new Set(dist.mentors.map((x) => x.name)).size !== dist.mentors.length) bad('Nombres de mentor repetidos');
      take(dist.mentors, 'mentor');
      // criaturas
      if (dist.creatures.length !== 6) bad('Debe haber 6 criaturas');
      const seen = {};
      for (const c of dist.creatures) {
        for (const t of c.topics) seen[t] = (seen[t] || 0) + 1;
        const n = c.topics.reduce((a, t) => a + count(['mcq', 'tf'], t), 0);
        if (n < 8) bad(`${c.id}: solo ${n} preguntas mcq+tf`);
      }
      if (topics.some((t) => seen[t] !== 1)) bad('Las criaturas deben cubrir cada tema de M02 exactamente una vez');
      take(dist.creatures, 'criatura');
      // retos
      if (dist.repairs.length !== 10) bad('Debe haber 10 retos');
      if (new Set(dist.repairs.map((r) => r.topic)).size !== dist.repairs.length) bad('Los retos deben tener temas distintos');
      for (const r of dist.repairs) if (count(['scenario', 'error'], r.topic) < 2) bad(`${r.id}: el tema ${r.topic} necesita >= 2 preguntas scenario+error`);
      take(dist.repairs, 'reto');
      // aprendices
      if (dist.apprentices.length !== 12) bad('Debe haber 12 puestos de aprendiz');
      if (new Set(dist.apprentices.map((a) => a.topic)).size !== 12) bad('Los aprendices deben tener temas distintos');
      const mentorNames = new Set(dist.mentors.map((x) => x.name));
      for (const a of dist.apprentices) {
        if (!topics.includes(a.topic)) bad(`${a.id}: tema inexistente`);
        if (a.mode !== 'explain' && a.mode !== 'correct') bad(`${a.id}: modo inválido`);
        if (a.mode === 'correct' && count(['error'], a.topic) < 1) bad(`${a.id}: 'correct' necesita >= 1 pregunta error en ${a.topic}`);
        if (mentorNames.has(a.name)) bad(`${a.id}: el nombre ${a.name} choca con un mentor`);
      }
      if (new Set(dist.apprentices.map((a) => a.name)).size !== 12) bad('Nombres de aprendiz repetidos');
      take(dist.apprentices, 'aprendiz');
      if (dist.need !== 8) bad('need debe ser 8');
      if (new Set(allIds).size !== allIds.length) bad('Ids repetidos entre mentores, criaturas, retos y aprendices');
      // palabras prohibidas en nombres y etiquetas
      const names = [...dist.mentors, ...dist.creatures, ...dist.apprentices].map((x) => x.name).concat(dist.repairs.map((r) => r.label), [D.plaza.director.name]);
      for (const n of names) for (const re of forbidden) if (re.test(n)) bad(`Palabra prohibida ${re} en "${n}"`);
      // posiciones: dentro de los límites y de cada zona, y separadas >= 4 m
      const B = D.bounds, inB = (o) => o.x >= B.minX && o.x <= B.maxX && o.z >= B.minZ && o.z <= B.maxZ;
      const R = dist.rect, inR = (o) => o.x >= R.minX && o.x <= R.maxX && o.z >= R.minZ && o.z <= R.maxZ;
      const pts = [...dist.mentors, ...dist.repairs, ...dist.apprentices, ...dist.creatures.map((c) => ({ id: c.id, x: c.area.x, z: c.area.z })), dist.tower, dist.bridge];
      for (const o of pts) { if (!inB(o)) bad(`${o.id}: fuera de los límites del mundo`); if (!inR(o)) bad(`${o.id}: fuera del rectángulo del distrito`); }
      for (let i = 0; i < pts.length; i++) for (let j = i + 1; j < pts.length; j++) if (Math.hypot(pts[i].x - pts[j].x, pts[i].z - pts[j].z) < 4) bad(`${pts[i].id} y ${pts[j].id} están a menos de 4 m`);
      for (const o of [D.plaza.director, D.plaza.mirror, D.spawn]) if (!inB(o)) bad(`${o.id || 'spawn'}: fuera de los límites`);
      if (D.plaza.roads.length !== 10) bad('La plaza debe tener 10 muros');
      // ningún interactuable dentro de un edificio ni de una caja de colisión (margen 0.6 m)
      const CM = vm.runInNewContext((await import('node:fs')).readFileSync(new URL('./city/move.js', import.meta.url), 'utf8') + '\n;CityMove');
      const solid = CM.boxesFor(D, false);
      const free = [...dist.mentors, ...dist.repairs, ...dist.apprentices, ...dist.creatures.map((c) => ({ id: c.id, x: c.area.x, z: c.area.z })), D.plaza.director, D.plaza.mirror, CM.door(dist.tower), CM.door(dist.bridge), D.spawn];
      for (const p of free) for (const b of solid) { const cx = Math.max(b.minX, Math.min(p.x, b.maxX)), cz = Math.max(b.minZ, Math.min(p.z, b.maxZ)); if (Math.hypot(p.x - cx, p.z - cz) < 0.6) bad(`${p.id || 'spawn'}: dentro o junto a una caja de colisión`); }
    }
    // rangos y villanos de M01
    const want = [[0, 'Becario'], [1, 'Junior'], [3, 'Semi-senior'], [6, 'Senior'], [8, 'Arquitecto'], [11, 'Tech Lead']];
    if (JSON.stringify(D.ranks) !== JSON.stringify(want)) bad('La tabla de rangos no coincide con el spec');
  }
}
// ---------- Viaje 3D: estaciones (TRIP_STATIONS) ----------
{
  const mt = html.match(/var TRIP_STATIONS = (\[[\s\S]*?\]);/);
  if (!mt) bad('Falta TRIP_STATIONS');
  else {
    const st = vm.runInNewContext(mt[1]);
    const m8 = MODULES.find((m) => m.id === 'M08');
    const byId = Object.fromEntries(m8.topics.map((t) => [t.id, t]));
    if (st.length !== 10) bad('TRIP_STATIONS debe tener 10 estaciones');
    const union = new Set();
    for (const s of st) {
      for (const t of s.topics) { if (!byId[t]) bad(`${s.id}: tema ${t} no existe en M08`); union.add(t); }
      if (s.ask !== 1 && s.ask !== 2) bad(`${s.id}: ask debe ser 1 o 2`);
      if (!Array.isArray(s.kp) || s.kp.length !== 1) bad(`${s.id}: kp debe tener 1 elemento`);
      else {
        const k = s.kp[0], t = byId[k.topic];
        if (!t || !Number.isInteger(k.index) || k.index < 0 || k.index >= t.keyPoints.length || !t.keyPoints[k.index].includes(k.expect)) bad('kp desalineado en ' + s.id);
        if (typeof k.expect !== 'string' || k.expect.length < 15 || k.expect.length > 40) bad(`${s.id}: expect debe medir de 15 a 40 caracteres`);
        if (!s.topics.includes(k.topic)) bad(`${s.id}: kp.topic no está en topics`);
      }
    }
    if (m8.topics.some((t) => !union.has(t.id))) bad('TRIP_STATIONS no cubre los 15 temas de M08');
    if (st.reduce((n, s) => n + s.ask, 0) !== 18) bad('La suma de ask debe ser 18');
  }
}
if (errs.length) { console.log('ERRORES:\n- ' + errs.join('\n- ')); process.exit(1); }
console.log('VALIDACIÓN OK');
