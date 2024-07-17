const ski = require ("./lib/ski");

module.exports = { ...ski };
if (typeof window !== 'undefined') {
    window.SKI = SKI;
}
