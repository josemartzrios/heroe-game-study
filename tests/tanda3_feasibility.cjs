// Factibilidad de datos del spec 2026-11-18-ciudad-tanda-3-design.md (M04, M06, M07) contra el contenido REAL.
// Transcribe las tablas del spec, arma cada distrito con standardFrame() y people() de city/layout.mjs (igual que city/districts/m10.mjs) y pasa
// city/check_district.mjs (R1–R7 y R11); las reglas entre todos los distritos registrados vienen de district_rules.cjs y el archivo y título de
// cada módulo, de modules.cjs. Solo lee datos; no depende de build.mjs.
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');
const root = path.join(__dirname, '..');
const imp = (f) => import(pathToFileURL(path.join(root, f)).href);
const assert = require('assert');
const R = require('./district_rules.cjs');
const MODULES = require('./modules.cjs');
const same = (a, b) => { try { assert.deepStrictEqual(a, b); return true; } catch (e) { return false; } };
const results = [];
const ok = (name, cond, extra) => { results.push([cond ? 'PASS' : 'FAIL', name, extra || '']); };
const pad = (n) => String(n).padStart(2, '0');
const T = (n) => 'T' + pad(n);
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => T(a + i));
const MODE = { explicar: 'explain', corregir: 'correct' };

// ---- Tablas del spec v2 (transcritas tal cual) ----
const SPEC = {
  M04: {
    name: 'Museo del Código', topicCount: 17,
    colors: { a: '#2ee6c5', b: '#ff5ca8' }, style: 'red', seed: 23, need: 7,
    mentors: 'Amparo, Bernardo, Claudia, Damián, Esperanza, Francisco, Genaro, Hortensia, Iñaki, Jacinta, Leopoldo, Mercedes, Nicanor, Ofelia, Prudencio, Remedios, Saúl',
    creatures: [
      ['goto', 'GO TO Salvaje', ['T02', 'T03']],
      ['paradigma', 'Paradigma Confundido', ['T01', 'T04', 'T05', 'T08', 'T09']],
      ['impura', 'Función Impura', ['T06', 'T07']],
      ['perforada', 'Tarjeta Perforada', ['T10', 'T11', 'T12']],
      ['compilador', 'Compilador Errante', ['T13', 'T14', 'T15']],
      ['bucle', 'Bucle Atascado', ['T16', 'T17']]
    ],
    repairs: [['T01', 'el catálogo de paradigmas'], ['T03', 'el programa espagueti'], ['T05', 'la clase sin encapsular'],
      ['T07', 'la lambda sin retorno'], ['T09', 'el flujo de eventos'], ['T11', 'el ensamblador sin traducir'],
      ['T12', 'la tarjeta de COBOL'], ['T15', 'la máquina virtual parada'], ['T17', 'los hilos bloqueados']],
    apprentices: [['Ada', 'T04', 'explicar'], ['Boris', 'T02', 'corregir'], ['Cata', 'T03', 'corregir'], ['Dulce', 'T06', 'explicar'],
      ['Enzo', 'T08', 'explicar'], ['Flavio', 'T10', 'corregir'], ['Tobías', 'T12', 'corregir'], ['Mila', 'T13', 'explicar'],
      ['Nuria', 'T14', 'corregir'], ['Juan', 'T16', 'explicar']],
    celebrate: 'El Museo del Código vuelve a abrir: cada lenguaje cuenta su historia.'
  },
  M06: {
    name: 'Fábrica de Objetos', topicCount: 14,
    colors: { a: '#ff9ec7', b: '#b5ff8c' }, style: 'red', seed: 29, need: 7,
    mentors: 'Agustín, Begoña, Casimiro, Dolores, Ezequiel, Fortunato, Graciela, Humberto, Isidro, Jazmín, Lucrecia, Mauricio, Nélida, Osvaldo',
    creatures: [
      ['molde', 'Molde Vacío', ['T01', 'T02']],
      ['atributo', 'Atributo Fugado', ['T03', 'T04']],
      ['torcida', 'Herencia Torcida', ['T05', 'T06']],
      ['contrato', 'Contrato Roto', ['T07', 'T14']],
      ['acople', 'Acople Pegajoso', ['T08', 'T09', 'T10']],
      ['flecha', 'Flecha Perdida', ['T11', 'T12', 'T13']]
    ],
    repairs: [['T02', 'la clase que nadie instancia'], ['T03', 'el atributo expuesto'], ['T04', 'el constructor olvidado'],
      ['T05', 'el árbol de herencia'], ['T07', 'el contrato incumplido'], ['T09', 'el equipo desarmado'],
      ['T10', 'el coche sin motor'], ['T13', 'el diagrama sin flechas'], ['T14', 'el método sin polimorfismo']],
    apprentices: [['Ale', 'T01', 'corregir'], ['Bibi', 'T02', 'explicar'], ['Cira', 'T03', 'corregir'], ['Duna', 'T05', 'explicar'],
      ['Pía', 'T06', 'corregir'], ['Fiona', 'T08', 'explicar'], ['Goyo', 'T10', 'corregir'], ['Ulla', 'T11', 'explicar'],
      ['Jael', 'T12', 'explicar'], ['Sol', 'T13', 'corregir']],
    celebrate: 'La Fábrica de Objetos vuelve a producir: cada clase sabe qué hacer.'
  },
  M07: {
    name: 'Cinco Calles', topicCount: 13,
    colors: { a: '#ffd1a1', b: '#e05cff' }, style: 'red', seed: 31, need: 7,
    mentors: 'Amelia, Bautista, Constanza, Domingo, Eugenia, Fulgencio, Guadalupe, Hipólito, Ingrid, Jerónimo, Leonor, Moisés, Nora',
    creatures: [
      ['dios', 'Clase Dios', ['T03', 'T04']],
      ['rigido', 'Código Rígido', ['T05', 'T06']],
      ['impostora', 'Subclase Impostora', ['T07', 'T08']],
      ['gorda', 'Interfaz Gorda', ['T09', 'T10']],
      ['mandon', 'Detalle Mandón', ['T11', 'T12']],
      ['caos', 'Diseño Caótico', ['T01', 'T02', 'T13']]
    ],
    repairs: [['T01', 'el software frágil'], ['T02', 'el acrónimo olvidado'], ['T04', 'la clase que hace de todo'],
      ['T06', 'el switch interminable'], ['T08', 'el pato de juguete'], ['T09', 'la interfaz gigante'],
      ['T10', 'el control con mil botones'], ['T12', 'la base de datos soldada'], ['T13', 'el código que huele mal']],
    apprentices: [['Asier', 'T01', 'explicar'], ['Blas', 'T02', 'corregir'], ['Cande', 'T03', 'explicar'], ['Dámaso', 'T05', 'explicar'],
      ['Elvira', 'T06', 'corregir'], ['Fidel', 'T07', 'explicar'], ['Gisela', 'T08', 'corregir'], ['Hilario', 'T09', 'corregir'],
      ['Ion', 'T11', 'explicar'], ['Rubén', 'T12', 'corregir']],
    celebrate: 'Cinco Calles vuelve a ordenarse: cada principio SOLID tiene su calle.'
  }
};

