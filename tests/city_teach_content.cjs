// Contenido real contra las reglas de CityTeach: para cada aprendiz de los 10 distritos, el tema se puede enseñar escribiendo.
//   explain: >= min(3, n) puntos con términos válidos; vacío, basura y un texto genérico de informática no llegan al aprobado premarcado;
//   correct: cada error del tema tiene términos, su versión correcta + explicación se detecta y la frase equivocada no.
const path = require('path');
const { pathToFileURL } = require('url');
const results = [];
const ok = (name, cond, extra) => { results.push([cond ? 'PASS' : 'FAIL', name, extra || '']); };
const imp = (rel) => import(pathToFileURL(path.join(__dirname, '..', rel)).href);
const GENERIC = 'En este ejemplo el sistema guarda los datos del usuario y forma parte del programa principal que la aplicacion puede leer escribir y ejecutar cada dia sin problemas en la red de la empresa';

(async () => {
  const T = require('../city/teach.js');
  const { expandModule } = await imp('content_expand.mjs');
  const { city } = await imp('city/districts.mjs');
  const mods = {};
  for (let i = 1; i <= 10; i++) { const id = 'M' + String(i).padStart(2, '0'); mods[id] = expandModule(id, id, await imp(i === 1 ? 'content.mjs' : `content_m${String(i).padStart(2, '0')}.mjs`)); }

  let apprentices = 0; const bad = [], say = (s) => bad.push(s);
  for (const d of Object.values(city.districts)) for (const a of d.apprentices) {
    apprentices++;
    const mod = mods[d.id], topic = mod.topics.find((t) => t.id === a.topic), tag = d.id + '/' + a.topic;
    if (a.mode === 'explain') {
      const kps = topic.keyPoints, need = Math.min(3, kps.length);
      const withTerms = kps.filter((kp) => T.keyTerms(kp).length).length;
      if (withTerms < need) say(`${tag}: ${withTerms}/${kps.length} puntos con términos, hacen falta ${need}`);
      if (T.explainCheck('', kps).some(Boolean)) say(`${tag}: el texto vacío premarca`);
      if (T.explainCheck('patata cosa nada '.repeat(5), kps).some(Boolean)) say(`${tag}: la basura premarca`);
      const gen = T.explainCheck(GENERIC, kps).filter(Boolean).length;
      if (gen >= need || gen > 1) say(`${tag}: un texto genérico premarca ${gen} puntos`);
      kps.forEach((kp, i) => { if (T.keyTerms(kp).length && !T.explainCheck(kp.replace(/\*\*/g, ''), kps)[i]) say(`${tag} p${i + 1}: su propio texto no lo detecta`); });
    } else {
      const errs = mod.questions.filter((q) => q.type === 'error' && q.topic === a.topic);
      if (!errs.length) say(`${tag}: no tiene preguntas error`);
      errs.forEach((q) => {
        const it = T.fixItem(q);
        if (!it) { say(`${q.id}: fixItem da null`); return; }
        if (!T.fixTerms(it).length) say(`${q.id}: sin términos (${it.right} / ${it.explanation})`);
        else {
          if (!T.fixCheck(it.right + ' ' + it.explanation, it).detected) say(`${q.id}: su versión correcta no se detecta`);
          if (T.fixCheck(it.wrong, it).detected) say(`${q.id}: la frase equivocada se detecta`);
        }
      });
    }
  }
  ok('hay 101 aprendices en los 10 distritos (el literal vigila que no falte ni sobre ninguno)', apprentices === 101 && Object.keys(city.districts).length === 10, apprentices + ' en ' + Object.keys(city.districts).length);
  ok('cada distrito tiene al menos tantos aprendices como pide para restaurarse (need)', Object.values(city.districts).every((d) => d.apprentices.length >= d.need), Object.values(city.districts).map((d) => d.id + ':' + d.apprentices.length + '/' + d.need).join(' '));
  ok('todos los aprendices se pueden enseñar escribiendo (0 fallos)', bad.length === 0, bad.length + ' fallos:\n  ' + bad.slice(0, 40).join('\n  '));

  results.forEach((r) => console.log(r.join(' | ')));
  const fails = results.filter((r) => r[0] === 'FAIL').length;
  console.log(fails ? `\n${fails} FALLOS` : '\nCITY_TEACH_CONTENT OK (' + results.length + ' comprobaciones)');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('EXCEPCIÓN', e && e.stack); results.forEach((r) => console.log(r.join(' | '))); process.exit(2); });
