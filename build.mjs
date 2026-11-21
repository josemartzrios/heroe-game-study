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
import { expandModule, moduleSource } from './content_expand.mjs';
import { city as cityData } from './city/districts.mjs';

// Expansión del formato compacto al esquema A2 (la rotación de la posición correcta es local a cada módulo,
// así M01 queda idéntico a su versión publicada). Vive en content_expand.mjs para que validate.mjs y las pruebas la importen
// sin ejecutar esta build.
const expand = (id, title, c) => moduleSource(expandModule(id, title, c));

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
// Ciudad Núcleo: datos y anclas (CITY antes de fresh(); CITY_VIEW dentro del motor)
for (const a of ['/*__CITY__*/', '/*__CITY_VIEW__*/']) if (!out.includes(a)) throw new Error('falta el ancla ' + a + ' del motor');
// el "<" se escapa para que ningún texto de los datos pueda cerrar el <script> ni abrir un comentario HTML
out = out.replace('/*__CITY__*/', () => 'var CITY_DATA = ' + JSON.stringify(cityData).replace(/</g, '\\u003c') + ';\n  /*__CITY_CODE__*/');
const cityMove = fs.readFileSync(new URL('./city/move.js', import.meta.url), 'utf8');
const cityStory = fs.readFileSync(new URL('./city/story.js', import.meta.url), 'utf8');
const cityTeach = fs.readFileSync(new URL('./city/teach.js', import.meta.url), 'utf8');
const cityInput = fs.readFileSync(new URL('./city/input.js', import.meta.url), 'utf8');
const cityRoute = fs.readFileSync(new URL('./city/route.js', import.meta.url), 'utf8');
const cityRouteView = fs.readFileSync(new URL('./city/route_view.js', import.meta.url), 'utf8');
out = out.replace('/*__CITY_CODE__*/', () => cityMove + '\n' + cityStory + '\n' + cityTeach + '\n' + cityInput + '\n' + cityRoute + '\n  /*__CITY_CODE__*/');
const cityView = fs.readFileSync(new URL('./city/view.js', import.meta.url), 'utf8');
const citySprites = fs.readFileSync(new URL('./city/sprites2d.js', import.meta.url), 'utf8');
const cityWorld2d = fs.readFileSync(new URL('./city/world2d.js', import.meta.url), 'utf8');
const cityIntro = fs.readFileSync(new URL('./city/intro.js', import.meta.url), 'utf8');
out = out.replace('/*__CITY_VIEW__*/', () => citySprites + '\n' + cityWorld2d + '\n' + cityView + '\n' + cityIntro + '\n' + cityRouteView + '\n  /*__CITY_VIEW_CODE__*/');
out = out.split('/*__CITY_CODE__*/').join('').split('/*__CITY_VIEW_CODE__*/').join('');

fs.writeFileSync(new URL('./juego_estudio.html', import.meta.url), out);
console.log('OK');
