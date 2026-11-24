// Distrito M09: Laboratorio Neuronal (IA para ingeniería de software). Solo datos. Formato: spec 2026-11-12-ciudad-distritos-design.md §4.2; contenido: spec 2026-11-22-ciudad-tanda-4-design.md.
import { standardFrame, people } from '../layout.mjs';

const { lay, tower, entry, exit, bounds, streets, blocks } = standardFrame();

const MENTOR_NAMES = ['Anselmo', 'Berta', 'Clemente', 'Doroteo', 'Edurne', 'Gregorio', 'Hermenegildo', 'Ildefonso', 'Justino', 'Leocadia', 'Macario', 'Nazario',
  'Obdulia', 'Primitivo', 'Rosendo', 'Severino', 'Telmo', 'Urbano', 'Wenceslao'];

const CREATURES = [
  { id: 'loro', name: 'Loro Estocástico', topics: ['T01', 'T02', 'T19'] },   // primera: el objetivo guiado empieza en T01
  { id: 'desbordado', name: 'Contexto Desbordado', topics: ['T03', 'T04', 'T05'] },
  { id: 'ambiguo', name: 'Prompt Ambiguo', topics: ['T06', 'T07', 'T08'] },
  { id: 'vector', name: 'Vector Desorientado', topics: ['T09', 'T10', 'T11', 'T12'] },
  { id: 'agente', name: 'Agente Sin Freno', topics: ['T13', 'T14', 'T15'] },
  { id: 'factura', name: 'Factura Disparada', topics: ['T16', 'T17', 'T18'] }
];

const REPAIRS = [['T03', 'el contador de tokens'], ['T04', 'la memoria de corto plazo'], ['T05', 'el dial de temperatura'], ['T08', 'los ejemplos sin formato'],
  ['T11', 'el buscador de documentos'], ['T13', 'la caja de herramientas'], ['T14', 'el plan de tareas olvidado'], ['T15', 'el conector sin protocolo'],
  ['T16', 'el filtro de instrucciones']];

const APPRENTICES = [['Ainhoa', 'T01', 'explain'], ['Chema', 'T06', 'explain'], ['Gerva', 'T10', 'explain'], ['Iratxe', 'T12', 'explain'], ['Urko', 'T17', 'explain'],
  ['Mabel', 'T02', 'correct'], ['Nacho', 'T07', 'correct'], ['Quima', 'T09', 'correct'], ['Rita', 'T14', 'correct'], ['Sixto', 'T18', 'correct']];
const { mentors, creatures, repairs, apprentices } = people(lay, { mentors: MENTOR_NAMES, creatures: CREATURES, repairs: REPAIRS, apprentices: APPRENTICES });

export const district = {
  id: 'M09', name: 'Laboratorio Neuronal', colors: { a: '#36a3ff', b: '#f4f4ff' }, style: 'red', seed: 41,
  bounds, entry, exit, streets, blocks,
  mentors, creatures, repairs, apprentices, tower, need: 7,
  celebrate: { text: 'El Laboratorio Neuronal vuelve a pensar: cada respuesta del modelo se verifica antes de fiarse de ella.' }
};
