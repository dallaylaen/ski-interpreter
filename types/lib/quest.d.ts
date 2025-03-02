export class Quest {
    /**
     *
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
     *             details: {pass: boolean, steps: number, found: Expr, expected: Expr, start: Expr?, args: Expr[]?}[],
     *             exception: Error?,
     *             steps: number,
     *             input: Expr[]
     *         }}
     */
    check(...input: typeof import("./expr").Expr | string): {
        expr: typeof import("./expr").Expr | null;
        pass: boolean;
        details: {
            pass: boolean;
            steps: number;
            found: typeof import("./expr").Expr;
            expected: typeof import("./expr").Expr;
            start: typeof import("./expr").Expr | null;
            args: typeof import("./expr").Expr[] | null;
        }[];
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
import { SKI } from "./parser";
