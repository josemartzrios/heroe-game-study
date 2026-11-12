// city/world2d.js con canvas y contexto 2D falsos: contrato de §3.1, presupuesto de §3.2 y prohibiciones por cuadro.
const results = [];
const ok = (name, cond, extra) => { results.push([cond ? 'PASS' : 'FAIL', name, extra || '']); };

(async () => {
  const D = (await import('../city/districts.mjs')).city;
  const SP = require('../city/sprites2d.js');
  const W = require('../city/world2d.js');
  const M = D.districts.M02;

  function fakes(over = {}) {
    const f = { pend: new Map(), nextId: 1, maxPend: 0, rafCalls: 0, listeners: {}, bad: [], draws: [], rects: [], order: [], maps: [], created: 0, ctxNull: !!over.ctxNull };
    f.raf = (cb) => { f.rafCalls++; const id = f.nextId++; f.pend.set(id, cb); f.maxPend = Math.max(f.maxPend, f.pend.size); return id; };
    f.caf = (id) => { f.pend.delete(id); };
    f.run = (ts) => { const [id, cb] = [...f.pend][0]; f.pend.delete(id); cb(ts); };
    const mkCtx = (cv) => new Proxy({ canvas: cv, fillStyle: '#000' }, {
      get(t, k) {
        if (k in t) return t[k];
        if (k === 'drawImage') return (img, ...a) => { f.draws.push({ cv, img, a }); };
        if (k === 'fillRect') return (x, y, w, h) => { f.rects.push({ cv, x, y, w, h, c: t.fillStyle }); };
        return () => {};
      },
      set(t, k, v) { if (k === 'shadowBlur' || k === 'filter' || (k === 'globalCompositeOperation' && v !== 'source-over')) f.bad.push(k + '=' + v); t[k] = v; return true; },
    });
    const mkCanvas = (isMap) => { const cv = { width: 0, height: 0, getContext() { return f.ctxNull ? null : (cv.__c || (cv.__c = mkCtx(cv))); } }; if (isMap) f.maps.push(cv); return cv; };
    f.doc = { createElement: () => { f.created++; return mkCanvas(true); } };
    f.canvas = Object.assign(mkCanvas(false), { clientWidth: 390, clientHeight: 844, parentNode: null,
      addEventListener(t, fn) { f.listeners[t] = fn; }, removeEventListener(t) { delete f.listeners[t]; } });
    f.state = { hero: { x: 0, z: 8, face: 'up', speed: 0 }, zoom: 1, flags: { beatenToday: {}, repairs: {}, apprenticesVisible: {}, stars: {}, restored: false, lit: 0 } };
    f.ticks = 0;
    f.opts = Object.assign({ doc: f.doc, raf: f.raf, caf: f.caf, pixelRatio: 3, search: '', reducedMotion: false,
      tick: () => { f.ticks++; f.order.push('tick'); }, state: () => { f.order.push('state'); return f.state; } }, over.opts || {});
    return f;
  }
  const mapDraws = (f) => f.draws.filter((d) => d.cv === f.canvas);
  const idxOf = (list, v) => list.indexOf(v);
  const sprDraws = (f, kind, variant) => { const fr = SP.frame(kind, variant, 'down', 0); return mapDraws(f).filter((d) => d.img === fr.img && d.a[1] === fr.sy); };

  { const f = fakes(); SP.init(f.doc);
    const api = await W.create(f.canvas, D, f.opts);
    ok('(a) el mapa mide 140×8 por 235×8 px, ≤ 4 Mpx, y se prerenderiza una vez por create', f.maps.some((m) => m.width === 1120 && m.height === 1880 && m.width * m.height <= 4e6));
    ok('(b) create resuelve con el contrato y deja 1 rAF', ['resize', 'setPaused', 'dispose', 'encounter', 'dissolve'].every((k) => typeof api[k] === 'function') && f.pend.size === 1 && api.setLook === undefined);
    f.run(100); f.run(116);
    ok('(b2) un cuadro llama tick, luego state, luego dibuja', f.order.slice(0, 2).join() === 'tick,state' && mapDraws(f).length > 0, f.order.join());
    ok('(b3) nunca más de 1 rAF pendiente', f.maxPend === 1);
    api.setPaused('sheet', true); if (f.pend.size) f.run(200);
    const r0 = f.rafCalls;
    ok('(c) en pausa no se agendan cuadros', f.pend.size === 0);
    api.setPaused('sheet', false);
    ok('(c2) al reanudar vuelve a haber 1 rAF', f.pend.size === 1 && f.rafCalls === r0 + 1);
    f.run(300);
    ok('(d) pixelRatio 3 se limita a 1.5: canvas 585×1266', f.canvas.width === Math.round(390 * 1.5) && f.canvas.height === Math.round(844 * 1.5), f.canvas.width + '×' + f.canvas.height);
    const w0 = f.canvas.width; api.setPaused('suspended', true); f.canvas.clientWidth = 100; api.resize();
    ok('(d2) resize con la ciudad suspendida no cambia el canvas', f.canvas.width === w0);
    api.setPaused('suspended', false); f.canvas.clientWidth = 0; f.canvas.clientHeight = 0; api.resize();
    ok('(d3) resize con canvas 0×0 no cambia el canvas', f.canvas.width === w0);
    // encuadre (Foco de revisión 2)
    f.canvas.clientWidth = 390; f.canvas.clientHeight = 844; api.resize(); f.draws.length = 0; if (!f.pend.size) api.setPaused('x', true), api.setPaused('x', false); f.run(400);
    const hero = SP.frame('hero', '', 'up', 0), hd = mapDraws(f).filter((d) => d.img === hero.img).pop();
    const feet = hd.a[5] + hd.a[7] * 0.9;
    ok('(e) en vertical el héroe queda al 55 % de la altura', Math.abs(feet - 0.55 * f.canvas.height) < 2, feet + ' vs ' + 0.55 * f.canvas.height);
    f.canvas.clientWidth = 1280; f.canvas.clientHeight = 800; api.resize(); f.draws.length = 0; if (!f.pend.size) api.setPaused('x', true), api.setPaused('x', false); f.run(500);
    const hd2 = mapDraws(f).filter((d) => d.img === hero.img).pop();
    ok('(e2) tras girar a horizontal, al 50 %', Math.abs((hd2.a[5] + hd2.a[7] * 0.9) - 0.5 * f.canvas.height) < 2);
    // solo NPC en pantalla
    f.canvas.clientWidth = 390; f.canvas.clientHeight = 844; api.resize(); f.draws.length = 0; if (!f.pend.size) api.setPaused('x', true), api.setPaused('x', false); f.run(600);
    ok('(f) en la plaza no se dibuja ninguna criatura del distrito pero sí Iris', M.creatures.every((c) => sprDraws(f, 'creature', c.id).length === 0) && sprDraws(f, 'person', 'iris').length === 1);
    const bit = M.creatures[0].area; f.state.hero.x = bit.x; f.state.hero.z = bit.z; f.draws.length = 0; if (!f.pend.size) api.setPaused('x', true), api.setPaused('x', false); f.run(700);
    ok('(f2) junto a bit sí se dibuja bit', sprDraws(f, 'creature', 'bit').length === 1);
    f.state.flags = Object.assign({}, f.state.flags, { beatenToday: { bit: 1 } }); f.draws.length = 0; if (!f.pend.size) api.setPaused('x', true), api.setPaused('x', false); f.run(800);
    ok('(g) beatenToday.bit oculta a bit', sprDraws(f, 'creature', 'bit').length === 0);
    const a01 = M.apprentices[0]; f.state.hero.x = a01.x; f.state.hero.z = a01.z; f.draws.length = 0; if (!f.pend.size) api.setPaused('x', true), api.setPaused('x', false); f.run(900);
    const hid = sprDraws(f, 'person', 'a01').length;
    f.state.flags = Object.assign({}, f.state.flags, { apprenticesVisible: { a01: 1 } }); f.draws.length = 0; if (!f.pend.size) api.setPaused('x', true), api.setPaused('x', false); f.run(1000);
    ok('(g2) apprenticesVisible.a01 muestra a a01', hid === 0 && sprDraws(f, 'person', 'a01').length === 1);
    // restauración
    f.state.hero.x = M.bridge.x; f.state.hero.z = M.bridge.z + 6; f.rects.length = 0; if (!f.pend.size) api.setPaused('x', true), api.setPaused('x', false); f.run(1100);
    const fog0 = f.rects.some((r) => r.c === 'rgba(176,108,255,0.08)'), pl0 = f.rects.some((r) => r.c === '#c4a46b');
    f.state.flags = Object.assign({}, f.state.flags, { restored: true }); f.rects.length = 0; if (!f.pend.size) api.setPaused('x', true), api.setPaused('x', false); f.run(1200);
    ok('(g3) restored: sin neblina y con puente construido', fog0 && !pl0 && !f.rects.some((r) => r.c === 'rgba(176,108,255,0.08)') && f.rects.some((r) => r.c === '#c4a46b'), [fog0, pl0].join());
    // partículas
    let maxPart = 0; for (let i = 0; i < 300; i++) { api.dissolve(M.creatures[i % 6].id); if (!f.pend.size) api.setPaused('x', true), api.setPaused('x', false); f.run(2000 + i * 16); maxPart = Math.max(maxPart, api.stats().part); }
    ok('(h) nunca más de 200 partículas vivas', maxPart > 0 && maxPart <= 200, String(maxPart));
    ok('(i) nunca shadowBlur, filter ni composite distinto de source-over', f.bad.length === 0, f.bad.slice(0, 3).join());
    // encounter y dispose
    let resolved = false; const enc = api.encounter('bit').then(() => { resolved = true; });
    const wasMap = f.maps[0];
    api.dispose(); await enc;
    ok('(j) dispose resuelve el encounter pendiente', resolved);
    ok('(j2) dispose deja el mapa en 0×0, sin rAF, y es idempotente', wasMap.width === 0 && wasMap.height === 0 && f.pend.size === 0 && (api.dispose(), true));
    const r1 = f.rafCalls; api.setPaused('a', true); api.setPaused('a', false); api.resize(); api.dissolve('bit');
    ok('(j3) tras dispose nada agenda cuadros', f.rafCalls === r1 && f.pend.size === 0);
  }
  { const f = fakes({ ctxNull: true }); SP.init(f.doc);
    const r = await W.create(f.canvas, D, f.opts).then(() => 'ok', (e) => e.message);
    ok('(k) getContext nulo → create rechaza "sin-2d"', r === 'sin-2d', r); }
  { const f = fakes(); SP.init(f.doc); let lost = 0; f.opts.onLost = () => { lost++; };
    const api = await W.create(f.canvas, D, f.opts); f.listeners.contextlost && f.listeners.contextlost({});
    ok('(k2) contextlost llama a onLost y dispose lo quita', lost === 1 && (api.dispose(), !f.listeners.contextlost)); }
  { const f = fakes({ opts: { reducedMotion: true } }); SP.init(f.doc);
    const api = await W.create(f.canvas, D, f.opts); let done = false;
    api.encounter('bit').then(() => { done = true; }); await Promise.resolve(); await Promise.resolve();
    api.dissolve('bit'); if (f.pend.size) f.run(100);
    ok('(l) movimiento reducido: encounter resuelve al instante y dissolve no crea partículas', done && api.stats().part === 0);
    api.dispose(); }
  { const f = fakes(); SP.init(f.doc); f.opts.search = '?fps=1';
    const parent = { kids: [], appendChild(e) { this.kids.push(e); e.parentNode = this; }, removeChild(e) { this.kids = this.kids.filter((x) => x !== e); } };
    f.canvas.parentNode = parent; global.document = { createElement: () => ({ style: {}, id: '' }) };
    const api = await W.create(f.canvas, D, f.opts); for (let i = 0; i < 40; i++) { if (!f.pend.size) break; f.run(100 + i * 17); }
    const txt = parent.kids[0] && parent.kids[0].textContent;
    ok('(m) ?fps=1: div con solo números y las palabras permitidas; dispose lo quita', !!txt && /^[0-9.·\sfpsp95ticknodibujomartnpmsfpsms]+$/i.test(txt) && /fps/.test(txt) && (api.dispose(), parent.kids.length === 0), txt);
    delete global.document; }
  results.forEach((r) => { if (r[0] === 'FAIL') console.log(r.join(' | ')); });
  const fails = results.filter((r) => r[0] === 'FAIL').length;
  console.log(fails ? fails + ' FALLOS' : 'CITY_WORLD2D OK (' + results.length + ')'); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
