// Enseñar escribiendo en la hoja de Ciudad Núcleo (view.js): explicar y corregir con textarea, premarca, confirmación, XP, borrador,
// XSS y privacidad. El mundo es falso (como en city_engine.cjs): la hoja y el motor son los reales.
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const path = require('path');
const T = require('../city/teach.js');
const html = fs.readFileSync(path.join(__dirname, '..', 'juego_estudio.html'), 'utf8');
const results = [];
const ok = (name, cond, extra) => { results.push([cond ? 'PASS' : 'FAIL', name, extra || '']); };
const tick = async (n = 6) => { for (let i = 0; i < n; i++) await new Promise((r) => setTimeout(r, 0)); };
const KEY = 'estudio_isw_v1';

function boot(opts = {}) {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => errors.push('jsdomError: ' + (e.detail || e.message)));
  vc.on('error', (e) => errors.push('console.error: ' + e));
  const st = { calls: [], sets: 0 };
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.test/', virtualConsole: vc,
    beforeParse(w) {
      if (opts.seed) w.localStorage.setItem(KEY, JSON.stringify(opts.seed));
      w.scrollTo = () => {};
      w.Element.prototype.scrollIntoView = function () {};
      w.__CITY_TEST__ = true;
      if (opts.rndSeed) { let s = opts.rndSeed; w.Math.random = function () { s |= 0; s = (s + 0x6D2B79F5) | 0; let x = Math.imul(s ^ (s >>> 15), 1 | s); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; }
      const proto = Object.getPrototypeOf(w.localStorage), setItem = proto.setItem;
      proto.setItem = function (k, v) { st.sets++; return setItem.call(this, k, v); };
      const fake = (el) => new Proxy({ canvas: el }, { get(t, k) { if (k in t) return t[k]; if (k === 'measureText') return () => ({ width: 0 }); return () => {}; }, set(t, k, v) { t[k] = v; return true; } });
      w.HTMLCanvasElement.prototype.getContext = function () { return fake(this); };
      w.__CITY_WORLD__ = {
        create(canvas, D, sceneId, o) {
          st.lastOpts = o;
          return Promise.resolve({ resize() {}, setPaused: (r, on) => st.calls.push(['setPaused', r, on]), dissolve() {}, encounter: () => Promise.resolve(), dispose() {} });
        }
      };
    },
  });
  return { dom, w: dom.window, d: dom.window.document, errors, st };
}
const M2AT = { x: 0, z: -52, yaw: Math.PI };
const base = (o = {}) => Object.assign({ v: 1, xp: 1000, days: { last: null, count: 0 }, session: 1, lastActive: 0, topics: {}, qs: {}, boss: {}, hero: { name: 'H' } }, o, { city: Object.assign({ prologue: true, scene: 'M02', at: Object.assign({}, M2AT) }, o.city || {}) });
const six = (ids) => { const o = {}; ids.forEach((t) => { o['M02:' + t] = [1, 1, 1, 1, 1, 1]; }); return o; };
const saved = (w) => JSON.parse(w.localStorage.getItem(KEY));
const $ = (e, s) => e.d.querySelector(s);
const $$ = (e, s) => [...e.d.querySelectorAll(s)];
const click = (w, el) => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
const api = (e) => e.w.__CITY_TEST_API__;
const cx = (e, c) => $$(e, '[data-act="cx"]').find((b) => b.dataset.c === c);
const sheetText = (e) => ($(e, '#city-sheet') || {}).textContent || '';
const live = (e) => $(e, '#city-live').textContent;
async function enter(e) { click(e.w, $(e, '[data-act="city"]')); await tick(); }
function typeText(e, text) { const ta = $(e, '#city-teach-text'); ta.value = text; ta.dispatchEvent(new e.w.Event('input', { bubbles: true })); return ta; }
const WORDS12 = 'uno dos tres cuatro cinco seis siete ocho nueve diez once doce';
const EXPLAIN_TXT = 'La ram es volatil y el hdd es lento pero barato para guardar muchas cosas hoy';   // M02 T05: detecta ram, volatil e hdd (3 puntos)
const XSS = '</textarea><img src=x onerror="window.__x=1"><script>window.__x=2</script> ' + WORDS12;

