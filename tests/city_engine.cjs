// Vista `city` del motor (jsdom, sin WebGL): ciclo de vida, suspender/reanudar, estados, HUD, pausa, aviso de girar y hojas.
// Las funciones auxiliares se copian de tests/trip_engine.cjs (no se puede hacer require: ejecuta su suite).
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const html = fs.readFileSync(require('path').join(__dirname, '..', 'juego_estudio.html'), 'utf8');
const results = [];
const ok = (name, cond, extra) => { results.push([cond ? 'PASS' : 'FAIL', name, extra || '']); };
const tick = async (n = 6) => { for (let i = 0; i < n; i++) await new Promise((r) => setTimeout(r, 0)); };
const KEY = 'estudio_isw_v1';

// opts: seed, imp: 'ok'|'reject'|'pending', world: false (sin mundo), createReject, matchMedia: bool|undefined
function boot(opts = {}) {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => errors.push('jsdomError: ' + (e.detail || e.message)));
  vc.on('error', (e) => errors.push('console.error: ' + e));
  const st = { imports: 0, creates: 0, disposed: 0, rendererDisposed: 0, ctxLoss: 0, calls: [], worlds: [], canvases: [], lastOpts: null, resolveImport: null };
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.test/', virtualConsole: vc,
    beforeParse(w) {
      if (opts.seed) w.localStorage.setItem(KEY, JSON.stringify(opts.seed));
      w.scrollTo = () => {};
      w.Element.prototype.scrollIntoView = function () {};
      if (!opts.noTest) w.__CITY_TEST__ = true;
      if (opts.matchMedia !== undefined) w.matchMedia = () => ({ matches: !!opts.matchMedia });
      w.URL.createObjectURL = () => 'blob:x'; w.URL.revokeObjectURL = () => {};
      const fake = (el) => new Proxy({ canvas: el }, { get(t, k) { if (k in t) return t[k]; if (k === 'measureText') return () => ({ width: 0 }); return () => {}; }, set(t, k, v) { t[k] = v; return true; } });
      w.HTMLCanvasElement.prototype.getContext = function () { return fake(this); };
      const imp = opts.imp || 'ok';
      w.__TRIP_IMPORT__ = () => {
        st.imports++;
        if (imp === 'reject') return Promise.reject(new Error('import falso'));
        if (imp === 'pending') return new Promise((res) => { st.resolveImport = () => res({ THREE_FAKE: true }); });
        return Promise.resolve({ THREE_FAKE: true });
      };
      if (opts.world !== false) {
        w.__CITY_WORLD__ = {
          create(THREE, canvas, D, o) {
            st.creates++; st.lastOpts = o; st.canvases.push(canvas);
            if (opts.createReject) return Promise.reject(new Error('create falló'));
            const api = {
              resize: () => st.calls.push(['resize']),
              setPaused: (r, on) => st.calls.push(['setPaused', r, on]),
              dissolve: (id) => st.calls.push(['dissolve', id]),
              setLook: () => st.calls.push(['setLook']),
              encounter: () => Promise.resolve(),
              dispose: () => { st.disposed++; st.calls.push(['dispose']); st.rendererDisposed++; st.ctxLoss++; if (st.disposed === 1) canvas.dispatchEvent(new w.Event('webglcontextlost')); }
            };
            st.worlds.push(api);
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
    // (a) entrada, carga y creación del mundo
    e = boot({ imp: 'pending', seed: base() });
    const home = $(e, '[data-act="city"]');
    ok('(a) Inicio tiene "Entrar a la ciudad"', !!home && /Entrar a la ciudad/.test(home.textContent));
    click(e.w, home); await tick();
    ok('(a) carga: "Preparando la ciudad…" en role=status con "Salir"', !!root(e) && !root(e).hidden && /Preparando la ciudad…/.test(($(e, '#city-load') || {}).textContent || '') && $(e, '#city-load').getAttribute('role') === 'status' && !!btnText(e, /^Salir$/));
    ok('(a) el mundo aún no se crea durante la carga', e.st.creates === 0);
    e.st.resolveImport(); await tick();
    ok('(a) después de la carga se crea el mundo y desaparece "Preparando"', e.st.creates === 1 && !$(e, '#city-load') && e.d.body.classList.contains('city-on'), String(e.st.creates));
    ok('(a) opts del mundo: tick, state, look y portrait', typeof e.st.lastOpts.tick === 'function' && typeof e.st.lastOpts.state === 'function' && !!e.st.lastOpts.look && typeof e.st.lastOpts.portrait === 'boolean');
    ok('(a) sin errores de consola', e.errors.length === 0, e.errors.join('|'));
    e.w.close();

    // (a2) "Salir" durante la carga
    e = boot({ imp: 'pending', seed: base() });
    click(e.w, $(e, '[data-act="city"]')); await tick();
    click(e.w, btnText(e, /^Salir$/)); e.st.resolveImport(); await tick();
    ok('(a2) Salir durante la carga: Inicio, nada creado, raíz oculta y vacía', e.st.creates === 0 && !!$(e, '[data-act="city"]') && root(e).hidden && root(e).innerHTML === '');
    e.w.close();

    // (b) sin WebGL: import o create rechazados
    for (const mode of ['import', 'create', 'sinMundo']) {
      e = boot({ seed: base(), imp: mode === 'import' ? 'reject' : 'ok', createReject: mode === 'create', world: mode !== 'sinMundo' });
      await enter(e);
      ok('(b/' + mode + ') "Tu equipo no puede mostrar la ciudad 3D." con las dos salidas', /Tu equipo no puede mostrar la ciudad 3D\./.test(root(e).textContent) && !!btnText(e, /^Ir a los módulos$/) && !!btnText(e, /^Volver$/), root(e).textContent.slice(0, 80));
      if (mode === 'import') {
        click(e.w, btnText(e, /^Ir a los módulos$/));
        ok('(b) "Ir a los módulos" abre M02 y libera la raíz', /Fundamentos de ingeniería de software/.test(e.d.body.textContent) && root(e).hidden && root(e).innerHTML === '');
      } else if (mode === 'create') {
        click(e.w, btnText(e, /^Volver$/));
        ok('(b) "Volver" abre Inicio', !!$(e, '[data-act="city"]') && root(e).hidden);
      }
      e.w.close();
    }

    // (c) pérdida de contexto y reintento en la posición guardada
    e = boot({ seed: base() }); await enter(e);
    api(e).teleport(10, 5);
    e.st.canvases[0].dispatchEvent(new e.w.Event('webglcontextlost')); await tick();
    ok('(c) webglcontextlost: "Se perdió la vista 3D." con Reintentar y Salir', /Se perdió la vista 3D\./.test(root(e).textContent) && !!btnText(e, /^Reintentar$/) && !!btnText(e, /^Salir$/));
    ok('(c) la posición se guardó antes de liberar', Math.abs(saved(e.w).city.at.x - 10) < 1e-6 && Math.abs(saved(e.w).city.at.z - 5) < 1e-6, JSON.stringify(saved(e.w).city.at));
    click(e.w, btnText(e, /^Reintentar$/)); await tick();
    const hs = e.st.lastOpts.state().hero;
    ok('(c) Reintentar: create ×2, dispose ×1 y héroe en la posición guardada', e.st.creates === 2 && e.st.disposed === 1 && Math.abs(hs.x - 10) < 1e-6 && Math.abs(hs.z - 5) < 1e-6, e.st.creates + '/' + e.st.disposed + ' ' + JSON.stringify(hs));
    e.w.close();

    // (c2) pérdida de contexto con la ciudad suspendida
    e = boot({ seed: base() }); await enter(e);
    const RND = () => e.w.__CITY_ROUND__;
    RND().startRound({ kind: 'repair', title: 'Reparación', mid: 'M02', back: { name: 'city' }, city: { kind: 'repair', id: 'r09' } }, RND().repairItems('M02', 'T15'));
    e.st.canvases[0].dispatchEvent(new e.w.Event('webglcontextlost'));
    answerRight(e.w, e.d); answerRight(e.w, e.d);
    click(e.w, $(e, '[data-act="back"]')); await tick();
    ok('(c2) volver con contexto perdido: aviso, sin reanudar ni redimensionar', /Se perdió la vista 3D\./.test(root(e).textContent) && callsOf(e, 'setPaused', 'suspended').filter((c) => c[2] === false).length === 0 && callsOf(e, 'resize').length === 0, JSON.stringify(e.st.calls));
    e.w.close();

    // (d) pausa y salir al inicio
    e = boot({ seed: base() }); await enter(e);
    click(e.w, $(e, '#city-pause'));
    const pb = $(e, '#city-pausebox');
    ok('(d) Pausa: diálogo modal con las 6 opciones', !pb.hidden && pb.getAttribute('role') === 'dialog' && pb.getAttribute('aria-modal') === 'true' && ['Ir al objetivo', 'Lugares cercanos', 'Lecciones vistas', 'Repaso', 'Tu héroe', 'Salir al inicio'].every((t) => [...pb.querySelectorAll('button')].some((b) => b.textContent.trim() === t)));
    ok('(d) Pausa: #city-ui-main inert y el mundo en pausa', $(e, '#city-ui-main').hasAttribute('inert') && callsOf(e, 'setPaused', 'pause').some((c) => c[2] === true));
    click(e.w, [...pb.querySelectorAll('button')].find((b) => /^Salir al inicio$/.test(b.textContent.trim()))); await tick();
    ok('(d) Salir al inicio: dispose (renderer + pérdida de contexto) y raíz oculta y vacía', e.st.disposed === 1 && e.st.rendererDisposed === 1 && e.st.ctxLoss === 1 && root(e).hidden && root(e).innerHTML === '' && !!$(e, '[data-act="city"]') && !e.d.body.classList.contains('city-on'));
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
    e = boot({ seed: base() }); await enter(e);
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
    e = boot({ seed: base() }); await enter(e);
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
    const p0 = e.st.lastOpts.state().hero;
    key(e, 'w'); for (let i = 0; i < 20; i++) tickW(e, 50);
    const p1 = e.st.lastOpts.state().hero;
    for (let i = 0; i < 100; i++) tickW(e, 50); keyUp(e, 'w');
    ok('(l) W mueve al héroe hacia el norte (z baja)', p1.z < p0.z - 1, JSON.stringify([p0, p1]));
    ok('(l) tras 5 s de juego S.city.at se guarda', !!saved(e.w).city.at && saved(e.w).city.at.z < p0.z - 1, JSON.stringify(saved(e.w).city.at));
    const st = e.st.lastOpts.state();
    ok('(l) state(): cam y flags con la forma del contrato', typeof st.cam.yaw === 'number' && typeof st.cam.pitch === 'number' && st.cam.arm > 0 && !!st.flags && typeof st.flags.restored === 'boolean' && typeof st.flags.lit === 'number' && !!st.flags.beatenToday && !!st.flags.repairs && !!st.flags.apprenticesVisible && !!st.flags.stars);
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
      const pos = e2.st.lastOpts.state().hero, h0 = (saved(e2.w).topics['M02:T01'] || []).length;
      click(e2.w, btnText(e2, /^Practicar$/, '#city-sheet'));
      ok('(o) Practicar abre la ronda con la ciudad suspendida', !!$(e2, '.prompt') && root(e2).hidden && e2.st.disposed === 0);
      for (let i = 0; i < 3; i++) { answerRight(e2.w, e2.d); }
      click(e2.w, $(e2, '[data-act="quit"]')); await tick();
      const pos2 = e2.st.lastOpts.state().hero;
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
    { const e2 = boot({ seed: base(), noTest: true }); await enter(e2);
      ok('(m) sin __CITY_TEST__ no hay ganchos y el mundo falso se ignora', e2.w.__CITY_TEST_API__ === undefined && e2.st.creates === 0 && /Tu equipo no puede mostrar la ciudad 3D\./.test(root(e2).textContent));
      e2.w.close(); }
  } catch (x) { results.push(['FAIL', 'excepción', x.stack]); }
  const fails = results.filter((r) => r[0] === 'FAIL');
  fails.forEach((r) => console.log(r.join(' | ')));
  console.log(fails.length ? 'FALLAS ' + fails.length : 'CITY_ENGINE OK (' + results.length + ')');
  process.exit(fails.length ? 1 : 0);
})();
