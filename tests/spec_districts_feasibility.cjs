// Factibilidad de datos del spec 2026-11-12-ciudad-distritos-design.md (§4.3 y §4.5).
// Comprueba con el contenido REAL (content_m08.mjs, content_m02.mjs, city/districts/m08_route.mjs, city/districts.mjs)
// que el reparto propuesto para M08 y el M02 actual cumplen las reglas de distrito. Solo lee datos.
const path = require('path');
const { pathToFileURL } = require('url');
const root = path.join(__dirname, '..');
const imp = (f) => import(pathToFileURL(path.join(root, f)).href);
const results = [];
const ok = (name, cond, extra) => { results.push([cond ? 'PASS' : 'FAIL', name, extra || '']); };

// Arrays compactos: [tema, dificultad, ...]; el tema es la posición 0.
const countOf = (arr, tid) => arr.filter((q) => q[0] === tid).length;

// Reglas §4.3 (1–4) sobre un distrito con { mentors, creatures, repairs, apprentices } y su contenido.
function checkRules(label, content, dist) {
  const topicIds = content.topics.map((t) => t.id);
  const mentorTopics = dist.mentors.map((m) => m.topic);
  const missing = topicIds.filter((t) => mentorTopics.filter((x) => x === t).length !== 1);
  ok(label + ': cada tema tiene exactamente un mentor', missing.length === 0, missing.join(','));
  const ghost = mentorTopics.filter((t) => !topicIds.includes(t));
  ok(label + ': ningún mentor apunta a tema inexistente', ghost.length === 0, ghost.join(','));

  const all = dist.creatures.flatMap((c) => c.topics);
  const dup = all.filter((t, i) => all.indexOf(t) !== i);
  ok(label + ': criaturas sin temas repetidos', dup.length === 0, dup.join(','));
  const uncovered = topicIds.filter((t) => !all.includes(t));
  ok(label + ': criaturas cubren todo el módulo', uncovered.length === 0, uncovered.join(','));
  const extra = all.filter((t) => !topicIds.includes(t));
  ok(label + ': criaturas sin temas inexistentes', extra.length === 0, extra.join(','));
  const badSize = dist.creatures.filter((c) => c.topics.length < 2 || c.topics.length > 5).map((c) => c.id + ':' + c.topics.length);
  ok(label + ': cada criatura tiene de 2 a 5 temas', badSize.length === 0, badSize.join(','));

  const weakRepairs = dist.repairs
    .map((r) => [r.topic, countOf(content.scenario, r.topic) + countOf(content.error, r.topic)])
    .filter(([, n]) => n < 2).map(([t, n]) => t + '=' + n);
  ok(label + ': cada reparación tiene >= 2 preguntas scenario+error', weakRepairs.length === 0, weakRepairs.join(','));

  const weakCorrect = dist.apprentices.filter((a) => a.mode === 'correct' && countOf(content.error, a.topic) < 1).map((a) => a.topic);
  ok(label + ': cada aprendiz correct tiene >= 1 pregunta error', weakCorrect.length === 0, weakCorrect.join(','));
}

