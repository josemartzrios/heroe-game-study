// Utilidades comunes de las pruebas adversariales (no entran en el glob tests/*.cjs).
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', '..', 'juego_estudio.html'), 'utf8');
const KEY = 'estudio_isw_v1';
const TID = 'T04';
const HK = 'M08:' + TID;

// PRNG reproducible (mulberry32).
function rng(seed) {
  let a = seed >>> 0;
  const f = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  f.int = (lo, hi) => lo + Math.floor(f() * (hi - lo + 1));
  f.pick = (arr) => arr[Math.floor(f() * arr.length)];
  f.bool = (p = 0.5) => f() < p;
  return f;
}

// raw: string crudo para localStorage (o null). opts.dateOffset: objeto {ms} mutable para mover el reloj.
// opts.storage: 'full' (setItem lanza QuotaExceededError).
function boot(raw, opts = {}) {
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => errors.push('jsdomError: ' + (e.detail && e.detail.stack ? String(e.detail.stack).split('\n').slice(0, 2).join(' ') : (e.detail || e.message))));
  vc.on('error', (...a) => errors.push('console.error: ' + a.map(String).join(' ')));
  const clock = opts.clock || null;
  const dom = new JSDOM(html, {
    runScripts: 'dangerously', pretendToBeVisual: true, url: 'https://example.test/', virtualConsole: vc,
    beforeParse(w) {
      if (raw != null) w.localStorage.setItem(KEY, raw);
      w.scrollTo = () => {};
      if (clock) {
        const RD = w.Date;
        class FD extends RD {
          constructor(...a) { if (a.length === 0) super(RD.now() + clock.ms); else super(...a); }
          static now() { return RD.now() + clock.ms; }
        }
        w.Date = FD;
      }
      if (opts.storage === 'full') {
        const proto = Object.getPrototypeOf(w.localStorage);
        const orig = proto.setItem;
        proto.setItem = function (k, v) { if (w.__full) { const e = new w.DOMException('quota', 'QuotaExceededError'); throw e; } return orig.call(this, k, v); };
      }
    },
  });
  return { dom, w: dom.window, d: dom.window.document, errors };
}

const norm = (s) => s.replace(/`/g, '').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
const qsCache = new WeakMap();
function allQs(w) { if (!qsCache.has(w)) qsCache.set(w, w.eval('MODULES').flatMap((m) => m.questions)); return qsCache.get(w); }
function click(w, el) { el.dispatchEvent(new w.MouseEvent('click', { bubbles: true })); }
// Emula el navegador: keydown sobre el elemento enfocado; Enter/espacio sobre un BUTTON enfocado lo activa (click).
function key(w, k) {
  const t = w.document.activeElement || w.document.body;
  const ev = new w.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true });
  const notCanceled = t.dispatchEvent(ev);
  if (notCanceled && (k === 'Enter' || k === ' ') && t.tagName === 'BUTTON' && !t.disabled && t.isConnected) click(w, t);
}
function modBtn(d, id) { return [...d.querySelectorAll('[data-act="mod"]')].find((b) => b.dataset.id === id); }
function btn(d, act, extra) { return [...d.querySelectorAll(`[data-act="${act}"]`)].find((b) => !extra || extra(b)); }
function findQ(w, d) {
  const sq = (t) => t.replace(/\s+/g, '');
  const pe = d.querySelector('.prompt'); if (!pe) return null;
  const p = sq(pe.textContent);
  const shown = [...d.querySelectorAll('.opt')].map((b) => norm(b.querySelector('span:last-child').textContent));
  const c = allQs(w).filter((q) => sq(q.prompt.replace(/`/g, '').replace(/\*\*/g, '')) === p);
  return c.find((q) => q.type === 'tf' ? true : q.options.every((o) => shown.includes(norm(o)))) || c[0];
}
function correctText(q) { return q.type === 'tf' ? (q.answer ? 'Verdadero' : 'Falso') : q.options[q.answer]; }
function optBtn(d, text) { return [...d.querySelectorAll('.opt')].find((b) => norm(b.querySelector('span:last-child').textContent) === norm(text)); }

// Abre M08 → T04 → Quiz. Lanza si falta algún botón.
function openQuiz(w, d) {
  const m = modBtn(d, 'M08'); if (!m) throw new Error('sin botón M08 en inicio');
  click(w, m);
  const t = [...d.querySelectorAll('[data-act="topic"]')].find((b) => b.dataset.id === TID); if (!t) throw new Error('sin botón de tema T04');
  click(w, t);
  const s = btn(d, 'start', (b) => b.dataset.kind === 'quiz'); if (!s) throw new Error('sin botón de quiz');
  click(w, s);
  if (!d.querySelector('.prompt')) throw new Error('el quiz no mostró pregunta');
}
// Responde la pregunta en pantalla. mode: 'right' | 'wrong'. Resuelve la Regeneración rechazándola.
function answerOne(w, d, mode) {
  const q = findQ(w, d);
  if (!q) throw new Error('pregunta no encontrada');
  const ct = norm(correctText(q));
  const opts = [...d.querySelectorAll('.opt:not([disabled])')];
  const target = mode === 'right' ? optBtn(d, correctText(q)) : opts.find((b) => norm(b.querySelector('span:last-child').textContent) !== ct);
  if (!target) throw new Error('sin opción objetivo (' + mode + ')');
  click(w, target);
  const rn = btn(d, 'regenno'); if (rn) click(w, rn);
  return q;
}
function nextQ(w, d) { const n = d.querySelector('#nextbtn'); if (!n) throw new Error('sin botón Siguiente'); click(w, n); }
function rawState(w) { return w.localStorage.getItem(KEY); }
function parsed(w) { try { return { ok: true, v: JSON.parse(rawState(w)) }; } catch (e) { return { ok: false, err: e.message }; } }
function quizQs(w) { return allQs(w).filter((q) => q.id.startsWith('M08-') && q.topic === TID && q.type !== 'tf'); }

module.exports = { boot, rng, norm, allQs, click, key, modBtn, btn, findQ, correctText, optBtn, openQuiz, answerOne, nextQ, rawState, parsed, quizQs, KEY, TID, HK };
