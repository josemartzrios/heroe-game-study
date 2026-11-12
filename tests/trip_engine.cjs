// Integración del viaje 3D en el motor (jsdom, sin WebGL): vista trip, carga diferida, respaldo, salida y ciclo de vida.
// Las funciones auxiliares se copian de tests/record.cjs (no se puede hacer require: ejecuta su suite y termina el proceso).
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const html = fs.readFileSync(require('path').join(__dirname, '..', 'juego_estudio.html'), 'utf8');
const results = [];
const ok = (name, cond, extra) => { results.push([cond ? 'PASS' : 'FAIL', name, extra || '']); };
const tick = async (n = 4) => { for (let i = 0; i < n; i++) await new Promise((r) => setTimeout(r, 0)); };

// opts: seed, imp: 'ok'|'reject'|'pending'|undefined(sin gancho), objUrl: true|false, scene: true|false, createPending: bool, goToPending: bool, matchMedia: bool|undefined
function boot(opts = {}) {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => errors.push('jsdomError: ' + (e.detail || e.message)));
  vc.on('error', (e) => errors.push('console.error: ' + e));
  const st = { pendingGoTo: !!opts.goToPending, imports: 0, revokes: 0, creates: 0, disposed: 0, calls: [], scenes: [], canvases: [], lastOpts: null, resolveImport: null, resolveCreate: null, rejectImport: null, goToResolvers: [] };
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.test/', virtualConsole: vc,
    beforeParse(w) {
      if (opts.seed) w.localStorage.setItem('estudio_isw_v1', JSON.stringify(opts.seed));
      if (!opts.noTest) w.__CITY_TEST__ = true;
      w.scrollTo = () => {}; w.HTMLCanvasElement.prototype.getContext = function () { return new Proxy({}, { get: () => () => {}, set: () => true }); };   // iconos del héroe
      w.Element.prototype.scrollIntoView = function () { if (opts.spyScroll) (w.__scrolled = w.__scrolled || []).push(this); };
      if (opts.rndSeed) { let a = opts.rndSeed; w.Math.random = function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
      if (opts.matchMedia !== undefined) w.matchMedia = () => ({ matches: !!opts.matchMedia });
      if (opts.objUrl !== false) { w.URL.createObjectURL = () => 'blob:x'; w.URL.revokeObjectURL = () => { st.revokes++; }; }
      if (opts.imp) {
        w.__TRIP_IMPORT__ = () => {
          st.imports++;
          if (opts.imp === 'reject') return Promise.reject(new Error('import falso'));
          if (opts.imp === 'pending') return new Promise((res, rej) => { st.resolveImport = () => res({ THREE_FAKE: true }); st.rejectImport = rej; });
          return Promise.resolve({ THREE_FAKE: true });
        };
      }
      if (opts.scene !== false) {
        w.__TRIP_SCENE__ = {
          create(THREE, canvas, stations, o) {
            st.creates++; st.lastOpts = o; st.canvases.push(canvas);
            const api = {
              goTo: (i) => { st.calls.push(['goTo', i]); if (opts.goToRejectAt === i) return Promise.reject(new Error('goTo falló')); if (st.pendingGoTo) return new Promise((r) => st.goToResolvers.push(r)); return Promise.resolve(); },
              setLayers: (n) => { st.calls.push(['setLayers', n]); if (opts.layersThrow) throw new Error('setLayers falló'); },
              lost: () => st.calls.push(['lost']),
              look: (dx, dy) => st.calls.push(['look', dx, dy]),
              resize: () => st.calls.push(['resize']),
              setPaused: (r, on) => st.calls.push(['setPaused', r, on]),
              dispose: () => { st.disposed++; st.calls.push(['dispose']); if (st.disposed === 1) canvas.dispatchEvent(new w.Event('webglcontextlost')); }
            };
            st.scenes.push(api);
            if (opts.createPending) return new Promise((res) => { st.resolveCreate = () => res(api); });
            return Promise.resolve(api);
          }
        };
      }
    },
  });
  return { dom, w: dom.window, d: dom.window.document, errors, st };
}
const norm = (s) => s.replace(/`/g, '').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
function allQs(w) { return w.eval('MODULES').flatMap((m) => m.questions); }
function click(w, el) { el.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); }
function modBtn(d, id) { return [...d.querySelectorAll('[data-act="mod"]')].find((b) => b.dataset.id === id); }
function btn(d, act, extra) { return [...d.querySelectorAll(`[data-act="${act}"]`)].find((b) => !extra || extra(b)); }
function findQ(w, d) {
  const sq = (t) => t.replace(/\s+/g, '');
  const p = sq(d.querySelector('.prompt').textContent);
  const shown = [...d.querySelectorAll('.opt')].map((b) => norm(b.querySelector('span:last-child').textContent));
  const c = allQs(w).filter((q) => sq(q.prompt.replace(/`/g, '').replace(/\*\*/g, '')) === p);
  return c.find((q) => q.type === 'tf' ? true : q.options.every((o) => shown.includes(norm(o)))) || c[0];
}
function correctText(q) { return q.type === 'tf' ? (q.answer ? 'Verdadero' : 'Falso') : q.options[q.answer]; }
function optBtn(d, text) { return [...d.querySelectorAll('.opt')].find((b) => norm(b.querySelector('span:last-child').textContent) === norm(text)); }
module.exports = {};

