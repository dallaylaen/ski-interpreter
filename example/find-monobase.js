'use strict';

const { SKI } = require('../src');

const ski = new SKI();

const { search, deepFormat } = SKI.extras;

// Parse CLI arguments: seed seed seed ... -- target target target ...
const args = process.argv.slice(2);
const separatorIdx = args.indexOf('--');

if (separatorIdx === -1 || separatorIdx === 0 || separatorIdx === args.length - 1) {
  console.error('Usage: node find-monobase.js <seed> [<seed>...] -- <target> [<target>...]');
  process.exit(1);
}

const seedStrs = args.slice(0, separatorIdx);
const targetStrs = args.slice(separatorIdx + 1);

const seed = seedStrs.map(s => ski.parse(s));
const target = targetStrs.map(s => ski.parse(s));

let best = 12;
const t0 = new Date();

for (const progress of search(seed, { depth: 100, max: 150, tries: 100_000_000, progressInterval: 100_000 }, (expr, prop) => {
  if (!prop.expr)
    return { offset: -1 };

  // if (!prop.discard || !prop.duplicate)
  //    return 0;

  const term = new SKI.classes.Alias('X', expr);
  const ret = checkBase([term], target, { depth: best, tries: 100_000, maxArgs: 8, max: 150 });
  if (!ret)
    return 0;

  const maxlen = Math.max(
    ...Object.values(ret)
      .map(e => countIn(e, term))
  );

  if (maxlen <= best) {
    console.log(`New best monobase(${maxlen}): X=${expr} in ${(new Date() - t0) / 1000}s`
      , deepFormat(ret));
    best = maxlen;
    return { found: true };
  }

  return 0; // anyways...
}))
  console.log((new Date() - t0) / 1000, progress.total, progress.gen);

/**
 * @param { Expr[] } base
 * @param { Expr[] } target
 *
 *
 */

function checkBase (base, target, options) {
  const need = {};
  target.forEach(t => { need[t.infer().expr] = t });
  const found = {};

  // console.log(deepFormat(target));

  for (const progress of search(base, options, (e, p) => {
    if (!p.expr) return { offset: -1 };
    const maybe = need[p.expr];
    if (!maybe) return 0;

    //  console.log(`found ${maybe} as ${e}`);

    found[maybe] = e;
    delete need[p.expr];
    return Object.keys(need).length === 0 ? { found: true, stop: true } : 0;
  })) {
    if (progress.found)
      return found;
  }

  return undefined;
}

function countIn (expr, target) {
  return expr.fold(0, (acc, e) => {
    if (e === target)
      return SKI.control.prune(acc + 1);
  });
}
