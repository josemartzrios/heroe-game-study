// MANUAL (no entra en la suite): humo de la Tanda 4 en Chromium real (portal, HUD, ojos de las criaturas, enseñar en los dos modos y teclado en M05 y M09).
// Necesita playwright-core@1.65.0 (la versión que corresponde a chromium_headless_shell-1248), instalado FUERA del repo, p. ej.:
//   mkdir /tmp/pw && cd /tmp/pw && npm init -y && npm i playwright-core@1.65.0
//   node build.mjs && NODE_PATH=/tmp/pw/node_modules node tests/manual/smoke_tanda4.cjs
// PW_CHROME fija el ejecutable de Chromium (por defecto, el chromium_headless_shell de ~/.cache/ms-playwright).
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');
const R = path.join(__dirname, '..', '..') + '/';
const EXE = process.env.PW_CHROME || process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell';
const HTMLF = R + 'juego_estudio.html';
const CD = JSON.parse(fs.readFileSync(HTMLF, 'utf8').split('var CITY_DATA = ')[1].split(';\n')[0]);
const T = require(R + 'city/teach.js');
const SIZES = [[320, 640, true], [390, 844, true], [1280, 800, false]];
const DIST = [['M05', 'Mercado de Patrones'], ['M09', 'Laboratorio Neuronal']];
const results = [];
const ok = (n, c, x) => { results.push([c ? 'PASS' : 'FAIL', n, c ? '' : (x || '')]); };
const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

