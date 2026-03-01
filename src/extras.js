'use strict';

const { Expr, Alias, FreeVar } = require('./expr');
const { Quest } = require('./quest');

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
 * @param {boolean} [retain] - if true. also add the whole cache to returned value
 * @param {({gen: number, total: number, probed: number, step: boolean}) => void} [options.progress]
 * @param {number} [options.progressInterval] - minimum number of tries between calls to options.progress, default 1000.
 * @param {(e: Expr, props: {}) => number?} predicate
 * @return {{expr?: Expr, total: number, probed: number, gen: number, cache?: Expr[][]}}
 */
function search (seed, options, predicate) {
  const {
    depth = 16,
    infer = true,
    progressInterval = 1000,
  } = options;
  const hasSeen = infer && !options.noskip;

  // cache[i] = ith generation, 0 is empty
  const cache = [[]];
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

    cache[0].push(term);
  }

  let lastProgress;

  for (let gen = 1; gen < depth; gen++) {
    if (options.progress) {
      options.progress({ gen, total, probed, step: true });
      lastProgress = total;
    }
    for (let i = 0; i < gen; i++) {
      for (const a of cache[gen - i - 1] || []) {
        for (const b of cache[i] || []) {
          if (total >= options.tries)
            return { total, probed, gen, ...(options.retain ? { cache } : {}) };
          if (options.progress && total - lastProgress >= progressInterval) {
            options.progress({ gen, total, probed, step: false });
            lastProgress = total;
          }
          const term = a.apply(b);
          const { res, props } = maybeProbe(term);

          if (res > 0)
            return { expr: term, total, probed, gen, ...(options.retain ? { cache } : {}) };
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

  return { total, probed, gen: depth, ...(options.retain ? { cache } : {}) };
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
function deepFormat (obj, options = {}) {
  if (obj instanceof Expr)
    return obj.format(options);
  // TODO for quests, use toJSON when it's ready
  if (obj instanceof Quest)
    return 'Quest(' + obj.name + ')';
  if (obj instanceof Quest.Case)
    return 'Quest.Case';
  if (Array.isArray(obj))
    return obj.map(deepFormat);
  if (typeof obj !== 'object' || obj === null || obj.constructor !== Object)
    return obj;

  // default = plain object
  const out = {};
  for (const key in obj)
    out[key] = deepFormat(obj[key]);

  return out;
}

/**
 * @desc  Given an expression and a hash of named terms,
 *        return a semicolon-separated string that declares said expression
 *        unambiguously.
 *
 * @example
 * var expr = ski.parse("T=CI; V=BCT; V x y");
 * SKI.extras.declare(expr, expr.context.env);
 * // 'B; C; I; T=CI; V=BC(T); x=; y=; Vx y'
 *
 * @param {Expr} expr
 * @param {{[s: string]: Named}} [env]
 * @returns {string}
 */
function declare (expr, env) {
  const res = Expr.extras.toposort([expr], env);

  return res.list.map(s => {
    if (s instanceof Alias)
      return s.name + '=' + s.impl.format({ inventory: res.env });
    if (s instanceof FreeVar)
      return s.name + '=';
    return s.format({ inventory: res.env });
  }).join('; ');
}

/**
 * @experimental
 * @desc  Fold an application tree bottom to top.
 *        For each subtree, the function is given the term in the root position and
 *        a list of the results of folding its arguments.
 *
 *        E,g, fold('x y (z t)', f) results in f(x, [f(y, []), f(z, [f(t, [])])])
 *
 * @template T
 * @param {Expr} expr
 * @param {(head: Expr, tail: T[]) => T} fun
 * @return {T}
 */

function foldr (expr, fun) {
  const [head, ...tail] = expr.unroll();
  return fun(head, tail.map(e => foldr(e, fun)));
}

module.exports = { search, deepFormat, declare, foldr };
