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
export function search(seed: Expr[], options: {
    depth?: number;
    tries?: number;
    infer?: boolean;
    maxArgs?: number;
    max?: number;
    noskip?: boolean;
    progress?: ({ gen: number, total: number, probed: number, step: boolean }: any) => void;
    progressInterval?: number;
}, predicate: (e: Expr, props: {}) => number | null): {
    expr?: Expr;
    total: number;
    probed: number;
    gen: number;
};
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
export function deepFormat(obj: any, options?: object): any;
import { Expr } from "./expr";
