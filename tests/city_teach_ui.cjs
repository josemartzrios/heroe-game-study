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
  const st = { calls: [], sets: 0, kb: 0 };
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.test/', virtualConsole: vc,
    beforeParse(w) {
      if (opts.seed) w.localStorage.setItem(KEY, JSON.stringify(opts.seed));
      w.scrollTo = () => {};
      w.Element.prototype.scrollIntoView = function () {};
      w.__CITY_TEST__ = true;
      if (opts.rndSeed) { let s = opts.rndSeed; w.Math.random = function () { s |= 0; s = (s + 0x6D2B79F5) | 0; let x = Math.imul(s ^ (s >>> 15), 1 | s); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; }
      if (opts.mm) w.matchMedia = () => ({ matches: opts.mm.on });   // opts.mm = { on }: la consulta de giro la decide la prueba
      if (opts.vv) {   // visualViewport falso: opts.vv = { cut }, el teclado recorta `cut` px de la altura; __fire dispara resize/scroll
        const L = {}; w.visualViewport = { height: w.innerHeight - opts.vv.cut, offsetTop: 0, addEventListener(t, f) { (L[t] = L[t] || []).push(f); }, __fire(t) { (L[t] || []).forEach((f) => f()); } };
        const sp = w.CSSStyleDeclaration.prototype.setProperty; w.CSSStyleDeclaration.prototype.setProperty = function (k, v) { if (k === '--kb') st.kb++; return sp.call(this, k, v); };
      }
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
const qsOf = (e) => saved(e.w).qs;   // respuestas registradas: enseñar no cuenta como práctica
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
    ok('explicar: abre «¿Me explicas {título}?» con el foco en el h2 (tabindex -1)', /^¿Me explicas «Memoria y almacenamiento»\?$/.test(h.textContent) && h.getAttribute('tabindex') === '-1' && e.d.activeElement === h, h.textContent + ' | ' + (e.d.activeElement && e.d.activeElement.tagName));
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
    const xp0 = saved(e.w).xp, okb = cx(e, 'teach-ok'); click(e.w, okb); $(e, '#city-sheet').appendChild(okb); click(e.w, okb);   // el 2.º toque llega con el botón viejo aún en la hoja: debe ignorarse
    const s = saved(e.w);
    ok('confirmar con 3 marcadas: taught.a01 y +15 XP una sola vez (doble toque)', e.errors.length === 0 && s.city.d.M02.taught.a01 === true && s.xp - xp0 === 15 && /lo entendió/.test(sheetText(e)), String(s.xp - xp0));
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

  // ---- corregir (M02 T06, aprendiz a02 «Beto») ----
  const itemOf = (e) => mod2(e.w).questions.filter((q) => q.type === 'error' && q.topic === 'T06').map(T.fixItem).find((i) => sheetText(e).includes(i.wrong));
  { const e = boot({ seed: base({ topics: six(['T06']) }), rndSeed: 7 }); const qs0 = JSON.stringify(qsOf(e)); await openA(e, 'a02');
    const it = itemOf(e), h = $(e, '#city-sheet h2');
    ok('corregir: se ve la frase equivocada y «¿Qué está mal y cómo es en realidad?» con el foco en el h2', !!it && /^¿Qué está mal y cómo es en realidad\?$/.test(h.textContent) && e.d.activeElement === h, it && it.wrong);
    typeText(e, 'uno dos tres cuatro cinco');
    ok('corregir: con 5 palabras «Falta 1 palabra de 6» y el botón desactivado', $(e, '#city-count').textContent === 'Falta 1 palabra de 6' && cx(e, 'teach-send').disabled);
    typeText(e, 'uno dos tres cuatro cinco seis');
    ok('corregir: con 6 palabras el botón se activa', $(e, '#city-count').textContent === 'Listo' && !cx(e, 'teach-send').disabled);
    typeText(e, it.right + ' ' + it.explanation); click(e.w, cx(e, 'teach-send'));
    const box = () => $(e, '#city-sheet input[type="checkbox"]');
    ok('revisar: tu texto con algún mark.hit, la versión correcta debajo, «Encontré N de M términos» y «Lo corregí bien» premarcada', $$(e, '#city-sheet mark.hit').length > 0 && sheetText(e).includes(it.right) && /Encontré \d+ de \d+ términos?/.test(sheetText(e)) && box().checked && /Lo corregí bien/.test(box().closest('label').textContent), sheetText(e).slice(0, 200));
    box().checked = false; click(e.w, cx(e, 'teach-ok'));
    const miss = $(e, '#city-sheet [role="status"]');
    ok('confirmar sin marcar vuelve a escribir con el texto, «Revisa la versión correcta» en role=status y el foco ahí', !!miss && /Revisa la versión correcta/.test(miss.textContent) && e.d.activeElement === miss && $(e, '#city-teach-text').value === it.right + ' ' + it.explanation && !saved(e.w).city.d.M02.taught.a02);
    typeText(e, it.wrong); click(e.w, cx(e, 'teach-send'));
    ok('revisar con la frase equivocada: «Lo corregí bien» no sale premarcada', box() && !box().checked);
    click(e.w, cx(e, 'sheetclose')); near(e, ap('a02')); click(e.w, $(e, '#city-act'));
    ok('reabrir tras «Cerrar» muestra la misma frase equivocada y recupera el texto', sheetText(e).includes(it.wrong) && $(e, '#city-teach-text').value === it.wrong);
    typeText(e, it.right + ' ' + it.explanation); click(e.w, cx(e, 'teach-send'));
    const xp0 = saved(e.w).xp, okb = cx(e, 'teach-ok'); click(e.w, okb); $(e, '#city-sheet').appendChild(okb); click(e.w, okb);   // el 2.º toque llega con el botón viejo aún en la hoja: debe ignorarse
    ok('confirmar marcada: taught.a02 y +15 XP una sola vez (doble toque)', e.errors.length === 0 && saved(e.w).city.d.M02.taught.a02 === true && saved(e.w).xp - xp0 === 15 && /lo entendió/.test(sheetText(e)), String(saved(e.w).xp - xp0));
    ok('sin ronda: la ciudad sigue visible, no hay pregunta ni «Volver», y no se registra ninguna respuesta', !$(e, '#city-root').hidden && !$(e, '.opt') && !$(e, '[data-act="back"]') && JSON.stringify(qsOf(e)) === qs0, JSON.stringify(qsOf(e)));
    e.w.close(); }
  { const e = boot({ seed: base({ topics: six(['T06']), virtues: { liderazgo: 1700000000000 } }), rndSeed: 7 }); await openA(e, 'a02');
    const it = itemOf(e);
    typeText(e, it.right + ' ' + it.explanation); click(e.w, cx(e, 'teach-send')); const xp0 = saved(e.w).xp; click(e.w, cx(e, 'teach-ok'));
    ok('corregir con Liderazgo: +20 XP y «(incluye +5 de Liderazgo)»', saved(e.w).xp - xp0 === 20 && /\(incluye \+5 de Liderazgo\)/.test(sheetText(e)), sheetText(e).slice(0, 100));
    e.w.close(); }
  { const e = boot({ seed: base({ topics: six(['T06']) }), rndSeed: 7 }); await openA(e, 'a02');
    const inert = () => !$(e, '#city-sheet img') && !$(e, '#city-sheet script') && e.w.__x === undefined;
    typeText(e, '</textarea><img src=x onerror="window.__x=1"><script>window.__x=2</script> uno dos tres cuatro cinco seis'); click(e.w, cx(e, 'teach-send'));
    const a = inert() && /<img src=x/.test(sheetText(e)); click(e.w, cx(e, 'teach-edit'));
    ok('el HTML del jugador es inerte en la revisión de corregir (visible como texto) y al reescribir', a && inert() && e.errors.length === 0, e.errors.join('|'));
    e.w.close(); }
  ok('el motor ya no tiene la ronda de enseñar (hadLead, leadBonus, kind === \'teach\')', !/hadLead|leadBonus|kind === 'teach'/.test(html));

  // ---- Esc, aviso de giro y teclado virtual ----
  { const e = mk(); await openA(e, 'a01'); const ta = $(e, '#city-teach-text'); ta.focus(); typeText(e, EXPLAIN_TXT);
    ta.dispatchEvent(new e.w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    ok('Esc en el textarea: la hoja sigue abierta, el foco pasa al h2, el texto se conserva y no hay pausa', !$(e, '#city-sheet').hidden && e.d.activeElement === $(e, '#city-sheet h2') && $(e, '#city-teach-text').value === EXPLAIN_TXT && $(e, '#city-pausebox').hidden);
    e.w.close(); }
  { const mm = { on: false }, e = boot({ seed: base({ topics: six(['T05']) }), mm }); await openA(e, 'a01'); const ta = $(e, '#city-teach-text'); ta.focus();
    mm.on = true; e.w.dispatchEvent(new e.w.Event('resize'));
    ok('giro con el foco en el textarea: el aviso no aparece y la hoja no queda inert', $(e, '#city-rotate').hidden && !$(e, '#city-sheet').hasAttribute('inert'));
    ta.blur();
    ok('al perder el foco el aviso aparece y la hoja queda inert', !$(e, '#city-rotate').hidden && $(e, '#city-sheet').hasAttribute('inert'));
    e.w.close(); }
  { const mm = { on: false }, e = boot({ seed: base({ topics: six(['T05']) }), mm }); await openA(e, 'a01');
    mm.on = true; e.w.dispatchEvent(new e.w.Event('resize'));
    ok('giro sin foco en el textarea: el aviso aparece', !$(e, '#city-rotate').hidden);
    e.w.close(); }
  { const e = boot({ seed: base({ topics: six(['T05']) }), vv: { cut: 300 } }); await openA(e, 'a01'); const V = e.w.visualViewport;
    V.__fire('resize');
    ok('teclado virtual: --kb en la hoja vale la altura recortada (300px)', $(e, '#city-sheet').style.getPropertyValue('--kb') === '300px', $(e, '#city-sheet').style.getPropertyValue('--kb'));
    const n = e.st.kb; V.__fire('resize'); V.__fire('scroll');
    ok('un resize o scroll con el mismo valor no vuelve a escribir --kb', e.st.kb === n, n + '→' + e.st.kb);
    click(e.w, cx(e, 'sheetclose'));
    ok('al cerrar la hoja --kb vuelve a 0px', $(e, '#city-sheet').style.getPropertyValue('--kb') === '0px');
    e.w.close(); }
  ok('las acciones de la hoja se anclan con bottom:var(--kb) (un padding no las subiría sobre el teclado)', /#city-sheet \.actions\{[^}]*bottom:var\(--kb,\s*0px\)/.test(html));

  // ---- gancho de prueba ----
  { const e = mk(); await enter(e); const xp0 = saved(e.w).xp; api(e).teach('a03');
    ok('__CITY_TEST_API__.teach(id) marca taught y suma XP; un id inexistente no hace nada', saved(e.w).city.d.M02.taught.a03 === true && saved(e.w).xp - xp0 === 15 && (api(e).teach('zz99'), !saved(e.w).city.d.M02.taught.zz99));
    e.w.close(); }

  results.forEach((r) => console.log(r.join(' | ')));
  const fails = results.filter((r) => r[0] === 'FAIL').length;
  console.log(fails ? `\n${fails} FALLOS` : '\nCITY_TEACH_UI OK (' + results.length + ' comprobaciones)');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('EXCEPCIÓN', e && e.stack); results.forEach((r) => console.log(r.join(' | '))); process.exit(2); });
