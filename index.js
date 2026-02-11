const main = require('./lib/parser');
const quest = require('./lib/quest');
const extras = require('./lib/extras');

main.SKI.Quest = quest.Quest;
main.SKI.extras = extras;

// SKI_REPL=1 node -r ./index.js
if (process.env.SKI_REPL && typeof global !== 'undefined')
  global.SKI = main.SKI;

// we're in a browser
if (typeof window !== 'undefined')
  window.SKI = main.SKI;

module.exports = { ...main, ...quest };
