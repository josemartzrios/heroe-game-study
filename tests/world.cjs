const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const html = fs.readFileSync(require('path').join(__dirname,'..','juego_estudio.html'), 'utf8');
const results = [];
const ok = (name, cond, extra) => { results.push([cond ? 'PASS' : 'FAIL', name, extra || '']); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function boot(opts = {}) {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => errors.push('jsdomError: ' + (e.detail || e.message)));
  vc.on('error', (e) => errors.push('console.error: ' + e));
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.test/', virtualConsole: vc,
    beforeParse(w) {
      if (opts.brokenStorage) Object.defineProperty(w, 'localStorage', { get() { throw new Error('blocked'); } });
      else if (opts.seed) w.localStorage.setItem('estudio_isw_v1', JSON.stringify(opts.seed));
      w.scrollTo = () => {};
      const fake = (el) => new Proxy({ canvas: el }, { get(t, k) { if (k in t) return t[k]; if (k === 'measureText') return () => ({ width: 0 }); return () => {}; }, set(t, k, v) { t[k] = v; return true; } });
      w.HTMLCanvasElement.prototype.getContext = function () { return opts.noCtx ? null : fake(this); };
      const q = []; let total = 0;
      w.requestAnimationFrame = (cb) => { q.push(cb); total++; return total; };
      w.cancelAnimationFrame = () => { q.length = 0; };
      w.__raf = (ms) => { const l = q.splice(0); l.forEach((cb) => cb(ms)); };
      w.__rafTotal = () => total;
    },
  });
  return { dom, w: dom.window, d: dom.window.document, errors };
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

// Responde la ronda actual. mode: 'right' | 'wrong'
function playRound(w, d, mode, { boss } = {}) {
  let n = 0;
  while (d.querySelector('.prompt')) {
    const q = findQ(w, d);
    if (!q) throw new Error('pregunta no encontrada: ' + d.querySelector('.prompt').textContent);
    let target;
    if (mode === 'right') target = optBtn(d, correctText(q));
    else { const ct = norm(correctText(q)); target = [...d.querySelectorAll('.opt')].find((b) => norm(b.querySelector('span:last-child').textContent) !== ct); }
    if(!target){ console.log('SIN OPCION:', q.id, JSON.stringify(q.prompt), JSON.stringify(correctText(q)), [...d.querySelectorAll('.opt')].map(b=>b.textContent)); process.exit(3);} click(w, target); n++;
    if (!boss) {
      if (!d.querySelector('.fb')) throw new Error('no apareció retroalimentación');
      click(w, d.querySelector('#nextbtn'));
    }
    if (n > 40) throw new Error('ronda infinita');
  }
  return n;
}


const fresh = (o={}) => Object.assign({v:1,xp:0,days:{last:null,count:0},session:1,lastActive:0,topics:{},qs:{},boss:{}}, o);
const lvl = (d) => d.querySelector('.lvlcol .pill b').textContent;
function startQuiz(w,d,mid){ click(w, modBtn(d,mid)); click(w, btn(d,'topic')); click(w, btn(d,'start',b=>b.dataset.kind==='quiz')); }
function pw(d,id){ return d.querySelector('[data-pw="'+id+'"]'); }

