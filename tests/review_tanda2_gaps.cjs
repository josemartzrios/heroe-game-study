// Huecos de cobertura de la Tanda 2 (revisión): la línea de rango de la celebración en jsdom con la 3.ª, 4.ª y 5.ª restauración
// ("Sigues como Semi-senior." sin "te falta"), cityRankLine de city/view.js como unidad (singular, plural y límites del siguiente rango),
// los íconos de inicio de city/sprites2d.js (FIRST) con districts en otro orden, y R11 de city/check_district.mjs con colores raros
// (mayúsculas, espacios, null, números), comparado con lo que tiñe sprites2d.
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const L = require('./adv/lib.cjs');
const RANK = require('./rankline.cjs');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'juego_estudio.html'), 'utf8');
const KEY = 'estudio_isw_v1';
const results = [];
const ok = (name, cond, extra) => { results.push([cond ? 'PASS' : 'FAIL', name, extra || '']); };
const imp = (rel) => import(pathToFileURL(path.join(root, rel)).href);
const clone = (o) => JSON.parse(JSON.stringify(o));

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
const R = (w) => w.__CITY_ROUND__;
const set = (ids) => Object.fromEntries(ids.map((id) => [id, true]));
function answerOne(w, d, right) {
  const q = L.findQ(w, d), ct = L.correctText(q);
  const t = right ? L.optBtn(d, ct) : [...d.querySelectorAll('.opt')].find((b) => !b.disabled && L.norm(b.querySelector('span:last-child').textContent) !== L.norm(ct));
  L.click(w, t); return q;
}
const nextQ = (w, d) => { const b = d.querySelector('#nextbtn'); if (b) L.click(w, b); };

// ---------- sprites2d con un documento falso (mismo que tests/city_sprites.cjs) ----------
function fakeEnv() {
  const env = { rects: [], draws: [] };
  const mkCtx = (cv) => new Proxy({ canvas: cv }, {
    get(t, k) {
      if (k in t) return t[k];
      if (k === 'fillRect') return (x, y, w, h) => { env.rects.push([cv, x, y, w, h, t.fillStyle]); };
      if (k === 'drawImage') return (...a) => { env.draws.push([cv, ...a]); };
      return () => {};
    },
    set(t, k, v) { t[k] = v; return true; },
  });
  const mkCanvas = () => { const cv = { width: 0, height: 0, getContext() { return cv.__ctx || (cv.__ctx = mkCtx(cv)); } }; return cv; };
  env.doc = { createElement() { return mkCanvas(); } };
  env.mkCanvas = mkCanvas;
  return env;
}
const SPR = require('../city/sprites2d.js');
const CS = require('../city/story.js');

