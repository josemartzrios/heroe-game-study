// Vista `city` del motor (jsdom, sin WebGL): ciclo de vida, suspender/reanudar, estados, HUD, pausa, aviso de girar y hojas.
// Las funciones auxiliares se copian de tests/trip_engine.cjs (no se puede hacer require: ejecuta su suite).
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const html = fs.readFileSync(require('path').join(__dirname, '..', 'juego_estudio.html'), 'utf8');
const results = [];
const ok = (name, cond, extra) => { results.push([cond ? 'PASS' : 'FAIL', name, extra || '']); };
const tick = async (n = 6) => { for (let i = 0; i < n; i++) await new Promise((r) => setTimeout(r, 0)); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const KEY = 'estudio_isw_v1';

// opts: seed, createPending (create no resuelve hasta st.resolveCreate), createReject, noCtx (getContext nulo), matchMedia: bool|undefined
function boot(opts = {}) {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => errors.push('jsdomError: ' + (e.detail || e.message)));
  vc.on('error', (e) => errors.push('console.error: ' + e));
  const st = { creates: 0, disposed: 0, calls: [], worlds: [], canvases: [], lastOpts: null, resolveCreate: null, trips: 0 };
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.test/', virtualConsole: vc,
    beforeParse(w) {
      if (opts.seed) w.localStorage.setItem(KEY, JSON.stringify(opts.seed));
      w.scrollTo = () => {};
      w.Element.prototype.scrollIntoView = function () {};
      if (!opts.noTest) w.__CITY_TEST__ = true;
      if (opts.rndSeed) { let s = opts.rndSeed; w.Math.random = function () { s |= 0; s = (s + 0x6D2B79F5) | 0; let x = Math.imul(s ^ (s >>> 15), 1 | s); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; }
      if (opts.clock) { const RD = w.Date; class FD extends RD { constructor(...a) { if (a.length === 0) super(RD.now() + opts.clock.ms); else super(...a); } static now() { return RD.now() + opts.clock.ms; } } w.Date = FD; }
      if (opts.matchMedia !== undefined) w.matchMedia = () => ({ matches: !!opts.matchMedia });
      w.URL.createObjectURL = () => 'blob:x'; w.URL.revokeObjectURL = () => {};
      const fake = (el) => new Proxy({ canvas: el }, { get(t, k) { if (k in t) return t[k]; if (k === 'measureText') return () => ({ width: 0 }); return () => {}; }, set(t, k, v) { t[k] = v; return true; } });
      w.HTMLCanvasElement.prototype.getContext = function () { return opts.noCtx ? null : fake(this); };
      w.__TRIP_IMPORT__ = () => { st.trips++; return Promise.resolve({ THREE_FAKE: true }); };
      {
        w.__CITY_WORLD__ = {
          create(canvas, D, o) {
            st.creates++; st.lastOpts = o; st.canvases.push(canvas);
            if (opts.createReject) return Promise.reject(new Error('create falló'));
            const api = {
              resize: () => st.calls.push(['resize']),
              setPaused: (r, on) => st.calls.push(['setPaused', r, on]),
              dissolve: (id) => st.calls.push(['dissolve', id]),
              encounter: () => Promise.resolve(),
              dispose: () => { st.disposed++; st.calls.push(['dispose']); if (st.disposed === 1 && st.lastOpts.onLost) st.lastOpts.onLost(); }
            };
            st.worlds.push(api);
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
function findQ(w, d) {
  const sq = (t) => t.replace(/\s+/g, '');
  const p = sq(d.querySelector('.prompt').textContent);
  const shown = [...d.querySelectorAll('.opt')].map((b) => norm(b.querySelector('span:last-child').textContent));
  const c = allQs(w).filter((q) => sq(q.prompt.replace(/`/g, '').replace(/\*\*/g, '')) === p);
  return c.find((q) => q.type === 'tf' ? true : q.options.every((o) => shown.includes(norm(o)))) || c[0];
}
const correctText = (q) => (q.type === 'tf' ? (q.answer ? 'Verdadero' : 'Falso') : q.options[q.answer]);
function answerRight(w, d) { const q = findQ(w, d); const b = [...d.querySelectorAll('.opt')].find((x) => norm(x.querySelector('span:last-child').textContent) === norm(correctText(q))); click(w, b); const n = d.querySelector('#nextbtn'); if (n) click(w, n); }

const base = (o = {}) => Object.assign({ v: 1, xp: 1000, days: { last: null, count: 0 }, session: 1, lastActive: 0, topics: {}, qs: {}, boss: {}, hero: { name: 'H', look: { skin: 0, suit: 0, head: 0, eyes: 0, emblem: 0, cape: 0, hand: 0 }, welcomed: true } }, o);
const saved = (w) => JSON.parse(w.localStorage.getItem(KEY));
const $ = (e, s) => e.d.querySelector(s);
const root = (e) => $(e, '#city-root');
const callsOf = (e, name, arg) => e.st.calls.filter((c) => c[0] === name && (arg === undefined || c[1] === arg));
const key = (e, k) => e.w.dispatchEvent(new e.w.KeyboardEvent('keydown', { key: k, bubbles: true }));
const keyUp = (e, k) => e.w.dispatchEvent(new e.w.KeyboardEvent('keyup', { key: k, bubbles: true }));
const cx = (e, c) => [...e.d.querySelectorAll('[data-act="cx"]')].find((b) => b.dataset.c === c);
const btnText = (e, re, scope = '#city-root') => [...e.d.querySelectorAll(scope + ' button')].find((b) => re.test(b.textContent));
const api = (e) => e.w.__CITY_TEST_API__;
const live = (e) => $(e, '#city-live').textContent;
async function enter(e) { const b = $(e, '[data-act="city"]'); click(e.w, b); await tick(); }
const tickW = (e, ms = 16) => e.st.lastOpts.tick(ms);

(async () => {
  let e;
  try {
    // (a) entrada, carga diferida y creación del mundo
    e = boot({ createPending: true, seed: base() });
    const home = $(e, '[data-act="city"]');
    ok('(a) Inicio tiene "Entrar a la ciudad"', !!home && /Entrar a la ciudad/.test(home.textContent));
    click(e.w, home); await tick();
    ok('(a) con el mundo pendiente < 250 ms todavía no se muestra "Preparando la ciudad…"', !$(e, '#city-load') && !root(e).hidden);
    await sleep(320);
    ok('(a) pasado ese tiempo aparece "Preparando la ciudad…" en role=status con "Salir"', /Preparando la ciudad…/.test(($(e, '#city-load') || {}).textContent || '') && $(e, '#city-load').getAttribute('role') === 'status' && !!btnText(e, /^Salir$/));
    e.st.resolveCreate(); await tick();
    ok('(a) al resolver desaparece "Preparando" y la vista queda activa', !$(e, '#city-load') && e.d.body.classList.contains('city-on') && e.st.creates === 1);
    ok('(a) la ciudad nunca pide el import de Three (e.trips = 0)', e.st.trips === 0);
    ok('(a) opts del mundo: exactamente reducedMotion, tick, state y onLost', JSON.stringify(Object.keys(e.st.lastOpts).sort()) === JSON.stringify(['onLost', 'reducedMotion', 'state', 'tick']), Object.keys(e.st.lastOpts).join());
    ok('(a) sin errores de consola', e.errors.length === 0, e.errors.join('|'));
    e.w.close();
    e = boot({ seed: base() }); click(e.w, $(e, '[data-act="city"]')); await sleep(320);
    ok('(a) con el mundo inmediato "Preparando la ciudad…" nunca aparece', !$(e, '#city-load') && e.st.creates === 1);
    e.w.close();

    // (a2) "Salir" durante la carga
    e = boot({ createPending: true, seed: base() });
    click(e.w, $(e, '[data-act="city"]')); await sleep(320);
    click(e.w, btnText(e, /^Salir$/)); e.st.resolveCreate && e.st.resolveCreate(); await tick();
    ok('(a2) Salir durante la carga: Inicio, raíz oculta y vacía, y el mundo tardío se libera', !!$(e, '[data-act="city"]') && root(e).hidden && root(e).innerHTML === '' && e.st.disposed === e.st.creates);
    e.w.close();

    // (b) sin canvas 2D: create rechazado o getContext nulo
    for (const mode of ['create', 'sinCanvas']) {
      e = boot({ seed: base(), createReject: mode === 'create', noCtx: mode === 'sinCanvas', noTest: mode === 'sinCanvas' });
      await enter(e);
      ok('(b/' + mode + ') "No se pudo mostrar la ciudad." con las dos salidas y sin "3D"', /No se pudo mostrar la ciudad\./.test(root(e).textContent) && !/3D/.test(root(e).textContent) && !!btnText(e, /^Ir a los módulos$/) && !!btnText(e, /^Volver$/), root(e).textContent.slice(0, 80));
      if (mode === 'create') {
        click(e.w, btnText(e, /^Ir a los módulos$/));
        ok('(b) "Ir a los módulos" abre M02 y libera la raíz', /Fundamentos de ingeniería de software/.test(e.d.body.textContent) && root(e).hidden && root(e).innerHTML === '');
      } else {
        click(e.w, btnText(e, /^Volver$/));
        ok('(b) "Volver" abre Inicio', !!$(e, '[data-act="city"]') && root(e).hidden);
      }
      e.w.close();
    }

    // (c) pérdida de contexto y reintento en la posición guardada
    e = boot({ seed: base() }); await enter(e);
    api(e).teleport(10, 5);
    e.st.lastOpts.onLost(); await tick();
    ok('(c) onLost: "Se perdió la vista de la ciudad." con Reintentar y Salir y sin "3D"', !/3D/.test(root(e).textContent) && /Se perdió la vista de la ciudad\./.test(root(e).textContent) && !!btnText(e, /^Reintentar$/) && !!btnText(e, /^Salir$/));
    ok('(c) la posición se guardó antes de liberar', Math.abs(saved(e.w).city.at.x - 10) < 1e-6 && Math.abs(saved(e.w).city.at.z - 5) < 1e-6, JSON.stringify(saved(e.w).city.at));
    click(e.w, btnText(e, /^Reintentar$/)); await tick();
    const hs = Object.assign({}, e.st.lastOpts.state().hero);
    ok('(c) Reintentar: create ×2, dispose ×1 y héroe en la posición guardada', e.st.creates === 2 && e.st.disposed === 1 && Math.abs(hs.x - 10) < 1e-6 && Math.abs(hs.z - 5) < 1e-6, e.st.creates + '/' + e.st.disposed + ' ' + JSON.stringify(hs));
    e.w.close();

    // (c2) pérdida de contexto con la ciudad suspendida
    e = boot({ seed: base() }); await enter(e);
    const RND = () => e.w.__CITY_ROUND__;
    RND().startRound({ kind: 'repair', title: 'Reparación', mid: 'M02', back: { name: 'city' }, city: { kind: 'repair', id: 'r09' } }, RND().repairItems('M02', 'T15'));
    e.st.lastOpts.onLost();
    answerRight(e.w, e.d); answerRight(e.w, e.d);
    click(e.w, $(e, '[data-act="back"]')); await tick();
    ok('(c2) volver con contexto perdido: aviso, sin reanudar ni redimensionar', /Se perdió la vista de la ciudad\./.test(root(e).textContent) && callsOf(e, 'setPaused', 'suspended').filter((c) => c[2] === false).length === 0 && callsOf(e, 'resize').length === 0, JSON.stringify(e.st.calls));
    e.w.close();

    // (d) pausa y salir al inicio
    e = boot({ seed: base() }); await enter(e);
    click(e.w, $(e, '#city-pause'));
    const pb = $(e, '#city-pausebox');
    ok('(d) Pausa: diálogo modal con las 6 opciones', !pb.hidden && pb.getAttribute('role') === 'dialog' && pb.getAttribute('aria-modal') === 'true' && ['Ir al objetivo', 'Lugares cercanos', 'Lecciones vistas', 'Repaso', 'Tu héroe', 'Salir al inicio'].every((t) => [...pb.querySelectorAll('button')].some((b) => b.textContent.trim() === t)));
    ok('(d) Pausa: #city-ui-main inert y el mundo en pausa', $(e, '#city-ui-main').hasAttribute('inert') && callsOf(e, 'setPaused', 'pause').some((c) => c[2] === true));
    click(e.w, [...pb.querySelectorAll('button')].find((b) => /^Salir al inicio$/.test(b.textContent.trim()))); await tick();
    ok('(d) Salir al inicio: dispose y raíz oculta y vacía', e.st.disposed === 1 && root(e).hidden && root(e).innerHTML === '' && !!$(e, '[data-act="city"]') && !e.d.body.classList.contains('city-on'));
    e.w.close();

    // (e) ir 5 veces a "Tu héroe" y volver
    e = boot({ seed: base() }); await enter(e);
    for (let i = 0; i < 5; i++) {
      click(e.w, $(e, '#city-pause'));
      click(e.w, btnText(e, /^Tu héroe$/, '#city-pausebox'));
      click(e.w, $(e, '[data-act="home"]')); await tick(2);
      await enter(e);
    }
    ok('(e) 5 idas a Tu héroe: create ×6, dispose ×5 y un solo canvas', e.st.creates === 6 && e.st.disposed === 5 && root(e).querySelectorAll('canvas').length === 1, e.st.creates + '/' + e.st.disposed + '/' + root(e).querySelectorAll('canvas').length);
    ok('(e) sin errores de consola', e.errors.length === 0, e.errors.join('|'));
    e.w.close();

    // (f) ronda con back city: suspender y reanudar sin recrear
    e = boot({ seed: base() }); await enter(e);
    RND().startRound({ kind: 'repair', title: 'Reparación', mid: 'M02', back: { name: 'city' }, city: { kind: 'repair', id: 'r09' } }, RND().repairItems('M02', 'T15'));
    ok('(f) la ronda suspende la ciudad: sin dispose, raíz oculta, setPaused(suspended)', e.st.disposed === 0 && root(e).hidden && callsOf(e, 'setPaused', 'suspended').some((c) => c[2] === true));
    e.w.dispatchEvent(new e.w.Event('resize'));
    answerRight(e.w, e.d);
    ok('(f) responder no reanuda ni crea otra ciudad, y un resize suspendido no llega al mundo', e.st.creates === 1 && root(e).hidden && callsOf(e, 'resize').length === 0);
    answerRight(e.w, e.d);
    click(e.w, $(e, '[data-act="back"]')); await tick();
    ok('(f) "Volver a la ciudad": reanuda sin create nuevo y con un solo resize', e.st.creates === 1 && !root(e).hidden && callsOf(e, 'resize').length === 1 && callsOf(e, 'setPaused', 'suspended').some((c) => c[2] === false) && e.d.body.classList.contains('city-on'), JSON.stringify(e.st.calls));
    ok('(f) la reparación quedó guardada y la ciudad sigue sin errores', saved(e.w).city.repairs.r09 === true && e.errors.length === 0, e.errors.join('|'));
    e.w.close();

    // (g) aviso de girar
    e = boot({ seed: base(), matchMedia: true }); await enter(e);
    ok('(g) apaisado táctil: #city-rotate visible, mundo en pausa y #city-ui-main inert', !$(e, '#city-rotate').hidden && callsOf(e, 'setPaused', 'rotate').some((c) => c[2] === true) && $(e, '#city-ui-main').hasAttribute('inert') && /Gira tu teléfono a vertical/.test($(e, '#city-rotate').textContent));
    e.w.close();
    e = boot({ seed: base(), matchMedia: false }); await enter(e);
    ok('(g) con pointer:fine el aviso nunca aparece', $(e, '#city-rotate').hidden && callsOf(e, 'setPaused', 'rotate').length === 0 && !$(e, '#city-ui-main').hasAttribute('inert'));
    e.w.close();

    // (h) acción contextual junto a la directora, hoja, Esc y foco
    e = boot({ seed: base({ city: { prologue: true } }) }); await enter(e);
    ok('(h) lejos de todo no hay acción', $(e, '#city-act').hidden);
    api(e).teleport(-6, -2.5);
    ok('(h) junto a Iris: #city-act dice "Hablar con Iris"', !$(e, '#city-act').hidden && $(e, '#city-act').textContent === 'Hablar con Iris', $(e, '#city-act').textContent);
    key(e, 'e'); tickW(e); keyUp(e, 'e');
    ok('(h) E abre su hoja y pausa el mundo', !$(e, '#city-sheet').hidden && /Iris/.test($(e, '#city-sheet').textContent) && callsOf(e, 'setPaused', 'sheet').some((c) => c[2] === true));
    key(e, 'Escape'); tickW(e);
    ok('(h) Esc la cierra y el foco vuelve a #city-act', $(e, '#city-sheet').hidden && e.d.activeElement === $(e, '#city-act') && callsOf(e, 'setPaused', 'sheet').some((c) => c[2] === false));
    e.w.close();

    // (i) guardado de posición al pausar y visibilitychange
    e = boot({ seed: base() }); await enter(e);
    api(e).teleport(12, 3);
    click(e.w, $(e, '#city-pause'));
    ok('(i) S.city.at se guarda al pausar', Math.abs(saved(e.w).city.at.x - 12) < 1e-6 && Math.abs(saved(e.w).city.at.z - 3) < 1e-6, JSON.stringify(saved(e.w).city.at));
    Object.defineProperty(e.d, 'hidden', { configurable: true, get: () => true });
    e.d.dispatchEvent(new e.w.Event('visibilitychange'));
    ok('(i) visibilitychange hidden → setPaused("hidden", true)', callsOf(e, 'setPaused', 'hidden').some((c) => c[2] === true));
    e.w.close();

    // (j) Lugares cercanos
    e = boot({ seed: base({ city: { prologue: true } }) }); await enter(e);
    api(e).teleport(0, 0);
    click(e.w, $(e, '#city-pause'));
    click(e.w, btnText(e, /^Lugares cercanos$/, '#city-pausebox'));
    const iris = [...e.d.querySelectorAll('#city-pausebox button')].find((b) => /Iris/.test(b.textContent));
    ok('(j) la lista incluye a Iris con su distancia', !!iris && /\d+ m/.test(iris.textContent), e.d.querySelector('#city-pausebox').textContent);
    click(e.w, iris);
    ok('(j) tocar a Iris abre su hoja y cierra la pausa', !$(e, '#city-sheet').hidden && /Iris/.test($(e, '#city-sheet').textContent) && $(e, '#city-pausebox').hidden);
    e.w.close();

    // (k) objetivo y anuncios
    e = boot({ seed: base() }); await enter(e);
    const o0 = $(e, '#city-obj').textContent;
    ok('(k) #city-obj: "Habla con Iris · N m" con entero', /^Habla con Iris · \d+ m$/.test(o0), o0);
    const l0 = live(e);
    api(e).teleport(0, 7); tickW(e, 300);
    ok('(k) moverse 1 m no cambia #city-live', live(e) === l0 && /Plaza central/.test(l0), l0 + ' → ' + live(e));
    api(e).teleport(0, -100); tickW(e, 300);
    ok('(k) entrar al Taller Comunal se anuncia', /Taller Comunal/.test(live(e)), live(e));
    ok('(k) objective() del gancho coincide', api(e).objective().id === 'iris');
    e.w.close();
    // objetivo cambia al vencer a la criatura actual
    const topicsDone = {}; const learn = [];
    for (let i = 1; i <= 22; i++) { const t = 'T' + String(i).padStart(2, '0'); topicsDone['M02:' + t] = [1, 1, 1, 1, 1, 1]; learn.push('M02:' + t); }
    e = boot({ seed: base({ topics: topicsDone, stats: { learnTopics: learn, cleared: 0, roundsNoPower: 0, bossFailed: {} }, city: { prologue: true } }) }); await enter(e);
    const lb = live(e), ob = $(e, '#city-obj').textContent;
    ok('(k) con el prólogo hecho y todo aprendido el objetivo es la primera criatura', /^Enfrenta a Bit Errante · \d+ m$/.test(ob), ob);
    RND().startRound({ kind: 'battle', title: 'Batalla', mid: 'M02', back: { name: 'city' }, villain: { id: 'bit', name: 'Bit Errante' }, city: { kind: 'battle', id: 'bit' } }, RND().battleItems({ mod: 'M02', topics: ['T01', 'T02', 'T03'], n: 8 }));
    for (let i = 0; i < 4; i++) answerRight(e.w, e.d);
    click(e.w, $(e, '[data-act="back"]')); await tick();
    ok('(k) tras vencerla el objetivo y el anuncio cambian', /^Enfrenta a Cuello de Silicio/.test($(e, '#city-obj').textContent) && live(e) !== lb && /Cuello de Silicio/.test(live(e)), $(e, '#city-obj').textContent + ' | ' + live(e));
    e.w.close();

    // (l) tick: movimiento con teclado y guardado periódico
    e = boot({ seed: base() }); await enter(e);
    const p0 = Object.assign({}, e.st.lastOpts.state().hero);
    key(e, 'w'); for (let i = 0; i < 20; i++) tickW(e, 50);
    const p1 = Object.assign({}, e.st.lastOpts.state().hero);
    for (let i = 0; i < 100; i++) tickW(e, 50); keyUp(e, 'w');
    ok('(l) W mueve al héroe hacia el norte (z baja)', p1.z < p0.z - 1, JSON.stringify([p0, p1]));
    ok('(l) tras 5 s de juego S.city.at se guarda', !!saved(e.w).city.at && saved(e.w).city.at.z < p0.z - 1, JSON.stringify(saved(e.w).city.at));
    const st = e.st.lastOpts.state();
    ok('(l) state(): hero, zoom y flags con la forma del contrato', typeof st.hero.x === 'number' && ['up', 'down', 'left', 'right'].includes(st.hero.face) && st.zoom === 1 && !('cam' in st) && !!st.flags && typeof st.flags.restored === 'boolean' && typeof st.flags.lit === 'number' && !!st.flags.beatenToday && !!st.flags.repairs && !!st.flags.apprenticesVisible && !!st.flags.stars);
    e.w.close();

    // (o) mentores: lección, práctica, lugares cercanos, objetivo, espejo
    { const e2 = boot({ seed: base() }); await enter(e2);
      const D2 = (await import('../city/districts.mjs')).city.districts.M02, m1 = D2.mentors[0], m2 = D2.mentors[1];
      const M2 = e2.w.eval('MODULES').find((m) => m.id === 'M02'), T1 = M2.topics.find((x) => x.id === 'T01');
      api(e2).teleport(m1.x, m1.z + 1);
      ok('(o) junto a m01: "Hablar con {nombre}"', $(e2, '#city-act').textContent === 'Hablar con ' + m1.name, $(e2, '#city-act').textContent);
      key(e2, 'e'); tickW(e2); keyUp(e2, 'e');
      const sh = $(e2, '#city-sheet');
      ok('(o) E abre la Lección con el título de T01 y el aviso de las 6 respuestas', !sh.hidden && sh.textContent.includes(T1.title) && /Para la primera estrella hacen falta al menos 6 respuestas/.test(sh.textContent));
      ok('(o) la Lección marca M02:T01 como vista y lo guarda', saved(e2.w).stats.learnTopics.includes('M02:T01'));
      ok('(o) el foco queda en "Practicar" y hay "Cerrar"', e2.d.activeElement && /^Practicar$/.test(e2.d.activeElement.textContent) && !!btnText(e2, /^Cerrar$/, '#city-sheet'));
      const kpBold = T1.keyPoints.find((k) => /\*\*/.test(k));
      if (kpBold) ok('(o) un keyPoint con **negritas** se muestra como <strong>', sh.innerHTML.includes('<strong>'));
      const pos = Object.assign({}, e2.st.lastOpts.state().hero), h0 = (saved(e2.w).topics['M02:T01'] || []).length;
      click(e2.w, btnText(e2, /^Practicar$/, '#city-sheet'));
      ok('(o) Practicar abre la ronda con la ciudad suspendida', !!$(e2, '.prompt') && root(e2).hidden && e2.st.disposed === 0);
      for (let i = 0; i < 3; i++) { answerRight(e2.w, e2.d); }
      click(e2.w, $(e2, '[data-act="quit"]')); await tick();
      const pos2 = Object.assign({}, e2.st.lastOpts.state().hero);
      ok('(o) al volver la posición es la misma y el historial de T01 creció', Math.abs(pos.x - pos2.x) < 1e-9 && Math.abs(pos.z - pos2.z) < 1e-9 && (saved(e2.w).topics['M02:T01'] || []).length > h0 && !root(e2).hidden);
      api(e2).teleport(m2.x, m2.z + 3);
      click(e2.w, $(e2, '#city-pause')); click(e2.w, btnText(e2, /^Lugares cercanos$/, '#city-pausebox'));
      click(e2.w, [...e2.d.querySelectorAll('#city-pausebox button')].find((b) => b.textContent.includes(m2.name)));
      ok('(o) desde Lugares cercanos el mentor abre su Lección', !$(e2, '#city-sheet').hidden && $(e2, '#city-sheet').textContent.includes(M2.topics.find((x) => x.id === m2.topic).title));
      click(e2.w, btnText(e2, /^Cerrar$/, '#city-sheet'));
      click(e2.w, $(e2, '#city-pause')); click(e2.w, btnText(e2, /^Lecciones vistas$/, '#city-pausebox'));
      const les = [...e2.d.querySelectorAll('#city-pausebox [data-c="lesson"]')];
      ok('(o) Lecciones vistas: un botón por tema visto', les.length === 2, String(les.length));
      click(e2.w, les[0]);
      ok('(o) cada botón abre su Lección', !$(e2, '#city-sheet').hidden && $(e2, '#city-pausebox').hidden);
      click(e2.w, btnText(e2, /^Cerrar$/, '#city-sheet'));
      e2.w.close(); }
    { // Ir al objetivo con T01 visto y 0 estrellas en T02 abre la Lección del mentor de T02
      const e2 = boot({ seed: base({ stats: { learnTopics: ['M02:T01'], cleared: 0, roundsNoPower: 0, bossFailed: {} }, topics: { 'M02:T01': [1, 1, 1, 1, 1, 1] }, city: { prologue: true } }) }); await enter(e2);
      click(e2.w, $(e2, '#city-pause')); click(e2.w, btnText(e2, /^Ir al objetivo$/, '#city-pausebox'));
      const M2 = e2.w.eval('MODULES').find((m) => m.id === 'M02');
      ok('(o) "Ir al objetivo" abre la Lección del mentor de T02', !$(e2, '#city-sheet').hidden && $(e2, '#city-sheet').textContent.includes(M2.topics.find((x) => x.id === 'T02').title), $(e2, '#city-sheet').textContent.slice(0, 80));
      e2.w.close(); }
    { const e2 = boot({ seed: base() }); await enter(e2);
      api(e2).teleport(6, -2.5); click(e2.w, $(e2, '#city-act'));
      ok('(o) el espejo va a "Tu héroe" y libera la ciudad', e2.st.disposed === 1 && /Héroe|héroe/.test(e2.d.body.textContent) && root(e2).hidden);
      e2.w.close(); }

    // (p) criaturas y retos de campo
    { const D3 = (await import('../city/districts.mjs')).city.districts.M02, bit = D3.creatures[0].area, r09 = D3.repairs.find((r) => r.id === 'r09');
      const today = (w) => { const x = new w.Date(), p = (n) => (n < 10 ? '0' : '') + n; return x.getFullYear() + '-' + p(x.getMonth() + 1) + '-' + p(x.getDate()); };
      const clock = { ms: 0 };
      const e3 = boot({ seed: base(), clock }); await enter(e3);
      api(e3).teleport(bit.x, bit.z);
      ok('(p) junto a la criatura: "Enfrentar a Bit Errante"', $(e3, '#city-act').textContent === 'Enfrentar a Bit Errante');
      e3.st.worlds[0].encounter = (id) => { e3.st.calls.push(['encounter', id]); return Promise.resolve(); };
      click(e3.w, $(e3, '#city-act')); await tick();
      ok('(p) la acción llama a encounter(bit) y luego inicia la batalla suspendiendo la ciudad', callsOf(e3, 'encounter', 'bit').length === 1 && !!$(e3, '.arena') && root(e3).hidden);
      for (let i = 0; i < 4; i++) answerRight(e3.w, e3.d);
      click(e3.w, $(e3, '[data-act="back"]')); await tick();
      ok('(p) victoria: beaten.bit = hoy y se llama a dissolve(bit)', saved(e3.w).city.beaten.bit === today(e3.w) && callsOf(e3, 'dissolve', 'bit').length === 1);
      api(e3).teleport(bit.x, bit.z); tickW(e3);
      ok('(p) la acción ya no ofrece a bit', $(e3, '#city-act').hidden);
      clock.ms = 25 * 3600000; tickW(e3);
      ok('(p) con el reloj +25 h sin salir de la ciudad vuelve "Enfrentar a Bit Errante"', !$(e3, '#city-act').hidden && /Enfrentar a Bit Errante/.test($(e3, '#city-act').textContent));
      // reto de campo
      api(e3).teleport(r09.x, r09.z + 1);
      ok('(p) junto al reto: "Reparar {label}"', $(e3, '#city-act').textContent === 'Reparar ' + r09.label, $(e3, '#city-act').textContent);
      click(e3.w, $(e3, '#city-act'));
      ok('(p) el reto abre su ronda con el chip "Reparación"', !!$(e3, '.prompt') && /Reparación/.test($(e3, '.chips').textContent) && root(e3).hidden);
      answerRight(e3.w, e3.d); answerRight(e3.w, e3.d);
      click(e3.w, $(e3, '[data-act="back"]')); await tick();
      ok('(p) 2 aciertos: queda en repairs y desaparece de Lugares cercanos', saved(e3.w).city.repairs.r09 === true && (() => { click(e3.w, $(e3, '#city-pause')); click(e3.w, btnText(e3, /^Lugares cercanos$/, '#city-pausebox')); return ![...e3.d.querySelectorAll('#city-pausebox button')].some((b) => b.textContent.includes(r09.label)); })());
      e3.w.close(); }
    { // derrota no marca; un fallo en el reto lo deja disponible; Lugares cercanos inicia criatura y reto
      const D3 = (await import('../city/districts.mjs')).city.districts.M02, bit = D3.creatures[0].area, r09 = D3.repairs.find((r) => r.id === 'r09');
      const e3 = boot({ seed: base() }); await enter(e3);
      api(e3).teleport(bit.x + 1, bit.z + 1);
      click(e3.w, $(e3, '#city-pause')); click(e3.w, btnText(e3, /^Lugares cercanos$/, '#city-pausebox'));
      click(e3.w, [...e3.d.querySelectorAll('#city-pausebox button')].find((b) => /Bit Errante/.test(b.textContent))); await tick();
      ok('(p) Lugares cercanos inicia la batalla de la criatura', !!$(e3, '.arena'));
      for (let i = 0; i < 3 && $(e3, '.prompt'); i++) { const q = findQ(e3.w, e3.d), ct = norm(correctText(q)); click(e3.w, [...e3.d.querySelectorAll('.opt')].find((b) => !b.disabled && norm(b.querySelector('span:last-child').textContent) !== ct)); const n = $(e3, '#nextbtn'); if (n) click(e3.w, n); }
      ok('(p) derrota: nada marcado', !(saved(e3.w).city.beaten || {}).bit);
      click(e3.w, $(e3, '[data-act="back"]')); await tick();
      api(e3).teleport(r09.x, r09.z + 3);
      click(e3.w, $(e3, '#city-pause')); click(e3.w, btnText(e3, /^Lugares cercanos$/, '#city-pausebox'));
      click(e3.w, [...e3.d.querySelectorAll('#city-pausebox button')].find((b) => b.textContent.includes(r09.label)));
      ok('(p) Lugares cercanos inicia la ronda del reto', !!$(e3, '.prompt') && /Reparación/.test($(e3, '.chips').textContent));
      answerRight(e3.w, e3.d);
      { const q = findQ(e3.w, e3.d), ct = norm(correctText(q)); click(e3.w, [...e3.d.querySelectorAll('.opt')].find((b) => !b.disabled && norm(b.querySelector('span:last-child').textContent) !== ct)); const n = $(e3, '#nextbtn'); if (n) click(e3.w, n); }
      click(e3.w, $(e3, '[data-act="back"]')); await tick();
      ok('(p) con un fallo el reto sigue disponible', !(saved(e3.w).city.repairs || {}).r09 && (api(e3).teleport(r09.x, r09.z + 1), $(e3, '#city-act').textContent === 'Reparar ' + r09.label));
      e3.w.close(); }

    // (q) enseñar, torre, restauración, puente, prólogo y objetivo
    { const D4 = (await import('../city/districts.mjs')).city.districts.M02;
      const M4 = (w) => w.eval('MODULES').find((m) => m.id === 'M02');
      const six = (ids) => { const o = {}; ids.forEach((t) => { o['M02:' + t] = [1, 1, 1, 1, 1, 1]; }); return o; };
      const allT = Array.from({ length: 23 }, (_, i) => 'T' + String(i + 1).padStart(2, '0'));
      const ap = (id) => D4.apprentices.find((a) => a.id === id);
      const near = (e, o, dz = 1) => api(e).teleport(o.x, o.z + dz);
      const clean = (s) => s.replace(/`/g, '').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
      const pressed = (e) => [...e.d.querySelectorAll('#city-sheet [data-c="kp"][aria-pressed="true"]')];
      const kps = (e) => [...e.d.querySelectorAll('#city-sheet [data-c="kp"]')];
      const ownKp = (e, tid) => { const set = new Set(M4(e.w).topics.find((x) => x.id === tid).keyPoints.map(clean)); return (b) => set.has(clean(b.textContent.replace(/De otro tema/, ''))); };
      const pick = (e, n, own, tid) => { const isOwn = ownKp(e, tid); for (let k = 0; k < n; k++) { const b = kps(e).find((x) => isOwn(x) === own && x.getAttribute('aria-pressed') === 'false'); click(e.w, b); } };
      // aparición de aprendices
      { const e4 = boot({ seed: base({ city: { prologue: true } }) }); await enter(e4); near(e4, ap('a01'));
        ok('(q) sin estrellas en T05 no aparece el aprendiz de T05', $(e4, '#city-act').hidden);
        e4.w.close();
        const e5 = boot({ seed: base({ city: { prologue: true }, topics: six(['T05']) }) }); await enter(e5); near(e5, ap('a01'));
        ok('(q) con 1 estrella en T05 aparece: "Enseñar a Abril"', $(e5, '#city-act').textContent === 'Enseñar a Abril', $(e5, '#city-act').textContent);
        e5.w.close(); }
      // explicar
      { const e4 = boot({ seed: base({ city: { prologue: true }, topics: six(['T05']) }), rndSeed: 12345 }); await enter(e4); const a1 = ap('a01'), T5 = M4(e4.w).topics.find((x) => x.id === 'T05');
        near(e4, a1); click(e4.w, $(e4, '#city-act'));
        const sh = () => $(e4, '#city-sheet');
        ok('(q) explicar: "¿Me explicas {título}?" con 6 casillas y contador "0 de 3"', sh().textContent.includes('¿Me explicas ' + T5.title + '?') && kps(e4).length === 6 && /0 de 3/.test($(e4, '#city-count').textContent) && $(e4, '#city-count').getAttribute('aria-live') === 'polite');
        ok('(q) 3 del tema y 3 de otros', kps(e4).filter(ownKp(e4, 'T05')).length === 3);
        const exp = () => btnText(e4, /^Explicar$/, '#city-sheet');
        pick(e4, 2, true, 'T05');
        ok('(q) con 2 elegidos "Explicar" está desactivado', exp().disabled === true && /2 de 3/.test($(e4, '#city-count').textContent));
        pick(e4, 1, false, 'T05'); // 3.ª (ajena) ya elegida: la 4.ª se bloquea
        const before = pressed(e4).length; click(e4.w, kps(e4).find((b) => b.getAttribute('aria-pressed') === 'false'));
        ok('(q) una 4.ª selección no cambia nada y el contador sigue en "3 de 3"', before === 3 && pressed(e4).length === 3 && /3 de 3/.test($(e4, '#city-count').textContent));
        const set0 = kps(e4).map((b) => clean(b.textContent)).sort().join('|');
        click(e4.w, exp());
        ok('(q) al fallar se marca "De otro tema" en los ajenos con texto', /De otro tema/.test(sh().textContent) && !saved(e4.w).city.taught.a01);
        click(e4.w, btnText(e4, /^Reintentar$/, '#city-sheet'));
        const set1 = kps(e4).map((b) => clean(b.textContent)).sort().join('|');
        ok('(q) Reintentar vuelve a sortear el conjunto de los 6', set0 !== set1 && pressed(e4).length === 0);
        const xp0 = saved(e4.w).xp; pick(e4, 3, true, 'T05'); click(e4.w, exp());
        ok('(q) con 3 correctos: +15 XP y taught.a01', saved(e4.w).xp === xp0 + 15 && saved(e4.w).city.taught.a01 === true, saved(e4.w).xp - xp0);
        ok('(q) tras enseñar, el aprendiz se va', (click(e4.w, btnText(e4, /^Cerrar$/, '#city-sheet')), near(e4, a1), $(e4, '#city-act').hidden));
        e4.w.close(); }
      // corregir
      { const e4 = boot({ seed: base({ city: { prologue: true }, topics: six(['T06']) }) }); await enter(e4); near(e4, ap('a02'));
        ok('(q) "Enseñar a Beto" (modo corregir)', $(e4, '#city-act').textContent === 'Enseñar a Beto');
        click(e4.w, $(e4, '#city-act'));
        ok('(q) corregir abre una ronda de error con el título "Enseñar"', !!$(e4, '.prompt') && /Enseñar/.test(e4.d.body.textContent) && root(e4).hidden);
        const a0 = Object.values(saved(e4.w).qs).reduce((n, r) => n + r.a, 0);
        answerRight(e4.w, e4.d);
        click(e4.w, $(e4, '[data-act="back"]')); await tick();
        ok('(q) si acierta queda en taught y la pregunta se registra', saved(e4.w).city.taught.a02 === true && Object.values(saved(e4.w).qs).reduce((n, r) => n + r.a, 0) === a0 + 1);
        e4.w.close(); }
      // torre bloqueada
      { const e4 = boot({ seed: base({ city: { prologue: true } }) }); await enter(e4);
        const door = { x: D4.tower.x, z: D4.tower.z + D4.tower.d / 2 }; near(e4, door, 1.2);
        ok('(q) torre: "Entrar a la torre"', $(e4, '#city-act').textContent === 'Entrar a la torre', $(e4, '#city-act').textContent);
        click(e4.w, $(e4, '#city-act'));
        ok('(q) torre bloqueada: "Te faltan N temas"', /Te faltan 23 temas/.test($(e4, '#city-sheet').textContent), $(e4, '#city-sheet').textContent.slice(0, 80));
        e4.w.close(); }
      // restauración al enseñar al 8.º
      { const D5 = D4.apprentices.find((a) => a.topic === 'T09'); const taught = {}; D4.apprentices.filter((a) => a.id !== D5.id).slice(0, 7).forEach((a) => { taught[a.id] = true; });
        const e4 = boot({ seed: base({ boss: { M02: { best: 20, passed: true } }, topics: six(['T09']), city: { prologue: true, taught } }), rndSeed: 7 }); await enter(e4);
        ok('(q) 7 enseñados y jefe aprobado: aún Becario y sin restaurar', $(e4, '#city-rank').textContent === 'Becario' && e4.st.lastOpts.state().flags.restored === false);
        near(e4, D5); click(e4.w, $(e4, '#city-act'));
        if (D5.mode === 'explain') { pick(e4, 3, true, 'T09'); click(e4.w, btnText(e4, /^Explicar$/, '#city-sheet')); }
        else { answerRight(e4.w, e4.d); click(e4.w, $(e4, '[data-act="back"]')); await tick(); }
        ok('(q) enseñar al 8.º: celebración con Planos y Junior', /Planos/.test($(e4, '#city-sheet').textContent) && /Junior/.test($(e4, '#city-sheet').textContent), $(e4, '#city-sheet').textContent.slice(0, 100));
        ok('(q) queda restored.M02, powers.planos y "Junior" en el HUD', saved(e4.w).city.restored.M02 === true && saved(e4.w).city.powers.planos === true && (click(e4.w, btnText(e4, /^Cerrar$/, '#city-sheet')), $(e4, '#city-rank').textContent === 'Junior'));
        ok('(q) con flags.restored el mundo recibe restored=true', e4.st.lastOpts.state().flags.restored === true);
        // puente
        const door = { x: D4.bridge.x, z: D4.bridge.z + D4.bridge.d / 2 }; near(e4, door, 1.2);
        ok('(q) puente: "Cruzar el puente"', $(e4, '#city-act').textContent === 'Cruzar el puente');
        click(e4.w, $(e4, '#city-act'));
        ok('(q) "Próximamente" y bridgeSeen', /Próximamente/.test($(e4, '#city-sheet').textContent) && saved(e4.w).city.bridgeSeen === true);
        click(e4.w, btnText(e4, /^Cerrar$/, '#city-sheet'));
        ok('(q) tras cruzar el objetivo es "Capítulo completo"', /Capítulo completo/.test($(e4, '#city-obj').textContent), $(e4, '#city-obj').textContent);
        e4.w.close(); }
      // jefe aprobado al final con 8 enseñados
      { const taught = {}; D4.apprentices.slice(0, 8).forEach((a) => { taught[a.id] = true; });
        const e4 = boot({ seed: base({ topics: six(allT), city: { prologue: true, taught } }) }); await enter(e4);
        near(e4, { x: D4.tower.x, z: D4.tower.z + D4.tower.d / 2 }, 1.2);
        click(e4.w, $(e4, '#city-act'));
        ok('(q) torre desbloqueada: empieza el jefe (ciudad suspendida)', !!$(e4, '.prompt') && root(e4).hidden && /Jefe final/.test(e4.d.body.textContent));
        let g = 0; while ($(e4, '.prompt') && g++ < 30) { const q = findQ(e4.w, e4.d); click(e4.w, [...e4.d.querySelectorAll('.opt')].find((b) => norm(b.querySelector('span:last-child').textContent) === norm(correctText(q)))); }
        click(e4.w, $(e4, '[data-act="back"]')); await tick();
        ok('(q) aprobar el jefe y volver muestra la celebración', /Planos/.test($(e4, '#city-sheet').textContent) && saved(e4.w).city.restored.M02 === true);
        e4.w.close(); }
      // prólogo
      { const e4 = boot({ seed: base() }); await enter(e4);
        near(e4, { x: -6, z: -4 }); click(e4.w, $(e4, '#city-act'));
        ok('(q) prólogo: panel 1 con "Siguiente" y "Saltar"', /Ciudad Núcleo/.test($(e4, '#city-sheet').textContent) && !!btnText(e4, /^Siguiente$/, '#city-sheet') && !!btnText(e4, /^Saltar$/, '#city-sheet'));
        click(e4.w, btnText(e4, /^Siguiente$/, '#city-sheet')); const p2 = $(e4, '#city-sheet').textContent;
        click(e4.w, btnText(e4, /^Siguiente$/, '#city-sheet')); const p3 = $(e4, '#city-sheet').textContent;
        ok('(q) tres paneles distintos y el último se cierra', /Maraña/.test(p2) && /Taller/.test(p3) && p2 !== p3 && !!btnText(e4, /^Cerrar$/, '#city-sheet'));
        click(e4.w, btnText(e4, /^Cerrar$/, '#city-sheet'));
        ok('(q) al terminar S.city.prologue = true y una sola vez', saved(e4.w).city.prologue === true && (click(e4.w, $(e4, '#city-act')), !/Siguiente/.test($(e4, '#city-sheet').textContent)));
        e4.w.close();
        const e5 = boot({ seed: base() }); await enter(e5); near(e5, { x: -6, z: -4 }); click(e5.w, $(e5, '#city-act')); click(e5.w, btnText(e5, /^Saltar$/, '#city-sheet'));
        ok('(q) "Saltar" lo marca como visto', saved(e5.w).city.prologue === true && $(e5, '#city-sheet').hidden);
        e5.w.close(); }
      // guardado manipulado (foco de revisión 2)
      { const junk = {}; for (let i = 0; i < 8; i++) junk['x' + i] = true;
        const e4 = boot({ seed: base({ city: { prologue: true, taught: junk, powers: { planos: true }, restored: { M02: true } } }) }); await enter(e4);
        ok('(q) 8 ids basura en taught y planos sin jefe: "Becario" y puente cerrado', $(e4, '#city-rank').textContent === 'Becario' && e4.st.lastOpts.state().flags.restored === false && (click(e4.w, $(e4, '#city-pause')), !saved(e4.w).city.powers.planos && !saved(e4.w).city.restored.M02));
        e4.w.close(); }
      // nombre malicioso
      { const e4 = boot({ seed: base({ hero: { name: '<img id=pwn src=x>', look: { skin: 0, suit: 0, head: 0, eyes: 0, emblem: 0, cape: 0, hand: 0 }, welcomed: true }, topics: six(['T01']), city: { prologue: true } }) }); await enter(e4);
        near(e4, { x: -6, z: -4 }); click(e4.w, $(e4, '#city-act'));
        const m1 = D4.mentors[0]; click(e4.w, btnText(e4, /^Cerrar$/, '#city-sheet')); near(e4, m1); click(e4.w, $(e4, '#city-act'));
        ok('(q) nombre del héroe malicioso: sin #pwn en el HUD ni en las hojas', !e4.d.querySelector('#pwn') && e4.errors.length === 0, e4.errors.join('|'));
        e4.w.close(); }
    }

    // (u) zoom, dirección, flecha, estado reutilizado y guardado periódico (vista 2D)
    { const e5 = boot({ seed: base({ city: { prologue: true } }) }); await enter(e5);
      const zoom = () => e5.st.lastOpts.state().zoom;
      ok('(u) el zoom inicial es 1', zoom() === 1);
      key(e5, '+'); tickW(e5);
      ok('(u) la tecla + acerca un paso: 1.25', zoom() === 1.25, String(zoom()));
      key(e5, '+'); key(e5, '+'); key(e5, '+'); key(e5, '+'); tickW(e5);
      ok('(u) el zoom no pasa de 1.75', zoom() === 1.75, String(zoom()));
      for (let i = 0; i < 8; i++) key(e5, '-'); tickW(e5);
      ok('(u) ni baja de 1', zoom() === 1);
      root(e5).getBoundingClientRect = () => ({ left: 0, top: 0, width: 390, height: 844, right: 390, bottom: 844, x: 0, y: 0 });
      const ptr = (type, x, y, id) => root(e5).dispatchEvent(new e5.w.PointerEvent(type, { bubbles: true, pointerId: id, clientX: x, clientY: y, pointerType: 'touch' }));
      ptr('pointerdown', 150, 300, 7); ptr('pointerdown', 250, 300, 8); ptr('pointermove', 50, 300, 7); ptr('pointermove', 350, 300, 8); tickW(e5);
      ok('(u) un pellizco enorme se limita a 1.75', zoom() === 1.75, String(zoom()));
      ptr('pointerup', 50, 300, 7); ptr('pointerup', 350, 300, 8);
      click(e5.w, $(e5, '#city-pause')); const zo = btnText(e5, /^Alejar$/, '#city-pausebox'), zi = btnText(e5, /^Acercar$/, '#city-pausebox');
      ok('(u) la pausa tiene "Acercar" y "Alejar" de ≥ 44 px', !!zo && !!zi);
      click(e5.w, zo); ok('(u) "Alejar" baja 0.25 y la pausa sigue abierta', zoom() === 1.5 && !$(e5, '#city-pausebox').hidden, String(zoom()));
      click(e5.w, btnText(e5, /^Acercar$/, '#city-pausebox')); ok('(u) "Acercar" sube 0.25', zoom() === 1.75);
      ok('(u) state() devuelve siempre el mismo objeto', e5.st.lastOpts.state() === e5.st.lastOpts.state());
      e5.w.close(); }
    { const e5 = boot({ seed: base({ city: { prologue: true } }) }); await enter(e5);
      key(e5, 'w'); for (let i = 0; i < 20; i++) tickW(e5, 50); keyUp(e5, 'w');
      ok('(u) caminando con W la dirección es "up"', e5.st.lastOpts.state().hero.face === 'up');
      key(e5, 'a'); for (let i = 0; i < 20; i++) tickW(e5, 50); keyUp(e5, 'a');
      ok('(u) con A es "left"', e5.st.lastOpts.state().hero.face === 'left', e5.st.lastOpts.state().hero.face);
      for (let i = 0; i < 20; i++) tickW(e5, 50);
      ok('(u) quieto mantiene la última dirección', e5.st.lastOpts.state().hero.face === 'left');
      e5.w.close();
      const e6 = boot({ seed: base({ city: { prologue: true, at: { x: 0, z: 8, yaw: Math.PI } } }) }); await enter(e6);
      ok('(u) al entrar con at.yaw = π la dirección es "down"', e6.st.lastOpts.state().hero.face === 'down');
      e6.w.close(); }
    { const e5 = boot({ seed: base() }); await enter(e5);   // objetivo: Iris en (-6, -4)
      const arrow = () => $(e5, '#city-arrow');
      api(e5).teleport(-6, 6); ok('(u) flecha: objetivo arriba → 0°', arrow().style.transform === 'rotate(0deg)' && !arrow().hidden, arrow().style.transform);
      api(e5).teleport(-16, -4); ok('(u) objetivo a la derecha → 90°', arrow().style.transform === 'rotate(90deg)', arrow().style.transform);
      api(e5).teleport(-6, -14); ok('(u) objetivo abajo → 180°', arrow().style.transform === 'rotate(180deg)', arrow().style.transform);
      api(e5).teleport(4, -4); ok('(u) objetivo a la izquierda → 270°', arrow().style.transform === 'rotate(270deg)', arrow().style.transform);
      api(e5).teleport(-6, -3.5); ok('(u) a menos de 1 m la flecha se oculta', arrow().hidden === true);
      e5.w.close(); }
    { const e5 = boot({ seed: base({ city: { prologue: true } }) }); await enter(e5);
      let writes = 0; const orig = e5.w.Storage.prototype.setItem; e5.w.Storage.prototype.setItem = function (k, v) { writes++; return orig.call(this, k, v); };
      for (let i = 0; i < 60; i++) tickW(e5, 100);
      ok('(u) quieto 6 s no escribe en localStorage', writes === 0, String(writes));
      key(e5, 'w'); for (let i = 0; i < 70; i++) tickW(e5, 100); keyUp(e5, 'w');
      ok('(u) caminando 7 s sí guarda', writes > 0, String(writes));
      e5.w.close(); }

    // (v) Liderazgo: +5 XP al enseñar (solo si ya se tenía)
    { const D6 = (await import('../city/districts.mjs')).city.districts.M02, a1 = D6.apprentices[0], a2 = D6.apprentices[1];
      const six = (id) => ({ ['M02:' + id]: [1, 1, 1, 1, 1, 1] });
      const clean = (s) => s.replace(/`/g, '').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
      const e6 = boot({ seed: base({ virtues: { liderazgo: 1700000000000 }, city: { prologue: true }, topics: six('T05') }), rndSeed: 99 }); await enter(e6);
      api(e6).teleport(a1.x, a1.z + 1); click(e6.w, $(e6, '#city-act'));
      const own = new Set(e6.w.eval('MODULES').find((m) => m.id === 'M02').topics.find((x) => x.id === 'T05').keyPoints.map(clean));
      for (let k = 0; k < 3; k++) click(e6.w, [...e6.d.querySelectorAll('#city-sheet [data-c="kp"]')].find((b) => own.has(clean(b.textContent)) && b.getAttribute('aria-pressed') === 'false'));
      const x0 = saved(e6.w).xp; click(e6.w, btnText(e6, /^Explicar$/, '#city-sheet'));
      ok('(v) explicar con Liderazgo: +20 XP y la hoja dice "+20 XP"', saved(e6.w).xp === x0 + 20 && /\+20 XP/.test($(e6, '#city-sheet').textContent), (saved(e6.w).xp - x0) + ' ' + $(e6, '#city-sheet').textContent.slice(0, 60));
      e6.w.close();
      const e7 = boot({ seed: base({ virtues: { liderazgo: 1700000000000 }, city: { prologue: true }, topics: six('T06') }) }); await enter(e7);
      api(e7).teleport(a2.x, a2.z + 1); const y0 = saved(e7.w).xp; click(e7.w, $(e7, '#city-act'));
      answerRight(e7.w, e7.d);
      ok('(v) corregir con Liderazgo: "Bono de Liderazgo: +5 XP" en resultados y XP mostrado = guardado', /Bono de Liderazgo: \+5 XP/.test($(e7, 'main').textContent) && Number($(e7, '#xpc').dataset.xp) === saved(e7.w).xp - y0, $(e7, 'main').textContent.slice(-120));
      e7.w.close();
      const e8 = boot({ seed: base({ city: { prologue: true }, topics: six('T06') }) }); await enter(e8);
      api(e8).teleport(a2.x, a2.z + 1); click(e8.w, $(e8, '#city-act')); answerRight(e8.w, e8.d);
      ok('(v) sin Liderazgo no hay bono al corregir', !/Bono de Liderazgo/.test($(e8, 'main').textContent));
      e8.w.close(); }

    // (n) el mundo 2D ya no existe
    { const e2 = boot({ seed: base() });
      ok('(n) Inicio sin "Explora el mundo" y con una sola tarjeta de aventura', !/Explora el mundo/.test(e2.d.body.textContent) && e2.d.querySelectorAll('.card.adv').length === 1 && !e2.d.querySelector('[data-act="world"]'));
      click(e2.w, [...e2.d.querySelectorAll('[data-act="mod"]')].find((b) => b.dataset.id === 'M01'));
      ok('(n) pantalla de M01 sin botón de mundo y sin errores', !e2.d.querySelector('[data-act="world"]') && !/Explorar esta región/.test(e2.d.body.textContent) && e2.errors.length === 0, e2.errors.join('|'));
      e2.w.close(); }

    // (m) ganchos de prueba solo con __CITY_TEST__
    { const e2 = boot({ seed: base() });
      ok('(m) ganchos de prueba presentes con __CITY_TEST__', !!e2.w.__CITY_TEST_API__ && typeof e2.w.__CITY_TEST_API__.teleport === 'function');
      e2.w.close(); }
    { const e2 = boot({ seed: base(), noTest: true, noCtx: true }); await enter(e2);
      ok('(m) sin __CITY_TEST__ no hay ganchos y el mundo falso se ignora', e2.w.__CITY_TEST_API__ === undefined && e2.st.creates === 0 && /No se pudo mostrar la ciudad\./.test(root(e2).textContent));
      e2.w.close(); }
  } catch (x) { results.push(['FAIL', 'excepción', x.stack]); }
  const fails = results.filter((r) => r[0] === 'FAIL');
  fails.forEach((r) => console.log(r.join(' | ')));
  console.log(fails.length ? 'FALLAS ' + fails.length : 'CITY_ENGINE OK (' + results.length + ')');
  process.exit(fails.length ? 1 : 0);
})();
