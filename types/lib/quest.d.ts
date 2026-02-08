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
    normal: boolean | null;
    proper: boolean | null;
    discard: boolean | null;
    duplicate: boolean | null;
    arity: number | null;
};
export type QuestResult = {
    pass: boolean;
    details: CaseResult[];
    expr?: typeof import("./expr").Expr;
    input: typeof import("./expr").Expr[] | string[];
    exception?: Error;
    steps: number;
    weight?: number;
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
 *   normal: boolean?,
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
/**
 * @typedef {{
 *   pass: boolean,
 *   details: CaseResult[],
 *   expr?: Expr,
 *   input: Expr[]|string[],
 *   exception?: Error,
 *   steps: number,
 *   weight?: number
 * }} QuestResult
 */
export class Quest {
    /**
     * @description A combinator problem with a set of test cases for the proposed solution.
     * @param {{
     *    name: string?,
     *    intro: string?,
     *    subst: string?, // default for input[0].fancy, TODO remove
     *    allow: string?,
     *    numbers: boolean?,
     *    env: string[]?,
     *    engine: SKI?,
     *    engineFull: SKI?,
     *    cases: TestCase[],
     * }} options
     */
    constructor(options?: {
        name: string | null;
        intro: string | null;
        subst: string | null;
        allow: string | null;
        numbers: boolean | null;
        env: string[] | null;
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
    env: {};
    subst: string[] | (string & any[]);
    input: any[];
    envFull: {};
    cases: any[];
    name: any;
    intro: string;
    id: any;
    meta: {
        name: string | null;
        intro: string | null;
        env: string[] | null;
    };
    /**
     *   Display allowed terms based on what engine thinks of this.env + this.restrict.allow
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
     * @return {QuestResult}
     */
    check(...input: string): QuestResult;
    /**
       *
       * @return {TestCase[]}
       */
    show(): TestCase[];
}
declare class Case {
    /**
     * @param {FreeVar[]} input
     * @param {{
     *   max?: number,
     *   note?: string,
     *   env?: {[key:string]: Expr},
     *   engine: SKI
     * }} options
     */
    constructor(input: typeof import("./expr").FreeVar[], options: {
        max?: number;
        note?: string;
        env?: {
            [key: string]: typeof import("./expr").Expr;
        };
        engine: SKI;
    });
    max: number;
    note: string;
    env: {
        [key: string]: typeof import("./expr").Expr;
    };
    input: typeof import("./expr").FreeVar[];
    engine: SKI;
    parse(src: any): Subst;
    /**
     * @param {Expr} expr
     * @return {CaseResult}
     */
    check(...expr: typeof import("./expr").Expr): CaseResult;
}
import { SKI } from "./parser";
declare class Subst {
    /**
     * @descr A placeholder object with exactly n free variables to be substituted later.
     * @param {Expr} expr
     * @param {FreeVar[]} env
     */
    constructor(expr: typeof import("./expr").Expr, env: typeof import("./expr").FreeVar[]);
    expr: typeof import("./expr").Expr;
    env: typeof import("./expr").FreeVar[];
    apply(list: any): typeof import("./expr").Expr;
}
export {};
