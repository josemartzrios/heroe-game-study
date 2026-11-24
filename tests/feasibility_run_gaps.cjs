// Pruebas de feasibility_lib.run (la pieza común que concentra la factibilidad de una tanda). tanda3_feasibility y tanda4_feasibility solo prueban que los datos
// REALES pasan; nadie comprueba que run() SABE fallar. Esta prueba le pasa tablas alteradas y exige que detecte cada cambio:
//  1. línea base: la tabla armada desde los datos reales de M05 y M09 pasa entera (y da las mismas comprobaciones que tanda4_feasibility);
//  2. cada campo de la tabla (nombre, colores, estilo, semilla, need, mentores, criaturas, reparaciones, aprendices, celebración) alterado, de uno en uno,
//     hace fallar "el archivo real ... es idéntico" y deja el resto de comprobaciones de otro distrito intacto;
//  3. opciones: sin colorIds no se mide el color; con colorIds se mide una sola vez y con la etiqueta; un id sin registrar falla; cross:false quita las reglas
//     entre distritos y por defecto se ejecutan;
//  4. tanda4_feasibility.cjs como proceso: mide el color de TODOS los distritos de su tabla (colorIds no puede quedarse corto) y pasa; tanda3_feasibility.cjs
//     ejecuta las reglas entre distritos sobre los 10 registrados.
const path = require('path');
const { pathToFileURL } = require('url');
const { spawnSync } = require('child_process');
const F = require('./feasibility_lib.cjs');
const root = path.join(__dirname, '..');
const results = [];
const ok = (name, cond, extra) => results.push([cond ? 'PASS' : 'FAIL', name, cond ? '' : (extra || '')]);
const MODE_NAME = { explain: 'explicar', correct: 'corregir' };
const clone = (o) => JSON.parse(JSON.stringify(o));

// La tabla del spec (formato de tanda4_feasibility) leída de un distrito real.
const tableOf = (d) => ({
  name: d.name, topicCount: d.mentors.length, colors: { ...d.colors }, style: d.style, seed: d.seed, need: d.need,
  mentors: d.mentors.map((m) => m.name).join(', '),
  creatures: d.creatures.map((c) => [c.id, c.name, [...c.topics]]),
  repairs: d.repairs.map((r) => [r.topic, r.label]),
  apprentices: d.apprentices.map((a) => [a.name, a.topic, MODE_NAME[a.mode]]),
  celebrate: d.celebrate.text
});
async function runSpec(spec, opts) {
  const out = [];
  try { await F.run(spec, 'PRUEBA', (name, cond, extra) => out.push({ name, cond: !!cond, extra: extra || '' }), opts); }
  catch (e) { out.push({ name: 'run lanzó', cond: false, extra: String(e && e.message).slice(0, 200) }); }
  return out;
}
const fails = (r) => r.filter((x) => !x.cond);
const IDENT = /el archivo real city\/districts\/m0\d\.mjs es idéntico/;

