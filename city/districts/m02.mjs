// Distrito M02: Taller Comunal (solo datos). Formato: spec 2026-11-12-ciudad-distritos-design.md §4.2.
import { makeLayout } from '../layout.mjs';

const BLOCK_X = [-42, -14, 14, 42], BLOCK_Z = [-66, -94, -122, -150];   // centros de manzana (20 x 20)
const STREET_X = [-28, 0, 28], STREET_Z = [-80, -108, -136];            // ejes de calle
const tower = { id: 'torre', x: 0, z: -162, w: 8, d: 8, h: 20 };
const lay = makeLayout({ reserve: [[tower.x, tower.z]], streetX: STREET_X, streetZ: STREET_Z, xRange: [-52, 52], zRange: [-58, -170] });
const take = () => lay.take();
const pad = (n) => String(n).padStart(2, '0');

const MENTOR_NAMES = ['Ana', 'Bruno', 'Carla', 'Diego', 'Elena', 'Fermín', 'Gala', 'Héctor', 'Inés', 'Joaquín', 'Karla', 'Luis',
  'Marta', 'Nico', 'Olga', 'Pablo', 'Quino', 'Rosa', 'Sergio', 'Tere', 'Ulises', 'Vera', 'Wilfredo'];
const mentors = MENTOR_NAMES.map((name, i) => ({ id: 'm' + pad(i + 1), topic: 'T' + pad(i + 1), name, ...take() }));

const creatures = [
  { id: 'bit', name: 'Bit Errante', topics: ['T01', 'T02', 'T03'] },
  { id: 'silicio', name: 'Cuello de Silicio', topics: ['T04', 'T05', 'T10'] },
  { id: 'kernel', name: 'Kernel en Pánico', topics: ['T06', 'T07', 'T08', 'T09'] },
  { id: 'eco', name: 'Eco Roto', topics: ['T12', 'T13', 'T14', 'T15', 'T16'] },
  { id: 'huerfano', name: 'Dato Huérfano', topics: ['T11', 'T17', 'T18', 'T19', 'T20'] },
  { id: 'alucina', name: 'Alucinación', topics: ['T21', 'T22', 'T23'] }
].map((c) => { const p = take(); return { ...c, area: { x: p.x, z: p.z, r: 6 } }; });

const REPAIRS = [['T01', 'el semáforo'], ['T02', 'la puerta de arranque'], ['T05', 'la grúa trabada'], ['T06', 'la terminal con humo'], ['T09', 'el candado roto'],
  ['T10', 'el farol apagado'], ['T13', 'el buzón sin dirección'], ['T14', 'el letrero borrado'], ['T15', 'la ventanilla de peticiones'], ['T16', 'la cerradura sin llave']];
const repairs = REPAIRS.map(([topic, label], i) => ({ id: 'r' + pad(i + 1), topic, label, ...take() }));

const APPRENTICES = [['Abril', 'T05', 'explain'], ['Beto', 'T06', 'correct'], ['Cleo', 'T07', 'explain'], ['Dani', 'T08', 'correct'], ['Emi', 'T09', 'explain'],
  ['Fabi', 'T10', 'explain'], ['Gael', 'T12', 'explain'], ['Hugo', 'T13', 'correct'], ['Ivana', 'T14', 'explain'], ['Jano', 'T15', 'correct'],
  ['Kiko', 'T16', 'explain'], ['Lola', 'T20', 'correct']];
const apprentices = APPRENTICES.map(([name, topic, mode], i) => ({ id: 'a' + pad(i + 1), topic, name, mode, ...take() }));

export const district = {
  id: 'M02', name: 'Taller Comunal', colors: { a: '#5ce1ff', b: '#ff4fd8' }, style: 'taller', seed: 7,
  bounds: { minX: -60, maxX: 60, minZ: -185, maxZ: -44 },
  entry: { x: 0, z: -52, yaw: Math.PI }, exit: { x: 0, z: -47, w: 6, d: 2 },
  streets: { x: STREET_X, z: STREET_Z },
  blocks: BLOCK_X.flatMap((x) => BLOCK_Z.map((z) => [x, z])),
  mentors, creatures, repairs, apprentices, tower, need: 8,
  celebrate: { text: 'El Taller Comunal vuelve a funcionar y ya no depende de una sola persona.', power: { id: 'planos', name: 'Planos' } }
};
