export class Inspector extends Expr {
    /**
       *
       * @param {string} name
       * @param {{arity: number, onReduce: function(Expr[]): Expr}} opt
       */
    constructor(name: string, opt?: {
        arity: number;
        onReduce: (arg0: Expr[]) => Expr;
    });
    name: string;
    reduce: (args: any) => any;
    register(): this;
    toString(options?: {}): string;
}
/**
 *   @classdesc
 *   Inspector is a pseudo-term that, unlike a normal combinator,
 *   may access the structure of the terms it is applied to.
 */
/**
 *
 * @type {{[key: string]: Injection}}
 */
export const inspectors: {
    [key: string]: Injection;
};
import { Expr } from "./expr";
