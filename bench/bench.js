'use strict';

/**
 *  @desc Benchmarking script for SKI interpreter.
 *  Run with `node bench.js` to print results to console.
 *  Run with `node bench.js save > baseline.json` to save results for later comparison.
 *  Run with `node bench.js compare baseline.json` to compare current results with saved baseline.
 *
 *  mean, stdev, median, and p95 are reported for each benchmark case.
 *  Highest 20% are considered outliers and dismissed (aka we ran into a garbage collection / background job).
 *
 *  The benchmark cases include:
 *  - Y f // a "deep" nonterminating expression
 *  - Y W x // a "wide" nonterminating expression
 *  - Y I // a stable nonterminating expression
 *  - Search for C analog in S K
 */

const fs = require('node:fs/promises');
const { performance } = require('perf_hooks');
const { SKI } = require('../lib/ski-interpreter.cjs');

const [_node, _script, action, file] = process.argv;

if (action === 'compare') {
  fs.readFile(file).then(content => {
    const old = JSON.parse(content.toString());
    compare(benchCases(), old);
  });
} else if (action === 'save') {
  console.log(JSON.stringify(benchCases()));
} else {
  console.log(benchCases());
}

function compare (current, baseline) {
  for (const key of Object.keys(current).sort()) {
    console.log(`${key}:`)
    const c = current[key];
    const b = baseline[key] ?? {};
    for (const param of ['mean', 'stdev', 'median', 'p95']) {
      console.log(`  ${param}: ` + compareNum(c[param], b[param]));
    }
  }
}

function compareNum (current, baseline) {
  if (!baseline)
    return '' + current;
  const relative = 100 * (current - baseline) / baseline;
  return current.toFixed(2) + ' (' + (relative > 0 ? '+' : '') + relative.toFixed(1) + '%)';
}

function benchCases() {
  const ski = new SKI();

  const grand = {};

  for (const [src, repeat] of [['WS(BWB)I', 1000000], ['WS(BWB)W x', 4000], ['WS(BWB)f', 3000]]) {
    // console.log(`Benchmarking ${src} at ${repeat}...`);
    const expr = ski.parse(src);
    const result = bench(expr, { iterations: repeat });
    // console.log(result);
    grand[src + ':' + repeat] = result;
  }

  //  console.log('Benchmarking search (C <- S K)...');

  grand.search_CSK = bench(() => {
    const eq = SKI.C.infer().expr;
    SKI.extras.search([SKI.S, SKI.K], {}, (e, p) => {
      if (!p.expr)
        return -1;
      return p.expr.equals(eq) ? 1 : 0;
    });
  });

  return grand;
}

function bench (fun, options = {}) {
  const trim = options.trim ?? 0.2;
  const n = options.n ?? 20;

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
