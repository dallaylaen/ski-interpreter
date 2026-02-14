#!/usr/bin/env -S node --stack-size=20600

/**
 *   This script finds and expression equivalent to a target expression
 *   using a set of known terms.
 *
 *   As of current, only normalizable expressions are supported as targets.
 *
 *   Usage:
 *     node example/search.js <target> <known term 1> [<known term 2> ...]
 */

const { SKI } = require('../index');

const [node, self, ...args] = process.argv;

if (args.length < 2)
  throw new Error('a target expression and 1+ known terms are needed');

const ski = new SKI();
const jar = {};
const [target, ...seed] = args.map(s => ski.parse(s, { vars: jar }));

const { expr } = target.infer();
if (!expr)
  throw new Error('target expression is not normalizable: ' + target);

const res = SKI.extras.search(seed, { tries: 10_000_000, depth: 100 }, (e, p) => {
  if (!p.expr)
    return -1; // skip non-normalizable expressions
  if (p.expr.equals(expr))
    return 1;
  return 0;
});

if (res.expr) {
  console.log(`Found ${res.expr} after ${res.total} tries.`);
  process.exit(0);
} else {
  console.error(`No equivalent expression found for ${target} after ${res.total} tries.`);
  process.exit(1);
}
