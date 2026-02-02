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
const jar = {};
const expr = ski.parse(args.pop(), { vars: jar });
const terms = args.map(s => ski.parse(s, { vars: jar }));

const rework = expr.replace(terms);
if (rework === null)
  throw new Error('no equivalent expression found');
console.log('' + rework);
