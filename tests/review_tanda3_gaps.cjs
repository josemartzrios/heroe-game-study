// Huecos de cobertura de la Tanda 3 (revisión; no repite tanda3_feasibility, tanda3_attack, tanda3_plan_attack, city_layout ni district_rules_test):
//  1. makeLayout como unidad: oráculo por propiedades del reparto voraz (separación, maximalidad y orden de recorrido) con fast-check, y bordes
//     (distancia justo igual a min, calles vacías, rangos invertidos, paso que no cae en el extremo, agotamiento repetido, copias en take()).
//  2. people(): listas vacías, más de 99 personajes, no muta la entrada, el área pisa un `area` previo y el error de lugares se propaga.
//  3. standardFrame(): la lista completa de lugares es determinista, cada lugar va en una calle y fuera de las manzanas, y alcanza para el
//     distrito más grande con ese marco (calculado desde los datos).
//  4. Datos de todos los distritos: etiquetas de reparación y celebraciones distintas, colores en minúsculas (district_rules compara colores
//     con ===: "#FF5CA8" escaparía a ownColorProblems) y color propio también sin distinguir mayúsculas.
//  5. district_rules: bordes (nombre vacío, mismo nombre exacto heredado, ñ, k = 3 justo, un distrito solo, repetidos triples).
//  6. Motor real (jsdom): un guardado de la Tanda 2 (solo los distritos de antes) entra con el rango y el objetivo correctos y guarda los nuevos
//     vacíos; cada distrito nuevo se entra con su % en el HUD; la celebración del 6.º, 7.º, 8.º y de los nuevos a la vez en el motor completo.
const { JSDOM, VirtualConsole } = require('jsdom');
const fc = require('fast-check');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const L = require('./adv/lib.cjs');
const DR = require('./district_rules.cjs');
const CS = require('../city/story.js');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'juego_estudio.html'), 'utf8');
const KEY = 'estudio_isw_v1';
const SEED = 20261120;
const results = [];
const ok = (name, cond, extra) => { results.push([cond ? 'PASS' : 'FAIL', name, cond ? '' : (extra || '')]); };
const imp = (rel) => import(pathToFileURL(path.join(root, rel)).href);
const clone = (o) => JSON.parse(JSON.stringify(o));
const drain = (lay) => { const pts = []; let err = null; try { for (;;) pts.push(lay.take()); } catch (e) { err = e; } return { pts, err }; };
const prop = (name, arb, fn) => {
  const r = fc.check(fc.property(arb, fn), { numRuns: 300, seed: SEED });
  ok('P: ' + name + ' (300 casos, semilla ' + SEED + ')', !r.failed, r.failed ? JSON.stringify(r.counterexample).slice(0, 400) : '');
};

// ---------- jsdom (mismo arranque que tests/city_progress.cjs) ----------
function boot(seed) {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => errors.push('jsdomError: ' + (e.detail && e.detail.stack ? String(e.detail.stack).split('\n').slice(0, 2).join(' ') : (e.detail || e.message))));
  vc.on('error', (...a) => errors.push('console.error: ' + a.map(String).join(' ')));
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.test/', virtualConsole: vc,
    beforeParse(w) {
      if (seed != null) w.localStorage.setItem(KEY, JSON.stringify(seed));
      w.scrollTo = () => {};
      w.__CITY_TEST__ = true;
      const fake = (el) => new Proxy({ canvas: el }, { get(t, k) { if (k in t) return t[k]; if (k === 'measureText') return () => ({ width: 0 }); return () => {}; }, set(t, k, v) { t[k] = v; return true; } });
      w.HTMLCanvasElement.prototype.getContext = function () { return fake(this); };
      const q = [];
      w.requestAnimationFrame = (cb) => { q.push(cb); return q.length; };
      w.cancelAnimationFrame = () => { q.length = 0; };
    },
  });
  return { dom, w: dom.window, d: dom.window.document, errors };
}
const base = (o = {}) => Object.assign({ v: 1, xp: 1000, days: { last: null, count: 0 }, session: 1, lastActive: 0, topics: {}, qs: {}, boss: {}, hero: { name: 'H' } }, o);
const set = (ids) => Object.fromEntries(ids.map((id) => [id, true]));
const text = (e, sel) => (e.d.querySelector(sel) || {}).textContent || '';
function answerRight(w, d) { const q = L.findQ(w, d); L.click(w, L.optBtn(d, L.correctText(q))); }
const nextQ = (w, d) => { const b = d.querySelector('#nextbtn'); if (b) L.click(w, b); };
const enterCity = async (e) => { L.click(e.w, e.d.querySelector('[data-act="city"]')); for (let i = 0; i < 20; i++) await new Promise((r) => setTimeout(r, 0)); };

