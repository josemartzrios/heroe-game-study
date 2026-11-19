// Factibilidad de datos del spec 2026-11-17-ciudad-tanda-2-design.md (M03, M01, M10) contra el contenido REAL.
// Transcribe las tablas del spec, arma cada distrito con standardFrame() y people() de city/layout.mjs y pasa city/check_district.mjs (R1–R7);
// las reglas entre todos los distritos registrados vienen de district_rules.cjs. Solo lee datos; no depende de build.mjs.
const path = require('path');
const { pathToFileURL } = require('url');
const root = path.join(__dirname, '..');
const imp = (f) => import(pathToFileURL(path.join(root, f)).href);
const assert = require('assert');
const R = require('./district_rules.cjs');
const same = (a, b) => { try { assert.deepStrictEqual(a, b); return true; } catch (e) { return false; } };
const results = [];
const ok = (name, cond, extra) => { results.push([cond ? 'PASS' : 'FAIL', name, extra || '']); };
const pad = (n) => String(n).padStart(2, '0');
const T = (n) => 'T' + pad(n);
const MODE = { explicar: 'explain', corregir: 'correct' };

// ---- Tablas del spec (transcritas tal cual) ----
const SPEC = {
  M03: {
    file: 'content_m03.mjs', title: 'Fundamentos de internet', name: 'Barrio Byte', topicCount: 18,
    colors: { a: '#c6ff4d', b: '#4d7cff' }, style: 'red', seed: 13, need: 7,
    mentors: 'Abel, Bea, César, Dora, Ernesto, Frida, Gonzalo, Helena, Ismael, Jimena, Kevin, Lorena, Marco, Nadia, Omar, Pilar, Quique, Romina',
    creatures: [
      ['bitflip', 'Bit Invertido', ['T01', 'T02', 'T03']],
      ['mojibake', 'Mojibake', ['T04', 'T05']],
      ['fantasma', 'Señal Fantasma', ['T06', 'T07', 'T08', 'T16']],
      ['extraviado', 'DNS Extraviado', ['T09', 'T11']],
      ['intermediario', 'Intermediario', ['T13', 'T14']],
      ['atasco', 'Render Atascado', ['T10', 'T12', 'T15', 'T17', 'T18']]
    ],
    repairs: [['T01', 'el panel de luces binario'], ['T04', 'el cartel sin acentos'], ['T05', 'la pantalla sin color'],
      ['T06', 'la fibra del fondo del mar'], ['T08', 'la pila de protocolos'], ['T11', 'la URL mal escrita'],
      ['T13', 'la petición sin respuesta'], ['T14', 'el certificado vencido'], ['T17', 'la página a medio dibujar']],
    apprentices: [['Ari', 'T02', 'explicar'], ['Brenda', 'T03', 'corregir'], ['Coco', 'T06', 'corregir'], ['Dalia', 'T07', 'explicar'],
      ['Elio', 'T09', 'explicar'], ['Fede', 'T10', 'corregir'], ['Gema', 'T12', 'corregir'], ['Ivo', 'T13', 'explicar'],
      ['Jade', 'T16', 'explicar'], ['Kira', 'T18', 'corregir']],
    celebrate: 'El Barrio Byte vuelve a hablar el idioma de internet: cada página llega completa.'
  },
  M01: {
    file: 'content.mjs', title: 'Diseño de sistemas', name: 'Ciudadela Escalable', topicCount: 19,
    colors: { a: '#d580ff', b: '#5ce1ff' }, style: 'red', seed: 17, need: 7,
    mentors: 'Adrián, Blanca, Camilo, Débora, Eduardo, Fernanda, Gerardo, Hilda, Ignacio, Josefina, Leandro, Marina, Norberto, Octavia, Pascual, Raquel, Samuel, Tania, Úrsula',
    creatures: [
      ['latencia', 'Latencia Eterna', ['T01', 'T02', 'T03']],
      ['embudo', 'Embudo Saturado', ['T04', 'T06', 'T17']],
      ['rebelde', 'Réplica Rebelde', ['T07', 'T08', 'T09', 'T12']],
      ['rancia', 'Caché Rancia', ['T10', 'T14']],
      ['desparramado', 'Dato Desparramado', ['T05', 'T11', 'T13']],
      ['cascada', 'Fallo en Cascada', ['T15', 'T16', 'T18', 'T19']]
    ],
    repairs: [['T03', 'el proxy mal configurado'], ['T05', 'la base de datos equivocada'], ['T08', 'la réplica atrasada'], ['T09', 'el shard sobrecargado'],
      ['T10', 'la caché desactualizada'], ['T12', 'la red partida en dos'], ['T16', 'la cola de mensajes atascada'], ['T19', 'el cobro duplicado']],
    apprentices: [['Alba', 'T01', 'explicar'], ['Bastián', 'T02', 'explicar'], ['Cris', 'T04', 'corregir'], ['Dino', 'T06', 'explicar'],
      ['Ema', 'T08', 'corregir'], ['Fito', 'T09', 'corregir'], ['Gia', 'T12', 'corregir'], ['Iara', 'T14', 'explicar'],
      ['Joel', 'T15', 'explicar'], ['Kai', 'T18', 'corregir']],
    celebrate: 'La Ciudadela Escalable aguanta la hora pico: ningún servidor carga solo con todo.'
  },
  M10: {
    file: 'content_m10.mjs', title: 'Ciberseguridad', name: 'Muralla Cifrada', topicCount: 20,
    colors: { a: '#ff5f6d', b: '#c9b8ff' }, style: 'red', seed: 19, need: 7,
    mentors: 'Alicia, Benito, Cecilia, David, Eva, Felipe, Gloria, Horacio, Isabel, Jorge, Laura, Manuel, Natalia, Orlando, Patricia, Ramiro, Sara, Tomás, Valeria, Xavier',
    creatures: [
      ['pescador', 'Pescador de Claves', ['T01', 'T04', 'T17']],
      ['robada', 'Llave Robada', ['T02', 'T03', 'T05']],
      ['debil', 'Cifrado Débil', ['T06', 'T13']],
      ['inyector', 'Inyector', ['T07', 'T09', 'T10', 'T11']],
      ['abierta', 'Puerta Abierta', ['T08', 'T12', 'T14', 'T15']],
      ['tormenta', 'Tormenta de Tráfico', ['T16', 'T18', 'T19', 'T20']]
    ],
    repairs: [['T03', 'la puerta sin cerradura'], ['T04', 'la contraseña en una nota'], ['T05', 'la cookie sin protección'],
      ['T06', 'el mensaje sin cifrar'], ['T09', 'el formulario inyectable'], ['T10', 'el script escondido'],
      ['T12', 'la clave de fábrica'], ['T16', 'la alarma sin registro'], ['T18', 'la inundación de tráfico']],
    apprentices: [['Aldo', 'T01', 'corregir'], ['Bela', 'T02', 'explicar'], ['Coral', 'T04', 'corregir'], ['Dante', 'T06', 'explicar'],
      ['Elsa', 'T08', 'corregir'], ['Fina', 'T11', 'corregir'], ['Gilda', 'T13', 'explicar'], ['Irma', 'T14', 'corregir'],
      ['Juno', 'T17', 'explicar'], ['Lino', 'T19', 'corregir']],
    celebrate: 'La Muralla Cifrada vuelve a proteger la ciudad: nadie entra sin permiso.'
  }
};

