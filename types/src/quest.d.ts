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
export type InputSpec = string | {
    name: string;
    fancy?: string;
    allow?: string;
    numbers?: boolean;
    lambdas?: boolean;
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
 * @typedef {string | {name: string, fancy?: string, allow?: string, numbers?: boolean, lambdas?: boolean}} InputSpec
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
/**
 * @typedef {{
 *    input: InputSpec | InputSpec[],
 *    cases: TestCase[],
 *
 *    // the rest is optional
 *
 *    allow?: string,
 *    numbers?: boolean,
 *    env?: string[],
 *    engine?: SKI,
 *    engineFull?: SKI,
 *
 *    // metadata, also any fields not listed here will go to quest.meta.???
 *    id?: string|number,
 *    name?: string,
 *    intro?: string|string[], // multiple strings will be concatenated with spaces
 * }} QuestSpec
 */
export class Quest {
    /**
     * @description A combinator problem with a set of test cases for the proposed solution.
     * @param {QuestSpec} options
     * @example const quest = new Quest({
     *    input: 'identity',
     *    cases: [
     *      ['identity x', 'x'],
     *    ],
     *    allow: 'SK',
     *    intro: 'Find a combinator that behaves like the identity function.',
     * });
     * quest.check('S K K'); // { pass: true, details: [...], ... }
     * quest.check('K S');   // { pass: false, details: [...], ... }
     * quest.check('K x');   // fail! internal variable x is not equal to free variable x,
     *                       //     despite having the same name.
     * quest.check('I');     // fail! I not in the allowed list.
     */
    constructor(options: QuestSpec);
    engine: any;
    engineFull: any;
    restrict: {
        allow: QuestSpec;
        numbers: any;
        lambdas: any;
    };
    env: {};
    input: any[];
    envFull: {};
    cases: any[];
    name: any;
    intro: any;
    id: any;
    meta: QuestSpec;
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
