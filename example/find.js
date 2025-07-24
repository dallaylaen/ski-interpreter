#!/usr/bin/env node

/**
 *   This script finds and expression equivalent to a target expression
 *   using a set of known terms.
 */

const { SKI } = require('../index');

const [node, self, ...args] = process.argv;

if (args.length < 2)
  throw new Error('a target expression and 1+ known terms are needed');

const ski = new SKI();
const jar = {};
const [target, ...seed] = args.map(s => ski.parse(s, jar));

const canon = target.canonize().canonical;

for (const entry of findAll(seed, {})) {
  console.log(`Trying ${entry.expr}... (${entry.canonical})`);
  if (canon.equals(entry.canonical)) {
    console.log(`Found ${entry.expr} after ${entry.tries} tries.`);
    process.exit(0);
  }
}

/**
 * @desc Find all expressions that can be built from the ones in the seed.
 *      This is a generator function that yields expressions + metadata.
 *      Dynamic programming is used internally.
 * @param {Expr[]} seed
 * @param {{
 *   max: number?,
 *   maxArgs: number?,
 *   maxTries: number?,
 *   maxGenerations: number?,
 * }} options
 * @param {function(expr: Expr, canonical: Expr): boolean} criteria
 * @yields {{expr: Expr?, tries: number, gen: number, canonical: Expr}}
 */
function * findAll (seed, options) {
  const canonOpt = { max: options.max, maxArgs: options.maxArgs };
  const seen = {};

  const store = [[...seed]];
  let tries = 0;
  let gen = 1;

  for (const expr of seed) {
    const canon = expr.canonize(canonOpt).canonical;
    yield { expr, tries, gen, canonical: canon };
    tries++;
    seen[canon.toString()] = true;
  }

  while ((tries < (options.maxTries ?? 1000000)) && (gen < (options.maxGenerations ?? 100))) {
    if (!store[gen])
      store[gen] = [];
    for (let i = 0; i < gen; i++) {
      for (const f of store[gen - i - 1]) {
        for (const g of store[i]) {
          tries++;
          const expr = f.apply(g);
          const normal = expr.run();
          if (!normal.final)
            continue;
          const canon = normal.expr.canonize(canonOpt);
          if (!canon.canonical)
            continue;

          yield { expr, tries, gen, canonical: canon.canonical };
          if (seen[canon.canonical])
            continue; // already seen
          seen[canon.canonical] = true;

          // push improper and duplicating expressions further away
          const effGen = gen + !canon.proper + (canon.dup ? 1 : 0);
          if (!store[effGen])
            store[effGen] = [];
          store[effGen].push(expr);
        }
      }
    }
    gen++;
  }
}
