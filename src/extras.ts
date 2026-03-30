'use strict';

import { Expr, Alias, FreeVar, Named, FormatOptions, TermInfo } from './expr';
import { Quest } from './quest';
import { toposort } from './toposort';

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
type SearchOptions = {
  depth?: number;
  tries?: number;
  infer?: boolean;
  maxArgs?: number;
  max?: number;
  noskip?: boolean;
  retain?: boolean;
  progress?: (info: { gen: number, total: number, probed: number, step: boolean }) => void;
  progressInterval?: number;
};
type SearchCallback = (e: Expr, props: TermInfo) => (number | undefined);
type SearchResult = { expr?: Expr, total: number, probed: number, gen: number, cache?: Expr[][] };

function search (seed: Expr[], options: SearchOptions, predicate: SearchCallback): SearchResult {
  const {
    depth = 16,
    infer = true,
    progressInterval = 1000,
  } = options;
  const hasSeen = infer && !options.noskip;

  // cache[i] = ith generation, 0 is empty
  const cache: Expr[][] = [[]];
  let total = 0;
  let probed = 0;
  const seen: {[s: string]: boolean} = {};

  const maybeProbe = (term: Expr) => {
    total++;
    const props = infer ? term.infer({ max: options.max, maxArgs: options.maxArgs }) : null;
    if (hasSeen && props && props.expr) {
      const key = String(props.expr);
      if (seen[key])
        return { res: -1 as number | undefined, props };
      seen[key] = true;
    }
    probed++;
    const res = predicate(term, props!);
    return { res, props };
  };

  // sieve through the seed
  for (const term of seed) {
    const { res = 0 } = maybeProbe(term);
    if (res > 0)
      return { expr: term, total, probed, gen: 1 };
    else if (res < 0)
      continue;

    cache[0].push(term);
  }

  let lastProgress = 0;

  for (let gen = 1; gen < depth; gen++) {
    if (options.progress) {
      options.progress({ gen, total, probed, step: true });
      lastProgress = total;
    }
    for (let i = 0; i < gen; i++) {
      for (const a of cache[gen - i - 1] || []) {
        for (const b of cache[i] || []) {
          if (total >= (options.tries ?? Infinity))
            return { total, probed, gen, ...(options.retain ? { cache } : {}) };
          if (options.progress && total - lastProgress >= progressInterval) {
            options.progress({ gen, total, probed, step: false });
            lastProgress = total;
          }
          const term = a.apply(b);
          const { res, props } = maybeProbe(term);

          if ((res ?? 0) > 0)
            return { expr: term, total, probed, gen, ...(options.retain ? { cache } : {}) };
          else if ((res ?? 0) < 0)
            continue;

          // if the term is not reducible, it is more likely to be a dead end, so we push it further away
          const offset = infer && props
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
 */
// yes allow any in this function, it's pattern matched into correct classes during traverse
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deepFormat (obj: any, options : FormatOptions = {}): any {
  if (obj instanceof Expr)
    return obj.format(options);
  // TODO for quests, use toJSON when it's ready
  if (obj instanceof Quest)
    return 'Quest(' + obj.name + ')';
  if (obj instanceof Quest.Case)
    return 'Quest.Case';
  if (Array.isArray(obj))
    return obj.map(item => deepFormat(item, options));
  if (typeof obj !== 'object' || obj === null || obj.constructor !== Object)
    return obj;

  // default = plain object
  const out: { [key: string]: unknown } = {};
  for (const key in obj)
    out[key] = deepFormat(obj[key], options);

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
function declare (expr: Expr, env: { [s: string]: Named } = {}): string {
  const res = toposort([expr], env);

  return res.list.map(s => {
    if (s instanceof Alias)
      return s.name + '=' + s.impl.format({ inventory: res.env });
    if (s instanceof FreeVar)
      return s.name + '=';
    return s.format({ inventory: res.env });
  }).join('; ');
}

/**
 * @desc Validate an unknown value as FormatOptions.
 *       Returns `{ ok: true, format: <value> }` on success,
 *       or `{ ok: false }` if any field has the wrong type.
 */
function checkFormatOptions (v: unknown): { ok: true, format: FormatOptions } | { ok: false } {
  if (typeof v !== 'object' || v === null || Array.isArray(v))
    return { ok: false };

  const o = v as Record<string, unknown>;

  const isStringPair    = (x: unknown): x is [string, string]         => Array.isArray(x) && x.length === 2 && typeof x[0] === 'string' && typeof x[1] === 'string';
  const isStringTriple  = (x: unknown): x is [string, string, string] => Array.isArray(x) && x.length === 3 && typeof x[0] === 'string' && typeof x[1] === 'string' && typeof x[2] === 'string';

  if ('terse'    in o && typeof o.terse    !== 'boolean')  return { ok: false };
  if ('html'     in o && typeof o.html     !== 'boolean')  return { ok: false };
  if ('space'    in o && typeof o.space    !== 'string')   return { ok: false };
  if ('brackets' in o && !isStringPair(o.brackets))        return { ok: false };
  if ('var'      in o && !isStringPair(o.var))             return { ok: false };
  if ('around'   in o && !isStringPair(o.around))          return { ok: false };
  if ('redex'    in o && !isStringPair(o.redex))           return { ok: false };
  if ('lambda'   in o && !isStringTriple(o.lambda))        return { ok: false };

  if ('inventory' in o) {
    const inv = o.inventory;
    if (typeof inv !== 'object' || inv === null || Array.isArray(inv))
      return { ok: false };
    for (const val of Object.values(inv as object))
      if (!(val instanceof Expr)) return { ok: false };
  }

  return { ok: true, format: o as FormatOptions };
}

export const extras = { search, deepFormat, declare, toposort, checkFormatOptions };