(async () => {
  const { expandModule } = await import('file://' + R + 'content_expand.mjs');
  const mods = {};
  for (const [m] of DIST) mods[m] = expandModule(m, m, await import('file://' + R + (m === 'M05' ? 'content_m05.mjs' : 'content_m09.mjs')));
  // seed con los 10 distritos restaurados (peor caso del HUD: Arquitecto y 100 %)
  const restoredSeed = () => {
    const d = {}, boss = {};
    for (const [id, dist] of Object.entries(CD.districts)) { d[id] = { taught: Object.fromEntries(dist.apprentices.slice(0, dist.need).map((a) => [a.id, true])) }; boss[id] = { best: 18, passed: true }; }
    return { v: 1, xp: 5000, topics: {}, boss, hero: { name: 'H' }, city: { prologue: true, d } };
  };
  const stars = (m, topics) => Object.fromEntries(topics.map((t) => [m + ':' + t, [1, 1, 1, 1, 1, 1]]));
  const browser = await chromium.launch({ executablePath: EXE });
  const newPage = async (w, h, mobile, seed) => {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: mobile, isMobile: mobile, deviceScaleFactor: 1 });
    const page = await ctx.newPage(), errs = [];
    page.on('pageerror', (e) => errs.push(e.message)); page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
    await page.addInitScript((s) => { window.__CITY_TEST__ = true; if (!localStorage.getItem('estudio_isw_v1')) localStorage.setItem('estudio_isw_v1', JSON.stringify(s)); }, seed);
    await page.goto('file://' + HTMLF);
    await page.click('[data-act="city"]');
    await page.waitForSelector('#city-ui-main:not([inert])', { state: 'attached', timeout: 15000 });
    await page.waitForTimeout(500);
    return { ctx, page, errs };
  };
  const rect = (page, sel) => page.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const r = e.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, sw: e.scrollWidth, cw: e.clientWidth }; }, sel);
  const overlap = (a, b) => Math.max(0, Math.min(a.r, b.r) - Math.max(a.l, b.l)) * Math.max(0, Math.min(a.b, b.b) - Math.max(a.t, b.t));

  for (const [w, h, mobile] of SIZES) for (const [m, name] of DIST) {
    const tag = `${w}x${h} ${m}`, dist = CD.districts[m];
    // ---------- portal desde la plaza ----------
    { const seed = { v: 1, xp: 1000, topics: {}, hero: { name: 'H' }, city: { prologue: true } };
      const { ctx, page, errs } = await newPage(w, h, mobile, seed);
      const p = CD.plaza.portals.find((q) => q.dist === m), k = 1 - 3.6 / Math.hypot(p.x, p.z);
      await page.evaluate(([x, z]) => window.__CITY_TEST_API__.teleport(x, z), [p.x * k, p.z * k]);
      await page.waitForSelector('#city-act:not([hidden])', { timeout: 5000 }); await page.waitForTimeout(250);
      const txt = await page.evaluate(() => document.querySelector('#city-act').innerText.replace(/\s+/g, ' ').trim());
      const act = await rect(page, '#city-act');
      ok(`${tag}: el botón del portal dice «Entrar a ${name}»`, txt.indexOf('Entrar a ' + name) === 0, txt);
      ok(`${tag}: #city-act no se desborda (scrollWidth <= clientWidth) y queda dentro de la pantalla`, act.sw <= act.cw && act.l >= 0 && act.r <= w && act.t >= 0 && act.b <= h, JSON.stringify(act));
      if (mobile) {
        const jb = await rect(page, '#city-joy .jbase');
        ok(`${tag}: la base del joystick tiene tamaño y el botón no la toca en reposo`, jb && jb.w > 0 && overlap(act, jb) === 0, JSON.stringify([act, jb]));
        await page.evaluate((hh) => document.querySelector('#city-root').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 7, clientX: 84, clientY: hh - 128, pointerType: 'touch' })), h);
        await page.waitForTimeout(150);
        const jb2 = await rect(page, '#city-joy .jbase'), on = await page.evaluate(() => document.querySelector('#city-joy').classList.contains('on'));
        ok(`${tag}: con el joystick activo (en su posición por defecto) el botón tampoco lo toca`, on && jb2.w > 0 && overlap(act, jb2) === 0, JSON.stringify([act, jb2, on]));
        await page.evaluate(() => document.querySelector('#city-root').dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 7, pointerType: 'touch' })));
      }
      ok(`${tag}: sin errores en el portal`, errs.length === 0, errs.join('|'));
      await ctx.close(); }

    // ---------- dentro del distrito: HUD y ojos de las criaturas ----------
    { const seed = restoredSeed(); seed.city.scene = m; seed.city.at = { x: dist.entry.x, z: dist.entry.z, yaw: 0 };
      const { ctx, page, errs } = await newPage(w, h, mobile, seed);
      const rest = await page.evaluate(() => document.querySelector('#city-rest').textContent), rank = await page.evaluate(() => document.querySelector('#city-rank').textContent);
      const hud = await page.evaluate((iw) => { const hd = document.querySelector('.city-hud'), r = hd.getBoundingClientRect(); return { bottom: r.bottom, kids: [...hd.children].map((c) => ({ id: c.id || c.className, right: c.getBoundingClientRect().right })), iw }; }, w);
      ok(`${tag}: el HUD dice «${name} 100 %» con rango Arquitecto`, rest === name + ' 100 %' && rank === 'Arquitecto', rest + ' | ' + rank);
      ok(`${tag}: ningún hijo del HUD pasa del borde derecho y el HUD ocupa ≤ 25 % del alto`, hud.kids.every((c) => c.right <= w + 0.5) && hud.bottom <= 0.25 * h, JSON.stringify(hud));
      // ojos: teleportar cerca de la primera criatura y buscar blanco pegado al cuerpo y pupila pegada al blanco
      const cr = dist.creatures[0], body = hexRgb(dist.colors.a);
      await page.evaluate(([x, z]) => window.__CITY_TEST_API__.teleport(x, z), [cr.area.x, cr.area.z + 2.5]);
      await page.waitForTimeout(500);
      const eyes = await page.evaluate((body) => {
        const cv = document.querySelector('#city-cv'), g = cv.getContext('2d'), W = cv.width, H = cv.height, d = g.getImageData(0, 0, W, H).data;
        const px = (x, y) => { const i = (y * W + x) * 4; return [d[i], d[i + 1], d[i + 2]]; };
        const near = (a, b, t) => Math.abs(a[0] - b[0]) <= t && Math.abs(a[1] - b[1]) <= t && Math.abs(a[2] - b[2]) <= t;
        const nb = (x, y) => [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [x + dx, y + dy]).filter(([a, b]) => a >= 0 && b >= 0 && a < W && b < H);
        let white = 0, pupil = 0;
        for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
          const c = px(x, y);
          if (near(c, [255, 255, 255], 2) && nb(x, y).some(([a, b]) => near(px(a, b), body, 3))) white++;
          if (near(c, [0x12, 0x16, 0x2e], 3) && nb(x, y).some(([a, b]) => near(px(a, b), [255, 255, 255], 2))) pupil++;
        }
        return { white, pupil, W, H };
      }, body);
      ok(`${tag}: la criatura «${cr.name}» tiene ojos visibles (≥ 4 píxeles blancos junto al cuerpo y ≥ 1 de pupila)`, eyes.white >= 4 && eyes.pupil >= 1, JSON.stringify(eyes));
      if (process.env.SHOT && w === 320) await page.screenshot({ path: path.join(require('os').tmpdir(), `s4_${m}_${w}.png`) });
      ok(`${tag}: sin errores dentro del distrito`, errs.length === 0, errs.join('|'));
      await ctx.close(); }
  }

  // ---------- enseñar a 320 px: M05 y M09, explicar y corregir ----------
  for (const [m, name] of DIST) for (const mode of ['explain', 'correct']) {
    const dist = CD.districts[m], ap = dist.apprentices.find((a) => a.mode === mode), tag = `320x640 ${m} ${mode}`;
    const seed = { v: 1, xp: 1000, topics: stars(m, [ap.topic]), hero: { name: 'H' }, city: { prologue: true, scene: m, at: { x: dist.entry.x, z: dist.entry.z, yaw: 0 } } };
    const { ctx, page, errs } = await newPage(320, 640, true, seed);
    const before = await page.evaluate(() => document.querySelector('#city-rest').textContent);
    await page.evaluate(([x, z]) => window.__CITY_TEST_API__.teleport(x, z), [ap.x, ap.z + 1]);
    await page.waitForSelector('#city-act:not([hidden])', { timeout: 5000 });
    await page.tap('#city-act');
    await page.waitForSelector('#city-teach-text', { timeout: 5000 });
    let text;
    if (mode === 'explain') {
      const kps = mods[m].topics.find((t) => t.id === ap.topic).keyPoints, terms = kps.map((kp) => T.keyTerms(kp)).filter((x) => x.length).slice(0, 3).map((x) => x[0].join(' '));
      text = terms.join(' y ') + ' son ideas que quiero explicar con calma hoy para entender mejor';
    } else {
      const wrong = await page.evaluate(() => document.querySelector('#city-sheet .teach-wrong').textContent);
      const it = mods[m].questions.filter((q) => q.type === 'error' && q.topic === ap.topic).map((q) => T.fixItem(q)).find((i) => wrong.indexOf(i.wrong) >= 0);
      text = it.right + ' ' + it.explanation;
    }
    await page.fill('#city-teach-text', text);
    await page.tap('[data-c="teach-send"]');
    await page.waitForSelector('#city-sheet input[type="checkbox"]', { timeout: 5000 });
    const pre = await page.evaluate(() => [...document.querySelectorAll('#city-sheet input[type="checkbox"]')].filter((b) => b.checked).length);
    ok(`${tag}: ${ap.name} (${ap.topic}) — la revisión premarca ${mode === 'explain' ? '3 o más puntos' : 'la casilla «Lo corregí bien»'}`, mode === 'explain' ? pre >= 3 : pre === 1, String(pre));
    await page.tap('[data-c="teach-ok"]');
    await page.waitForSelector('#city-sheet [data-c="sheetclose"]', { timeout: 5000 });
    await page.tap('[data-c="sheetclose"]');
    await page.waitForTimeout(300);
    const after = await page.evaluate(() => ({ rest: document.querySelector('#city-rest').textContent, sw: document.documentElement.scrollWidth, iw: window.innerWidth, focus: document.activeElement && document.activeElement.id }));
    ok(`${tag}: «${before}» pasa a «${name} 7 %»`, before === name + ' 0 %' && after.rest === name + ' 7 %', before + ' → ' + after.rest);
    ok(`${tag}: sin scroll horizontal y el foco vuelve al juego (botón de acción o de pausa)`, after.sw <= after.iw && (after.focus === 'city-act' || after.focus === 'city-pause'), JSON.stringify(after));
    ok(`${tag}: sin errores al enseñar`, errs.length === 0, errs.join('|'));
    await ctx.close();
  }

  // ---------- teclado a 1280 px ----------
  for (const [m, name] of DIST) {
    const seed = { v: 1, xp: 1000, topics: {}, hero: { name: 'H' }, city: { prologue: true } };
    const { ctx, page, errs } = await newPage(1280, 800, false, seed);
    const p = CD.plaza.portals.find((q) => q.dist === m), k = 1 - 3.6 / Math.hypot(p.x, p.z);
    await page.evaluate(([x, z]) => window.__CITY_TEST_API__.teleport(x, z), [p.x * k, p.z * k]);
    await page.waitForSelector('#city-act:not([hidden])', { timeout: 5000 });
    await page.focus('#city-act'); await page.keyboard.press('Enter');
    await page.waitForFunction((n) => document.querySelector('#city-live').textContent.indexOf('Entraste a ' + n) >= 0, name, { timeout: 5000 });
    ok(`1280x800 ${m}: Enter con el foco en #city-act entra y #city-live dice «Entraste a ${name}»`, true);
    await page.keyboard.press('Escape'); await page.waitForTimeout(150);
    const open1 = await page.evaluate(() => !document.querySelector('#city-pausebox').hidden);
    await page.keyboard.press('Escape'); await page.waitForTimeout(150);
    const open2 = await page.evaluate(() => !document.querySelector('#city-pausebox').hidden);
    ok(`1280x800 ${m}: Escape abre la pausa y otro Escape la cierra`, open1 && !open2, [open1, open2].join());
    ok(`1280x800 ${m}: sin errores con el teclado`, errs.length === 0, errs.join('|'));
    await ctx.close();
  }

  await browser.close();
  results.forEach((r) => console.log(r.join(' | ')));
  const fails = results.filter((r) => r[0] === 'FAIL').length;
  console.log(fails ? `\n${fails} FALLOS de ${results.length}` : `\nHUMO TANDA 4 OK (${results.length} comprobaciones)`);
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('EXC', e && e.stack); process.exit(2); });