(async () => {
  const { makeLayout, people, standardFrame } = await imp('city/layout.mjs');
  const D = (await imp('city/districts.mjs')).city;
  const MIDS = Object.keys(D.districts), TOTAL = MIDS.length;

  // =================== 1. makeLayout ===================
  // Candidatos en el orden documentado (filas de calle y luego columnas), para el oráculo por propiedades.
  const candidates = (o) => {
    const step = o.step == null ? 8 : o.step, out = [];
    for (const z of o.streetZ) for (let x = o.xRange[0]; x <= o.xRange[1]; x += step) out.push({ x, z });
    for (const x of o.streetX) for (let z = o.zRange[0]; z >= o.zRange[1]; z -= step) out.push({ x, z });
    return out;
  };
  const cfgArb = fc.record({
    streetX: fc.array(fc.integer({ min: -30, max: 30 }), { maxLength: 3 }),
    streetZ: fc.array(fc.integer({ min: -30, max: 30 }), { maxLength: 3 }),
    xRange: fc.tuple(fc.integer({ min: -30, max: 0 }), fc.integer({ min: 0, max: 30 })),
    zRange: fc.tuple(fc.integer({ min: 0, max: 30 }), fc.integer({ min: -30, max: 0 })),
    step: fc.integer({ min: 1, max: 10 }),
    min: fc.integer({ min: 0, max: 12 }),
    reserve: fc.array(fc.tuple(fc.integer({ min: -30, max: 30 }), fc.integer({ min: -30, max: 30 })), { maxLength: 3 })
  });
  // Mapea cada lugar entregado a su índice de candidato (subsecuencia en orden); -1 si no se puede.
  const indexOf = (cands, pts) => { const idx = []; let k = 0; for (const p of pts) { while (k < cands.length && !(cands[k].x === p.x && cands[k].z === p.z)) k++; if (k >= cands.length) return null; idx.push(k++); } return idx; };
  prop('makeLayout: los lugares salen en el orden de recorrido (filas y luego columnas) y son candidatos', cfgArb, (o) => indexOf(candidates(o), drain(makeLayout(o)).pts) !== null);
  prop('makeLayout: todo par de lugares y todo lugar frente a cada reserva quedan a >= min', cfgArb, (o) => {
    const { pts } = drain(makeLayout(o));
    return pts.every((p, i) => pts.every((q, j) => i === j || Math.hypot(p.x - q.x, p.z - q.z) >= o.min) && o.reserve.every(([x, z]) => Math.hypot(p.x - x, p.z - z) >= o.min));
  });
  prop('makeLayout: es maximal (cada candidato descartado choca con una reserva o con un lugar tomado antes)', cfgArb, (o) => {
    const cands = candidates(o), pts = drain(makeLayout(o)).pts, idx = indexOf(cands, pts);
    if (!idx) return false;
    const chosen = new Set(idx);
    return cands.every((c, i) => chosen.has(i) || o.reserve.some(([x, z]) => Math.hypot(c.x - x, c.z - z) < o.min)
      || idx.some((j, n) => j < i && Math.hypot(c.x - pts[n].x, c.z - pts[n].z) < o.min));
  });
  prop('makeLayout: al agotarse lanza "faltan lugares" y sigue lanzando en cada llamada', cfgArb, (o) => {
    const lay = makeLayout(o), { err } = drain(lay);
    let again = null; try { lay.take(); } catch (e) { again = e; }
    return !!err && /faltan lugares/.test(err.message) && !!again && /faltan lugares/.test(again.message);
  });

  { const lay = makeLayout({ streetX: [], streetZ: [0], xRange: [0, 7], zRange: [0, 0], step: 7, min: 7 });
    const { pts } = drain(lay);
    ok('makeLayout: un lugar a distancia exactamente igual a min sí entra (>= min)', pts.length === 2 && pts[1].x === 7, JSON.stringify(pts)); }
  { const { pts } = drain(makeLayout({ streetX: [], streetZ: [0], xRange: [0, 7], zRange: [0, 0], step: 7, min: 7.0001 }));
    ok('makeLayout: un lugar a una pizca menos de min queda fuera', pts.length === 1, JSON.stringify(pts)); }
  { const { pts, err } = drain(makeLayout({ streetX: [], streetZ: [], xRange: [-50, 50], zRange: [50, -50] }));
    ok('makeLayout: sin calles no hay lugares y el primer take() ya lanza', pts.length === 0 && err && /faltan lugares/.test(err.message), JSON.stringify(pts)); }
  { const { pts } = drain(makeLayout({ streetX: [0], streetZ: [], xRange: [0, 0], zRange: [-8, 8] }));
    ok('makeLayout: zRange de menor a mayor (invertido) no da lugares en las columnas', pts.length === 0, JSON.stringify(pts)); }
  { const { pts } = drain(makeLayout({ streetX: [], streetZ: [5], xRange: [8, 0] }));
    ok('makeLayout: xRange invertido no da lugares en las filas', pts.length === 0, JSON.stringify(pts)); }
  { const { pts } = drain(makeLayout({ streetX: [], streetZ: [0], xRange: [0, 20] }));
    ok('makeLayout: con paso por defecto (8) que no cae en el extremo, ningún lugar pasa de xRange[1]', JSON.stringify(pts.map((p) => p.x)) === '[0,8,16]', JSON.stringify(pts)); }
  { const { pts } = drain(makeLayout({ streetX: [0], streetZ: [0], xRange: [0, 0], zRange: [0, -16] }));
    ok('makeLayout: el cruce de una fila y una columna no se entrega dos veces', JSON.stringify(pts) === '[{"x":0,"z":0},{"x":0,"z":-8},{"x":0,"z":-16}]', JSON.stringify(pts)); }
  { const { pts } = drain(makeLayout({ reserve: [[0, 0], [0, 0]], streetX: [], streetZ: [0], xRange: [0, 16] }));
    ok('makeLayout: una reserva repetida no cambia el resultado', JSON.stringify(pts.map((p) => p.x)) === '[8,16]', JSON.stringify(pts)); }
  { const lay = makeLayout({ streetX: [], streetZ: [0], xRange: [0, 16] }), a = lay.take();
    a.x = 999; a.z = 999;
    const b = lay.take(), again = drain(makeLayout({ streetX: [], streetZ: [0], xRange: [0, 16] })).pts;
    ok('makeLayout: mutar el punto devuelto por take() no cambia los siguientes lugares ni otro reparto igual', b.x === 8 && b.z === 0 && again[0].x === 0, JSON.stringify([b, again])); }

  // =================== 2. people() ===================
  { let takes = 0; const lay = { take() { takes++; return { x: 0, z: 0 }; } };
    const P = people(lay, { mentors: [], creatures: [], repairs: [], apprentices: [] });
    ok('people(): con las cuatro listas vacías devuelve cuatro arreglos vacíos y no toma lugares', takes === 0 && Object.keys(P).join() === 'mentors,creatures,repairs,apprentices' && Object.values(P).every((a) => Array.isArray(a) && a.length === 0), JSON.stringify(P)); }
  { let n = 0; const lay = { take() { n++; return { x: n, z: 0 }; } };
    const names = Array.from({ length: 101 }, (_, i) => 'Persona' + i);
    const P = people(lay, { mentors: names, creatures: [], repairs: [], apprentices: [] });
    const ids = P.mentors.map((m) => m.id);
    ok('people(): con más de 99 mentores los ids siguen únicos (m99, m100, m101) y el tema va igual (T100)', new Set(ids).size === 101 && ids[98] === 'm99' && ids[99] === 'm100' && ids[100] === 'm101' && P.mentors[99].topic === 'T100', ids.slice(97).join()); }
  { const lay = { n: 0, take() { this.n++; return { x: this.n, z: -this.n }; } };
    const input = { mentors: ['Úrsula 🙂'], creatures: [{ id: 'c', name: 'C', topics: ['T01', 'T02'], area: { x: 1, z: 1, r: 99 }, extra: 'se queda' }], repairs: [['T01', 'el árbol "raro" <b>']], apprentices: [['Ñandú', 'T01', 'correct', 'sobra']] };
    const before = clone(input), P = people(lay, input);
    ok('people(): no muta las listas de entrada', JSON.stringify(input) === JSON.stringify(before), JSON.stringify(input));
    ok('people(): el área de la criatura pisa un `area` previo (r 6, lugar tomado) y conserva sus otros campos', JSON.stringify(P.creatures[0].area) === '{"x":2,"z":-2,"r":6}' && P.creatures[0].extra === 'se queda' && P.creatures[0] !== input.creatures[0], JSON.stringify(P.creatures[0]));
    ok('people(): nombres y etiquetas con acentos, emojis y comillas pasan tal cual; un 4.º campo del aprendiz se ignora', P.mentors[0].name === 'Úrsula 🙂' && P.repairs[0].label === 'el árbol "raro" <b>' && JSON.stringify(P.apprentices[0]) === JSON.stringify({ id: 'a01', topic: 'T01', name: 'Ñandú', mode: 'correct', x: 4, z: -4 }), JSON.stringify(P)); }
  { const lay = makeLayout({ streetX: [], streetZ: [0], xRange: [0, 8] });   // 2 lugares para 3 personajes
    let err = null; try { people(lay, { mentors: ['Abel', 'Bea'], creatures: [], repairs: [], apprentices: [['Coco', 'T01', 'explain']] }); } catch (e) { err = e; }
    ok('people(): si faltan lugares propaga el error de makeLayout', err && /faltan lugares/.test(err.message), String(err)); }
  { const mk = () => { const seen = []; return { seen, take() { seen.push(seen.length); return { x: seen.length, z: 0 }; } }; };
    const args = { mentors: ['Abel'], creatures: [{ id: 'c', name: 'C', topics: ['T01'] }], repairs: [['T01', 'el x']], apprentices: [['Coco', 'T01', 'explain']] };
    const rev = { apprentices: args.apprentices, repairs: args.repairs, creatures: args.creatures, mentors: args.mentors };
    ok('people(): el orden de las claves del argumento no cambia el orden de los lugares', JSON.stringify(people(mk(), args)) === JSON.stringify(people(mk(), rev))); }

  // =================== 3. standardFrame() ===================
  const F = standardFrame(), all = drain(F.lay).pts, all2 = drain(standardFrame().lay).pts;
  ok('standardFrame(): la lista completa de lugares es la misma en cada llamada (' + all.length + ' lugares)', all.length > 0 && JSON.stringify(all) === JSON.stringify(all2));
  ok('standardFrame(): cada lugar está sobre un eje de calle', all.every((p) => F.streets.x.includes(p.x) || F.streets.z.includes(p.z)), JSON.stringify(all.filter((p) => !(F.streets.x.includes(p.x) || F.streets.z.includes(p.z)))));
  ok('standardFrame(): ningún lugar queda dentro de una manzana (20 × 20)', all.every((p) => F.blocks.every(([bx, bz]) => !(Math.abs(p.x - bx) < 10 && Math.abs(p.z - bz) < 10))));
  ok('standardFrame(): todos los lugares quedan dentro de los límites del distrito', all.every((p) => p.x > F.bounds.minX && p.x < F.bounds.maxX && p.z > F.bounds.minZ && p.z < F.bounds.maxZ));
  ok('standardFrame(): ningún lugar cae en el rectángulo de la salida', all.every((p) => !(Math.abs(p.x - F.exit.x) <= F.exit.w / 2 && Math.abs(p.z - F.exit.z) <= F.exit.d / 2)));
  const frameKeys = ['tower', 'entry', 'exit', 'bounds', 'streets', 'blocks'];
  const usesFrame = MIDS.filter((id) => frameKeys.every((k) => JSON.stringify(D.districts[id][k]) === JSON.stringify(F[k])));
  const demand = (d) => d.mentors.length + d.creatures.length + d.repairs.length + d.apprentices.length;
  const biggest = usesFrame.reduce((a, id) => Math.max(a, demand(D.districts[id])), 0);
  ok('standardFrame(): alcanza para el distrito más grande con ese mismo marco (' + biggest + ' de ' + all.length + ' lugares; distritos ' + usesFrame.join(', ') + ')', usesFrame.length > 0 && biggest <= all.length);
  ok('standardFrame(): los distritos con ese marco ponen cada personaje en un lugar del marco y en uno distinto', usesFrame.every((id) => {
    const d = D.districts[id], P = [...d.mentors, ...d.repairs, ...d.apprentices, ...d.creatures.map((c) => c.area)].map((p) => p.x + ',' + p.z);
    const S = new Set(all.map((p) => p.x + ',' + p.z));
    return new Set(P).size === P.length && P.every((k) => S.has(k));
  }));

  // =================== 4. datos de todos los distritos ===================
  const labels = MIDS.flatMap((id) => D.districts[id].repairs.map((r) => [r.label.toLowerCase(), id]));
  const dupLabel = labels.filter(([l], i) => labels.findIndex(([m]) => m === l) !== i);
  ok('ninguna etiqueta de reparación se repite entre distritos (sin distinguir mayúsculas)', dupLabel.length === 0, dupLabel.map((x) => x.join('@')).join(' | '));
  const cel = MIDS.map((id) => D.districts[id].celebrate && D.districts[id].celebrate.text);
  ok('cada distrito tiene un texto de celebración propio y no vacío', cel.every((t) => typeof t === 'string' && t.trim().length > 0) && new Set(cel).size === cel.length, cel.join(' | '));
  const upper = MIDS.filter((id) => /[A-F]/.test(D.districts[id].colors.a + D.districts[id].colors.b));
  ok('los colores de todos los distritos van en minúsculas (ownColorProblems compara con ===)', upper.length === 0, upper.join(','));
  const lower = Object.fromEntries(MIDS.map((id) => [id, { colors: { a: D.districts[id].colors.a.toLowerCase(), b: D.districts[id].colors.b.toLowerCase() } }]));
  ok('cada distrito tiene un color propio también sin distinguir mayúsculas', DR.ownColorProblems(lower).length === 0, DR.ownColorProblems(lower).join(' | '));
  const reach = D.ranks.filter((r) => r[0] <= TOTAL).pop()[1];
  const RANK_AT = { 8: 'Arquitecto', 9: 'Arquitecto', 10: 'Arquitecto' };   // esperado por número de distritos (tabla 0/1/3/6/8/11), independiente del código que se mide
  ok('con ' + TOTAL + ' distritos el rango máximo alcanzable es ' + RANK_AT[TOTAL] + ' (spec), y coincide con el rankName real de story.js', RANK_AT[TOTAL] !== undefined && reach === RANK_AT[TOTAL] && reach === CS.rankName(TOTAL, D), reach);

  // =================== 5. district_rules: bordes ===================
  const P = (...names) => names.map((name) => ({ name }));
  const dist = (...ds) => Object.fromEntries(ds.map(([id, m, a, colors]) => [id, { mentors: P(...m), apprentices: P(...a), colors: colors || { a: '#111111', b: '#222222' } }]));
  ok('phon: el nombre vacío da forma vacía y no lanza', DR.phon('') === '');
  ok('nameClashes: un nombre vacío se reporta como de menos de 3 letras', DR.nameClashes(dist(['A', [''], []])).some((x) => /tiene menos de 3 letras/.test(x)));
  ok('nameClashes: la excepción heredada es solo para el par Carla/Karla: Carla dos veces sí se reporta', DR.nameClashes(dist(['A', ['Carla'], []], ['B', ['Carla'], []])).length === 1);
  ok('nameClashes: Elena/Helena con otra grafía (elena en minúscula) ya no es la excepción heredada', DR.nameClashes(dist(['A', ['elena'], []], ['B', ['Helena'], []])).length === 1);
  ok('namesNear: la ñ cuenta como n (Iñaki/Inaki se parecen)', DR.namesNear('Iñaki', 'Inaki'));
  ok('namesNear: con k = 3 justo (forma de 3 letras) un prefijo común basta (Ion/Ione)', DR.namesNear('Ion', 'Ione') && !DR.namesNear('Ion', 'Ian'));
  ok('namesNear: dos formas de 2 letras distintas no se parecen (k = 2 < 3)', !DR.namesNear('Al', 'Ab'));
  ok('ownColorProblems: un solo distrito o ninguno no da problemas', DR.ownColorProblems(dist(['A', [], []])).length === 0 && DR.ownColorProblems({}).length === 0);
  ok('ownColorProblems: un distrito con a === b propio no da problema', DR.ownColorProblems(dist(['A', [], [], { a: '#123456', b: '#123456' }], ['B', [], [], { a: '#111111', b: '#222222' }])).length === 0);
  ok('repeated: tres valores iguales se reportan dos veces y una lista vacía no reporta nada', JSON.stringify(DR.repeated({ A: { seed: 1 }, B: { seed: 1 }, C: { seed: 1 } }, 'seed')) === '[1,1]' && DR.repeated({}, 'seed').length === 0);
  ok('repeated: 0 y "0" no son el mismo valor', DR.repeated({ A: { seed: 0 }, B: { seed: '0' } }, 'seed').length === 0);

  // =================== 6. motor real (jsdom) ===================
  const NEW = ['M04', 'M06', 'M07'].filter((m) => D.districts[m]);                 // el alcance de la Tanda 3
  const SEQ = D.order.filter((m) => D.districts[m]), OLD = SEQ.slice(0, SEQ.indexOf(NEW[0])), AFTER = SEQ.slice(SEQ.indexOf(NEW[NEW.length - 1]) + 1);   // los de antes, y los que se registraron después de esta tanda
  const RK = D.ranks, rkName = (n) => RK.reduce((nm, r) => (n >= r[0] ? r[1] : nm), RK[0][1]);
  const passed = (mids) => Object.fromEntries(mids.map((m) => [m, { best: 18, passed: true }]));
  const firstN = (mid, n) => D.districts[mid].apprentices.slice(0, n).map((a) => a.id);
  const full = (mid) => ({ taught: set(firstN(mid, D.districts[mid].need)) });
  const almost = (mid) => ({ taught: set(firstN(mid, D.districts[mid].need - 1)) });
  const winBoss = (e, mid) => {   // gana el jefe con la ciudad cerrada (con los aprendices ya enseñados la restauración queda pendiente) y vuelve al inicio
    const qs = e.w.eval('MODULES').find((m) => m.id === mid).questions.filter((x) => x.type === 'mcq').slice(0, 20);
    e.w.__CITY_ROUND__.startRound({ kind: 'boss', title: 'Jefe', mid, back: { name: 'home' } }, qs);
    let g = 0; while (e.d.querySelector('.prompt') && g++ < 30) { answerRight(e.w, e.d); nextQ(e.w, e.d); }
    L.click(e.w, e.d.querySelector('[data-act="back"]'));
  };
  const wantLine = (n, k) => {
    if (rkName(n) !== rkName(n - k)) return 'Subes a ' + rkName(n) + '.';
    const next = RK.find((r) => r[0] > n && r[0] <= TOTAL);
    if (!next) return 'Sigues como ' + rkName(n) + '. Llevas ' + n + ' de ' + TOTAL + ' distritos restaurados.';
    const miss = next[0] - n;
    return 'Sigues como ' + rkName(n) + ': ' + (miss === 1 ? 'te falta 1 distrito' : 'te faltan ' + miss + ' distritos') + ' para ' + next[1] + '.';
  };
  ok('hay distritos nuevos de la Tanda 3 registrados y van después de los de antes en el orden de la plaza', NEW.length > 0 && SEQ.slice(OLD.length, OLD.length + NEW.length).join() === NEW.join(), SEQ.join());

  // 6a. Guardado de la Tanda 2: solo los distritos de antes, todos restaurados, con progreso suelto en uno
  { const d = {}; OLD.forEach((m) => { d[m] = full(m); });
    const withRep = OLD.find((m) => D.districts[m].repairs.length && !D.districts[m].route);
    d[withRep].repairs = { [D.districts[withRep].repairs[0].id]: true };
    const firstNew = SEQ[OLD.length], aid = D.districts[firstNew].apprentices[0].id, FN = D.districts[firstNew];
    const e = boot(base({ boss: passed(OLD), city: { prologue: true, scene: firstNew, at: { x: FN.entry.x, z: FN.entry.z, yaw: 0 }, d, restored: set(OLD) } }));
    await enterCity(e); e.w.__CITY_TEST_API__.teach(aid);   // se enseña con la ciudad abierta en ese distrito y se guarda
    const s = JSON.parse(e.w.localStorage.getItem(KEY)).city;
    ok('Tanda 2 → 3: tras guardar, el progreso de los distritos de antes queda igual', OLD.every((m) => JSON.stringify(s.d[m].taught) === JSON.stringify(d[m].taught) && JSON.stringify(s.d[m].repairs) === JSON.stringify(d[m].repairs || {})), JSON.stringify(s.d).slice(0, 400));
    ok('Tanda 2 → 3: los distritos nuevos existen en el guardado; el primero solo con el aprendiz enseñado y el resto vacíos', JSON.stringify(s.d[firstNew].taught) === JSON.stringify({ [aid]: true })
      && NEW.every((m) => s.d[m] && JSON.stringify(s.d[m].beaten) === '{}' && JSON.stringify(s.d[m].repairs) === '{}' && (m === firstNew || JSON.stringify(s.d[m].taught) === '{}')), JSON.stringify(NEW.map((m) => s.d[m])));
    ok('Tanda 2 → 3: restored conserva exactamente los distritos de antes', JSON.stringify(Object.keys(s.restored).sort()) === JSON.stringify(OLD.slice().sort()), JSON.stringify(s.restored));
    e.w.close();
    const e2 = boot(base({ boss: passed(OLD), city: { prologue: true, scene: 'plaza', d, restored: set(OLD) } }));   // la plaza con el mismo guardado
    await enterCity(e2);
    ok('Tanda 2 → 3: el HUD muestra el rango de ' + OLD.length + ' distritos (' + rkName(OLD.length) + ')', text(e2, '#city-rank') === rkName(OLD.length), text(e2, '#city-rank'));
    ok('Tanda 2 → 3: el HUD dice "Distritos ' + OLD.length + ' de ' + TOTAL + '"', text(e2, '#city-rest') === 'Distritos ' + OLD.length + ' de ' + TOTAL, text(e2, '#city-rest'));
    ok('Tanda 2 → 3: el objetivo de la plaza manda al primer distrito nuevo (' + D.districts[firstNew].name + ')', text(e2, '#city-obj').includes('Entra a ' + D.districts[firstNew].name), text(e2, '#city-obj'));
    ok('Tanda 2 → 3: sin hoja de celebración al entrar (nada recién restaurado) y sin errores', !/restaurado/i.test(text(e2, '#city-sheet')) && e2.errors.length === 0, text(e2, '#city-sheet').slice(0, 160) + ' ' + e2.errors.join('|'));
    e2.w.close(); }

  // 6b. Cada distrito nuevo se carga en su escena con el % del HUD (0 %, 50 % con el jefe y el % con need − 1 enseñados)
  for (const m of NEW) {
    const M = D.districts[m], at = { x: M.entry.x, z: M.entry.z, yaw: 0 };
    const pct = (t, b) => Math.round(100 * (0.5 * t / M.need + 0.5 * (b ? 1 : 0)));
    for (const [label, boss, d, t, b] of [['sin progreso', {}, {}, 0, false], ['jefe aprobado', passed([m]), {}, 0, true], ['jefe y need − 1 enseñados', passed([m]), { [m]: almost(m) }, M.need - 1, true]]) {
      const e = boot(base({ boss, city: { prologue: true, scene: m, at, d } }));
      await enterCity(e);
      ok(m + ' (' + label + '): el HUD dice "' + M.name + ' ' + pct(t, b) + ' %" y sin errores', text(e, '#city-rest') === M.name + ' ' + pct(t, b) + ' %' && e.errors.length === 0, text(e, '#city-rest') + ' ' + e.errors.join('|'));
      e.w.close();
    }
  }

  // 6c. Celebración en el motor completo del n-ésimo restaurado de cada distrito nuevo y de todos los nuevos a la vez
  const scenario = async (done, pending) => {
    const d = {}; done.forEach((m) => { d[m] = full(m); }); pending.forEach((m) => { d[m] = full(m); });
    const e = boot(base({ boss: passed(done), city: { prologue: true, d } }));
    pending.forEach((m) => winBoss(e, m));
    await enterCity(e);
    const r = { t: text(e, '#city-sheet'), rank: text(e, '#city-rank'), rest: text(e, '#city-rest'), obj: text(e, '#city-obj'), errs: e.errors.slice() };
    e.w.close();
    return r;
  };
  for (const m of NEW) {
    const k = SEQ.indexOf(m) + 1, want = wantLine(k, 1), r = await scenario(SEQ.slice(0, k - 1), [m]);
    ok('celebración en el motor: el ' + k + '.º distrito (' + m + ') dice "' + want + '" y su texto', r.t.includes(want) && r.t.includes(D.districts[m].celebrate.text) && r.t.includes('¡Distrito restaurado!'), r.t.slice(0, 300));
    ok('celebración en el motor: tras el ' + k + '.º el HUD muestra ' + rkName(k) + ' y "Distritos ' + k + ' de ' + TOTAL + '" sin errores', r.rank === rkName(k) && r.rest === 'Distritos ' + k + ' de ' + TOTAL && r.errs.length === 0, r.rank + ' | ' + r.rest + ' | ' + r.errs.join('|'));
  }
  { const r = await scenario(OLD.concat(AFTER), NEW), want = wantLine(TOTAL, NEW.length);   // con todos los demás ya restaurados
    ok('celebración en el motor: los ' + NEW.length + ' nuevos a la vez (de ' + OLD.length + ' a ' + TOTAL + ') en una sola hoja: "' + want + '"', r.t.includes('¡Distritos restaurados!') && NEW.every((m) => r.t.includes(D.districts[m].name) && r.t.includes(D.districts[m].celebrate.text)) && r.t.includes(want), r.t.slice(0, 300));
    ok('con todos restaurados: rango ' + RANK_AT[TOTAL] + ', "Distritos ' + TOTAL + ' de ' + TOTAL + '" y la plaza dice "Ciudad al día"', r.rank === RANK_AT[TOTAL] && r.rest === 'Distritos ' + TOTAL + ' de ' + TOTAL && /Ciudad al día/.test(r.obj) && r.errs.length === 0, [r.rank, r.rest, r.obj, r.errs.join('|')].join(' | ')); }

  results.forEach((r) => console.log(r.join(' | ')));
  const fails = results.filter((r) => r[0] === 'FAIL').length;
  console.log(fails ? '\nREVIEW_TANDA3_GAPS ' + fails + ' FALLOS de ' + results.length : '\nREVIEW_TANDA3_GAPS OK (' + results.length + ' comprobaciones)');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('EXC', e && e.stack); process.exit(1); });
