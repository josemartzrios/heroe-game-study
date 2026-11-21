// Revisión adversarial de la Tanda 3 (rama feat/ciudad-tanda-3) con los 8 distritos REALES. No repite tanda3_attack/tanda3_plan_attack/tanda2_*:
//  V  validadores: distritos y plaza mal formados que checkDistrict/checkPlaza deberían rechazar (falsos negativos), catálogo de mutaciones
//     que deben matarse con su regla, independencia de la semilla del marco común y fuzz estructural profundo de M04/M06/M07.
//  L  city/layout.mjs: makeLayout con entradas límite (paso 0/negativo, rango infinito), invariantes de makeLayout y de people() sobre standardFrame().
//  N  tests/district_rules.cjs con Unicode hostil (invisibles, ancho completo) y colores en mayúsculas; nameClashes no depende del orden.
//  G  guardados hostiles en M04/M06/M07: posiciones resueltas dentro de bounds y fuera de cajas/salida, aislamiento entre distritos, __proto__.
//  R  alcanzabilidad (BFS con el radio del héroe) de cada interactuable, la puerta de la torre y la salida en los 8 distritos y de los portales.
// Uso: node tests/adv/review_tanda3_attack.cjs [RUNS=1000] [FUZZ_N=100000 por objetivo] [SEED=20261120] [MAX_S=60 por objetivo]   (código 1 si algo rompe)
const fc = require('fast-check');
const assert = require('assert');
const path = require('path');
const { spawnSync } = require('child_process');
const { pathToFileURL } = require('url');
const CS = require('../../city/story.js');
const CM = require('../../city/move.js');
const { TANDA3, cityAt } = require('../city_at.cjs');

const RUNS = +(process.argv[2] || 1000), FUZZ_N = +(process.argv[3] || 100000), SEED = +(process.argv[4] || 20261120), MAX_MS = 1000 * +(process.argv[5] || 60);
const TODAY = '2026-11-20';
const root = path.join(__dirname, '..', '..');
const imp = (f) => import(pathToFileURL(path.join(root, f)).href);
const hasOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const results = [];
let attacks = 0, props = 0, fuzzTotal = 0;
const ok = (name, cond, extra) => results.push([cond ? 'PASS' : 'FAIL', name, cond ? '' : (extra || '')]);
const safeStr = (x) => { try { const s = JSON.stringify(x, (k, v) => (typeof v === 'number' && !isFinite(v)) ? String(v) : (typeof v === 'function' ? 'fn' : v)); return (s === undefined ? String(x) : s).slice(0, 400); } catch (e) { return String(x); } };
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
    if (!err && Date.now() - a > 1000) err = 'lento (> 1 s)';
    if (err) { const k = String(err).slice(0, 160), s = safeStr(input); if (!sig[k]) sig[k] = { n: 0, min: s }; sig[k].n++; if (s.length < sig[k].min.length) sig[k].min = s; }
  }
  fuzzTotal += n;
  const keys = Object.keys(sig);
  ok('F: ' + name + ' (' + n + ' entradas, ' + (Date.now() - t0) + ' ms, semilla ' + SEED + ')', keys.length === 0, keys.map((k) => k + ' ×' + sig[k].n + ' mínima=' + sig[k].min).join(' | '));
}
const NEW = ['M04', 'M06', 'M07'];
const R = 0.4, NEAR = 2.2, EPS = 1e-6;
const insideBox = (x, z, r, boxes) => { const rr = r - EPS; return boxes.some((b) => { const cx = Math.min(b.maxX, Math.max(b.minX, x)), cz = Math.min(b.maxZ, Math.max(b.minZ, z)); return (x - cx) ** 2 + (z - cz) ** 2 < rr * rr; }); };
const aabb = (o) => ({ minX: o.x - o.w / 2, maxX: o.x + o.w / 2, minZ: o.z - o.d / 2, maxZ: o.z + o.d / 2 });
const clone = (x) => structuredClone(x);