(async () => {
  try {
    const D = (await import('../city/districts.mjs')).city;
    const { checkDistrict } = await imp('city/check_district.mjs');
    const { expandModule } = await imp('content_expand.mjs');
    const RK = D.ranks, MIDS = Object.keys(D.districts);

    // =================== 1. celebración en jsdom: 3.ª, 4.ª y 5.ª restauración ===================
    const passed = (mids) => Object.fromEntries(mids.map((m) => [m, { best: 18, passed: true }]));
    const firstN = (mid, n) => D.districts[mid].apprentices.slice(0, n).map((a) => a.id);
    const full = (mid) => ({ taught: set(firstN(mid, D.districts[mid].need)) });
    const almost = (mid) => ({ taught: set(firstN(mid, D.districts[mid].need - 1)) });
    const teachOut = (e, mid) => {   // enseña al aprendiz que falta con la ciudad cerrada (la restauración queda pendiente) y vuelve al inicio
      const aid = D.districts[mid].apprentices[D.districts[mid].need - 1].id;
      const q = e.w.eval('MODULES').find((m) => m.id === mid).questions.find((x) => x.type === 'mcq');
      R(e.w).startRound({ kind: 'teach', title: 'Enseñar', mid, back: { name: 'home' }, city: { kind: 'teach', id: aid, mid } }, [q]);
      answerOne(e.w, e.d, true); nextQ(e.w, e.d); L.click(e.w, e.d.querySelector('[data-act="back"]'));
    };
    const enter = async (e) => { L.click(e.w, e.d.querySelector('[data-act="city"]')); for (let i = 0; i < 20; i++) await new Promise((r) => setTimeout(r, 0)); return (e.d.querySelector('#city-sheet') || {}).textContent || ''; };
    const scenario = async (done, pending) => {   // done: ya restaurados al cargar; pending: se restauran fuera de la ciudad
      const d = {}; done.forEach((m) => { d[m] = full(m); }); pending.forEach((m) => { d[m] = almost(m); });
      const e = boot(base({ boss: passed(done.concat(pending)), city: { prologue: true, d } }));
      pending.forEach((m) => teachOut(e, m));
      const t = await enter(e);
      const rank = (e.d.querySelector('#city-rank') || {}).textContent || '';
      const errs = e.errors.slice();
      e.w.close();
      return { t, rank, errs };
    };
    // oráculo de la línea de rango: n distritos restaurados ahora, k de ellos recién restaurados, TOTAL distritos en los datos
    const TOTAL = MIDS.length, SEQ = D.order.filter((m) => D.districts[m]);   // SEQ: el orden en que la ciudad presenta los distritos
    const rkName = (n) => RK.reduce((nm, r) => (n >= r[0] ? r[1] : nm), RK[0][1]);
    const wantLine = (n, k) => {
      if (rkName(n) !== rkName(n - k)) return 'Subes a ' + rkName(n) + '.';
      const next = RK.find((r) => r[0] > n && r[0] <= TOTAL);
      if (!next) return 'Sigues como ' + rkName(n) + '. Llevas ' + n + ' de ' + TOTAL + ' distritos restaurados.';
      const miss = next[0] - n;
      return 'Sigues como ' + rkName(n) + ': ' + (miss === 1 ? 'te falta 1 distrito' : 'te faltan ' + miss + ' distritos') + ' para ' + next[1] + '.';
    };
    const nth = async (k) => { const id = SEQ[k - 1], r = await scenario(SEQ.slice(0, k - 1), [id]); return { id, r, want: wantLine(k, 1) }; };
    ok('hay al menos 5 distritos en los datos para los escenarios del 3.º al 5.º', SEQ.length >= 5 && SEQ.length === TOTAL, SEQ.join(','));
    { const { id, r, want } = await nth(3);
      ok('celebración: el 3.º distrito (' + id + ') dice exactamente "' + want + '" y su texto', r.t.includes(want) && r.t.includes(D.districts[id].celebrate.text) && (want.indexOf('Subes a') === 0 ? !r.t.includes('Sigues como') : !r.t.includes('Subes a')), r.t.slice(0, 260)); }
    { const { id, r, want } = await nth(4);
      ok('celebración: el 4.º distrito (' + id + ') dice exactamente "' + want + '" (sin "Subes a")', r.t.includes(want) && !r.t.includes('Subes a'), r.t.slice(0, 260));
      ok('celebración: el 4.º distrito no anuncia un poder (' + id + ' no tiene) y muestra su texto', !/Poder nuevo/.test(r.t) && r.t.includes(D.districts[id].celebrate.text) && r.t.includes('¡Distrito restaurado!'), r.t.slice(0, 260));
      ok('celebración: tras el 4.º distrito el HUD sigue en ' + rkName(4) + ' y sin errores', r.rank === rkName(4) && r.errs.length === 0, r.rank + ' ' + r.errs.join('|')); }
    { const { id, r, want } = await nth(5);
      ok('celebración: el 5.º distrito (' + id + ') dice exactamente "' + want + '" (sin "Subes a")', r.t.includes(want) && !r.t.includes('Subes a'), r.t.slice(0, 260));
      ok('celebración: el 5.º distrito muestra el texto de ' + id + ' y sin errores', r.t.includes(D.districts[id].celebrate.text) && r.errs.length === 0, r.errs.join('|')); }
    { const ids = SEQ.slice(3, 5), r = await scenario(SEQ.slice(0, 3), ids), want = wantLine(5, 2);
      ok('celebración: 4.º y 5.º acumulados (de 3 a 5) en una sola hoja: "' + want + '"', r.t.includes('¡Distritos restaurados!') && ids.every((x) => r.t.includes(D.districts[x].name)) && r.t.includes(want) && !r.t.includes('Subes a'), r.t.slice(0, 260)); }
    { const ids = SEQ.slice(2, 4), r = await scenario(SEQ.slice(0, 2), ids), want = wantLine(4, 2);
      ok('celebración: 3.º y 4.º acumulados (de 2 a 4) cruzan el umbral 3: "' + want + '"', r.t.includes(want) && !r.t.includes('Sigues como'), r.t.slice(0, 260)); }

    // =================== 2. cityRankLine (city/view.js) como unidad, con story.js real ===================
    ok('cityRankLine existe en city/view.js', !!RANK.SRC);
    const line = (restored, mids, data = D) => RANK.rankLineFn({ city: { restored } }, data)(mids);
    if (RANK.SRC) {
      // con los datos reales: los casos que no dependen de cuántos distritos hay
      ok('rankLine 0→1: "Subes a Junior."', line({ M02: true }, ['M02']) === 'Subes a Junior.', line({ M02: true }, ['M02']));
      ok('rankLine 1→2: singular "te falta 1 distrito"', line({ M02: true, M08: true }, ['M08']) === 'Sigues como Junior: te falta 1 distrito para Semi-senior.', line({ M02: true, M08: true }, ['M08']));
      ok('rankLine 2→3: "Subes a Semi-senior."', line({ M02: true, M08: true, M03: true }, ['M03']) === 'Subes a Semi-senior.');
      ok('rankLine todos de una vez: "Subes a ' + rkName(TOTAL) + '."', line(set(MIDS), MIDS.slice()) === 'Subes a ' + rkName(TOTAL) + '.', line(set(MIDS), MIDS.slice()));
      ok('rankLine: mids repetidos e inexistentes no cambian la línea (M08, M08, M99)', line({ M02: true, M08: true }, ['M08', 'M08', 'M99']) === 'Sigues como Junior: te falta 1 distrito para Semi-senior.');
      ok('rankLine: restored null no lanza', (() => { try { return typeof line(null, ['M02']) === 'string'; } catch (e) { return false; } })());
      // todas las combinaciones reales (restaurados R, recién restaurados M ⊆ R, M no vacío) contra el oráculo
      const bad = [], seen = new Set();
      for (let mask = 1; mask < 1 << MIDS.length; mask++) {
        const R0 = MIDS.filter((_, i) => mask & (1 << i));
        for (let sub = 1; sub < 1 << R0.length; sub++) {
          const fresh = R0.filter((_, i) => sub & (1 << i)), got = line(set(R0), fresh), want = wantLine(R0.length, fresh.length);
          seen.add(got); if (got !== want && bad.length < 3) bad.push(R0.length + '/' + fresh.length + ': "' + got + '" ≠ "' + want + '"');
        }
      }
      ok('rankLine: las ' + (3 ** TOTAL - 2 ** TOTAL) + ' combinaciones (restaurados × recién restaurados) dan la línea del oráculo', bad.length === 0, bad.join(' | '));
      ok('rankLine: salen líneas "Subes a", "te falta 1" y, si hay un rango por alcanzar, "te faltan N"', [...seen].some((x) => /^Subes a/.test(x)) && [...seen].some((x) => /te falta 1 distrito/.test(x)) && [...seen].some((x) => /^Sigues como [^:]+\. Llevas /.test(x) || /te faltan/.test(x)), [...seen].join(' | '));
      // plural y límites con rangos de prueba (el número de distritos real es TOTAL)
      const withRanks = (ranks) => Object.assign({}, D, { ranks });
      ok('rankLine plural: con un rango a 4, de 1 a 2 dice "te faltan 2 distritos"', line({ M02: true, M08: true }, ['M08'], withRanks([[0, 'Becario'], [1, 'Junior'], [4, 'Senior']])) === 'Sigues como Junior: te faltan 2 distritos para Senior.', line({ M02: true, M08: true }, ['M08'], withRanks([[0, 'Becario'], [1, 'Junior'], [4, 'Senior']])));
      ok('rankLine límite: un rango que pide justo los ' + TOTAL + ' distritos sí se anuncia', line({ M02: true, M08: true, M03: true }, ['M03'], withRanks([[0, 'Becario'], [1, 'Junior'], [TOTAL, 'Senior']])) === 'Sigues como Junior: te faltan ' + (TOTAL - 3) + ' distritos para Senior.');
      ok('rankLine límite: un rango que pide ' + (TOTAL + 1) + ' (uno más que los distritos) no se anuncia', line({ M02: true, M08: true, M03: true }, ['M03'], withRanks([[0, 'Becario'], [1, 'Junior'], [TOTAL + 1, 'Senior']])) === 'Sigues como Junior. Llevas 3 de ' + TOTAL + ' distritos restaurados.');
      ok('rankLine plural con un restored sin normalizar ({M08: "true"} no cuenta)', line({ M02: true, M08: 'true' }, ['M08']) === 'Sigues como Junior: te faltan 2 distritos para Semi-senior.', line({ M02: true, M08: 'true' }, ['M08']));
    }

    // =================== 3. íconos de inicio (FIRST) con districts en otro orden ===================
    const icons = (data) => {
      const env = fakeEnv(); SPR.init(env.doc); SPR.setData(data);
      const kinds = ['mentor', 'apprentice', 'creature'];
      const cvs = kinds.map((k) => { const c = env.mkCanvas(); c.width = 28; c.height = 28; c.getAttribute = (n) => (n === 'data-spr' ? k : null); return c; });
      SPR.paintIcons({ querySelectorAll: () => cvs });
      const at = (i) => env.draws.find((dr) => dr[0] === cvs[i]);
      return { mentor: at(0), apprentice: at(1), creature: at(2) };
    };
    const rowOf = (kind, v) => SPR.frame(kind, v, 'down', 0).sy;
    { const ic = icons(D);
      ok('íconos con los datos reales: mentor, aprendiz y criatura de M02 (D.order[0])', ic.mentor[3] === rowOf('person', 'M02:m01') && ic.apprentice[3] === rowOf('person', 'M02:a01') && ic.creature[3] === rowOf('creature', 'M02:bit')); }
    { const D3 = Object.assign({}, D, { districts: Object.fromEntries(['M10', 'M03', 'M02', 'M08', 'M01'].map((k) => [k, D.districts[k]])) });
      const ic = icons(D3);
      ok('íconos con districts en otro orden (M10 primero, order[0] = M02): el mentor es el de M02', ic.mentor[3] === rowOf('person', 'M02:m01'), 'fila ' + ic.mentor[3] + ' = ' + SPR.kinds.person[ic.mentor[3] / 14] + ', esperada ' + rowOf('person', 'M02:m01'));
      ok('íconos con districts en otro orden: el aprendiz es el de M02', ic.apprentice[3] === rowOf('person', 'M02:a01'), 'fila de ' + SPR.kinds.person[ic.apprentice[3] / 14]);
      ok('íconos con districts en otro orden: la criatura es la de M02 (paleta de referencia, no teñida)', ic.creature[3] === rowOf('creature', 'M02:bit'), 'fila de ' + SPR.kinds.creature[ic.creature[3] / 14]); }
    { const Dn = { districts: { M10: D.districts.M10, M02: D.districts.M02 } };   // sin order: la referencia es el primero por posición
      const ic = icons(Dn);
      ok('íconos sin D.order: usan el primer distrito por posición (M10)', ic.mentor[3] === rowOf('person', 'M10:m01') && ic.creature[3] === rowOf('creature', 'M10:pescador')); }
    { let thrown = null;
      try { icons({ order: [], districts: {} }); } catch (e) { thrown = e; }
      ok('íconos con 0 distritos: paintIcons no lanza', thrown === null, String(thrown)); }
    SPR.init(fakeEnv().doc); SPR.setData(D);

    // =================== 4. R11 con colores raros, y coincidencia con lo que tiñe sprites2d ===================
    const { district: d3 } = await imp('city/districts/m03.mjs');
    const mod3 = expandModule('M03', 'Fundamentos de internet', await imp('content_m03.mjs'));
    const r11 = (colors) => { const d = clone(d3); if (colors === undefined) delete d.colors; else d.colors = colors; return checkDistrict(d, mod3); };
    const hasR11 = (errs) => errs.some((e) => e.indexOf('R11:') === 0);
    ok('R11: los colores reales de M03 no dan R11 ni ningún otro error', r11(clone(d3.colors)).length === 0, r11(clone(d3.colors)).join(' | '));
    ok('R11: mayúsculas (#FF9F43 / #4D7CFF) son válidas', !hasR11(r11({ a: '#FF9F43', b: '#4D7CFF' })));
    ok('R11: mezcla de mayúsculas y minúsculas (#Ff9F43) es válida', !hasR11(r11({ a: '#Ff9F43', b: '#4d7cff' })));
    const BAD = [
      ['espacio delante', { a: ' #ff9f43', b: '#4d7cff' }], ['espacio detrás', { a: '#ff9f43', b: '#4d7cff ' }], ['salto de línea al final', { a: '#ff9f43\n', b: '#4d7cff' }],
      ['espacio dentro', { a: '#ff 9f43', b: '#4d7cff' }], ['sin #', { a: 'ff9f43', b: '#4d7cff' }], ['8 dígitos (con alfa)', { a: '#ff9f43ff', b: '#4d7cff' }],
      ['5 dígitos', { a: '#ff9f4', b: '#4d7cff' }], ['letra no hex (g)', { a: '#ff9f4g', b: '#4d7cff' }], ['texto vacío', { a: '', b: '#4d7cff' }],
      ['a null', { a: null, b: '#4d7cff' }], ['b null', { a: '#ff9f43', b: null }], ['colors null', null], ['colors ausente', undefined],
      ['a número 0xff9f43', { a: 0xff9f43, b: '#4d7cff' }], ['b número 0', { a: '#ff9f43', b: 0 }], ['colors número', 16752451],
      ['colors arreglo', ['#ff9f43', '#4d7cff']], ['colors texto', '#ff9f43'], ['falta b', { a: '#ff9f43' }], ['a objeto String', { a: new String('#ff9f43'), b: '#4d7cff' }],
      ['rgb()', { a: 'rgb(255,159,67)', b: '#4d7cff' }], ['nombre de color', { a: 'orange', b: '#4d7cff' }], ['acento/emoji', { a: '#ff9f4é', b: '#4d7c🙂' }]
    ];
    for (const [name, colors] of BAD) {
      const errs = r11(colors);
      ok('R11: ' + name + ' da error R11 (y no R0)', hasR11(errs) && !errs.some((e) => e.indexOf('R0:') === 0), errs.join(' | ') || 'sin errores');
    }
    ok('R11: un solo error R11 aunque fallen a y b a la vez', r11({ a: null, b: 7 }).filter((e) => e.indexOf('R11:') === 0).length === 1);
    // R11 acepta exactamente lo que sprites2d tiñe: si R11 lo acepta, la criatura lleva colors.a; si no, la paleta de referencia
    const tinted = (colors) => {
      const env = fakeEnv(); SPR.init(env.doc);
      SPR.setData({ order: ['M02', 'X1'], districts: { M02: D.districts.M02, X1: { mentors: [], apprentices: [], creatures: [{ id: 'c1' }], colors } } });
      const f = SPR.frame('creature', 'X1:c1', 'down', 0);
      const body = env.rects.find((r) => r[0] === f.img && r[2] >= f.sy && r[2] < f.sy + 14 && r[1] < 14 && r[3] === 10 && r[4] === 7);
      return !!body && colors != null && body[5] === colors.a;
    };
    const SAMPLES = [{ a: '#FF9F43', b: '#4D7CFF' }, { a: '#ff9f43', b: '#4d7cff' }].concat(BAD.map((x) => x[1]).filter((c) => c && typeof c === 'object' && !Array.isArray(c)));
    const mismatch = SAMPLES.filter((c) => !hasR11(r11(c)) !== tinted(c)).map((c) => JSON.stringify(c));
    ok('R11 y sprites2d coinciden: tiñe exactamente los colores que R11 acepta', mismatch.length === 0, mismatch.join(' | '));
    SPR.init(fakeEnv().doc); SPR.setData(D);

    // =================== 5. bordes de los tres distritos nuevos ===================
    for (const mid of ['M03', 'M01', 'M10']) {
      const M = D.districts[mid];
      ok(mid + ': celebrate sin poder (no da poderes al restaurarse)', !M.celebrate.power && (() => {
        const C = { d: { [mid]: { taught: set(M.apprentices.map((a) => a.id)) } }, restored: {}, powers: {} };
        const rs = CS.applyRestore(C, D, (x) => x === mid);
        return rs.changed.join() === mid && Object.keys(C.powers).length === 0;
      })());
      ok(mid + ': need (7) es menor que los aprendices (10): hay margen de 3', M.need === 7 && M.apprentices.length === 10);
      ok(mid + ': cada criatura está registrada en el atlas como mid:id', M.creatures.every((c) => SPR.kinds.creature.includes(mid + ':' + c.id)));
      ok(mid + ': ningún id de aprendiz/mentor/reparación es una clave de Object.prototype', [...M.mentors, ...M.apprentices, ...M.repairs, ...M.creatures].every((o) => !(o.id in Object.prototype)));
      ok(mid + ': el jefe aprobado sin aprendices no restaura; con need − 1 tampoco; con need sí', (() => {
        const run = (n) => { const C = { d: { [mid]: { taught: set(M.apprentices.slice(0, n).map((a) => a.id)) } }, restored: {}, powers: {} }; CS.applyRestore(C, D, (x) => x === mid); return C.restored[mid] === true; };
        return !run(0) && !run(M.need - 1) && run(M.need) && run(M.apprentices.length);
      })());
    }
  } catch (e) {
    ok('el archivo de pruebas no lanza', false, String(e && e.stack).slice(0, 400));
  }
  results.forEach((r) => { if (r[0] === 'FAIL') console.log(r.join(' | ')); });
  const fails = results.filter((r) => r[0] === 'FAIL').length;
  console.log(fails ? fails + ' FALLOS de ' + results.length : 'REVIEW_TANDA2_GAPS OK (' + results.length + ')');
  process.exit(fails ? 1 : 0);
})();
