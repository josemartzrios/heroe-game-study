// Adversariales dirigidas + regresiones permanentes de las roturas que encontró el fuzzing del estado.
// Uso: node tests/adv/attacks.cjs   (sale con código 1 si alguna falla)
const L = require('./lib.cjs');
const results = [];
const ok = (name, cond, extra) => { results.push([cond ? 'PASS' : 'FAIL', name, extra || '']); };
const load = (w) => JSON.parse(L.rawState(w));
const base = (o = {}) => JSON.stringify(Object.assign({ v: 1, xp: 0, days: { last: null, count: 0 }, session: 1, lastActive: 0, topics: {}, qs: {}, boss: {},
  hero: { name: 'Zed', look: { skin: 1, suit: 1, head: 1, eyes: 1, emblem: 1, cape: 0, hand: 0 }, welcomed: true } }, o));
const pill = (d) => (d.querySelector('.playtop .pill') || {}).textContent;
const sumA = (s) => Object.values(s.qs).reduce((n, r) => n + r.a, 0);
const dstr = (dt) => dt.getFullYear() + '-' + String(dt.getMonth() + 1).padStart(2, '0') + '-' + String(dt.getDate()).padStart(2, '0');
const DAY = 86400000;

// Arranca, abre el quiz y responde n preguntas; devuelve el entorno. Captura excepciones del arnés.
function play(raw, n, mode = 'wrong', opts) {
  const env = L.boot(raw, opts); env.exc = null;
  try { L.openQuiz(env.w, env.d); for (let k = 0; k < n; k++) { env.lastQ = L.answerOne(env.w, env.d, typeof mode === 'function' ? mode(k) : mode); if (k < n - 1) L.nextQ(env.w, env.d); } }
  catch (e) { env.exc = e.message; }
  return env;
}

