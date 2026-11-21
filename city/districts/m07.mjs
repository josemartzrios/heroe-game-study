// Distrito M07: Cinco Calles (Principios SOLID). Solo datos. Formato: spec 2026-11-12-ciudad-distritos-design.md §4.2; contenido: spec 2026-11-18-ciudad-tanda-3-design.md.
import { standardFrame, people } from '../layout.mjs';

const { lay, tower, entry, exit, bounds, streets, blocks } = standardFrame();

const MENTOR_NAMES = ['Amelia', 'Bautista', 'Constanza', 'Domingo', 'Eugenia', 'Fulgencio', 'Guadalupe', 'Hipólito', 'Ingrid', 'Jerónimo', 'Leonor', 'Moisés', 'Nora'];

const CREATURES = [
  { id: 'caos', name: 'Diseño Caótico', topics: ['T01', 'T02', 'T13'] },   // primera: el objetivo guiado empieza en T01
  { id: 'dios', name: 'Clase Dios', topics: ['T03', 'T04'] },
  { id: 'rigido', name: 'Código Rígido', topics: ['T05', 'T06'] },
  { id: 'impostora', name: 'Subclase Impostora', topics: ['T07', 'T08'] },
  { id: 'gorda', name: 'Interfaz Gorda', topics: ['T09', 'T10'] },
  { id: 'mandon', name: 'Detalle Mandón', topics: ['T11', 'T12'] }
];

const REPAIRS = [['T01', 'el software frágil'], ['T02', 'el acrónimo olvidado'], ['T04', 'la clase que hace de todo'], ['T06', 'el switch interminable'],
  ['T08', 'el pato de juguete'], ['T09', 'la interfaz gigante'], ['T10', 'el control con mil botones'], ['T12', 'la base de datos soldada'],
  ['T13', 'el código que huele mal']];

const APPRENTICES = [['Asier', 'T01', 'explain'], ['Blas', 'T02', 'correct'], ['Cande', 'T03', 'explain'], ['Dámaso', 'T05', 'explain'], ['Elvira', 'T06', 'correct'],
  ['Fidel', 'T07', 'explain'], ['Gisela', 'T08', 'correct'], ['Hilario', 'T09', 'correct'], ['Ion', 'T11', 'explain'], ['Rubén', 'T12', 'correct']];
const { mentors, creatures, repairs, apprentices } = people(lay, { mentors: MENTOR_NAMES, creatures: CREATURES, repairs: REPAIRS, apprentices: APPRENTICES });

export const district = {
  id: 'M07', name: 'Cinco Calles', colors: { a: '#ffd1a1', b: '#e05cff' }, style: 'red', seed: 31,
  bounds, entry, exit, streets, blocks,
  mentors, creatures, repairs, apprentices, tower, need: 7,
  celebrate: { text: 'Cinco Calles vuelve a ordenarse: cada principio SOLID tiene su calle.' }
};
