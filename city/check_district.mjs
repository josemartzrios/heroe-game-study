// Reglas genéricas de un distrito de Ciudad Núcleo (spec 2026-11-12-ciudad-distritos-design.md §4.3). Solo build y pruebas.
// checkDistrict(dist, mod, opts) → arreglo de errores; cada uno empieza con "R<n>:" (número de regla). No nombra ningún distrito concreto.
//   dist: un distrito (formato §4.2). mod: el módulo expandido { topics: [{ id, keyPoints }], questions: [{ type, topic }] }.
//   opts.forbidden: lista de RegExp de palabras prohibidas (por defecto FORBIDDEN).
import fs from 'node:fs';
import vm from 'node:vm';

// Palabras prohibidas (IP ajena): validate.mjs las aplica a todo el archivo y aquí a nombres y etiquetas.
export const FORBIDDEN = [/Marvel/i, /DC Comics/i, /LEGO/i, /Spider/i, /Batman/i, /Superman/i, /Cyclops/i, /Wolverine/i, /Hulk/i, /Iron Man/i, /\bThor\b/, /Wonder Woman/i, /\bFlash\b/, /Avengers/i, /X-Men/i];

const CM = vm.runInNewContext(fs.readFileSync(new URL('./move.js', import.meta.url), 'utf8') + '\n;CityMove');
const FORBID_ID = new Set(['__proto__', 'constructor', 'prototype', ...Object.getOwnPropertyNames(Object.prototype)]);
const idOk = (id) => typeof id === 'string' && /^[a-z0-9_-]+$/.test(id) && !FORBID_ID.has(id);
const aabb = (o) => ({ minX: o.x - o.w / 2, maxX: o.x + o.w / 2, minZ: o.z - o.d / 2, maxZ: o.z + o.d / 2 });

