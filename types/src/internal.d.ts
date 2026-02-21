export class Tokenizer {
    /**
     * @desc Create a tokenizer that splits strings into tokens according to the given terms.
     * The terms are interpreted as regular expressions, and are sorted by length
     * to ensure that longer matches are preferred over shorter ones.
     * @param {...string|RegExp} terms
     */
    constructor(...terms: (string | RegExp)[]);
    rex: RegExp;
    /**
     * @desc Split the given string into tokens according to the terms specified in the constructor.
     * @param {string} str
     * @return {string[]}
     */
    split(str: string): string[];
}
/**
 * @desc Add ot remove tokens from a set according to a spec string.
 * The spec string is a sequence of tokens, with each group optionally prefixed
 * by one of the operators '=', '+', or '-'.
 * The '=' operator resets the set to contain only the following token(s).
 * @param {Set<string>} set
 * @param {string} [spec]
 * @returns {Set<string>}
 */
export function restrict(set: Set<string>, spec?: string): Set<string>;
/**
 * @private
 * @template T
 * @param {T|TraverseControl<T>|null} value
 * @returns {[T?, function|undefined]}
 */
export function unwrap<T>(value: T | TraverseControl<T> | null): [T?, Function | undefined];
/**
 * @desc Prepare a self-referencing wrapper function for use as a fold/traverse control decorator.
 *
 *       If `fun` is created by `prepareWrapper`, then
 *       unwrap(fun(x)) will always return exactly [x, fun], and the second value can be checked with ===.
 *
 *       An optional label can be provided for debugging purposes.
 *
 * @private
 * @template T
 * @param {string} [label]
 * @returns {function(T): TraverseControl<T>}
 */
export function prepareWrapper<T>(label?: string): (arg0: T) => TraverseControl<T>;
declare class TraverseControl {
    /**
     * @desc A wrapper for values returned by fold/traverse callbacks
     *       which instructs the traversal to alter its behavior while
     *       retaining the value in question.
     *
     *       This class is instantiated internally be `SKI.control.*` functions,
     *       and is not intended to be used directly by client code.
     *
     * @template T
     * @param {T} value
     * @param {function(T): TraverseControl<T>} decoration
     */
    constructor(value: T, decoration: (arg0: T) => TraverseControl<T>);
    value: T;
    decoration: (arg0: T) => TraverseControl<T>;
}
export {};
