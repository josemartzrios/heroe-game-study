// Piezas comunes de tanda2_feasibility y tanda3_feasibility: armar un distrito desde la tabla transcrita del spec y comprobarla contra el módulo real.
// `ok(nombre, condición, detalle)` es el de cada prueba; las tablas SPEC y lo que es propio de cada tanda se quedan en su archivo.
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');
const assert = require('assert');
const R = require('./district_rules.cjs');
const MODULES = require('./modules.cjs');
const same = (a, b) => { try { assert.deepStrictEqual(a, b); return true; } catch (e) { return false; } };
const MODE = { explicar: 'explain', corregir: 'correct' };
const ART = /^(el|la|los|las|un|una|unos|unas) /;
const { REF_COLORS, colorDistanceProblems } = require('./district_rules.cjs');
const PURPLES = REF_COLORS.purples;   // los morados de las criaturas de referencia
const AMBER = REF_COLORS.amber;       // el ámbar de ventanas y muros

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

// Toda la factibilidad de una tanda: la tabla SPEC (id → distrito del spec) contra el contenido real, comparada con el archivo real de cada distrito y,
// si opts.cross !== false, con las reglas entre todos los distritos registrados. opts.colorIds (opcional): los distritos nuevos cuya distancia de color
// se mide (los de tandas anteriores no se revisan). `label` nombra la tanda en esa comprobación. Quien llama conserva results, la salida y process.exit.
async function run(SPEC, label, ok, opts = {}) {
  const root = path.join(__dirname, '..'), imp = (f) => import(pathToFileURL(path.join(root, f)).href);
  const { standardFrame, people } = await imp('city/layout.mjs');
  const { checkDistrict, FORBIDDEN } = await imp('city/check_district.mjs');
  const { expandModule } = await imp('content_expand.mjs');
  const { city } = await imp('city/districts.mjs');

  const probe = standardFrame().lay;
  let spots = 0; try { for (;;) { probe.take(); spots++; } } catch (e) { /* fin de lugares */ }

  for (const [id, s] of Object.entries(SPEC)) {
    const { file, title } = MODULES[id];
    const mod = expandModule(id, title, await imp(file));
    shape(ok, id, s, mod);
    ok(`${id}: 6 criaturas`, s.creatures.length === 6, String(s.creatures.length));
    ok(`${id}: 9 reparaciones r01–r09`, s.repairs.length === 9, String(s.repairs.length));
    ok(`${id}: 10 aprendices a01–a10`, s.apprentices.length === 10, String(s.apprentices.length));
    ok(`${id}: need 7`, s.need === 7, String(s.need));
    ok(`${id}: nombre de distrito sin artículo`, !/^(el|la|los|las|un|una|unos|unas) /i.test(s.name), s.name);
    let dist = null;
    const needed = s.topicCount + s.creatures.length + s.repairs.length + s.apprentices.length;
    try { dist = build(id, s, standardFrame, people); } catch (e) { /* sin lugares */ }
    ok(`${id}: take() alcanza para ${needed} lugares sin pads`, !!dist, `lugares=${spots}`);
    if (!dist) continue;

    const errs = checkDistrict(dist, mod);
    ok(`${id}: checkDistrict R1–R7 y R11 sin errores`, errs.length === 0, errs.join(' | '));

    detail(ok, id, dist, mod, FORBIDDEN);

    // archivo real idéntico a la tabla (falla hasta que exista y esté registrado)
    const file2 = `city/districts/${id.toLowerCase()}.mjs`;
    let real = null, why = 'el distrito no está registrado';
    if (!city.districts[id]) why = `el distrito no está registrado (city.districts.${id} no existe${fs.existsSync(path.join(root, file2)) ? '' : `; falta ${file2}`})`;
    else {
      real = city.districts[id];
      let fromFile = null;
      try { fromFile = (await imp(file2)).district; } catch (e) { why = `no se puede importar ${file2}: ${e.message}`; real = null; }
      if (real && !same(fromFile, real)) { why = `${file2} no es el objeto registrado en city/districts.mjs`; real = null; }
      else if (real) why = 'difiere de la tabla del spec (datos, coordenadas u orden de take())';
    }
    ok(`${id}: el archivo real ${file2} es idéntico al armado desde la tabla del spec`, !!real && same(dist, real), real && same(dist, real) ? '' : why);
  }

  if (Array.isArray(opts.colorIds)) {
    const { city } = await imp('city/districts.mjs'), cp = colorDistanceProblems(city.districts, opts.colorIds);
    ok(`${label}: distancia de color de ${opts.colorIds.join(', ')} (ΔE2000 ≥ 10 con referencias y otros distritos, contraste con los fondos, cara visible)`, cp.length === 0, cp.join(' | '));
  }

  if (opts.cross !== false) {
    // ---- entre todos los distritos registrados ----
    const all = city.districts, regIds = Object.keys(all), NEW = Object.keys(SPEC);
    ok(`existen todos los de la tabla (${NEW.join(', ')}) y todos los registrados son objetos`, NEW.every((id) => all[id]) && regIds.every((id) => all[id] && typeof all[id] === 'object'), regIds.join(','));
    ok('city.districts va en el orden de city.order (el registro fija el orden)', regIds.join() === city.order.filter((m) => all[m]).join(), regIds.join() + ' ≠ ' + city.order.filter((m) => all[m]).join());
    const clash = R.nameClashes(all);
    ok('ningún nombre de mentor/aprendiz se repite ni se parece a otro (regla fonética de district_rules)', clash.length === 0, clash.join(' '));
    const own = R.ownColorProblems(all);
    ok('cada distrito tiene al menos un color que no usa ningún otro', own.length === 0, own.join(' | '));
    ok('seed distinto en todos los distritos', R.repeated(all, 'seed').length === 0, R.repeated(all, 'seed').join(','));
    ok('nombre de distrito distinto en todos los distritos', R.repeated(all, 'name').length === 0, R.repeated(all, 'name').join(','));
    const cnames = Object.values(all).flatMap((d) => d.creatures.map((c) => c.name));
    ok('nombre de criatura distinto en todos los distritos', new Set(cnames).size === cnames.length, cnames.filter((n, i) => cnames.indexOf(n) !== i).join(' '));

  }
}

module.exports = { build, shape, detail, run };