const PURPLES = ['#7a52c4', '#b06cff', '#5a3a9a', '#9a4fd8', '#8a5fe0', '#6a3fb0'];
const AMBER = '#ffd76a';

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

  const probe = standardFrame().lay;
  let spots = 0; try { for (;;) { probe.take(); spots++; } } catch (e) { /* fin de lugares */ }

  for (const [id, s] of Object.entries(SPEC)) {
    const { file, title } = MODULES[id];
    const mod = expandModule(id, title, await imp(file));
    const ids = mod.topics.map((t) => t.id);
    const want = range(1, s.topicCount);
    ok(`${id}: el módulo real "${title}" tiene ${s.topicCount} temas T01..T${s.topicCount} en orden`, JSON.stringify(ids) === JSON.stringify(want), ids.join(','));
    ok(`${id}: un nombre de mentor por tema (${s.topicCount})`, s.mentors.split(', ').length === s.topicCount, String(s.mentors.split(', ').length));
    ok(`${id}: ids de criatura únicos`, new Set(s.creatures.map((c) => c[0])).size === s.creatures.length);
    ok(`${id}: 6 criaturas`, s.creatures.length === 6, String(s.creatures.length));
    ok(`${id}: 9 reparaciones r01–r09`, s.repairs.length === 9, String(s.repairs.length));
    ok(`${id}: 10 aprendices a01–a10`, s.apprentices.length === 10, String(s.apprentices.length));
    ok(`${id}: need 7`, s.need === 7, String(s.need));
    ok(`${id}: modos de aprendiz válidos (explicar/corregir)`, s.apprentices.every((a) => MODE[a[2]]));
    ok(`${id}: colores en formato #rrggbb`, /^#[0-9a-f]{6}$/.test(s.colors.a) && /^#[0-9a-f]{6}$/.test(s.colors.b), s.colors.a + ' ' + s.colors.b);
    ok(`${id}: style 'red'`, s.style === 'red', s.style);
    ok(`${id}: ningún color es uno de los 6 morados de las criaturas de referencia`, !PURPLES.includes(s.colors.a) && !PURPLES.includes(s.colors.b), s.colors.a + ' ' + s.colors.b);
    ok(`${id}: no usa el ámbar de ventanas y muros (${AMBER})`, s.colors.a !== AMBER && s.colors.b !== AMBER);
    ok(`${id}: nombre de distrito sin artículo`, !/^(el|la|los|las|un|una|unos|unas) /i.test(s.name), s.name);
    const long = s.repairs.filter((r) => r[1].length > 28).map((r) => r[1] + ' (' + r[1].length + ')');
    ok(`${id}: etiquetas de reparación de 28 caracteres como máximo`, long.length === 0, long.join(' | '));
    const noArt = s.repairs.filter((r) => !/^(el|la|los|las|un|una|unos|unas) /.test(r[1])).map((r) => r[1]);
    ok(`${id}: etiquetas de reparación empiezan con artículo`, noArt.length === 0, noArt.join(' | '));

    let dist = null;
    const needed = s.topicCount + s.creatures.length + s.repairs.length + s.apprentices.length;
    try { dist = build(id, s, standardFrame, people); } catch (e) { /* sin lugares */ }
    ok(`${id}: take() alcanza para ${needed} lugares sin pads`, !!dist, `lugares=${spots}`);
    if (!dist) continue;

    const errs = checkDistrict(dist, mod);
    ok(`${id}: checkDistrict R1–R7 y R11 sin errores`, errs.length === 0, errs.join(' | '));

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

    // palabras prohibidas en todo el texto del distrito (nombres, etiquetas, celebración)
    const texts = [dist.name, dist.celebrate.text, ...dist.mentors.map((m) => m.name), ...dist.creatures.map((c) => c.name),
      ...dist.repairs.map((r) => r.label), ...dist.apprentices.map((a) => a.name)];
    const hits = texts.filter((t) => FORBIDDEN.some((re) => re.test(t)));
    ok(`${id}: sin palabras prohibidas (FORBIDDEN)`, hits.length === 0, hits.join(' | '));

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

  const fails = results.filter((r) => r[0] === 'FAIL'); results.forEach((r) => console.log(r.join(' ')));
  console.log(fails.length ? 'FALLAS ' + fails.length : 'TANDA 3 FACTIBLE OK (' + results.length + ')'); process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error('EXC', e); process.exit(2); });
