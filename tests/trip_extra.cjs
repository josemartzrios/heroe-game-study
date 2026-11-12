// Más integración del viaje 3D en el motor (jsdom, escena falsa): teclado con la confirmación abierta y en la fase
// arrive, respaldo por contextlost → ronda, aviso de almacenamiento lleno, bono de racha, capas del HUD y reentrada.
// boot() es una copia reducida de la de tests/trip_engine.cjs (ese archivo ejecuta su suite al cargarse).
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const html = fs.readFileSync(require('path').join(__dirname, '..', 'juego_estudio.html'), 'utf8');
const results = [];
const ok = (name, cond, extra) => { results.push([cond ? 'PASS' : 'FAIL', name, extra || '']); };
const tick = async (n = 4) => { for (let i = 0; i < n; i++) await new Promise((r) => setTimeout(r, 0)); };
const KEY = 'estudio_isw_v1';

// opts: seed (objeto), full (setItem lanza QuotaExceededError), goToPending
function boot(opts = {}) {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => errors.push('jsdomError: ' + (e.detail || e.message)));
  vc.on('error', (e) => errors.push('console.error: ' + e));
  const st = { pendingGoTo: !!opts.goToPending, disposed: 0, calls: [], canvases: [], goToResolvers: [] };
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.test/', virtualConsole: vc,
    beforeParse(w) {
      if (opts.seed) w.localStorage.setItem(KEY, JSON.stringify(opts.seed));
      w.__CITY_TEST__ = true;
      w.scrollTo = () => {}; w.HTMLCanvasElement.prototype.getContext = function () { return new Proxy({}, { get: () => () => {}, set: () => true }); };   // iconos del héroe
      w.Element.prototype.scrollIntoView = function () {};
      if (opts.full) {
        const proto = Object.getPrototypeOf(w.localStorage), orig = proto.setItem;
        proto.setItem = function (k, v) { if (w.__full) throw new w.DOMException('quota', 'QuotaExceededError'); return orig.call(this, k, v); };
        w.__full = true;
      }
      w.URL.createObjectURL = () => 'blob:x'; w.URL.revokeObjectURL = () => {};
      w.__TRIP_IMPORT__ = () => Promise.resolve({ THREE_FAKE: true });
      w.__TRIP_SCENE__ = {
        create(THREE, canvas) {
          st.canvases.push(canvas);
          return Promise.resolve({
            goTo: (i) => { st.calls.push(['goTo', i]); if (st.pendingGoTo) return new Promise((r) => st.goToResolvers.push(r)); return Promise.resolve(); },
            setLayers: (n) => st.calls.push(['setLayers', n]),
            lost: () => st.calls.push(['lost']),
            look: (dx, dy) => st.calls.push(['look', dx, dy]),
            resize: () => st.calls.push(['resize']),
            setPaused: (r, on) => st.calls.push(['setPaused', r, on]),
            dispose: () => { st.disposed++; st.calls.push(['dispose']); }
          });
        }
      };
    },
  });
  return { dom, w: dom.window, d: dom.window.document, errors, st };
}
const norm = (s) => s.replace(/`/g, '').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
function allQs(w) { return w.eval('MODULES').flatMap((m) => m.questions); }
function click(w, el) { el.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); }
function modBtn(d, id) { return [...d.querySelectorAll('[data-act="mod"]')].find((b) => b.dataset.id === id); }
function btn(d, act) { return d.querySelector(`[data-act="${act}"]`); }
function findQ(w, d) {
  const sq = (t) => t.replace(/\s+/g, '');
  const p = sq(d.querySelector('.prompt').textContent);
  const shown = [...d.querySelectorAll('.opt')].map((b) => norm(b.querySelector('span:last-child').textContent));
  const c = allQs(w).filter((q) => sq(q.prompt.replace(/`/g, '').replace(/\*\*/g, '')) === p);
  return c.find((q) => q.type === 'tf' ? true : q.options.every((o) => shown.includes(norm(o)))) || c[0];
}
function correctText(q) { return q.type === 'tf' ? (q.answer ? 'Verdadero' : 'Falso') : q.options[q.answer]; }
function optBtn(d, text) { return [...d.querySelectorAll('.opt')].find((b) => norm(b.querySelector('span:last-child').textContent) === norm(text)); }
const answerRight = (e) => { const q = findQ(e.w, e.d); click(e.w, optBtn(e.d, correctText(q))); return q; };
const answerWrong = (e) => { const q = findQ(e.w, e.d); const ct = norm(correctText(q)); click(e.w, [...e.d.querySelectorAll('.opt')].find((x) => norm(x.querySelector('span:last-child').textContent) !== ct)); return q; };
function enter(e) { click(e.w, modBtn(e.d, 'M08')); click(e.w, btn(e.d, 'trip')); }
const root = (e) => e.d.getElementById('trip-root');
const h1 = (e) => { const h = e.d.querySelector('.head h1'); return h ? h.textContent : ''; };
const key = (e, k, o = {}) => e.d.dispatchEvent(new e.w.KeyboardEvent('keydown', Object.assign({ key: k, bubbles: true, cancelable: true }, o)));
// Como en el navegador: keydown en el elemento enfocado y, si es un BUTTON y nadie lo canceló, Enter lo activa
function keyFocused(e, k) {
  const t = e.d.activeElement || e.d.body;
  const notCanceled = t.dispatchEvent(new e.w.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
  if (notCanceled && k === 'Enter' && t.tagName === 'BUTTON' && !t.disabled) click(e.w, t);
}
const stored = (e) => { const raw = e.w.localStorage.getItem(KEY); return raw ? JSON.parse(raw) : { xp: 0, qs: {}, topics: {} }; };
const looks = (e) => e.st.calls.filter((c) => c[0] === 'look').length;
const MAIN = 'Redes informáticas';
async function arrived(opts) { const e = boot(opts); enter(e); await tick(); return e; }
async function asking(opts) { const e = await arrived(opts); click(e.w, btn(e.d, 'tripask')); return e; }

(async () => {
  let e;

  // (A) flechas con la confirmación abierta
  e = await asking(); answerRight(e);
  click(e.w, e.d.querySelector('#trip-ui [data-act="tripquit"]'));
  { const n0 = looks(e);
    for (const k of ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']) key(e, k);
    ok('A con la confirmación abierta las flechas no giran la cámara', looks(e) === n0, 'look extra=' + (looks(e) - n0));
    ok('A la confirmación sigue abierta con el foco en "Seguir"', !e.d.getElementById('trip-confirm').hidden && e.d.activeElement.dataset.act === 'tripcancel');
    key(e, 'Enter');
    ok('A Enter en el body con la confirmación abierta no avanza la pregunta', !!e.d.querySelector('.fb'));
    key(e, 'Escape'); key(e, 'ArrowUp');
    ok('A tras cerrar con Esc, ArrowUp llama a look(0, 10)', e.st.calls.some((c) => c[0] === 'look' && c[1] === 0 && c[2] === 10)); }
  // (A2) con la confirmación abierta los botones de la hoja no hacen nada
  click(e.w, e.d.querySelector('#trip-ui [data-act="tripquit"]'));
  click(e.w, btn(e.d, 'tripnext'));
  ok('A2 clic en "Continuar" con la confirmación abierta no avanza', !!e.d.querySelector('.fb') && !e.d.getElementById('trip-confirm').hidden);
  e.w.close();

  // (A3) flechas mientras carga (sin escena): no lanzan
  { const e2 = boot(); e2.w.__TRIP_IMPORT__ = () => new Promise(() => {}); enter(e2);
    key(e2, 'ArrowLeft'); key(e2, 'Enter'); key(e2, '1');
    ok('A3 flechas, Enter y 1 mientras carga: sin errores ni look()', !e2.errors.length && looks(e2) === 0, e2.errors.join(' | ')); e2.w.close(); }

  // (A4) modificadores: Ctrl/Alt/Meta + tecla se ignoran
  e = await asking();
  key(e, '1', { ctrlKey: true }); key(e, '1', { altKey: true }); key(e, '1', { metaKey: true }); key(e, 'ArrowLeft', { ctrlKey: true });
  ok('A4 Ctrl/Alt/Meta+1 no responden y Ctrl+flecha no gira', !e.d.querySelector('.fb') && looks(e) === 0);
  e.w.close();

  // (B) Enter y dígitos en la fase arrive
  e = await arrived();
  e.d.activeElement.blur(); key(e, 'Enter');
  ok('B Enter con el foco en el body en arrive no abre la pregunta ni responde', !!btn(e.d, 'tripask') && !e.d.querySelector('.opt') && !e.d.querySelector('.fb'));
  key(e, '1');
  ok('B la tecla 1 en arrive no hace nada', !!btn(e.d, 'tripask') && !e.d.querySelector('.fb') && !Object.keys(stored(e).qs || {}).length);
  tFocusAsk(e); keyFocused(e, 'Enter');
  ok('B Enter con el foco en "Ver pregunta" abre la pregunta una sola vez y no responde', e.d.querySelectorAll('.opt').length >= 2 && !e.d.querySelector('.fb') && !Object.keys(stored(e).qs || {}).length);
  ok('B tras abrir la pregunta el foco está en la primera opción', e.d.activeElement === e.d.querySelector('.opt'));
  keyFocused(e, 'Enter');
  ok('B Enter con el foco en la primera opción responde una sola vez', !!e.d.querySelector('.fb') && Object.values(stored(e).qs).reduce((n, r) => n + r.a, 0) === 1, JSON.stringify(stored(e).qs));
  keyFocused(e, 'Enter');
  ok('B Enter en "Continuar" avanza una sola vez (no salta la siguiente)', !e.d.querySelector('.fb') && Object.values(stored(e).qs).reduce((n, r) => n + r.a, 0) === 1);
  e.w.close();
  function tFocusAsk(env) { btn(env.d, 'tripask').focus(); }

  // (C) dígitos fuera de rango y en la fase result
  e = await asking();
  { const n = e.d.querySelectorAll('.opt').length;
    key(e, String(n + 1)); key(e, '0');
    ok('C tecla N+1 y 0 no responden', !e.d.querySelector('.fb'), 'opciones=' + n);
    key(e, String(n));
    ok('C tecla N (última opción) responde', !!e.d.querySelector('.fb'));
    const a0 = Object.values(stored(e).qs).reduce((s, r) => s + r.a, 0);
    key(e, '1'); key(e, '2');
    ok('C en la fase result las teclas no registran otra respuesta', Object.values(stored(e).qs).reduce((s, r) => s + r.a, 0) === a0); }
  e.w.close();

  // (D) Esc en arrive sin haber respondido sale directo, sin confirmación
  e = await arrived(); key(e, 'Escape');
  ok('D Esc en arrive sin responder vuelve a M08 sin confirmación', h1(e) === MAIN && root(e).hidden && e.st.disposed === 1);
  e.w.close();

  // (E) respaldo por contextlost → "Hacer ronda de M08"
  e = await arrived();
  e.st.canvases[0].dispatchEvent(new e.w.Event('webglcontextlost'));
  ok('E contextlost: aparece el respaldo con tripround', !!root(e).querySelector('[data-act="tripround"]'));
  click(e.w, root(e).querySelector('[data-act="tripround"]'));
  ok('E tripround tras contextlost abre una ronda de M08 con pregunta y #trip-root oculto y vacío', !!e.d.querySelector('#app .prompt') && root(e).hidden && root(e).innerHTML === '');
  ok('E la escena se liberó una sola vez', e.st.disposed === 1, 'disposed=' + e.st.disposed);
  ok('E body ya no tiene trip-on', !e.d.body.classList.contains('trip-on'));
  { const q = findQ(e.w, e.d);
    ok('E la ronda es de M08', !!q && q.id.indexOf('M08-') === 0, q && q.id); }
  key(e, 'Escape'); key(e, 'ArrowLeft');
  ok('E en la ronda, Esc y flechas no tocan el viaje', looks(e) === 0 && !!e.d.querySelector('#app .prompt'));
  ok('E sin errores de consola', !e.errors.length, e.errors.join(' | '));
  e.w.close();
  // (E2) contextlost con una pregunta respondida → "Volver" sin confirmación
  e = await asking(); answerWrong(e);
  e.st.canvases[0].dispatchEvent(new e.w.Event('webglcontextlost'));
  click(e.w, root(e).querySelector('[data-act="tripback"]'));
  ok('E2 "Volver" desde el respaldo tras responder sale a M08 sin confirmación', h1(e) === MAIN && root(e).hidden);
  e.w.close();

  // (F) bono de racha: la 3.ª respuesta correcta seguida suma 10×dificultad + 5
  e = await asking();
  { const gains = [];
    for (let i = 0; i < 3; i++) {
      if (btn(e.d, 'tripask')) click(e.w, btn(e.d, 'tripask'));
      const x0 = stored(e).xp, q = answerRight(e); gains.push([stored(e).xp - x0, q.difficulty]);
      click(e.w, btn(e.d, 'tripnext')); await tick();
    }
    ok('F 1.ª y 2.ª correctas: 10×dificultad', gains[0][0] === 10 * gains[0][1] && gains[1][0] === 10 * gains[1][1], JSON.stringify(gains));
    ok('F 3.ª correcta seguida: 10×dificultad + 5', gains[2][0] === 10 * gains[2][1] + 5, JSON.stringify(gains)); }
  e.w.close();
  e = await asking();
  { const x0 = stored(e).xp; answerWrong(e);
    ok('F un fallo suma 0 XP', stored(e).xp === x0, x0 + '→' + stored(e).xp); }
  e.w.close();

  // (G) retransmisión: acertar la segunda pregunta registra ambas
  e = await asking();
  { const q1 = answerWrong(e); click(e.w, btn(e.d, 'tripnext'));
    const q2 = answerRight(e), s = stored(e);
    ok('G la fallada queda en la cola (q true) y la retransmitida cuenta como acierto', s.qs[q1.id].q === true && s.qs[q2.id].a === 1 && s.qs[q2.id].c === 1, JSON.stringify([s.qs[q1.id], s.qs[q2.id]]));
    ok('G el historial del tema termina en [0, 1]', JSON.stringify((s.topics['M08:' + q1.topic] || []).slice(-2)) === '[0,1]', JSON.stringify(s.topics['M08:' + q1.topic])); }
  e.w.close();

  // (H) capas del HUD tras la estación 2 (S1, layers 1)
  e = await arrived();
  { for (let g = 0; g < 50 && e.d.getElementById('trip-pill').textContent !== 'Estación 3 de 10'; g++) {
      if (btn(e.d, 'tripask')) { click(e.w, btn(e.d, 'tripask')); continue; }
      if (e.d.querySelector('.opt:not([disabled])')) { answerRight(e); continue; }
      if (btn(e.d, 'tripnext')) { click(e.w, btn(e.d, 'tripnext')); await tick(); continue; }
      await tick();
    }
    const chips = [...e.d.querySelectorAll('#trip-layers .chip')].map((c) => c.textContent);
    ok('H en la estación 3 el HUD muestra la capa "Datos"', JSON.stringify(chips) === '["Datos"]', JSON.stringify(chips));
    ok('H setLayers recibió 0 y luego 1', JSON.stringify(e.st.calls.filter((c) => c[0] === 'setLayers').map((c) => c[1])) === '[0,1]'); }
  e.w.close();

  // (I) visibilitychange con la pestaña oculta y resize después de salir
  e = await arrived();
  Object.defineProperty(e.d, 'hidden', { configurable: true, get: () => true });
  e.d.dispatchEvent(new e.w.Event('visibilitychange'));
  ok('I pestaña oculta: setPaused("hidden", true)', e.st.calls.some((c) => c[0] === 'setPaused' && c[1] === 'hidden' && c[2] === true));
  click(e.w, e.d.querySelector('#trip-ui [data-act="tripquit"]'));
  { const n0 = e.st.calls.length;
    e.w.dispatchEvent(new e.w.Event('resize')); e.d.dispatchEvent(new e.w.Event('visibilitychange'));
    ok('I tras salir, resize y visibilitychange no llaman a la escena', e.st.calls.length === n0, JSON.stringify(e.st.calls.slice(n0))); }
  ok('I sin errores', !e.errors.length, e.errors.join(' | '));
  e.w.close();

  // (J) salir y volver a entrar reinicia el viaje
  e = await asking(); answerRight(e); click(e.w, btn(e.d, 'tripnext')); await tick();
  click(e.w, e.d.querySelector('#trip-ui [data-act="tripquit"]')); click(e.w, btn(e.d, 'tripconfirm'));
  click(e.w, btn(e.d, 'trip')); await tick();
  ok('J al volver a entrar empieza en "Estación 1 de 10" sin capas', e.d.getElementById('trip-pill').textContent === 'Estación 1 de 10' && !e.d.querySelector('#trip-layers .chip'));
  key(e, 'Escape');
  ok('J recién reentrado (sin responder) Esc sale sin confirmación', h1(e) === MAIN);
  e.w.close();

  // (K) almacenamiento lleno dentro del viaje
  e = await asking({ full: true });
  answerWrong(e); click(e.w, btn(e.d, 'tripnext')); answerRight(e);
  { const w1 = e.d.querySelectorAll('#savewarn');
    ok('K almacenamiento lleno en el viaje: un solo #savewarn', w1.length === 1, 'n=' + w1.length);
    ok('K el aviso está fuera de #trip-root', w1.length === 1 && !root(e).contains(w1[0])); }
  ok('K la respuesta igual se muestra (sin congelar la hoja)', !!e.d.querySelector('#trip-sheet .fb'));
  click(e.w, e.d.querySelector('#trip-ui [data-act="tripquit"]')); click(e.w, btn(e.d, 'tripconfirm'));
  ok('K al salir del viaje el aviso sigue (uno solo)', e.d.querySelectorAll('#savewarn').length === 1 && h1(e) === MAIN);
  ok('K sin errores de consola', !e.errors.length, e.errors.join(' | '));
  e.w.close();

  // (L) llegar a una estación con goTo pendiente y salir: la llegada tardía no pinta nada
  e = await arrived({ goToPending: true });
  key(e, 'Escape');
  e.st.goToResolvers[0](); await tick();
  ok('L goTo resuelto después de salir no muestra la hoja ni errores', root(e).hidden && root(e).innerHTML === '' && h1(e) === MAIN && !e.errors.length, e.errors.join(' | '));
  e.w.close();

  results.forEach((r) => console.log(r.join(' | ')));
  const fails = results.filter((r) => r[0] === 'FAIL').length;
  console.log(fails ? `\n${fails} FALLOS` : '\nTRIP_EXTRA OK (' + results.length + ' comprobaciones)');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('EXCEPCIÓN', e && e.stack); results.forEach((r) => console.log(r.join(' | '))); process.exit(2); });
