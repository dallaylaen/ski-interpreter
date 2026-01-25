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
            [key: string]: Expr | string;
        } | string[];
        annotate?: boolean;
    });
    annotate: boolean;
    known: {};
    hasNumbers: boolean;
    hasLambdas: boolean;
    allow: any;
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
    add(term: Alias | string, impl?: string | Expr | ((arg0: Expr) => Partial), note?: string): SKI;
    _named(term: any, impl: any): Native | Alias;
    maybeAdd(name: any, impl: any): this;
    /**
     * @desc Declare and remove multiple terms at once
     *       term=impl adds term
     *       term= removes term
     * @param {string[]]} list
     * @return {SKI} chainable
     */
    bulkAdd(list: any): SKI;
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
        [key: string]: Native | Alias;
    };
    /**
     * Export term declarations for use in bulkAdd().
     * @returns {string[]}
     */
    declare(): string[];
    /**
     *
     * @param {string} source
     * @param {{[keys: string]: Expr}} vars
     * @param {{numbers: boolean?, lambdas: boolean?, allow: string?}} options
     * @return {Expr}
     */
    parse(source: string, vars?: {
        [keys: string]: Expr;
    }, options?: {
        numbers: boolean | null;
        lambdas: boolean | null;
        allow: string | null;
    }): Expr;
    /**
     *
     * @param {String} source S(KI)I
     * @param {{[keys: string]: Expr}} vars
     * @param {{numbers: boolean?, lambdas: boolean?, allow: string?}} options
     * @return {Expr} parsed expression
     */
    parseLine(source: string, vars?: {
        [keys: string]: Expr;
    }, options?: {
        numbers: boolean | null;
        lambdas: boolean | null;
        allow: string | null;
    }): Expr;
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
     * Create free var(s) for subsequent use
     * @param {String} names
     * @return {FreeVar[]}
     */
    export function free(...names: string): FreeVar[];
    /**
     * Convert a number to Church encoding
     * @param {number} n
     * @return {Church}
     */
    export function church(n: number): Church;
    export namespace classes {
        export { Expr };
        export { Native };
        export { Alias };
        export { FreeVar };
        export { Lambda };
        export { Church };
    }
    export { native };
    export { globalOptions as options };
    export let lambdaPlaceholder: Native;
}
import { Alias } from "./expr";
import { Expr } from "./expr";
import { Native } from "./expr";
import { FreeVar } from "./expr";
import { Church } from "./expr";
import { Lambda } from "./expr";
import { native } from "./expr";
import { globalOptions } from "./expr";