function build(id, s, standardFrame, people) {
  const { lay, tower, entry, exit, bounds, streets, blocks } = standardFrame();
  const who = people(lay, {
    mentors: s.mentors.split(', '),
    creatures: s.creatures.map(([cid, name, topics]) => ({ id: cid, name, topics })),
    repairs: s.repairs,
    apprentices: s.apprentices.map(([name, topic, modo]) => [name, topic, MODE[modo]])
  });
  return { id, name: s.name, colors: s.colors, style: s.style, seed: s.seed, bounds, entry, exit, streets, blocks, ...who, tower, need: s.need, celebrate: { text: s.celebrate } };
}

(async () => {
  const { standardFrame, people } = await imp('city/layout.mjs');
  const { checkDistrict, FORBIDDEN } = await imp('city/check_district.mjs');
  const { expandModule } = await imp('content_expand.mjs');
  const { city } = await imp('city/districts.mjs');

  // lugares disponibles en el marco común (informativo y para "take() alcanza")
  const probe = standardFrame().lay;
  let spots = 0; try { for (;;) { probe.take(); spots++; } } catch (e) { /* fin de lugares */ }
  ok('marco: standardFrame() da más de 44 lugares (spec)', spots > 44, `lugares=${spots}`);

  const built = {};
  for (const [id, s] of Object.entries(SPEC)) {
    const mod = expandModule(id, s.title, await imp(s.file));
    const ids = mod.topics.map((t) => t.id);
    const want = Array.from({ length: s.topicCount }, (_, i) => T(i + 1));
    ok(`${id}: el módulo tiene ${s.topicCount} temas T01..T${s.topicCount} en orden`, JSON.stringify(ids) === JSON.stringify(want), ids.join(','));
    ok(`${id}: un nombre de mentor por tema (${s.topicCount})`, s.mentors.split(', ').length === s.topicCount, String(s.mentors.split(', ').length));
    ok(`${id}: ids de criatura únicos`, new Set(s.creatures.map((c) => c[0])).size === s.creatures.length);
    ok(`${id}: 10 aprendices a01–a10`, s.apprentices.length === 10, String(s.apprentices.length));
    ok(`${id}: modos de aprendiz válidos (explicar/corregir)`, s.apprentices.every((a) => MODE[a[2]]));
    ok(`${id}: colores en formato #rrggbb`, /^#[0-9a-f]{6}$/.test(s.colors.a) && /^#[0-9a-f]{6}$/.test(s.colors.b));
    ok(`${id}: style 'red' (con 'taller' los edificios ignoran los colores del distrito)`, s.style === 'red', s.style);
    ok(`${id}: colors.a no es uno de los 6 morados de las criaturas de referencia`, !['#7a52c4', '#b06cff', '#5a3a9a', '#9a4fd8', '#8a5fe0', '#6a3fb0'].includes(s.colors.a), s.colors.a);
    ok(`${id}: no usa el ámbar de ventanas y muros (#ffd76a)`, s.colors.a !== '#ffd76a' && s.colors.b !== '#ffd76a');
    const long = s.repairs.filter((r) => r[1].length > 28).map((r) => r[1] + ' (' + r[1].length + ')');
    ok(`${id}: etiquetas de reparación de 28 caracteres como máximo`, long.length === 0, long.join(' | '));

    let dist = null;
    const needed = s.topicCount + s.creatures.length + s.repairs.length + s.apprentices.length;
    try { dist = build(id, s, standardFrame, people); } catch (e) { /* sin lugares */ }
    ok(`${id}: take() alcanza para ${needed} lugares sin pads ni ajustes`, !!dist, `lugares=${spots}`);
    if (!dist) continue;
    built[id] = dist;

    const errs = checkDistrict(dist, mod);
    ok(`${id}: checkDistrict R1–R7 sin errores`, errs.length === 0, errs.join(' | '));
    ok(`${id}: el archivo real de city/districts es idéntico al armado desde la tabla del spec (datos, coordenadas y orden de take())`, same(dist, city.districts[id]), city.districts[id] ? 'difiere' : 'el distrito no está registrado');

    // detalle por regla (informativo; mismo criterio que checkDistrict)
    const count = (types, tid) => mod.questions.filter((q) => types.includes(q.type) && q.topic === tid).length;
    for (const c of dist.creatures) {
      const n = c.topics.reduce((a, t) => a + count(['mcq', 'tf'], t), 0);
      ok(`${id} criatura ${c.id}: >= 8 preguntas mcq+tf`, n >= 8, `n=${n}`);
    }
    for (const r of dist.repairs) ok(`${id} reparación ${r.id} ${r.topic}: scenario+error >= 2`, count(['scenario', 'error'], r.topic) >= 2,
      `scenario=${count(['scenario'], r.topic)} error=${count(['error'], r.topic)}`);
    for (const a of dist.apprentices.filter((x) => x.mode === 'correct')) ok(`${id} aprendiz ${a.name} (${a.topic}) corregir: error >= 1`, count(['error'], a.topic) >= 1,
      `error=${count(['error'], a.topic)}`);

    // etiquetas de reparación con artículo
    const noArt = dist.repairs.filter((r) => !/^(el|la|los|las|un|una|unos|unas) /.test(r.label)).map((r) => r.label);
    ok(`${id}: etiquetas de reparación empiezan con artículo`, noArt.length === 0, noArt.join(' | '));

    // palabras prohibidas en todo el texto del distrito (nombres, etiquetas, celebración)
    const texts = [dist.name, dist.celebrate.text, ...dist.mentors.map((m) => m.name), ...dist.creatures.map((c) => c.name),
      ...dist.repairs.map((r) => r.label), ...dist.apprentices.map((a) => a.name)];
    const hits = texts.filter((t) => FORBIDDEN.some((re) => re.test(t)));
    ok(`${id}: sin palabras prohibidas (FORBIDDEN)`, hits.length === 0, hits.join(' | '));
  }

  // ---- entre todos los distritos registrados ----
  const all = city.districts, ids = Object.keys(all);
  ok('los distritos de la tabla están registrados', Object.keys(SPEC).every((id) => all[id]), ids.join(','));
  const clash = R.nameClashes(all);
  ok('ningún nombre de mentor/aprendiz se repite ni se parece a otro (regla fonética de district_rules)', clash.length === 0, clash.join(' '));
  const own = R.ownColorProblems(all);
  ok('cada distrito tiene al menos un color que no usa ningún otro', own.length === 0, own.join(' | '));
  ok('seed distinto en todos los distritos', R.repeated(all, 'seed').length === 0, R.repeated(all, 'seed').join(','));
  ok('nombre de distrito distinto en todos los distritos', R.repeated(all, 'name').length === 0, R.repeated(all, 'name').join(','));

  const fails = results.filter((r) => r[0] === 'FAIL'); results.forEach((r) => console.log(r.join(' ')));
  console.log(fails.length ? 'FALLAS ' + fails.length : 'TANDA 2 FACTIBLE OK (' + results.length + ')'); process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error('EXC', e); process.exit(2); });
