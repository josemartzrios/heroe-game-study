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
const norm = (s) => s.replace(/\s+/g, ' ').trim();
function allQs(w) { return w.eval('MODULES').flatMap((m) => m.questions); }
function click(w, el) { el.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); }
function modBtn(d, id) { return [...d.querySelectorAll('[data-act="mod"]')].find((b) => b.dataset.id === id); }
function btn(d, act, extra) { return [...d.querySelectorAll(`[data-act="${act}"]`)].find((b) => !extra || extra(b)); }
function findQ(w, d) {
  const sq = (t) => t.replace(/\s+/g, '');
  const p = sq(d.querySelector('.prompt').textContent);
  const nm = (t) => t.replace(/`/g, '').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
  const shown = [...d.querySelectorAll('.opt')].map((b) => nm(b.querySelector('span:last-child').textContent));
  const c = allQs(w).filter((q) => sq(q.prompt) === p);
  return c.find((q) => q.type === 'tf' ? true : q.options.every((o) => shown.includes(nm(o)))) || c[0];
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

(async () => {
  // 1. Inicio y navegación
  let { w, d, errors } = boot();
  ok('Inicio muestra título y módulo M01', d.body.textContent.includes('Estudio ISW') && !!btn(d, 'mod'));
  click(w, modBtn(d, 'M01'));
  ok('Mapa del módulo con 19 temas', d.querySelectorAll('[data-act="topic"]').length === 19);
  const bossBtn = btn(d, 'start', (b) => b.dataset.kind === 'boss');
  ok('Jefe final bloqueado al inicio', bossBtn.disabled);
  ['tf', 'scenario', 'error'].forEach((k) => ok('Modo de módulo ' + k + ' disponible', !btn(d, 'start', (b) => b.dataset.kind === k).disabled));

  // 2. Tema, aprender, quiz acertando todo
  click(w, [...d.querySelectorAll('[data-act="topic"]')].find((b) => b.dataset.id === 'T09'));
  ok('Vista de tema T09', d.querySelector('h1').textContent === 'Sharding');
  click(w, btn(d, 'learn'));
  ok('Tarjeta Aprender con puntos clave', d.querySelectorAll('.kp li').length >= 4);
  click(w, btn(d, 'topic'));
  click(w, btn(d, 'start', (b) => b.dataset.kind === 'quiz'));
  const nQuiz = playRound(w, d, 'right');
  ok('Quiz T09 de 8 preguntas', nQuiz === 8, 'n=' + nQuiz);
  ok('Resultados 8/8 y XP', d.querySelector('.big').textContent === '8/8' && /\+\d+/.test(d.querySelector('.score').textContent));
  const saved = JSON.parse(w.localStorage.getItem('estudio_isw_v1'));
  ok('Progreso guardado en localStorage', saved.xp > 0 && saved.topics['M01:T09'].length === 8);
  ok('Con 8 intentos aparecen estrellas (3★)', (() => { click(w, btn(d, 'back')); return d.querySelector('.stars').getAttribute('aria-label') === '3 de 3 estrellas'; })());

  // 3. Fallar: cola de repaso y repetir fallos
  click(w, btn(d, 'start', (b) => b.dataset.kind === 'scenario'));
  const nSc = playRound(w, d, 'wrong');
  ok('Ronda de escenarios del tema', nSc >= 1);
  ok('Resultados muestran temas por reforzar', !!d.querySelector('.weak li'));
  click(w, btn(d, 'replay'));
  ok('Repasar lo que fallé arranca ronda', !!d.querySelector('.prompt'));
  click(w, d.querySelector('[data-act="quit"]'));
  click(w, btn(d, 'home'));
  ok('Home muestra Repaso pendiente', !!btn(d, 'review'));
  const q1 = JSON.parse(w.localStorage.getItem('estudio_isw_v1')).qs;
  ok('Preguntas falladas entran a la cola', Object.values(q1).some((r) => r.q));

  // 4. Cola: salir solo tras 2 aciertos en sesiones distintas
  click(w, btn(d, 'review'));
  playRound(w, d, 'right');
  let st = JSON.parse(w.localStorage.getItem('estudio_isw_v1'));
  ok('Un acierto no saca de la cola (misma sesión)', Object.values(st.qs).some((r) => r.q));
  // simular segunda sesión (>30 min inactivo)
  st.lastActive = Date.now() - 31 * 60 * 1000;
  w.close();
  ({ w, d, errors } = boot({ seed: st }));
  click(w, btn(d, 'review'));
  playRound(w, d, 'right');
  st = JSON.parse(w.localStorage.getItem('estudio_isw_v1'));
  ok('Dos aciertos en sesiones distintas vacían la cola', !Object.values(st.qs).some((r) => r.q), JSON.stringify(Object.values(st.qs).filter((r) => r.q)));

  // 5. Persistencia al recargar
  const keep = JSON.parse(w.localStorage.getItem('estudio_isw_v1'));
  w.close();
  ({ w, d, errors } = boot({ seed: keep }));
  ok('Progreso persiste al recargar (XP en cabecera)', d.querySelector('.pill b').textContent.replace(/\D/g, '') === String(keep.xp));

  // 6. Jefe final desbloqueado
  const topicsSeed = {};
  for (let i = 1; i <= 19; i++) topicsSeed['M01:T' + String(i).padStart(2, '0')] = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
  for (let i = 1; i <= 23; i++) topicsSeed['M02:T' + String(i).padStart(2, '0')] = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1];
  w.close();
  ({ w, d, errors } = boot({ seed: { v: 1, xp: 0, days: { last: null, count: 0 }, session: 1, lastActive: 0, topics: topicsSeed, qs: {}, boss: {} } }));
  click(w, modBtn(d, 'M01'));
  ok('Dominio 100 % con todos los temas en 3★', d.body.textContent.includes('100 % de dominio'));
  const bb = btn(d, 'start', (b) => b.dataset.kind === 'boss');
  ok('Jefe final desbloqueado', !bb.disabled);
  click(w, bb);
  const nBoss = playRound(w, d, 'right', { boss: true });
  ok('Jefe de 20 preguntas', nBoss === 20, 'n=' + nBoss);
  ok('Jefe superado', !!d.querySelector('.banner.good') && d.querySelector('.big').textContent === '20/20');
  ok('Mejor jefe guardado', JSON.parse(w.localStorage.getItem('estudio_isw_v1')).boss.M01.passed === true);
  click(w, btn(d, 'back'));
  click(w, btn(d, 'start', (b) => b.dataset.kind === 'boss'));
  playRound(w, d, 'wrong', { boss: true });
  ok('Jefe reprobado muestra lo fallado', !!d.querySelector('.banner.bad') && d.querySelectorAll('.miss .card').length === 20);

  // 7. Teclado
  click(w, btn(d, 'back'));
  click(w, btn(d, 'start', (b) => b.dataset.kind === 'scenario'));
  const key = (k) => d.dispatchEvent(new w.KeyboardEvent('keydown', { key: k, bubbles: true }));
  key('2');
  ok('Tecla 2 responde la pregunta', !!d.querySelector('.fb'));
  d.activeElement && d.activeElement.blur();
  key('Enter');
  ok('Enter continúa a la siguiente', !d.querySelector('.fb') && !!d.querySelector('.prompt'));

  // 8. Relámpago: temporizador agota -> falla
  click(w, d.querySelector('[data-act="quit"]'));
  click(w, btn(d, 'start', (b) => b.dataset.kind === 'tf'));
  ok('Relámpago muestra temporizador', !!d.getElementById('tbar'));
  await sleep(12400);
  ok('Se acaba el tiempo => marcado incorrecto', !!d.querySelector('.fb.bad') && d.querySelector('.fb strong').textContent.includes('Se acabó el tiempo'));
  w.close();


  // 8b. Dos módulos y M02
  ({ w, d, errors } = boot());
  ok('Inicio muestra diez módulos', d.querySelectorAll('.mods [data-act="mod"]').length === 10);
  click(w, modBtn(d, 'M02'));
  ok('M02 abre su mapa con 23 temas', d.querySelectorAll('[data-act="topic"]').length === 23 && d.querySelector('h1').textContent.includes('Fundamentos'));
  ok('Jefe de M02 bloqueado al inicio', btn(d, 'start', (b) => b.dataset.kind === 'boss').disabled);
  click(w, [...d.querySelectorAll('[data-act="topic"]')].find((b) => b.dataset.id === 'T09'));
  ok('Tema M02 T09 es Permisos', d.querySelector('h1').textContent.includes('Permisos'));
  click(w, btn(d, 'learn'));
  ok('Aprender M02 muestra puntos clave', d.querySelectorAll('.kp li').length >= 5);
  click(w, btn(d, 'topic'));
  click(w, btn(d, 'start', (b) => b.dataset.kind === 'quiz'));
  const nq2 = playRound(w, d, 'right');
  ok('Quiz M02 T09 acertando todo', nq2 >= 4 && d.querySelector('.big').textContent === nq2 + '/' + nq2, 'n=' + nq2);
  const s2 = JSON.parse(w.localStorage.getItem('estudio_isw_v1'));
  ok('Progreso de M02 usa claves M02:', Object.keys(s2.topics).every((k) => k.startsWith('M02:')) && Object.keys(s2.qs).every((k) => k.startsWith('M02-')));
  // los otros modos de M02
  click(w, btn(d, 'back'));
  for (const kind of ['tf', 'scenario', 'error']) {
    const sb = btn(d, 'start', (b) => b.dataset.kind === kind);
    const has = allQs(w).filter((q) => q.id.startsWith('M02-') && q.topic === 'T09' && (kind === 'tf' ? q.type === 'tf' : q.type === kind)).length;
    if (!has) { ok('M02 T09 sin preguntas de ' + kind + ' => botón deshabilitado', sb.disabled); continue; }
    click(w, sb);
    const n = playRound(w, d, 'right');
    ok('M02 modo ' + kind + ' (a nivel de tema)', n === has, 'n=' + n + ' esperado=' + has);
    click(w, btn(d, 'back'));
  }
  click(w, btn(d, 'mod', (b) => b.dataset.id === 'M02'));
  for (const kind of ['tf', 'scenario', 'error']) {
    click(w, btn(d, 'start', (b) => b.dataset.kind === kind));
    const n = playRound(w, d, 'right');
    ok('M02 modo ' + kind + ' (a nivel de módulo)', (kind === 'tf' ? n === 10 : kind === 'scenario' ? n === 8 : n === 8), 'n=' + n);
    click(w, btn(d, 'back'));
  }
  w.close();

  // 8c. El progreso de M01 no se pierde al jugar M02 y el jefe de M02 funciona
  const keepSeed = { v: 1, xp: 120, days: { last: null, count: 0 }, session: 1, lastActive: 0, topics: Object.assign({}, topicsSeed), qs: {}, boss: {} };
  keepSeed.topics['M01:T01'] = [1, 1, 1, 1, 1, 1, 0, 1, 1, 1];
  ({ w, d, errors } = boot({ seed: keepSeed }));
  click(w, modBtn(d, 'M02'));
  const b2 = btn(d, 'start', (b) => b.dataset.kind === 'boss');
  ok('Jefe de M02 desbloqueado con todos sus temas', !b2.disabled);
  click(w, b2);
  const nb2 = playRound(w, d, 'right', { boss: true });
  ok('Jefe de M02 de 20 preguntas y superado', nb2 === 20 && !!d.querySelector('.banner.good'), 'n=' + nb2);
  const s3 = JSON.parse(w.localStorage.getItem('estudio_isw_v1'));
  ok('Progreso previo de M01 intacto', JSON.stringify(s3.topics['M01:T01']) === JSON.stringify([1, 1, 1, 1, 1, 1, 0, 1, 1, 1]) && s3.boss.M02 && s3.boss.M02.passed && !s3.boss.M01);
  ok('XP acumulado sobre el previo', s3.xp > 120);
  ok('Sin errores de consola (M02)', errors.length === 0, errors.join(' | '));
  w.close();

  // 9. Almacenamiento bloqueado
  ({ w, d, errors } = boot({ brokenStorage: true }));
  click(w, modBtn(d, 'M01'));
  click(w, [...d.querySelectorAll('[data-act="topic"]')].find((b) => b.dataset.id === 'T01'));
  click(w, btn(d, 'start', (b) => b.dataset.kind === 'quiz'));
  const nb = playRound(w, d, 'right');
  ok('Funciona sin localStorage', nb >= 1 && d.querySelector('.big').textContent.includes('/'));
  ok('Sin errores de consola (storage bloqueado)', errors.length === 0, errors.join(' | '));
  w.close();

  // 10. Reinicio con confirmación en la página
  ({ w, d, errors } = boot({ seed: keep }));
  click(w, btn(d, 'reset'));
  ok('Reinicio pide confirmación en la página', !!btn(d, 'resetyes'));
  click(w, btn(d, 'resetyes'));
  ok('Reinicio borra XP', d.querySelector('.pill b').textContent === '0');
  ok('Sin errores de consola (flujo normal)', errors.length === 0, errors.join(' | '));
  w.close();

  results.forEach((r) => console.log(r.join(' | ')));
  const fails = results.filter((r) => r[0] === 'FAIL').length;
  console.log(fails ? `\n${fails} FALLOS` : '\nTODO OK (' + results.length + ' comprobaciones)');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('EXCEPCIÓN', e); results.forEach((r) => console.log(r.join(' | '))); process.exit(2); });
