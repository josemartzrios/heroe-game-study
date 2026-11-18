// Distrito M03: Barrio Byte (Fundamentos de internet). Solo datos. Formato: spec 2026-11-12-ciudad-distritos-design.md §4.2; contenido: spec 2026-11-17-ciudad-tanda-2-design.md.
import { makeLayout, people } from '../layout.mjs';

const BLOCK_X = [-42, -14, 14, 42], BLOCK_Z = [30, 2, -26, -54];   // centros de manzana (20 x 20)
const STREET_X = [-28, 0, 28], STREET_Z = [16, -12, -40];          // ejes de calle
const tower = { id: 'torre', x: 0, z: -64, w: 8, d: 8, h: 20 };
const entry = { x: 0, z: 52, yaw: 0 };
const lay = makeLayout({ reserve: [[tower.x, tower.z], [entry.x, entry.z]], streetX: STREET_X, streetZ: STREET_Z, xRange: [-52, 52], zRange: [52, -68] });

const MENTOR_NAMES = ['Abel', 'Bea', 'César', 'Dora', 'Ernesto', 'Frida', 'Gonzalo', 'Helena', 'Ismael', 'Jimena', 'Kevin', 'Lorena', 'Marco', 'Nadia', 'Omar', 'Pilar',
  'Quique', 'Romina'];

const CREATURES = [
  { id: 'bitflip', name: 'Bit Invertido', topics: ['T01', 'T02', 'T03'] },
  { id: 'mojibake', name: 'Mojibake', topics: ['T04', 'T05'] },
  { id: 'fantasma', name: 'Señal Fantasma', topics: ['T06', 'T07', 'T08', 'T16'] },
  { id: 'extraviado', name: 'DNS Extraviado', topics: ['T09', 'T11'] },
  { id: 'intermediario', name: 'Intermediario', topics: ['T13', 'T14'] },
  { id: 'atasco', name: 'Render Atascado', topics: ['T10', 'T12', 'T15', 'T17', 'T18'] }
];

const REPAIRS = [['T01', 'el panel de luces binario'], ['T04', 'el cartel sin acentos'], ['T05', 'la pantalla sin color'], ['T06', 'la fibra del fondo del mar'],
  ['T08', 'la pila de protocolos'], ['T11', 'la URL mal escrita'], ['T13', 'la petición sin respuesta'], ['T14', 'el certificado vencido'],
  ['T17', 'la página a medio dibujar']];

const APPRENTICES = [['Ari', 'T02', 'explain'], ['Brenda', 'T03', 'correct'], ['Coco', 'T06', 'correct'], ['Dalia', 'T07', 'explain'], ['Elio', 'T09', 'explain'],
  ['Fede', 'T10', 'correct'], ['Gema', 'T12', 'correct'], ['Ivo', 'T13', 'explain'], ['Jade', 'T16', 'explain'], ['Kira', 'T18', 'correct']];
const { mentors, creatures, repairs, apprentices } = people(lay, { mentors: MENTOR_NAMES, creatures: CREATURES, repairs: REPAIRS, apprentices: APPRENTICES });

export const district = {
  id: 'M03', name: 'Barrio Byte', colors: { a: '#c6ff4d', b: '#4d7cff' }, style: 'red', seed: 13,
  bounds: { minX: -60, maxX: 60, minZ: -70, maxZ: 60 },
  entry, exit: { x: 0, z: 57, w: 6, d: 2 },
  streets: { x: STREET_X, z: STREET_Z },
  blocks: BLOCK_X.flatMap((x) => BLOCK_Z.map((z) => [x, z])),
  mentors, creatures, repairs, apprentices, tower, need: 7,
  celebrate: { text: 'El Barrio Byte vuelve a hablar el idioma de internet: cada página llega completa.' }
};
