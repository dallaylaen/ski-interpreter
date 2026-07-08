'use strict';

import { Expr, Named, FormatOptions, TermInfo, toposort } from './expr';
import { Quest } from './quest';

/**
 *   Extra utilities that do not belong in the core.
 */

// --- Types ---

export type SearchCallbackResult<T> = {
  /** 0 = keep the term to compute further terms (the default);
   *  n<0 = discard the term; n>0 = keep the term, but delay its use by n generations
   */
  offset?: number;
  /** if not undefined, this means the term is of interest and will appear in the result */
  found?: T;
  /** true = stop the search immediately */
  stop?: boolean;
};
export type SearchOptions = {
  /** maximum generation to search for */
  depth?: number;
  /** maximum number of tried terms before giving up */
  tries?: number;
  /** whether to call infer() on each term; default true */
  infer?: boolean;
  /** maximum number of steps in infer(), see {@link infer} */
  max?: number;
  /** maximum number of arguments in infer(), see {@link infer} */
  maxArgs?: number;
  /** maximum size of a term in infer() before the calculation is aborted; see {@link infer} */
  maxSize?: number;
  /** prevents skipping equivalent terms. Always true if infer is false. */
  noskip?: boolean;
  /** minimum number of tries between progress yields, default 1000 */
  progressInterval?: number;
};
export type SearchCallback<T> = (e: Expr, props: TermInfo) => (SearchCallbackResult<T> | number | undefined);
/** Yielded by the search generator on every progress tick and on each found term. */
export type SearchProgress<T> = {
  /** The found expression; present only when found is defined. */
  expr?: Expr;
  /** Why we should care about this term (e.g. when construction multiple terms from a basis)
   *  or simply true if there are no important details aside from the term itself.
   */
  found?: T;
  /** true = a new generation has started */
  step: boolean;
  /** The current generation number, starting from 0 for the seed generation. */
  gen: number;
  /** The number of terms generated so far. */
  total: number;
  /** The number of terms excluding duplicates. Will == total if noskip is true or infer is false. */
  probed: number;
  /** The full generation cache at the time of this yield. */
  cache: Expr[][];
};

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
 *   Converts an unknown object into a FormatOptions, or returns an error if it is not valid.
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
 * Given a seed set of expressions, search for expressions that match the predicate
 * by applying already known expressions to one another.
 * Seen terms are organized into generations, with gen(g f) == gen(g) + gen(f) + an optional offset
 * (e.g. we want to study duplicating terms later than the discarding ones).
 *
 * The predicate receives a term and its inferred properties (if `infer` is true) and
 * returns an object with the following optional properties:
 * - `found`: boolean - if true, the expression is yielded as a result;
 * - `stop`: boolean - if true, the search stops after yielding, independent of `found`;
 * - `offset`: a number with the following meaning:
 *   - negative: discard the expression entirely;
 *   - 0: keep the expression to compute further terms;
 *   - n >0: keep the expression, but delay its use by n generations.
 * Or it can just return a number, which is shorthand for `{ offset: n }`.
 *
 * An intermediate result is yielded, when:
 *   - a term is found (`found === true`) and/or the search is stopped (`stop === true`);
 *   - a new generation is started;
 *   - the number of tries since the last yield exceeds `progressInterval`.
 * Such approach allows implementing progress bars and prevents the search from blocking for too long.
 *
 */
function * search<T> (seed: Expr[], options: SearchOptions, predicate: SearchCallback<T>): Generator<SearchProgress<T>> {
  const {
    depth = 16,
    infer = true,
    progressInterval = 1000,
  } = options;
  const hasSeen = infer && !options.noskip;

  // cache[i] = ith generation, 0 is seed generation
  const cache: Expr[][] = [[]];
  let total = 0;
  let probed = 0;
  const seen: {[s: string]: boolean} = {};

  const store = (term: Expr, gen: number, offset: number = 0) => {
    if (offset < 0)
      return;
    if (!cache[gen + offset])
      cache[gen + offset] = [];
    cache[gen + offset].push(term);
  }

  const maybeProbe:(expr: Expr)=>{res: SearchCallbackResult<T>, props: TermInfo | undefined }
    = (term: Expr) => {
      total++;
      const props = infer ? term.infer({ max: options.max, maxArgs: options.maxArgs, maxSize: options.maxSize }) : undefined;
      if (hasSeen && props && props.expr) {
        // skip seen terms if allowed to
        const key = String(props.expr);
        if (seen[key])
          return { res: { offset: -1 }, props: undefined };
        seen[key] = true;
      }
      probed++;
      const res = predicate(term, props!) ?? 0;
      return (typeof res === 'number') ? { res: { offset: res }, props } : { res, props };
    };

  // sieve through the seed
  for (const term of seed) {
    const { res } = maybeProbe(term);
    if (res.found !== undefined)
      yield { expr: term, found: res.found, step: false, gen: 0, total, probed, cache };
    if (res.stop)
      return;
    store(term, 0, res.offset ?? 0);
  }

  let lastProgress = 0;

  for (let gen = 1; gen < depth; gen++) {
    yield { step: true, gen, total, probed, cache };
    if (!hasUpperHalf(gen, cache))
      return;

    lastProgress = total;

    for (let i = 0; i < gen; i++) {
      for (const a of cache[gen - i - 1] || []) {
        for (const b of cache[i] || []) {
          if (total >= (options.tries ?? Infinity)) {
            yield { step: false, gen, total, probed, cache };
            return;
          }
          if (total - lastProgress >= progressInterval) {
            yield { step: false, gen, total, probed, cache };
            lastProgress = total;
          }
          const term = a.apply(b);
          const { res, props } = maybeProbe(term);

          if (res.found !== undefined)
            yield { expr: term, found: res.found, step: false, gen, total, probed, cache };
          if (res.stop) {
            yield { step: false, gen, total, probed, cache };
            return;
          }
          if ((res.offset ?? 0) < 0)
            continue;

          // if the term is not reducible, it is more likely to be a dead end, so we push it further away
          const finalOffset = res.offset ?? (infer && props
            ? ((props.expr ? 0 : 3) + (props.dup ? 1 : 0) + (props.proper ? 0 : 1))
            : 0);
          store(term, gen, finalOffset);
        }
      }
    }
  }

  // last hopeless progress tick
  yield { step: false, gen: depth, total, probed, cache };
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

/**
 * Check if the upper half of a 2D array has any non-empty arrays.
 *
 * Used in search() to determine if any more generations are possible,
 * Since search() combines terms from the upper half with those in the lower half,
 * hasUpperHalf : false guarantees ALL future generations will be empty.
 *
 * @param list
 */
function hasUpperHalf<T> (gen: number, list: T[][]): boolean {
  for (let i = Math.floor(gen / 2); i < list.length; i++) {
    if (list[i] && list[i].length > 0)
      return true;
  }
  return false;
}

// --- Namespace export ---

export const extras = { search, deepFormat, declare, toposort, checkFormatOptions, equiv };