(async () => {
  const D8 = cityAt((await imp('city/districts.mjs')).city, TANDA3), DIST = D8.districts, M8 = Object.keys(DIST);   // los 8 de la Tanda 3 (ver tests/city_at.cjs)
  const { checkDistrict, checkPlaza } = await imp('city/check_district.mjs');
  const { makeLayout, people, standardFrame } = await imp('city/layout.mjs');
  const { expandModule } = await imp('content_expand.mjs');
  const MODULES = require('../modules.cjs'), RULES = require('../district_rules.cjs');
  const MODS = {};
  for (const id of M8) MODS[id] = expandModule(id, MODULES[id].title, await imp(MODULES[id].file));
  const errsOf = (d, mid) => checkDistrict(d, MODS[mid]);
  const rulesIn = (errs) => new Set(errs.map((e) => +(/^R(\d+):/.exec(e) || [0, -1])[1]));

  // =================== V. validadores ===================
  // ATAQUE: dos portales con la misma boca (el de M06 movido encima del de M04): portalAt y el botón eligen siempre el primero y M06 queda inaccesible
  await attack('V1 checkPlaza rechaza dos portales abiertos que comparten la boca (un distrito queda inaccesible)', () => {
    const P = clone(D8), a = P.plaza.portals.find((p) => p.dist === 'M04'), b = P.plaza.portals.find((p) => p.dist === 'M06');
    b.x = a.x; b.z = a.z;   // el back de M06 sigue donde estaba (libre)
    const reach = CM.portalAt(P, 'plaza', a.x, a.z), e = checkPlaza(P);
    return e.some((x) => /^R9:/.test(x)) || 'checkPlaza no reporta nada; portalAt en la boca común = ' + reach + ' (M06 nunca se abre). errores=' + safeStr(e);
  });
  // ATAQUE: boca del portal fuera de los bounds de la plaza (o dentro de la sede): el héroe nunca la pisa y el botón no aparece; solo se mira back
  await attack('V2 checkPlaza rechaza la boca de un portal abierto fuera de los bounds o dentro de la sede', () => {
    const bad = [];
    const P1 = clone(D8), p1 = P1.plaza.portals.find((p) => p.dist === 'M07'); p1.x = 999; p1.z = 999;
    if (!checkPlaza(P1).some((x) => /^R9:/.test(x))) bad.push('boca en (999,999) aceptada');
    const P2 = clone(D8), p2 = P2.plaza.portals.find((p) => p.dist === 'M07'); p2.x = P2.plaza.hq.x; p2.z = P2.plaza.hq.z;
    if (!checkPlaza(P2).some((x) => /^R9:/.test(x))) bad.push('boca dentro de la sede aceptada');
    return bad.length === 0 || bad.join(' | ');
  });
  // ATAQUE: palabra prohibida (IP ajena) escondida con un carácter invisible o en ancho completo: R6 compara la RegExp con el texto crudo
  await attack('V3 R6 detecta "Batman" con zero-width, guion blando o letras de ancho completo en el nombre de una criatura de M04', () => {
    const miss = ['Bat​man', 'Bat­man', 'Ｂａｔｍａｎ'].filter((n) => { const d = clone(DIST.M04); d.creatures[0].name = n; return !rulesIn(errsOf(d, 'M04')).has(6); });
    return miss.length === 0 || 'pasa R6: ' + miss.map((s) => JSON.stringify(s)).join(', ');
  });
  // REGLA: toda mutación de un catálogo de roturas conocidas sobre M04/M06/M07 se detecta con su regla (mutation kill)
  const MUTS = {
    dupId: [5, (d, i, j) => { d.apprentices[i % d.apprentices.length].id = d.mentors[j % d.mentors.length].id; }],
    unsafeId: [5, (d, i, j) => { d.creatures[i % d.creatures.length].id = ['__proto__', 'constructor', 'toString', 'A1', 'a b', '', '<x>'][j % 7]; }],
    intoBuilding: [7, (d, i, j) => { const bs = CM.layoutBuildings(d), b = bs[j % bs.length], m = d.mentors[i % d.mentors.length]; m.x = b.x; m.z = b.z; }],
    outOfBounds: [7, (d, i, j) => { const r = d.repairs[i % d.repairs.length]; r.x = d.bounds.maxX + 1 + j; }],
    nonFinite: [7, (d, i, j) => { d.apprentices[i % d.apprentices.length].z = [NaN, Infinity, -Infinity][j % 3]; }],
    tooClose: [7, (d, i, j) => { const a = d.apprentices[i % d.apprentices.length], m = d.mentors[j % d.mentors.length]; a.x = m.x + 1; a.z = m.z; }],
    exitOut: [7, (d, i, j) => { d.exit.z = d.bounds.maxZ + 1 + j; }],
    badColor: [11, (d, i, j) => { d.colors[i % 2 ? 'a' : 'b'] = ['#fff', 'red', '#12345g', '', null, '#1234567'][j % 6]; }],
    need: [4, (d, i, j) => { d.need = [0, -1, 2.5, d.apprentices.length + 1, NaN, '7'][j % 6]; }],
    topicsLen: [2, (d, i, j) => { d.creatures[i % d.creatures.length].topics = j % 2 ? ['T01'] : ['T01', 'T02', 'T03', 'T04', 'T05', 'T06']; }],
    mode: [4, (d, i, j) => { d.apprentices[i % d.apprentices.length].mode = ['', 'Explain', null, 'corregir'][j % 4]; }],
    nameVsMentor: [4, (d, i, j) => { d.apprentices[i % d.apprentices.length].name = d.mentors[j % d.mentors.length].name; }],
    mentorTopic: [1, (d, i, j) => { const a = i % d.mentors.length, b = (a + 1 + j % (d.mentors.length - 1)) % d.mentors.length; d.mentors[a].topic = d.mentors[b].topic; }],
    repairTopic: [3, (d, i, j) => { const a = i % d.repairs.length, b = (a + 1 + j % (d.repairs.length - 1)) % d.repairs.length; d.repairs[a].topic = d.repairs[b].topic; }],
    forbidden: [6, (d, i, j) => { const n = ['Hulk', 'Spider', 'Batman', 'LEGO']; d.apprentices[i % d.apprentices.length].name = n[j % 4] + ' ' + i; }],
    bigBounds: [7, (d, i, j) => { d.bounds.maxX = d.bounds.minX + 141 + j; }]
  };
  prop('V-P1 cada mutación del catálogo sobre M04/M06/M07 se detecta con su regla (o R0)', fc.tuple(fc.constantFrom(...NEW), fc.constantFrom(...Object.keys(MUTS)), fc.nat(40), fc.nat(40)), ([mid, k, i, j]) => {
    const d = clone(DIST[mid]), [rule, f] = MUTS[k]; f(d, i, j);
    const e = errsOf(d, mid), rs = rulesIn(e);
    if (!(rs.has(rule) || rs.has(0))) throw new Error(k + ' no detectada con R' + rule + ': ' + safeStr(e));
    return true;
  });
  // REGLA: el marco común no depende de la semilla: M04/M06/M07 con cualquier seed (los edificios cambian) siguen pasando todas las reglas
  prop('V-P2 M04/M06/M07 con cualquier seed entero pasan checkDistrict (calles de standardFrame libres de edificios)', fc.tuple(fc.constantFrom(...NEW), fc.integer()), ([mid, seed]) => {
    const d = clone(DIST[mid]); d.seed = seed;
    const e = errsOf(d, mid); if (e.length) throw new Error('seed ' + seed + ': ' + e.slice(0, 3).join(' | '));
    return true;
  });
  // FUZZ: mutaciones profundas (ruta aleatoria dentro del distrito) con valores hostiles: nunca lanza, siempre "R<n>: …", nunca contamina Object.prototype
  const HOSTILE = [undefined, null, 0, -0, NaN, Infinity, -Infinity, 1e308, -1, '', '10', 'x', '__proto__', [], [null], {}, { x: 1 }, true, '<script>', 'T01', 'T99', 'torre', 'm01', '‮​', 'a'.repeat(5000)];
  const paths = (o, pre = [], out = []) => { if (o && typeof o === 'object') for (const k of Object.keys(o)) { out.push(pre.concat(k)); paths(o[k], pre.concat(k), out); } return out; };
  const PATHS = Object.fromEntries(NEW.map((m) => [m, paths(DIST[m])]));
  campaign('V-F checkDistrict con M04/M06/M07 mutados en profundidad', (r) => {
    const m = pick(r, NEW), muts = [];
    for (let i = 1 + Math.floor(r() * 3); i-- > 0;) muts.push([pick(r, PATHS[m]), r() < 0.1 ? 'DELETE' : r() < 0.15 ? 'PROTO' : Math.floor(r() * HOSTILE.length)]);
    return { m, muts };
  }, ({ m, muts }) => {
    const d = clone(DIST[m]);
    for (const [p, v] of muts) {
      let o = d; for (let i = 0; i < p.length - 1 && o && typeof o === 'object'; i++) o = o[p[i]];
      if (!o || typeof o !== 'object') continue;
      const k = p[p.length - 1];
      if (v === 'DELETE') delete o[k]; else if (v === 'PROTO') Object.defineProperty(o, k, { value: JSON.parse('{"__proto__":{"polluted":1}}'), enumerable: true, configurable: true, writable: true }); else o[k] = HOSTILE[v];
    }
    const e = checkDistrict(d, MODS[m]);
    if (!Array.isArray(e) || e.some((x) => typeof x !== 'string' || !/^R\d+:/.test(x))) return 'salida inválida ' + safeStr(e);
    if (({}).polluted !== undefined) return 'Object.prototype contaminado';
    return null;
  });

  // =================== L. layout.mjs ===================
  // ATAQUE: entradas límite de makeLayout (paso 0, paso negativo, rango infinito): debe lanzar o devolver, nunca colgarse (proceso aparte, tope 10 s)
  await attack('L1 makeLayout con step 0, step negativo o xRange/zRange infinitos termina (lanza o devuelve) en vez de colgarse', () => {
    const cases = { control: '{ streetX: [0], streetZ: [0], xRange: [-8, 8], zRange: [8, -8], step: 8 }', step0: '{ streetX: [0], streetZ: [0], xRange: [-8, 8], zRange: [8, -8], step: 0 }', stepNeg: '{ streetX: [0], streetZ: [0], xRange: [-8, 8], zRange: [8, -8], step: -8 }',
      xInf: '{ streetX: [], streetZ: [0], xRange: [0, Infinity], zRange: [0, 0] }', zInf: '{ streetX: [0], streetZ: [], xRange: [0, 0], zRange: [0, -Infinity] }' };
    const hung = [];
    for (const [k, args] of Object.entries(cases)) {
      const code = `import(${JSON.stringify(pathToFileURL(path.join(root, 'city/layout.mjs')).href)}).then((L) => { try { L.makeLayout(${args}); } catch (e) {} process.exit(0); });`;
      const r = spawnSync(process.execPath, ['-e', code], { timeout: 10000, killSignal: 'SIGKILL' });
      if (r.status !== 0) hung.push(k + (r.signal ? ' (colgado, matado tras 10 s)' : ' (estado ' + r.status + ')'));
    }
    if (hung.some((h) => h.startsWith('control'))) return 'el caso de control no terminó: ' + hung.join(', ');
    return hung.length === 0 || hung.join(', ');
  });
  // REGLA: makeLayout con parámetros enteros aleatorios: cada lugar está sobre una calle y en su rango, a >= min de todo lo demás y de la reserva,
  // y el reparto es maximal (todo candidato rechazado está a < min de algo tomado o reservado); el orden es filas y luego columnas
  prop('L-P1 makeLayout: lugares sobre calles, separados >= min, maximal y en orden de recorrido', fc.record({
    reserve: fc.array(fc.tuple(fc.integer({ min: -20, max: 20 }), fc.integer({ min: -20, max: 20 })), { maxLength: 3 }),
    streetX: fc.uniqueArray(fc.integer({ min: -20, max: 20 }), { maxLength: 3 }), streetZ: fc.uniqueArray(fc.integer({ min: -20, max: 20 }), { maxLength: 3 }),
    x0: fc.integer({ min: -20, max: 20 }), dx: fc.integer({ min: 0, max: 40 }), z0: fc.integer({ min: -20, max: 20 }), dz: fc.integer({ min: 0, max: 40 }),
    step: fc.integer({ min: 1, max: 9 }), min: fc.integer({ min: 1, max: 9 })
  }), (p) => {
    const xRange = [p.x0, p.x0 + p.dx], zRange = [p.z0, p.z0 - p.dz];
    const L = makeLayout({ reserve: p.reserve, streetX: p.streetX, streetZ: p.streetZ, xRange, zRange, step: p.step, min: p.min });
    const got = []; for (;;) { try { got.push(L.take()); } catch (e) { if (!/faltan lugares/.test(e.message)) throw e; break; } }
    const cand = [];
    for (const z of p.streetZ) for (let x = xRange[0]; x <= xRange[1]; x += p.step) cand.push({ x, z });
    for (const x of p.streetX) for (let z = zRange[0]; z >= zRange[1]; z -= p.step) cand.push({ x, z });
    const res = p.reserve.map(([x, z]) => ({ x, z })), far = (a, b) => Math.hypot(a.x - b.x, a.z - b.z) >= p.min;
    let ci = -1;
    for (const g of got) {
      const k = cand.findIndex((c, i) => i > ci && c.x === g.x && c.z === g.z);
      if (k < 0) throw new Error('lugar fuera de las calles o fuera de orden ' + safeStr(g));
      ci = k;
    }
    for (let i = 0; i < got.length; i++) { if (!res.every((q) => far(q, got[i]))) throw new Error('pegado a la reserva'); for (let j = i + 1; j < got.length; j++) if (!far(got[i], got[j])) throw new Error('lugares a < min'); }
    for (const c of cand) if (!got.some((g) => g.x === c.x && g.z === c.z) && res.concat(got).every((q) => far(q, c))) throw new Error('no maximal: ' + safeStr(c));
    return true;
  });
  // REGLA: people() sobre standardFrame() con listas aleatorias: ids/temas por posición, lugares = prefijo del reparto en el orden fijo,
  // libres de edificios con cualquier seed, entradas sin mutar; si no caben, lanza "faltan lugares" (nunca reparte a medias en silencio)
  const SPOTS = (() => { const l = standardFrame().lay, s = []; try { for (;;) s.push(l.take()); } catch (e) { /* fin */ } return s; })();
  const F0 = standardFrame();
  prop('L-P2 people(standardFrame()) = prefijo del reparto en orden mentores→criaturas→reparaciones→aprendices, libre de edificios', fc.record({
    mentors: fc.array(fc.string({ minLength: 1, maxLength: 8 }), { maxLength: 25 }),
    creatures: fc.array(fc.record({ id: fc.string({ maxLength: 6 }), name: fc.string({ maxLength: 6 }), topics: fc.array(fc.constantFrom('T01', 'T02', 'T03'), { maxLength: 4 }), area: fc.constant({ x: 999, z: 999, r: 1 }) }, { requiredKeys: ['id', 'name', 'topics'] }), { maxLength: 10 }),
    repairs: fc.array(fc.tuple(fc.constantFrom('T01', 'T02'), fc.string({ maxLength: 8 })), { maxLength: 12 }),
    apprentices: fc.array(fc.tuple(fc.string({ maxLength: 6 }), fc.constantFrom('T01', 'T02'), fc.constantFrom('explain', 'correct')), { maxLength: 12 }),
    seed: fc.integer()
  }), (L) => {
    const snap = JSON.stringify(L), total = L.mentors.length + L.creatures.length + L.repairs.length + L.apprentices.length;
    let P;
    try { P = people(standardFrame().lay, L); } catch (e) { if (total > SPOTS.length && /faltan lugares/.test(e.message)) return true; throw e; }
    if (total > SPOTS.length) throw new Error('repartió ' + total + ' con ' + SPOTS.length + ' lugares');
    if (JSON.stringify(L) !== snap) throw new Error('mutó las listas de entrada');
    const pos = [...P.mentors, ...P.creatures.map((c) => c.area), ...P.repairs, ...P.apprentices].map((p) => ({ x: p.x, z: p.z }));
    assert.deepStrictEqual(pos, SPOTS.slice(0, total));
    const pad = (n) => String(n).padStart(2, '0');
    P.mentors.forEach((m, i) => { if (m.id !== 'm' + pad(i + 1) || m.topic !== 'T' + pad(i + 1) || m.name !== L.mentors[i]) throw new Error('mentor ' + i + ' ' + safeStr(m)); });
    P.repairs.forEach((r, i) => { if (r.id !== 'r' + pad(i + 1) || r.topic !== L.repairs[i][0] || r.label !== L.repairs[i][1]) throw new Error('reparación ' + i); });
    P.apprentices.forEach((a, i) => { if (a.id !== 'a' + pad(i + 1) || a.name !== L.apprentices[i][0] || a.topic !== L.apprentices[i][1] || a.mode !== L.apprentices[i][2]) throw new Error('aprendiz ' + i); });
    P.creatures.forEach((c, i) => { if (c.area.r !== 6 || c.id !== L.creatures[i].id || c.area === L.creatures[i].area) throw new Error('criatura ' + i); });
    const boxes = CM.layoutBuildings({ seed: L.seed, blocks: F0.blocks }).map(aabb).concat([aabb(F0.tower)]), B = F0.bounds;
    for (const p of pos) {
      if (!(p.x >= B.minX + R && p.x <= B.maxX - R && p.z >= B.minZ + R && p.z <= B.maxZ - R)) throw new Error('fuera de bounds ' + safeStr(p));
      if (insideBox(p.x, p.z, 0.6, boxes)) throw new Error('lugar junto a un edificio con seed ' + L.seed + ': ' + safeStr(p));
    }
    return true;
  });

  // =================== N. district_rules.cjs ===================
  // ATAQUE: la regla de nombres con caracteres invisibles o de ancho completo: "A​na" se ve y se lee como "Ana" pero no se marca
  await attack('N1 namesNear marca "Ana" frente a "A\\u200bna", "A\\u00adna" y "Ａｎａ"; nameClashes no cuenta invisibles como letras', () => {
    const miss = ['A​na', 'A­na', 'Ａｎａ'].filter((n) => !RULES.namesNear('Ana', n));
    const short = RULES.nameClashes({ X: { mentors: [{ name: 'A​​' }], apprentices: [] } });
    const bad = miss.map((s) => 'no marca ' + JSON.stringify(s));
    if (!short.some((x) => /menos de 3 letras/.test(x))) bad.push('"A\\u200b\\u200b" (1 letra visible) no se reporta como corto');
    return bad.length === 0 || bad.join(' | ');
  });
  // ATAQUE: un distrito que reutiliza los dos colores de M04 escritos en mayúsculas (R11 los acepta: /i) pasa "al menos un color propio"
  await attack('N2 ownColorProblems reporta un distrito con los colores de M04 en mayúsculas (#2EE6C5/#FF5CA8)', () => {
    const X = Object.assign({}, DIST, { MX: { colors: { a: DIST.M04.colors.a.toUpperCase(), b: DIST.M04.colors.b.toUpperCase() } } });
    const hexOk = /^#[0-9a-f]{6}$/i.test(X.MX.colors.a);
    return RULES.ownColorProblems(X).some((s) => s.startsWith('MX ')) || 'no lo reporta (R11 acepta el formato: ' + hexOk + ')';
  });
  // REGLA: nameClashes no depende del orden de los distritos (mismos pares, sin importar quién va primero)
  prop('N-P1 nameClashes de los 8 distritos reales + nombres al azar da los mismos pares en cualquier orden de distritos',
    fc.tuple(fc.shuffledSubarray(M8, { minLength: 2 }), fc.array(fc.constantFrom('Ana', 'Hana', 'Ada', 'Amparo', 'Saúl', 'Sol', 'Ion', 'Iona', 'Gil', 'Gilda', 'Javi', 'Xavier', 'Carla', 'Karla'), { maxLength: 4 })), ([order, extra]) => {
      const base = Object.fromEntries(order.map((m) => [m, DIST[m]])); base.MX = { mentors: extra.map((name) => ({ name })), apprentices: [] };
      const rev = Object.fromEntries(Object.entries(base).reverse());
      const canon = (list) => list.map((s) => s.includes('/') ? s.split('/').sort().join('/') : s).sort();
      assert.deepStrictEqual(canon(RULES.nameClashes(rev)), canon(RULES.nameClashes(base)));
      return true;
    });

  // =================== G. guardados hostiles en los distritos nuevos ===================
  // FUZZ: posiciones guardadas en M04/M06/M07 (cerca de edificios, torre, salida, bordes y tipos raros): la carga queda en la escena, dentro de los bounds
  // menos el radio, fuera de toda caja, fuera de la salida, yaw en [0, 2π) y es idempotente
  const BOX = Object.fromEntries(NEW.map((m) => [m, CM.boxesFor(D8, m)])), TAU = Math.PI * 2;
  const NUMS = [NaN, Infinity, -Infinity, -0, 1e308, -1e308, '5', null, [], {}, true];
  campaign('G-F normalizeCity con scene M04/M06/M07 y posiciones hostiles', (r) => {
    const m = pick(r, NEW), M = DIST[m], bs = CM.layoutBuildings(M), t = r();
    let x, z;
    if (t < 0.35) { const b = pick(r, bs); x = b.x + (r() - 0.5) * (b.w + 2); z = b.z + (r() - 0.5) * (b.d + 2); }
    else if (t < 0.5) { x = M.exit.x + (r() - 0.5) * 8; z = M.exit.z + (r() - 0.5) * 4; }
    else if (t < 0.6) { x = M.tower.x + (r() - 0.5) * 10; z = M.tower.z + (r() - 0.5) * 10; }
    else if (t < 0.8) { x = (r() - 0.5) * 200; z = (r() - 0.5) * 200; }
    else { x = r() < 0.5 ? pick(r, NUMS) : (r() - 0.5) * 120; z = r() < 0.5 ? pick(r, NUMS) : (r() - 0.5) * 130; }
    return { m, at: { x, z, yaw: r() < 0.2 ? pick(r, NUMS) : (r() - 0.5) * 1e4 } };
  }, ({ m, at }) => {
    const C = CS.normalizeCity({ prologue: true, scene: m, at }, D8, null, TODAY), a = C.at, B = DIST[m].bounds;
    if (C.scene !== m) return 'escena ' + C.scene;
    if (!(a.x >= B.minX + R - EPS && a.x <= B.maxX - R + EPS && a.z >= B.minZ + R - EPS && a.z <= B.maxZ - R + EPS)) return 'fuera de bounds';
    if (insideBox(a.x, a.z, R, BOX[m])) return 'dentro de una caja';
    if (CM.portalAt(D8, m, a.x, a.z) !== null) return 'carga en la salida';
    if (!(typeof a.yaw === 'number' && a.yaw >= 0 && a.yaw < TAU) || Object.is(a.yaw, -0)) return 'yaw ' + a.yaw;
    const C2 = CS.normalizeCity(JSON.parse(JSON.stringify(C)), D8, null, TODAY);
    if (safeStr(C2.at) !== safeStr(a) || C2.scene !== m) return 'no idempotente';
    return null;
  });
  // REGLA: aislamiento entre distritos: cambiar d[X] (con ids de cualquier distrito, M04/M06/M07 comparten a01…, r01…) nunca cambia d[Y] ni restored[Y]
  const allIds = M8.flatMap((m) => [...DIST[m].creatures, ...DIST[m].repairs, ...DIST[m].apprentices].map((o) => o.id));
  const entryArb = fc.record({ beaten: fc.dictionary(fc.constantFrom(...allIds), fc.constantFrom(TODAY, '2026-01-01', true)), repairs: fc.dictionary(fc.constantFrom(...allIds), fc.constant(true)), taught: fc.dictionary(fc.constantFrom(...allIds), fc.constant(true)) }, { requiredKeys: [] });
  prop('G-P1 cambiar d[X] no cambia d[Y] ni restored[Y] (8 distritos, ids compartidos)', fc.tuple(fc.dictionary(fc.constantFrom(...M8), entryArb), fc.constantFrom(...M8), entryArb, fc.subarray(M8)), ([d0, X, ex0, boss]) => {
    const d = JSON.parse(JSON.stringify(d0)), ex = JSON.parse(JSON.stringify(ex0));   // como un guardado real (JSON.parse): fc.dictionary puede dar objetos sin prototipo
    const bf = (m) => boss.includes(m), A = CS.normalizeCity({ prologue: true, d }, D8, bf, TODAY);
    const d2 = Object.assign({}, d, { [X]: ex }), B2 = CS.normalizeCity({ prologue: true, d: d2 }, D8, bf, TODAY);
    for (const Y of M8) if (Y !== X) { assert.deepStrictEqual(B2.d[Y], A.d[Y], Y); assert.strictEqual(B2.restored[Y], A.restored[Y], 'restored ' + Y); }
    return true;
  });
  // ATAQUE: guardado con __proto__ apuntando a progreso completo de M04/M06/M07 (en d, en d.M04 y en taught): nada se hereda ni se restaura
  await attack('G1 __proto__ en d / d.M0x / taught con todo enseñado: los distritos nuevos quedan vacíos y sin restaurar', () => {
    const bad = [];
    for (const m of NEW) {
      const full = '{' + DIST[m].apprentices.map((a) => '"' + a.id + '":true').join(',') + '}';
      for (const s of ['{"prologue":true,"d":{"__proto__":{"' + m + '":{"taught":' + full + '}}}}', '{"prologue":true,"d":{"' + m + '":{"__proto__":{"taught":' + full + '}}}}',
        '{"prologue":true,"d":{"' + m + '":{"taught":{"__proto__":' + full + '}}},"restored":{"__proto__":{"' + m + '":true}}}', '{"prologue":true,"__proto__":{"d":{"' + m + '":{"taught":' + full + '}}}}']) {
        const C = CS.normalizeCity(JSON.parse(s), D8, () => true, TODAY);
        if (safeStr(C.d[m]) !== '{"beaten":{},"repairs":{},"taught":{}}' || CS.restoredIds(C, D8).includes(m) || CS.rankOf(C, D8) !== D8.ranks[0][1]) bad.push(m + ' con ' + s.slice(0, 60));
        CS.mirror(C); if (({}).taught !== undefined || ({})[m] !== undefined) bad.push('prototipo contaminado');
      }
    }
    return bad.length === 0 || bad.slice(0, 4).join(' | ');
  });

  // =================== R. alcanzabilidad ===================
  // BFS en rejilla de 0,2 m con el radio del héroe sobre boxesFor (edificios con la semilla real, torre y borde del mundo)
  function reachable(sceneId) {
    const sc = CM.scene(D8, sceneId), B = sc.bounds, h = 0.2, nx = Math.floor((B.maxX - B.minX) / h) + 1, nz = Math.floor((B.maxZ - B.minZ) / h) + 1;
    const blocked = new Uint8Array(nx * nz), seen = new Uint8Array(nx * nz), boxes = CM.boxesFor(D8, sceneId);
    const X = (i) => B.minX + i * h, Z = (j) => B.minZ + j * h;
    for (const b of boxes) {
      const i0 = Math.max(0, Math.floor((b.minX - R - B.minX) / h)), i1 = Math.min(nx - 1, Math.ceil((b.maxX + R - B.minX) / h));
      const j0 = Math.max(0, Math.floor((b.minZ - R - B.minZ) / h)), j1 = Math.min(nz - 1, Math.ceil((b.maxZ + R - B.minZ) / h));
      for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) if (insideBox(X(i), Z(j), R, [b])) blocked[i * nz + j] = 1;
    }
    const e = sc.entry, si = Math.round((e.x - B.minX) / h), sj = Math.round((e.z - B.minZ) / h), q = [si * nz + sj];
    if (blocked[q[0]]) return null;
    seen[q[0]] = 1;
    while (q.length) {
      const c = q.pop(), i = Math.floor(c / nz), j = c % nz;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const a = i + di, b = j + dj; if (a < 0 || b < 0 || a >= nx || b >= nz) continue;
        const k = a * nz + b; if (!seen[k] && !blocked[k]) { seen[k] = 1; q.push(k); }
      }
    }
    return { near(x, z, r) { const rr = r - h; for (let i = Math.max(0, Math.floor((x - r - B.minX) / h)); i <= Math.min(nx - 1, Math.ceil((x + r - B.minX) / h)); i++) for (let j = Math.max(0, Math.floor((z - r - B.minZ) / h)); j <= Math.min(nz - 1, Math.ceil((z + r - B.minZ) / h)); j++) if (seen[i * nz + j] && Math.hypot(X(i) - x, Z(j) - z) <= rr) return true; return false; },
      inRect(o) { const b = aabb(o); for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) if (seen[i * nz + j] && X(i) >= b.minX && X(i) <= b.maxX && Z(j) >= b.minZ && Z(j) <= b.maxZ) return true; return false; } };
  }
  // ATAQUE: un mentor, criatura, reparación, aprendiz, la puerta de la torre o la salida encerrados por edificios (pasan R7 pero no se alcanzan)
  for (const m of M8) await attack('R1 ' + m + ': desde la entrada se llega a ' + NEAR + ' m de cada interactuable y de la puerta, y se pisa la salida', () => {
    const G = reachable(m); if (!G) return 'la entrada está bloqueada';
    const M = DIST[m], door = CM.door(M.tower);
    const pts = [...M.mentors, ...M.repairs, ...M.apprentices, ...M.creatures.map((c) => ({ id: c.id, x: c.area.x, z: c.area.z })), { id: 'puerta', x: door.x, z: door.z }, ...(M.route ? M.route.pads.map((p, i) => ({ id: 'pad' + i, x: p.x, z: p.z })) : [])];
    const bad = pts.filter((p) => !G.near(p.x, p.z, NEAR)).map((p) => p.id);
    if (!G.inRect(M.exit)) bad.push('salida');
    return bad.length === 0 || 'inalcanzables: ' + bad.join(',');
  });
  // ATAQUE: con los 3 portales nuevos abiertos (ya no son muros), cada boca abierta se pisa desde la entrada de la plaza y Iris/Espejo se alcanzan
  await attack('R2 plaza: cada portal abierto se pisa desde la entrada; Iris y el Espejo a ' + NEAR + ' m', () => {
    const G = reachable('plaza'); if (!G) return 'entrada bloqueada';
    const bad = D8.plaza.portals.filter((p) => hasOwn(DIST, p.dist) && !G.inRect(p)).map((p) => p.dist);
    for (const q of [D8.plaza.director, D8.plaza.mirror]) if (!G.near(q.x, q.z, NEAR)) bad.push(q.id);
    return bad.length === 0 || 'inalcanzables: ' + bad.join(',');
  });

  finish();
})().catch((e) => { console.error('ERROR FATAL', e); process.exit(1); });

function finish() {
  const fails = results.filter((r) => r[0] === 'FAIL');
  for (const [s, n, x] of results) console.log(s + '  ' + n + (x ? '\n      ' + x : ''));
  console.log(`\nataques=${attacks} propiedades=${props}×${RUNS} fuzz=${fuzzTotal} entradas | ${results.length - fails.length} PASS, ${fails.length} FAIL`);
  process.exit(fails.length ? 1 : 0);
}
