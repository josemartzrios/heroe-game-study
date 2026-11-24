// MANUAL (no entra en la suite): desborde horizontal del quiz de M05 con identificadores largos y de la lección de T08, a 320, 360, 390 y 430 px.
// Con isMobile el navegador agranda el viewport si la página es más ancha, así que se mide contra el ancho pedido y no contra innerWidth.
// Necesita playwright-core@1.65.0 instalado FUERA del repo:  mkdir /tmp/pw && cd /tmp/pw && npm init -y && npm i playwright-core@1.65.0
//   node build.mjs && NODE_PATH=/tmp/pw/node_modules node tests/manual/overflow_m05.cjs     (PW_CHROME fija el ejecutable de Chromium)
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');
const R = path.join(__dirname, '..', '..') + '/';
const EXE = process.env.PW_CHROME || process.env.HOME + '/.cache/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-linux64/chrome-headless-shell';
const HTMLF = R + 'juego_estudio.html';
const CD = JSON.parse(fs.readFileSync(HTMLF, 'utf8').split('var CITY_DATA = ')[1].split(';\n')[0]);
const WIDTHS = [320, 360, 390, 430];
const results = [];
const ok = (n, c, x) => { results.push([c ? 'PASS' : 'FAIL', n, c ? '' : (x || '')]); };
(async () => {
  const { expandModule } = await import('file://' + R + 'content_expand.mjs');
  const mod = expandModule('M05', 'M05', await import('file://' + R + 'content_m05.mjs'));
  const long = /\S{22,}/;
  const items = mod.questions.filter((q) => long.test(q.prompt + ' ' + (q.options || []).join(' ') + ' ' + q.explanation));
  const browser = await chromium.launch({ executablePath: EXE });
  for (const w of WIDTHS) {
    // ---- quiz con identificadores largos ----
    { const ctx = await browser.newContext({ viewport: { width: w, height: 800 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
      const page = await ctx.newPage(), errs = []; page.on('pageerror', (e) => errs.push(e.message));
      await page.addInitScript(() => { window.__CITY_TEST__ = true; });
      await page.goto('file://' + HTMLF);
      const bad = [];
      for (const q of items) {
        await page.evaluate(([it]) => window.__CITY_ROUND__.startRound({ kind: 'quiz', title: 'Quiz', mid: 'M05', back: { name: 'home' } }, [it]), [q]);
        await page.waitForSelector('.prompt', { timeout: 5000 });
        const m = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth, opts: [...document.querySelectorAll('.opt')].map((o) => [o.scrollWidth - o.clientWidth, Math.round(o.getBoundingClientRect().right)]), prompt: document.querySelector('.prompt').scrollWidth - document.querySelector('.prompt').clientWidth }));
        if (m.sw > w || m.iw > w || m.opts.some(([d, r]) => d > 0 || r > w) || m.prompt > 0) bad.push(q.id + ' ' + JSON.stringify(m));
        // el resultado/explicación tras contestar también
        await page.click('.opt'); await page.waitForTimeout(80);
        const m2 = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
        if (m2.sw > w || m2.iw > w) bad.push(q.id + ' (explicación) ' + JSON.stringify(m2));
      }
      ok(`${w}px: ${items.length} preguntas de M05 con identificadores largos sin desborde horizontal ni opciones cortadas`, bad.length === 0 && items.length > 0, bad.slice(0, 4).join(' | '));
      ok(`${w}px quiz: sin errores de página`, errs.length === 0, errs.join('|'));
      await ctx.close(); }
    // ---- lección de T08 en la ciudad ----
    { const dist = CD.districts.M05, mentor = dist.mentors.find((m) => m.topic === 'T08');
      const seed = { v: 1, xp: 1000, topics: {}, hero: { name: 'H' }, city: { prologue: true, scene: 'M05', at: { x: dist.entry.x, z: dist.entry.z, yaw: 0 } } };
      const ctx = await browser.newContext({ viewport: { width: w, height: 800 }, hasTouch: true, isMobile: true, deviceScaleFactor: 1 });
      const page = await ctx.newPage(), errs = []; page.on('pageerror', (e) => errs.push(e.message));
      await page.addInitScript((s) => { window.__CITY_TEST__ = true; localStorage.setItem('estudio_isw_v1', JSON.stringify(s)); }, seed);
      await page.goto('file://' + HTMLF);
      await page.click('[data-act="city"]');
      await page.waitForSelector('#city-ui-main:not([inert])', { state: 'attached', timeout: 15000 }); await page.waitForTimeout(400);
      await page.evaluate(([x, z]) => window.__CITY_TEST_API__.teleport(x, z), [mentor.x, mentor.z + 1]);
      await page.waitForSelector('#city-act:not([hidden])', { timeout: 5000 });
      await page.tap('#city-act'); await page.waitForSelector('#city-sheet .kp', { timeout: 5000 });
      const m = await page.evaluate(() => { const s = document.querySelector('#city-sheet'); return { shSw: s.scrollWidth, shCw: s.clientWidth, sw: document.documentElement.scrollWidth, iw: window.innerWidth }; });
      ok(`${w}px: la lección de T08 (${mentor.name}) cabe sin desborde horizontal`, m.shSw <= m.shCw && m.sw <= w && m.iw <= w, JSON.stringify(m));
      ok(`${w}px lección: sin errores de página`, errs.length === 0, errs.join('|'));
      await ctx.close(); }
  }
  await browser.close();
  results.forEach((r) => console.log(r.join(' | ')));
  const fails = results.filter((r) => r[0] === 'FAIL').length;
  console.log(fails ? `\n${fails} FALLOS de ${results.length}` : `\nDESBORDE OK (${results.length} comprobaciones)`);
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error('EXC', e && e.stack); process.exit(2); });
