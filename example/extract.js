/**
 *   Given a list of terms as arguments and an expression as stdin,
 *   print equivalent expression with given terms plugged in.
 */

const readline = require('readline');
const fs = require('fs');
const { SKI } = require('../index');
const [node, self, ...args] = process.argv;

const ski = new SKI();
const jar = {};
const terms = args.map(s => ski.parse(s, jar));

/*
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});
*/


const input = fs.readFileSync(0, 'utf8');
const expr = ski.parse(input, jar);
const rework = expr.replace(terms);
if (rework === null)
  throw new Error('no equivalent expression found');
console.log('' + rework);
