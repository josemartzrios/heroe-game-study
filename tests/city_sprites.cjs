// city/sprites2d.js: atlas de pixel art (un canvas por tipo), cuadros por dirección y paso, e iconos del héroe.
const results = [];
const ok = (name, cond, extra) => { results.push([cond ? 'PASS' : 'FAIL', name, extra || '']); };

function fakeEnv() {
  const env = { created: 0, fills: [], bad: [], rects: [], draws: [] };
  const mkCtx = (cv) => new Proxy({ canvas: cv }, {
    get(t, k) {
      if (k in t) return t[k];
      if (k === 'fillRect') return (x, y, w, h) => { env.rects.push([cv, x, y, w, h, t.fillStyle]); };
      if (k === 'drawImage') return (...a) => { env.draws.push([cv, ...a]); };
      return () => {};
    },
    set(t, k, v) {
      if (k === 'shadowBlur' || k === 'filter') env.bad.push(k);
      if (k === 'fillStyle') env.fills.push(v);
      t[k] = v; return true;
    },
  });
  const mkCanvas = () => { const cv = { width: 0, height: 0, getContext() { return cv.__ctx || (cv.__ctx = mkCtx(cv)); } }; return cv; };
  env.doc = { createElement(tag) { if (tag === 'canvas') env.created++; return mkCanvas(); } };
  env.mkCanvas = mkCanvas;
  return env;
}

