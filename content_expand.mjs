// Expande el formato compacto de autoría (content*.mjs) al esquema A2. La rotación de la posición correcta es local a cada módulo,
// así M01 queda idéntico a su versión publicada. Lo usan build.mjs, validate.mjs y las pruebas (nunca va al HTML tal cual).
const pad = (n) => String(n).padStart(3, '0');

export function expandModule(id, title, c) {
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
  return { id, title, topics: c.topics, questions };
}

// Texto JS (con sangría) que build.mjs pega dentro del HTML.
export function moduleSource(m) {
  const ind = (s, n) => ' '.repeat(n) + s;
  return [
    ind('{', 2),
    ind(`id: ${JSON.stringify(m.id)},`, 4),
    ind(`title: ${JSON.stringify(m.title)},`, 4),
    ind('topics: [', 4),
    ...m.topics.map((t) => ind(JSON.stringify(t) + ',', 6)),
    ind('],', 4),
    ind('questions: [', 4),
    ...m.questions.map((q) => ind(JSON.stringify(q) + ',', 6)),
    ind(']', 4),
    ind('},', 2),
  ].join('\n');
}