/* Un distrito mal formado (falta un campo, un tipo raro) devuelve un error R0 legible en vez de lanzar una excepción a mitad de la build */
export function checkDistrict(dist, mod, opts = {}) {
  try { return checkDistrictRules(dist, mod, opts); }
  catch (e) { return [`R0: ${dist && typeof dist === 'object' && typeof dist.id === 'string' ? dist.id : '?'}: datos mal formados (${String(e && e.message).slice(0, 120)})`]; }
}
function checkDistrictRules(dist, mod, opts) {
  const errs = [], forbidden = opts.forbidden || FORBIDDEN;
  const bad = (rule, msg) => errs.push(`R${rule}: ${dist.id}: ${msg}`);
  const topics = mod.topics.map((t) => t.id), byTopic = Object.fromEntries(mod.topics.map((t) => [t.id, t]));
  const count = (types, tid) => mod.questions.filter((q) => types.includes(q.type) && q.topic === tid).length;
  const dupes = (arr) => arr.filter((x, i) => arr.indexOf(x) !== i);

  // R11 colores del distrito (los usan el mapa, el portal y las criaturas): #rrggbb
  const hex = (c) => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c);
  if (!dist.colors || !hex(dist.colors.a) || !hex(dist.colors.b)) bad(11, 'colors.a y colors.b deben ser colores #rrggbb');

  // R1 mentores: uno por tema, ninguno con tema inexistente, nombres únicos
  for (const t of topics) { const n = dist.mentors.filter((m) => m.topic === t).length; if (n !== 1) bad(1, `el tema ${t} debe tener exactamente un mentor (tiene ${n})`); }
  for (const m of dist.mentors) if (!topics.includes(m.topic)) bad(1, `${m.id}: tema inexistente ${m.topic}`);
  if (dupes(dist.mentors.map((m) => m.name)).length) bad(1, 'nombres de mentor repetidos');

  // R2 criaturas: de 2 a 5 temas, los temas del módulo cubiertos una sola vez, >= 8 preguntas mcq+tf
  const seen = Object.create(null);   // sin prototipo: un id "__proto__" cuenta como cualquier otro
  for (const c of dist.creatures) {
    if (c.topics.length < 2 || c.topics.length > 5) bad(2, `criatura ${c.id}: debe tener de 2 a 5 temas (tiene ${c.topics.length})`);
    for (const t of c.topics) { seen[t] = (seen[t] || 0) + 1; if (!topics.includes(t)) bad(2, `criatura ${c.id}: tema inexistente ${t}`); }
    const n = c.topics.reduce((a, t) => a + count(['mcq', 'tf'], t), 0);
    if (n < 8) bad(2, `criatura ${c.id}: solo ${n} preguntas mcq+tf (mínimo 8)`);
  }
  for (const t of topics) if (seen[t] !== 1) bad(2, `el tema ${t} debe estar en exactamente una criatura (está en ${seen[t] || 0})`);

  // R3 reparaciones: temas distintos y >= 2 preguntas scenario+error
  if (dupes(dist.repairs.map((r) => r.topic)).length) bad(3, 'reparaciones con temas repetidos');
  for (const r of dist.repairs) if (count(['scenario', 'error'], r.topic) < 2) bad(3, `${r.id}: el tema ${r.topic} necesita >= 2 preguntas scenario+error`);

  // R4 aprendices: temas distintos y existentes, modo válido, 'correct' solo con preguntas error, nombres únicos y propios, need <= aprendices
  if (dupes(dist.apprentices.map((a) => a.topic)).length) bad(4, 'aprendices con temas repetidos');
  if (dupes(dist.apprentices.map((a) => a.name)).length) bad(4, 'nombres de aprendiz repetidos');
  const mentorNames = new Set(dist.mentors.map((m) => m.name));
  for (const a of dist.apprentices) {
    if (!topics.includes(a.topic)) bad(4, `${a.id}: tema inexistente ${a.topic}`);
    if (a.mode !== 'explain' && a.mode !== 'correct') bad(4, `${a.id}: modo inválido`);
    if (a.mode === 'correct' && count(['error'], a.topic) < 1) bad(4, `${a.id}: 'correct' necesita >= 1 pregunta error en ${a.topic}`);
    if (mentorNames.has(a.name)) bad(4, `${a.id}: el nombre ${a.name} choca con un mentor`);
  }
  if (!Number.isInteger(dist.need) || dist.need < 1 || dist.need > dist.apprentices.length) bad(4, `need (${dist.need}) debe ser un entero de 1 a ${dist.apprentices.length} (aprendices)`);

  // R5 ids seguros y únicos dentro del distrito
  const all = [...dist.mentors, ...dist.creatures, ...dist.repairs, ...dist.apprentices, dist.tower];
  for (const o of all) if (!idOk(o.id)) bad(5, `id inseguro ${String(o.id)}`);
  const dup = dupes(all.map((o) => o.id));
  if (dup.length) bad(5, 'ids repetidos: ' + dup.join(', '));

  // R6 palabras prohibidas en nombres y etiquetas
  const names = [dist.name, ...dist.mentors.map((x) => x.name), ...dist.creatures.map((x) => x.name), ...dist.apprentices.map((x) => x.name), ...dist.repairs.map((x) => x.label)];
  for (const n of names) for (const re of forbidden) if (re.test(n)) bad(6, `palabra prohibida ${re} en "${n}"`);

  // R7 tamaño, límites, separación >= 4 m y >= 0.6 m de toda caja sólida
  const B = dist.bounds, bw = B.maxX - B.minX, bd = B.maxZ - B.minZ;
  if (bw > 140 || bd > 160) bad(7, `bounds de ${bw}×${bd} m superan el tope de 140×160 m`);
  if (!Array.isArray(dist.blocks) || !Number.isFinite(dist.seed)) { bad(7, 'faltan blocks o seed para calcular los edificios'); return errs; }
  const pads = dist.route ? dist.route.pads : [];
  const door = CM.door(dist.tower);
  const spread = [
    ...dist.mentors, ...dist.repairs, ...dist.apprentices, ...dist.creatures.map((c) => ({ id: c.id, x: c.area.x, z: c.area.z })),
    { id: 'torre', x: dist.tower.x, z: dist.tower.z }, { id: 'entrada', x: dist.entry.x, z: dist.entry.z }, { id: 'salida', x: dist.exit.x, z: dist.exit.z },
    ...pads.map((p, i) => ({ id: 'pad' + (i + 1), x: p.x, z: p.z }))
  ];
  const free = spread.filter((p) => p.id !== 'torre').concat([{ id: 'puerta de la torre', x: door.x, z: door.z }]);
  const boxes = CM.layoutBuildings(dist).map(aabb).concat([aabb(dist.tower)]);
  for (const p of spread.concat([{ id: 'puerta de la torre', x: door.x, z: door.z }])) {
    if (!(p.x >= B.minX && p.x <= B.maxX && p.z >= B.minZ && p.z <= B.maxZ)) bad(7, `${p.id}: fuera de los bounds`);
  }
  for (let i = 0; i < spread.length; i++) for (let j = i + 1; j < spread.length; j++) {
    if (Math.hypot(spread[i].x - spread[j].x, spread[i].z - spread[j].z) < 4) bad(7, `${spread[i].id} y ${spread[j].id} están a menos de 4 m`);
  }
  for (const p of free) for (const b of boxes) {
    const cx = Math.max(b.minX, Math.min(p.x, b.maxX)), cz = Math.max(b.minZ, Math.min(p.z, b.maxZ));
    if (Math.hypot(p.x - cx, p.z - cz) < 0.6) { bad(7, `${p.id}: dentro o junto a una caja de colisión`); break; }
  }

  // R8 ruta del paquete (si el distrito la tiene)
  if (dist.route) {
    const st = dist.route.stations, union = new Set();
    for (const s of st) {
      for (const t of s.topics) { if (!byTopic[t]) bad(8, `estación ${s.id}: tema ${t} no existe`); union.add(t); }
      if (s.ask !== 1 && s.ask !== 2) bad(8, `estación ${s.id}: ask debe ser 1 o 2`);
      if (!Array.isArray(s.kp) || s.kp.length !== 1) { bad(8, `estación ${s.id}: kp debe tener 1 elemento`); continue; }
      const k = s.kp[0], t = byTopic[k.topic];
      if (!t || !Number.isInteger(k.index) || k.index < 0 || k.index >= t.keyPoints.length || typeof k.expect !== 'string' || !t.keyPoints[k.index].includes(k.expect)) bad(8, `estación ${s.id}: kp desalineado`);
      if (typeof k.expect !== 'string' || k.expect.length < 15 || k.expect.length > 40) bad(8, `estación ${s.id}: expect debe medir de 15 a 40 caracteres`);
      if (!s.topics.includes(k.topic)) bad(8, `estación ${s.id}: kp.topic no está en topics`);
    }
    for (const t of topics) if (!union.has(t)) bad(8, `las estaciones no cubren el tema ${t}`);
    if (pads.length !== st.length) bad(8, `hay ${pads.length} pads para ${st.length} estaciones`);
  }
  return errs;
}