function enter(e) { click(e.w, modBtn(e.d, 'M08')); const t = btn(e.d, 'trip'); if (!t) throw new Error('sin botón trip'); click(e.w, t); }
const root = (e) => e.d.getElementById('trip-root');
const h1 = (e) => { const h = e.d.querySelector('.head h1'); return h ? h.textContent : ''; };
const key = (e, k) => e.d.dispatchEvent(new e.w.KeyboardEvent('keydown', { key: k, bubbles: true }));

(async () => {
  let e;
  { const e0 = boot({ seed: undefined, imp: 'ok', noTest: true }); enter(e0); await tick(8);
    ok('ganchos del viaje: sin __CITY_TEST__ no se usan __TRIP_IMPORT__ ni __TRIP_SCENE__ (cae al respaldo)', e0.st.imports === 0 && e0.st.creates === 0 && /no pudo abrir el viaje 3D/.test(e0.d.getElementById('trip-root').textContent), e0.st.imports + ' ' + e0.st.creates);
    e0.w.close(); }


  // (a) botón solo en M08
  e = boot({ imp: 'ok' }); click(e.w, modBtn(e.d, 'M08'));
  { const b = btn(e.d, 'trip');
    ok('a botón "Viaja como paquete" existe en M08', !!b && /Viaja como paquete/.test(b.textContent)); }
  click(e.w, btn(e.d, 'home')); click(e.w, modBtn(e.d, 'M01'));
  ok('a no hay botón trip en M01', !btn(e.d, 'trip')); e.w.close();

  // (b) al entrar
  e = boot({ imp: 'pending' }); enter(e);
  { const r = root(e), s = r.querySelector('[role="status"]');
    ok('b #trip-root visible con "Preparando el viaje…" (role=status)', !r.hidden && !!s && /Preparando el viaje…/.test(s.textContent));
    ok('b hay [data-act="tripquit"]', !!r.querySelector('[data-act="tripquit"]'));
    ok('b #app vacío y body con game y trip-on', e.d.getElementById('app').innerHTML.trim() === '' && e.d.body.classList.contains('game') && e.d.body.classList.contains('trip-on')); }
  e.w.close();

  // (c) el import rechaza → respaldo
  e = boot({ imp: 'reject' }); enter(e); await tick();
  { const r = root(e), al = r.querySelector('[role="alert"]');
    ok('c respaldo: texto en un role=alert', !!al && /Tu navegador no pudo abrir el viaje 3D\./.test(al.textContent));
    ok('c respaldo: botones tripround y tripback', !!r.querySelector('[data-act="tripround"]') && !!r.querySelector('[data-act="tripback"]'));
    ok('c respaldo: el foco está en "Volver"', e.d.activeElement && e.d.activeElement.dataset.act === 'tripback');
    click(e.w, r.querySelector('[data-act="tripback"]'));
    ok('c "Volver" lleva a M08 y #trip-root queda hidden y vacío', h1(e) === 'Redes informáticas' && r.hidden && r.innerHTML === '', h1(e)); }
  ok('c sin errores de consola', !e.errors.length, e.errors.join(' | ')); e.w.close();
  e = boot({ imp: 'reject' }); enter(e); await tick();
  click(e.w, root(e).querySelector('[data-act="tripround"]'));
  ok('c "Hacer ronda de M08" abre una ronda y #trip-root queda hidden', !!e.d.querySelector('.prompt') && root(e).hidden && root(e).innerHTML === ''); e.w.close();

  // (c3) un elemento con id __TRIP_IMPORT__ no cuenta como gancho
  e = boot({ objUrl: false }); e.d.body.insertAdjacentHTML('beforeend', '<div id="__TRIP_IMPORT__"></div>'); enter(e); await tick();
  ok('c3 elemento #__TRIP_IMPORT__: aparece el respaldo sin excepción', !!root(e).querySelector('[role="alert"]') && !e.errors.length, e.errors.join(' | ')); e.w.close();

  // (d) sin createObjectURL
  e = boot({ objUrl: false }); enter(e); await tick();
  ok('d sin createObjectURL: respaldo y sin errores', !!root(e).querySelector('[role="alert"]') && !e.errors.length, e.errors.join(' | ')); e.w.close();

  // (e2) tras un import correcto
  e = boot({ imp: 'ok' }); enter(e); await tick();
  ok('e2 #three-src ya no existe y revokeObjectURL se llamó 1 vez', !e.d.getElementById('three-src') && e.st.revokes === 1, 'revokes=' + e.st.revokes);
  ok('e2 reducedMotion es false sin matchMedia', e.st.lastOpts && e.st.lastOpts.reducedMotion === false);
  e.w.close();
  e = boot({ imp: 'ok', matchMedia: true }); enter(e); await tick();
  ok('e2 reducedMotion es true si matchMedia lo pide', e.st.lastOpts && e.st.lastOpts.reducedMotion === true); e.w.close();

  // (e) caché + (f) salir + (f2) sin respaldo falso + (g)
  e = boot({ imp: 'ok' }); enter(e); await tick();
  ok('e escena creada: #trip-cv (aria-hidden) y #trip-ui con tripquit', !!root(e).querySelector('canvas#trip-cv[aria-hidden="true"]') && !!root(e).querySelector('#trip-ui [data-act="tripquit"]'));
  ok('e el mensaje de carga ya no está', !/Preparando el viaje/.test(root(e).textContent));
  const cv1 = e.st.canvases[0];
  click(e.w, root(e).querySelector('[data-act="tripquit"]'));
  ok('f salir: dispose() 1 vez y #trip-root hidden y vacío', e.st.disposed === 1 && root(e).hidden && root(e).innerHTML === '', 'disposed=' + e.st.disposed);
  ok('f2 salir normal no muestra el respaldo y vuelve a M08', !root(e).querySelector('[role="alert"]') && h1(e) === 'Redes informáticas');
  cv1.dispatchEvent(new e.w.Event('webglcontextlost'));
  ok('g contextlost del canvas viejo no muestra respaldo', root(e).hidden && root(e).innerHTML === '' && h1(e) === 'Redes informáticas');
  click(e.w, btn(e.d, 'trip')); await tick();
  ok('e caché: __TRIP_IMPORT__ 1 vez y create 2 veces', e.st.imports === 1 && e.st.creates === 2, `imports=${e.st.imports} creates=${e.st.creates}`);
  ok('e sin errores de consola', !e.errors.length, e.errors.join(' | ')); e.w.close();

  // (h) salir mientras carga
  e = boot({ imp: 'pending' }); enter(e);
  click(e.w, root(e).querySelector('[data-act="tripquit"]'));
  ok('h salir mientras carga lleva a M08', h1(e) === 'Redes informáticas' && root(e).hidden);
  e.st.resolveImport(); await tick();
  ok('h al resolver el import tardío no se crea la escena', e.st.creates === 0, 'creates=' + e.st.creates); e.w.close();

  // (i) entrar, salir, entrar con el import pendiente
  e = boot({ imp: 'pending' }); enter(e);
  click(e.w, root(e).querySelector('[data-act="tripquit"]')); click(e.w, btn(e.d, 'trip'));
  e.st.resolveImport(); await tick();
  ok('i create 1 vez y la escena queda viva', e.st.creates === 1 && e.st.disposed === 0 && !root(e).hidden && !!root(e).querySelector('#trip-cv'), `creates=${e.st.creates} disposed=${e.st.disposed}`);
  ok('i el import se llamó 1 vez', e.st.imports === 1); e.w.close();

  // (j) contextlost con la escena creada
  e = boot({ imp: 'ok' }); enter(e); await tick();
  e.st.canvases[0].dispatchEvent(new e.w.Event('webglcontextlost'));
  ok('j contextlost: dispose 1 vez y aparece el respaldo', e.st.disposed === 1 && !!root(e).querySelector('[role="alert"]') && !root(e).hidden, 'disposed=' + e.st.disposed); e.w.close();

  // (k) create resuelve después de salir
  e = boot({ imp: 'ok', createPending: true }); enter(e); await tick();
  click(e.w, root(e).querySelector('[data-act="tripquit"]'));
  e.st.resolveCreate(); await tick();
  ok('k create tardío: se llama al dispose() de esa escena', e.st.disposed === 1 && root(e).hidden, 'disposed=' + e.st.disposed); e.w.close();

  // (l) resize y visibilitychange
  e = boot({ imp: 'ok' }); enter(e); await tick();
  e.w.dispatchEvent(new e.w.Event('resize'));
  ok('l resize llama a scene.resize()', e.st.calls.some((c) => c[0] === 'resize'));
  e.d.dispatchEvent(new e.w.Event('visibilitychange'));
  ok('l visibilitychange llama a setPaused("hidden", false)', e.st.calls.some((c) => c[0] === 'setPaused' && c[1] === 'hidden' && c[2] === false)); e.w.close();

  // (m) Esc mientras carga
  e = boot({ imp: 'pending' }); enter(e); key(e, 'Escape');
  ok('m Esc mientras carga lleva a M08', h1(e) === 'Redes informáticas' && root(e).hidden); e.w.close();

  // ===================== Tarea 6: juego dentro del viaje =====================
  const KEY = 'estudio_isw_v1';
  const stored = (e) => { const raw = e.w.localStorage.getItem(KEY); return raw ? JSON.parse(raw) : { xp: 0, session: 0, topics: {}, qs: {}, boss: {} }; };
  const opt0 = (e) => e.d.querySelector('.opt');
  const answerRight = (e) => { const q = findQ(e.w, e.d); click(e.w, optBtn(e.d, correctText(q))); return q; };
  const answerWrong = (e) => { const q = findQ(e.w, e.d); const ct = norm(correctText(q)); const b = [...e.d.querySelectorAll('.opt')].find((x) => norm(x.querySelector('span:last-child').textContent) !== ct); click(e.w, b); return q; };
  async function toQuestion(opts) { const e = boot(Object.assign({ imp: 'ok' }, opts || {})); enter(e); await tick(); click(e.w, btn(e.d, 'tripask')); return e; }
  async function runTrip(e, rightPolicy) {
    let n = 0;
    for (let g = 0; g < 300; g++) {
      if (btn(e.d, 'tripend')) return n;
      const ask = btn(e.d, 'tripask');
      if (ask) { click(e.w, ask); continue; }
      if ([...e.d.querySelectorAll('.opt:not([disabled])')].length) { const q = findQ(e.w, e.d); (rightPolicy(n++, q) ? answerRight : answerWrong)(e); continue; }
      const nx = btn(e.d, 'tripnext'); if (nx) { click(e.w, nx); await tick(3); continue; }
      await tick(2);
    }
    return -1;
  }

  // (n0) viajando: antes de llegar no hay hoja y el foco está en Salir
  e = boot({ imp: 'ok', goToPending: true }); enter(e); await tick();
  ok('n0 viajando: no existe tripask', !btn(e.d, 'tripask'));
  ok('n0 viajando: el foco está en tripquit', e.d.activeElement && e.d.activeElement.dataset.act === 'tripquit');
  ok('n0 viajando: setPaused("sheet", false) y ningún "sheet", true', e.st.calls.some((c) => c[0] === 'setPaused' && c[1] === 'sheet' && c[2] === false) && !e.st.calls.some((c) => c[0] === 'setPaused' && c[1] === 'sheet' && c[2] === true));
  e.st.goToResolvers[0](); await tick();
  ok('n0 después de resolver goTo aparece la hoja', !!btn(e.d, 'tripask'));
  // (n) HUD tras llegar
  ok('n pill = "Estación 1 de 10"', e.d.getElementById('trip-pill').textContent === 'Estación 1 de 10');
  ok('n .bar[aria-label] = "Estación 1 de 10"', e.d.querySelector('.bar[aria-label]').getAttribute('aria-label') === 'Estación 1 de 10');
  ok('n #trip-live contiene "Estación 1:"', /Estación 1:/.test(e.d.getElementById('trip-live').textContent));
  ok('n tripask tiene el foco', e.d.activeElement === btn(e.d, 'tripask'));
  ok('n setPaused("sheet", true) al mostrar la hoja', e.st.calls.some((c) => c[0] === 'setPaused' && c[1] === 'sheet' && c[2] === true));
  ok('y meta viewport con viewport-fit=cover', /viewport-fit=cover/.test(e.d.querySelector('meta[name=viewport]').content)); e.w.close();

  // (o) pregunta y acierto, (w) estado nuevo
  e = await toQuestion();
  ok('o hay .prompt y .opt[data-act=tripopt], sin .timer', !!e.d.querySelector('.prompt') && !!e.d.querySelector('.opt[data-act="tripopt"]') && !e.d.querySelector('.timer'));
  ok('o el foco está en la primera .opt', e.d.activeElement === opt0(e));
  const xp0 = stored(e).xp;
  { const q = answerRight(e); const s1 = stored(e), h = s1.topics['M08:' + q.topic] || [];
    ok('o .fb.good con "Correcto" y foco en tripnext', !!e.d.querySelector('.fb.good') && /Correcto/.test(e.d.querySelector('.fb').textContent) && e.d.activeElement === btn(e.d, 'tripnext'));
    ok('o historial del tema termina en 1', h[h.length - 1] === 1, JSON.stringify(h));
    ok('o xp subió en 10×dificultad', s1.xp - xp0 === 10 * q.difficulty, 'xp ' + xp0 + '→' + s1.xp + ' dif=' + q.difficulty);
    ok('o session se actualizó', s1.session >= 1);
    ok('o #trip-live no contiene "Correcto"', !/Correcto/.test(e.d.getElementById('trip-live').textContent));
    ok('w estado nuevo: se creó estudio_isw_v1 con topics M08', Object.keys(s1.topics).some((k) => k.indexOf('M08:') === 0)); }
  e.w.close();

  // (p) fallo, (p2) lost(), retransmisión
  e = await toQuestion();
  { const q = answerWrong(e), fb = e.d.querySelector('.fb.bad');
    ok('p .fb.bad con "Paquete perdido: retransmitiendo" y "Respuesta correcta:"', !!fb && /Paquete perdido: retransmitiendo/.test(fb.textContent) && /Respuesta correcta:/.test(fb.textContent));
    ok('p qs[q.id].q === true', stored(e).qs[q.id] && stored(e).qs[q.id].q === true);
    ok('p #trip-live no contiene "Paquete perdido"', !/Paquete perdido/.test(e.d.getElementById('trip-live').textContent));
    ok('p2 la escena recibió lost()', e.st.calls.some((c) => c[0] === 'lost'));
    click(e.w, btn(e.d, 'tripnext'));
    const q2 = findQ(e.w, e.d);
    ok('p tripnext → otra pregunta del mismo tema', q2 && q2.topic === q.topic && q2.id !== q.id, q2 && q2.topic + '/' + q.topic); }
  e.w.close();

  // (q) doble clic registra un solo intento
  e = await toQuestion();
  { const q = findQ(e.w, e.d), b = optBtn(e.d, correctText(q));
    click(e.w, b); click(e.w, b); click(e.w, optBtn(e.d, correctText(q)));
    ok('q dos o tres clics registran un solo intento (a === 1)', stored(e).qs[q.id] && stored(e).qs[q.id].a === 1, JSON.stringify(stored(e).qs[q.id])); }
  e.w.close();

  // (r) teclas
  e = await toQuestion();
  e.d.dispatchEvent(new e.w.KeyboardEvent('keydown', { key: '1', bubbles: true }));
  ok('r la tecla 1 responde', !!e.d.querySelector('.fb'));
  e.d.dispatchEvent(new e.w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  ok('r Enter con el foco en un botón no avanza', !!e.d.querySelector('.fb'));
  e.d.activeElement.blur(); e.d.dispatchEvent(new e.w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
  ok('r Enter con el foco en body continúa', !e.d.querySelector('.fb'));
  e.d.dispatchEvent(new e.w.KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true }));
  ok('r flecha izquierda llama a look(-10, 0)', e.st.calls.some((c) => c[0] === 'look' && c[1] === -10 && c[2] === 0)); e.w.close();

  // (s) confirmación de salida
  e = await toQuestion(); answerWrong(e); click(e.w, btn(e.d, 'tripnext'));       // fase ask otra vez (retransmisión)
  click(e.w, e.d.querySelector('#trip-ui [data-act="tripquit"]'));
  { const c = e.d.getElementById('trip-confirm');
    ok('s tripquit tras responder abre la confirmación con el texto exacto', !c.hidden && /¿Salir del viaje\? Lo que respondiste ya quedó guardado\./.test(c.textContent));
    ok('s el foco está en "Seguir"', e.d.activeElement && e.d.activeElement.dataset.act === 'tripcancel');
    e.d.dispatchEvent(new e.w.KeyboardEvent('keydown', { key: '1', bubbles: true }));
    ok('s con la confirmación abierta la tecla 1 no responde', !e.d.querySelector('.fb'));
    key(e, 'Escape');
    ok('s Esc cierra la confirmación y el foco vuelve a tripquit', c.hidden && e.d.activeElement && e.d.activeElement.dataset.act === 'tripquit' && h1(e) === '');
    click(e.w, e.d.querySelector('#trip-ui [data-act="tripquit"]')); click(e.w, btn(e.d, 'tripcancel'));
    ok('s clic en "Seguir" cierra y devuelve el foco a tripquit', c.hidden && e.d.activeElement.dataset.act === 'tripquit');
    click(e.w, e.d.querySelector('#trip-ui [data-act="tripquit"]')); click(e.w, btn(e.d, 'tripconfirm'));
    ok('s tripconfirm lleva a M08, dispose() y #trip-root hidden y vacío', h1(e) === 'Redes informáticas' && e.st.disposed === 1 && root(e).hidden && root(e).innerHTML === ''); }
  e.w.close();

  // (s2) confirmación mientras viaja
  e = await toQuestion(); answerRight(e); e.st.pendingGoTo = true; click(e.w, btn(e.d, 'tripnext')); await tick();
  ok('s2 viajando: no hay tripask', !btn(e.d, 'tripask'));
  click(e.w, e.d.querySelector('#trip-ui [data-act="tripquit"]'));
  ok('s2 tripquit durante el viaje abre la confirmación', !e.d.getElementById('trip-confirm').hidden);
  e.st.goToResolvers[e.st.goToResolvers.length - 1](); await tick();
  ok('s2 al resolverse goTo el foco sigue en "Seguir" y no aparece tripask', e.d.activeElement.dataset.act === 'tripcancel' && !btn(e.d, 'tripask'));
  click(e.w, btn(e.d, 'tripcancel'));
  ok('s2 tripcancel → aparece la hoja arrive con el foco en "Ver pregunta"', !!btn(e.d, 'tripask') && e.d.activeElement === btn(e.d, 'tripask'));
  ok('s2 la hoja arrive es de la estación 2', e.d.getElementById('trip-pill').textContent === 'Estación 2 de 10'); e.w.close();

  // (l ampliado) resize con una pregunta abierta
  e = await toQuestion();
  { const n0 = e.st.calls.length; e.w.dispatchEvent(new e.w.Event('resize'));
    const after = e.st.calls.slice(n0);
    ok('l resize con pregunta abierta: resize() y ningún setPaused("sheet", false)', after.some((c) => c[0] === 'resize') && !after.some((c) => c[0] === 'setPaused' && c[1] === 'sheet' && c[2] === false)); }
  e.w.close();

  // (t) recorrido completo acertando todo + (x) S.boss sin cambios
  e = boot({ imp: 'ok', spyScroll: true }); enter(e); await tick();
  { const n = await runTrip(e, () => true);
    ok('t el recorrido llega al resumen con 18 respuestas', n === 18 && !!btn(e.d, 'tripend'), 'n=' + n);
    ok('t .pill y .bar[aria-label] dicen "Estación 10 de 10"', e.d.getElementById('trip-pill').textContent === 'Estación 10 de 10' && e.d.querySelector('.bar[aria-label]').getAttribute('aria-label') === 'Estación 10 de 10');
    const m = e.d.getElementById('trip-sheet').textContent.match(/XP ganada: (\d+)/);
    ok('t el resumen muestra la XP igual a S.xp', !!m && Number(m[1]) === stored(e).xp && stored(e).xp > 0, (m && m[1]) + ' vs ' + stored(e).xp);
    ok('t el foco está en tripend y no hay tripreplay', e.d.activeElement === btn(e.d, 'tripend') && !btn(e.d, 'tripreplay'));
    ok('t el resumen lista 10 estaciones', e.d.querySelectorAll('#trip-sheet li').length === 10);
    ok('f5 "Continuar" y "Terminar" se llevan a la vista dentro de la hoja con scroll', (e.w.__scrolled || []).some((el) => el.dataset && el.dataset.act === 'tripnext') && (e.w.__scrolled || []).some((el) => el.dataset && el.dataset.act === 'tripend'));
    ok('x S.boss sin cambios', JSON.stringify(stored(e).boss) === '{}');
    ok('t recorrido completo sin errores de consola', !e.errors.length, e.errors.join(' | '));
    click(e.w, btn(e.d, 'tripend'));
    ok('t tripend sale sin confirmación, dispose() y #trip-root hidden y vacío', h1(e) === 'Redes informáticas' && e.st.disposed === 1 && root(e).hidden && root(e).innerHTML === ''); }
  e.w.close();

  // (u) fallar solo la primera pregunta → repaso de fallos
  e = boot({ imp: 'ok' }); enter(e); await tick();
  { const n = await runTrip(e, (i) => i !== 0);
    ok('u el viaje termina (19 respuestas) y aparece tripreplay', n === 19 && !!btn(e.d, 'tripreplay'), 'n=' + n);
    click(e.w, btn(e.d, 'tripreplay'));
    ok('u el repaso abre una ronda con .pill "1 / 1" y #trip-root hidden', e.d.querySelector('.pill') && e.d.querySelector('.pill').textContent.trim() === '1 / 1' && root(e).hidden, e.d.querySelector('.pill') && e.d.querySelector('.pill').textContent);
    ok('u el .chip no dice "Repaso de fallos"', !/Repaso de fallos/.test(e.d.querySelector('.chip').textContent));
    answerRight(e); click(e.w, e.d.getElementById('nextbtn'));
    ok('u resultados: .eyebrow "Repaso de fallos"', !!e.d.querySelector('.eyebrow') && /Repaso de fallos/.test(e.d.querySelector('.eyebrow').textContent)); }
  e.w.close();

  // (v) pregunta tf: sin temporizador
  e = boot({ imp: 'ok', rndSeed: 12345 }); enter(e); await tick();
  { let tf = false;
    for (let g = 0; g < 300 && !btn(e.d, 'tripend'); g++) {
      const ask = btn(e.d, 'tripask'); if (ask) { click(e.w, ask); continue; }
      if (e.d.querySelectorAll('.opt:not([disabled])').length) {
        const labels = [...e.d.querySelectorAll('.opt')].map((b) => norm(b.querySelector('span:last-child').textContent));
        if (labels.length === 2 && labels[0] === 'Verdadero' && labels[1] === 'Falso') { tf = true; break; }
        answerRight(e); continue;
      }
      const nx = btn(e.d, 'tripnext'); if (nx) { click(e.w, nx); await tick(3); continue; }
      await tick(2);
    }
    ok('v salió una pregunta tf', tf);
    ok('v la tf no tiene .timer', !e.d.querySelector('.timer'));
    const real = e.w.performance.now.bind(e.w.performance); e.w.performance.now = () => real() + 13000;
    await new Promise((r) => setTimeout(r, 300));
    ok('v tras 13 s simulados y 300 ms reales no hay .fb', !e.d.querySelector('.fb')); }
  e.w.close();


  // (s3) la confirmación de salida bloquea lo que hay detrás
  e = await toQuestion(); answerWrong(e); click(e.w, btn(e.d, 'tripnext'));
  click(e.w, e.d.querySelector('#trip-ui [data-act="tripquit"]'));
  { const dlg = e.d.querySelector('#trip-confirm [role="alertdialog"]');
    ok('s3 la confirmación es un alertdialog con aria-labelledby válido', !!dlg && !!e.d.getElementById(dlg.getAttribute('aria-labelledby') || '_'));
    ok('s3 con la confirmación abierta la hoja y el HUD están inert', e.d.getElementById('trip-sheet').hasAttribute('inert') && e.d.querySelector('.trip-hud').hasAttribute('inert'));
    ok('s3 el CSS de #trip-confirm cubre toda la pantalla (inset:0)', /#trip-confirm\{[^}]*inset:0/.test(html));
    click(e.w, btn(e.d, 'tripcancel'));
    ok('s3 al cerrar se quita inert de la hoja y del HUD', !e.d.getElementById('trip-sheet').hasAttribute('inert') && !e.d.querySelector('.trip-hud').hasAttribute('inert'));
    ok('s3 al cerrar el foco vuelve a tripquit', e.d.activeElement && e.d.activeElement.dataset.act === 'tripquit'); }
  e.w.close();

  // (c5) CSS: aviso de guardado por encima del viaje, Salir con fondo propio, hoja que no tapa el paquete
  ok('c5 #savewarn queda por encima de #trip-root (fixed y z-index > 50)', /#savewarn\{[^}]*position:fixed[^}]*z-index:(6\d|[7-9]\d|\d{3})/.test(html));
  ok('c5 .trip-quit tiene fondo propio', /\.trip-quit\{[^}]*background:var\(--surface\)/.test(html));
  ok('c5 #trip-confirm oculto no intercepta toques (display:none con [hidden])', /#trip-confirm\[hidden\]\{[^}]*display:none/.test(html));
  ok('c5 la hoja mide como mucho 50dvh', /#trip-sheet\{[^}]*max-height:50dvh/.test(html));

  // (g1) un error de la escena a mitad del viaje cae al respaldo
  e = boot({ imp: 'ok', goToRejectAt: 1 }); enter(e); await tick();
  click(e.w, btn(e.d, 'tripask')); answerRight(e); click(e.w, btn(e.d, 'tripnext')); await tick(4);
  ok('g1 goTo rechaza en la estación 2: aparece el respaldo y se libera la escena', !!root(e).querySelector('[role="alert"]') && e.st.disposed === 1, 'disposed=' + e.st.disposed);
  ok('g1 sin errores no capturados', !e.errors.length, e.errors.join(' | ')); e.w.close();
  e = boot({ imp: 'ok', layersThrow: true }); enter(e); await tick();
  click(e.w, btn(e.d, 'tripask')); answerRight(e); click(e.w, btn(e.d, 'tripnext')); await tick(2);
  ok('g1 setLayers lanza al pulsar Continuar: aparece el respaldo', !!root(e).querySelector('[role="alert"]') && e.st.disposed === 1, 'disposed=' + e.st.disposed);
  ok('g1 el respaldo ofrece volver y el viaje se puede abandonar', !!btn(e.d, 'tripback')); e.w.close();

  // (z) escena real sin WebGL: si create falla, el motor muestra el respaldo sin errores
  e = boot({ imp: 'ok', scene: false }); enter(e); await tick();
  ok('z escena real con un THREE falso: aparece el respaldo y no hay errores', !!root(e).querySelector('[role="alert"]') && !e.errors.length, e.errors.join(' | '));
  e.w.close();

  results.forEach((r) => console.log(r.join(' | ')));
  const fails = results.filter((r) => r[0] === 'FAIL').length;
  console.log(fails ? `\n${fails} FALLOS` : '\nTRIP_ENGINE OK (' + results.length + ' comprobaciones)');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('EXCEPCIÓN', e && e.message); results.forEach((r) => console.log(r.join(' | '))); process.exit(2); });
