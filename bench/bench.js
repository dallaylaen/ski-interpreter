'use strict';

// const { fs } = require('fs');
const { performance } = require('perf_hooks');
const { SKI } = require('../lib/ski-interpreter.cjs');

const ski = new SKI();

const grand = {};

for (const [src, repeat] of [['WS(BWB)I', 100000], ['WS(BWB)W x', 4000], ['WS(BWB)f', 3000]]) {
  console.log(`Benchmarking ${src} at ${repeat}...`);
  const expr = ski.parse(src);
  const result = bench(expr, { iterations: repeat });
  // console.log(result);
  grand[src + ':' + repeat] = result;
}

grand.search_CSK = bench(() => {
  const eq = SKI.C.infer().expr;
  SKI.extras.search([SKI.S, SKI.K], {}, (e, p) => {
    if (!p.expr)
      return -1;
    return p.expr.equals(eq) ? 1 : 0;
  });
});

console.log(grand);

function bench (fun, options = {}) {
  const trim = options.trim ?? 0.2;
  const n = options.n ?? 10;

  if (fun instanceof SKI.classes.Expr) {
    const expr = fun;
    fun = () => expr.run({ max: options.iterations })
  }

  const values = [];
  for (let i = 0; i < n; i++) {
    const start = performance.now();
    fun();
    const end = performance.now();
    values.push(end - start);
  }

  return {
    ...stat(values, { trim }),
  };
}

// skipping a perfect stats-logscale use case
function stat (values, options = {}) {
  const trim = options.trim ?? 0;
  const sorted = values.slice().sort((a, b) => a - b)
    .slice(0, values.length * (1 - trim));
  const sum = sorted.reduce((a, b) => a + b, 0);
  const sumsq = sorted.reduce((a, b) => a + b * b, 0);

  return {
    count:  sorted.length,
    mean:   sum / sorted.length,
    stdev:  Math.sqrt(sumsq / sorted.length - (sum / sorted.length) ** 2),
    min:    sorted[0],
    median: sorted[Math.floor(sorted.length * 0.5)],
    p95:    sorted[Math.floor(sorted.length * 0.95)],
  }
}
