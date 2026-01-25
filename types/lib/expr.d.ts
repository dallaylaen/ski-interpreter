export type Partial = Expr | ((arg0: Expr) => Partial);
/**
 * @typedef {Expr | function(Expr): Partial} Partial
 */
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
     *    expr?: Expr,
     *    arity?: number,
     *    proper?: boolean,
     *    discard?: boolean,
     *    duplicate?: boolean,
     *    skip?: Set<number>,
     *    dup?: Set<number>,
     * }}
     */
    guess(options?: {
        max: number | null;
        maxArgs: number | null;
    }): {
        normal: boolean;
        steps: number;
        expr?: Expr;
        arity?: number;
        proper?: boolean;
        discard?: boolean;
        duplicate?: boolean;
        skip?: Set<number>;
        dup?: Set<number>;
    };
    _guess(options: any, preArgs?: any[], steps?: number): any;
    _aslist(): this[];
    _firstVar(): boolean;
    /**
     * @desc Returns a series of lambda terms equivalent to the given expression,
     *       up to the provided computation steps limit,
     *       in decreasing weight order.
     * @param {{
     *   max?: number,
     *   maxArgs?: number,
     *   varGen?: function(void): FreeVar,
     *   steps?: number,
     *   html?: boolean,
     *   latin?: number,
     * }} options
     * @param {number} [maxWeight] - maximum allowed weight of terms in the sequence
     * @return {IterableIterator<{expr: Expr, steps: number?, comment: string?}>}
     */
    lambdify(options?: {
        max?: number;
        maxArgs?: number;
        varGen?: (arg0: void) => FreeVar;
        steps?: number;
        html?: boolean;
        latin?: number;
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
    _rski(options: any): this;
    /**
     * Replace all instances of plug in the expression with value and return the resulting expression,
     * or null if no changes could be made.
     * Lambda terms and applications will never match if used as plug
     * as they are impossible co compare without extensive computations.
     * Typically used on variables but can also be applied to other terms, e.g. aliases.
     * See also Expr.replace().
     * @param {Expr} search
     * @param {Expr} replace
     * @return {Expr|null}
     */
    subst(search: Expr, replace: Expr): Expr | null;
    /**
     * @desc Apply term reduction rules, if any, to the given argument.
     * A returned value of null means no reduction is possible.
     * A returned value of Expr means the reduction is complete and the application
     *     of this and arg can be replaced with the result.
     * A returned value of a function means that further arguments are needed,
     *     and can be cached for when they arrive.
     *
     * This method is between apply() which merely glues terms together,
     *     and step() which reduces the whole expression.
     *
     * foo.invoke(bar) is what happens inside foo.apply(bar).step() before
     *     reduction of either foo or bar is attempted.
     *
     * The name 'invoke' was chosen to avoid confusion with either 'apply' or 'reduce'.
     *
     * @param {Expr} arg
     * @returns {Partial | null}
     */
    invoke(arg: Expr): Partial | null;
    /**
       * @desc iterate one step of a calculation.
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
     * @desc Returns string representation of the expression.
     *       Same as format() without options.
     * @return {string}
     */
    toString(): string;
    /**
     * @desc Whether the expression needs parentheses when printed.
     * @param {boolean} [first] - whether this is the first term in a sequence
     * @return {boolean}
     */
    _braced(first?: boolean): boolean;
    _unspaced(arg: any): boolean;
    /**
     * @desc    Stringify the expression with fancy formatting options.
     *          Said options mostly include wrappers around various constructs in form of ['(', ')'],
     *          as well as terse and html flags that set up the defaults.
     *          Format without options is equivalent to toString() and can be parsed back.
     *
     * @param   {Object} [options]  - formatting options
     * @param   {boolean} [options.terse]   - whether to use terse formatting (omitting unnecessary spaces and parentheses)
     * @param   {boolean} [options.html]    - whether to default to HTML tags & entities
     * @param   {[string, string]} [options.brackets]  - wrappers for application arguments, typically ['(', ')']
     * @param   {[string, string]} [options.var]       - wrappers for variable names
     *                                (will default to &lt;var&gt; and &lt;/var&gt; in html mode)
     * @param   {[string, string, string]} [options.lambda]    - wrappers for lambda abstractions, e.g. ['&lambda;', '.', '']
     *                                where the middle string is placed between argument and body
     *                                default is ['', '->', ''] or ['', '-&gt;', ''] for html
     * @param   {[string, string]} [options.around]    - wrappers around (sub-)expressions.
     *                                individual applications will not be wrapped, i.e. (a b c) but not ((a b) c)
     * @param   {[string, string]} [options.redex]     - wrappers around the starting term(s) that have enough arguments to be reduced
     * @param   {Object<string, Expr>} [options.inventory]     - if given, output aliases in the set as their names
     *                                and any other aliases as the expansion of their definitions.
     *                                The default is a cryptic and fragile mechanism dependent on a hidden mutable property.
     * @returns {string}
     *
     * @example foo.format() // equivalent to foo.toString()
     * @example foo.format({terse: false}) // spell out all parentheses
     * @example foo.format({html: true}) // use HTML tags and entities
     * @example foo.format({ around: ['(', ')'], brackets: ['', ''], lambda: ['(', '->', ')'] }) // lisp style, still back-parsable
     * @exapmle foo.format({ lambda: ['&lambda;', '.', ''] }) // pretty-print for the math department
     * @example foo.format({ lambda: ['', '=>', ''], terse: false }) // make it javascript
     * @example foo.format({ inventory: { T } }) // use T as a named term, expand all others
     *
     */
    format(options?: {
        terse?: boolean;
        html?: boolean;
        brackets?: [string, string];
        var?: [string, string];
        lambda?: [string, string, string];
        around?: [string, string];
        redex?: [string, string];
        inventory?: {
            [x: string]: Expr;
        };
    }): string;
    _format(options: any, nargs: any): void;
    _declare(output: any, inventory: any, seen: any): void;
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
    expand(): any;
    subst(search: any, replace: any): any;
    /**
     * @return {{expr: Expr, steps: number}}
     */
    step(): {
        expr: Expr;
        steps: number;
    };
    invoke(arg: any): any;
    split(): any[];
    _aslist(): any[];
    equals(other: any): any;
    contains(other: any): any;
    _braced(first: any): boolean;
    _format(options: any, nargs: any): any;
    _unspaced(arg: any): any;
}
export class FreeVar extends Named {
    constructor(name: any);
    id: number;
}
export class Lambda extends Expr {
    /**
     * @desc Lambda abstraction of arg over impl.
     *     Upon evaluation, all occurrences of 'arg' within 'impl' will be replaced
     *     with the provided argument.
     *
     * Note that 'arg' will be replaced by a localized placeholder, so the original
     * variable can be used elsewhere without interference.
     * Listing symbols contained in the lambda will omit such placeholder.
     *
     * Legacy ([FreeVar], impl) constructor is supported but deprecated.
     * It will create a nested lambda expression.
     *
     * @param {FreeVar} arg
     * @param {Expr} impl
     */
    constructor(arg: FreeVar, impl: Expr);
    arg: FreeVar;
    impl: Expr;
    arity: number;
    invoke(arg: any): Expr;
    subst(search: any, replace: any): Lambda;
    expand(): Lambda;
    _rski(options: any): any;
    equals(other: any): boolean;
    _format(options: any, nargs: any): string;
    _braced(first: any): boolean;
}
export class Native extends Named {
    /**
     * @desc A named term with a known rewriting rule.
     *       'impl' is a function with signature Expr => Expr => ... => Expr
     *       (see typedef Partial).
     *       This is how S, K, I, and company are implemented.
     *
     *       Note that as of current something like a=>b=>b(a) is not possible,
     *       use full form instead: a=>b=>b.apply(a).
     *
     * @example new Native('K', x => y => x); // constant
     * @example new Native('Y', function(f) { return f.apply(this.apply(f)); }); // self-application
     *
     * @param {String} name
     * @param {Partial} impl
     * @param {{note?: string, arity?: number, canonize?: boolean, apply?: function(Expr):(Expr|null) }} [opt]
     */
    constructor(name: string, impl: Partial, opt?: {
        note?: string;
        arity?: number;
        canonize?: boolean;
        apply?: (arg0: Expr) => (Expr | null);
    });
    invoke: Partial;
    arity: any;
    note: any;
    _rski(options: any): any;
}
export class Alias extends Named {
    /**
     * @desc A named alias for an existing expression.
     *
     *     Upon evaluation, the alias expands into the original expression,
     *     unless it has a known arity > 0 and is marked terminal,
     *     in which case it waits for enough arguments before expanding.
     *
     *     A hidden mutable property 'outdated' is used to silently
     *     replace the alias with its definition in all contexts.
     *     This is used when declaring named terms in an interpreter,
     *     to avoid confusion between old and new terms with the same name.
     *
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
    invoke: (arg: any) => any;
    subst(search: any, replace: any): any;
    /**
     *
     * @return {{expr: Expr, steps: number}}
     */
    step(): {
        expr: Expr;
        steps: number;
    };
    equals(other: any): any;
    _rski(options: any): Expr;
    _braced(first: any): boolean;
    _format(options: any, nargs: any): string | void;
}
export class Church extends Native {
    /**
     * @desc Church numeral representing non-negative integer n:
     *      n f x = f(f(...(f x)...)) with f applied n times.
     * @param {number} n
     */
    constructor(n: number);
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
/**
 *
 * @param {Expr[]} inventory
 * @return {string[]}
 */
export function declare(inventory: Expr[]): string[];
declare class Named extends Expr {
    /**
       * @desc a constant named 'name'
       * @param {String} name
       */
    constructor(name: string);
    name: string;
    _format(options: any, nargs: any): string;
}
export {};
