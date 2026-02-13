export type ActionWrapper<T> = T | {
    value: T | null;
    action: string;
} | null;
export type Partial = Expr | ((arg0: Expr) => Partial);
/**
 * @typedef {Expr | function(Expr): Partial} Partial
 */
export class Expr {
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
    freeOnly(): boolean;
    /**
     * @desc Traverse the expression tree, applying change() to each node.
     *       If change() returns an Expr, the node is replaced with that value.
     *       Otherwise, the node is left descended further (if applicable)
     *       or left unchanged.
     *
     *       Returns null if no changes were made, or the new expression otherwise.
     *
     * @param {(e:Expr) => (Expr|null)} change
     * @returns {Expr|null}
     */
    traverse(change: (e: Expr) => (Expr | null)): Expr | null;
    /**
     * @desc Returns true if predicate() is true for any subterm of the expression, false otherwise.
     *
     * @param {(e: Expr) => boolean} predicate
     * @returns {boolean}
     */
    any(predicate: (e: Expr) => boolean): boolean;
    /**
     * @desc Fold the expression into a single value by recursively applying combine() to its subterms.
     *       Nodes are traversed in leftmost-outermost order, i.e. the same order as reduction steps are taken.
     *
     * null or undefined return value from combine() means "keep current value and descend further".
     *
     * SKI.control provides primitives to control the folding flow:
     *  - SKI.control.prune(value) means "use value and don't descend further into this branch";
     *  - SKI.control.stop(value) means "stop folding immediately and return value".
     *  - SKI.control.descend(value) is the default behavior, meaning "use value and descend further".
     *
     * This method is experimental and may change in the future.
     *
     * @experimental
     * @template T
     * @param {T} initial
     * @param {(acc: T, expr: Expr) => ActionWrapper<T>} combine
     * @returns {T}
     */
    fold<T>(initial: T, combine: (acc: T, expr: Expr) => ActionWrapper<T>): T;
    _fold(initial: any, combine: any): any;
    /**
     * @desc rough estimate of the complexity of the term
     * @return {number}
     */
    weight(): number;
    /**
     * @desc Try to empirically find an equivalent lambda term for the expression,
     *       returning also the term's arity and some other properties.
     *
     *       This is used internally when declaring a Native / Alias term,
     *       unless {canonize: false} is used.
     *
     *       As of current it only recognizes terms that have a normal form,
     *       perhaps after adding some variables. This may change in the future.
     *
     *       Use toLambda() if you want to get a lambda term in any case.
     *
     * @param {{max?: number, maxArgs?: number}} options
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
    infer(options?: {
        max?: number;
        maxArgs?: number;
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
    /**
     *
     * @param {{max: number, maxArgs: number, index: number}} options
     * @param {FreeVar[]} preArgs
     * @param {number} steps
     * @returns {{normal: boolean, steps: number}|{normal: boolean, steps: number}|{normal: boolean, steps: number, expr: Lambda|*, arity?: *, skip?: Set<any>, dup?: Set<any>, duplicate, discard, proper: boolean}|*|{normal: boolean, steps: number}}
     * @private
     */
    private _infer;
    /**
     * @desc Expand an expression into a list of terms
     * that give the initial expression when applied from left to right:
     * ((a, b), (c, d)) => [a, b, (c, d)]
     *
     * This can be thought of as an opposite of apply:
     * fun.apply(...arg).unroll() is exactly [fun, ...args]
     * (even if ...arg is in fact empty).
     *
     * @returns {Expr[]}
     */
    unroll(): Expr[];
    /**
     * @desc Returns a series of lambda terms equivalent to the given expression,
     *       up to the provided computation steps limit,
     *       in decreasing weight order.
     *
     *       Unlike infer(), this method will always return something,
     *       even if the expression has no normal form.
     *
     *       See also Expr.walk() and Expr.toSKI().
     *
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
    toLambda(options?: {
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
     * @desc Rewrite the expression into S, K, and I combinators step by step.
     *     Returns an iterator yielding the intermediate expressions,
     *     along with the number of steps taken to reach them.
     *
     *     See also Expr.walk() and Expr.toLambda().
     *
     * @param {{max?: number}} [options]
     * @return {IterableIterator<{final: boolean, expr: Expr, steps: number}>}
     */
    toSKI(options?: {
        max?: number;
    }): IterableIterator<{
        final: boolean;
        expr: Expr;
        steps: number;
    }>;
    /**
     * @desc Internal method for toSKI, which performs one step of the conversion.
     * @param {{max: number, steps: number}} options
     * @returns {Expr}
     * @private
     */
    private _rski;
    /**
     * Replace all instances of plug in the expression with value and return the resulting expression,
     * or null if no changes could be made.
     * Lambda terms and applications will never match if used as plug
     * as they are impossible co compare without extensive computations.
     * Typically used on variables but can also be applied to other terms, e.g. aliases.
     * See also Expr.traverse().
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
     * @desc True is the expressions are identical, false otherwise.
     *       Aliases are expanded.
     *       Bound variables in lambda terms are renamed consistently.
     *       However, no reductions are attempted.
     *
     *       E.g. a->b->a == x->y->x is true, but a->b->a == K is false.
     *
     * @param {Expr} other
     * @return {boolean}
     */
    equals(other: Expr): boolean;
    /**
     * @desc Recursively compare two expressions and return a string
     *       describing the first point of difference.
     *       Returns null if expressions are identical.
     *
     *       Aliases are expanded.
     *       Bound variables in lambda terms are renamed consistently.
     *       However, no reductions are attempted.
     *
     *       Members of the FreeVar class are considered different
     *       even if they have the same name, unless they are the same object.
     *       To somewhat alleviate confusion, the output will include
     *       the internal id of the variable in square brackets.
     *
     * @example  "K(S != I)" is the result of comparing "KS" and "KI"
     * @example  "S(K([x[13] != x[14]]))K"
     *
     * @param {Expr} other
     * @param {boolean} [swap]  If true, the order of expressions is reversed in the output.
     * @returns {string|null}
     */
    diff(other: Expr, swap?: boolean): string | null;
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
    /**
     * @desc Whether the expression can be printed without a space when followed by arg.
     * @param {Expr} arg
     * @returns {boolean}
     * @private
     */
    private _unspaced;
    /**
     * @desc    Stringify the expression with fancy formatting options.
     *          Said options mostly include wrappers around various constructs in form of ['(', ')'],
     *          as well as terse and html flags that set up the defaults.
     *          Format without options is equivalent to toString() and can be parsed back.
     *
     * @param   {Object} [options]  - formatting options
     * @param   {boolean} [options.terse]   - whether to use terse formatting (omitting unnecessary spaces and parentheses)
     * @param   {boolean} [options.html]    - whether to default to HTML tags & entities.
     *                                If a named term has fancyName property set, it will be used instead of name in this mode.
     * @param   {[string, string]} [options.brackets]  - wrappers for application arguments, typically ['(', ')']
     * @param   {[string, string]} [options.var]       - wrappers for variable names
     *                                (will default to &lt;var&gt; and &lt;/var&gt; in html mode).
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
    /**
     * @desc Internal method for format(), which performs the actual formatting.
     * @param {Object} options
     * @param {number} nargs
     * @returns {string}
     * @private
     */
    private _format;
    /**
     * @desc Convert the expression to a JSON-serializable format.
     * @returns {string}
     */
    toJSON(): string;
}
export namespace Expr {
    export { native };
    export { control };
    export namespace extras {
        export { toposort };
    }
}
export class App extends Expr {
    /**
     * @desc Application of fun() to args.
     * Never ever use new App(fun, arg) directly, use fun.apply(...args) instead.
     * @param {Expr} fun
     * @param {Expr} arg
     */
    constructor(fun: Expr, arg: Expr);
    arg: Expr;
    fun: Expr;
    final: boolean;
    arity: number;
    _infer(options: any, preArgs?: any[], steps?: number): any;
    traverse(change: any): Expr;
    any(predicate: any): any;
    subst(search: any, replace: any): Expr;
    /**
     * @return {{expr: Expr, steps: number}}
     */
    step(): {
        expr: Expr;
        steps: number;
    };
    invoke(arg: any): Partial;
    /**
     * @desc Convert the expression to SKI combinatory logic
     * @return {Expr}
     */
    _rski(options: any): Expr;
    diff(other: any, swap?: boolean): string;
    _braced(first: any): boolean;
    _format(options: any, nargs: any): string;
    _unspaced(arg: any): boolean;
}
export class Named extends Expr {
    /**
     * @desc An abstract class representing a term named 'name'.
     *
     * @param {String} name
     */
    constructor(name: string);
    name: string;
    _unspaced(arg: any): boolean;
    _format(options: any, nargs: any): any;
}
export class FreeVar extends Named {
    /**
     * @desc A named variable.
     *
     * Given the functional nature of combinatory logic, variables are treated
     * as functions that we don't know how to evaluate just yet.
     *
     * By default, two different variables even with the same name are considered different.
     * They display it via a hidden id property.
     *
     * If a scope object is given, however, two variables with the same name and scope
     * are considered identical.
     *
     * @param {string} name - name of the variable
     * @param {any} scope - an object representing where the variable belongs to.
     */
    constructor(name: string, scope: any);
    id: number;
    scope: any;
    diff(other: any, swap?: boolean): string;
    subst(search: any, replace: any): any;
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
    _infer(options: any, preArgs?: any[], steps?: number): any;
    invoke(arg: any): Expr;
    traverse(change: any): Expr | Lambda;
    any(predicate: any): any;
    subst(search: any, replace: any): Lambda;
    expand(): Lambda;
    _rski(options: any): any;
    diff(other: any, swap?: boolean): string;
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
    _rski(options: any): Expr | this;
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
    traverse(change: any): any;
    any(predicate: any): any;
    subst(search: any, replace: any): any;
    _infer(options: any, preArgs?: any[], steps?: number): any;
    /**
     *
     * @return {{expr: Expr, steps: number}}
     */
    step(): {
        expr: Expr;
        steps: number;
    };
    diff(other: any, swap?: boolean): any;
    _rski(options: any): Expr;
    _braced(first: any): boolean;
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
    diff(other: any, swap?: boolean): string;
}
/**
 * @type {{[key: string]: Native}}
 */
declare const native: {
    [key: string]: Native;
};
declare namespace control {
    let descend: (arg0: any) => any;
    let prune: (arg0: any) => any;
    let stop: (arg0: any) => any;
}
declare function toposort(env: any, list: any): any[] | {
    list: any[];
    env: any;
};
export {};
