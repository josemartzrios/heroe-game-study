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
const D = null;
{ const env = fakeEnv(); S.init(env.doc);
  const faces = ['up', 'down', 'left', 'right'], seen = new Set(); let img0 = null, same = true;
  faces.forEach((f) => [0, 1].forEach((s) => { const r = S.frame('hero', '', f, s); if (img0 === null) img0 = r.img; same = same && r.img === img0 && r.w === 14 && r.h === 14; seen.add(r.sx + ',' + r.sy); }));
  ok('hero: 4 caras × 2 pasos dan 8 rectángulos distintos del mismo atlas de 14×14', seen.size === 8 && same, seen.size + ' ' + same);
  for (let i = 0; i < 50; i++) S.frame('person', S.kinds.person[i % S.kinds.person.length], faces[i % 4], i % 2);
  ok('50 cuadros de person crean 1 solo canvas para ese tipo (más 1 del héroe)', env.created === 2, String(env.created));
  S.frame('creature', 'bit', 'down', 0); S.frame('thing', 'lamp', 'down', 0);
  ok('los 4 tipos crean en total 4 atlas', env.created === 4, String(env.created));
  const a = S.frame('person', 'zz', 'down', 0), b = S.frame('person', S.kinds.person[0], 'down', 0);
  ok('un variant desconocido usa el primero del tipo', a.sx === b.sx && a.sy === b.sy);
  ok('las 6 criaturas ocupan celdas distintas', new Set(S.kinds.creature.map((id) => { const r = S.frame('creature', id, 'down', 0); return r.sx + ',' + r.sy; })).size === 6);
  ok('hay 36 variantes de persona (Iris, 23 mentores, 12 aprendices)', S.kinds.person.length === 36 && S.kinds.person[0] === 'iris');
  ok('todos los fillStyle son hex o rgba válidos', env.fills.length > 100 && env.fills.every((c) => /^#[0-9a-f]{6}$/i.test(c) || /^rgba\(/.test(c)), env.fills.filter((c) => !/^#[0-9a-f]{6}$/i.test(c)).slice(0, 3).join());
  ok('sin shadowBlur ni filter', env.bad.length === 0);
  ok('step y face fuera de rango no lanzan', (() => { try { S.frame('hero', '', 'zz', 9); S.frame('nada', 'x', 'up', -1); return true; } catch (e) { return false; } })());
  ok('persona de frente y de espalda se dibujan distintas', (() => { const f = S.frame('person', 'm01', 'down', 0), u = S.frame('person', 'm01', 'up', 0); return f.sx !== u.sx || f.sy !== u.sy; })());
  // paintIcons
  const cvs = [env.mkCanvas(), env.mkCanvas(), env.mkCanvas()]; cvs.forEach((c) => { c.width = 28; c.height = 28; });
  const root = { querySelectorAll(sel) { return sel === 'canvas[data-spr="hero"]' ? cvs : []; } };
  const d0 = env.draws.length; S.paintIcons(root);
  ok('paintIcons dibuja 3 iconos con drawImage', env.draws.length - d0 === 3);
  const nul = { width: 28, height: 28, getContext() { return null; } };
  ok('paintIcons con getContext nulo no lanza', (() => { try { S.paintIcons({ querySelectorAll() { return [nul]; } }); S.paintIcons(null); return true; } catch (e) { return false; } })());
}
results.forEach((r) => { if (r[0] === 'FAIL') console.log(r.join(' | ')); });
const fails = results.filter((r) => r[0] === 'FAIL').length;
console.log(fails ? fails + ' FALLOS' : 'CITY_SPRITES OK (' + results.length + ')'); process.exit(fails ? 1 : 0);
