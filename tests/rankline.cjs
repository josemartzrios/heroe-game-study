// cityRankLine de city/view.js (la función real, no una copia) para las pruebas del aviso de rango de la celebración.
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const CS = require('../city/story.js');

// Texto de una función de primer nivel (`function name(` hasta su llave de cierre en la columna 0), o null si el texto no la trae.
const grabFn = (src, name) => { const m = src.match(new RegExp('^function ' + name + '\\([\\s\\S]*?\\n}', 'm')); return m ? m[0] : null; };
const SRC = grabFn(fs.readFileSync(path.join(__dirname, '..', 'city', 'view.js'), 'utf8'), 'cityRankLine');

// cityRankLine(mids) atada al estado S (S.city.restored…) y a los datos D, con el story.js real. Se evalúa en este mismo reino que story.js
// (runInThisContext): un {} creado en otro contexto vm no pasaría plainObj y falsearía el rango previo.
function rankLineFn(S, D) {
  return vm.runInThisContext('(function (S, CITY_DATA, CityStory) {\n' + SRC + '\n;return cityRankLine; })')(S, D, CS);
}

// (restored, mids) → texto de cityRankLine con los datos D.
function rankLineWith(D) {
  const S = { city: { restored: {} } }, fn = rankLineFn(S, D);
  return (restored, mids) => { S.city = { restored }; return fn(mids); };
}

module.exports = { grabFn, SRC, rankLineFn, rankLineWith };
