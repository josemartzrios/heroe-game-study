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
  const st = { imports: 0, revokes: 0, creates: 0, disposed: 0, calls: [], scenes: [], canvases: [], lastOpts: null, resolveImport: null, resolveCreate: null, rejectImport: null, goToResolvers: [] };
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.test/', virtualConsole: vc,
    beforeParse(w) {
      if (opts.seed) w.localStorage.setItem('estudio_isw_v1', JSON.stringify(opts.seed));
      w.scrollTo = () => {};
      w.Element.prototype.scrollIntoView = function () {};
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
              goTo: (i) => { st.calls.push(['goTo', i]); if (opts.goToPending) return new Promise((r) => st.goToResolvers.push(r)); return Promise.resolve(); },
              setLayers: (n) => st.calls.push(['setLayers', n]),
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

  results.forEach((r) => console.log(r.join(' | ')));
  const fails = results.filter((r) => r[0] === 'FAIL').length;
  console.log(fails ? `\n${fails} FALLOS` : '\nTRIP_ENGINE OK (' + results.length + ' comprobaciones)');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('EXCEPCIÓN', e && e.message); results.forEach((r) => console.log(r.join(' | '))); process.exit(2); });
