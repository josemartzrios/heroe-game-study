// Ataque a lo IMPLEMENTADO en la Tanda 2 (git diff 21f2b89..HEAD): huecos que no cubren tanda2_attack.cjs ni tanda2_plan_attack.cjs.
//  S city/sprites2d.js real (vm + documento/contexto 2D falsos): setData con datos hostiles, fallo a mitad, order raro, miles de distritos, frame() hostil.
//  K city/check_district.mjs: R11 con colors de cualquier tipo (oráculo exacto) y checkPlaza con ORDER mutado.
//  T city/story.js: applyRestore/recommended frente a rankOf (claves propias), guardados de la Tanda 1 con __proto__/constructor.
//  V cityRankLine (extraída de city/view.js, idéntica a la de juego_estudio.html) con restored hostil + vista real en jsdom (celebraciones 3.º, 4.º y 5.º).
// Uso: node tests/adv/tanda2_impl_attack.cjs [RUNS=1000] [FUZZ_N=100000 por objetivo] [SEED=20261117] [MAX_S=60 por objetivo]   (código 1 si algo rompe)
const fc = require('fast-check');
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const { pathToFileURL } = require('url');
const { JSDOM, VirtualConsole } = require('jsdom');
const CS = require('../../city/story.js');
const L = require('./lib.cjs');

const RUNS = +(process.argv[2] || 1000), FUZZ_N = +(process.argv[3] || 100000), SEED = +(process.argv[4] || 20261117), MAX_MS = 1000 * +(process.argv[5] || 60);
const TODAY = '2026-11-17';
const root = path.join(__dirname, '..', '..');
const imp = (f) => import(pathToFileURL(path.join(root, f)).href);
const hasOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const results = [];
let attacks = 0, props = 0, fuzzTotal = 0;
const ok = (name, cond, extra) => results.push([cond ? 'PASS' : 'FAIL', name, cond ? '' : (extra || '')]);
const safeStr = (x) => { try { const s = JSON.stringify(x, (k, v) => (typeof v === 'number' && !isFinite(v)) ? String(v) : (typeof v === 'function' ? 'fn' : (typeof v === 'symbol' ? String(v) : v))); return (s === undefined ? String(x) : s).slice(0, 400); } catch (e) { return String(x); } };
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

// ---------- sprites2d real en vm ----------
const SPR_SRC = fs.readFileSync(path.join(root, 'city/sprites2d.js'), 'utf8');
function loadSprites() { const m = { exports: {} }; vm.runInNewContext(SPR_SRC, { module: m, Math, Object, Array, Error }); return m.exports; }
// documento falso: canvas que registra [fillStyle, x, y, w, h]; maxDim imita el tope de los navegadores (getContext → null si se pasa)
function fakeDoc(opts = {}) {
  const maxDim = opts.maxDim || Infinity, record = opts.record !== false;
  return { createElement() { const ops = []; const cv = { width: 0, height: 0, ops, getContext() { if (cv.width > maxDim || cv.height > maxDim) return null; const g = { fillStyle: '', fillRect(x, y, w, h) { if (record) ops.push([g.fillStyle, x, y, w, h]); }, clearRect() {}, drawImage() {} }; return g; } }; return cv; } };
}
const SP_NEW = (D, opts) => { const SP = loadSprites(); SP.init(fakeDoc(opts)); SP.setData(D); return SP; };
function creatureCell(SP, variant) {
  const f = SP.frame('creature', variant, 'down', 0);
  return f.img.ops.filter(([, x, y]) => x >= f.sx && x < f.sx + f.w && y >= f.sy && y < f.sy + f.h).map((o) => o[0]);
}
const PAL = ['#7a52c4', '#b06cff', '#5a3a9a', '#9a4fd8', '#8a5fe0', '#6a3fb0'];
const isRefLook = (cell) => cell.includes('#ffd23f') && PAL.includes(cell[1]);   // ojos amarillos y paleta morada
const hexOk = (c) => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c);

// ---------- cityRankLine real (view.js), cargada por tests/rankline.cjs ----------
const HTML_SRC = fs.readFileSync(path.join(root, 'juego_estudio.html'), 'utf8');
const { grabFn, SRC: RANKLINE_SRC, rankLineWith } = require('../rankline.cjs');

