const ski = require('./lib/ski');
const quest = require('./lib/quest');

module.exports = { ...ski, ...quest };
if (typeof window !== 'undefined') {
  window.SKI = ski.SKI;
  window.SKI.Quest = quest.Quest;
}
