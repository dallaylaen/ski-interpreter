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
 * @param {T|ActionWrapper<T>} value
 * @returns {[T?, string|undefined]}
 */
export function unwrap<T>(value: T | ActionWrapper<T>): [T?, string | undefined];
/**
 *
 * @private
 * @template T
 * @param {string} action
 * @returns {function(T): ActionWrapper<T>}
 */
export function prepareWrapper<T>(action: string): (arg0: T) => ActionWrapper<T>;
declare class ActionWrapper {
    /**
     * @template T
     * @param {T} value
     * @param {string} action
     */
    constructor(value: T, action: string);
    value: T;
    action: string;
}
export {};
