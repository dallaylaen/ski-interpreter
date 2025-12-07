export type AnyArity = (arg0: Expr) => Expr | AnyArity;
export class Expr {
    /**
       * postprocess term after parsing. typically return self but may return other term or die
       * @return {Expr}
       */
    postParse(): Expr;
    /**
       * @desc apply self to zero or more terms and return the resulting term,
       * without performing any calculations whatsoever
       * @param {Expr} args
       * @return {Expr}
       */
    apply(...args: Expr): Expr;
    /**
       * expand all terms but don't perform any calculations
       * @return {Expr}
       */
    expand(): Expr;
    /**
     * @desc return all free variables within the term
     * @return {Set<FreeVar>}
     */
    freeVars(): Set<FreeVar>;
    hasLambda(): any;
    freeOnly(): boolean;
    /**
     * @desc return all terminal values within the term, that is, values not
     * composed of other terms. For example, in S(KI)K, the terminals are S, K, I.
     * @return {Map<Expr, number>}
     */
    getSymbols(): Map<Expr, number>;
    /**
     *   @desc Given a list of pairs of term, replaces every subtree
     *         that is equivalent to the first term in pair with the second one.
     *         If a simgle term is given, it is duplicated into a pair.
     *
     *   @example  S(SKK)(SKS).replace('I') = SII // we found 2 subtrees equivalent to I
     *             and replaced them with I
     *
     *   @param {(Expr | [find: Expr, replace: Expr])[]} terms
     *   @param {Object} [opt] - options
     *   @return {Expr}
     */
    replace(terms: (Expr | [find: Expr, replace: Expr])[], opt?: any): Expr;
    _replace(pairs: any, opt: any): any;
    /**
     * @desc rought estimate of the complexity of the term
     * @return {number}
     */
    weight(): number;
    /**
     * @desc Try to find an equivalent lambda term for the expression,
     *       returning also the term's arity and some other properties.
     *
     *       This is used internally when declaring a Native term,
     *       unless {canonize: false} is used.
     *
     *       As of current it only recognizes terms that have a normal form,
     *       perhaps after adding some variables. This may change in the future.
     *
     *       Use lambdify() if you want to get a lambda term in any case.
     *
     * @param {{max: number?, maxArgs: number?}} options
     * @return {{
     *    normal: boolean,
     *    steps: number,
     *    expr: Expr?,
     *    arity: number?,
     *    proper: boolean?,
     *    discard: boolean?,
     *    duplicate: boolean?,
     *    skip: Set<number>?,
     *    dup: Set<number>?
     * }}
     */
    guess(options?: {
        max: number | null;
        maxArgs: number | null;
    }): {
        normal: boolean;
        steps: number;
        expr: Expr | null;
        arity: number | null;
        proper: boolean | null;
        discard: boolean | null;
        duplicate: boolean | null;
        skip: Set<number> | null;
        dup: Set<number> | null;
    };
    _guess(options: any, preArgs?: any[], steps?: number): any;
    _aslist(): this[];
    _firstVar(): boolean;
    /**
     * @desc Returns a series of lambda terms equivalent to the given expression,
     *       up to the provided computation steps limit,
     *       in decreasing weight order.
     * @param {{
     *   max: number?,
     *   maxArgs: number?,
     *   varGen: function(void): FreeVar?,
     *   steps: number?,
     *   html: boolean?,
     *   latin: number?,
     * }} options
     * @param {number} [maxWeight] - maximum allowed weight of terms in the sequence
     * @return {IterableIterator<{expr: Expr, steps: number?, comment: string?}>}
     */
    lambdify(options?: {
        max: number | null;
        maxArgs: number | null;
        varGen: (arg0: void) => FreeVar | null;
        steps: number | null;
        html: boolean | null;
        latin: number | null;
    }): IterableIterator<{
        expr: Expr;
        steps: number | null;
        comment: string | null;
    }>;
    /**
     * @desc same semantics as walk() but rewrite step by step instead of computing
     * @param {{max: number?}} options
     * @return {IterableIterator<{final: boolean, expr: Expr, steps: number}>}
     */
    rewriteSKI(options?: {
        max: number | null;
    }): IterableIterator<{
        final: boolean;
        expr: Expr;
        steps: number;
    }>;
    /**
     * @desc Rename free variables in the expression using the given sequence
     *       This is for eye-candy only, as the interpreter knows darn well hot to distinguish vars,
     *       regardless of names.
     * @param {IterableIterator<string>} seq
     * @return {Expr}
     */
    renameVars(seq: IterableIterator<string>): Expr;
    _rski(options: any): this;
    /**
       * Apply self to list of given args.
       * Normally, only native combinators know how to do it.
       * @param {Expr[]} args
       * @return {Expr|null}
       */
    reduce(args: Expr[]): Expr | null;
    /**
       * Replace all instances of free vars with corresponding values and return the resulting expression.
       * return null if no changes could be made.
       * @param {FreeVar} plug
       * @param {Expr} value
       * @return {Expr|null}
       */
    subst(plug: FreeVar, value: Expr): Expr | null;
    /**
       * @desc iterate one step of calculation in accordance with known rules.
       * @return {{expr: Expr, steps: number, changed: boolean}}
       */
    step(): {
        expr: Expr;
        steps: number;
        changed: boolean;
    };
    /**
       * @desc Run uninterrupted sequence of step() applications
       *       until the expression is irreducible, or max number of steps is reached.
       *       Default number of steps = 1000.
       * @param {{max: number?, steps: number?, throw: boolean?}|Expr} [opt]
       * @param {Expr} args
       * @return {{expr: Expr, steps: number, final: boolean}}
       */
    run(opt?: {
        max: number | null;
        steps: number | null;
        throw: boolean | null;
    } | Expr, ...args: Expr): {
        expr: Expr;
        steps: number;
        final: boolean;
    };
    /**
       * Execute step() while possible, yielding a brief description of events after each step.
       * Mnemonics: like run() but slower.
       * @param {{max: number?}} options
       * @return {IterableIterator<{final: boolean, expr: Expr, steps: number}>}
       */
    walk(options?: {
        max: number | null;
    }): IterableIterator<{
        final: boolean;
        expr: Expr;
        steps: number;
    }>;
    /**
     *
     * @param {Expr} other
     * @return {boolean}
     */
    equals(other: Expr): boolean;
    contains(other: any): boolean;
    /**
     * @desc Assert expression equality. Can be used in tests.
     * @param {Expr} expected
     * @param {string} comment
     */
    expect(expected: Expr, comment?: string): void;
    /**
     * @param {{terse: boolean?, html: boolean?}} [options]
     * @return {string} string representation of the expression
     */
    toString(options?: {
        terse: boolean | null;
        html: boolean | null;
    }): string;
    /**
     * @desc Whether the expression needs parentheses when printed.
     * @param {boolean} [first] - whether this is the first term in a sequence
     * @return {boolean}
     */
    needsParens(first?: boolean): boolean;
    _spaced(arg: any): boolean;
    /**
     * @desc    Stringify the expression with fancy formatting options.
     *          Said options mostly include wrappers around various constructs in form of ['(', ')'],
     *          as well as terse and html flags that set up the defaults.
     *          Format without options is equivalent to toString() and can be parsed back.
     *
     * @param   {{
     *    terse:  boolean?,
     *    html: boolean?,
     *    brackets: [string, string]?,
     *    var:      [string, string]?,
     *    lambda:   [string, string, string]?,
     *    around:   [string, string]?,
     *    redex:    [string, string]?,
     * }} options
     * @returns {string}
     */
    format(options?: {
        terse: boolean | null;
        html: boolean | null;
        brackets: [string, string] | null;
        var: [string, string] | null;
        lambda: [string, string, string] | null;
        around: [string, string] | null;
        redex: [string, string] | null;
    }): string;
    _format(options: any, nargs: any): void;
    /**
     *
     * @return {string}
     */
    toJSON(): string;
}
export namespace Expr {
    let lambdaPlaceholder: Native;
}
export class App extends Expr {
    /**
     * @desc Application of fun() to args.
     * Never ever use new App(fun, ...args) directly, use fun.apply(...args) instead.
     * @param {Expr} fun
     * @param {Expr} args
     */
    constructor(fun: Expr, ...args: Expr);
    arg: any;
    fun: any;
    final: boolean;
    arity: any;
    weight(): any;
    _firstVar(): any;
    apply(...args: any[]): App;
    expand(): any;
    renameVars(seq: any): any;
    subst(plug: any, value: any): any;
    /**
     * @return {{expr: Expr, steps: number}}
     */
    step(): {
        expr: Expr;
        steps: number;
    };
    reduce(args: any): any;
    split(): any[];
    _aslist(): any[];
    equals(other: any): any;
    contains(other: any): any;
    needsParens(first: any): boolean;
    toString(opt?: {}): string;
    _format(options: any, nargs: any): any;
    _spaced(arg: any): any;
}
export class FreeVar extends Named {
    constructor(name: any);
    id: number;
    subst(plug: any, value: any): any;
    toString(opt?: {}): string;
    _format(options: any, nargs: any): string;
}
export class Lambda extends Expr {
    /**
       * @param {FreeVar|FreeVar[]} arg
       * @param {Expr} impl
       */
    constructor(arg: FreeVar | FreeVar[], impl: Expr);
    arg: FreeVar;
    impl: Expr;
    arity: number;
    reduce(input: any): Expr;
    subst(plug: any, value: any): Lambda;
    expand(): Lambda;
    renameVars(seq: any): Lambda;
    _rski(options: any): any;
    equals(other: any): boolean;
    toString(opt?: {}): string;
    _format(options: any, nargs: any): string;
    needsParens(first: any): boolean;
}
/**
 * @typedef {function(Expr): Expr | AnyArity} AnyArity
 */
