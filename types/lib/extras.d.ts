/**
 * @desc  Extra utilities that do not belong in the core.
 */
/**
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
 * @param {boolean} [options.noskip] - prevents skipping equivalent terms
 * @param {(e: Expr, props: {}) => number?} predicate
 * @return {{expr?: Expr, total: number, probed: number, gen: number}}
 */
export function search(seed: Expr[], options: {
    depth?: number;
    tries?: number;
    infer?: boolean;
    maxArgs?: number;
    max?: number;
    noskip?: boolean;
}, predicate: (e: Expr, props: {}) => number | null): {
    expr?: Expr;
    total: number;
    probed: number;
    gen: number;
};
