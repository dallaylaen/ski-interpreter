'use strict';

import { Expr, Named, FormatOptions, TermInfo, toposort } from './expr';
import { Quest } from './quest';

/**
 *   Extra utilities that do not belong in the core.
 */

// --- Types ---

/**
 * @experimental
 *   Look for an expression that matches the predicate,
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
export type SearchOptions = {
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
export type SearchCallback = (e: Expr, props: TermInfo) => (number | undefined);
export type SearchResult = { expr?: Expr, total: number, probed: number, gen: number, cache?: Expr[][] };

export type EquivResult = {
  steps: number,
  equal: boolean,
  normal: boolean,
  canonical: [Expr | null, Expr | null],
};

// poor man's zod
const formatSchema: Record<string, (arg0: unknown) => string | undefined> = {
  html:      x => typeof x === 'boolean' ? undefined : 'must be a boolean',
  terse:     x => typeof x === 'boolean' ? undefined : 'must be a boolean',
  space:     x => typeof x === 'string' ? undefined : 'must be a string',
  brackets:  isStringPair,
  var:       isStringPair,
  around:    isStringPair,
  redex:     isStringPair,
  lambda:    isStringTriple,
  inventory: x => {
    if (typeof x !== 'object' || x === null || x.constructor !== Object)
      return 'must be an object, not ' + (x?.constructor?.name ?? typeof x);
    const refined = x as Record<string, unknown>;
    for (const key of Object.keys(refined)) {
      if (!(refined[key] instanceof Expr))
        return 'key ' + key + 'is not an Expr';
    }
    return undefined;
  }
}

// --- Exported functions (alphabetical) ---

/**
 *   Converts an unknown object into a FormatOptions, or returns an error it it is not valid.
 *   A null/undefined counts as an empty options object (and is thus valid).
 */
function checkFormatOptions (raw: unknown): { value: FormatOptions } | { error: Record<string, string> } {
  if (raw === null || raw === undefined)
    return { value: {} };

  if (typeof raw !== 'object' || Array.isArray(raw) || raw.constructor !== Object)
    return { error: { object: 'Format options must be an object, not ' + (raw?.constructor?.name ?? typeof raw) } };

  const rec = raw as Record<string, unknown>;
  const error: Record<string, string> = {};

  for (const key in rec) {
    if (formatSchema[key]) {
      const err = formatSchema[key](rec[key]);
      if (err)
        error[key] = err;
    } else
      error[key] = 'unknown option';
  }

  return Object.keys(error).length > 0 ? { error } : { value: rec as FormatOptions };
}

/**
 * Find out if two expressions are computationally equivalent.
 *
 * Unlike equals(), this function will attempt to normalize both expressions
 * before comparing.
 *
 * @experimental
 * @param e1
 * @param e2
 * @param options
 */
function equiv (e1: Expr, e2: Expr, options = {}): EquivResult {
  let steps = 0;
  const [n1, n2] = [e1, e2].map( x => x.traverse(e => {
    const props = e.infer(options);
    steps += props.steps ?? 0;
    return props.expr;
  }));
  const normal = !!(n1 && n2);
  return {
    steps,
    normal,
    equal:     normal ? n1.equals(n2) : false,
    canonical: [n1, n2],
  }
}

/**
 *   Given an expression and a hash of named terms,
 *   return a semicolon-separated string that declares said expression
 *   unambiguously.
 *
 * @example
 * var expr = ski.parse("T=CI; V=BCT; V x y");
 * SKI.extras.declare(expr, expr.context.env);
 * // 'B; C; I; T=CI; V=BC(T); x=; y=; Vx y'
 *
 */
function declare (expr: Expr, env?: Record<string, Named>): string {
  return expr.declare({ inventory: env });
}

/**
 *  Recursively replace all instances of Expr in a data structure with
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
 * @experimental
 *   Look for an expression that matches the predicate,
 *        starting with the seed and applying the terms to one another.
 */
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

// --- Utility functions ---

function isStringPair (x: unknown): string | undefined {
  return Array.isArray(x) && x.length === 2 && typeof x[0] === 'string' && typeof x[1] === 'string'
    ? undefined
    : 'must be a pair of strings';
}
function isStringTriple  (x: unknown): string | undefined {
  return Array.isArray(x) && x.length === 3 && typeof x[0] === 'string' && typeof x[1] === 'string' && typeof x[2] === 'string'
    ? undefined
    : 'must be a triplet of strings';
}

// --- Namespace export ---

export const extras = { search, deepFormat, declare, toposort, checkFormatOptions, equiv };
