export class SKI {
    /**
     *
     * @param {{
     *    allow?: string,
     *    numbers?: boolean,
     *    lambdas?: boolean,
     *    terms?: { [key: string]: Expr|string} | string[],
     *    annotate?: boolean,
     * }} [options]
     */
    constructor(options?: {
        allow?: string;
        numbers?: boolean;
        lambdas?: boolean;
        terms?: {
            [key: string]: typeof classes.Expr | string;
        } | string[];
        annotate?: boolean;
    });
    annotate: boolean;
    known: {
        [key: string]: classes.Native;
    };
    hasNumbers: boolean;
    hasLambdas: boolean;
    /** @type {Set<string>} */
    allow: Set<string>;
    /**
     * @desc Declare a new term
     * If the first argument is an Alias, it is added as is.
     * Otherwise, a new Alias or Native term (depending on impl type) is created.
     * If note is not provided and this.annotate is true, an automatic note is generated.
     *
     * If impl is a function, it should have signature (Expr) => ... => Expr
     * (see typedef Partial at top of expr.js)
     *
     * @example ski.add('T', 'S(K(SI))K', 'swap combinator')
     * @example ski.add( ski.parse('T = S(K(SI))K') ) // ditto but one-arg form
     * @example ski.add('T', x => y => y.apply(x), 'swap combinator') // heavy artillery
     * @example ski.add('Y', function (f) { return f.apply(this.apply(f)); }, 'Y combinator')
     *
     * @param {Alias|String} term
     * @param {String|Expr|function(Expr):Partial} [impl]
     * @param {String} [note]
     * @return {SKI} chainable
     */
    add(term: typeof classes.Alias | string, impl?: string | typeof classes.Expr | ((arg0: typeof classes.Expr) => Partial), note?: string): SKI;
    /**
     * @desc Internal helper for add() that creates an Alias or Native term from the given arguments.
     * @param {Alias|string} term
     * @param {string|Expr|function(Expr):Partial} impl
     * @returns {Native|Alias}
     * @private
     */
    private _named;
    /**
     * @desc Declare a new term if it is not known, otherwise just allow it.
     *       Currently only used by quests.
     *       Use with caution, this function may change its signature, behavior, or even be removed in the future.
     *
     * @experimental
     * @param {string|Alias} name
     * @param {string|Expr|function(Expr):Partial} impl
     * @returns {SKI}
     */
    maybeAdd(name: string | typeof classes.Alias, impl: string | typeof classes.Expr | ((arg0: typeof classes.Expr) => Partial)): SKI;
    /**
     * @desc Declare and remove multiple terms at once
     *       term=impl adds term
     *       term= removes term
     * @param {string[]} list
     * @return {SKI} chainable
     */
    bulkAdd(list: string[]): SKI;
    /**
     * Restrict the interpreter to given terms. Terms prepended with '+' will be added
     * and terms preceeded with '-' will be removed.
     * @example ski.restrict('SK') // use the basis
     * @example ski.restrict('+I') // allow I now
     * @example ski.restrict('-SKI +BCKW' ); // switch basis
     * @example ski.restrict('-foo -bar'); // forbid some user functions
     * @param {string} spec
     * @return {SKI} chainable
     */
    restrict(spec: string): SKI;
    /**
     *
     * @param {string} spec
     * @return {string}
     */
    showRestrict(spec?: string): string;
    /**
     *
     * @param {String} name
     * @return {SKI}
     */
    remove(name: string): SKI;
    /**
     *
     * @return {{[key:string]: Native|Alias}}
     */
    getTerms(): {
        [key: string]: typeof classes.Native | typeof classes.Alias;
    };
    /**
     * @desc Export term declarations for use in bulkAdd().
     * Currently only Alias terms are serialized.
     * @returns {string[]}
     */
    declare(): string[];
    /**
     * @template T
     * @param {string} source
     * @param {Object} [options]
     * @param {{[keys: string]: Expr}} [options.env]
     * @param {T} [options.scope]
     * @param {boolean} [options.numbers]
     * @param {boolean} [options.lambdas]
     * @param {string} [options.allow]
     * @return {Expr}
     */
    parse<T_1>(source: string, options?: {
        env?: {
            [keys: string]: typeof classes.Expr;
        };
        scope?: T_1;
        numbers?: boolean;
        lambdas?: boolean;
        allow?: string;
    }): typeof classes.Expr;
    /**
     * @desc Parse a single line of source code, without splitting it into declarations.
     *       Internal, always use parse() instead.
     * @template T
     * @param {String} source S(KI)I
     * @param {{[keys: string]: Expr}} env
     * @param {Object} [options]
     * @param {{[keys: string]: Expr}} [options.env] - unused, see 'env' argument
     * @param {T} [options.scope]
     * @param {boolean} [options.numbers]
     * @param {boolean} [options.lambdas]
     * @param {string} [options.allow]
     * @return {Expr} parsed expression
     */
    parseLine<T_1>(source: string, env?: {
        [keys: string]: typeof classes.Expr;
    }, options?: {
        env?: {
            [keys: string]: typeof classes.Expr;
        };
        scope?: T_1;
        numbers?: boolean;
        lambdas?: boolean;
        allow?: string;
    }): typeof classes.Expr;
    toJSON(): {
        version: string;
        allow: string;
        numbers: boolean;
        lambdas: boolean;
        annotate: boolean;
        terms: string[];
    };
}
export namespace SKI {
    /**
     *  Public static shortcuts to common functions (see also ./extras.js)
     */
    /**
     * @desc Create a proxy object that generates variables on demand,
     *       with names corresponding to the property accessed.
     *       Different invocations will return distinct variables,
     *       even if with the same name.
     *
     *
     * @example const {x, y, z} = SKI.vars();
     *          x.name; // 'x'
     *          x instanceof FreeVar; // true
     *          x.apply(y).apply(z); // x(y)(z)
     *
     * @template T
     * @param {T} [scope] - optional context to bind the generated variables to
     * @return {{[key: string]: FreeVar}}
     */
    export function vars<T_1>(scope?: T_1): {
        [key: string]: typeof import("./expr").FreeVar;
    };
    /**
     * Convert a number to Church encoding
     * @param {number} n
     * @return {Church}
     */
    export function church(n: number): typeof import("./expr").Church;
    export { classes };
    export { native };
    export let control: {
        descend: (arg0: T) => TraverseControl<T>;
        prune: (arg0: T) => TraverseControl<T>;
        redo: (arg0: T) => TraverseControl<T>;
        stop: (arg0: T) => TraverseControl<T>;
    };
}
import classes = require("./expr");
declare const native: {
    [key: string]: classes.Native;
};
export {};
