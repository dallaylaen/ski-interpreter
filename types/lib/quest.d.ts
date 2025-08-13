export type CaseResult = {
    pass: boolean;
    reason: string | null;
    steps: number;
    start: typeof import("./expr").Expr;
    found: typeof import("./expr").Expr;
    expected: typeof import("./expr").Expr;
    note: string | null;
    args: typeof import("./expr").Expr[];
    case: Case;
};
export type Capability = {
    linear: boolean | null;
    affine: boolean | null;
    grounded: boolean | null;
    proper: boolean | null;
    discard: boolean | null;
    duplicate: boolean | null;
    arity: number | null;
};
/**
 * @typedef {{
 *   pass: boolean,
 *   reason: string?,
 *   steps: number,
 *   start: Expr,
 *   found: Expr,
 *   expected: Expr,
 *   note: string?,
 *   args: Expr[],
 *   case: Case
 * }} CaseResult
 */
/**
 * @typedef {{
 *   linear: boolean?,
 *   affine: boolean?,
 *   grounded: boolean?,
 *   proper: boolean?,
 *   discard: boolean?,
 *   duplicate: boolean?,
 *   arity: number?,
 * }} Capability
 */
/**
 * @typedef {
 *   [string, string]
 *   | [{max: number?}, string, string]
 *   | [{caps: Capability, max: number?}, string]
 * } TestCase
 */
export class Quest {
    /**
     * @description A combinator problem with a set of test cases for the proposed solution.
     * @param {{
     *    title: string?,
     *    descr: string?,
     *    subst: string?,
     *    allow: string?,
     *    numbers: boolean?,
     *    vars: string[]?,
     *    engine: SKI?,
     *    engineFull: SKI?,
     *    cases: TestCase[],
     * }} options
     */
    constructor(options?: {
        title: string | null;
        descr: string | null;
        subst: string | null;
        allow: string | null;
        numbers: boolean | null;
        vars: string[] | null;
        engine: SKI | null;
        engineFull: SKI | null;
        cases: TestCase[];
    });
    engine: SKI;
    engineFull: SKI;
    restrict: {
        allow: string;
        numbers: boolean;
        lambdas: any;
    };
    vars: {};
    subst: string[] | (string & any[]);
    input: any[];
    varsFull: {};
    cases: any[];
    title: string;
    descr: string;
    meta: {
        title: string | null;
        descr: string | null;
    };
    /**
     *   Display allowed terms based on what engine thinks of this.vars + this.restrict.allow
     *   @return {string}
     */
    allowed(): string;
    addInput(term: any): void;
    /**
     *
     * @param {{} | string} opt
     * @param {string} terms
     * @return {Quest}
     */
    add(opt: {} | string, ...terms: string): Quest;
    /**
     * @description Statefully parse a list of strings into expressions or fancy aliases thereof.
     * @param {string[]} input
     * @return {{terms: Expr[], weight: number}}
     */
    prepare(...input: string[]): {
        terms: typeof import("./expr").Expr[];
        weight: number;
    };
    /**
     *
     * @param {string} input
     * @return {{
     *             expr: Expr?,
     *             pass: boolean,
     *             details: CaseResult[],
     *             exception: Error?,
     *             steps: number,
     *             input: Expr[]|string[],
     *             weight: number?
     *         }}
     */
    check(...input: string): {
        expr: typeof import("./expr").Expr | null;
        pass: boolean;
        details: CaseResult[];
        exception: Error | null;
        steps: number;
        input: typeof import("./expr").Expr[] | string[];
        weight: number | null;
    };
    /**
       *
       * @return {TestCase[]}
       */
    show(): TestCase[];
}
declare class Case {
    constructor(input: any, options: any);
    max: any;
    note: any;
    vars: any;
    input: any;
    engine: any;
    parse(src: any): import("./expr").Lambda;
    /**
     * @param {Expr} expr
     * @return {CaseResult}
     */
    check(...expr: typeof import("./expr").Expr): CaseResult;
}
import { SKI } from "./parser";
export {};