export class Native extends Named {
    /**
     * @desc A term named 'name' that converts next 'arity' arguments into
     *       an expression returned by 'impl' function
     *       If an apply: Expr=>Expr|null function is given, it will be attempted upon application
     *       before building an App object. This allows to plug in argument coercions,
     *       e.g. instantly perform a numeric operation natively if the next term is a number.
     * @param {String} name
     * @param {AnyArity} impl
     * @param {{note: string?, arity: number?, canonize: boolean?, apply: function(Expr):(Expr|null) }} [opt]
     */
    constructor(name: string, impl: AnyArity, opt?: {
        note: string | null;
        arity: number | null;
        canonize: boolean | null;
        apply: (arg0: Expr) => (Expr | null);
    });
    impl: AnyArity;
    onApply: (arg0: Expr) => (Expr | null);
    arity: any;
    note: any;
    apply(...args: any[]): Expr;
    _rski(options: any): any;
    reduce(args: any): any;
    _format(options: any, nargs: any): string;
}
export class Alias extends Named {
    /**
     * @desc An existing expression under a different name.
     * @param {String} name
     * @param {Expr} impl
     * @param {{canonize: boolean?, max: number?, maxArgs: number?, note: string?, terminal: boolean?}} [options]
     */
    constructor(name: string, impl: Expr, options?: {
        canonize: boolean | null;
        max: number | null;
        maxArgs: number | null;
        note: string | null;
        terminal: boolean | null;
    });
    impl: Expr;
    note: string;
    arity: any;
    proper: any;
    terminal: any;
    canonical: any;
    subst(plug: any, value: any): Expr;
    /**
     *
     * @return {{expr: Expr, steps: number}}
     */
    step(): {
        expr: Expr;
        steps: number;
    };
    reduce(args: any): Expr;
    equals(other: any): any;
    _rski(options: any): Expr;
    toString(opt: any): string;
    needsParens(first: any): boolean;
    _format(options: any, nargs: any): string | void;
}
export class Church extends Native {
    constructor(n: any);
    n: any;
    arity: number;
    equals(other: any): boolean;
}
export namespace globalOptions {
    let terse: boolean;
    let max: number;
    let maxArgs: number;
}
export const native: {};
declare class Named extends Expr {
    /**
       * @desc a constant named 'name'
       * @param {String} name
       */
    constructor(name: string);
    name: string;
    toString(): string;
}
export {};
