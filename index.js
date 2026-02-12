const main = require('./src/parser');
const quest = require('./src/quest');
const extras = require('./src/extras');

main.SKI.Quest = quest.Quest;
main.SKI.extras = extras;

// SKI_REPL=1 node -r ./index.js
if (typeof process === 'object' && process.env.SKI_REPL && typeof global !== 'undefined')
  global.SKI = main.SKI;

// we're in a browser
if (typeof window !== 'undefined')
  window.SKI = main.SKI;

module.exports = { ...main, ...quest };
