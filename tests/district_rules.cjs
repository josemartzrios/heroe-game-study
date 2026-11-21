// Reglas entre distritos en un solo lugar: nombres de personas que suenan igual, colores propios, seeds y nombres de distrito únicos.
// Las importan tanda2_feasibility, tanda3_feasibility, adv/tanda3_attack y adv/tanda3_plan_attack (probadas en district_rules_test.cjs).

// Sin invisibles (ancho cero, guion blando), con ancho completo en su forma normal, sin acentos y en minúsculas.
const fold = (s) => String(s).normalize('NFKC').replace(/\p{Cf}/gu, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

// Cómo suena un nombre en español, sin acentos y en minúsculas. El orden importa: ch es un sonido propio (marca \u0001, no pasa por c ni h);
// gue/gui suenan /ge/ /gi/ (marca \u0002, no pasan por g+e/i → j); luego c y g suaves, h muda, z → s, v → b, x → j, ll/y → i y letras repetidas → una.
function phon(name) {
  return fold(name)
    .replace(/ch/g, '\u0001').replace(/qu/g, 'k').replace(/gu(?=[ei])/g, '\u0002')
    .replace(/c(?=[ei])/g, 's').replace(/c/g, 'k').replace(/g(?=[ei])/g, 'j')
    .replace(/h/g, '').replace(/\u0001/g, 'ch').replace(/\u0002/g, 'g')
    .replace(/z/g, 's').replace(/v/g, 'b').replace(/x/g, 'j').replace(/ll/g, 'i').replace(/y/g, 'i')
    .replace(/(.)\1+/g, '$1');
}

// Dos nombres se parecen si suenan igual o comparten el inicio de k = min(4, largo de cada forma) letras, con k >= 3.
function namesNear(a, b) {
  const A = phon(a), B = phon(b);
  if (A === B) return true;
  const k = Math.min(4, A.length, B.length);
  return k >= 3 && A.slice(0, k) === B.slice(0, k);
}

// Pares que ya estaban en el juego antes de esta regla (M02, M08, M03) y suenan igual: no se reportan.
const INHERITED = [['Carla', 'Karla'], ['Elena', 'Helena']];

// Problemas entre las personas (mentores y aprendices) de todos los distritos: nombres de menos de 3 letras y pares que se parecen.
function nameClashes(districts) {
  const people = Object.entries(districts).flatMap(([id, d]) => [...d.mentors, ...d.apprentices].map((p) => [p.name, id]));
  const out = people.filter(([n]) => fold(n).length < 3).map(([n, id]) => n + '(' + id + ') tiene menos de 3 letras');
  for (let i = 0; i < people.length; i++) for (let j = i + 1; j < people.length; j++) {
    const [a, ia] = people[i], [b, ib] = people[j];
    if (namesNear(a, b) && !INHERITED.some(([x, y]) => (a === x && b === y) || (a === y && b === x))) out.push(a + '(' + ia + ')/' + b + '(' + ib + ')');
  }
  return out;
}

// Distritos cuyos dos colores los usa también otro distrito (cada uno debe tener al menos un color propio; #AABBCC y #aabbcc son el mismo).
const lower = (c) => String(c).toLowerCase();
function ownColorProblems(districts) {
  return Object.entries(districts).filter(([id, d]) => {
    const others = Object.entries(districts).filter(([k]) => k !== id).flatMap(([, o]) => [lower(o.colors.a), lower(o.colors.b)]);
    return others.includes(lower(d.colors.a)) && others.includes(lower(d.colors.b));
  }).map(([id, d]) => id + ' ' + d.colors.a + ' ' + d.colors.b);
}

// Valores repetidos de un campo de distrito (key: 'seed' o 'name').
function repeated(districts, key) {
  const seen = new Set(), dup = [];
  for (const d of Object.values(districts)) { if (seen.has(d[key])) dup.push(d[key]); seen.add(d[key]); }
  return dup;
}

module.exports = { phon, namesNear, nameClashes, ownColorProblems, repeated };
