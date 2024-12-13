export class SKI {
    /**
     *
     * @param {{
     *    allow: string?,
     *    numbers: boolean?,
     *    lambdas: boolean?,
     *    inspectors: boolean?,
     *    terms: { [key: string]: Expr|string}?
     * }} [options]
     */
    constructor(options?: {
        allow: string | null;
        numbers: boolean | null;
        lambdas: boolean | null;
        inspectors: boolean | null;
        terms: {
            [key: string]: Expr | string;
        } | null;
    });
    known: {
        [x: string]: Native;
    };
    hasNumbers: boolean;
    hasLambdas: boolean;
    allow: any;
    inspectors: {
        [x: string]: Injection;
    };
    /**
     *
     * @param {String} name
     * @param {Expr|String|[number, function(...Expr): Expr, {note: string?, fast: boolean?}]} impl
     * @param {String} [note]
     * @return {SKI} chainable
     */
    add(name: string, impl: Expr | string | [number, (...args: Expr[]) => Expr, {
        note: string | null;
        fast: boolean | null;
    }], note?: string): SKI;
    maybeAdd(name: any, impl: any): this;
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
     * @return {{[key:string]: Expr}}
     */
    getTerms(): {
        [key: string]: Expr;
    };
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
        allow: string;
        numbers: boolean;
        lambdas: boolean;
        terms: {
            [key: string]: Expr;
        };
    };
}
export namespace SKI {
    /**
     * Create free var(s) for subsequent use
     * @param {String} names
     * @return {FreeVar[]}
     */
    function free(...names: string): FreeVar[];
    /**
     * Convert a number to Church encoding
     * @param {number} n
     * @return {Church}
     */
    function church(n: number): Church;
    namespace classes {
        export { Expr };
        export { Native };
        export { Alias };
        export { FreeVar };
        export { Lambda };
        export { Inspector };
    }
}
import { Native } from "./expr";
import { Expr } from "./expr";
import { FreeVar } from "./expr";
import { Church } from "./expr";
import { Alias } from "./expr";
import { Lambda } from "./expr";
import { Inspector } from "./inspector";
