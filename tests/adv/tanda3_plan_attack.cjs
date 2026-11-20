// Ataque a las decisiones de la Tanda 3 con el código real (docs/superpowers/plans/2026-11-18-ciudad-tanda-3.md).
//  A  standardFrame() REAL (city/layout.mjs) y los distritos M03/M01/M10 que lo usan: marco idéntico al de la tabla, sin objetos compartidos
//     entre llamadas ni entre distritos, takes intercalados sin robarse lugares y sin que una mutación se filtre a otro marco.
//  B  regla de nombres (district_rules.cjs) con las personas de los distritos reales: choques, falsos positivos, nombres cortos, NFC/NFD y texto hostil.
//  C  cityRankLine real extraída de city/view.js con story.js real y 8 distritos: oráculo con los textos literales del plan.
// Uso: node tests/adv/tanda3_plan_attack.cjs [RUNS=1000] [FUZZ_N=100000 por objetivo] [SEED=20261118] [MAX_S=60 por objetivo]   (código 1 si algo rompe)
const fc = require('fast-check');
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const { pathToFileURL } = require('url');
const CS = require('../../city/story.js');

const RUNS = +(process.argv[2] || 1000), FUZZ_N = +(process.argv[3] || 100000), SEED = +(process.argv[4] || 20261118), MAX_MS = 1000 * +(process.argv[5] || 60);
const root = path.join(__dirname, '..', '..');
const results = [];
let attacks = 0, props = 0, fuzzTotal = 0;
const ok = (name, cond, extra) => results.push([cond ? 'PASS' : 'FAIL', name, cond ? '' : (extra || '')]);
const safeStr = (x) => { try { const s = JSON.stringify(x); return (s === undefined ? String(x) : s).slice(0, 400); } catch (e) { return String(x); } };
async function attack(name, fn) { attacks++; try { const r = await fn(); ok('A: ' + name, r === undefined || r === true, typeof r === 'string' ? r : ''); } catch (e) { ok('A: ' + name, false, 'lanza: ' + String(e && e.message).slice(0, 300)); } }
function prop(name, arb, pred) {
  props++;
  const r = fc.check(fc.property(arb, pred), { numRuns: RUNS, seed: SEED, endOnFailure: false });
  ok('P: ' + name + ' (' + RUNS + ' ejecuciones, semilla ' + SEED + ')', !r.failed,
    r.failed ? 'contraejemplo=' + safeStr(r.counterexample) + ' error=' + String(r.errorInstance && r.errorInstance.message || r.error).slice(0, 300) : '');
}
function mulberry(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const pick = (r, a) => a[Math.floor(r() * a.length)];
function campaign(name, gen, run) {
  const r = mulberry(SEED ^ (name.length * 2654435761)), t0 = Date.now(), sig = {};
  let n = 0;
  for (; n < FUZZ_N && Date.now() - t0 < MAX_MS; n++) {
    const input = gen(r), a = Date.now(); let err = null;
    try { err = run(input); } catch (e) { err = 'lanza ' + String(e && e.message).replace(/\d+/g, '#'); }
    if (!err && Date.now() - a > 250) err = 'lento (> 250 ms)';
    if (err) { const k = String(err).slice(0, 160), s = safeStr(input); if (!sig[k]) sig[k] = { n: 0, min: s }; sig[k].n++; if (s.length < sig[k].min.length) sig[k].min = s; }
  }
  fuzzTotal += n;
  const keys = Object.keys(sig);
  ok('F: ' + name + ' (' + n + ' entradas, ' + (Date.now() - t0) + ' ms, semilla ' + SEED + ')', keys.length === 0, keys.map((k) => k + ' ×' + sig[k].n + ' mínima=' + sig[k].min).join(' | '));
}

const imp = (p) => import(pathToFileURL(p).href);
// todos los objetos alcanzables (para buscar referencias compartidas)
function objectsOf(o, acc = new Set()) { if (o && typeof o === 'object' && !acc.has(o)) { acc.add(o); for (const v of Object.values(o)) objectsOf(v, acc); } return acc; }
const sharedBetween = (a, b) => { const A = objectsOf(a); return [...objectsOf(b)].filter((x) => A.has(x)); };

const RULES = require('../district_rules.cjs');

// =================== C. cityRankLine real ===================
const VIEW_SRC = fs.readFileSync(path.join(root, 'city/view.js'), 'utf8');
const RL_SRC = (VIEW_SRC.match(/\nfunction cityRankLine\(mids\) \{[\s\S]*?\n\}\n/) || [''])[0];
function rankLineWith(D) {
  const S = { city: { restored: {} } };
  const fn = vm.runInThisContext('(function (S, CITY_DATA, CityStory) {' + RL_SRC + ';return cityRankLine; })')(S, D, CS);
  return (restored, mids) => { S.city = { restored }; return fn(mids); };
}

(async () => {
  const REAL = (await imp(path.join(root, 'city/districts.mjs'))).city;
  const { makeLayout, standardFrame } = await imp(path.join(root, 'city/layout.mjs'));

  const refSpots = (() => { const l = makeLayout({ reserve: [[0, -64], [0, 52]], streetX: [-28, 0, 28], streetZ: [16, -12, -40], xRange: [-52, 52], zRange: [52, -68] }); const s = []; try { for (;;) s.push(l.take()); } catch (e) { /* fin */ } return s; })();

  // ---------------- A ----------------
  const FRAME_KEYS = ['bounds', 'entry', 'exit', 'streets', 'blocks', 'tower'], STD = ['M03', 'M01', 'M10'];
  // ATAQUE: los distritos que usan standardFrame() tienen el marco de la función, sin la clave lay y con el orden de claves de siempre
  await attack('A1 M03, M01 y M10: marco idéntico al de standardFrame(), sin la clave lay y con el orden de claves de siempre', () => {
    const F = standardFrame(), keys = 'id,name,colors,style,seed,bounds,entry,exit,streets,blocks,mentors,creatures,repairs,apprentices,tower,need,celebrate';
    const bad = STD.filter((id) => 'lay' in REAL.districts[id] || Object.keys(REAL.districts[id]).join() !== keys || FRAME_KEYS.some((k) => JSON.stringify(REAL.districts[id][k]) !== JSON.stringify(F[k])));
    return bad.length ? 'difieren: ' + bad.join(',') : true;
  });
  // ATAQUE: dos llamadas a standardFrame() comparten algún objeto (lay, bounds, streets, blocks, tower, entry, exit)
  await attack('A2 dos llamadas a standardFrame() no comparten ningún objeto', () => {
    const s = sharedBetween(standardFrame(), standardFrame());
    return s.length ? 'comparten ' + s.length + ' objetos: ' + safeStr(s.slice(0, 3)) : true;
  });
  // ATAQUE: dos distritos de CITY_DATA comparten un objeto (bounds, streets, blocks, tower, entry, exit): mutar uno contaminaría a los demás
  await attack('A3 los distritos M03, M01 y M10 de CITY_DATA no comparten ningún objeto entre sí', () => {
    const bad = [];
    for (let i = 0; i < STD.length; i++) for (let j = i + 1; j < STD.length; j++) { const n = sharedBetween(REAL.districts[STD[i]], REAL.districts[STD[j]]).length; if (n) bad.push(STD[i] + '/' + STD[j] + ': ' + n); }
    return bad.length ? 'comparten objetos: ' + bad.join(' ') : true;
  });
  // ATAQUE: el implementador usa ...standardFrame() en el literal: lay se filtra y cambia el orden de las claves (la comparación byte a byte lo detecta)
  await attack('A4 un distrito armado con ...standardFrame() filtra lay y reordena las claves (la comparación byte a byte lo detecta)', () => {
    const d = REAL.districts.M03, { bounds, entry, exit, streets, blocks, tower, ...restOf } = d;
    const spread = { ...restOf, ...standardFrame() };
    return JSON.stringify(spread) !== JSON.stringify(d) && /"lay":\{\}/.test(JSON.stringify(spread)) ? true : 'no lo detecta';
  });
  // ATAQUE: marcos intercalados (varios distritos tomando lugares a la vez) se roban lugares entre sí
  prop('A-P1 takes intercalados en 3 marcos: cada marco da exactamente la secuencia de un makeLayout nuevo',
    fc.array(fc.nat(2), { maxLength: 150 }), (ops) => {
      const fr = [standardFrame(), standardFrame(), standardFrame()], got = [[], [], []];
      for (const i of ops) { if (got[i].length >= refSpots.length) continue; got[i].push(fr[i].lay.take()); }
      for (let i = 0; i < 3; i++) if (JSON.stringify(got[i]) !== JSON.stringify(refSpots.slice(0, got[i].length))) throw new Error('marco ' + i + ' desviado');
      return true;
    });
  // ATAQUE: mutaciones arbitrarias en el marco de una llamada se filtran a otra llamada posterior o anterior
  prop('A-P2 mutar cualquier campo de un standardFrame() no cambia otro ni los siguientes',
    fc.tuple(fc.constantFrom('bounds.minX', 'bounds.maxZ', 'entry.z', 'entry.yaw', 'exit.w', 'tower.h', 'tower.id', 'streets.x.0', 'streets.z.2', 'blocks.0.0', 'blocks.15.1'),
      fc.oneof(fc.integer(), fc.double(), fc.string(), fc.constant(null), fc.constant(undefined))), ([p, v]) => {
      const a = standardFrame(), b = standardFrame(), ref = JSON.stringify({ ...b, lay: 0 });
      const ks = p.split('.'); let o = a; for (const k of ks.slice(0, -1)) o = o[k]; o[ks[ks.length - 1]] = v;
      const c = standardFrame();
      if (JSON.stringify({ ...b, lay: 0 }) !== ref || JSON.stringify({ ...c, lay: 0 }) !== ref) throw new Error('fuga por ' + p);
      return true;
    });

  // ---------------- B ----------------
  // ATAQUE: los 8 distritos reales ya no pasan su propia regla de nombres (repetidos, homófonos, prefijos, menos de 3 letras)
  await attack('B1 nameClashes de los distritos reales no devuelve nada', () => { const p = RULES.nameClashes(REAL.districts); return p.length ? p.join(' ') : true; });
  // ATAQUE: falso positivo injusto 'Ana'/'Anabel' (el spec lo pide como Gil/Gilda) y que la regla sea simétrica y no marque 'Ana'/'Ada'
  await attack('B4 Ana/Anabel se marca (coherente con Gil/Gilda), Ana/Ada y Sol/Saúl no; Gil/Gilda y Javi/Javier sí', () => {
    const want = [['Ana', 'Anabel', true], ['Gil', 'Gilda', true], ['Javi', 'Javier', true], ['Ana', 'Ada', false], ['Sol', 'Saúl', false], ['Ion', 'Iona', true], ['Leo', 'Leonor', true]];
    const bad = want.filter(([a, b, w]) => RULES.namesNear(a, b) !== w || RULES.namesNear(b, a) !== w);
    return bad.length ? safeStr(bad) : true;
  });
  // ATAQUE: nombres de 2 letras quedan fuera del prefijo (k = 2 < 3): nameClashes los reporta como demasiado cortos ('Al' frente a 'Alba', 'Ed' frente a 'Eduardo')
  await attack('B5 un nombre de 2 letras (Al, Ed, Bo) se reporta como demasiado corto aunque sea el inicio de otro', () => {
    const mk = (names) => ({ X: { mentors: names.map((name) => ({ name })), apprentices: [] } });
    const bad = [['Al', 'Alba'], ['Ed', 'Eduardo'], ['Bo', 'Boris']].filter(([a, b]) => !RULES.nameClashes(mk([a, b])).some((x) => x.indexOf(a + '(X) tiene menos de 3 letras') === 0));
    return bad.length ? 'no se reporta: ' + safeStr(bad) : true;
  });
  // ATAQUE: la regla depende de si el texto viene en NFC o NFD
  prop('B-P1 namesNear da lo mismo con el nombre en NFC que en NFD',
    fc.tuple(fc.string({ unit: fc.constantFrom('a', 'i', 'o', 'n', 'l', 'í', 'ó', 'ñ', 'á'), minLength: 1, maxLength: 7 }),
      fc.string({ unit: fc.constantFrom('a', 'i', 'o', 'n', 'l', 'í', 'ó', 'ñ', 'á'), minLength: 1, maxLength: 7 })), ([a, b]) => {
      const A = a.normalize('NFC'), B = b.normalize('NFC');
      if (RULES.namesNear(A, B) !== RULES.namesNear(A.normalize('NFD'), B)) throw new Error('NFC=' + RULES.namesNear(A, B) + ' NFD=' + RULES.namesNear(A.normalize('NFD'), B));
      return true;
    });
  // ATAQUE: homófonos por h muda / b-v / c-k: phon debe dar la misma forma
  prop('B-P2 un nombre y su homófono (h muda inicial, v↔b, ca/co/cu↔ka/ko/ku) tienen la misma forma fonética y se marcan como parecidos',
    fc.tuple(fc.string({ unit: fc.constantFrom('a', 'e', 'i', 'o', 'u', 'n', 'r', 'l', 'm', 'd', 't', 's'), minLength: 3, maxLength: 8 }), fc.constantFrom('h', 'bv', 'ck')),
    ([base, kind]) => {
      const a = kind === 'h' ? base : kind === 'bv' ? 'b' + base : 'ca' + base, b = kind === 'h' ? 'h' + base : kind === 'bv' ? 'v' + base : 'ka' + base;
      if (RULES.phon(a) !== RULES.phon(b)) throw new Error(a + '/' + b + ' suenan igual pero phon da ' + RULES.phon(a) + ' y ' + RULES.phon(b));
      if (!RULES.namesNear(a, b)) throw new Error(a + '/' + b + ' suenan igual y namesNear los deja pasar');
      return true;
    });
  // ATAQUE: invariantes básicos (simetría con cualquier texto; mismo nombre en mayúsculas/NFD con letras de nombres) y nunca lanza
  prop('B-P3 namesNear es simétrica con cualquier texto y marca siempre el mismo nombre en mayúsculas/NFD', fc.tuple(fc.string({ unit: 'binary', maxLength: 12 }), fc.string({ unit: 'binary', maxLength: 12 }),
    fc.string({ unit: fc.constantFrom(...'abcdefghijklmnñopqrstuvwxyzáéíóúü'), maxLength: 12 })), ([a, b, name]) => {
    if (RULES.namesNear(a, b) !== RULES.namesNear(b, a)) throw new Error('no simétrica');
    if (!RULES.namesNear(name, name.toUpperCase().normalize('NFD'))) throw new Error('no marca el mismo nombre en mayúsculas/NFD');
    return true;
  });
  // FUZZ: la regla con texto hostil (RTL, zero-width, combinantes, emojis, bytes nulos, las marcas internas de phon): nunca lanza, nunca es lenta, simétrica
  const HOST = ['​', '‮', '́', '\u0000', '\u0001', '\u0002', '👩‍💻', 'Ａ', 'ﬁ', 'ß', 'İ', 'Ł', ' ', '\n', 'a', 'n', 'Á', 'ch', 'gue', '<script>', '${x}'];
  campaign('B-F namesNear con texto hostil', (r) => {
    const g = () => { let s = ''; for (let i = Math.floor(r() * 8); i-- > 0;) s += r() < 0.5 ? pick(r, HOST) : String.fromCharCode(Math.floor(r() * 0x3000)); return s; };
    return [g(), g()];
  }, ([a, b]) => (RULES.namesNear(a, b) !== RULES.namesNear(b, a) ? 'no simétrica' : typeof RULES.namesNear(a, b) !== 'boolean' ? 'no booleano' : null));

  // ---------------- C ----------------
  const D8 = REAL, M8 = Object.keys(D8.districts), RL = rankLineWith(D8);
  const restoredOf = (ids) => Object.fromEntries(ids.map((m) => [m, true]));
  // Textos que pide el plan (Review Focus 2 y Task 2) para el n-ésimo restaurado de uno en uno; los marcados (*) son los literales del plan.
  const NTH = {
    1: 'Subes a Junior.', 2: 'Sigues como Junior: te falta 1 distrito para Semi-senior.', 3: 'Subes a Semi-senior.',
    4: 'Sigues como Semi-senior: te faltan 2 distritos para Senior.' /* (*) */, 5: 'Sigues como Semi-senior: te falta 1 distrito para Senior.',
    6: 'Subes a Senior.' /* (*) */, 7: 'Sigues como Senior: te falta 1 distrito para Arquitecto.' /* (*) */, 8: 'Subes a Arquitecto.' /* (*) */
  };
  const STAY = { 0: 'Sigues como Becario: te falta 1 distrito para Junior.', ...Object.fromEntries([2, 4, 5, 7].map((n) => [n, NTH[n]])), 8: 'Sigues como Arquitecto. Llevas 8 de 8 distritos restaurados.' };
  const RANK_AT = (n) => (n >= 8 ? 'Arquitecto' : n >= 6 ? 'Senior' : n >= 3 ? 'Semi-senior' : n >= 1 ? 'Junior' : 'Becario');
  // ATAQUE: los textos literales del plan con 8 distritos (orden real de la plaza)
  await attack('C1 cityRankLine con 8 distritos da los textos literales del plan (4.º, 6.º, 7.º, 8.º y 8/8)', () => {
    if (!RL_SRC) return 'cityRankLine no está en city/view.js';
    const bad = [];
    for (let n = 1; n <= 8; n++) { const got = RL(restoredOf(D8.order.filter((m) => M8.includes(m)).slice(0, n)), [D8.order.filter((m) => M8.includes(m))[n - 1]]); if (got !== NTH[n]) bad.push(n + ': "' + got + '"'); }
    const full = RL(restoredOf(M8), []); if (full !== STAY[8]) bad.push('8/8: "' + full + '"');
    return bad.length ? bad.join(' | ') : true;
  });
  // ATAQUE: que el texto del n-ésimo dependa de cuáles distritos son (no solo de cuántos)
  prop('C-P1 restaurar uno nuevo con n ya restaurados (cualquier subconjunto) da el texto del plan para el (n+1)-ésimo',
    fc.tuple(fc.shuffledSubarray(['M02', 'M08', 'M03', 'M01', 'M10', 'M04', 'M06', 'M07'], { minLength: 1 })), ([ids]) => {
      const m = ids[ids.length - 1], got = RL(restoredOf(ids), [m]);
      if (got !== NTH[ids.length]) throw new Error('"' + got + '" debía "' + NTH[ids.length] + '"');
      return true;
    });
  // ATAQUE: varios a la vez, mids con duplicados, ids desconocidos/hostiles y guardados con basura (M05, __proto__, valores no true)
  prop('C-P2 varios restaurados a la vez y mids/restored hostiles: oráculo por conteos; nunca "Tech Lead" ni "Llevas 8 de 8" antes de tiempo',
    fc.tuple(fc.subarray(M8), fc.array(fc.constantFrom(...M8, 'M05', 'M11', '__proto__', 'constructor', ''), { maxLength: 10 }),
      fc.dictionary(fc.constantFrom('M05', 'M09', 'M11', 'toString', 'x'), fc.oneof(fc.constant(true), fc.constant(1), fc.constant('true'))),
      fc.dictionary(fc.constantFrom(...M8), fc.oneof(fc.constant(1), fc.constant('true'), fc.constant(null), fc.constant(false)))), ([ids, mids, junk, notTrue]) => {
      const restored = { ...notTrue, ...junk, ...restoredOf(ids) }, n = ids.length, before = ids.filter((m) => !mids.includes(m)).length;
      const want = RANK_AT(n) !== RANK_AT(before) ? 'Subes a ' + RANK_AT(n) + '.' : STAY[n] || ('Sigues como ' + RANK_AT(n) + (n === 1 ? ': te faltan 2 distritos para Semi-senior.' : n === 3 ? ': te faltan 3 distritos para Senior.' : n === 6 ? ': te faltan 2 distritos para Arquitecto.' : '?'));
      const got = RL(restored, mids);
      if (got !== want) throw new Error('"' + got + '" debía "' + want + '"');
      if (/Tech Lead/.test(got) || (/Llevas/.test(got) && n !== 8)) throw new Error('texto imposible: ' + got);
      return true;
    });
  // FUZZ: cityRankLine con restored/mids arbitrarios (tipos basura): nunca lanza, siempre una de las formas válidas
  const FORMS = /^(Subes a (Junior|Semi-senior|Senior|Arquitecto)\.|Sigues como (Becario|Junior|Semi-senior|Senior|Arquitecto)(: te (falta 1 distrito|faltan [2-9] distritos) para (Junior|Semi-senior|Senior|Arquitecto)\.|\. Llevas 8 de 8 distritos restaurados\.))$/;
  const VALS = [true, false, 1, 0, 'true', null, {}, [], NaN];
  campaign('C-F cityRankLine con restored y mids aleatorios', (r) => {
    const restored = {}; for (const k of [...M8, 'M05', '__proto__', 'length']) if (r() < 0.5) restored[k] = r() < 0.6 ? true : pick(r, VALS);
    const mids = []; for (let i = Math.floor(r() * 6); i-- > 0;) mids.push(pick(r, [...M8, 'M05', '', 'toString']));
    return { restored, mids };
  }, ({ restored, mids }) => (FORMS.test(RL(restored, mids)) ? null : 'forma inválida: ' + RL(restored, mids)));

  // ---------------- salida ----------------
  results.forEach((r) => console.log(r.filter(Boolean).join(' ')));
  const fails = results.filter((r) => r[0] === 'FAIL');
  console.log(`\n${attacks} ataques, ${props} propiedades × ${RUNS}, ${fuzzTotal} entradas de fuzzing; ${fails.length} FAIL de ${results.length}`);
  process.exit(fails.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
