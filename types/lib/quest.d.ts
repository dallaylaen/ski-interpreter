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
     *    cases: [{max: number?, note: string?, feedInput: boolean, lambdas: boolean?}|string[], ...string[][]]?
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
        cases: [{
            max: number | null;
            note: string | null;
            feedInput: boolean;
            lambdas: boolean | null;
        } | string[], ...string[][]] | null;
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
    input: import("./expr").FreeVar[];
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
    /**
     *
     * @param {{} | string} opt
     * @param {string} terms
     * @return {Quest}
     */
    add(opt: {} | string, ...terms: string): Quest;
    /**
     *
     * @param {Expr|string} input
     * @return {{
     *             expr: Expr?,
     *             pass: boolean,
     *             details: CaseResult[],
     *             exception: Error?,
     *             steps: number,
     *             input: Expr[]
     *         }}
     */
    check(...input: typeof import("./expr").Expr | string): {
        expr: typeof import("./expr").Expr | null;
        pass: boolean;
        details: CaseResult[];
        exception: Error | null;
        steps: number;
        input: typeof import("./expr").Expr[];
    };
    /**
       *
       * @return {TestCase[]}
       */
    show(): TestCase[];
}
declare class Case {
    /**
     * @param {FreeVar[]} input
     * @param {[e1: string, e2: string]} terms
     * @param {{
     *    max: number?,
     *    note: string?,
     *    vars: {string: Expr}?,
     *    engine: SKI?
     * }} options
     */
    constructor(input: typeof import("./expr").FreeVar[], terms: [e1: string, e2: string], options?: {
        max: number | null;
        note: string | null;
        vars: {
            string: typeof import("./expr").Expr;
        } | null;
        engine: SKI | null;
    });
    max: number;
    note: string;
    /**
     * @param {Expr} expr
     * @return {CaseResult}
     */
    check(...expr: typeof import("./expr").Expr): CaseResult;
}
import { SKI } from "./parser";
export {};
