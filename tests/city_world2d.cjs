// city/world2d.js con canvas y contexto 2D falsos: contrato por escena (plaza, M02, M08), presupuesto y prohibiciones por cuadro, ruta del paquete.
const results = [];
const ok = (name, cond, extra) => { results.push([cond ? 'PASS' : 'FAIL', name, extra || '']); };

(async () => {
  const D = (await import('../city/districts.mjs')).city;
  const OPEN = Object.keys(D.districts).length, PEND = D.order.length - OPEN;
  const SP = require('../city/sprites2d.js');
  const W = require('../city/world2d.js');
  const M = D.districts.M02, M8 = D.districts.M08, PZ = D.plaza, CMv = require('../city/move.js');
  SP.setData(D);

  function fakes(over = {}) {
    const f = { pend: new Map(), nextId: 1, maxPend: 0, rafCalls: 0, listeners: {}, bad: [], draws: [], rects: [], strokes: [], order: [], maps: [], created: 0, ctxNull: !!over.ctxNull, nullAfter: over.nullAfter };
    f.raf = (cb) => { f.rafCalls++; const id = f.nextId++; f.pend.set(id, cb); f.maxPend = Math.max(f.maxPend, f.pend.size); return id; };
    f.caf = (id) => { f.pend.delete(id); };
    f.run = (ts) => { const [id, cb] = [...f.pend][0]; f.pend.delete(id); cb(ts); };
    const mkCtx = (cv) => new Proxy({ canvas: cv, fillStyle: '#000' }, {
      get(t, k) {
        if (k in t) return t[k];
        if (k === 'drawImage') return (img, ...a) => { f.draws.push({ cv, img, a }); };
        if (k === 'fillRect') return (x, y, w, h) => { f.rects.push({ cv, x, y, w, h, c: t.fillStyle }); };
        if (k === 'strokeRect') return (x, y, w, h) => { f.strokes.push({ cv, x, y, w, h, c: t.strokeStyle }); };
        return () => {};
      },
      set(t, k, v) { if (k === 'shadowBlur' || k === 'filter' || (k === 'globalCompositeOperation' && v !== 'source-over')) f.bad.push(k + '=' + v); t[k] = v; return true; },
    });
    const mkCanvas = (isMap) => { let w = 0; const cv = { height: 0, wsets: 0, getContext() { if (isMap && f.nullAfter !== undefined && f.maps.length > f.nullAfter) return null; return f.ctxNull ? null : (cv.__c || (cv.__c = mkCtx(cv))); } }; Object.defineProperty(cv, 'width', { get() { return w; }, set(v) { w = v; cv.wsets++; } }); if (isMap) f.maps.push(cv); return cv; };
    f.doc = { createElement: () => { f.created++; return mkCanvas(true); } };
    f.canvas = Object.assign(mkCanvas(false), { clientWidth: 390, clientHeight: 844, parentNode: null,
      addEventListener(t, fn) { f.listeners[t] = fn; }, removeEventListener(t) { delete f.listeners[t]; } });
    f.state = { hero: { x: over.at ? over.at.x : 0, z: over.at ? over.at.z : 8, face: 'up', speed: 0 }, zoom: 1, flags: { beatenToday: {}, repairs: {}, apprenticesVisible: {}, stars: {}, restored: false, lit: 0 } };
    f.ticks = 0;
    f.opts = Object.assign({ doc: f.doc, raf: f.raf, caf: f.caf, pixelRatio: 3, search: '', reducedMotion: false,
      tick: () => { f.ticks++; f.order.push('tick'); }, state: () => { f.order.push('state'); return f.state; } }, over.opts || {});
    return f;
  }
  const frame = (f, api, ts) => { if (!f.pend.size) { api.setPaused('x', true); api.setPaused('x', false); } f.run(ts); };
  const mapDraws = (f) => f.draws.filter((d) => d.cv === f.canvas);
  // corre n cuadros y devuelve cuántos no dibujaron nada (un cuadro que lanza se salta sin avisar hasta 3 seguidos)
  const skipped = (f, api, n, t0) => { let k = 0; for (let i = 0; i < n; i++) { const b = mapDraws(f).length; frame(f, api, t0 + i * 16); if (mapDraws(f).length === b) k++; } return k; };
  const idxOf = (list, v) => list.indexOf(v);
  const sprDraws = (f, kind, variant) => { const fr = SP.frame(kind, variant, 'down', 0); return mapDraws(f).filter((d) => d.img === fr.img && d.a[1] === fr.sy); };

  // ---------- M02: contrato, pausa, encuadre, NPC, restauración, partículas, dispose ----------
  { let lost2 = 0; const f = fakes({ at: M.entry, opts: { onLost: () => { lost2++; } } }); SP.init(f.doc);
    const api = await W.create(f.canvas, D, 'M02', f.opts);
    ok('(a) el mapa de M02 mide 960×1128 px (120×141 m a 8 px/m), ≤ 1120×1280, y se prerenderiza una vez por create', f.maps[0].width === 960 && f.maps[0].height === 1128 && f.maps[0].width <= 1120 && f.maps[0].height <= 1280 && f.maps[0].wsets === 1, f.maps[0].width + '×' + f.maps[0].height);
    ok('(a2) el mapa de M02 no usa el color de antena de M08 ni dibuja el puente', !f.rects.filter((r) => r.cv === f.maps[0]).some((r) => r.c === M8.colors.a || r.c === '#c4a46b'));
    ok('(b) create resuelve con el contrato (incluye setRoute) y deja 1 rAF', ['resize', 'setPaused', 'dispose', 'encounter', 'dissolve', 'stats', 'setRoute'].every((k) => typeof api[k] === 'function') && f.pend.size === 1 && api.setLook === undefined);
    f.order.length = 0; f.run(100); f.run(116);
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
    // encuadre (Foco de revisión 5: tras llegar a una escena el mapa se encuadra con SUS bounds)
    f.canvas.clientWidth = 390; f.canvas.clientHeight = 844; api.resize(); f.draws.length = 0; frame(f, api, 400);
    const hero = SP.frame('hero', '', 'up', 0), hd = mapDraws(f).filter((d) => d.img === hero.img).pop();
    const feet = hd.a[5] + hd.a[7] * 0.9;
    ok('(e) en vertical el héroe queda al 55 % de la altura', Math.abs(feet - 0.55 * f.canvas.height) < 2, feet + ' vs ' + 0.55 * f.canvas.height);
    f.canvas.clientWidth = 1280; f.canvas.clientHeight = 800; api.resize(); f.draws.length = 0; frame(f, api, 500);
    const hd2 = mapDraws(f).filter((d) => d.img === hero.img).pop();
    ok('(e2) tras girar a horizontal, al 50 %', Math.abs((hd2.a[5] + hd2.a[7] * 0.9) - 0.5 * f.canvas.height) < 2);
    const inMap = (d, W_, H_) => d.a[0] >= 0 && d.a[1] >= 0 && d.a[0] + d.a[2] <= W_ + 1e-6 && d.a[1] + d.a[3] <= H_ + 1e-6;   // origen del mapa: a = [sx, sy, sw, sh, dx, dy, dw, dh]
    const md = mapDraws(f).filter((d) => d.img === f.maps[0]);
    ok('(e3) el rectángulo de origen del mapa cae dentro de 960×1128 tras girar a horizontal', md.length > 0 && md.every((d) => inMap(d, 960, 1128)), JSON.stringify(md[0] && md[0].a));
    // solo NPC en pantalla (criaturas lejos no se dibujan; cerca sí)
    f.canvas.clientWidth = 390; f.canvas.clientHeight = 844; api.resize(); f.draws.length = 0; frame(f, api, 600);
    const far = M.creatures.filter((c) => Math.abs(c.area.z - M.entry.z) > 80);
    ok('(f) las criaturas lejos de la pantalla no se dibujan', far.length > 0 && far.every((c) => sprDraws(f, 'creature', 'M02:' + c.id).length === 0), far.length + ' lejos');
    const bit = M.creatures[0].area; f.state.hero.x = bit.x; f.state.hero.z = bit.z; f.draws.length = 0; frame(f, api, 700);
    ok('(f2) junto a bit sí se dibuja bit', sprDraws(f, 'creature', 'M02:bit').length === 1);
    ok('(f3) en M02 no aparece Iris (solo vive en la plaza)', sprDraws(f, 'person', 'iris').length === 0);
    f.state.flags = Object.assign({}, f.state.flags, { beatenToday: { bit: 1 } }); f.draws.length = 0; frame(f, api, 800);
    ok('(g) beatenToday.bit oculta a bit', sprDraws(f, 'creature', 'M02:bit').length === 0);
    const a01 = M.apprentices[0]; f.state.hero.x = a01.x; f.state.hero.z = a01.z; f.draws.length = 0; frame(f, api, 900);
    const hid = sprDraws(f, 'person', 'M02:a01').length;
    f.state.flags = Object.assign({}, f.state.flags, { apprenticesVisible: { a01: 1 } }); f.draws.length = 0; frame(f, api, 1000);
    ok('(g2) apprenticesVisible.a01 muestra a a01', hid === 0 && sprDraws(f, 'person', 'M02:a01').length === 1);
    // restauración: sin neblina (el mapa se repinta una vez más)
    f.rects.length = 0; frame(f, api, 1100);
    const fog0 = f.rects.some((r) => r.c === 'rgba(176,108,255,0.08)');
    f.state.flags = Object.assign({}, f.state.flags, { restored: true }); f.rects.length = 0; frame(f, api, 1200);
    ok('(g3) restored: la neblina de La Maraña desaparece (y no hay puente en ninguna escena)', fog0 && !f.rects.some((r) => r.c === 'rgba(176,108,255,0.08)') && !f.rects.some((r) => r.c === '#c4a46b'), String(fog0));
    // chispas en una escena sin muros (M02): 300 cuadros sin que el bucle se dé por perdido
    // partículas
    let maxPart = 0; for (let i = 0; i < 300; i++) { api.dissolve(M.creatures[i % 6].id); frame(f, api, 2000 + i * 16); maxPart = Math.max(maxPart, api.stats().part); }
    ok('(h) nunca más de 200 partículas vivas', maxPart > 0 && maxPart <= 200, String(maxPart));
    const sk2 = skipped(f, api, 300, 20000);
    ok('(h2) 300 cuadros en M02 (escena sin muros) no pierden ningún cuadro ni dan la vista por perdida', sk2 === 0 && lost2 === 0, 'sin dibujo=' + sk2 + ' lost=' + lost2);
    ok('(i) nunca shadowBlur, filter ni composite distinto de source-over', f.bad.length === 0, f.bad.slice(0, 3).join());
    // encounter y dispose
    let resolved = false; const enc = api.encounter('bit').then(() => { resolved = true; });
    const wasMap = f.maps[0];
    api.dispose(); await enc;
    ok('(j) dispose resuelve el encounter pendiente', resolved);
    ok('(j2) dispose deja el mapa en 0×0, sin rAF, y es idempotente', wasMap.width === 0 && wasMap.height === 0 && f.pend.size === 0 && (api.dispose(), true));
    const r1 = f.rafCalls; api.setPaused('a', true); api.setPaused('a', false); api.resize(); api.dissolve('bit'); api.setRoute(3);
    ok('(j3) tras dispose nada agenda cuadros', f.rafCalls === r1 && f.pend.size === 0);
  }
  // ---------- plaza ----------
  { let lost = 0; const f = fakes({ at: PZ.entry, opts: { onLost: () => { lost++; } } }); SP.init(f.doc);
    const api = await W.create(f.canvas, D, 'plaza', f.opts);
    const m0 = f.maps[0];
    ok('(p1) el mapa de la plaza mide 800×720 px (100×90 m) y ≤ 1120×1280', m0.width === 800 && m0.height === 720 && m0.wsets === 1, m0.width + '×' + m0.height);
    const rr = f.rects.filter((r) => r.cv === m0), PB = PZ.bounds;
    const box = (p) => { const X = (p.x - PB.minX) * 8, Z = (p.z - PB.minZ) * 8; return { x0: X - p.w * 4, x1: X + p.w * 4, z0: Z - p.d * 4, z1: Z + p.d * 4 }; };
    const hit = (b, c) => rr.some((r) => r.c === c && r.x < b.x1 && r.x + r.w > b.x0 && r.y < b.z1 && r.y + r.h > b.z0);
    const open = PZ.portals.filter((p) => D.districts[p.dist]), pend = PZ.portals.filter((p) => !D.districts[p.dist]);
    ok('(p2) los portales abiertos (uno por distrito) llevan los colores de su distrito y no el muro de La Maraña', open.length === OPEN && open.every((p) => hit(box(p), D.districts[p.dist].colors.a) && hit(box(p), D.districts[p.dist].colors.b) && !hit(box(p), '#2a1f3d')));
    ok('(p3) los portales sin distrito son muros de La Maraña', pend.length === PEND && pend.every((p) => hit(box(p), '#2a1f3d')));
    frame(f, api, 100);
    const allMentors = [].concat(...Object.keys(D.districts).map((m) => D.districts[m].mentors.map((x) => m + ':' + x.id)));
    ok('(p4) en la plaza se dibuja Iris y ningún mentor ni criatura de los distritos', sprDraws(f, 'person', 'iris').length === 1 && allMentors.every((v) => sprDraws(f, 'person', v).length === 0) && M.creatures.every((c) => sprDraws(f, 'creature', 'M02:' + c.id).length === 0));
    const w = pend[0]; f.state.hero.x = w.x; f.state.hero.z = w.z + 6;
    const skP = skipped(f, api, 300, 200);
    ok('(p5) 300 cuadros en la plaza (sin reparaciones) no pierden ningún cuadro ni dan la vista por perdida', skP === 0 && lost === 0 && f.pend.size === 1, 'sin dibujo=' + skP + ' lost=' + lost);
    ok('(p6) la plaza no usa shadowBlur ni filter', f.bad.length === 0);
    api.dispose(); }
  // ---------- M08: estilo, límites por cuadro, ruta del paquete ----------
  { let lost = 0; const f = fakes({ at: M8.entry, opts: { onLost: () => { lost++; } } }); SP.init(f.doc);
    const api = await W.create(f.canvas, D, 'M08', f.opts);
    const created0 = f.created;
    ok('(m1) el mapa de M08 mide 960×1040 px (120×130 m) y ≤ 1120×1280', f.maps[0].width === 960 && f.maps[0].height === 1040 && f.maps[0].wsets === 1, f.maps[0].width + '×' + f.maps[0].height);
    const mr = f.rects.filter((r) => r.cv === f.maps[0]);
    ok('(m2) estilo red: cada edificio lleva antena (rectángulos del color a)', mr.filter((r) => r.c === M8.colors.a).length >= CMv.layoutBuildings(M8).length, String(mr.filter((r) => r.c === M8.colors.a).length));
    frame(f, api, 100); frame(f, api, 116);
    f.canvas.clientWidth = 390; f.canvas.clientHeight = 844; api.resize(); f.draws.length = 0; frame(f, api, 130);
    const md = mapDraws(f).filter((d) => d.img === f.maps[0]);
    ok('(m3) resize tras create usa los bounds de la escena: el origen del mapa cae dentro de 960×1040', md.length > 0 && md.every((d) => d.a[0] >= 0 && d.a[1] >= 0 && d.a[0] + d.a[2] <= 960 + 1e-6 && d.a[1] + d.a[3] <= 1040 + 1e-6), JSON.stringify(md[0] && md[0].a));
    // NPC de M08
    const m01 = M8.mentors[0]; f.state.hero.x = m01.x; f.state.hero.z = m01.z; f.draws.length = 0; frame(f, api, 150);
    ok('(m4) junto al primer mentor de M08 se dibuja su variante M08:m01 (y no la de M02)', sprDraws(f, 'person', 'M08:m01').length === 1 && sprDraws(f, 'person', 'M02:m01').length === 0);
    // ruta del paquete
    const pads = M8.route.pads, cols = M8.colors, CHECK = '#eafff3', wsets0 = f.maps[0].wsets;
    const cW = f.canvas.width, cH = f.canvas.height;
    const nearC = (list, isRect) => list.filter((r) => r.cv === f.canvas && Math.abs(r.x + r.w / 2 - cW / 2) < 30 && Math.abs(r.y + r.h / 2 - cH * 0.55) < 30);
    api.setRoute(4);
    const bad = [];
    for (let i = 0; i < pads.length; i++) {
      f.state.hero.x = pads[i].x; f.state.hero.z = pads[i].z; f.rects.length = 0; f.strokes.length = 0; frame(f, api, 300 + i * 16);
      const fr = nearC(f.rects), st = nearC(f.strokes);
      if (i < 4 && fr.filter((r) => r.c === CHECK).length < 3) bad.push('pad ' + i + ' terminado sin ✓');
      if (i === 4 && !fr.some((r) => r.c === cols.a && r.w >= 30)) bad.push('pad 4 activo sin relleno');
      if (i > 4 && (st.length < 1 || fr.some((r) => r.c === cols.a || r.c === CHECK))) bad.push('pad ' + i + ' apagado sin solo contorno: strokes=' + st.length + ' rects=' + fr.map((r) => r.c).join('/'));
    }
    ok('(m5) pads: terminados con ✓ (forma), el activo relleno y los siguientes solo con contorno', bad.length === 0, bad.join(' | '));
    ok('(m6) setRoute no redibuja el mapa (wsets igual) ni crea canvas', f.maps[0].wsets === wsets0 && f.created === created0, f.maps[0].wsets + '/' + wsets0 + ' creados ' + f.created + '/' + created0);
    // cable: tramos encendidos hasta el pad activo y apagados después
    f.state.hero.x = -28; f.state.hero.z = -5; f.rects.length = 0; frame(f, api, 500);
    const cableLit = f.rects.filter((r) => r.cv === f.canvas && r.c === cols.a).length, cableOff = f.rects.filter((r) => r.cv === f.canvas && r.c === '#2a3358').length;
    ok('(m7) el cable se dibuja encendido (color a) antes del pad activo y apagado después', cableLit > 0 && cableOff > 0, cableLit + '/' + cableOff);
    // paquete: aparece al avanzar de a 1, dura < 1 s y no aparece con movimiento reducido
    api.setRoute(5);
    let seen = 0; for (let i = 0; i < 20; i++) { f.rects.length = 0; frame(f, api, 600 + i * 16); if (f.rects.some((r) => r.cv === f.canvas && r.c === '#ffffff')) seen++; }
    let late = 0; for (let i = 0; i < 70; i++) { f.rects.length = 0; frame(f, api, 1000 + i * 16); if (i > 55 && f.rects.some((r) => r.cv === f.canvas && r.c === '#ffffff')) late++; }
    ok('(m8) el paquete viaja por el tramo recién encendido y desaparece antes de 1 s', seen > 5 && late === 0, 'visto=' + seen + ' tarde=' + late);
    api.setRoute(5); f.rects.length = 0; frame(f, api, 3000);
    ok('(m8b) repetir el mismo valor no lanza otro paquete', !f.rects.some((r) => r.cv === f.canvas && r.c === '#ffffff'));
    api.setRoute(NaN); api.setRoute(-3); api.setRoute('4'); api.setRoute(3.5); api.setRoute(99);
    f.state.hero.x = pads[9].x; f.state.hero.z = pads[9].z; f.rects.length = 0; frame(f, api, 3100);
    ok('(m9) setRoute inválido no lanza; 99 se acota al número de pads (todos terminados)', nearC(f.rects).filter((r) => r.c === CHECK).length >= 3 && lost === 0);
    // límites por cuadro en M08 con el paquete animándose
    api.setRoute(2); api.setRoute(3);
    let maxPart = 0, skM = 0; for (let i = 0; i < 300; i++) { const b = mapDraws(f).length; frame(f, api, 4000 + i * 16); if (mapDraws(f).length === b) skM++; maxPart = Math.max(maxPart, api.stats().part); }
    ok('(m10) en M08, con pads y paquete: ≤ 200 partículas, sin shadowBlur/filter, sin canvas nuevos por cuadro, sin perder cuadros ni la vista', maxPart <= 200 && f.bad.length === 0 && f.created === created0 && lost === 0 && skM === 0, [maxPart, f.bad.length, f.created, created0, lost, skM].join());
    api.dispose(); }
  { const f = fakes({ at: M8.entry, opts: { reducedMotion: true } }); SP.init(f.doc);
    const api = await W.create(f.canvas, D, 'M08', f.opts); api.setRoute(2); api.setRoute(3);
    f.state.hero.x = -14; f.state.hero.z = 16; let seen = 0; for (let i = 0; i < 30; i++) { f.rects.length = 0; frame(f, api, 100 + i * 16); if (f.rects.some((r) => r.cv === f.canvas && r.c === '#ffffff')) seen++; }
    ok('(m11) con movimiento reducido el paquete no se anima', seen === 0, String(seen)); api.dispose(); }
  // ---------- escenas: segundo create y escenas inválidas ----------
  { const f = fakes({ at: PZ.entry }); SP.init(f.doc);
    const a1 = await W.create(f.canvas, D, 'plaza', f.opts); frame(f, a1, 100); a1.dispose();
    const c0 = f.created, n0 = f.maps.length;
    const a2 = await W.create(f.canvas, D, 'M08', f.opts);
    ok('(s1) un segundo create (otra escena, mismo documento) solo crea el mapa: los atlas se comparten', f.created === c0 + 1 && f.maps.length === n0 + 1, (f.created - c0) + ' canvas nuevos');
    a2.dispose();
    const lst = Object.assign({}, f.listeners); const w0 = f.canvas.width;
    for (const bad of ['M99', '__proto__', 'constructor', 'toString', '', null, 5, undefined, {}]) {
      const r = await W.create(f.canvas, D, bad, f.opts).then(() => 'ok', (e) => e.message);
      if (r === 'ok') { ok('(s2) escena inválida ' + String(bad) + ' debe rechazar', false); }
    }
    ok('(s2) una escena inválida (M99, __proto__, constructor…) rechaza sin tocar el canvas ni dejar oyentes', f.canvas.width === w0 && JSON.stringify(Object.keys(f.listeners)) === JSON.stringify(Object.keys(lst)), Object.keys(f.listeners).join()); }
  { const f = fakes({ at: M8.entry }); SP.init(f.doc); let lost = 0; f.opts.onLost = () => { lost++; };
    const mapsMade = [];
    for (const sc of ['plaza', 'M02', 'M08', 'plaza', 'M08', 'M02']) { const n = f.maps.length; const a = await W.create(f.canvas, D, sc, f.opts); mapsMade.push(f.maps[n]); frame(f, a, 100); frame(f, a, 116); a.dispose(); }
    ok('(s3) cambiar de escena 6 veces deja 0 rAF pendientes, el canvas principal en 0×0, todos los mapas en 0×0 y ningún aviso de pérdida', f.pend.size === 0 && f.canvas.width === 0 && f.canvas.height === 0 && mapsMade.length === 6 && mapsMade.every((m) => m.width === 0 && m.height === 0) && lost === 0, f.pend.size + ' rAF'); }
  // ---- revisión final: robustez ----
  { const f = fakes({ at: M.entry }); SP.init(f.doc); const api = await W.create(f.canvas, D, 'M02', f.opts);
    ok('(r1) el primer create ajusta el canvas una sola vez y un resize del mismo tamaño no lo reasigna (no borra ni realoca)', f.canvas.wsets === 1 && (api.resize(), api.resize(), f.canvas.wsets === 1), String(f.canvas.wsets));
    f.canvas.clientWidth = 100000; f.canvas.clientHeight = 1; api.resize();
    ok('(r2) un canvas enorme se limita a 8192 px por lado', f.canvas.width <= 8192 && f.canvas.height <= 8192 && f.canvas.width >= 1, f.canvas.width + '×' + f.canvas.height);
    f.canvas.clientWidth = 390; f.canvas.clientHeight = 844; api.resize();
    let boomed = false; const st0 = f.state; f.opts.state = () => { if (!boomed) { boomed = true; throw new Error('boom'); } return st0; };
    f.run(100);
    ok('(r3) si state() lanza una vez el bucle sigue vivo y reagenda el siguiente cuadro', f.pend.size === 1);
    f.run(116); ok('(r3b) y el siguiente cuadro dibuja con normalidad', mapDraws(f).length > 0);
    api.dispose(); ok('(r4) dispose deja también el canvas principal en 0×0 (libera su memoria)', f.canvas.width === 0 && f.canvas.height === 0); }
  { const f = fakes({ at: M.entry }); SP.init(f.doc); let lost = 0; f.opts.onLost = () => { lost++; };
    const api = await W.create(f.canvas, D, 'M02', f.opts); f.opts.state = () => { throw new Error('siempre'); };
    for (let i = 0; i < 5 && f.pend.size; i++) f.run(100 + i * 16);
    ok('(r5) si el dibujo falla 3 veces seguidas avisa por onLost y deja de agendar', lost === 1 && f.pend.size === 0, lost + ' ' + f.pend.size); api.dispose(); }
  { const f = fakes({ at: M.entry }); SP.init(f.doc); const api = await W.create(f.canvas, D, 'M02', f.opts); f.run(100);
    f.state.hero.x = Object.create(null);
    f.run(116); f.run(132);
    ok('(r6) un héroe con valores inservibles no congela el mundo', f.pend.size === 1); f.state.hero.x = 0; api.dispose(); }
  { const f = fakes({ at: M.entry }); SP.init(f.doc); const api = await W.create(f.canvas, D, 'M02', f.opts); f.run(100);
    const x0 = M.creatures[0].area.x; f.state.hero.x = x0; f.state.hero.z = M.creatures[0].area.z;
    const bad = []; const orig = f.canvas.getContext(); void orig;
    api.encounter('__proto__'); api.dissolve('constructor'); api.encounter('toString'); f.run(116); f.run(900); f.run(1000);
    ok('(r7) ids como __proto__, constructor o toString no hacen nada (sin NaN en el dibujo)', mapDraws(f).every((d) => d.a.every((v) => typeof v !== 'number' || Number.isFinite(v))) && api.stats().part === 0);
    api.dispose(); }
  { const f = fakes({ at: M.entry }); SP.init(f.doc); const api = await W.create(f.canvas, D, 'M02', f.opts); f.run(100);
    api.dissolve('bit'); f.run(116); f.run(NaN); f.run(Infinity);
    for (let i = 0; i < 60; i++) f.run(1000 + i * 16);
    ok('(r8) un timestamp NaN o Infinity de rAF no deja partículas inmortales (solo quedan las de ambiente, ≤ 12; el fallo dejaba 168)', api.stats().part <= 12, String(api.stats().part)); api.dispose(); }
  { const f = fakes({ at: M.entry }); SP.init(f.doc); f.state.flags.restored = true; const api = await W.create(f.canvas, D, 'M02', f.opts); f.run(100); f.run(116);
    ok('(r9) si el distrito ya está restaurado al entrar, el mapa se prerenderiza una sola vez (no dos)', f.maps[0].wsets === 1, String(f.maps[0].wsets)); api.dispose(); }
  { const f = fakes({ at: M.entry }); SP.init(f.doc); const api = await W.create(f.canvas, D, 'M02', f.opts); f.run(100);
    f.state.flags = Object.assign({}, f.state.flags, { restored: true }); f.run(116);
    ok('(r9b) al restaurar en vivo el mapa se repinta una vez más (2 en total)', f.maps[0].wsets === 2, String(f.maps[0].wsets)); api.dispose(); }
  { const f = fakes({ nullAfter: 1 }); SP.init(f.doc);
    const r = await W.create(f.canvas, D, 'M02', f.opts).then(() => 'ok', (e) => e.message);
    ok('(r10) si un atlas de sprites no puede crearse, create rechaza "sin-2d" (no se descubre en el primer cuadro)', r === 'sin-2d', r); }
  { const f = fakes({ ctxNull: true }); SP.init(f.doc);
    const r = await W.create(f.canvas, D, 'M02', f.opts).then(() => 'ok', (e) => e.message);
    ok('(k) getContext nulo → create rechaza "sin-2d"', r === 'sin-2d', r); }
  { const f = fakes({ at: M.entry }); SP.init(f.doc); let lost = 0; f.opts.onLost = () => { lost++; };
    const api = await W.create(f.canvas, D, 'M02', f.opts); f.listeners.contextlost && f.listeners.contextlost({});
    ok('(k2) contextlost llama a onLost y dispose lo quita', lost === 1 && (api.dispose(), !f.listeners.contextlost)); }
  { const f = fakes({ opts: { reducedMotion: true } }); SP.init(f.doc);
    const api = await W.create(f.canvas, D, 'M02', f.opts); let done = false;
    api.encounter('bit').then(() => { done = true; }); await Promise.resolve(); await Promise.resolve();
    api.dissolve('bit'); if (f.pend.size) f.run(100);
    ok('(l) movimiento reducido: encounter resuelve al instante y dissolve no crea partículas', done && api.stats().part === 0);
    api.dispose(); }
  { const f = fakes({ at: M.entry }); SP.init(f.doc); f.opts.search = '?fps=1';
    const parent = { kids: [], appendChild(e) { this.kids.push(e); e.parentNode = this; }, removeChild(e) { this.kids = this.kids.filter((x) => x !== e); } };
    f.canvas.parentNode = parent; global.document = { createElement: () => ({ style: {}, id: '' }) };
    const api = await W.create(f.canvas, D, 'M02', f.opts); for (let i = 0; i < 40; i++) { if (!f.pend.size) break; f.run(100 + i * 17); }
    const txt = parent.kids[0] && parent.kids[0].textContent;
    ok('(m) ?fps=1: div con solo números y las palabras permitidas; dispose lo quita', !!txt && /^[0-9.·\sfpsp95ticknodibujomartnpmsfpsms]+$/i.test(txt) && /fps/.test(txt) && (api.dispose(), parent.kids.length === 0), txt);
    delete global.document; }
  // ---- Pauser (pausa por motivos), propio del mundo 2D ----
  { ok('(n) CityWorld2D exporta Pauser además de create, y nada más', typeof W.Pauser === 'function' && typeof W.create === 'function' && Object.keys(W).sort().join() === 'Pauser,create');
    const P = W.Pauser();
    ok('(n) Pauser corre sin motivos', P.running());
    P.set('sheet', true); P.set('hidden', true); P.set('hidden', false);
    ok('(n) con "sheet" activo sigue en pausa aunque "hidden" se quite', !P.running() && P.has('sheet') && !P.has('hidden'));
    P.set('sheet', false);
    ok('(n) sin motivos vuelve a correr', P.running() && !P.has('sheet'));
    P.set('x', true); P.set('x', true); P.set('x', false);
    ok('(n) un motivo repetido no cuenta dos veces: un solo "false" lo libera', P.running());
    P.set('nunca', false);
    ok('(n) quitar un motivo que no está no rompe el conteo', P.running());
    const P2 = W.Pauser(); P2.tick(1000);
    ok('(n) el segundo tick limita dt a 50', P2.tick(5000) === 50);
    P2.set('sheet', true); P2.set('sheet', false);
    ok('(n) tras reanudar el primer tick devuelve 16', P2.tick(9000) === 16);
    ok('(n) el primer tick de un Pauser nuevo devuelve 16', W.Pauser().tick(123456) === 16); }
  results.forEach((r) => { if (r[0] === 'FAIL') console.log(r.join(' | ')); });
  const fails = results.filter((r) => r[0] === 'FAIL').length;
  console.log(fails ? fails + ' FALLOS' : 'CITY_WORLD2D OK (' + results.length + ')'); process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
