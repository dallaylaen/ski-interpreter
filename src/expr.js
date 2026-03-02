'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.Alias = exports.Church = exports.Lambda = exports.Native = exports.FreeVar = exports.Named = exports.App = exports.Expr = void 0;
const internal_1 = require("./internal");
const DEFAULTS = {
    max: 1000,
    maxArgs: 32,
};
const ORDER = {
    'leftmost-outermost': 'LO',
    'leftmost-innermost': 'LI',
    LO: 'LO',
    LI: 'LI',
};
/**
 * @desc Control primitives for fold() and traverse() methods.
 */
const control = {
    descend: (0, internal_1.prepareWrapper)('descend'),
    prune: (0, internal_1.prepareWrapper)('prune'),
    redo: (0, internal_1.prepareWrapper)('redo'),
    stop: (0, internal_1.prepareWrapper)('stop'),
};
/**
 * @desc List of predefined native combinators.
 * This is required for toSKI() to work, otherwise could as well have been in parser.js.
 * @type {{[key: string]: Native}}
 */
const native = {};
class Expr {
    /**
     *
     * @desc Define properties of the term based on user supplied options and/or inference results.
     *       Typically useful for declaring Native and Alias terms.
     * @private
     * @param {Object} options
     * @param {string} [options.note] - a brief description what the term does
     * @param {number} [options.arity] - number of arguments the term is waiting for (if known)
     * @param {string} [options.fancy] - how to display in html mode, e.g. &phi; instead of 'f'
     * @param {boolean} [options.canonize] - whether to try to infer the properties
     * @param {number} [options.max] - maximum number of steps for inference, if canonize is true
     * @param {number} [options.maxArgs] - maximum number of arguments for inference, if canonize is true
     * @return {this}
     */
    _setup(options = {}) {
        // TODO better name
        var _a, _b;
        if (options.fancy !== undefined && this instanceof Named)
            this.fancyName = options.fancy;
        if (options.note !== undefined)
            this.note = options.note;
        if (options.arity !== undefined)
            this.arity = options.arity;
        if (options.canonize) {
            const guess = this.infer(options);
            if (guess.normal) {
                this.arity = (_a = this.arity) !== null && _a !== void 0 ? _a : guess.arity;
                this.note = (_b = this.note) !== null && _b !== void 0 ? _b : guess.expr.format({ html: true, lambda: ['', ' &mapsto; ', ''] });
                delete guess.steps;
                this.props = guess;
            }
        }
        return this;
    }
    /**
     * @desc apply self to zero or more terms and return the resulting term,
     * without performing any calculations whatsoever
     * @param {Expr} args
     * @return {Expr}
     */
    apply(...args) {
        let expr = this;
        for (const arg of args)
            expr = new App(expr, arg);
        return expr;
    }
    /**
     * @desc Replace all aliases in the expression with their definitions, recursively.
     * @return {Expr}
     */
    expand() {
        var _a;
        return (_a = this.traverse(e => {
            if (e instanceof Alias)
                return e.impl.expand();
        })) !== null && _a !== void 0 ? _a : this;
    }
    /**
     * @desc Returns true if the expression contains only free variables and applications, false otherwise.
     * @returns {boolean}
     */
    freeOnly() {
        // TODO remove in a breaking release
        return !this.any(e => !(e instanceof FreeVar || e instanceof App));
    }
    /**
     * @desc Traverse the expression tree, applying change() to each node.
     *       If change() returns an Expr, the node is replaced with that value.
     *       A null/undefined value is interpreted as
     *       "descend further if applicable, or leave the node unchanged".
     *
     *       Returned values may be decorated:
     *
     *       SKI.control.prune will suppress further descending even if nothing was returned
     *       SKI.control.stop will terminate further changes.
     *       SKI.control.redo will apply the callback to the returned subtree, recursively.
     *
     *       Note that if redo was applied at least once to a subtree, a null return from the same subtree
     *       will be replaced by the last non-null value returned.
     *
     *       The traversal order is leftmost-outermost, unless options.order = 'leftmost-innermost' is specified.
     *       Short aliases 'LO' and 'LI' (case-sensitive) are also accepted.
     *
     *       Returns null if no changes were made, or the new expression otherwise.
     *
     * @param {{
     *   order?: 'LO' | 'LI' | 'leftmost-outermost' | 'leftmost-innermost',
     * }} [options]
     * @param {(e:Expr) => TraverseValue<Expr>} change
     * @returns {Expr|null}
     */
    traverse(options, change) {
        var _a;
        if (typeof options === 'function') {
            change = options;
            options = {};
        }
        const order = ORDER[(_a = options.order) !== null && _a !== void 0 ? _a : 'LO'];
        if (order === undefined)
            throw new Error('Unknown traversal order: ' + options.order);
        const [expr, _] = (0, internal_1.unwrap)(this._traverse_redo({ order }, change));
        return expr;
    }
    /**
     * @private
     * @param {Object} options
     * @param {(e:Expr) => TraverseValue<Expr>} change
     * @returns {TraverseValue<Expr>}
     */
    _traverse_redo(options, change) {
        var _a, _b;
        let action;
        let expr = this;
        let prev;
        do {
            prev = expr;
            const next = options.order === 'LI'
                ? (_a = expr._traverse_descend(options, change)) !== null && _a !== void 0 ? _a : change(expr)
                : (_b = change(expr)) !== null && _b !== void 0 ? _b : expr._traverse_descend(options, change);
            [expr, action] = (0, internal_1.unwrap)(next);
        } while (expr && action === control.redo);
        if (!expr && prev !== this)
            expr = prev; // we were in redo at least once
        return action ? action(expr) : expr;
    }
    /**
     * @private
     * @param {Object} options
     * @param {(e:Expr) => TraverseValue<Expr>} change
     * @returns {TraverseValue<Expr>}
     */
    _traverse_descend(options, change) {
        return null;
    }
    /**
     * @desc Returns true if predicate() is true for any subterm of the expression, false otherwise.
     *
     * @param {(e: Expr) => boolean} predicate
     * @returns {boolean}
     */
    any(predicate) {
        return predicate(this);
    }
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
     * @param {(acc: T, expr: Expr) => TraverseValue<T>} combine
     * @returns {T}
     */
    fold(initial, combine) {
        const [value, _] = (0, internal_1.unwrap)(this._fold(initial, combine));
        return value !== null && value !== void 0 ? value : initial;
    }
    _fold(initial, combine) {
        return combine(initial, this);
    }
    /**
     * @experimental
     * @desc  Fold an application tree bottom to top.
     *        For each subtree, the function is given the term in the root position and
     *        a list of the results of folding its arguments.
     *
     *        E.g. fold('x y (z t)', f) results in f(x, [f(y, []), f(z, [f(t, [])])])
     *
     * @example expr.foldBottomUp((head, tail) => {
     *    if (head.arity && head.arity <= tail.length) {
     *      return '(<span class="redex">'
     *          + head + ' '
     *          + tail.slice(0, head.arity).join(' ')
     *          + '</span>'
     *          + tail.slice(head.arity).join(' ')
     *          + ')';
     *    } else {
     *       return '(' + head + ' ' + tail.join(' ') + ')';
     *    }
     * });
     * @template T
     * @param {(head: Expr, tail: T[]) => T} fun
     * @return {T}
     */
    foldBottomUp(fun) {
        const [head, ...tail] = this.unroll();
        return fun(head, tail.map(e => e.foldBottomUp(fun)));
    }
    /**
     * @deprecated
     * @desc rough estimate of the term's complexity
     * Use fold(0, ...) with an appropriate combine function instead
     */
    weight() {
        // TODO remove in next breaking release
        return 1;
    }
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
     * @return {TermInfo}
     */
    infer(options = {}) {
        var _a, _b;
        return this._infer({
            max: (_a = options.max) !== null && _a !== void 0 ? _a : DEFAULTS.max,
            maxArgs: (_b = options.maxArgs) !== null && _b !== void 0 ? _b : DEFAULTS.maxArgs,
        }, 0);
    }
    /**
     * @desc Internal method for infer(), which performs the actual inference.
     * @param {{max: number, maxArgs: number}} options
     * @param {number} nargs - var index to avoid name clashes
     * @returns {TermInfo}
     * @private
     */
    _infer(options, nargs) {
        const probe = [];
        let steps = 0;
        let expr = this;
        // eslint-disable-next-line no-labels
        main: for (let i = 0; i < options.maxArgs; i++) {
            const next = expr.run({ max: options.max - steps });
            // console.log(`infer step ${i}, expr = ${expr}, probe = [${probe}]: `, next);
            steps += next.steps;
            if (!next.final)
                break;
            if (firstVar(next.expr)) {
                // can't append more variables, return or recurse
                expr = next.expr;
                if (!expr.any(e => !(e instanceof FreeVar || e instanceof App)))
                    return maybeLambda(probe, expr, { steps });
                const list = expr.unroll();
                let discard = false;
                let duplicate = false;
                const acc = [];
                for (let j = 1; j < list.length; j++) {
                    const sub = list[j]._infer({ maxArgs: options.maxArgs - nargs, max: options.max - steps }, // limit recursion
                    nargs + i // avoid variable name clashes
                    );
                    steps += sub.steps;
                    if (!sub.expr)
                        // eslint-disable-next-line no-labels
                        break main; // press f to pay respects
                    if (sub.discard)
                        discard = true;
                    if (sub.duplicate)
                        duplicate = true;
                    acc.push(sub.expr);
                }
                return maybeLambda(probe, list[0].apply(...acc), { discard, duplicate, steps });
            }
            const push = nthvar(nargs + i);
            probe.push(push);
            expr = next.expr.apply(push);
        }
        return { normal: false, proper: false, steps };
    }
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
    unroll() {
        // currently only used by infer() but may be useful
        // to convert binary App trees to n-ary or smth
        return [this];
    }
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
     * @return {IterableIterator<{expr: Expr, steps?: number, comment?: string}>}
     */
    *toLambda(options = {}) {
        var _a;
        let expr = (_a = this.traverse(e => {
            if (e instanceof FreeVar || e instanceof App || e instanceof Lambda || e instanceof Alias)
                return null; // no change
            const guess = e.infer({ max: options.max, maxArgs: options.maxArgs });
            if (!guess.normal)
                throw new Error('Failed to infer an equivalent lambda term for ' + e);
            return guess.expr;
        })) !== null && _a !== void 0 ? _a : this;
        const seen = new Set(); // prune irreducible
        let steps = 0;
        while (expr) {
            const next = expr.traverse({ order: 'LI' }, e => {
                if (seen.has(e))
                    return null;
                if (e instanceof App && e.fun instanceof Lambda) {
                    const guess = e.infer({ max: options.max, maxArgs: options.maxArgs });
                    steps += guess.steps;
                    if (!guess.normal) {
                        seen.add(e);
                        return null;
                    }
                    return control.stop(guess.expr);
                }
            });
            yield { expr, steps };
            expr = next;
        }
    }
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
    *toSKI(options = {}) {
        var _a;
        // options are ignored completely, TODO remove
        // get rid of non-lambdas
        let expr = (_a = this.traverse(e => {
            if (e instanceof FreeVar || e instanceof App || e instanceof Lambda || e instanceof Alias)
                return null;
            // TODO infer failed for atomic term? die...
            return e.infer().expr;
        })) !== null && _a !== void 0 ? _a : this;
        let steps = 0;
        while (expr) {
            const next = expr.traverse({ order: 'LI' }, e => {
                if (!(e instanceof Lambda) || (e.impl instanceof Lambda))
                    return null; // continue
                if (e.impl === e.arg)
                    return control.stop(native.I);
                if (!e.impl.any(t => t === e.arg))
                    return control.stop(native.K.apply(e.impl));
                // TODO use real assert here. e.impl contains e.arg and also isn't e.arg, in MUST be App.
                if (!(e.impl instanceof App))
                    throw new Error('toSKI: assert failed: lambda body is of unexpected type ' + e.impl.constructor.name);
                // eta-reduction: body === (not e.arg) (e.arg)
                if (e.impl.arg === e.arg && !e.impl.fun.any(t => t === e.arg))
                    return control.stop(e.impl.fun);
                // last resort, go S
                return control.stop(native.S.apply(new Lambda(e.arg, e.impl.fun), new Lambda(e.arg, e.impl.arg)));
            });
            yield { expr, steps, final: !next };
            steps++;
            expr = next;
        }
    }
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
    subst(search, replace) {
        return this === search ? replace : null;
    }
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
    invoke(arg) {
        return null;
    }
    /**
     * @desc iterate one step of a calculation.
     * @return {{expr: Expr, steps: number, changed: boolean}}
     */
    step() { return { expr: this, steps: 0, changed: false }; }
    /**
     * @desc Run uninterrupted sequence of step() applications
     *       until the expression is irreducible, or max number of steps is reached.
     *       Default number of steps = 1000.
     * @param {{max?: number, steps?: number, throw?: boolean}|Expr} [opt]
     * @param {Expr} args
     * @return {{expr: Expr, steps: number, final: boolean}}
     */
    run(opt, ...args) {
        var _a, _b;
        if (opt instanceof Expr) {
            args.unshift(opt);
            opt = {};
        }
        let expr = args ? this.apply(...args) : this;
        let steps = (_a = opt.steps) !== null && _a !== void 0 ? _a : 0;
        // make sure we make at least 1 step, to tell whether we've reached the normal form
        const max = Math.max((_b = opt.max) !== null && _b !== void 0 ? _b : DEFAULTS.max, 1) + steps;
        let final = false;
        for (; steps < max;) {
            const next = expr.step();
            if (!next.changed) {
                final = true;
                break;
            }
            steps += next.steps;
            expr = next.expr;
        }
        if (opt.throw && !final)
            throw new Error('Failed to compute expression in ' + max + ' steps');
        return { final, steps, expr };
    }
    /**
     * Execute step() while possible, yielding a brief description of events after each step.
     * Mnemonics: like run() but slower.
     * @param {{max?: number}} options
     * @return {IterableIterator<{final: boolean, expr: Expr, steps: number}>}
     */
    *walk(options = {}) {
        var _a;
        const max = (_a = options.max) !== null && _a !== void 0 ? _a : Infinity;
        let steps = 0;
        let expr = this;
        let final = false;
        while (steps < max) {
            // 1. calculate
            // 2. yield _unchanged_ expression
            // 3. either advance or stop
            const next = expr.step();
            if (!next.changed)
                final = true;
            yield { expr, steps, final };
            if (final)
                break;
            steps += next.steps;
            expr = next.expr;
        }
    }
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
    equals(other) {
        return !this.diff(other);
    }
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
    diff(other, swap = false) {
        if (this === other)
            return null;
        if (other instanceof Alias)
            return other.impl.diff(this, !swap);
        return swap
            ? '[' + other + ' != ' + this + ']'
            : '[' + this + ' != ' + other + ']';
    }
    /**
     * @desc Assert expression equality. Can be used in tests.
     *
     * `this` is the expected value and the argument is the actual one.
     * Mnemonic: the expected value is always a combinator, the actual one may be anything.
     *
     * @param {Expr} actual
     * @param {string} comment
     */
    expect(actual, comment = '') {
        var _a, _b;
        comment = comment ? comment + ': ' : '';
        if (!(actual instanceof Expr)) {
            throw new Error(comment + 'Expected a combinator but found '
                + ((_b = (_a = actual === null || actual === void 0 ? void 0 : actual.constructor) === null || _a === void 0 ? void 0 : _a.name) !== null && _b !== void 0 ? _b : typeof actual));
        }
        const diff = this.diff(actual);
        if (!diff)
            return; // all good
        // TODO wanna use AssertionError but browser doesn't recognize it
        // still the below hack works for mocha-based tests.
        const poorMans = new Error(comment + diff);
        poorMans.expected = this.diag();
        poorMans.actual = actual.diag();
        throw poorMans;
    }
    /**
     * @desc Returns string representation of the expression.
     *       Same as format() without options.
     * @return {string}
     */
    toString() {
        return this.format();
    }
    /**
     * @desc Whether the expression needs parentheses when printed.
     * @param {boolean} [first] - whether this is the first term in a sequence
     * @return {boolean}
     */
    _braced(first) {
        return false;
    }
    /**
     * @desc Whether the expression can be printed without a space when followed by arg.
     * @param {Expr} arg
     * @returns {boolean}
     * @private
     */
    _unspaced(arg) {
        return this._braced(true);
    }
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
    format(options = {}) {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        const fallback = options.html
            ? {
                brackets: ['(', ')'],
                space: ' ',
                var: ['<var>', '</var>'],
                lambda: ['', '-&gt;', ''],
                around: ['', ''],
                redex: ['', ''],
            }
            : {
                brackets: ['(', ')'],
                space: ' ',
                var: ['', ''],
                lambda: ['', '->', ''],
                around: ['', ''],
                redex: ['', ''],
            };
        return this._format({
            terse: (_a = options.terse) !== null && _a !== void 0 ? _a : true,
            brackets: (_b = options.brackets) !== null && _b !== void 0 ? _b : fallback.brackets,
            space: (_c = options.space) !== null && _c !== void 0 ? _c : fallback.space,
            var: (_d = options.var) !== null && _d !== void 0 ? _d : fallback.var,
            lambda: (_e = options.lambda) !== null && _e !== void 0 ? _e : fallback.lambda,
            around: (_f = options.around) !== null && _f !== void 0 ? _f : fallback.around,
            redex: (_g = options.redex) !== null && _g !== void 0 ? _g : fallback.redex,
            inventory: options.inventory, // TODO better name
            html: (_h = options.html) !== null && _h !== void 0 ? _h : false,
        }, 0);
    }
    /**
     * @desc Internal method for format(), which performs the actual formatting.
     * @param {Object} options
     * @param {number} nargs
     * @returns {string}
     * @private
     */
    _format(options, nargs) {
        throw new Error('No _format() method defined in class ' + this.constructor.name);
    }
    /**
     * @desc Returns a string representation of the expression tree, with indentation to show structure.
     *
     *       Applications are flattened to avoid excessive nesting.
     *       Variables include ids to distinguish different instances of the same variable name.
     *
     *       May be useful for debugging.
     *
     * @returns {string}
     *
     * @example
     * > console.log(ski.parse('C 5 x (x->x x)').diag())
     * App:
     *   Native: C
     *   Church: 5
     *   FreeVar: x[53]
     *   Lambda (x[54]):
     *     App:
     *       FreeVar: x[54]
     *       FreeVar: x[54]
     */
    diag() {
        const rec = (e, indent) => {
            if (e instanceof App)
                return [indent + 'App:', ...e.unroll().flatMap(s => rec(s, indent + '  '))];
            if (e instanceof Lambda)
                return [`${indent}Lambda (${e.arg}[${e.arg.id}]):`, ...rec(e.impl, indent + '  ')];
            // no indent increase so that a diff between diags is consistent with how `equals` works.
            if (e instanceof Alias)
                return [`${indent}Alias (${e.name}): \\`, ...rec(e.impl, indent)];
            if (e instanceof FreeVar)
                return [`${indent}FreeVar: ${e.name}[${e.id}]`];
            return [`${indent}${e.constructor.name}: ${e}`];
        };
        const out = rec(this, '');
        return out.join('\n');
    }
    /**
     * @desc Convert the expression to a JSON-serializable format.
     * @returns {string}
     */
    toJSON() {
        return this.format();
    }
}
exports.Expr = Expr;
Expr.control = control;
Expr.native = native;
class App extends Expr {
    constructor(fun, arg) {
        super();
        this.arg = arg;
        this.fun = fun;
    }
    /** @property {boolean} [final] */
    weight() {
        return this.fun.weight() + this.arg.weight();
    }
    _traverse_descend(options, change) {
        const [fun, fAction] = (0, internal_1.unwrap)(this.fun._traverse_redo(options, change));
        if (fAction === control.stop)
            return control.stop(fun ? fun.apply(this.arg) : null);
        const [arg, aAction] = (0, internal_1.unwrap)(this.arg._traverse_redo(options, change));
        const final = (fun || arg) ? (fun !== null && fun !== void 0 ? fun : this.fun).apply(arg !== null && arg !== void 0 ? arg : this.arg) : null;
        if (aAction === control.stop)
            return control.stop(final);
        return final;
    }
    any(predicate) {
        return predicate(this) || this.fun.any(predicate) || this.arg.any(predicate);
    }
    _fold(initial, combine) {
        const [value = initial, action = 'descend'] = (0, internal_1.unwrap)(combine(initial, this));
        if (action === control.prune)
            return value;
        if (action === control.stop)
            return control.stop(value);
        const [fValue = value, fAction = 'descend'] = (0, internal_1.unwrap)(this.fun._fold(value, combine));
        if (fAction === control.stop)
            return control.stop(fValue);
        const [aValue = fValue, aAction = 'descend'] = (0, internal_1.unwrap)(this.arg._fold(fValue, combine));
        if (aAction === control.stop)
            return control.stop(aValue);
        return aValue;
    }
    subst(search, replace) {
        const fun = this.fun.subst(search, replace);
        const arg = this.arg.subst(search, replace);
        return (fun || arg) ? (fun !== null && fun !== void 0 ? fun : this.fun).apply(arg !== null && arg !== void 0 ? arg : this.arg) : null;
    }
    /**
     * @return {{expr: Expr, steps: number}}
     */
    step() {
        // normal reduction order: first try root, then at most 1 step
        if (!this.final) {
            // try to apply rewriting rules, if applicable, at first
            const partial = this.fun.invoke(this.arg);
            if (partial instanceof Expr)
                return { expr: partial, steps: 1, changed: true };
            else if (typeof partial === 'function')
                this.invoke = partial; // cache for next time
            // descend into the leftmost term
            const fun = this.fun.step();
            if (fun.changed)
                return { expr: fun.expr.apply(this.arg), steps: fun.steps, changed: true };
            // descend into arg
            const arg = this.arg.step();
            if (arg.changed)
                return { expr: this.fun.apply(arg.expr), steps: arg.steps, changed: true };
            // mark as irreducible
            this.final = true; // mark as irreducible at root
        }
        return { expr: this, steps: 0, changed: false };
    }
    invoke(arg) {
        // propagate invocation towards the root term,
        // caching partial applications as we go
        const partial = this.fun.invoke(this.arg);
        if (partial instanceof Expr)
            return partial.apply(arg);
        else if (typeof partial === 'function') {
            this.invoke = partial;
            return partial(arg);
        }
        else {
            // invoke = null => we're uncomputable, cache for next time
            this.invoke = _ => null;
            return null;
        }
    }
    unroll() {
        return [...this.fun.unroll(), this.arg];
    }
    diff(other, swap = false) {
        if (!(other instanceof App))
            return super.diff(other, swap);
        const fun = this.fun.diff(other.fun, swap);
        if (fun)
            return fun + '(...)';
        const arg = this.arg.diff(other.arg, swap);
        if (arg)
            return this.fun + '(' + arg + ')';
        return null;
    }
    _braced(first) {
        return !first;
    }
    _format(options, nargs) {
        const fun = this.fun._format(options, nargs + 1);
        const arg = this.arg._format(options, 0);
        const wrap = nargs ? ['', ''] : options.around;
        // TODO ignore terse for now
        if (options.terse && !this.arg._braced(false))
            return wrap[0] + fun + (this.fun._unspaced(this.arg) ? '' : options.space) + arg + wrap[1];
        else
            return wrap[0] + fun + options.brackets[0] + arg + options.brackets[1] + wrap[1];
    }
    _unspaced(arg) {
        return this.arg._braced(false) ? true : this.arg._unspaced(arg);
    }
}
exports.App = App;
class Named extends Expr {
    constructor(name) {
        super();
        if (typeof name !== 'string' || name.length === 0)
            throw new Error('Attempt to create a named term with improper name');
        this.name = name;
    }
    _unspaced(arg) {
        return !!((arg instanceof Named) && ((this.name.match(/^[A-Z+]$/) && arg.name.match(/^[a-z+]/i))
            || (this.name.match(/^[a-z+]/i) && arg.name.match(/^[A-Z+]$/))));
    }
    _format(options, nargs) {
        var _a;
        // NOTE fancyName is not yet official and may change name or meaning
        const name = options.html ? (_a = this.fancyName) !== null && _a !== void 0 ? _a : this.name : this.name;
        return this.arity !== undefined && this.arity > 0 && this.arity <= nargs
            ? options.redex[0] + name + options.redex[1]
            : name;
    }
}
exports.Named = Named;
let freeId = 0;
class FreeVar extends Named {
    constructor(name, scope) {
        super(name);
        this.id = ++freeId;
        // TODO replace with null and scope??[notmatching] everywhere, but later
        this.scope = scope === undefined ? this : scope;
    }
    weight() {
        return 0;
    }
    diff(other, swap = false) {
        if (!(other instanceof FreeVar))
            return super.diff(other, swap);
        if (this.name === other.name && this.scope === other.scope)
            return null;
        const lhs = this.name + '[' + this.id + ']';
        const rhs = other.name + '[' + other.id + ']';
        return swap
            ? '[' + rhs + ' != ' + lhs + ']'
            : '[' + lhs + ' != ' + rhs + ']';
    }
    subst(search, replace) {
        if (search instanceof FreeVar && search.name === this.name && search.scope === this.scope)
            return replace;
        return null;
    }
    _format(options, nargs) {
        var _a;
        const name = options.html ? (_a = this.fancyName) !== null && _a !== void 0 ? _a : this.name : this.name;
        return options.var[0] + name + options.var[1];
    }
}
exports.FreeVar = FreeVar;
FreeVar.global = ['global'];
class Native extends Named {
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
     * @param {{note?: string, arity?: number, canonize?: boolean }} [opt]
     */
    constructor(name, impl, opt = {}) {
        super(name);
        // setup essentials
        this.invoke = impl;
        this._setup({ canonize: true, ...opt });
    }
}
exports.Native = Native;
class Lambda extends Expr {
    constructor(arg, impl) {
        var _a;
        super();
        // localize argument variable and bind it to oneself
        const local = new FreeVar(arg.name, this);
        this.arg = local;
        this.impl = (_a = impl.subst(arg, local)) !== null && _a !== void 0 ? _a : impl;
        this.arity = 1;
    }
    weight() {
        return this.impl.weight() + 1;
    }
    invoke(arg) {
        var _a;
        return (_a = this.impl.subst(this.arg, arg)) !== null && _a !== void 0 ? _a : this.impl;
    }
    _traverse_descend(options, change) {
        // alas no proper shielding of self.arg is possible
        const [impl, iAction] = (0, internal_1.unwrap)(this.impl._traverse_redo(options, change));
        const final = impl ? new Lambda(this.arg, impl) : null;
        return iAction === control.stop ? control.stop(final) : final;
    }
    any(predicate) {
        return predicate(this) || this.impl.any(predicate);
    }
    _fold(initial, combine) {
        const [value = initial, action = 'descend'] = (0, internal_1.unwrap)(combine(initial, this));
        if (action === control.prune)
            return value;
        if (action === control.stop)
            return control.stop(value);
        const [iValue, iAction] = (0, internal_1.unwrap)(this.impl._fold(value, combine));
        if (iAction === control.stop)
            return control.stop(iValue);
        return iValue !== null && iValue !== void 0 ? iValue : value;
    }
    subst(search, replace) {
        if (search === this.arg)
            return null;
        const change = this.impl.subst(search, replace);
        return change ? new Lambda(this.arg, change) : null;
    }
    diff(other, swap = false) {
        if (!(other instanceof Lambda))
            return super.diff(other, swap);
        const t = new FreeVar('t'); // TODO better placeholder name
        const diff = this.invoke(t).diff(other.invoke(t), swap);
        if (diff)
            return '(t->' + diff + ')'; // parentheses required to avoid ambiguity
        return null;
    }
    _format(options, nargs) {
        return (nargs > 0 ? options.brackets[0] : '')
            + options.lambda[0]
            + this.arg._format(options, 0) // TODO highlight redex if nargs > 0
            + options.lambda[1]
            + this.impl._format(options, 0) + options.lambda[2]
            + (nargs > 0 ? options.brackets[1] : '');
    }
    _braced(first) {
        return true;
    }
}
exports.Lambda = Lambda;
class Church extends Expr {
    constructor(n) {
        n = Number.parseInt(n);
        if (!(n >= 0))
            throw new Error('Church number must be a non-negative integer');
        super();
        this.invoke = x => y => {
            let expr = y;
            for (let i = n; i-- > 0;)
                expr = x.apply(expr);
            return expr;
        };
        /** @type {number} */
        this.n = n;
        this.arity = 2;
    }
    diff(other, swap = false) {
        if (!(other instanceof Church))
            return super.diff(other, swap);
        if (this.n === other.n)
            return null;
        return swap
            ? '[' + other.n + ' != ' + this.n + ']'
            : '[' + this.n + ' != ' + other.n + ']';
    }
    _unspaced(arg) {
        return false;
    }
    _format(options, nargs) {
        return nargs >= 2
            ? options.redex[0] + this.n + options.redex[1]
            : this.n + '';
    }
}
exports.Church = Church;
function waitn(expr, n) {
    return arg => n <= 1 ? expr.apply(arg) : waitn(expr.apply(arg), n - 1);
}
class Alias extends Named {
    constructor(name, impl, options = {}) {
        var _a, _b, _c;
        super(name);
        if (!(impl instanceof Expr))
            throw new Error('Attempt to create an alias for a non-expression: ' + impl);
        this.impl = impl;
        this._setup(options);
        this.terminal = (_a = options.terminal) !== null && _a !== void 0 ? _a : (_b = this.props) === null || _b === void 0 ? void 0 : _b.proper;
        this.invoke = waitn(impl, (_c = this.arity) !== null && _c !== void 0 ? _c : 0);
    }
    /**
     * @property {boolean} [outdated] - whether the alias is outdated
     *     and should be replaced with its definition when encountered.
     * @property {boolean} [terminal] - whether the alias should behave like a standalone term
     *     // TODO better name?
     * @property {boolean} [proper] - whether the alias is a proper combinator (i.e. contains no free variables or constants)
     * @property {number} [arity] - the number of arguments the alias waits for before expanding
     * @property {Expr} [canonical] - equivalent lambda term.
     */
    weight() {
        return this.terminal ? 1 : this.impl.weight();
    }
    _traverse_descend(options, change) {
        return this.impl._traverse_redo(options, change);
    }
    any(predicate) {
        return predicate(this) || this.impl.any(predicate);
    }
    _fold(initial, combine) {
        const [value = initial, action] = (0, internal_1.unwrap)(combine(initial, this));
        if (action === control.prune)
            return value;
        if (action === control.stop)
            return control.stop(value);
        const [iValue, iAction] = (0, internal_1.unwrap)(this.impl._fold(value, combine));
        if (iAction === control.stop)
            return control.stop(iValue);
        return iValue !== null && iValue !== void 0 ? iValue : value;
    }
    subst(search, replace) {
        if (this === search)
            return replace;
        return this.impl.subst(search, replace);
    }
    // DO NOT REMOVE TYPE or tsc chokes with
    //       TS2527: The inferred type of 'Alias' references an inaccessible 'this' type.
    /**
     * @return {{expr: Expr, steps: number, changed: boolean}}
     */
    step() {
        var _a;
        // arity known = waiting for args to expand
        if (((_a = this.arity) !== null && _a !== void 0 ? _a : 0) > 0)
            return { expr: this, steps: 0, changed: false };
        // expanding is a change but it takes 0 steps
        return { expr: this.impl, steps: 0, changed: true };
    }
    diff(other, swap = false) {
        if (this === other)
            return null;
        return other.diff(this.impl, !swap);
    }
    _braced(first) {
        return this.outdated ? this.impl._braced(first) : false;
    }
    _format(options, nargs) {
        const outdated = options.inventory
            ? options.inventory[this.name] !== this
            : this.outdated;
        return outdated ? this.impl._format(options, nargs) : super._format(options, nargs);
    }
}
exports.Alias = Alias;
// ----- Expr* classes end here -----
// declare native combinators
// redeclare `native` type with `Native` class
function addNative(name, impl, opt = {}) {
    native[name] = new Native(name, impl, opt);
}
addNative('I', x => x);
addNative('K', x => _ => x);
addNative('S', x => y => z => x.apply(z, y.apply(z)));
addNative('B', x => y => z => x.apply(y.apply(z)));
addNative('C', x => y => z => x.apply(z).apply(y));
addNative('W', x => y => x.apply(y).apply(y));
addNative('+', n => n instanceof Church
    ? new Church(n.n + 1)
    : f => x => f.apply(n.apply(f, x)), {
    note: 'Increase a Church numeral argument by 1, otherwise n => f => x => f(n f x)',
});
// utility functions dependent on Expr* classes, in alphabetical order
function firstVar(expr) {
    // yay premature optimization
    while (expr instanceof App)
        expr = expr.fun;
    return expr instanceof FreeVar;
}
/**
 * @private
 * @given a list of free variables, an expression, and some capabilities of the context,
 *        return either a lambda term, or the original expression if no lambda abstraction is needed,
 *        plus some metadata about the term and the context.
 *
 *        Used by infer() internally.
 * @param {FreeVar[]} args
 * @param {Expr} expr
 * @param {object} caps
 * @returns {TermInfo}
 */
function maybeLambda(args, expr, caps) {
    const count = new Array(args.length).fill(0);
    let proper = true;
    expr.traverse(e => {
        if (e instanceof FreeVar) {
            const index = args.findIndex(a => a.name === e.name);
            if (index >= 0) {
                count[index]++;
                return;
            }
        }
        if (!(e instanceof App))
            proper = false;
        return undefined;
    });
    const skip = new Set();
    const dup = new Set();
    for (let i = 0; i < args.length; i++) {
        if (count[i] === 0)
            skip.add(i);
        else if (count[i] > 1)
            dup.add(i);
    }
    for (const arg of args)
        expr = new Lambda(arg, expr);
    return {
        normal: true,
        steps: caps.steps,
        expr,
        arity: args.length,
        ...(skip.size ? { skip } : {}),
        ...(dup.size ? { dup } : {}),
        duplicate: !!dup.size || caps.duplicate || false,
        discard: !!skip.size || caps.discard || false,
        proper,
    };
}
function nthvar(n) {
    var _a;
    return new FreeVar((_a = 'abcdefgh'[n]) !== null && _a !== void 0 ? _a : 'x' + n);
}
