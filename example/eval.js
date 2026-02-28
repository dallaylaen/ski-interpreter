#!/usr/bin/env node

/**
 * A minimal example of evaluating a SKI expression.
 */

'use strict';

const { SKI } = require('../lib/ski-interpreter.cjs');
// SKI is the only export and contains other goodies as subkeys

const [node, path, src] = process.argv;

if (!src) {
  console.log(`Usage: ${node} ${path} <src>`);
  process.exit(1);
}

const ski = new SKI();

// add some extra terms
ski.add('M', 'SII'); // an alias
ski.add('L', x => y => x.apply(y.apply(y))) // ditto but with a 'Native' js impl

const expr = ski.parse(src);

// expr.step() = 1 reduction, expr.run() = reduce to the end
// expr.walk() = an iterator
// all three return an object with { steps, expr, final } where:
// - steps = the number of reductions performed so far
// - expr = the resulting expression
// - final = boolean indicating if the expression is in normal form (no more reductions possible)
for (const step of expr.walk())
  console.log(`[${step.steps}] ${step.expr}`);