(async () => {
  const { city } = await import(pathToFileURL(path.join(root, 'city', 'districts.mjs')).href);
  const real = { M05: tableOf(city.districts.M05), M09: tableOf(city.districts.M09) };

  // =================== 1. línea base ===================
  const base = await runSpec(clone(real), { colorIds: ['M05', 'M09'], cross: false });
  ok('línea base: la tabla armada desde los datos reales de M05 y M09 pasa todas las comprobaciones de run()', base.length > 0 && fails(base).length === 0, base.length + ' comprobaciones; fallan: ' + fails(base).slice(0, 3).map((x) => x.name + ' ' + x.extra).join(' | '));
  const child4 = spawnSync(process.execPath, [path.join(__dirname, 'tanda4_feasibility.cjs')], { cwd: root, encoding: 'utf8' });
  const lines4 = (child4.stdout || '').split('\n').filter((l) => /^(PASS|FAIL) /.test(l));
  ok('tanda4_feasibility.cjs sale con código 0 y da las mismas comprobaciones que run() con la tabla leída de los datos (la tabla del spec y los datos coinciden)', child4.status === 0 && lines4.length === base.length, 'código ' + child4.status + ' · ' + lines4.length + ' vs ' + base.length);

  // =================== 2. cada campo alterado se detecta ===================
  const field = (label, mut, id = 'M05') => ({ label, id, mut });
  const swap = (a, i, j) => { const t = a[i]; a[i] = a[j]; a[j] = t; };
  const MUTS = [
    field('nombre del distrito', (s) => { s.name += ' II'; }),
    field('color a', (s) => { s.colors.a = '#ff4801'; }),
    field('color b', (s) => { s.colors.b = '#fff701'; }),
    field('colores intercambiados', (s) => { [s.colors.a, s.colors.b] = [s.colors.b, s.colors.a]; }),
    field('style', (s) => { s.style = 'taller'; }),
    field('seed', (s) => { s.seed += 1; }),
    field('need (7 → 6)', (s) => { s.need = 6; }),
    field('need (7 → 8)', (s) => { s.need = 8; }),
    field('nombre de un mentor', (s) => { const n = s.mentors.split(', '); n[3] = 'Delfino'; s.mentors = n.join(', '); }),
    field('dos mentores intercambiados', (s) => { const n = s.mentors.split(', '); swap(n, 0, 1); s.mentors = n.join(', '); }),
    field('id de una criatura', (s) => { s.creatures[2][0] = 'envoltorio2'; }),
    field('nombre de una criatura', (s) => { s.creatures[1][1] += 'x'; }),
    field('temas de una criatura', (s) => { s.creatures[0][2] = ['T01', 'T21']; }),
    field('orden de las criaturas', (s) => { swap(s.creatures, 0, 1); }),
    field('etiqueta de una reparación', (s) => { s.repairs[4][1] = 'el café sin decorar!'; }),
    field('tema de una reparación', (s) => { s.repairs[8][0] = 'T19'; }),
    field('orden de las reparaciones', (s) => { swap(s.repairs, 0, 8); }),
    field('modo de un aprendiz', (s) => { s.apprentices[0][2] = 'corregir'; }),
    field('tema de un aprendiz', (s) => { s.apprentices[9][1] = 'T20'; }),
    field('nombre de un aprendiz', (s) => { s.apprentices[4][0] = 'Nerea2'; }),
    field('orden de los aprendices (cambia sus coordenadas)', (s) => { swap(s.apprentices, 0, 9); }),
    field('texto de la celebración', (s) => { s.celebrate += ' '; }),
    field('nombre de un mentor (M09)', (s) => { const n = s.mentors.split(', '); n[18] = 'Wenceslas'; s.mentors = n.join(', '); }, 'M09'),
    field('orden de las reparaciones (M09)', (s) => { swap(s.repairs, 1, 2); }, 'M09'),
    field('orden de los aprendices (M09)', (s) => { swap(s.apprentices, 4, 5); }, 'M09')
  ];
  for (const { label, id, mut } of MUTS) {
    const spec = clone(real); mut(spec[id]);
    const r = await runSpec(spec, { colorIds: ['M05', 'M09'], cross: false });
    const idFail = fails(r).filter((x) => IDENT.test(x.name) && x.name.startsWith(id + ':'));
    const otherFail = fails(r).filter((x) => !x.name.startsWith(id + ':') && !/PRUEBA/.test(x.name));
    ok(`${id}: ${label} alterado en la tabla → run() falla en "el archivo real es idéntico"`, idFail.length === 1, fails(r).length ? 'falla otra cosa: ' + fails(r).slice(0, 2).map((x) => x.name).join(' | ') : 'run() NO detectó el cambio');
    ok(`${id}: ${label} alterado → no se contagia a las comprobaciones del otro distrito`, otherFail.length === 0, otherFail.slice(0, 2).map((x) => x.name).join(' | '));
  }
  { const spec = clone(real); spec.M05.topicCount = 21;
    const r = await runSpec(spec, { colorIds: [], cross: false });
    ok('M05: topicCount 21 (en vez de 22) falla en la comprobación de temas del módulo y en la de lugares', fails(r).some((x) => /M05: el módulo real .* tiene 21 temas/.test(x.name)), fails(r).map((x) => x.name).join(' | ')); }
  { const spec = clone(real); spec.M05.creatures.push(['extra', 'Criatura Extra', ['T01']]);
    const r = await runSpec(spec, { colorIds: [], cross: false });
    ok('M05: una séptima criatura en la tabla falla en "6 criaturas"', fails(r).some((x) => /M05: 6 criaturas/.test(x.name)), fails(r).map((x) => x.name).join(' | ')); }
  { const spec = clone(real); spec.M09.apprentices.pop();
    const r = await runSpec(spec, { colorIds: [], cross: false });
    ok('M09: un aprendiz menos en la tabla falla en "10 aprendices a01–a10"', fails(r).some((x) => /M09: 10 aprendices/.test(x.name)), fails(r).map((x) => x.name).join(' | ')); }

  // =================== 3. opciones ===================
  const color = (r) => r.filter((x) => /distancia de color/.test(x.name));
  const none = await runSpec(clone(real), { cross: false });
  ok('sin colorIds no se mide la distancia de color (los distritos de tandas anteriores no se revisan)', color(none).length === 0, color(none).map((x) => x.name).join(' | '));
  const one = await runSpec(clone(real), { colorIds: ['M05'], cross: false });
  ok('con colorIds ["M05"] hay una sola comprobación de color, con la etiqueta de la tanda y el id, y pasa', color(one).length === 1 && color(one)[0].cond && /^PRUEBA: distancia de color de M05 /.test(color(one)[0].name), color(one).map((x) => x.name).join(' | '));
  const many = await runSpec(clone(real), { colorIds: ['M05', 'M09'], cross: false });
  ok('con colorIds ["M05", "M09"] sigue siendo una sola comprobación y nombra los dos ids', color(many).length === 1 && /M05, M09/.test(color(many)[0].name), color(many).map((x) => x.name).join(' | '));
  const m99 = await runSpec(clone(real), { colorIds: ['M99'], cross: false });
  ok('colorIds con un id sin registrar falla y dice "no registrado" (no pasa en silencio)', color(m99).length === 1 && !color(m99)[0].cond && /M99: no registrado/.test(color(m99)[0].extra), JSON.stringify(color(m99)));
  const m07 = await runSpec(clone(real), { colorIds: ['M07'], cross: false });
  ok('colorIds ["M07"] falla (M07 está a ΔE 6,4 de M01): la comprobación mide los datos reales y sabe fallar', color(m07).length === 1 && !color(m07)[0].cond && /M07/.test(color(m07)[0].extra), JSON.stringify(color(m07)));
  const CROSS = /^(existen todos los de la tabla|city\.districts va en el orden de city\.order|ningún nombre de mentor\/aprendiz se repite|cada distrito tiene al menos un color que no usa ningún otro|seed distinto en todos|nombre de distrito distinto en todos|nombre de criatura distinto en todos)/;
  const noCross = await runSpec(clone(real), { cross: false }), withCross = await runSpec(clone(real), {}), crossOnly = withCross.filter((x) => CROSS.test(x.name));
  ok('cross:false no ejecuta ninguna regla entre distritos', noCross.filter((x) => CROSS.test(x.name)).length === 0, noCross.filter((x) => CROSS.test(x.name)).map((x) => x.name).join(' | '));
  ok('por defecto (sin opts.cross) se ejecutan las 7 reglas entre distritos sobre city.districts completo y pasan', crossOnly.length === 7 && crossOnly.every((x) => x.cond) && withCross.length === noCross.length + 7, crossOnly.length + ' reglas; ' + fails(withCross).map((x) => x.name).join(' | '));
  const crossTrue = await runSpec(clone(real), { cross: true });
  ok('cross:true equivale al valor por defecto', crossTrue.length === withCross.length, crossTrue.length + ' vs ' + withCross.length);
  { const spec = clone(real); delete spec.M09;
    const r = await runSpec(spec, { cross: true });
    ok('con una tabla de un solo distrito las reglas entre distritos siguen midiendo los 10 registrados (no solo los de la tabla)', r.filter((x) => CROSS.test(x.name)).length === 7 && fails(r).length === 0 && r.some((x) => /existen todos los de la tabla \(M05\)/.test(x.name)), fails(r).map((x) => x.name).join(' | ')); }

  // =================== 4. los archivos reales de cada tanda, como proceso ===================
  const out4 = child4.stdout || '';
  ok('tanda4_feasibility mide el color de todos los distritos de su tabla: la línea de distancia de color nombra M05 y M09 y pasa', /^PASS TANDA 4: distancia de color de M05, M09 /m.test(out4) && /M05: 6 criaturas/.test(out4) && /M09: 6 criaturas/.test(out4), out4.split('\n').filter((l) => /distancia/.test(l)).join(' | '));
  ok('tanda4_feasibility no repite las reglas entre distritos (cross: false) y termina con "TANDA 4 FACTIBLE OK"', !CROSS.test(out4.split('\n').map((l) => l.replace(/^(PASS|FAIL) /, '')).filter((l) => CROSS.test(l)).join('\n')) && /TANDA 4 FACTIBLE OK/.test(out4), out4.split('\n').slice(-3).join(' | '));
  const child3 = spawnSync(process.execPath, [path.join(__dirname, 'tanda3_feasibility.cjs')], { cwd: root, encoding: 'utf8' }), out3 = child3.stdout || '';
  ok('tanda3_feasibility ejecuta las 7 reglas entre distritos (nombres, colores propios, semillas, nombres de distrito y de criatura) sobre los 10 registrados y pasa', child3.status === 0 && out3.split('\n').filter((l) => CROSS.test(l.replace(/^(PASS|FAIL) /, ''))).length === 7 && /TANDA 3 FACTIBLE OK/.test(out3), 'código ' + child3.status + ' ' + out3.split('\n').slice(-3).join(' | '));
  ok('tanda3_feasibility no mide la distancia de color (la regla solo es para los distritos de la Tanda 4 y futuros)', !/distancia de color/.test(out3), '');

  // =================== 5. una tabla mal formada falla con un mensaje claro: ni pasa en silencio ni lanza ===================
  { const withM05 = (mut) => { const s2 = clone(real); mut(s2); return runSpec(s2, { colorIds: ['M05', 'M09'], cross: false }); };
    for (const modo of ['constructor', '__proto__', 'toString', 'hasOwnProperty', 'valueOf']) {
      const r = await withM05((s2) => { s2.M05.apprentices[0][2] = modo; });
      ok(`el modo de aprendiz "${modo}" no es válido (no se mira el prototipo)`, fails(r).some((x) => /M05: modos de aprendiz válidos/.test(x.name)), fails(r).map((x) => x.name).join(' | '));
    }
    const empty = await runSpec({}, { cross: false });
    ok('una tabla vacía falla ("la tabla de la tanda no está vacía"), no sale "OK (0)"', fails(empty).some((x) => /la tabla de la tanda no está vacía/.test(x.name)), JSON.stringify(empty));
    for (const id of ['M11', '__proto__', 'constructor']) {
      const spec = {}; Object.defineProperty(spec, id, { value: clone(real.M05), enumerable: true });
      const r = await runSpec(spec, { cross: false });
      ok(`un id que no es un módulo del juego (${id}) falla con un mensaje y no lanza`, fails(r).some((x) => new RegExp(id.replace(/_/g, '.') + ': es un módulo del juego').test(x.name)) && !r.some((x) => x.name === 'run lanzó'), r.map((x) => x.name + (x.cond ? '' : ' [FALLA]')).join(' | '));
    }
    for (const colorIds of ['M05', [], [7], null]) {
      const r = await runSpec(clone(real), { colorIds, cross: false });
      ok(`colorIds ${JSON.stringify(colorIds)} no vale: falla "colorIds es una lista no vacía de ids" (no pasa en vacío)`, fails(r).some((x) => /colorIds es una lista no vacía de ids/.test(x.name)), JSON.stringify(colorIds));
    }
    for (const topicCount of [2e6, -1, 1.5, NaN, '22']) {
      const t0 = Date.now(), r = await withM05((s2) => { s2.M05.topicCount = topicCount; });
      ok(`topicCount ${String(topicCount)} falla ("topicCount entero entre 1 y 99") sin construir una lista enorme`, fails(r).some((x) => /M05: topicCount entero entre 1 y 99/.test(x.name)) && Date.now() - t0 < 2000, (Date.now() - t0) + ' ms');
    }
    for (const [campo, mut] of [['criatura', (s2) => s2.M05.creatures[0].push('sobra')], ['reparación', (s2) => s2.M05.repairs[0].push('sobra')], ['aprendiz', (s2) => s2.M05.apprentices[0].push('sobra')]]) {
      const r = await withM05(mut);
      ok(`una tupla de ${campo} con un campo de más falla en la forma de las tuplas (build lo ignoraría)`, fails(r).some((x) => /M05: forma de las tuplas/.test(x.name)), fails(r).map((x) => x.name).join(' | '));
    } }

  const failed = results.filter((r) => r[0] === 'FAIL');
  results.forEach((r) => console.log(r.join(' | ')));
  console.log(failed.length ? 'FEASIBILITY_RUN_GAPS FALLAS ' + failed.length : 'FEASIBILITY_RUN_GAPS OK (' + results.length + ' comprobaciones)');
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error('EXC', e); process.exit(2); });
