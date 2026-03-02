"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TraverseControl = exports.Tokenizer = void 0;
exports.restrict = restrict;
exports.unwrap = unwrap;
exports.prepareWrapper = prepareWrapper;
class Tokenizer {
    constructor(...terms) {
        const src = '$|(\\s+)|' + terms
            .map(s => '(?:' + s + ')')
            .sort((a, b) => b.length - a.length)
            .join('|');
        this.rex = new RegExp(src, 'gys');
    }
    /**
     * @desc Split the given string into tokens according to the terms specified in the constructor.
     * @param {string} str
     * @return {string[]}
     */
    split(str) {
        var _a;
        this.rex.lastIndex = 0;
        const list = [...str.matchAll(this.rex)];
        // did we parse everything?
        const eol = list.pop();
        const last = (_a = eol === null || eol === void 0 ? void 0 : eol.index) !== null && _a !== void 0 ? _a : 0;
        if (last !== str.length) {
            throw new Error('Unknown tokens at pos ' + last + '/' + str.length
                + ' starting with ' + str.substring(last));
        }
        // skip whitespace
        return list.filter(x => x[1] === undefined).map(x => x[0]);
    }
}
exports.Tokenizer = Tokenizer;
const tokRestrict = new Tokenizer('[-=+]', '[A-Z]', '\\b[a-z_][a-z_0-9]*\\b');
/**
 * @desc Add ot remove tokens from a set according to a spec string.
 * The spec string is a sequence of tokens, with each group optionally prefixed
 * by one of the operators '=', '+', or '-'.
 * The '=' operator resets the set to contain only the following token(s).
 * @param {Set<string>} set
 * @param {string} [spec]
 * @returns {Set<string>}
 */
function restrict(set, spec) {
    if (!spec)
        return set;
    let out = new Set([...set]);
    const act = {
        '=': sym => { out = new Set([sym]); mode = '+'; },
        '+': sym => { out.add(sym); },
        '-': sym => { out.delete(sym); },
    };
    let mode = '=';
    for (const sym of tokRestrict.split(spec)) {
        if (act[sym])
            mode = sym;
        else
            act[mode](sym);
    }
    return out;
}
class TraverseControl {
    constructor(value, decoration) {
        this.value = value;
        this.decoration = decoration;
    }
}
exports.TraverseControl = TraverseControl;
/**
 * @private
 * @template T
 * @param {T|TraverseControl<T>|null} value
 * @returns {[T?, function|undefined]}
 */
function unwrap(value) {
    var _a;
    // `?? undefined` so that null is not 'an object'
    if (value instanceof TraverseControl)
        return [(_a = value.value) !== null && _a !== void 0 ? _a : undefined, value.decoration];
    return [value !== null && value !== void 0 ? value : undefined, undefined];
}
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
function prepareWrapper(label) {
    const fun = value => new TraverseControl(value, fun);
    // @ts-ignore
    fun.label = label;
    fun.toString = () => 'TraverseControl::' + label;
    return fun;
}