(async () => {
  const m08 = await imp('content_m08.mjs');
  const m02 = await imp('content_m02.mjs');
  const { stations } = await imp('city/districts/m08_route.mjs');
  const { city } = await imp('city/districts.mjs');

  // ---- M08: temas ----
  const ids = m08.topics.map((t) => t.id);
  const expected = Array.from({ length: 15 }, (_, i) => 'T' + String(i + 1).padStart(2, '0'));
  ok('M08: tiene exactamente 15 temas', ids.length === 15, String(ids.length));
  ok('M08: los temas son T01..T15 en orden', JSON.stringify(ids) === JSON.stringify(expected), ids.join(','));

  // ---- M08: reparto del spec §4.5 ----
  const M08 = {
    mentors: expected.map((topic) => ({ topic })),
    creatures: [
      { id: 'ruido', topics: ['T01', 'T02', 'T03'] },
      { id: 'perdido', topics: ['T04', 'T07', 'T14'] },
      { id: 'capas', topics: ['T05', 'T08', 'T09', 'T13'] },
      { id: 'handshake', topics: ['T06', 'T10', 'T12'] },
      { id: 'espia', topics: ['T11', 'T15'] }
    ],
    repairs: ['T02', 'T03', 'T04', 'T07', 'T10', 'T11', 'T12', 'T14'].map((topic) => ({ topic })),
    apprentices: [['T01', 'explain'], ['T02', 'correct'], ['T04', 'explain'], ['T05', 'explain'], ['T07', 'correct'],
      ['T08', 'explain'], ['T10', 'correct'], ['T12', 'explain'], ['T13', 'correct']].map(([topic, mode]) => ({ topic, mode })),
    need: 6
  };
  ok('M08: spec define 15 nombres de mentor', 'Alma, Baltasar, Celia, Darío, Estela, Fausto, Greta, Hernán, Irene, Julián, Lía, Mateo, Noemí, Óscar, Paula'.split(', ').length === 15);
  checkRules('M08', m08, M08);
  ok('M08: need (6) <= número de aprendices', M08.need <= M08.apprentices.length);
  // detalle informativo por reparación y aprendiz correct
  for (const r of M08.repairs) ok(`M08 reparación ${r.topic}: scenario+error >= 2`, countOf(m08.scenario, r.topic) + countOf(m08.error, r.topic) >= 2,
    `scenario=${countOf(m08.scenario, r.topic)} error=${countOf(m08.error, r.topic)}`);
  for (const a of M08.apprentices.filter((x) => x.mode === 'correct')) ok(`M08 aprendiz correct ${a.topic}: error >= 1`, countOf(m08.error, a.topic) >= 1,
    `error=${countOf(m08.error, a.topic)}`);

  // ---- ruta: estaciones con kp válido (§4.3 regla 8) ----
  ok('ruta: hay 10 estaciones S0..S9', stations.length === 10 && stations.every((s, i) => s.id === 'S' + i));
  for (const s of stations) {
    const kps = Array.isArray(s.kp) ? s.kp : [];
    ok(`ruta ${s.id}: tiene al menos un kp`, kps.length > 0);
    for (const k of kps) {
      const t = m08.topics.find((x) => x.id === k.topic);
      const text = t && t.keyPoints[k.index];
      ok(`ruta ${s.id}: kp ${k.topic}[${k.index}] existe y contiene expect`, typeof text === 'string' && text.includes(k.expect), k.expect);
    }
    const ghost = s.topics.filter((t) => !ids.includes(t));
    ok(`ruta ${s.id}: temas existen en M08`, ghost.length === 0, ghost.join(','));
  }

  // ---- M02 actual (city/districts.mjs) bajo las mismas reglas ----
  const D2 = city.districts.M02;
  ok('M02: el distrito existe en city/districts.mjs', !!D2);
  checkRules('M02', m02, D2);
  ok('M02: need (8) <= número de aprendices', D2.need === 8 && D2.need <= D2.apprentices.length, `need=${D2.need} aprendices=${D2.apprentices.length}`);
  ok('M02: bounds -60..60 x -185..-44 (spec §2), <= 140 x 160 m', JSON.stringify(D2.bounds) === JSON.stringify({ minX: -60, maxX: 60, minZ: -185, maxZ: -44 }) && D2.bounds.maxX - D2.bounds.minX <= 140 && D2.bounds.maxZ - D2.bounds.minZ <= 160);
  const pts = [...D2.mentors, ...D2.repairs, ...D2.apprentices, ...D2.creatures.map((c) => c.area), D2.tower];
  const B2 = D2.bounds, outside = pts.filter((p) => p.x < B2.minX || p.x > B2.maxX || p.z < B2.minZ || p.z > B2.maxZ).map((p) => `${p.x},${p.z}`);
  ok('M02: todos los puntos dentro de sus bounds', outside.length === 0, outside.join(' '));

  const fails = results.filter((r) => r[0] === 'FAIL'); results.forEach((r) => console.log(r.join(' ')));
  console.log(fails.length ? 'FALLAS ' + fails.length : 'SPEC DISTRITOS FACTIBLE OK (' + results.length + ')'); process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error('EXC', e); process.exit(2); });