// Reglas de la plaza y de la ciudad (spec §4.3 reglas 9 y 10): portales, rangos y puntos libres de la plaza.
// D = CITY_DATA (o el objeto `city` de districts.mjs). Devuelve errores "R<n>: plaza: …". opts.forbidden como en checkDistrict.
export function checkPlaza(D, opts = {}) {
  const errs = [], forbidden = opts.forbidden || FORBIDDEN, P = D.plaza, B = P.bounds;
  const bad = (rule, msg) => errs.push(`R${rule}: plaza: ${msg}`);
  const inB = (o) => o.x >= B.minX && o.x <= B.maxX && o.z >= B.minZ && o.z <= B.maxZ;
  const boxes = CM.boxesFor(D, 'plaza');
  const near = (p) => boxes.some((b) => { const cx = Math.max(b.minX, Math.min(p.x, b.maxX)), cz = Math.max(b.minZ, Math.min(p.z, b.maxZ)); return Math.hypot(p.x - cx, p.z - cz) < 0.6; });

  // R9 portales: uno por distrito de ORDER (sin repetir y sin portales de más), todos los distritos existentes en ORDER, back libre
  const seen = Object.create(null);   // sin prototipo: un id "__proto__" cuenta como cualquier otro
  for (const p of P.portals) seen[p.dist] = (seen[p.dist] || 0) + 1;
  for (const k of Object.keys(seen)) { if (seen[k] > 1) bad(9, `portal repetido: ${k}`); if (!D.order.includes(k)) bad(9, `portal de ${k}, que no está en ORDER`); }
  for (const k of D.order) if (!seen[k]) bad(9, `el distrito ${k} de ORDER no tiene portal`);
  for (const k of Object.keys(D.districts)) if (!D.order.includes(k)) bad(9, `el distrito ${k} existe pero no está en ORDER`);
  for (const p of P.portals) {
    if (!inB(p.back)) bad(9, `back del portal ${p.dist}: fuera de los bounds`);
    else if (near(p.back) || CM.portalAt(D, 'plaza', p.back.x, p.back.z) !== null || P.portals.some((q) => Math.abs(p.back.x - q.x) <= q.w / 2 && Math.abs(p.back.z - q.z) <= q.d / 2)) bad(9, `back del portal ${p.dist}: dentro de una caja sólida o de la boca de un portal`);
  }

  // puntos de la plaza libres (directora, espejo, entrada) y nombre sin palabras prohibidas
  for (const q of [P.director, P.mirror, { id: 'entry', x: P.entry.x, z: P.entry.z }]) {
    if (!inB(q)) bad(7, `${q.id}: fuera de los bounds`);
    else if (near(q)) bad(7, `${q.id}: dentro o junto a una caja de colisión`);
  }
  for (const re of forbidden) if (re.test(P.director.name)) bad(6, `palabra prohibida ${re} en "${P.director.name}"`);

  // R10 tabla de rangos
  const want = [[0, 'Becario'], [1, 'Junior'], [3, 'Semi-senior'], [6, 'Senior'], [8, 'Arquitecto'], [11, 'Tech Lead']];
  if (JSON.stringify(D.ranks) !== JSON.stringify(want)) bad(10, 'la tabla de rangos no coincide con el spec');
  return errs;
}