(async () => {
  const { city: D } = await import(require('url').pathToFileURL(path.join(__dirname, '..', 'city', 'districts.mjs')).href);
  const D2 = D.districts.M02, ap = (id) => D2.apprentices.find((a) => a.id === id);
  const near = (e, o) => api(e).teleport(o.x, o.z + 1);
  const mod2 = (w) => w.eval('MODULES').find((m) => m.id === 'M02');
  const openA = async (e, id) => { await enter(e); near(e, ap(id)); click(e.w, $(e, '#city-act')); };
  const mk = (extra = {}) => boot({ seed: base(Object.assign({ topics: six(['T05']) }, extra)) });

  // ---- explicar: abrir y textarea ----
  { const e = mk(); await openA(e, 'a01');
    const h = $(e, '#city-sheet h2');
    ok('explicar: abre «¿Me explicas {título}?» con el foco en el h2 (tabindex -1)', /^¿Me explicas Memoria y almacenamiento\?$/.test(h.textContent) && h.getAttribute('tabindex') === '-1' && e.d.activeElement === h, h.textContent + ' | ' + (e.d.activeElement && e.d.activeElement.tagName));
    const ta = $(e, '#city-teach-text');
    ok('textarea: maxlength 2000, sin corrector, label[for] y contador asociado', !!ta && ta.getAttribute('maxlength') === '2000' && ta.getAttribute('spellcheck') === 'false' && ta.getAttribute('autocorrect') === 'off' && ta.getAttribute('autocapitalize') === 'sentences' && ta.getAttribute('autocomplete') === 'off' && !!$(e, 'label[for="city-teach-text"]') && ta.getAttribute('aria-describedby') === 'city-count');
    ok('contador: sin aria-live; con 0 palabras «Faltan 12 palabras de 12» y «Revisar» desactivado', !$(e, '#city-count').hasAttribute('aria-live') && $(e, '#city-count').textContent === 'Faltan 12 palabras de 12' && cx(e, 'teach-send').disabled);
    const sets0 = e.st.sets;
    const ta1 = typeText(e, 'uno dos tres cuatro cinco');
    ok('con 5 palabras: «Faltan 7 palabras de 12» y el botón sigue desactivado', $(e, '#city-count').textContent === 'Faltan 7 palabras de 12' && cx(e, 'teach-send').disabled);
    typeText(e, 'uno dos tres cuatro cinco seis siete ocho nueve diez once');
    ok('con 11 palabras: «Falta 1 palabra de 12» (singular)', $(e, '#city-count').textContent === 'Falta 1 palabra de 12');
    ok('escribir no repinta (mismo nodo textarea) ni guarda la partida', $(e, '#city-teach-text') === ta1 && e.st.sets === sets0, 'sets ' + sets0 + '→' + e.st.sets);
    $(e, '#city-live').textContent = '';
    typeText(e, 'a b c d e f g h i j k l');
    ok('12 letras sueltas cuentan 12 palabras: el botón se activa, «Listo» y #city-live lo anuncia', $(e, '#city-count').textContent === 'Listo' && !cx(e, 'teach-send').disabled && live(e) !== '', live(e));
    $(e, '#city-live').textContent = '';
    typeText(e, 'a b c d e f g h i j k l m');
    ok('con 13 palabras no se vuelve a anunciar', live(e) === '');
    ok('el mismo nodo del textarea tras todo lo escrito', $(e, '#city-teach-text') === ta1);
    e.w.close(); }

  // ---- explicar: revisar, confirmar, fallar ----
  { const e = mk(); await openA(e, 'a01');
    const kps = mod2(e.w).topics.find((t) => t.id === 'T05').keyPoints, expected = T.explainCheck(EXPLAIN_TXT, kps);
    typeText(e, EXPLAIN_TXT); click(e.w, cx(e, 'teach-send'));
    const boxes = $$(e, '#city-sheet input[type="checkbox"]');
    ok('revisar: una casilla por punto, premarcadas las detectadas (3 de 7)', boxes.length === kps.length && expected.filter(Boolean).length === 3 && boxes.every((b, i) => b.checked === expected[i]), JSON.stringify(boxes.map((b) => b.checked)));
    ok('revisar: «Lo detecté» dentro del label de cada casilla premarcada y «Detecté 3 de 7 puntos»', boxes.every((b, i) => !expected[i] || /Lo detecté/.test(b.closest('label').textContent)) && /Detecté 3 de 7 puntos/.test(sheetText(e)));
    ok('revisar: fieldset con legend «Marca al menos 3», foco en la primera casilla y botón Cerrar', !!$(e, '#city-sheet fieldset legend') && /Marca al menos 3/.test($(e, '#city-sheet legend').textContent) && e.d.activeElement === boxes[0] && !!cx(e, 'sheetclose'));
    // fallar: se desmarca una (quedan 2)
    boxes.find((b) => b.checked).checked = false; click(e.w, cx(e, 'teach-ok'));
    const miss = $(e, '#city-sheet [role="status"]');
    ok('fallar: vuelve a escribir con el mismo texto, «Te faltó:» en role=status y el foco ahí', !!$(e, '#city-teach-text') && $(e, '#city-teach-text').value === EXPLAIN_TXT && !!miss && /Te faltó:/.test(miss.textContent) && e.d.activeElement === miss && !saved(e.w).city.d.M02.taught.a01, miss && miss.textContent);
    // reescribir
    click(e.w, cx(e, 'teach-send')); click(e.w, cx(e, 'teach-edit'));
    ok('reescribir: vuelve a escribir con el texto y el foco en el textarea', $(e, '#city-teach-text').value === EXPLAIN_TXT && e.d.activeElement === $(e, '#city-teach-text'));
    // confirmar bien
    click(e.w, cx(e, 'teach-send'));
    const xp0 = saved(e.w).xp, okb = cx(e, 'teach-ok'); click(e.w, okb); click(e.w, okb);
    const s = saved(e.w);
    ok('confirmar con 3 marcadas: taught.a01 y +15 XP una sola vez (doble toque)', s.city.d.M02.taught.a01 === true && s.xp - xp0 === 15 && /lo entendió/.test(sheetText(e)), String(s.xp - xp0));
    e.w.close(); }

  // ---- explicar con Liderazgo ----
  { const e = mk({ virtues: { liderazgo: 1700000000000 } }); await openA(e, 'a01');
    typeText(e, EXPLAIN_TXT); click(e.w, cx(e, 'teach-send')); const xp0 = saved(e.w).xp; click(e.w, cx(e, 'teach-ok'));
    ok('con Liderazgo: +20 XP y la hoja dice «+20 XP (incluye +5 de Liderazgo)»', saved(e.w).xp - xp0 === 20 && /\+20 XP \(incluye \+5 de Liderazgo\)/.test(sheetText(e)), sheetText(e).slice(0, 120));
    e.w.close(); }

  // ---- borrador ----
  { const e = mk(); await openA(e, 'a01');
    typeText(e, 'borrador de prueba uno dos'); click(e.w, cx(e, 'sheetclose')); near(e, ap('a01')); click(e.w, $(e, '#city-act'));
    ok('«Cerrar» en escribir y reabrir el mismo aprendiz recupera el texto', $(e, '#city-teach-text').value === 'borrador de prueba uno dos');
    typeText(e, EXPLAIN_TXT); click(e.w, cx(e, 'teach-send')); click(e.w, cx(e, 'sheetclose')); near(e, ap('a01')); click(e.w, $(e, '#city-act'));
    ok('«Cerrar» en revisar y reabrir recupera el texto en la pantalla de escribir', $(e, '#city-teach-text') && $(e, '#city-teach-text').value === EXPLAIN_TXT);
    e.w.close(); }

  // ---- restaurar el distrito al enseñar al último: una sola celebración ----
  { const taught = {}; D2.apprentices.filter((a) => a.id !== 'a01').slice(0, 7).forEach((a) => { taught[a.id] = true; });
    const e = boot({ seed: base({ boss: { M02: { best: 20, passed: true } }, topics: six(['T05']), city: { taught } }) }); await openA(e, 'a01');
    typeText(e, EXPLAIN_TXT); click(e.w, cx(e, 'teach-send')); click(e.w, cx(e, 'teach-ok'));
    ok('el último aprendiz restaura el distrito con una celebración', /¡Distrito restaurado!/.test(sheetText(e)) && saved(e.w).city.restored.M02 === true, sheetText(e).slice(0, 100));
    click(e.w, cx(e, 'sheetclose'));
    click(e.w, $(e, '#city-pause')); click(e.w, cx(e, 'p-home')); await tick(); await enter(e); await tick();
    ok('al salir y volver a entrar no se repite la celebración', $(e, '#city-sheet').hidden && !/¡Distrito restaurado!/.test(sheetText(e)));
    e.w.close(); }

  // ---- HTML del jugador y privacidad ----
  { const e = mk(); await openA(e, 'a01');
    const inert = () => !$(e, '#city-sheet img') && !$(e, '#city-sheet script') && e.w.__x === undefined;
    typeText(e, XSS); const a = inert();
    click(e.w, cx(e, 'teach-send')); const b = inert();
    click(e.w, $$(e, '#city-sheet input[type="checkbox"]')[0] || cx(e, 'teach-edit')); click(e.w, cx(e, 'teach-ok')); const c = inert();
    ok('el HTML del jugador es inerte al escribir, revisar y fallar', a && b && c && e.errors.length === 0, [a, b, c, e.errors.join('|')].join(' '));
    click(e.w, cx(e, 'teach-send')); click(e.w, cx(e, 'teach-edit'));
    ok('y tras reescribir el textarea conserva el texto literal', $(e, '#city-teach-text').value === XSS && inert());
    e.w.close(); }
  { const e = mk(); await openA(e, 'a01');
    const dump = () => { const o = []; for (let i = 0; i < e.w.localStorage.length; i++) { const k = e.w.localStorage.key(i); o.push(k + '=' + e.w.localStorage.getItem(k)); } return o.join('\n'); };
    typeText(e, EXPLAIN_TXT + ' zxqwv'); click(e.w, cx(e, 'sheetclose')); const withDraft = dump();
    near(e, ap('a01')); click(e.w, $(e, '#city-act')); click(e.w, cx(e, 'teach-send')); click(e.w, cx(e, 'teach-ok'));
    ok('el texto escrito no se guarda en localStorage (ni con un borrador abierto, ni al aprobar, ni en la copia _bak)', !/zxqwv/.test(withDraft) && !/zxqwv/.test(dump()) && saved(e.w).city.d.M02.taught.a01 === true);
    e.w.close(); }

  // ---- gancho de prueba ----
  { const e = mk(); await enter(e); const xp0 = saved(e.w).xp; api(e).teach('a03');
    ok('__CITY_TEST_API__.teach(id) marca taught y suma XP; un id inexistente no hace nada', saved(e.w).city.d.M02.taught.a03 === true && saved(e.w).xp - xp0 === 15 && (api(e).teach('zz99'), !saved(e.w).city.d.M02.taught.zz99));
    e.w.close(); }

  results.forEach((r) => console.log(r.join(' | ')));
  const fails = results.filter((r) => r[0] === 'FAIL').length;
  console.log(fails ? `\n${fails} FALLOS` : '\nCITY_TEACH_UI OK (' + results.length + ' comprobaciones)');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('EXCEPCIÓN', e && e.stack); results.forEach((r) => console.log(r.join(' | '))); process.exit(2); });