(() => {
  const probe = L.boot(null); const ids = L.quizQs(probe.w).map((q) => q.id); probe.w.close();
  let e, s, s0;

  // ===== A. Entradas repetidas / fuera de orden =====
  // ATAQUE: triple clic en la misma opción (re-consultando el botón tras cada render) registra varias respuestas
  e = L.boot(base()); L.openQuiz(e.w, e.d);
  { const q = L.findQ(e.w, e.d), stale = L.optBtn(e.d, L.correctText(q));
    for (let i = 0; i < 3; i++) L.click(e.w, L.optBtn(e.d, L.correctText(q)) || stale);
    s = load(e.w);
    ok('A1 triple clic: una sola respuesta registrada', s.qs[q.id].a === 1 && s.topics[L.HK].length === 1 && s.xp === 10 * q.difficulty, JSON.stringify(s.qs[q.id]) + ' xp=' + s.xp); }
  ok('A1 sin errores', !e.errors.length, e.errors.join(' | ')); e.w.close();

  // ATAQUE: clic en una opción y luego en OTRA distinta (y en el botón viejo desconectado) cambia el resultado ya registrado
  e = L.boot(base()); L.openQuiz(e.w, e.d);
  { const q = L.findQ(e.w, e.d), all = [...e.d.querySelectorAll('.opt')];
    const right = L.optBtn(e.d, L.correctText(q));
    const wrong = all.find((b) => b !== right);
    L.click(e.w, wrong); L.click(e.w, L.optBtn(e.d, L.correctText(q))); L.click(e.w, right);
    s = load(e.w);
    ok('A2 fallo seguido de clic en la correcta: sigue contando como fallo', s.qs[q.id].a === 1 && s.qs[q.id].c === 0 && s.qs[q.id].q === true && s.xp === 0, JSON.stringify(s.qs[q.id]) + ' xp=' + s.xp); }
  e.w.close();

  // ATAQUE: teclas numéricas repetidas (1,1,2,3) en la misma pregunta
  e = L.boot(base()); L.openQuiz(e.w, e.d);
  { const q = L.findQ(e.w, e.d); ['1', '1', '2', '3'].forEach((k) => L.key(e.w, k)); s = load(e.w);
    ok('A3 teclas 1,1,2,3: una sola respuesta', s.qs[q.id].a === 1 && s.topics[L.HK].length === 1, JSON.stringify(s.qs[q.id])); }
  e.w.close();

  // ATAQUE: clic y tecla en el mismo tick
  e = L.boot(base()); L.openQuiz(e.w, e.d);
  { const q = L.findQ(e.w, e.d); L.click(e.w, e.d.querySelector('.opt')); L.key(e.w, '2'); s = load(e.w);
    ok('A4 clic + tecla simultáneos: una sola respuesta', s.qs[q.id].a === 1, JSON.stringify(s.qs[q.id])); }
  e.w.close();

  // ATAQUE: Enter x3 tras responder salta más de una pregunta
  e = L.boot(base()); L.openQuiz(e.w, e.d); L.answerOne(e.w, e.d, 'right');
  for (let i = 0; i < 3; i++) L.key(e.w, 'Enter');
  ok('A5 Enter x3 tras responder: avanza exactamente a 2/8', pill(e.d) === '2 / 8', pill(e.d));
  s = load(e.w); ok('A5 Enter x3 no crea respuestas', sumA(s) === 1, 'a total=' + sumA(s));
  e.w.close();

  // ATAQUE: Enter x3 sobre la última pregunta (finish() repetido: rondas/XP de integridad contados dos veces)
  e = L.boot(base({ stats: { learnTopics: [], cleared: 0, roundsNoPower: 0, bossFailed: {} } })); L.openQuiz(e.w, e.d);
  for (let k = 0; k < 8; k++) { L.answerOne(e.w, e.d, 'right'); if (k < 7) L.nextQ(e.w, e.d); }
  s0 = load(e.w);
  for (let i = 0; i < 3; i++) L.key(e.w, 'Enter');
  s = load(e.w);
  ok('A6 Enter x3 en la última: llega a resultados una vez (roundsNoPower +1)', !!e.d.querySelector('#xpc') && s.stats.roundsNoPower === 1, 'roundsNoPower=' + s.stats.roundsNoPower);
  ok('A6 #xpc = aumento de XP', Number(e.d.querySelector('#xpc').dataset.xp) === s.xp, e.d.querySelector('#xpc').dataset.xp + ' vs ' + s.xp);
  ok('A6 sin errores', !e.errors.length, e.errors.join(' | ')); e.w.close();

  // ATAQUE: doble clic en "Siguiente"
  e = L.boot(base()); L.openQuiz(e.w, e.d); L.answerOne(e.w, e.d, 'right');
  { const nb = e.d.querySelector('#nextbtn'); L.click(e.w, nb); L.click(e.w, nb); const nb2 = e.d.querySelector('#nextbtn'); if (nb2) L.click(e.w, nb2); }
  ok('A7 doble clic en Siguiente: queda en 2/8', pill(e.d) === '2 / 8', pill(e.d)); e.w.close();

  // ===== B. Salir y recargar a mitad de ronda =====
  // ATAQUE: Salir a mitad de ronda y seguir pulsando teclas (respuestas fantasma sobre la ronda abandonada)
  e = play(base(), 2, 'wrong');
  s0 = load(e.w);
  L.click(e.w, L.btn(e.d, 'quit'));
  ['1', '2', 'Enter', '3', 'Enter'].forEach((k) => L.key(e.w, k));
  s = load(e.w);
  ok('B1 Salir: vuelve al tema', !!L.btn(e.d, 'start'), e.d.querySelector('h1,h2') && e.d.querySelector('h1,h2').textContent);
  ok('B1 Salir + teclas: el estado no cambia', JSON.stringify(s) === JSON.stringify(s0));
  ok('B1 Salir conserva las 2 respuestas ya dadas', sumA(s) === 2 && s.topics[L.HK].length === 2, 'a=' + sumA(s));
  // nueva ronda tras salir
  try { L.click(e.w, L.btn(e.d, 'start', (b) => b.dataset.kind === 'quiz')); L.answerOne(e.w, e.d, 'right'); } catch (x) { e.errors.push('arnés: ' + x.message); }
  ok('B1 nueva ronda tras salir: empieza en 1/8 y registra', pill(e.d) === '1 / 8' && sumA(load(e.w)) === 3, pill(e.d));
  ok('B1 sin errores', !e.errors.length, e.errors.join(' | ')); e.w.close();

  // ATAQUE: Salir con la Regeneración pendiente (nivel 8) y luego teclear
  e = L.boot(base({ xp: 2000 })); L.openQuiz(e.w, e.d);
  { const q = L.findQ(e.w, e.d), ct = L.norm(L.correctText(q));
    L.click(e.w, [...e.d.querySelectorAll('.opt')].find((b) => L.norm(b.querySelector('span:last-child').textContent) !== ct));
    const pend = !!L.btn(e.d, 'regenno');
    L.click(e.w, L.btn(e.d, 'quit')); ['1', 'Enter'].forEach((k) => L.key(e.w, k));
    s = load(e.w) || {};
    ok('B2 Regeneración pendiente aparece', pend);
    ok('B2 Salir con Regeneración pendiente: no se registra nada', !s.qs || !s.qs[q.id], JSON.stringify(s.qs && s.qs[q.id])); }
  ok('B2 sin errores', !e.errors.length, e.errors.join(' | ')); e.w.close();

  // ATAQUE: recargar a mitad de ronda (cerrar y reabrir con el mismo localStorage)
  e = play(base(), 3, (k) => (k % 2 ? 'right' : 'wrong'));
  s0 = load(e.w); const raw = L.rawState(e.w); e.w.close();
  e = L.boot(raw);
  ok('B3 recarga: arranca sin errores', !e.errors.length, e.errors.join(' | '));
  ok('B3 recarga: el estado no cambia solo por arrancar', L.rawState(e.w) === raw);
  try { L.openQuiz(e.w, e.d); L.answerOne(e.w, e.d, 'wrong'); } catch (x) { e.errors.push('arnés: ' + x.message); }
  s = load(e.w);
  ok('B3 recarga + 1 respuesta: total a = 4, historial = 4', sumA(s) === 4 && s.topics[L.HK].length === 4, 'a=' + sumA(s));
  ok('B3 recarga: misma sesión (< 30 min)', s.session === s0.session, s0.session + ' -> ' + s.session);
  e.w.close();

  // ===== C. Reloj hostil =====
  // ATAQUE: reloj hacia atrás un día entre respuestas y luego de vuelta: la racha real se pierde
  { const clock = { ms: 0 }, y = new Date(Date.now() - DAY);
    e = L.boot(base({ days: { last: dstr(y), count: 5 } }), { clock }); L.openQuiz(e.w, e.d);
    L.answerOne(e.w, e.d, 'right'); L.nextQ(e.w, e.d); const c1 = load(e.w).days.count;
    clock.ms = -DAY; L.answerOne(e.w, e.d, 'right'); L.nextQ(e.w, e.d);
    clock.ms = 0; L.answerOne(e.w, e.d, 'right'); s = load(e.w);
    ok('C1 racha antes del salto = 6', c1 === 6, 'count=' + c1);
    ok('C1 reloj -1 día y de vuelta: la racha de 6 días se conserva', s.days.count >= 6, JSON.stringify(s.days));
    ok('C1 sin errores', !e.errors.length, e.errors.join(' | ')); e.w.close(); }

  // ATAQUE: reloj hacia adelante 1, 2, 3 días en la misma ronda (segundos reales): ¿racha y Constancia gratis?
  { const clock = { ms: 0 };
    e = L.boot(base(), { clock }); L.openQuiz(e.w, e.d);
    for (let k = 0; k < 3; k++) { clock.ms = k * DAY; L.answerOne(e.w, e.d, 'right'); L.nextQ(e.w, e.d); }
    s = load(e.w);
    ok('C2 reloj +1/+2 días: no hay NaN y la racha es un número', Number.isFinite(s.days.count) && Number.isFinite(s.session) && Number.isFinite(s.lastActive), JSON.stringify(s.days) + ' ses=' + s.session);
    e.w.close(); }

  // ATAQUE: reloj adelantado un año en una respuesta y corregido después; las sesiones deben seguir avanzando
  { const clock = { ms: 0 }, q0 = {};
    ids.forEach((id) => { q0[id] = { a: 1, c: 0, q: true, g: 0, gs: -1 }; });
    e = L.boot(base({ qs: q0 }), { clock }); L.openQuiz(e.w, e.d);
    clock.ms = 365 * DAY; L.answerOne(e.w, e.d, 'right'); L.nextQ(e.w, e.d); const ses1 = load(e.w).session;
    clock.ms = 31 * 60000; L.answerOne(e.w, e.d, 'right'); L.nextQ(e.w, e.d);
    clock.ms = 62 * 60000; L.answerOne(e.w, e.d, 'right'); s = load(e.w);
    ok('C3 reloj +1 año y corregido: lastActive no queda en el futuro', s.lastActive <= Date.now() + 62 * 60000 + 1000, String(s.lastActive));
    ok('C3 reloj corregido: la sesión avanza tras 31 min reales', s.session > ses1, ses1 + ' -> ' + s.session);
    e.w.close(); }

  // ATAQUE: reloj 2 h hacia atrás entre respuestas (diferencia negativa): no debe abrir sesión ni romper números
  { const clock = { ms: 0 };
    e = L.boot(base({ lastActive: Date.now() - 60000, session: 4 }), { clock }); L.openQuiz(e.w, e.d);
    L.answerOne(e.w, e.d, 'wrong'); L.nextQ(e.w, e.d); clock.ms = -2 * 3600000; L.answerOne(e.w, e.d, 'wrong'); s = load(e.w);
    ok('C4 reloj -2 h: sin sesión nueva ni NaN', s.session === 4 && Number.isFinite(s.lastActive), 'ses=' + s.session);
    e.w.close(); }

  // ===== D. Almacenamiento hostil =====
  // ATAQUE: localStorage lleno (QuotaExceededError): el progreso se pierde en silencio, sin avisar al usuario
  e = L.boot(base(), { storage: 'full' }); e.w.__full = true;
  try { L.openQuiz(e.w, e.d); L.answerOne(e.w, e.d, 'wrong'); } catch (x) { e.errors.push('arnés: ' + x.message); }
  ok('D1 almacenamiento lleno: sin excepción no controlada', !e.errors.length, e.errors.join(' | '));
  { const warned = [...e.d.querySelectorAll('[role=alert],[role=status],.banner,.toast,.warn')].some((x) => /guard|almacen|espacio|no se pudo/i.test(x.textContent)); const kept = (load(e.w).topics || {})[L.HK];
    ok('D1 almacenamiento lleno: el progreso persiste o se avisa al usuario', !!kept || warned, 'guardado=' + JSON.stringify(kept) + ' aviso=' + warned); }
  e.w.close();

  // ===== R. Regresiones del fuzzing (estado mínimo exacto) =====
  const reg = (name, raw, n, check) => {
    const env = play(raw, n, 'wrong'); if (check) check.q = env.lastQ;
    let saved = null; try { saved = JSON.parse(L.rawState(env.w)); } catch (x) {}
    ok(name, !env.exc && !env.errors.length && (!check || check(saved)), (env.exc ? 'arnés: ' + env.exc + ' | ' : '') + env.errors.join(' | ') + (check && saved ? ' guardado=' + JSON.stringify(check.show ? check.show(saved) : '').slice(0, 160) : ''));
    env.w.close();
  };
  const show = (f, g) => { f.show = g; return f; };
  // ATAQUE: historial no-arreglo de longitud >= 6 o sin length → h.reduce no es función al pintar el inicio (juego inservible)
  reg('R1 topics[HK] = {} no rompe el arranque', '{"v":1,"topics":{"M08:T04":{}}}', 1);
  reg('R1b topics[HK] = "abcdef" no rompe el arranque', '{"v":1,"topics":{"M08:T04":"abcdef"}}', 1);
  // ATAQUE: days = null → TypeError al leer days.last en el arranque
  reg('R2 days = null no rompe el arranque', '{"v":1,"days":null}', 1);
  // ATAQUE: days primitivo → TypeError al escribir days.count en touch() (la respuesta se queda a medias)
  reg('R3 days = 0 no rompe la respuesta', '{"v":1,"days":0}', 1);
  // ATAQUE: topics primitivo → TypeError en finalize después de sumar XP (no se guarda, UI congelada)
  reg('R4 topics = 5 no rompe la respuesta', '{"v":1,"topics":5}', 1);
  // ATAQUE: qs primitivo → TypeError en finalize
  reg('R5 qs = true no rompe la respuesta', '{"v":1,"qs":true}', 1);
  // ATAQUE: un registro de qs = null → queue() lee .q de null al pintar el inicio
  reg('R6 qs = {"X": null} no rompe el arranque', '{"v":1,"qs":{"X":null}}', 1);
  // ATAQUE: registro de pregunta primitivo → "Cannot create property 'a' on number"
  { const q5 = {}; ids.forEach((id) => { q5[id] = 5; });
    reg('R7 qs[id] = 5 no rompe la respuesta', JSON.stringify({ v: 1, qs: q5 }), 1); }
  // ATAQUE: boss[M08] = null → anyBossPassed lee .passed de null en checkVirtues
  reg('R8 boss = {"M08": null} no rompe la respuesta', '{"v":1,"boss":{"M08":null}}', 1);
  // ATAQUE: xp como texto → S.xp += gain concatena ("5" → "510")
  { const env = play('{"v":1,"xp":"5"}', 1, 'right'); const sx = load(env.w).xp;
    ok('R9 xp = "5": tras un acierto xp es número', typeof sx === 'number', 'xp guardado=' + JSON.stringify(sx)); env.w.close(); }
  // ATAQUE: topics/qs/days como arreglo → las claves con nombre se pierden en JSON.stringify (pérdida silenciosa)
  reg('R10 topics = [] conserva el historial guardado', '{"v":1,"topics":[]}', 1, show((sv) => Array.isArray(sv.topics[L.HK]), (sv) => sv.topics));
  reg('R11 qs = [] conserva la pregunta fallada en la cola', '{"v":1,"qs":[]}', 1, show((sv) => Object.keys(sv.qs).length === 1, (sv) => sv.qs));
  reg('R12 days = [] conserva la racha', '{"v":1,"days":[]}', 1, show((sv) => typeof sv.days.count === 'number', (sv) => sv.days));
  // ATAQUE: session no numérica → NaN (se guarda como null) y la graduación compara contra NaN
  reg('R13 session = "x" queda numérica', '{"v":1,"session":"x"}', 1, show((sv) => Number.isFinite(sv.session), (sv) => sv.session));
  // ATAQUE: registro con a/c no numéricos → a = NaN (null) y a >= c deja de cumplirse
  { const qx = {}; ids.forEach((id) => { qx[id] = { a: 'x', c: 1, q: true, g: 0, gs: -1 }; });
    reg('R14 qs[id] = {a:"x", c:1}: tras responder a >= c', JSON.stringify({ v: 1, qs: qx }), 1, (() => { const f = show((sv) => { const r = sv.qs[f.q.id]; return typeof r.a === 'number' && r.a >= r.c; }, (sv) => sv.qs[f.q.id]); return f; })()); }
  // ATAQUE: historial heredado con valores fuera de [0,1] → promedio > 1, estrellas regaladas
  reg('R15 topics[HK] = [9,9,9,9,9]: valores fuera de rango no sobreviven', '{"v":1,"topics":{"M08:T04":[9,9,9,9,9]}}', 1, show((sv) => sv.topics[L.HK].every((x) => x >= 0 && x <= 1), (sv) => sv.topics[L.HK]));
  // ATAQUE: color de pelo hostil en hero.look.hc → inyección de HTML en el SVG del avatar (sin escapar)
  { const env = L.boot('{"v":1,"hero":{"name":"Z","look":{"hc":"\\"/><img id=pwn src=x onerror=alert(1)>"},"welcomed":true}}');
    ok('R16 hero.look.hc hostil no inyecta HTML', !env.d.getElementById('pwn'), env.d.getElementById('pwn') ? 'se creó <img id=pwn onerror>' : ''); env.w.close(); }

  results.forEach(([st, n, x]) => console.log(st + '  ' + n + (st === 'FAIL' && x ? '  -> ' + x : '')));
  const f = results.filter((r) => r[0] === 'FAIL').length;
  console.log(`\n${results.length - f} PASS / ${f} FAIL`);
  process.exitCode = f ? 1 : 0;
})();
