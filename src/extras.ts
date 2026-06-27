'use strict';

import { Expr, Named, FormatOptions, TermInfo, toposort } from './expr';
import { Quest } from './quest';

/**
 *   Extra utilities that do not belong in the core.
 */

// --- Types ---

export type SearchCallbackResult = {
  /** ≥0 = cache at gen+offset; negative = discard; omitted = auto-compute */
  offset?: number;
  /** true = emit this term as a found result */
  found?: boolean;
  /** true = stop the search (after yielding if found is also true) */
  stop?: boolean;
};
export type SearchOptions = {
  /** maximum generation to search for */
  depth?: number;
  /** maximum number of tried terms before giving up */
  tries?: number;
  /** whether to call infer() on each term; default true */
  infer?: boolean;
  /** maximum number of arguments in infer(), see {@link infer} */
  maxArgs?: number;
  /** maximum number of steps in infer(), see {@link infer} */
  max?: number;
  /** prevents skipping equivalent terms. Always true if infer is false. */
  noskip?: boolean;
  /** minimum number of tries between progress yields, default 1000 */
  progressInterval?: number;
};
export type SearchCallback = (e: Expr, props: TermInfo) => (SearchCallbackResult | number | undefined);
/** Yielded by the search generator on every progress tick and on each found term. */
export type SearchProgress = {
  /** The found expression; present only when found === true. */
  expr?: Expr;
  /** True when this yield carries a found term. */
  found: boolean;
  /** True when this is a new-generation tick (step progress), false for mid-generation ticks. */
  step: boolean;
  gen: number;
  total: number;
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
function * search (seed: Expr[], options: SearchOptions, predicate: SearchCallback): Generator<SearchProgress> {
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

  /** Normalize the callback return to a {offset, found, stop} record. */
  const parseResult = (raw: SearchCallbackResult | number | undefined): SearchCallbackResult => {
    if (raw === null || raw === undefined)
      return {};
    if (typeof raw === 'number')
      return raw > 0 ? { found: true, stop: true } : raw < 0 ? { offset: -1 } : {};
    return raw;
  };

  const maybeProbe = (term: Expr) => {
    total++;
    const props = infer ? term.infer({ max: options.max, maxArgs: options.maxArgs }) : null;
    if (hasSeen && props && props.expr) {
      const key = String(props.expr);
      if (seen[key])
        return { res: { offset: -1 } as SearchCallbackResult, props };
      seen[key] = true;
    }
    probed++;
    const res = parseResult(predicate(term, props!));
    return { res, props };
  };

  // sieve through the seed
  for (const term of seed) {
    const { res } = maybeProbe(term);
    if (res.found)
      yield { expr: term, found: true, step: false, gen: 0, total, probed, cache };
    if (res.stop)
      return;
    if ((res.offset ?? 0) >= 0)
      cache[0].push(term);
  }

  let lastProgress = 0;

  for (let gen = 1; gen < depth; gen++) {
    yield { found: false, step: true, gen, total, probed, cache };
    lastProgress = total;

    for (let i = 0; i < gen; i++) {
      for (const a of cache[gen - i - 1] || []) {
        for (const b of cache[i] || []) {
          if (total >= (options.tries ?? Infinity)) {
            yield { found: false, step: false, gen, total, probed, cache };
            return;
          }
          if (total - lastProgress >= progressInterval) {
            yield { found: false, step: false, gen, total, probed, cache };
            lastProgress = total;
          }
          const term = a.apply(b);
          const { res, props } = maybeProbe(term);

          if (res.found)
            yield { expr: term, found: true, step: false, gen, total, probed, cache };
          if (res.stop) {
            yield { found: false, step: false, gen, total, probed, cache };
            return;
          }
          if ((res.offset ?? 0) < 0)
            continue;

          // if the term is not reducible, it is more likely to be a dead end, so we push it further away
          const autoOffset = infer && props
            ? ((props.expr ? 0 : 3) + (props.dup ? 1 : 0) + (props.proper ? 0 : 1))
            : 0;
          const finalOffset = res.offset ?? autoOffset;
          if (!cache[gen + finalOffset])
            cache[gen + finalOffset] = [];
          cache[gen + finalOffset].push(term);
        }
      }
    }
  }
  yield { found: false, step: false, gen: depth, total, probed, cache };
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
