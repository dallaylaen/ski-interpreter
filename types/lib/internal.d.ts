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
