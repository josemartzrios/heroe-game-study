// La reescritura de CITY_DATA de tests/city_scenes.cjs (CD_PREFIX / CD_START / CD_END / htmlWith) probada como unidad y con datos hostiles.
// city_scenes solo comprueba que reescribir los datos REALES sin borrar nada reproduce el HTML byte a byte; como los datos reales no contienen "<", ni ";" seguido de salto
// de línea, ni "$&", el escape de "<" y la localización con indexOf/slice (el motivo de no usar replace con texto) no se ejercitaban. Aquí se extrae el código de ese archivo
// (las dos líneas, tal cual están) y se evalúa sobre HTML sintético y sobre el real:
//  1. ida y vuelta exacta; 2. "<" escapado (ni </script> ni <!-- dentro del script) y los datos vuelven idénticos al leerlos; 3. ";\n", "$&", "$1", "$'", "$$", comillas,
//  barras, emojis y U+2028 dentro de los datos no desplazan el corte; 4. solo cambia el trozo de los datos; 5. borrar M09 deja 9 distritos y el resto del HTML igual;
//  6. el HTML real tiene un único `var CITY_DATA = ` y el escape coincide con el de build.mjs.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = path.join(__dirname, '..');
const results = [];
const ok = (name, cond, extra) => results.push([cond ? 'PASS' : 'FAIL', name, cond ? '' : (extra || '')]);

const SRC = fs.readFileSync(path.join(__dirname, 'city_scenes.cjs'), 'utf8');
const l1 = SRC.split('\n').find((l) => /^const CD_PREFIX = /.test(l)), l2 = SRC.split('\n').find((l) => /^const htmlWith = /.test(l));
ok('city_scenes.cjs define CD_PREFIX/CD_START/CD_END y htmlWith (las dos líneas que se prueban aquí)', !!l1 && !!l2, 'no se encontraron');
// Devuelve { htmlWith, CD_START, CD_END } para un HTML dado, con el código de city_scenes.cjs.
const helper = (html) => vm.runInNewContext('(function () {\n' + l1 + '\n' + l2 + '\nreturn { htmlWith: htmlWith, CD_START: CD_START, CD_END: CD_END }; })()', { html });
const wrap = (json) => '<!doctype html><script>\n  var A = 1;\n  var CITY_DATA = ' + json + ';\n  /*__CITY_CODE__*/ var B = "x;\\ny";\n</script>';

const HOSTILE = {
  lt: '</script><!-- <b>x</b> <', amp: '$& $1 $\' $` $$ $<x>', semi: 'a;\nb;\r\nc; \nd', quote: 'él dijo "hola" \\ y \'adiós\'', emoji: 'ñandú 😀 🧑\u200D💻 日本語', ls: 'a\u2028b\u2029c',
  nul: 'a\u0000b', end: ';\n  /*__CITY_CODE__*/ var X = 1;\n', nested: { '<k>': ['</script>', 1, null, true, { '$&': ';\n' }] }
};