(async () => {
  const D5 = (await imp('city/districts.mjs')).city;
  const { checkDistrict, checkPlaza } = await imp('city/check_district.mjs');
  const { expandModule } = await imp('content_expand.mjs');
  const MIDS = Object.keys(D5.districts), DIST = D5.districts, MODULES = require('../modules.cjs');
  const MODS = {};
  for (const m of MIDS) MODS[m] = expandModule(m, MODULES[m].title, await imp(MODULES[m].file));
  const FIRST_WALL = D5.order.find((m) => !DIST[m]);   // el primer módulo del orden que todavía no tiene distrito (muro "Próximamente")

  const mkD = (districts, extra) => Object.assign({ ranks: D5.ranks, order: D5.order, radius: D5.radius, plaza: D5.plaza, districts }, extra || {});

  // =================== S. sprites2d ===================
  // ATAQUE: estado corrupto tras un setData que lanza: volver a los datos buenos anteriores es un no-op y quedan las listas a medias del malo
  await attack('S1 setData(bueno) → setData(malo, lanza) → setData(bueno) restaura las variantes', () => {
    const SP = SP_NEW(D5), before = SP.kinds.creature.slice(), beforeP = SP.kinds.person.slice();
    const bad = mkD(Object.assign({}, DIST, { M03: null }));
    let threw = false; try { SP.setData(bad); } catch (e) { threw = true; }
    SP.setData(D5);
    const same = safeStr(SP.kinds.creature) === safeStr(before) && safeStr(SP.kinds.person) === safeStr(beforeP);
    return same || 'lanzó=' + threw + '; tras volver a D5 hay ' + SP.kinds.creature.length + '/' + before.length + ' criaturas y ' + SP.kinds.person.length + '/' + beforeP.length + ' personas (frame cae a la variante 0 para las que faltan)';
  });
  // ATAQUE: un distrito null / mentors no-array: setData no debería lanzar (un distrito mal formado deja de tener sprites, no tumba la ciudad)
  await attack('S2 districts.M10 = null o mentors = {} no lanza en setData', () => {
    const errs = [];
    for (const over of [{ M10: null }, { M10: Object.assign({}, DIST.M10, { mentors: {} }) }, { M10: Object.assign({}, DIST.M10, { creatures: 'abc' }) }]) {
      try { SP_NEW(mkD(Object.assign({}, DIST, over))); } catch (e) { errs.push(safeStr(Object.keys(over).map((k) => over[k] && typeof over[k] === 'object' ? Object.keys(over[k]).filter((x) => ['mentors', 'creatures'].includes(x) && !Array.isArray(over[k][x])) : over[k])) + ': ' + e.message); }
    }
    return errs.length ? errs.join(' | ') : true;
  });
  // ATAQUE: D.order[0] que no es un distrito (p.ej. un muro "Próximamente" primero en ORDER): ningún distrito queda como referencia y M02 pierde su aspecto
  await attack('S3 order [muro, ...ORDER] (el primer módulo sin distrito primero): M02 conserva el aspecto de referencia', () => {
    const SP = SP_NEW(mkD(DIST, { order: [FIRST_WALL].concat(D5.order) }));
    const lost = DIST.M02.creatures.filter((c) => !isRefLook(creatureCell(SP, 'M02:' + c.id))).map((c) => c.id);
    return lost.length ? lost.length + '/' + DIST.M02.creatures.length + ' criaturas de M02 teñidas con ' + DIST.M02.colors.a + ' (ningún distrito es la referencia)' : true;
  });
  // ATAQUE: order que no es array ('M02' string → order[0] = 'M'; {0:'M02'} sin length)
  await attack('S4 order = "M02" (string): sigue habiendo exactamente un distrito de referencia', () => {
    const SP = SP_NEW(mkD(DIST, { order: 'M02' }));
    const refs = MIDS.filter((m) => DIST[m].creatures.every((c) => isRefLook(creatureCell(SP, m + ':' + c.id))));
    return refs.length === 1 || 'distritos con aspecto de referencia: ' + safeStr(refs);
  });
  // ATAQUE: contexto 2D falso que lanza en fillRect → frame lanza, pero el siguiente frame con un contexto sano (init de otro doc) funciona
  await attack('S7 contexto 2D que lanza: frame lanza una vez y un init(doc sano) recupera', () => {
    const SP = loadSprites(); SP.init({ createElement() { return { getContext() { return { fillRect() { throw new Error('gpu perdida'); } }; } }; } }); SP.setData(D5);
    let threw = false; try { SP.frame('creature', 'M03:' + DIST.M03.creatures[0].id, 'down', 0); } catch (e) { threw = true; }
    SP.init(fakeDoc());
    const f = SP.frame('creature', 'M03:' + DIST.M03.creatures[0].id, 'down', 0);
    return (threw && f.img.ops.length > 0) || 'threw=' + threw + ' ops=' + f.img.ops.length;
  });
  // ATAQUE: colors con tipos raros: String objeto, array, mayúsculas, \n final, 3 dígitos, Symbol, getter que lanza
  await attack('S8 colors raros: tinte solo con #rrggbb primitivo y nunca lanza (salvo getter hostil)', () => {
    const cases = [[{ a: new String('#ff0000'), b: '#00ff00' }, false], [['#ff0000', '#00ff00'], false], [{ a: '#FF00AA', b: '#00FF00' }, true], [{ a: '#ff0000\n', b: '#00ff00' }, false],
      [{ a: '#f00', b: '#0f0' }, false], [{ a: Symbol('x'), b: '#00ff00' }, false], [{ a: '#ff0000', b: '#00ff00', __proto__: null }, true], [Object.assign(Object.create({ a: '#ff0000', b: '#00ff00' })), true], ['#ff0000', false], [0, false]];
    const bad = [];
    cases.forEach(([colors, tinted], i) => {
      const SP = SP_NEW(mkD(Object.assign({}, DIST, { M03: Object.assign({}, DIST.M03, { colors }) })));
      const cell = creatureCell(SP, 'M03:' + DIST.M03.creatures[0].id), got = !isRefLook(cell);
      if (got !== tinted) bad.push('#' + i + ' tinte=' + got);
      if (got && cell[1] !== String(colors.a !== undefined ? colors.a : colors[0])) bad.push('#' + i + ' cuerpo=' + cell[1]);
    });
    return bad.length ? bad.join(', ') : true;
  });

  // REGLA: para datos con forma válida y colors arbitrarios, cada criatura no-referencia se pinta con colors.a (y acento colors.b) si y solo si ambos son #rrggbb; la referencia nunca se tiñe
  const colorArb = fc.oneof(fc.constantFrom('#000000', '#FFFFFF', '#a1B2c3', '#12162e', '#ffd23f'), fc.stringMatching(/^#[0-9a-fA-F]{5,7}$/), fc.string({ maxLength: 8 }), fc.integer(), fc.constant(null), fc.constant(undefined));
  const colorsArb = fc.oneof(fc.record({ a: colorArb, b: colorArb }, { requiredKeys: [] }), fc.constantFrom(null, undefined, [], 'x', 7));
  const distArb = fc.record({ nc: fc.integer({ min: 0, max: 9 }), nm: fc.integer({ min: 0, max: 4 }), colors: colorsArb });
  prop('S-P1 tinte ⇔ colors.a y colors.b #rrggbb (no referencia); forma = (ci + 3k) % 6', fc.tuple(fc.array(distArb, { minLength: 1, maxLength: 7 }), fc.option(fc.integer({ min: 0, max: 6 }), { nil: undefined })), ([ds, refi]) => {
    const districts = {}; ds.forEach((d, i) => { districts['D' + i] = { mentors: Array.from({ length: d.nm }, (_, j) => ({ id: 'm' + j })), apprentices: [], creatures: Array.from({ length: d.nc }, (_, j) => ({ id: 'c' + j })), colors: d.colors }; });
    const order = refi === undefined ? undefined : ['D' + (refi % ds.length)];
    const SP = SP_NEW({ order, districts }), ref = order ? order[0] : 'D0';
    ds.forEach((d, i) => { for (let j = 0; j < d.nc; j++) {
      const cell = creatureCell(SP, 'D' + i + ':c' + j), tint = 'D' + i !== ref && d.colors && hexOk(d.colors.a) && hexOk(d.colors.b);
      if (tint) { if (cell[1] !== d.colors.a || !cell.includes(d.colors.b) || !cell.includes('#ffffff')) throw new Error('D' + i + ':c' + j + ' sin su tinte ' + safeStr(cell)); }
      else if (!isRefLook(cell)) throw new Error('D' + i + ':c' + j + ' teñida sin colores válidos ' + safeStr(cell));
    } });
    return true;
  });
  // REGLA: frame() con kind/variant/face/step arbitrarios nunca lanza y el recorte cae dentro del atlas
  const anyKey = fc.oneof(fc.constantFrom('hero', 'person', 'creature', 'thing', '__proto__', 'constructor', 'toString', 'hasOwnProperty', 'valueOf', '', 'iris', 'lampOn', 'M03:' + DIST.M03.creatures[0].id, 'M01:' + DIST.M01.mentors[0].id), fc.string(), fc.integer(), fc.constant(null), fc.constant(undefined), fc.constant({}), fc.constant([]), fc.double());
  const SPF = SP_NEW(D5);
  prop('S-P2 frame(kind, variant, face, step) hostil: no lanza, recorte dentro del atlas', fc.tuple(anyKey, anyKey, anyKey, anyKey), ([k, v, f, s]) => {
    const r = SPF.frame(k, v, f, s);
    if (r.w !== 14 || r.h !== 14) throw new Error('tamaño');
    if (!(r.sx >= 0 && r.sy >= 0 && r.sx + r.w <= r.img.width && r.sy + r.h <= r.img.height)) throw new Error('recorte fuera ' + safeStr([r.sx, r.sy, r.img.width, r.img.height]));
    return true;
  });

  // =================== K. check_district / checkPlaza ===================
  const r11 = (c) => !(c && hexOk(c.a) && hexOk(c.b));
  // REGLA (oráculo): con los distritos reales y colors arbitrario, la salida es exactamente [R11] o [] según el oráculo
  prop('K-P1 checkDistrict: colors arbitrario → errores = R11 exacto según oráculo', fc.tuple(fc.constantFrom(...MIDS), fc.oneof(colorsArb, fc.anything())), ([m, colors]) => {
    const dist = Object.assign({}, DIST[m], { colors }), e = checkDistrict(dist, MODS[m]);
    const want = r11(colors) ? ['R11: ' + m + ': colors.a y colors.b deben ser colores #rrggbb'] : [];
    if (safeStr(e) !== safeStr(want)) throw new Error('errores=' + safeStr(e));
    return true;
  });
  // ATAQUE: ORDER con un distrito repetido (o '__proto__') pasa R9 sin error: el portal y la referencia de sprites dependen de ORDER
  await attack('K1 checkPlaza: ORDER con M02 repetido da un error R9', () => {
    const D = mkD(DIST, { order: ['M02'].concat(D5.order) }), e = checkPlaza(D);
    return e.some((x) => /^R9:/.test(x)) || 'sin error: ' + safeStr(e);
  });
  // ATAQUE: ORDER[0] no es un distrito existente (la referencia de los sprites queda vacía) pero ORDER tiene portal para todos
  await attack('K2 checkPlaza: ORDER y portales reordenados con un muro primero siguen siendo válidos (documenta S3)', () => {
    const D = mkD(DIST, { order: [FIRST_WALL].concat(D5.order.filter((m) => m !== FIRST_WALL)) }), e = checkPlaza(D);
    return e.length === 0 || 'checkPlaza ya lo rechaza: ' + safeStr(e);
  });
  // ATAQUE (fuzz): colors mutados byte a byte en todos los distritos → checkDistrict nunca lanza y R11 coincide con el oráculo
  const HEXCH = '0123456789abcdefABCDEFgG#xX \n\u0000‮٣０';
  campaign('K-F checkDistrict con colors mutados en todos los distritos', (r) => {
    const m = pick(r, MIDS), mut = (s) => { s = String(s); const t = r(); if (t < 0.3) return s; const i = Math.floor(r() * (s.length + 1)); if (t < 0.55) return s.slice(0, i) + pick(r, HEXCH) + s.slice(i + 1); if (t < 0.75) return s.slice(0, i) + pick(r, HEXCH) + s.slice(i); if (t < 0.9) return s.slice(0, i) + s.slice(i + 1); return pick(r, [null, 0, true, [], {}, undefined]); };
    const c = DIST[m].colors, colors = r() < 0.9 ? { a: mut(c.a), b: mut(c.b) } : pick(r, [null, [], 'x', 0, { a: c.a }]);
    return { m, colors };
  }, ({ m, colors }) => {
    const e = checkDistrict(Object.assign({}, DIST[m], { colors }), MODS[m]);
    const want = r11(colors) ? 1 : 0;
    if (e.length !== want || (want && !/^R11:/.test(e[0]))) return 'R11 discrepa: ' + safeStr(e);
    return null;
  });

  // =================== T. story.js ===================
  const ALLTRUE = (ids) => Object.fromEntries(ids.map((i) => [i, true]));
  // ATAQUE: rankOf ahora ignora claves heredadas, applyRestore no: con Object.prototype.M03 = true (otra librería) M03 no sale en changed y no se celebra
  await attack('T1 Object.prototype.M03 = true: applyRestore pone M03 en changed al restaurarlo', () => {
    const C = CS.normalizeCity({ prologue: true, d: { M03: { taught: ALLTRUE(DIST.M03.apprentices.map((a) => a.id)) } } }, D5, () => false, TODAY);
    Object.prototype.M03 = true;
    try { const r = CS.applyRestore(C, D5, () => true); return r.changed.includes('M03') || 'changed=' + safeStr(r.changed) + ' (was lee restored.M03 heredado; rankOf sí lo ignora)'; }
    finally { delete Object.prototype.M03; }
  });
  // ATAQUE: recommended (plaza) también lee restored sin hasOwn: con Object.prototype.M02 = true salta M02 sin restaurar
  await attack('T2 Object.prototype.M02 = true: el objetivo de la plaza sigue siendo M02', () => {
    const C = CS.normalizeCity({ prologue: true }, D5, null, TODAY);
    Object.prototype.M02 = true;
    try { const o = CS.nextObjective(C, D5, 'plaza', null); return o.id === 'M02' || 'objetivo=' + o.id + ' con rango ' + CS.rankOf(C, D5); }
    finally { delete Object.prototype.M02; }
  });
  // ATAQUE: guardado de la Tanda 1 (JSON real) con "__proto__" y "constructor" dentro de d, restored, taught: nada se hereda ni se cuela a M03/M01/M10
  await attack('T3 guardado Tanda 1 con __proto__/constructor anidados: sin contaminación y M03/M01/M10 vacíos', () => {
    const t = JSON.stringify(ALLTRUE(DIST.M03.apprentices.map((a) => a.id)));
    const raw = JSON.parse('{"prologue":true,"restored":{"M03":true,"__proto__":{"M01":true}},"powers":{"__proto__":{"x":1}},"d":{"__proto__":{"M03":{"taught":' + t + '}},"constructor":{"taught":' + t + '},"M02":{"taught":{"__proto__":{"a01":true},"a02":true}},"M08":{"route":{"done":2,"__proto__":{"done":5}}}}}');
    const C = CS.normalizeCity(raw, D5, () => true, TODAY);
    if (Object.keys(C.restored).length) return 'restored=' + safeStr(C.restored);
    for (const m of ['M03', 'M01', 'M10']) if (CS.taughtCount(C, D5, m)) return m + ' contaminado';
    if (safeStr(C.d.M02.taught) !== '{"a02":true}' || C.d.M08.route.done !== 2) return safeStr([C.d.M02, C.d.M08]);
    if (({}).M01 !== undefined || ({}).x !== undefined) return 'Object.prototype contaminado';
    return CS.rankOf(C, D5) === 'Becario' || 'rango ' + CS.rankOf(C, D5);
  });
  // REGLA (fuzz con semilla): applyRestore y rankOf coinciden: rankOf(C) = tabla(#restored propios === true) y changed ⊆ claves nuevas, con restored previo hostil (JSON con __proto__, valores raros)
  campaign('T-F applyRestore/rankOf con restored previo hostil (JSON)', (r) => {
    const parts = [], vals = ['true', 'false', '1', '"true"', 'null', '{}', '[]', '{"M02":true}'];
    for (let i = Math.floor(r() * 8); i-- > 0;) parts.push(JSON.stringify(pick(r, MIDS.concat(['__proto__', 'constructor', 'M04', 'toString', '']))) + ':' + pick(r, vals));
    const taught = MIDS.filter(() => r() < 0.5), boss = MIDS.filter(() => r() < 0.6);
    return { rs: '{' + parts.join(',') + '}', taught, boss };
  }, ({ rs, taught, boss }) => {
    const C = { d: {}, restored: JSON.parse(rs), powers: {} };
    MIDS.forEach((m) => { C.d[m] = { taught: taught.includes(m) ? ALLTRUE(DIST[m].apprentices.map((a) => a.id)) : {} }; });
    const before = MIDS.filter((m) => hasOwn(C.restored, m) && C.restored[m] === true);
    const res = CS.applyRestore(C, D5, (m) => boss.includes(m));
    const want = MIDS.filter((m) => taught.includes(m) && boss.includes(m));
    const got = MIDS.filter((m) => hasOwn(C.restored, m) && C.restored[m] === true);
    if (safeStr(got) !== safeStr(want)) return 'restored ' + safeStr(got);
    if (safeStr(res.changed) !== safeStr(want.filter((m) => !before.includes(m)))) return 'changed ' + safeStr(res.changed) + ' antes=' + safeStr(before);
    let name = D5.ranks[0][1]; D5.ranks.forEach((rk) => { if (want.length >= rk[0]) name = rk[1]; });
    return CS.rankOf(C, D5) === name ? null : 'rango ' + CS.rankOf(C, D5);
  });

  // =================== V. cityRankLine ===================
  await attack('V0 cityRankLine extraída de view.js es idéntica a la de juego_estudio.html', () => (RANKLINE_SRC && RANKLINE_SRC === grabFn(HTML_SRC, 'cityRankLine')) || 'difiere o no se encontró');
  const RL = rankLineWith(D5), RK = D5.ranks, NID = MIDS.length;
  const rkName = (n) => { let nm = RK[0][1]; RK.forEach((r) => { if (n >= r[0]) nm = r[1]; }); return nm; };
  const rkIdx = (nm) => RK.findIndex((r) => r[1] === nm);
  function oracleLine(restored, mids) {   // oráculo obviamente correcto, contando claves propias === true de los distritos existentes
    const now = MIDS.filter((m) => restored && typeof restored === 'object' && hasOwn(restored, m) && restored[m] === true), prev = now.filter((m) => !mids.includes(m));
    if (rkName(now.length) !== rkName(prev.length)) return 'Subes a ' + rkName(now.length) + '.';
    const next = RK.find((r) => r[0] > now.length && r[0] <= NID);
    if (!next) return 'Sigues como ' + rkName(now.length) + '. Llevas ' + now.length + ' de ' + NID + ' distritos restaurados.';
    const miss = next[0] - now.length;
    return 'Sigues como ' + rkName(now.length) + ': ' + (miss === 1 ? 'te falta 1 distrito' : 'te faltan ' + miss + ' distritos') + ' para ' + next[1] + '.';
  }
  const keyArb = fc.oneof(fc.constantFrom(...MIDS), fc.constantFrom('M04', '__proto__', 'constructor', 'toString', '', 'M02 '));
  const valArb = fc.oneof({ weight: 4, arbitrary: fc.constant(true) }, fc.constantFrom(false, 1, 'true', null, 0, {}));
  // REGLA (oráculo): restored plano y mids arbitrarios (repetidos, inexistentes) → el mensaje exacto del oráculo
  prop('V-P1 cityRankLine = oráculo con restored plano', fc.tuple(fc.dictionary(keyArb, valArb, { maxKeys: 9, noNullPrototype: true }), fc.array(keyArb, { maxLength: 7 })), ([rs, mids]) => {
    const got = RL(rs, mids), want = oracleLine(rs, mids);
    if (got !== want) throw new Error('dice "' + got + '" y debía "' + want + '"');
    return true;
  });
  // REGLA (invariante): "Subes a X" solo si X es un rango estrictamente mayor que el de antes, y "Sigues como X" con X = rango del número de distritos que cuenta la línea; con restored NO plano (null-proto, array, instancia)
  const shapeArb = fc.constantFrom('nullproto', 'array', 'instance', 'plain');
  prop('V-P2 cityRankLine con restored no plano: nunca "Subes" a un rango igual o menor', fc.tuple(fc.subarray(MIDS), fc.subarray(MIDS), shapeArb), ([rsIds, mids, shape]) => {
    const rs = shape === 'nullproto' ? Object.create(null) : shape === 'array' ? [] : shape === 'instance' ? new (class R {})() : {};
    rsIds.forEach((m) => { rs[m] = true; });
    const got = RL(rs, mids), m = got.match(/^(Subes a|Sigues como) ([^.:]+)/);
    const nNow = MIDS.filter((x) => hasOwn(rs, x) && rs[x] === true).length, nPrev = MIDS.filter((x) => hasOwn(rs, x) && rs[x] === true && !mids.includes(x)).length;
    if (m[1] === 'Subes a' && !(rkIdx(m[2]) > rkIdx(rkName(nPrev)))) throw new Error('"' + got + '" con ' + nPrev + ' antes y ' + nNow + ' ahora (' + shape + ')');
    if (m[1] === 'Sigues como' && m[2] !== rkName(nNow) && /te falta/.test(got)) throw new Error('"' + got + '" con ' + nNow + ' restaurados (' + shape + ')');
    return true;
  });
  // ATAQUE (fuzz): restored/mids aleatorios con claves propias raras (defineProperty, como JSON.parse) → oráculo
  campaign('V-F cityRankLine con restored/mids aleatorios', (r) => {
    const pool = MIDS.concat(['M04', '__proto__', 'constructor', 'hasOwnProperty', '‮M02', 'M02\u0000', '<script>']), vals = [true, true, true, false, 1, 'true', null, NaN, {}];
    const keys = [], mids = [];
    for (let i = Math.floor(r() * 9); i-- > 0;) keys.push([pick(r, pool), pick(r, vals.map((_, j) => j))]);
    for (let i = Math.floor(r() * 7); i-- > 0;) mids.push(pick(r, pool));
    return { keys, mids };
  }, ({ keys, mids }) => {
    const vals = [true, true, true, false, 1, 'true', null, NaN, {}], rs = {};
    keys.forEach(([k, j]) => Object.defineProperty(rs, k, { value: vals[j], enumerable: true, writable: true, configurable: true }));
    const got = RL(rs, mids), want = oracleLine(rs, mids);
    return got === want ? null : 'dice "' + got + '" y debía "' + want + '"';
  });

  // ---------- vista real en jsdom: celebración del 3.º, del 4.º+5.º a la vez, y guardado con restored hostil ----------
  const html = HTML_SRC, KEY = 'estudio_isw_v1';
  function boot(raw) {
    const errors = [], vc = new VirtualConsole();
    vc.on('jsdomError', (e) => errors.push('jsdomError: ' + (e.detail && e.detail.stack ? String(e.detail.stack).split('\n').slice(0, 2).join(' ') : (e.detail || e.message))));
    vc.on('error', (...a) => errors.push('console.error: ' + a.map(String).join(' ')));
    const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.test/', virtualConsole: vc,
      beforeParse(w) {
        if (raw != null) w.localStorage.setItem(KEY, raw);
        w.scrollTo = () => {}; w.__CITY_TEST__ = true;
        const fake = (el) => new Proxy({ canvas: el }, { get(t, k) { if (k in t) return t[k]; if (k === 'measureText') return () => ({ width: 0 }); return () => {}; }, set(t, k, v) { t[k] = v; return true; } });
        w.HTMLCanvasElement.prototype.getContext = function () { return fake(this); };
        const q = []; w.requestAnimationFrame = (cb) => { q.push(cb); return q.length; }; w.cancelAnimationFrame = () => { q.length = 0; };
      } });
    return { w: dom.window, d: dom.window.document, errors };
  }
  const base = (o = {}) => Object.assign({ v: 1, xp: 1000, days: { last: null, count: 0 }, session: 1, lastActive: 0, topics: {}, qs: {}, boss: {}, hero: { name: 'H' } }, o);
  const answerRight = (w, d) => { const q = L.findQ(w, d); L.click(w, L.optBtn(d, L.correctText(q))); };
  const nextQ = (w, d) => { const b = d.querySelector('#nextbtn'); if (b) L.click(w, b); };
  const teachOut = (e, mid, aid) => {
    const q = e.w.eval('MODULES').find((m) => m.id === mid).questions.find((x) => x.type === 'mcq');
    e.w.__CITY_ROUND__.startRound({ kind: 'teach', title: 'Enseñar', mid, back: { name: 'home' }, city: { kind: 'teach', id: aid, mid } }, [q]);
    answerRight(e.w, e.d); nextQ(e.w, e.d); L.click(e.w, e.d.querySelector('[data-act="back"]'));
  };
  const enter = async (e) => { L.click(e.w, e.d.querySelector('[data-act="city"]')); for (let i = 0; i < 20; i++) await new Promise((r) => setTimeout(r, 0)); return (e.d.querySelector('#city-sheet') || {}).textContent || ''; };
  const allT = (m) => ALLTRUE(DIST[m].apprentices.map((a) => a.id)), lessOne = (m) => ALLTRUE(DIST[m].apprentices.slice(0, DIST[m].need - 1).map((a) => a.id));
  const lastA = (m) => DIST[m].apprentices[DIST[m].need - 1].id, passed = (ms) => Object.fromEntries(ms.map((m) => [m, { best: 18, passed: true }]));
  // ATAQUE: el 3.º distrito cruza a Semi-senior: "Subes a Semi-senior." y nunca "Sigues como"
  await attack('V1 jsdom: restaurar M03 con M02 y M08 ya restaurados → "Subes a Semi-senior."', async () => {
    const e = boot(JSON.stringify(base({ boss: passed(['M02', 'M08', 'M03']), city: { prologue: true, d: { M02: { taught: allT('M02') }, M08: { taught: allT('M08') }, M03: { taught: lessOne('M03') } } } })));
    teachOut(e, 'M03', lastA('M03'));
    const t = await enter(e); e.w.close();
    return (t.includes('Subes a Semi-senior.') && !t.includes('Sigues como') && e.errors.length === 0) || t.slice(0, 240) + ' ' + e.errors.join('|');
  });
  // ATAQUE: 4.º y 5.º a la vez (3 → 5): la línea es la del oráculo con el número real de distritos (sin "Subes a": el rango no cambia)
  await attack('V2 jsdom: M01 y M10 a la vez (3 → 5) → la línea del oráculo y título plural', async () => {
    const e = boot(JSON.stringify(base({ boss: passed(MIDS), city: { prologue: true, d: { M02: { taught: allT('M02') }, M08: { taught: allT('M08') }, M03: { taught: allT('M03') }, M01: { taught: lessOne('M01') }, M10: { taught: lessOne('M10') } } } })));
    teachOut(e, 'M01', lastA('M01')); teachOut(e, 'M10', lastA('M10'));
    const t = await enter(e); e.w.close();
    const want = oracleLine({ M02: true, M08: true, M03: true, M01: true, M10: true }, ['M01', 'M10']);
    return (t.includes(want) && !/Subes a/.test(t) && t.includes('¡Distritos restaurados!') && t.includes(DIST.M01.name) && t.includes(DIST.M10.name) && e.errors.length === 0) || 'esperaba "' + want + '": ' + t.slice(0, 260) + ' ' + e.errors.join('|');
  });
  // ATAQUE: guardado con restored/powers hostiles (todo restaurado, __proto__ propio) y nada enseñado: la celebración del 1.º real dice "Subes a Junior."
  await attack('V3 jsdom: restored hostil en el guardado no altera la línea de rango', async () => {
    const seed = JSON.stringify(base({ boss: passed(['M02']), city: { prologue: true, restored: { M02: true, M08: true, M03: true, M01: true, M10: true }, powers: { planos: true }, d: { M02: { taught: lessOne('M02') } } } }))
      .replace('"restored":{', '"restored":{"__proto__":{"M08":true,"M03":true},"constructor":true,');
    const e = boot(seed);
    teachOut(e, 'M02', lastA('M02'));
    const t = await enter(e); e.w.close();
    return (t.includes('Subes a Junior.') && !t.includes('Sigues como') && e.errors.length === 0 && ({}).M08 === undefined) || t.slice(0, 240) + ' ' + e.errors.join('|');
  });

  // =================== fuzz de sprites: datos aleatorios + frame ===================
  campaign('S-F setData(datos aleatorios) + frame de cada tipo', (r) => {
    const n = 1 + Math.floor(r() * 6), districts = {};
    const anyC = () => pick(r, ['#ff0000', '#ABCDEF', '#abc', '', null, 5, '#gggggg', ['#ff0000'], undefined]);
    for (let i = 0; i < n; i++) districts[pick(r, ['M02', 'M08', 'M03', 'X' + i, '__proto__', 'constructor', 'toString'])] = {
      mentors: Array.from({ length: Math.floor(r() * 4) }, (_, j) => ({ id: pick(r, ['m' + j, 'm0', undefined, '__proto__']) })),
      apprentices: r() < 0.9 ? Array.from({ length: Math.floor(r() * 3) }, (_, j) => ({ id: 'a' + j })) : undefined,
      creatures: r() < 0.9 ? Array.from({ length: Math.floor(r() * 8) }, (_, j) => ({ id: pick(r, ['c' + j, 'c0', undefined]) })) : undefined,
      colors: r() < 0.8 ? { a: anyC(), b: anyC() } : anyC() };
    const ks = Object.keys(districts);
    const order = pick(r, [undefined, [], [ks[0]], [ks[ks.length - 1]], ['M99'], [ks[0], ks[0]], null]);
    return { districts, order, q: [pick(r, ['hero', 'person', 'creature', 'thing', '__proto__']), pick(r, [ks[0] + ':c0', ks[0] + ':m0', 'iris', 'lamp', null]), pick(r, ['up', 'down', 'x']), pick(r, [0, 1, '1', NaN])] };
  }, ({ districts, order, q }) => {
    const SP = SP_NEW({ order, districts });
    const ks = Object.keys(districts), nc = ks.reduce((a, k) => a + ((districts[k].creatures || []).length), 0);
    if (SP.kinds.creature.length !== nc) return 'criaturas registradas ' + SP.kinds.creature.length + ' de ' + nc;
    const f = SP.frame(q[0], q[1], q[2], q[3]);
    if (!(f.sx + f.w <= f.img.width && f.sy + f.h <= f.img.height)) return 'recorte fuera del atlas';
    if (f.img.ops.some((o) => typeof o[0] !== 'string' || o[0] === 'undefined' || o[0] === '')) return 'fillStyle inválido';
    return null;
  });

  finish();
})().catch((e) => { console.error('ERROR FATAL', e); process.exit(1); });

function finish() {
  const fails = results.filter((r) => r[0] === 'FAIL');
  for (const [s, n, x] of results) console.log(s + '  ' + n + (x ? '\n      ' + x : ''));
  console.log(`\nataques=${attacks} propiedades=${props}×${RUNS} fuzz=${fuzzTotal} entradas | ${results.length - fails.length} PASS, ${fails.length} FAIL`);
  process.exit(fails.length ? 1 : 0);
}