const S = require('../city/sprites2d.js');
(async () => {
const D = (await import('../city/districts.mjs')).city;
S.setData(D);
const MIDS = Object.keys(D.districts);
{ const env = fakeEnv(); S.init(env.doc);
  const faces = ['up', 'down', 'left', 'right'], seen = new Set(); let img0 = null, same = true;
  faces.forEach((f) => [0, 1].forEach((s) => { const r = S.frame('hero', '', f, s); if (img0 === null) img0 = r.img; same = same && r.img === img0 && r.w === 14 && r.h === 14; seen.add(r.sx + ',' + r.sy); }));
  ok('hero: 4 caras × 2 pasos dan 8 rectángulos distintos del mismo atlas de 14×14', seen.size === 8 && same, seen.size + ' ' + same);
  for (let i = 0; i < 50; i++) S.frame('person', S.kinds.person[i % S.kinds.person.length], faces[i % 4], i % 2);
  ok('50 cuadros de person crean 1 solo canvas para ese tipo (más 1 del héroe)', env.created === 2, String(env.created));
  S.frame('creature', 'M02:bit', 'down', 0); S.frame('thing', 'lamp', 'down', 0);
  ok('los 4 tipos crean en total 4 atlas', env.created === 4, String(env.created));
  const a = S.frame('person', 'zz', 'down', 0), b = S.frame('person', S.kinds.person[0], 'down', 0);
  ok('un variant desconocido usa el primero del tipo', a.sx === b.sx && a.sy === b.sy);
  ok('las 11 criaturas (6 de M02 y 5 de M08) ocupan celdas distintas y se llaman mid:id', new Set(S.kinds.creature.map((id) => { const r = S.frame('creature', id, 'down', 0); return r.sx + ',' + r.sy; })).size === 11 && S.kinds.creature.length === 11 && S.kinds.creature[0] === 'M02:bit' && S.kinds.creature[6] === 'M08:ruido', S.kinds.creature.join(','));
  ok('hay 60 variantes de persona: Iris, 23+12 de M02 y 15+9 de M08, con la forma mid:id', S.kinds.person.length === 60 && S.kinds.person[0] === 'iris' && S.kinds.person[1] === 'M02:m01' && S.kinds.person[24] === 'M02:a01' && S.kinds.person[36] === 'M08:m01' && S.kinds.person[51] === 'M08:a01', S.kinds.person.length + ' ' + S.kinds.person.slice(0, 3).join(','));
  ok('el mismo id en dos distritos (m01) tiene celdas distintas', (() => { const a = S.frame('person', 'M02:m01', 'down', 0), b = S.frame('person', 'M08:m01', 'down', 0); return a.sy !== b.sy; })());
  ok('setData con los mismos datos no reconstruye (los atlas ya creados siguen valiendo) y con otros datos los descarta', (() => { const r1 = S.frame('person', 'M02:m01', 'down', 0); S.setData(D); const r2 = S.frame('person', 'M02:m01', 'down', 0); const D2 = { districts: { X1: { mentors: [{ id: 'm01' }], apprentices: [], creatures: [{ id: 'c1' }] } } }; S.setData(D2); const ok1 = S.kinds.person.join() === 'iris,X1:m01' && S.kinds.creature.join() === 'X1:c1'; S.setData(D); return r1.img === r2.img && ok1 && S.kinds.person.length === 60; })());
  ok('todos los fillStyle son hex o rgba válidos', env.fills.length > 100 && env.fills.every((c) => /^#[0-9a-f]{6}$/i.test(c) || /^rgba\(/.test(c)), env.fills.filter((c) => !/^#[0-9a-f]{6}$/i.test(c)).slice(0, 3).join());
  ok('sin shadowBlur ni filter', env.bad.length === 0);
  ok('step y face fuera de rango no lanzan', (() => { try { S.frame('hero', '', 'zz', 9); S.frame('nada', 'x', 'up', -1); return true; } catch (e) { return false; } })());
  ok('persona de frente y de espalda se dibujan distintas', (() => { const f = S.frame('person', 'M02:m01', 'down', 0), u = S.frame('person', 'M02:m01', 'up', 0); return f.sx !== u.sx || f.sy !== u.sy; })());
  // paintIcons: los 4 tipos (hero, mentor, creature, apprentice) con getAttribute('data-spr')
  const kinds4 = ['hero', 'mentor', 'creature', 'apprentice', 'desconocido'];
  const cvs = kinds4.map((k) => { const c = env.mkCanvas(); c.width = 28; c.height = 28; c.getAttribute = (n) => (n === 'data-spr' ? k : null); return c; });
  const root = { querySelectorAll(sel) { return sel === 'canvas[data-spr]' ? cvs : []; } };
  const d0 = env.draws.length; S.paintIcons(root);
  const drawn = env.draws.slice(d0);
  ok('paintIcons dibuja los 4 tipos con drawImage y deja vacío uno desconocido', drawn.length === 4 && [0, 1, 2, 3].every((i) => drawn.some((d) => d[0] === cvs[i])) && !drawn.some((d) => d[0] === cvs[4]), String(drawn.length));
  ok('paintIcons: mentor y aprendiz usan la fila de persona (primer mentor y primer aprendiz de M02) y la criatura la primera criatura', (() => {
    const m = S.frame('person', 'M02:m01', 'down', 0), a = S.frame('person', 'M02:a01', 'down', 0), c = S.frame('creature', 'M02:bit', 'down', 0);
    const at = (cv) => drawn.find((d) => d[0] === cv);
    return at(cvs[1])[3] === m.sy && at(cvs[3])[3] === a.sy && at(cvs[2])[3] === c.sy && at(cvs[2])[1] === c.img;
  })());
  const nul = { width: 28, height: 28, getContext() { return null; } };
  ok('paintIcons con getContext nulo no lanza', (() => { try { S.paintIcons({ querySelectorAll() { return [nul]; } }); S.paintIcons(null); return true; } catch (e) { return false; } })());
}
{ const env = fakeEnv(); env.doc.createElement = () => ({ width: 0, height: 0, getContext() { return null; } }); S.init(env.doc);
  let thrown = null; try { S.frame('hero', '', 'up', 0); } catch (e) { thrown = e; }
  ok('sin contexto 2D frame() lanza "sin-2d" y no deja un atlas roto en caché', !!thrown && thrown.message === 'sin-2d', String(thrown));
  const ok2 = fakeEnv(); S.init(ok2.doc);
  ok('tras inicializar con un documento sano ya funciona (no quedó nada en caché)', S.frame('hero', '', 'up', 0).w === 14);
  const c1 = { width: 28, height: 28, getContext() { return { clearRect() {}, drawImage() {} }; } }, thrower = fakeEnv(); thrower.doc.createElement = () => ({ width: 0, height: 0, getContext() { return null; } }); S.init(thrower.doc);
  ok('paintIcons con atlas imposible no lanza (las pantallas siguen funcionando)', (() => { try { S.paintIcons({ querySelectorAll() { return [c1]; } }); return true; } catch (e) { return false; } })()); }
results.forEach((r) => { if (r[0] === 'FAIL') console.log(r.join(' | ')); });
const fails = results.filter((r) => r[0] === 'FAIL').length;
console.log(fails ? fails + ' FALLOS' : 'CITY_SPRITES OK (' + results.length + ')'); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('EXCEPCIÓN', e && e.stack); process.exit(2); });
