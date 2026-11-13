// Datos de "Ciudad Núcleo" (solo datos): plaza, distrito del Taller Comunal (M02), rangos y villanos de M01 guardados.
// Las posiciones salen de calles del distrito (nunca dentro de una manzana de edificios) con separación >= 7 m.

// ---- calles del distrito M02 ----
const BLOCK_X = [-42, -14, 14, 42], BLOCK_Z = [-66, -94, -122, -150];       // centros de manzana (20 x 20)
const STREET_X = [-28, 0, 28], STREET_Z = [-80, -108, -136];               // ejes de calle
const taken = [];
function free(x, z, min) { return taken.every((p) => Math.hypot(p.x - x, p.z - z) >= min); }
function spot(x, z) { taken.push({ x, z }); return { x, z }; }
// fijos que reservan lugar (se declaran antes de repartir el resto)
const tower = { id: 'torre', ...spot(0, -162), w: 8, d: 8, h: 20 };
const bridge = { id: 'puente', ...spot(0, -178), w: 6, d: 10, to: 'M04' };
const spots = [];
for (const z of STREET_Z) for (let x = -52; x <= 52; x += 8) if (free(x, z, 7)) { spots.push(spot(x, z)); }
for (const x of STREET_X) for (let z = -58; z >= -170; z -= 8) if (free(x, z, 7)) { spots.push(spot(x, z)); }
let next = 0;
const take = () => spots[next++];

const MENTOR_NAMES = ['Ana', 'Bruno', 'Carla', 'Diego', 'Elena', 'Fermín', 'Gala', 'Héctor', 'Inés', 'Joaquín', 'Karla', 'Luis',
  'Marta', 'Nico', 'Olga', 'Pablo', 'Quino', 'Rosa', 'Sergio', 'Tere', 'Ulises', 'Vera', 'Wilfredo'];
const pad = (n) => String(n).padStart(2, '0');
const mentors = MENTOR_NAMES.map((name, i) => ({ id: 'm' + pad(i + 1), topic: 'T' + pad(i + 1), name, ...take() }));

const creatures = [
  { id: 'bit', name: 'Bit Errante', topics: ['T01', 'T02', 'T03'] },
  { id: 'silicio', name: 'Cuello de Silicio', topics: ['T04', 'T05', 'T10'] },
  { id: 'kernel', name: 'Kernel en Pánico', topics: ['T06', 'T07', 'T08', 'T09'] },
  { id: 'eco', name: 'Eco Roto', topics: ['T12', 'T13', 'T14', 'T15', 'T16'] },
  { id: 'huerfano', name: 'Dato Huérfano', topics: ['T11', 'T17', 'T18', 'T19', 'T20'] },
  { id: 'alucina', name: 'Alucinación', topics: ['T21', 'T22', 'T23'] }
].map((c) => { const p = take(); return { ...c, area: { x: p.x, z: p.z, r: 6 } }; });

const REPAIRS = [['T01', 'semáforo'], ['T02', 'puerta de arranque'], ['T05', 'grúa trabada'], ['T06', 'terminal con humo'], ['T09', 'candado roto'],
  ['T10', 'farol apagado'], ['T13', 'buzón sin dirección'], ['T14', 'letrero borrado'], ['T15', 'ventanilla de peticiones'], ['T16', 'cerradura sin llave']];
const repairs = REPAIRS.map(([topic, label], i) => ({ id: 'r' + pad(i + 1), topic, label, ...take() }));

const APPRENTICES = [['Abril', 'T05', 'explain'], ['Beto', 'T06', 'correct'], ['Cleo', 'T07', 'explain'], ['Dani', 'T08', 'correct'], ['Emi', 'T09', 'explain'],
  ['Fabi', 'T10', 'explain'], ['Gael', 'T12', 'explain'], ['Hugo', 'T13', 'correct'], ['Ivana', 'T14', 'explain'], ['Jano', 'T15', 'correct'],
  ['Kiko', 'T16', 'explain'], ['Lola', 'T20', 'correct']];
const apprentices = APPRENTICES.map(([name, topic, mode], i) => ({ id: 'a' + pad(i + 1), topic, name, mode, ...take() }));
if (next > spots.length) throw new Error('faltan lugares en las calles del distrito');

// ---- plaza: 10 muros de La Maraña a r = 38 (el norte, hacia M02, queda libre) ----
const WALL_DIST = ['M04', 'M03', 'M08', 'M06', 'M07', 'M05', 'M01', 'M11', 'M10', 'M09'];
const roads = WALL_DIST.map((dist, k) => {
  const angle = Math.round((-90 + 33 * (k + 1)) * 100) / 100, a = angle * Math.PI / 180;
  return { dist, angle, wall: { x: Math.round(38 * Math.cos(a) * 100) / 100, z: Math.round(38 * Math.sin(a) * 100) / 100, w: 6, d: 2, h: 4 } };
});

export const city = {
  ranks: [[0, 'Becario'], [1, 'Junior'], [3, 'Semi-senior'], [6, 'Senior'], [8, 'Arquitecto'], [11, 'Tech Lead']],
  bounds: { minX: -70, maxX: 70, minZ: -195, maxZ: 40 }, radius: 0.4,
  spawn: { x: 0, z: 8, yaw: 0 },
  plaza: {
    r: 30, hq: { x: 0, z: -14, w: 14, d: 10, h: 9 },
    director: { id: 'iris', name: 'Iris', x: -6, z: -4 }, mirror: { id: 'espejo', name: 'Espejo', x: 6, z: -4 }, roads
  },
  streets: { x: STREET_X, z: STREET_Z },
  districts: {
    M02: {
      name: 'Taller Comunal', seed: 7, rect: { minX: -60, maxX: 60, minZ: -185, maxZ: -50 },
      blocks: BLOCK_X.flatMap((x) => BLOCK_Z.map((z) => [x, z])),
      mentors, creatures, repairs, apprentices, tower, bridge, need: 8
    }
  }
};
