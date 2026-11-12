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
      w.scrollTo = () => {}; w.HTMLCanvasElement.prototype.getContext = function () { return new Proxy({}, { get: () => () => {}, set: () => true }); };   // iconos del héroe
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
(async () => {
  let {w,d,errors}=boot();
  click(w,modBtn(d,'M08'));
  ok('M08: 15 temas', d.querySelectorAll('[data-act="topic"]').length === 15);
  ok('M08: jefe bloqueado', btn(d,'start',b=>b.dataset.kind==='boss').disabled);
  click(w,btn(d,'topic')); click(w,btn(d,'start',b=>b.dataset.kind==='quiz')); ok('M08: quiz', !!d.querySelector('.prompt')); playRound(w,d,'right'); ok('M08: resultados quiz', /\d+\/\d+/.test(d.querySelector('.score').textContent));
  for (const kind of ['tf','scenario','error']) {
    ({w,d,errors}=boot()); click(w,modBtn(d,'M08')); click(w,btn(d,'start',b=>b.dataset.kind===kind));
    ok('M08: '+kind+' abre', !!d.querySelector('.prompt')); playRound(w,d,'right'); ok('M08: '+kind+' ronda perfecta', /Ronda perfecta/.test(d.body.textContent)); if (kind==='tf') w.close();
  }
  const m3=boot().w.eval('MODULES[7]'); const tp={}; m3.topics.forEach(t=>tp['M08:'+t.id]=[1,1,1,1,1,1,1,1,1,1]);
  ({w,d,errors}=boot({seed:fresh({topics:tp})})); click(w,modBtn(d,'M08')); click(w,btn(d,'start',b=>b.dataset.kind==='boss'));
  const n=playRound(w,d,'right',{boss:true}); ok('M08: jefe 20 preguntas', n===20);
  const sb=JSON.parse(w.localStorage.getItem('estudio_isw_v1')); ok('M08: jefe superado guardado', sb.boss.M08 && sb.boss.M08.passed===true);
  // progreso M01/héroe conservado
  ({w,d,errors}=boot({seed:fresh({xp:300,topics:{'M01:T01':[1,1,1,1,1,1]},hero:{name:'Zed'}})}));
  ok('progreso previo y héroe intactos', /300/.test(d.querySelector('.pill b').textContent) && /Zed/.test(d.body.textContent));
  ok('sin errores de consola', errors.length===0, errors.join('|'));
  const fails=results.filter(r=>r[0]==='FAIL'); results.forEach(r=>console.log(r.join(' ')));
  console.log(fails.length?'FALLAS '+fails.length:'M08 OK ('+results.length+')'); process.exit(fails.length?1:0);
})().catch(e=>{console.error('EXC',e);process.exit(2)});
