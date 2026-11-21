// Piezas comunes de tanda2_feasibility y tanda3_feasibility: armar un distrito desde la tabla transcrita del spec y comprobarla contra el módulo real.
// `ok(nombre, condición, detalle)` es el de cada prueba; las tablas SPEC y lo que es propio de cada tanda se quedan en su archivo.
const MODE = { explicar: 'explain', corregir: 'correct' };
const ART = /^(el|la|los|las|un|una|unos|unas) /;
const PURPLES = ['#7a52c4', '#b06cff', '#5a3a9a', '#9a4fd8', '#8a5fe0', '#6a3fb0'];   // los morados de las criaturas de referencia
const AMBER = '#ffd76a';                                                                // el ámbar de ventanas y muros

// El distrito de la tabla s armado como lo hacen city/districts/*.mjs: standardFrame() y people() de city/layout.mjs.
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

// La tabla s contra el módulo real mod: temas, un mentor por tema, ids de criatura únicos, modos, colores, style y etiquetas de reparación cortas.
function shape(ok, id, s, mod) {
  const n = s.topicCount, ids = mod.topics.map((t) => t.id), want = Array.from({ length: n }, (_, i) => 'T' + String(i + 1).padStart(2, '0'));
  ok(`${id}: el módulo real "${mod.title}" tiene ${n} temas T01..T${n} en orden`, JSON.stringify(ids) === JSON.stringify(want), ids.join(','));
  ok(`${id}: un nombre de mentor por tema (${n})`, s.mentors.split(', ').length === n, String(s.mentors.split(', ').length));
  ok(`${id}: ids de criatura únicos`, new Set(s.creatures.map((c) => c[0])).size === s.creatures.length);
  ok(`${id}: modos de aprendiz válidos (explicar/corregir)`, s.apprentices.every((a) => MODE[a[2]]));
  ok(`${id}: colores en formato #rrggbb`, /^#[0-9a-f]{6}$/.test(s.colors.a) && /^#[0-9a-f]{6}$/.test(s.colors.b), s.colors.a + ' ' + s.colors.b);
  ok(`${id}: style 'red' (con 'taller' los edificios ignoran los colores del distrito)`, s.style === 'red', s.style);
  ok(`${id}: ningún color es uno de los 6 morados de las criaturas de referencia`, !PURPLES.includes(s.colors.a) && !PURPLES.includes(s.colors.b), s.colors.a + ' ' + s.colors.b);
  ok(`${id}: no usa el ámbar de ventanas y muros (${AMBER})`, s.colors.a !== AMBER && s.colors.b !== AMBER);
  const long = s.repairs.filter((r) => r[1].length > 28).map((r) => r[1] + ' (' + r[1].length + ')');
  ok(`${id}: etiquetas de reparación de 28 caracteres como máximo`, long.length === 0, long.join(' | '));
}

// El distrito armado dist contra el módulo real mod: detalle por regla (informativo; mismo criterio que checkDistrict), etiquetas con artículo
// y palabras prohibidas (FORBIDDEN de check_district.mjs) en todo el texto del distrito: nombres, etiquetas y celebración.
function detail(ok, id, dist, mod, FORBIDDEN) {
  const count = (types, tid) => mod.questions.filter((q) => types.includes(q.type) && q.topic === tid).length;
  for (const c of dist.creatures) {
    const n = c.topics.reduce((a, t) => a + count(['mcq', 'tf'], t), 0);
    ok(`${id} criatura ${c.id}: >= 8 preguntas mcq+tf`, n >= 8, `n=${n}`);
  }
  for (const r of dist.repairs) ok(`${id} reparación ${r.id} ${r.topic}: scenario+error >= 2`, count(['scenario', 'error'], r.topic) >= 2,
    `scenario=${count(['scenario'], r.topic)} error=${count(['error'], r.topic)}`);
  for (const a of dist.apprentices.filter((x) => x.mode === 'correct')) ok(`${id} aprendiz ${a.name} (${a.topic}) corregir: error >= 1`, count(['error'], a.topic) >= 1,
    `error=${count(['error'], a.topic)}`);
  const noArt = dist.repairs.filter((r) => !ART.test(r.label)).map((r) => r.label);
  ok(`${id}: etiquetas de reparación empiezan con artículo`, noArt.length === 0, noArt.join(' | '));
  const texts = [dist.name, dist.celebrate.text, ...dist.mentors.map((m) => m.name), ...dist.creatures.map((c) => c.name),
    ...dist.repairs.map((r) => r.label), ...dist.apprentices.map((a) => a.name)];
  const hits = texts.filter((t) => FORBIDDEN.some((re) => re.test(t)));
  ok(`${id}: sin palabras prohibidas (FORBIDDEN)`, hits.length === 0, hits.join(' | '));
}

module.exports = { build, shape, detail };
