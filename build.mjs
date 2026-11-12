import fs from 'node:fs';
import * as c1 from './content.mjs';
import * as c2 from './content_m02.mjs';
import * as c3 from './content_m03.mjs';
import * as c4 from './content_m04.mjs';
import * as c5 from './content_m05.mjs';
import * as c6 from './content_m06.mjs';
import * as c7 from './content_m07.mjs';
import * as c8 from './content_m08.mjs';
import * as c9 from './content_m09.mjs';
import * as c10 from './content_m10.mjs';
import { stations as tripStations } from './trip/stations.mjs';
import { city as cityData } from './city/districts.mjs';

const pad = (n) => String(n).padStart(3, '0');

// Expande el formato compacto al esquema A2. La rotación de la posición correcta
// es local a cada módulo, así M01 queda idéntico a su versión publicada.
function expand(id, title, c) {
  let rot = 0;
  const place = (correct, wrong) => {
    const idx = rot++ % 4;
    const options = wrong.slice();
    options.splice(idx, 0, correct);
    return { options, answer: idx };
  };
  const questions = [];
  c.mcq.forEach(([topic, difficulty, prompt, ok, bad, explanation], i) => {
    questions.push({ id: `${id}-Q${pad(i + 1)}`, topic, type: 'mcq', difficulty, prompt, ...place(ok, bad), explanation });
  });
  c.tf.forEach(([topic, difficulty, prompt, answer, explanation], i) => {
    questions.push({ id: `${id}-V${pad(i + 1)}`, topic, type: 'tf', difficulty, prompt, answer, explanation });
  });
  c.scenario.forEach(([topic, difficulty, prompt, ok, bad, explanation], i) => {
    questions.push({ id: `${id}-S${pad(i + 1)}`, topic, type: 'scenario', difficulty, prompt, ...place(ok, bad), explanation });
  });
  c.error.forEach(([topic, difficulty, frag, ok, bad, explanation], i) => {
    questions.push({
      id: `${id}-E${pad(i + 1)}`, topic, type: 'error', difficulty,
      prompt: `Este fragmento contiene un error:\n“${frag}”\n¿Cuál es el error?`,
      ...place(ok, bad), explanation,
    });
  });
  const ind = (s, n) => ' '.repeat(n) + s;
  return [
    ind('{', 2),
    ind(`id: ${JSON.stringify(id)},`, 4),
    ind(`title: ${JSON.stringify(title)},`, 4),
    ind('topics: [', 4),
    ...c.topics.map((t) => ind(JSON.stringify(t) + ',', 6)),
    ind('],', 4),
    ind('questions: [', 4),
    ...questions.map((q) => ind(JSON.stringify(q) + ',', 6)),
    ind(']', 4),
    ind('},', 2),
  ].join('\n');
}

const m1 = expand('M01', 'Diseño de sistemas', c1);
const m2 = expand('M02', 'Fundamentos de ingeniería de software', c2);
const m3 = expand('M03', 'Fundamentos de internet', c3);
const m4 = expand('M04', 'Historia de la programación', c4);
const m5 = expand('M05', 'Patrones de diseño', c5);
const m6 = expand('M06', 'Programación orientada a objetos', c6);
const m7 = expand('M07', 'Principios SOLID', c7);
const m8 = expand('M08', 'Redes informáticas', c8);
const m9 = expand('M09', 'IA para ingeniería de software', c9);
const m10 = expand('M10', 'Ciberseguridad', c10);

const tpl = fs.readFileSync(new URL('./engine.html', import.meta.url), 'utf8');
const anchor = '/*__MODULES__*/\n  // === MODULE:M01 END ===';
if (!tpl.includes(anchor)) throw new Error('falta el ancla del motor');
let out = tpl.replace(
  anchor,
  `${m1}\n  // === MODULE:M01 END ===\n  // === MODULE:M02 START ===\n${m2}\n  // === MODULE:M02 END ===\n  // === MODULE:M03 START ===\n${m3}\n  // === MODULE:M03 END ===\n  // === MODULE:M04 START ===\n${m4}\n  // === MODULE:M04 END ===\n  // === MODULE:M05 START ===\n${m5}\n  // === MODULE:M05 END ===\n  // === MODULE:M06 START ===\n${m6}\n  // === MODULE:M06 END ===\n  // === MODULE:M07 START ===\n${m7}\n  // === MODULE:M07 END ===\n  // === MODULE:M08 START ===\n${m8}\n  // === MODULE:M08 END ===\n  // === MODULE:M09 START ===\n${m9}\n  // === MODULE:M09 END ===\n  // === MODULE:M10 START ===\n${m10}\n  // === MODULE:M10 END ===`
);
// Viaje 3D: datos de estaciones y ancla para el código del viaje (flow.js / scene.js)
if (!out.includes('/*__TRIP__*/')) throw new Error('falta el ancla /*__TRIP__*/ del motor');
out = out.replace('/*__TRIP__*/', () => 'var TRIP_STATIONS = ' + JSON.stringify(tripStations) + ';\n  /*__TRIP_CODE__*/');
const three3d = fs.readFileSync(new URL('./three/shared.js', import.meta.url), 'utf8');
const tripFlow = fs.readFileSync(new URL('./trip/flow.js', import.meta.url), 'utf8');
const tripScene = fs.readFileSync(new URL('./trip/scene.js', import.meta.url), 'utf8');
out = out.replace('/*__TRIP_CODE__*/', () => three3d + '\n' + tripFlow + '\n' + tripScene + '\n  /*__TRIP_CODE__*/');
out = out.split('/*__TRIP_CODE__*/').join('');
// Ciudad Núcleo: datos y anclas (CITY antes de fresh(); CITY_VIEW después del viaje)
for (const a of ['/*__CITY__*/', '/*__CITY_VIEW__*/']) if (!out.includes(a)) throw new Error('falta el ancla ' + a + ' del motor');
out = out.replace('/*__CITY__*/', () => 'var CITY_DATA = ' + JSON.stringify(cityData) + ';\n  /*__CITY_CODE__*/');
const cityMove = fs.readFileSync(new URL('./city/move.js', import.meta.url), 'utf8');
const cityStory = fs.readFileSync(new URL('./city/story.js', import.meta.url), 'utf8');
out = out.replace('/*__CITY_CODE__*/', () => cityMove + '\n' + cityStory + '\n  /*__CITY_CODE__*/');
out = out.replace('/*__CITY_VIEW__*/', () => '/*__CITY_VIEW_CODE__*/');
out = out.split('/*__CITY_CODE__*/').join('').split('/*__CITY_VIEW_CODE__*/').join('');

// Three.js r169 como texto inerte (se importa solo al entrar al viaje)
const threePath = process.env.THREE_VENDOR || new URL('./vendor/three.module.min.js', import.meta.url);
const threeSrc = fs.readFileSync(threePath, 'utf8');
if (/<\/script/i.test(threeSrc)) throw new Error('vendor: contiene </script');
if (/<!--/.test(threeSrc)) throw new Error('vendor: contiene <!--');
if (/from\s*["']\.\//.test(threeSrc)) throw new Error('vendor: import relativo');
if (!out.includes('<!--__THREE__-->')) throw new Error('falta el ancla <!--__THREE__--> del motor');
out = out.replace('<!--__THREE__-->', () => '<!-- VENDOR:THREE START --><script type="text/plain" id="three-src" data-version="0.169.0">' + threeSrc + '</script><!-- VENDOR:THREE END -->');
fs.writeFileSync(new URL('./juego_estudio.html', import.meta.url), out);
console.log('OK');
