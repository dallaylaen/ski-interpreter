'use strict';

const { Expr } = require('./expr')

/**
 * @desc  Extra utilities that do not belong in the core.
 */

/**
 * @experimental
 * @desc  Look for an expression that matches the predicate,
 *        starting with the seed and applying the terms to one another.
 *
 *        A predicate returning 0 (or nothing) means "keep looking",
 *        a positive number stands for "found",
 *        and a negative means "discard this term from further applications".
 *
 *        The order of search is from shortest to longest expressions.
 *
 * @param {Expr[]} seed
 * @param {object} options
 * @param {number} [options.depth] - maximum generation to search for
 * @param {number} [options.tries] - maximum number of tries before giving up
 * @param {boolean} [options.infer] - whether to call infer(), default true.
 * @param {number} [options.maxArgs] - arguments in infer()
 * @param {number} [options.max] - step limit in infer()
 * @param {boolean} [options.noskip] - prevents skipping equivalent terms. Always true if infer is false.
 * @param {({gen: number, total: number, probed: number, step: boolean}) => void} [options.progress]
 * @param {number} [options.progressInterval] - minimum number of tries between calls to options.progress, default 1000.
 * @param {(e: Expr, props: {}) => number?} predicate
 * @return {{expr?: Expr, total: number, probed: number, gen: number}}
 */
function search (seed, options, predicate) {
  const {
    depth = 16,
    infer = true,
    progressInterval = 1000,
  } = options;
  const hasSeen = infer && !options.noskip;

  // cache[i] = ith generation, 0 is empty
  const cache = [null, []];
  let total = 0;
  let probed = 0;
  const seen = {};

  const maybeProbe = term => {
    total++;
    const props = infer ? term.infer({ max: options.max, maxArgs: options.maxArgs }) : null;
    if (hasSeen && props.expr) {
      if (seen[props.expr])
        return { res: -1 };
      seen[props.expr] = true;
    }
    probed++;
    const res = predicate(term, props);
    return { res, props };
  };

  // sieve through the seed
  for (const term of seed) {
    const { res } = maybeProbe(term);
    if (res > 0)
      return { expr: term, total, probed, gen: 1 };
    else if (res < 0)
      continue;

    cache[1].push(term);
  }

  let lastProgress;

  for (let gen = 2; gen < depth; gen++) {
    if (options.progress) {
      options.progress({ gen, total, probed, step: true });
      lastProgress = total;
    }
    for (let i = 1; i < gen; i++) {
      for (const a of cache[i] || []) {
        for (const b of cache[gen - i] || []) {
          if (total >= options.tries)
            return { total, probed, gen };
          if (options.progress && total - lastProgress >= progressInterval) {
            options.progress({ gen, total, probed, step: false });
            lastProgress = total;
          }
          const term = a.apply(b);
          const { res, props } = maybeProbe(term);

          if (res > 0)
            return { expr: term, total, probed, gen };
          else if (res < 0)
            continue;

          // if the term is not reducible, it is more likely to be a dead end, so we push it further away
          const offset = infer
            ? ((props.expr ? 0 : 3) + (props.dup ? 1 : 0) + (props.proper ? 0 : 1))
            : 0;
          if (!cache[gen + offset])
            cache[gen + offset] = [];
          cache[gen + offset].push(term);
        }
      }
    }
  }

  return { total, probed, gen: depth };
}

/**
 * @desc Recursively replace all instances of Expr in a data structure with
 *       respective string representation using the format() options.
 *       Objects of other types and primitive values are eft as is.
 *
 *       May be useful for debugging or diagnostic output.
 *
 * @experimental
 *
 * @param {any} obj
 * @param {object} [options] - see Expr.format()
 * @returns {any}
 */
function flattenExpr (obj, options = {}) {
  if (Array.isArray(obj))
    return obj.map(flattenExpr);
  if (obj instanceof Expr)
    return obj.format(options);
  if (typeof obj !== 'object') // TODO or 'blessed'
    return obj;

  // default = hash
  const out = {};
  for (const key in obj)
    out[key] = flattenExpr(obj[key]);

  return out;
}

module.exports = { search, flattenExpr };
