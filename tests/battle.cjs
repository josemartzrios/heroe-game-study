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

const lvlXp = { 3: 250, 4: 450, 5: 700, 6: 1000, 8: 2500 };
const today = (w) => { const d = new w.Date(); const p = (n) => (n < 10 ? '0' : '') + n; return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()); };
const hud = (d, sel) => d.querySelector(sel).getAttribute('aria-label');
function enterCity(w, d) { click(w, modBtn(d, 'M01')); click(w, [...d.querySelectorAll('[data-act="world"]')].find((b) => b.dataset.id === 'M01')); }
function toVillain(w, d, re) { openPlaces(w, d); click(w, [...d.querySelectorAll('.wvil')].find((b) => re.test(b.textContent))); }
function answerOne(w, d, right) {
  const q = findQ(w, d), ct = norm(correctText(q));
  const t = right ? optBtn(d, correctText(q)) : [...d.querySelectorAll('.opt')].find((b) => !b.disabled && norm(b.querySelector('span:last-child').textContent) !== ct);
  click(w, t); return q;
}
const nextQ = (w, d) => click(w, d.querySelector('#nextbtn'));
(async () => {
  try {
  let { w, d, errors } = boot();
  enterCity(w, d);
  openPlaces(w, d);
  ok('Lugares: sección Villanos con 6', d.querySelectorAll('#wvils .wvil').length === 6 && /Villanos/.test(d.querySelector('#wplaces').textContent));
  ok('Barra: Villanos 0 de 6', /Villanos: 0 de 6/.test(d.querySelector('#wdom').textContent), d.querySelector('#wdom').textContent);
  ok('Nivel 1: sin botón Correr', !d.querySelector('#wrun'));
  toVillain(w, d, /Cuello de Botella/);
  const tx = dlg(d).textContent;
  ok('Encuentro: frase, temas y batalla', /solo pasa una petición/.test(tx) && /Domina:/.test(tx) && /T06/.test(tx) && /T09/.test(tx) && /T17/.test(tx) && !!dbtn(d, /A la batalla/) && !!dbtn(d, /Mejor después/), tx);
  ok('Nivel 1: sin Analizar', !dbtn(d, /Analizar/));
  ok('Retrato del villano en el diálogo', !!dlg(d).querySelector('canvas[data-spr="cuello"]'));
  const xp0 = saved(w).xp;
  click(w, dbtn(d, /A la batalla/));
  ok('Batalla: playtop con el formato de siempre', /^Salir1 \/ 8$/.test(d.querySelector('.playtop').textContent.trim()), d.querySelector('.playtop').textContent);
  ok('Batalla: HUD inicial', hud(d, '.hearts') === 'Energía 3 de 3' && hud(d, '.hpbar') === 'Vida del villano 4 de 4' && /Cuello de Botella/.test(d.querySelector('.arena').textContent));
  ok('Interfaz de juego activa', d.body.classList.contains('game'));
  const seenTopics = [];
  for (let i = 0; i < 4; i++) { const q = answerOne(w, d, true); seenTopics.push(q.topic); if (i === 0) ok('Acierto baja la vida del villano', hud(d, '.hpbar') === 'Vida del villano 3 de 4' && /Le quitaste 1 de vida/.test(d.querySelector('.arena').textContent)); if (i < 3) nextQ(w, d); }
  ok('Preguntas solo de los temas del villano', seenTopics.every((t) => ['T06', 'T09', 'T17'].includes(t)), seenTopics.join());
  ok('Al llegar a 0 ofrece ver resultados', /Ver resultados/.test(d.querySelector('#nextbtn').textContent) && hud(d, '.hpbar') === 'Vida del villano 0 de 4');
  nextQ(w, d);
  let s = saved(w);
  ok('Victoria: resultados de 4 preguntas', /¡Victoria!/.test(d.body.textContent) && /huyó de la ciudad/.test(d.body.textContent) && d.querySelector('.big').textContent === '4/4');
  ok('Victoria guardada hoy y historial creció', s.city.beaten.cuello === today(w) && ['T06', 'T09', 'T17'].reduce((n, t) => n + (s.topics['M01:' + t] || []).length, 0) === 4 && s.xp > xp0, JSON.stringify(s.city.beaten));
  ok('Calificación S', !!d.querySelector('.rank.rS'));
  click(w, btn(d, 'back'));
  ok('De vuelta en el mundo: contador 1 de 6', !!d.querySelector('#wcv') && /Villanos: 1 de 6/.test(d.querySelector('#wdom').textContent) && dlg(d).hidden);
  openPlaces(w, d);
  ok('Villano derrotado hoy en Lugares', /Derrotado hoy/.test([...d.querySelectorAll('.wvil')].find((b) => /Cuello/.test(b.textContent)).textContent));
  click(w, [...d.querySelectorAll('.wvil')].find((b) => /Cuello/.test(b.textContent)));
  ok('Derrotado: aviso sin batalla', /Volverá mañana/.test(dlg(d).textContent) && !dbtn(d, /A la batalla/));
  click(w, dbtn(d, /Cerrar/));
  // derrota
  toVillain(w, d, /Lagartijo/); click(w, dbtn(d, /A la batalla/));
  const xp1 = saved(w).xp;
  for (let i = 0; i < 3; i++) { answerOne(w, d, false); if (i === 0) ok('Fallo baja la energía', hud(d, '.hearts') === 'Energía 2 de 3'); if (i < 2) nextQ(w, d); }
  nextQ(w, d);
  s = saved(w);
  ok('Derrota: escapó, sin beaten y sin perder XP', /Derrota/.test(d.body.textContent) && /escapó esta vez/.test(d.body.textContent) && !s.city.beaten.lag && s.xp >= xp1 && d.querySelector('.big').textContent === '0/3');
  click(w, btn(d, 'back'));
  ok('Tras la derrota el villano sigue en las calles', (openPlaces(w, d), /En las calles/.test([...d.querySelectorAll('.wvil')].find((b) => /Lagartijo/.test(b.textContent)).textContent)));
  ok('Sin errores de consola (nivel 1)', errors.length === 0, errors.join('|'));
  w.close();
  // regreso al día siguiente + analizar + correr
  ({ w, d, errors } = boot({ seed: Object.assign(fresh({ xp: 700 }), { city: { beaten: { cuello: '2020-01-01' } } }) }));
  enterCity(w, d);
  ok('Nivel 5: botón Correr', !!d.querySelector('#wrun'));
  click(w, d.querySelector('#wrun'));
  ok('Correr se activa y se guarda', d.querySelector('#wrun').getAttribute('aria-pressed') === 'true' && saved(w).world.run === true);
  toVillain(w, d, /Cuello de Botella/);
  ok('Villano de ayer vuelve y saluda', /¡Volví!/.test(dlg(d).textContent) && !!dbtn(d, /A la batalla/));
  ok('Nivel 4+: Analizar disponible', !!dbtn(d, /Analizar/));
  click(w, dbtn(d, /Analizar/));
  ok('Analizar muestra punto débil con estrellas', /punto débil para ti: T\d\d .+, \d estrellas?/.test(dlg(d).textContent) && !dbtn(d, /^Analizar/) && !!dbtn(d, /A la batalla/), dlg(d).textContent);
  // los villanos se mueven
  click(w, dbtn(d, /Mejor después/));
  frames(w, 60, 1000);
  ok('El ciclo sigue con villanos', errors.length === 0, errors.join('|'));
  w.close();
  // escudo (nivel 6)
  ({ w, d, errors } = boot({ seed: fresh({ xp: 1000 }) }));
  enterCity(w, d); toVillain(w, d, /Monolito/); click(w, dbtn(d, /A la batalla/));
  click(w, pw(d, 'shield'));
  ok('Escudo: domo en el HUD', !!d.querySelector('.fighter.hero.domed'));
  // avanzar hasta una pregunta sin importar tipo y fallar
  answerOne(w, d, false);
  ok('Escudo protege la energía', hud(d, '.hearts') === 'Energía 3 de 3' && /Escudo: tu racha/.test(d.querySelector('.fb').textContent), hud(d, '.hearts'));
  w.close();
  // regeneración (nivel 8)
  ({ w, d, errors } = boot({ seed: fresh({ xp: 2500 }) }));
  enterCity(w, d); toVillain(w, d, /Duplicador/); click(w, dbtn(d, /A la batalla/));
  let healed = false, guard = 0;
  while (d.querySelector('.prompt') && guard++ < 8) {
    const q = findQ(w, d), en = hud(d, '.hearts');
    if (en === 'Energía 3 de 3') { // perder una primero
      if (q.type === 'tf') { answerOne(w, d, false); } else { answerOne(w, d, false); if (btn(d, 'regenno')) click(w, btn(d, 'regenno')); }
      if (d.querySelector('#nextbtn')) nextQ(w, d); continue;
    }
    if (q.type === 'tf' || !pw(d, 'regen') || /×0/.test(pw(d, 'regen').textContent)) { answerOne(w, d, true); if (d.querySelector('#nextbtn')) nextQ(w, d); continue; }
    answerOne(w, d, false);
    if (!btn(d, 'regenyes')) { if (d.querySelector('#nextbtn')) nextQ(w, d); continue; }
    click(w, btn(d, 'regenyes'));
    ok('Regeneración: brillo en opciones', !!d.querySelector('.opts.fx-regen'));
    answerOne(w, d, true);
    healed = hud(d, '.hearts') === 'Energía 3 de 3' && /Recuperaste 1 de energía/.test(d.querySelector('.arena').textContent);
    break;
  }
  ok('Regeneración recupera 1 de energía', healed, hud(d, '.hearts'));
  ok('Sin errores de consola (poderes)', errors.length === 0, errors.join('|'));
  w.close();
  // progreso anterior sin beaten
  ({ w, d, errors } = boot({ seed: Object.assign(fresh({ xp: 300 }), { world: { at: 'M01', pos: {}, talked: { 'M01:T01': true } } }) }));
  click(w, btn(d, 'world'));
  s = (click(w, btn(d, 'home')), saved(w));
  ok('Progreso anterior sin beaten carga bien', errors.length === 0 && typeof s.city.beaten === 'object' && s.world.talked['M01:T01'] === true && s.xp === 300, errors.join('|'));
  // modo rápido con la interfaz de juego
  click(w, modBtn(d, 'M02')); click(w, btn(d, 'topic')); click(w, btn(d, 'start', (b) => b.dataset.kind === 'quiz'));
  ok('Modo rápido usa la interfaz de juego sin HUD', d.body.classList.contains('game') && !d.querySelector('.arena') && !!d.querySelector('.prompt'));
  click(w, btn(d, 'quit'));
  ok('Al salir de la ronda se quita el estilo de juego', !d.body.classList.contains('game'));
  w.close();
  } catch (e) { results.push(['FAIL', 'excepción', e.stack]); }
  const fails = results.filter((r) => r[0] === 'FAIL');
  fails.forEach((r) => console.log(r.join(' | ')));
  console.log(fails.length ? 'FALLAS ' + fails.length : 'BATTLE OK (' + results.length + ')'); process.exit(fails.length ? 1 : 0);
})();