const KEY='estudio_isw_v1';
const saved = (w) => JSON.parse(w.localStorage.getItem(KEY));
const key = (w, d, type, k) => d.dispatchEvent(new w.KeyboardEvent(type, { key: k, bubbles: true }));
const places = (d) => [...d.querySelectorAll('.wplace')];
const place = (d, re) => places(d).find((b) => re.test(b.textContent));
const dlg = (d) => d.querySelector('#wdlg');
const dbtn = (d, re) => [...d.querySelectorAll('#wdlg button')].find((b) => re.test(b.textContent));
function frames(w, n, t0 = 1000) { for (let i = 0; i < n; i++) w.__raf(t0 + i * 40); }
function openPlaces(w, d) { if (d.querySelector('#wplaces').hidden) click(w, d.querySelector('#wplbtn')); }
(async () => {
  try {
  // 1
  let { w, d, errors } = boot();
  ok('Inicio: botón Entrar al mundo', !!btn(d, 'world') && /Entrar al mundo/.test(btn(d, 'world').textContent) && errors.length === 0, errors.join('|'));
  // 2
  click(w, btn(d, 'world'));
  ok('Plaza: canvas, Lugares y cruceta', !!d.querySelector('#wcv') && !!d.querySelector('#wplbtn') && d.querySelectorAll('.wkey').length === 4 && /Plaza central/.test(d.querySelector('#wname').textContent));
  frames(w, 3);
  // 3
  key(w, d, 'keydown', 'ArrowRight'); frames(w, 12, 2000); key(w, d, 'keyup', 'ArrowRight'); frames(w, 6, 3000);
  click(w, btn(d, 'home'));
  let s = saved(w);
  ok('Salir guarda lugar y posición', s.world.at === 'hub' && s.world.pos.hub && s.world.pos.hub.x === 13 && s.world.pos.hub.d === 'right', JSON.stringify(s.world));
  // 11
  const tot = w.__rafTotal(); w.__raf(5000); w.__raf(5040);
  ok('El ciclo se detiene al salir', w.__rafTotal() === tot && !d.querySelector('#wcv'));
  // 4
  click(w, btn(d, 'world')); openPlaces(w, d);
  ok('Plaza lista 10 portales', places(d).filter((b) => /^Portal M\d\d/.test(b.textContent)).length === 10, places(d).length);
  click(w, place(d, /^Portal M02/));
  ok('Portal cerrado avisa', /abrirá pronto/.test(dlg(d).textContent) && !!dbtn(d, /modo rápido/));
  click(w, dbtn(d, /Cerrar/));
  ok('Diálogo cerrado', dlg(d).hidden);
  // 5
  openPlaces(w, d); click(w, place(d, /^Portal M01/));
  ok('Entra a la Ciudad de los Sistemas', /Ciudad de los Sistemas/.test(d.querySelector('#wname').textContent));
  openPlaces(w, d);
  ok('M01 lista 19 mentores', places(d).filter((b) => /^T\d\d ·/.test(b.textContent)).length === 19);
  // 6
  click(w, place(d, /^T01 ·/));
  const t1 = w.eval('MODULES[0].topics[0]');
  ok('Saludo del mentor', /Hola, Héroe\. Soy Ana/.test(dlg(d).textContent), dlg(d).textContent);
  click(w, dbtn(d, /Siguiente/));
  ok('Resumen del tema', norm(dlg(d).textContent).includes(norm(t1.summary).slice(0, 30)));
  let seen = 0;
  for (let i = 0; i < t1.keyPoints.length; i++) { click(w, dbtn(d, /Siguiente/)); if (new RegExp('Punto ' + (i + 1) + ' de ' + t1.keyPoints.length).test(dlg(d).textContent)) seen++; }
  ok('Recorre todos los puntos clave', seen === t1.keyPoints.length, seen);
  click(w, dbtn(d, /Siguiente/));
  s = saved(w);
  ok('Tema aprendido y hablado', s.stats.learnTopics.includes('M01:T01') && s.world.talked['M01:T01'] === true && !!dbtn(d, /Ponme a prueba/));
  // 7
  click(w, dbtn(d, /Ponme a prueba/));
  ok('Ronda desde el mundo', !!d.querySelector('.prompt') && !d.querySelector('#wcv'));
  playRound(w, d, 'right');
  ok('Resultados ofrecen volver al mundo', /Volver al mundo/.test(btn(d, 'back').textContent));
  click(w, btn(d, 'back'));
  s = saved(w);
  ok('Vuelve al mundo frente al mentor', !!d.querySelector('#wcv') && /¡Excelente!/.test(dlg(d).textContent) && (s.topics['M01:T01'] || []).length > 0 && s.world.at === 'M01', dlg(d).textContent);
  click(w, dbtn(d, /Ponme a prueba/)); playRound(w, d, 'right'); click(w, btn(d, 'back'));
  ok('Con 6 respuestas o más el mentor muestra estrellas', /★/.test(dlg(d).textContent), dlg(d).textContent);
  click(w, dbtn(d, /Hasta luego/));
  // volver a hablar
  openPlaces(w, d); click(w, place(d, /^T01 ·/));
  ok('Segundo saludo va al menú', /Volviste/.test(dlg(d).textContent) && !!dbtn(d, /Explícame otra vez/));
  click(w, dbtn(d, /Hasta luego/));
  // salir a mitad de ronda
  openPlaces(w, d); click(w, place(d, /^T02 ·/)); click(w, dbtn(d, /Saltar/)); click(w, dbtn(d, /Ponme a prueba/));
  click(w, btn(d, 'quit'));
  ok('Salir de la ronda vuelve al mundo', !!d.querySelector('#wcv') && !!dbtn(d, /Ponme a prueba/) && !/Excelente/.test(dlg(d).textContent));
  click(w, dbtn(d, /Hasta luego/));
  // 8
  openPlaces(w, d); click(w, place(d, /Guardián/));
  ok('Torre cerrada: Te faltan', /Te faltan \d+/.test(dlg(d).textContent) && !dbtn(d, /Enfrentar/));
  ok('Sin errores de consola (flujo)', errors.length === 0, errors.join('|'));
  w.close();
  const tp = {}; boot().w.eval('MODULES[0]').topics.forEach((t) => { tp['M01:' + t.id] = [1, 1, 1, 1, 1, 1]; });
  ({ w, d, errors } = boot({ seed: fresh({ topics: tp, xp: 700 }) }));
  click(w, modBtn(d, 'M01'));
  const ex = [...d.querySelectorAll('[data-act="world"]')].find((b) => b.dataset.id === 'M01');
  ok('Módulo M01 ofrece explorar la región', !!ex);
  click(w, ex);
  ok('Entra directo a la región', /Ciudad de los Sistemas/.test(d.querySelector('#wname').textContent));
  openPlaces(w, d); click(w, place(d, /Guardián/));
  ok('Torre abierta ofrece el jefe', !!dbtn(d, /Enfrentar al jefe/));
  click(w, dbtn(d, /Enfrentar al jefe/));
  const nb = playRound(w, d, 'right', { boss: true });
  ok('Jefe de 20 preguntas', nb === 20, nb);
  click(w, btn(d, 'back'));
  s = saved(w);
  ok('Jefe superado y guardián felicita', s.boss.M01 && s.boss.M01.passed === true && /superaste/.test(dlg(d).textContent), dlg(d).textContent);
  ok('Migración conserva progreso', s.xp > 700 && s.hero && s.world && typeof s.world.talked === 'object' && errors.length === 0, errors.join('|'));
  w.close();
  // 9
  ({ w, d, errors } = boot({ noCtx: true }));
  click(w, btn(d, 'world'));
  ok('Sin canvas: aviso y lista', !d.querySelector('#wnote').hidden && !d.querySelector('#wplaces').hidden && places(d).length > 10 && errors.length === 0, errors.join('|'));
  click(w, place(d, /^Portal M01/)); click(w, place(d, /^T03 ·/));
  ok('Sin canvas: se puede hablar con un mentor', /Soy Carla/.test(dlg(d).textContent));
  key(w, d, 'keydown', 'Escape');
  ok('Esc cierra el diálogo', dlg(d).hidden);
  w.close();
  // 10
  ({ w, d, errors } = boot({ seed: fresh({ xp: 500, topics: { 'M02:T01': [1, 1] } }) }));
  click(w, btn(d, 'world')); frames(w, 3); click(w, btn(d, 'home'));
  s = saved(w);
  ok('Progreso antiguo sin world carga y se conserva', s.xp === 500 && s.topics['M02:T01'].length === 2 && s.world.at === 'hub' && errors.length === 0, errors.join('|'));
  // teclado: hablar con E frente al letrero
  click(w, btn(d, 'world')); frames(w, 2);
  key(w, d, 'keydown', 'd'); frames(w, 12, 9000); key(w, d, 'keyup', 'd'); frames(w, 5, 9600);
  key(w, d, 'keydown', 'e');
  ok('E abre el letrero de bienvenida', /Camina con las flechas/.test(dlg(d).textContent), dlg(d).textContent);
  w.close();
  } catch (e) { results.push(['FAIL', 'excepción', e.stack]); }
  const fails = results.filter((r) => r[0] === 'FAIL');
  fails.forEach((r) => console.log(r.join(' | ')));
  console.log(fails.length ? 'FALLAS ' + fails.length : 'WORLD OK (' + results.length + ')'); process.exit(fails.length ? 1 : 0);
})();
