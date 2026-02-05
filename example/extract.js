#!/usr/bin/env node

/**
 *   Given a list of terms and an expression as arguments,
 *   print equivalent expression with given terms plugged in.
 *
 *   Example:
 *
 *      node extract.js M=WI 'S(SKK)(SKS)'
 *      M
 *
 *      bash$ ./example/extract.js WI 'S(SKK)(SKS)'
 *      WI
 *
 *      bash$ ./example/extract.js W I 'S(SKK)(SKS)'
 *      SII
 *
 *   This script was inspired by this riddle: https://happyfellow.bearblog.dev/a-riddle/
 *
 */

const { SKI } = require('../index');
const [node, self, ...args] = process.argv;

if (args.length < 2)
  throw new Error('a target expression and 1+ known terms are needed');

const ski = new SKI();
const expr = ski.parse(args.pop());
const pairs = args
  .map(s => ski.parse(s))
  .map(e => [ e.guess().expr, e ]);

const uncanonical = pairs.filter( pair => !pair[0]);
if (uncanonical.length) {
  throw new Error('Some expressions could not be canonized: '
    + uncanonical.map(p => p[1].toString()).join(', '));
}

const replaced = expr.traverse(e => {
  const canon = e.guess().expr;
  for (const [lambda, term] of pairs) {
    if (canon.equals(lambda)) {
      return term;
    }
  }
  return null;
});

if (replaced) {
  console.log(replaced.toString());
} else {
  console.log('// unchanged');
}

