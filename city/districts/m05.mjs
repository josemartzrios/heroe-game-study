// Distrito M05: Mercado de Patrones (Patrones de diseño). Solo datos. Formato: spec 2026-11-12-ciudad-distritos-design.md §4.2; contenido: spec 2026-11-22-ciudad-tanda-4-design.md.
import { standardFrame, people } from '../layout.mjs';

const { lay, tower, entry, exit, bounds, streets, blocks } = standardFrame();

const MENTOR_NAMES = ['Adela', 'Benjamín', 'Celestino', 'Delfina', 'Eusebio', 'Farah', 'Gaspar', 'Higinio', 'Imelda', 'Josué', 'Lázaro', 'Matilde', 'Norma', 'Olegario',
  'Petra', 'Rafael', 'Salvador', 'Tadeo', 'Uriel', 'Vicente', 'Yolanda', 'Zacarías'];

const CREATURES = [
  { id: 'forzado', name: 'Patrón Forzado', topics: ['T01', 'T21', 'T22'] },   // primera: el objetivo guiado empieza en T01
  { id: 'caprichoso', name: 'Creador Caprichoso', topics: ['T02', 'T03', 'T04', 'T05', 'T06'] },
  { id: 'envoltorio', name: 'Envoltorio Infinito', topics: ['T07', 'T08', 'T09', 'T10'] },
  { id: 'arbol', name: 'Árbol Hueco', topics: ['T11', 'T12', 'T13'] },
  { id: 'chismoso', name: 'Observador Chismoso', topics: ['T14', 'T15', 'T16'] },
  { id: 'indeciso', name: 'Estado Indeciso', topics: ['T17', 'T18', 'T19', 'T20'] }
];

const REPAIRS = [['T02', 'el pedido a medio armar'], ['T03', 'el creador sin subclases'], ['T05', 'la instancia duplicada'], ['T07', 'el enchufe que no encaja'],
  ['T08', 'el café sin decorar'], ['T09', 'el mostrador de trámites'], ['T13', 'el portero dormido'], ['T16', 'el boletín sin suscriptores'],
  ['T18', 'la máquina expendedora']];

const APPRENTICES = [['Aitana', 'T01', 'explain'], ['Dafne', 'T08', 'explain'], ['Lara', 'T14', 'explain'], ['Maite', 'T17', 'explain'], ['Nerea', 'T21', 'explain'],
  ['Rocío', 'T04', 'correct'], ['Toño', 'T06', 'correct'], ['Vito', 'T11', 'correct'], ['Yago', 'T15', 'correct'], ['Zoe', 'T19', 'correct']];
const { mentors, creatures, repairs, apprentices } = people(lay, { mentors: MENTOR_NAMES, creatures: CREATURES, repairs: REPAIRS, apprentices: APPRENTICES });

export const district = {
  id: 'M05', name: 'Mercado de Patrones', colors: { a: '#ff4800', b: '#fff700' }, style: 'red', seed: 37,
  bounds, entry, exit, streets, blocks,
  mentors, creatures, repairs, apprentices, tower, need: 7,
  celebrate: { text: 'El Mercado de Patrones vuelve a abrir: cada problema encuentra su receta.' }
};
