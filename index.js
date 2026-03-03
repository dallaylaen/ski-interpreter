const { SKI } = require('./src/index.js');

// SKI_REPL=1 node -r ./index.js
if (typeof process === 'object' && process.env.SKI_REPL && typeof global !== 'undefined') {
  global.SKI = SKI;
  console.log('SKI_REPL activated, try `new SKI();`');
}

// we're in a browser
if (typeof window !== 'undefined')
  window.SKI = SKI;

module.exports = { SKI };