if (l1 && l2) {
  const plain = wrap('{"districts":{"M02":{"name":"x"}},"order":["M02"]}');
  { const h = helper(plain), back = h.htmlWith(JSON.parse(plain.slice(h.CD_START, h.CD_END)));
    ok('ida y vuelta exacta en un HTML sintético: reescribir los mismos datos devuelve el mismo texto', back === plain, back.slice(0, 120)); }
  for (const [k, v] of Object.entries(HOSTILE)) {
    const data = { districts: { M02: { name: 'x', celebrate: { text: v } } }, order: ['M02'] };
    const h = helper(plain), out = h.htmlWith(data), start = out.indexOf('var CITY_DATA = ') + 'var CITY_DATA = '.length;
    const h2 = helper(out), parsed = (() => { try { return JSON.parse(out.slice(h2.CD_START, h2.CD_END)); } catch (e) { return 'NO PARSEA: ' + e.message; } })();
    ok(`datos con ${k}: la reescritura se vuelve a leer idéntica (el corte no se desplaza) y el HTML de antes y de después del trozo queda intacto`,
      JSON.stringify(parsed) === JSON.stringify(data) && out.startsWith(plain.slice(0, h.CD_START)) && out.endsWith(plain.slice(h.CD_END)) && start === h.CD_START, typeof parsed === 'string' ? parsed : out.slice(0, 200));
    if (/[<]/.test(JSON.stringify(data))) {
      const body = out.slice(h.CD_START, out.indexOf(';\n  /*__CITY_CODE__*/'));
      ok(`datos con ${k}: ningún "<" queda sin escapar dentro del script (no puede cerrar el <script> ni abrir <!--)`, !body.includes('<') && !/<\/script>/i.test(body) && !body.includes('<!--'), body.slice(0, 200));
    }
  }
  { const data = { t: '$&$&', u: "$'" }, h = helper(plain), out = h.htmlWith(data);
    ok('el texto del reemplazo no se interpreta como patrón: "$&" y "$\'" salen literales (por eso se concatena en vez de usar replace con texto)', out.includes('"t":"$&$&"') && out.includes('"u":"$\'"'), out.slice(0, 200)); }
  { const h = helper(wrap('{"a":"</x>"}')), out = h.htmlWith({ a: '</x>' });
    ok('si el HTML original ya traía "<" sin escapar en los datos, la reescritura lo deja escapado y sigue siendo JSON válido', out.includes('\\u003c/x>') && JSON.parse(out.slice(h.CD_START, helper(out).CD_END)).a === '</x>', out); }
  { const raw = wrap('{"a":1}'), h = helper(raw), h2 = helper(h.htmlWith({ a: 'x;\ny' }));
    ok('un ";\\n" dentro de un texto no se confunde con el final de la asignación (JSON.stringify lo escapa como \\n)', h2.CD_END > h2.CD_START && JSON.parse(h.htmlWith({ a: 'x;\ny' }).slice(h2.CD_START, h2.CD_END)).a === 'x;\ny', ''); }
  { let threw = null; try { const h = helper('<html>sin datos;\n</html>'); h.htmlWith({}); JSON.parse('<html>sin datos;\n</html>'.slice(h.CD_START, h.CD_END)); } catch (e) { threw = e; }
    ok('un HTML sin "var CITY_DATA = " no se reescribe en silencio: leer sus datos lanza (city_scenes se detiene en vez de probar con datos falsos)', threw !== null, 'no lanzó'); }
}

// ---- con el HTML real ----
const html = fs.readFileSync(path.join(root, 'juego_estudio.html'), 'utf8');
const P = 'var CITY_DATA = ';
ok('el HTML real tiene un único "var CITY_DATA = " (indexOf toma el primero: si hubiera otro antes, se reescribiría el equivocado)', html.split(P).length === 2, String(html.split(P).length - 1));
if (l1 && l2) {
  const h = helper(html), data = JSON.parse(html.slice(h.CD_START, h.CD_END));
  ok('HTML real: reescribir los datos sin borrar nada reproduce el HTML byte a byte', h.htmlWith(data) === html, 'difiere');
  const noM09 = JSON.parse(html.slice(h.CD_START, h.CD_END)); delete noM09.districts.M09;
  const out = h.htmlWith(noM09), h2 = helper(out), re = JSON.parse(out.slice(h2.CD_START, h2.CD_END));
  ok('HTML real sin M09: 9 distritos, el orden y los portales siguen igual (M09 queda como muro con módulo), solo cambia el trozo de los datos', Object.keys(re.districts).length === 9 && !re.districts.M09 && re.order.join() === data.order.join()
    && re.plaza.portals.some((p) => p.dist === 'M09') && out.startsWith(html.slice(0, h.CD_START)) && out.endsWith(html.slice(h.CD_END)) && out.length < html.length, Object.keys(re.districts).join());
  ok('HTML real sin M09: el original no se muta (otro JSON.parse del HTML real sigue trayendo los 10) y borrar un distrito dos veces es lo mismo que una', Object.keys(data.districts).length === 10 && h.htmlWith(noM09) === out, '');
  // el escape de build.mjs: el mismo reemplazo de "<" y el mismo cierre ";\n"
  const build = fs.readFileSync(path.join(root, 'build.mjs'), 'utf8');
  ok('el escape de htmlWith es el de build.mjs (replace(/</g, "\\\\u003c") sobre JSON.stringify) y el cierre es ";\\n"', build.includes("JSON.stringify(cityData).replace(/</g, '\\\\u003c') + ';\\n") && /JSON\.stringify\(data\)\.replace\(\/<\/g, '\\\\u003c'\)/.test(l2), l2.slice(0, 160));
}

const fails = results.filter((r) => r[0] === 'FAIL');
results.forEach((r) => console.log(r.join(' | ')));
console.log(fails.length ? 'CITY_SCENES_REWRITE_GAPS FALLAS ' + fails.length : 'CITY_SCENES_REWRITE_GAPS OK (' + results.length + ' comprobaciones)');
process.exit(fails.length ? 1 : 0);
