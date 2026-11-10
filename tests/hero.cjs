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
    },
  });
  return { dom, w: dom.window, d: dom.window.document, errors };
}
const norm = (s) => s.replace(/\s+/g, ' ').trim();
function allQs(w) { return w.eval('MODULES').flatMap((m) => m.questions); }
function click(w, el) { el.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); }
function modBtn(d, id) { return [...d.querySelectorAll('[data-act="mod"]')].find((b) => b.dataset.id === id); }
function btn(d, act, extra) { return [...d.querySelectorAll(`[data-act="${act}"]`)].find((b) => !extra || extra(b)); }
function findQ(w, d) {
  const sq = (t) => t.replace(/\s+/g, '');
  const p = sq(d.querySelector('.prompt').textContent);
  return allQs(w).find((q) => sq(q.prompt) === p);
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
    click(w, target); n++;
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
  // niveles
  for (const [xp,l] of [[99,'Nv 1'],[100,'Nv 2'],[9199,'Nv 14'],[9200,'Nv 15']]) {
    const {d}=boot({seed:fresh({xp, hero:undefined})}); ok('nivel '+xp, lvl(d)===l, lvl(d));
  }
  // bienvenida / migración
  let b=boot({seed:fresh({xp:300})});
  ok('migración: tarjeta de bienvenida', !!btn(b.d,'welcome'));
  click(b.w, btn(b.d,'welcomeclose'));
  const saved=JSON.parse(b.w.localStorage.getItem('estudio_isw_v1'));
  ok('migración: hero/virtues/stats', saved.hero && saved.hero.welcomed===true && saved.virtues && saved.stats.learnTopics);
  b=boot({seed:saved}); ok('bienvenida solo una vez', !btn(b.d,'welcome'));
  b=boot(); ok('instalación nueva sin bienvenida', !btn(b.d,'welcome') && !!btn(b.d,'hero'));
  // piezas bloqueadas y editor
  b=boot(); click(b.w, btn(b.d,'hero'));
  ok('editor: input nombre', !!b.d.querySelector('#hero-name'));
  const locked=[...b.d.querySelectorAll('.piece')].filter(x=>x.disabled);
  ok('editor: piezas bloqueadas con requisito', locked.length>10 && locked.every(x=>/Bloqueado ·/.test(x.textContent)), locked.length);
  const pcs=[...b.d.querySelectorAll('.piece[data-slot="suit"]')]; click(b.w, pcs[1]);
  ok('editor: elegir traje', b.d.querySelectorAll('.piece[data-slot="suit"]')[1].getAttribute('aria-pressed')==='true');
  const inp=b.d.querySelector('#hero-name'); inp.value='Zeta'; inp.dispatchEvent(new b.w.Event('input',{bubbles:true}));
  click(b.w, btn(b.d,'random'));
  const sv=JSON.parse(b.w.localStorage.getItem('estudio_isw_v1'));
  ok('editor: nombre y look guardados', sv.hero.name==='Zeta' && Object.values(sv.hero.look).every(i=>Number.isInteger(i)));
  ok('aleatorio solo desbloqueadas', [...b.d.querySelectorAll('.piece[aria-pressed="true"]')].every(x=>!x.disabled));
  // look bloqueado se restablece
  b=boot({seed:fresh({xp:0,hero:{name:'X',look:{skin:0,suit:7,head:4,eyes:5,emblem:9,cape:3,hand:6},welcomed:true}})});
  click(b.w, btn(b.d,'hero'));
  ok('look bloqueado reseteado', [...b.d.querySelectorAll('.piece[aria-pressed="true"]')].every(x=>!x.disabled));

  // poderes por nivel
  const avail=(xp)=>{const x=boot({seed:fresh({xp,hero:{name:'H',look:{skin:0,suit:0,head:0,eyes:0,emblem:0,cape:0,hand:0},welcomed:true}})}); startQuiz(x.w,x.d,'M01'); return x;};
  let x=avail(0); ok('Nv1 sin poderes', !x.d.querySelector('.powers'));
  x=avail(100); ok('Nv2 solo láser', !!pw(x.d,'laser') && !pw(x.d,'web'));
  click(x.w, pw(x.d,'laser'));
  ok('láser tacha 2 opciones', x.d.querySelectorAll('.opt.struck').length===2 && pw(x.d,'laser').disabled);
  const q=findQ(x.w,x.d); const ct=correctText(q);
  ok('láser no tacha la correcta', !optBtn(x.d,ct).classList.contains('struck'));
  const xp0=JSON.parse(x.w.localStorage.getItem('estudio_isw_v1')||'{"xp":100}').xp;
  click(x.w, optBtn(x.d,ct));
  ok('acierto asistido etiquetado', /con ayuda/.test(x.d.querySelector('.fb').textContent));
  const st=JSON.parse(x.w.localStorage.getItem('estudio_isw_v1'));
  const hk=Object.keys(st.topics)[0];
  ok('asistido: historial 0.5 y entra a cola', st.topics[hk][0]===0.5 && st.qs[q.id].q===true);
  const gain=st.xp-100; ok('asistido: XP = mitad', gain===Math.floor(10*q.difficulty/2), gain+' vs '+q.difficulty);
  // telaraña
  x=avail(250); const p1=x.d.querySelector('.prompt').textContent; click(x.w, pw(x.d,'web'));
  ok('telaraña cambia pregunta', x.d.querySelector('.prompt').textContent!==p1 && /^Salir1 \/ \d+$/.test(x.d.querySelector('.playtop').textContent.trim()));
  // detective
  x=avail(450); click(x.w, pw(x.d,'detective')); ok('detective muestra pista', !!x.d.querySelector('.hint'));
  // escudo
  x=avail(1000); click(x.w, pw(x.d,'shield')); ok('escudo armado', pw(x.d,'shield').classList.contains('armed'));
  { const q2=findQ(x.w,x.d), ct2=norm(correctText(q2)); click(x.w,[...x.d.querySelectorAll('.opt')].find(o=>norm(o.querySelector('span:last-child').textContent)!==ct2));
    ok('escudo: aviso de racha', /Escudo: tu racha/.test(x.d.querySelector('.fb').textContent)); }
  // regeneración
  x=avail(2500); ok('Nv8 regen visible', !!pw(x.d,'regen'));
  { const q2=findQ(x.w,x.d), ct2=norm(correctText(q2)); click(x.w,[...x.d.querySelectorAll('.opt')].find(o=>norm(o.querySelector('span:last-child').textContent)!==ct2));
    ok('regen: ofrece reintento', !!btn(x.d,'regenyes') && !x.d.querySelector('.fb.good'));
    click(x.w, btn(x.d,'regenyes'));
    ok('regen: opción tachada', x.d.querySelectorAll('.opt.struck').length===1);
    click(x.w, optBtn(x.d, correctText(q2)));
    ok('regen: acierto asistido', /con ayuda/.test(x.d.querySelector('.fb').textContent)); }
  // fotográfica y teletransportación
  x=avail(4000); click(x.w, pw(x.d,'photo')); ok('fotográfica muestra puntos clave', !!x.d.querySelector('.hint ul'));
  { const y=boot({seed:fresh({xp:7600,hero:{name:'H',look:{skin:0,suit:0,head:0,eyes:0,emblem:0,cape:0,hand:0},welcomed:true}})}); click(y.w,modBtn(y.d,'M01')); click(y.w,btn(y.d,'start',b=>b.dataset.kind==='tf'));
    const p0=y.d.querySelector('.prompt').textContent; const n0=y.d.querySelector('.playtop').textContent; click(y.w, pw(y.d,'tele'));
    ok('teletransportación cambia pregunta', y.d.querySelector('.prompt').textContent!==p0 && y.d.querySelector('.playtop').textContent===n0 && !!findQ(y.w,y.d)); }
  // supervelocidad en Relámpago
  { const y=boot({seed:fresh({xp:2500,hero:{name:'H',look:{skin:0,suit:0,head:0,eyes:0,emblem:0,cape:0,hand:0},welcomed:true}})}); click(y.w,modBtn(y.d,'M01')); click(y.w,btn(y.d,'start',b=>b.dataset.kind==='tf'));
    ok('velocidad habilitada en Relámpago', pw(y.d,'speed') && !pw(y.d,'speed').disabled); click(y.w,pw(y.d,'speed')); ok('velocidad se consume', pw(y.d,'speed').disabled);
    ok('regen no aplica en V/F', pw(y.d,'regen')?.getAttribute('aria-disabled')==='true'); y.w.close(); }
  // jefe sin poderes
  const m1=boot().w.eval('MODULES[0]'); const tp={}; m1.topics.forEach(t=>tp['M01:'+t.id]=[1,1,1,1,1,1,1,1,1,1]);
  b=boot({seed:fresh({xp:9200,topics:tp,hero:{name:'H',look:{skin:0,suit:0,head:0,eyes:0,emblem:0,cape:0,hand:0},welcomed:true}})});
  click(b.w,modBtn(b.d,'M01')); click(b.w,btn(b.d,'start',x=>x.dataset.kind==='boss'));
  ok('jefe sin poderes', !b.d.querySelector('.powers') && !!b.d.querySelector('.prompt'));
  playRound(b.w,b.d,'wrong',{boss:true});
  let sb=JSON.parse(b.w.localStorage.getItem('estudio_isw_v1'));
  ok('Valentía al intentar jefe', !!sb.virtues.valentia && sb.stats.bossFailed.M01===true);
  ok('banner de virtud', /Nueva virtud: Valentía/.test(b.d.body.textContent));
  b=boot({seed:sb}); click(b.w,modBtn(b.d,'M01')); click(b.w,btn(b.d,'start',x=>x.dataset.kind==='boss'));
  playRound(b.w,b.d,'right',{boss:true});
  sb=JSON.parse(b.w.localStorage.getItem('estudio_isw_v1'));
  ok('Resiliencia y Liderazgo', !!sb.virtues.resiliencia && !!sb.virtues.liderazgo);
  ok('Enfoque en ronda perfecta de 20', !!sb.virtues.enfoque);
  // curiosidad
  b=boot(); click(b.w,modBtn(b.d,'M01'));
  const ids=[...b.d.querySelectorAll('[data-act="topic"]')].slice(0,10).map(e=>e.dataset.id);
  for (const id of ids){ click(b.w,[...b.d.querySelectorAll('[data-act="topic"]')].find(e=>e.dataset.id===id)); click(b.w,btn(b.d,'learn')); click(b.w,btn(b.d,'topic')); click(b.w,btn(b.d,'mod')); }
  sb=JSON.parse(b.w.localStorage.getItem('estudio_isw_v1'));
  ok('Curiosidad tras 10 temas', !!sb.virtues.curiosidad, sb.stats.learnTopics.length);
  // constancia
  const yst=new Date(Date.now()-86400000), ys=yst.getFullYear()+'-'+String(yst.getMonth()+1).padStart(2,'0')+'-'+String(yst.getDate()).padStart(2,'0');
  b=boot({seed:fresh({days:{last:ys,count:2}})}); startQuiz(b.w,b.d,'M01'); playRound(b.w,b.d,'right');
  sb=JSON.parse(b.w.localStorage.getItem('estudio_isw_v1'));
  ok('Constancia con 3 días', !!sb.virtues.constancia && sb.days.count===3);
  // integridad: 10 rondas sin poderes
  b=boot({seed:fresh({stats:{learnTopics:[],cleared:0,roundsNoPower:9,bossFailed:{}}})}); startQuiz(b.w,b.d,'M01'); playRound(b.w,b.d,'wrong');
  sb=JSON.parse(b.w.localStorage.getItem('estudio_isw_v1')); ok('Integridad en la ronda 10', !!sb.virtues.integridad);
  // tope 20%: constancia + integridad
  b=boot({seed:fresh({xp:0,days:{last:ys,count:2},virtues:{integridad:1},stats:{learnTopics:[],cleared:0,roundsNoPower:0,bossFailed:{}}})}); startQuiz(b.w,b.d,'M01');
  const rb=b.w.document.querySelectorAll('.opt').length; playRound(b.w,b.d,'right');
  sb=JSON.parse(b.w.localStorage.getItem('estudio_isw_v1'));
  const qs=b.w.eval('MODULES[0].questions'); const base=sb.xp; ok('XP positivo con bonos', base>0, base);
  // resultados con subida de nivel
  b=boot({seed:fresh({xp:95})}); startQuiz(b.w,b.d,'M01'); playRound(b.w,b.d,'right');
  ok('banner subida de nivel', /Subiste a nivel/.test(b.d.body.textContent) && /Visión láser/.test(b.d.body.textContent));
  // Sabiduría
  const tp2={}; m1.topics.forEach(t=>tp2['M01:'+t.id]=[1,1,1,1,1,1,1,1,1,1]);
  b=boot({seed:fresh({topics:tp2})}); startQuiz(b.w,b.d,'M01'); playRound(b.w,b.d,'right');
  sb=JSON.parse(b.w.localStorage.getItem('estudio_isw_v1')); ok('Sabiduría con dominio 100%', !!sb.virtues.sabiduria);
  // reinicio
  b=boot({seed:fresh({xp:500,virtues:{enfoque:1}})}); click(b.w,btn(b.d,'reset')); click(b.w,btn(b.d,'resetyes'));
  sb=JSON.parse(b.w.localStorage.getItem('estudio_isw_v1')); ok('reinicio limpia héroe', sb.xp===0 && Object.keys(sb.virtues).length===0 && sb.hero.name==='Héroe');
  // almacenamiento bloqueado
  b=boot({brokenStorage:true}); startQuiz(b.w,b.d,'M01'); playRound(b.w,b.d,'right'); click(b.w,btn(b.d,'hero'));
  ok('sin storage: funciona', !!b.d.querySelector('#hero-name') && b.errors.length===0, b.errors.join('|'));
  // accesibilidad
  b=boot(); ok('aria en cabecera', !!b.d.querySelector('.avbtn[aria-label]') && !!b.d.querySelector('.minibar[aria-label]'));
  // sin errores
  const allErr=[]; 
  for (const r of results) {}
  const fails=results.filter(r=>r[0]==='FAIL');
  results.forEach(r=>console.log(r.join(' ')));
  console.log(fails.length? 'FALLAS: '+fails.length : 'HEROE OK ('+results.length+' comprobaciones)');
  process.exit(fails.length?1:0);
})().catch(e=>{console.error('EXC',e);process.exit(2)});
