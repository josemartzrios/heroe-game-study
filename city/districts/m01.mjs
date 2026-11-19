// Distrito M01: Ciudadela Escalable (Diseño de sistemas). Solo datos. Formato: spec 2026-11-12-ciudad-distritos-design.md §4.2; contenido: spec 2026-11-17-ciudad-tanda-2-design.md.
import { standardFrame, people } from '../layout.mjs';

const { lay, tower, entry, exit, bounds, streets, blocks } = standardFrame();

const MENTOR_NAMES = ['Adrián', 'Blanca', 'Camilo', 'Débora', 'Eduardo', 'Fernanda', 'Gerardo', 'Hilda', 'Ignacio', 'Josefina', 'Leandro', 'Marina', 'Norberto', 'Octavia',
  'Pascual', 'Raquel', 'Samuel', 'Tania', 'Úrsula'];

const CREATURES = [
  { id: 'latencia', name: 'Latencia Eterna', topics: ['T01', 'T02', 'T03'] },
  { id: 'embudo', name: 'Embudo Saturado', topics: ['T04', 'T06', 'T17'] },
  { id: 'rebelde', name: 'Réplica Rebelde', topics: ['T07', 'T08', 'T09', 'T12'] },
  { id: 'rancia', name: 'Caché Rancia', topics: ['T10', 'T14'] },
  { id: 'desparramado', name: 'Dato Desparramado', topics: ['T05', 'T11', 'T13'] },
  { id: 'cascada', name: 'Fallo en Cascada', topics: ['T15', 'T16', 'T18', 'T19'] }
];

const REPAIRS = [['T03', 'el proxy mal configurado'], ['T05', 'la base de datos equivocada'], ['T08', 'la réplica atrasada'], ['T09', 'el shard sobrecargado'],
  ['T10', 'la caché desactualizada'], ['T12', 'la red partida en dos'], ['T16', 'la cola de mensajes atascada'], ['T19', 'el cobro duplicado']];

const APPRENTICES = [['Alba', 'T01', 'explain'], ['Bastián', 'T02', 'explain'], ['Cris', 'T04', 'correct'], ['Dino', 'T06', 'explain'], ['Ema', 'T08', 'correct'],
  ['Fito', 'T09', 'correct'], ['Gia', 'T12', 'correct'], ['Iara', 'T14', 'explain'], ['Joel', 'T15', 'explain'], ['Kai', 'T18', 'correct']];
const { mentors, creatures, repairs, apprentices } = people(lay, { mentors: MENTOR_NAMES, creatures: CREATURES, repairs: REPAIRS, apprentices: APPRENTICES });

export const district = {
  id: 'M01', name: 'Ciudadela Escalable', colors: { a: '#d580ff', b: '#5ce1ff' }, style: 'red', seed: 17,
  bounds, entry, exit, streets, blocks,
  mentors, creatures, repairs, apprentices, tower, need: 7,
  celebrate: { text: 'La Ciudadela Escalable aguanta la hora pico: ningún servidor carga solo con todo.' }
};
