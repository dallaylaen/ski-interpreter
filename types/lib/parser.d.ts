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
     *
     * @param {Alias|String} term
     * @param {Expr|String|[number, function(...Expr): Expr, {note: string?, fast: boolean?}]} [impl]
     * @param {String} [note]
     * @return {SKI} chainable
     */
    add(term: Alias | string, impl?: Expr | string | [number, (...args: Expr[]) => Expr, {
        note: string | null;
        fast: boolean | null;
    }], note?: string): SKI;
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
