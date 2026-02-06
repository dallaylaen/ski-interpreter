const main = require('./lib/parser');
const quest = require('./lib/quest');
const extras = require('./lib/extras');

main.SKI.Quest = quest.Quest;
main.SKI.extras = extras;

module.exports = { ...main, ...quest };
if (typeof window !== 'undefined') {
  window.SKI = main.SKI;
}
