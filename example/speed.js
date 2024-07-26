const { SKI } = require ('../index');


const ski = new SKI();
ski.add('inc', 'S(S(K(S))(K))');
ski.add('n2', 'inc I');

const expr = ski.parse('inc (n2 n2) (n2 n2) x y');
const depth = 1024;

const t0 = new Date();
const result = expr.run(10000000);
const elapsed = new Date() - t0;

if (''+result !== 'x('.repeat(depth)+'y'+')'.repeat(depth))
    console.log('warning: unexpected output: \n'+result);

console.log("time elapsed: "+elapsed+'ms');
