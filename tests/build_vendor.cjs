// Protecciones de build.mjs contra un vendor peligroso (</script, import relativo, <!--) y bloque three-src.
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const root = path.join(__dirname, '..');
const out = path.join(root, 'juego_estudio.html');
const results = [];
const ok = (name, cond, extra) => { results.push([cond ? 'PASS' : 'FAIL', name, extra || '']); };
function build(vendorText) {
  const env = Object.assign({}, process.env);
  let tmp = null;
  if (vendorText !== undefined) { tmp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'vend-')), 'v.js'); fs.writeFileSync(tmp, vendorText); env.THREE_VENDOR = tmp; }
  return spawnSync('node', ['build.mjs'], { cwd: root, env, encoding: 'utf8' });
}

// Primero un build bueno: deja el HTML en un estado conocido
let r0 = build();
ok('base build sin THREE_VENDOR sale con código 0', r0.status === 0, 'status=' + r0.status + ' ' + (r0.stderr || '').slice(-200));
for (const [name, text] of [['a contenido con </script', 'x</script>y'], ['b import relativo', 'import a from"./three.core.min.js";'], ['c contiene <!--', 'a<!--b']]) {
  const before = fs.statSync(out).mtimeMs, size = fs.statSync(out).size;
  const r = build(text);
  ok(name + ': build sale con código distinto de 0', r.status !== 0, 'status=' + r.status);
  ok(name + ': juego_estudio.html no cambia', fs.statSync(out).mtimeMs === before && fs.statSync(out).size === size);
}
// Build final: bloque correcto y $& literal
const r1 = build();
ok('build final sale con código 0', r1.status === 0, (r1.stderr || '').slice(-200));
const html = fs.readFileSync(out, 'utf8');
const blk = html.match(/<!-- VENDOR:THREE START -->([\s\S]*?)<!-- VENDOR:THREE END -->/);
ok('el HTML contiene el bloque VENDOR:THREE', !!blk);
ok('el bloque lleva id="three-src" y data-version="0.169.0"', !!blk && blk[1].includes('id="three-src" data-version="0.169.0"') && blk[1].includes('type="text/plain"'));
const vendor = fs.readFileSync(path.join(root, 'vendor', 'three.module.min.js'), 'utf8');
ok('el vendor completo está dentro del bloque, sin expandir $&', !!blk && blk[1].includes(vendor) && vendor.includes('$&'), 'len=' + (blk ? blk[1].length : 0));

results.forEach((r) => console.log(r.join(' | ')));
const fails = results.filter((r) => r[0] === 'FAIL').length;
console.log(fails ? `\n${fails} FALLOS` : '\nBUILD_VENDOR OK (' + results.length + ' comprobaciones)');
process.exit(fails ? 1 : 0);
