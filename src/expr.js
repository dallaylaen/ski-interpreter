'use strict';

const { unwrap, prepareWrapper } = require('./internal');

const DEFAULTS = {
  max:     1000,
  maxArgs: 32,
};

/**
 * @template T
 * @typedef {T | TraverseControl<T> | null} TraverseValue
 */
const control = {
  descend: prepareWrapper('descend'),
  prune:   prepareWrapper('prune'),
  redo:    prepareWrapper('redo'),
  stop:    prepareWrapper('stop'),
};

/**
 * @typedef {Expr | function(Expr): Partial} Partial
 */

class Expr {
  /**
   *  @descr A combinatory logic expression.
   *
   *  Applications, variables, and other terms like combinators per se
   *  are subclasses of this class.
   *
   *  @abstract
   *  @property {{
   *    scope?: any,
   *    env?: { [key: string]: Expr },
   *    src?: string,
   *    parser: object,
   *  }} [context]
   */
  constructor () {
    if (new.target === Expr)
      throw new Error('Attempt to instantiate abstract class Expr');
  }

  /**
   * @desc apply self to zero or more terms and return the resulting term,
   * without performing any calculations whatsoever
   * @param {Expr} args
   * @return {Expr}
   */
  apply (...args) {
    let expr = this;
    for (const arg of args)
      expr = new App(expr, arg);
    return expr;
  }

  /**
   * @desc Replace all aliases in the expression with their definitions, recursively.
   * @return {Expr}
   */
  expand () {
    return this.traverse(e => {
      if (e instanceof Alias)
        return e.impl.expand();
    }) ?? this;
  }

  /**
   * @desc Returns true if the expression contains only free variables and applications, false otherwise.
   * @returns {boolean}
   */
  freeOnly () {
    return !this.any(e => !(e instanceof FreeVar || e instanceof App));
  }

  /**
   * @desc Traverse the expression tree, applying change() to each node.
   *       If change() returns an Expr, the node is replaced with that value.
   *       Otherwise, the node is descended further (if applicable)
   *       or left unchanged.
   *
   *       The traversal order is leftmost-outermost (LO), i.e. the same order as reduction steps are taken.
   *
   *       Returns null if no changes were made, or the new expression otherwise.
   *
   * @param {(e:Expr) => (Expr|null)} change
   * @returns {Expr|null}
   */
  traverse (change) {
    return change(this);
  }

  /**
   * @desc Returns true if predicate() is true for any subterm of the expression, false otherwise.
   *
   * @param {(e: Expr) => boolean} predicate
   * @returns {boolean}
   */
  any (predicate) {
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
  fold (initial, combine) {
    const [value, _] = unwrap(this._fold(initial, combine));
    return value ?? initial;
  }

  /**
   * @template T
   * @param {T} initial
   * @param {(acc: T, expr: Expr) => TraverseValue<T>} combine
   * @returns {TraverseValue<T>}
   * @private
   */
  _fold (initial, combine) {
    return combine(initial, this);
  }

  /**
   * @desc rough estimate of the term's complexity
   * @return {number}
   */
  weight () {
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
  infer (options = {}) {
    const max = options.max ?? DEFAULTS.max;
    const maxArgs = options.maxArgs ?? DEFAULTS.maxArgs;
    const out = this._infer({ max, maxArgs, index: 0 });
    return out;
  }

  /**
   *
   * @param {{max: number, maxArgs: number, index: number}} options
   * @param {FreeVar[]} preArgs
   * @param {number} steps
   * @returns {{
   *    normal: boolean,
   *    steps: number,
   *    expr?: Expr,
   *    arity?: number,
   *    skip?: Set<number>,
   *    dup?: Set<number>,
   *    duplicate, discard, proper: boolean
   * }
   * @private
   */
  _infer (options, preArgs = [], steps = 0) {
    if (preArgs.length > options.maxArgs || steps > options.max)
      return { normal: false, steps };

    // happy case
    if (this.freeOnly()) {
      return {
        normal: true,
        steps,
        ...maybeLambda(preArgs, this),
      };
    }

    // try reaching the normal form
    const next = this.run({ max: (options.max - steps) / 3 });
    steps += next.steps;
    if (!next.final)
      return { normal: false, steps };

    // normal form != this, redo exercise
    if (next.steps !== 0)
      return next.expr._infer(options, preArgs, steps);

    // adding more args won't help, bail out
    // if we're an App, the App's _infer will take care of further args
    if (this.unroll()[0] instanceof FreeVar)
      return { normal: false, steps };

    // try adding more arguments, maybe we'll get a normal form then
    const push = nthvar(preArgs.length + options.index);
    return this.apply(push)._infer(options, [...preArgs, push], steps);
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
  unroll () {
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
  * toLambda (options = {}) {
    const expr = this.traverse(e => {
      if (e instanceof FreeVar || e instanceof App || e instanceof Lambda || e instanceof Alias)
        return null; // no change
      const guess = e.infer({ max: options.max, maxArgs: options.maxArgs });
      if (!guess.normal)
        throw new Error('Failed to infer an equivalent  lambda term for ' + e);
      return guess.expr;
    }) ?? this;
    yield * simplifyLambda(expr, options);
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
  * toSKI (options = {}) {
    // TODO options.max is not actually max, it's the number of steps in one iteration
    let steps = 0;
    let expr = this;
    while (true) {
      const opt = { max: options.max ?? 1, steps: 0 };
      const next = expr._rski(opt);
      const final = opt.steps === 0;
      yield { expr, steps, final };
      if (final)
        break;
      expr = next;
      steps += opt.steps;
    }
  }

  /**
   * @desc Internal method for toSKI, which performs one step of the conversion.
   * @param {{max: number, steps: number}} options
   * @returns {Expr}
   * @private
   */
  _rski (options) {
    return this;
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
  subst (search, replace) {
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
  invoke (arg) {
    return null;
  }

  /**
   * @desc iterate one step of a calculation.
   * @return {{expr: Expr, steps: number, changed: boolean}}
   */
  step () { return { expr: this, steps: 0, changed: false } }

  /**
   * @desc Run uninterrupted sequence of step() applications
   *       until the expression is irreducible, or max number of steps is reached.
   *       Default number of steps = 1000.
   * @param {{max?: number, steps?: number, throw?: boolean}|Expr} [opt]
   * @param {Expr} args
   * @return {{expr: Expr, steps: number, final: boolean}}
   */
  run (opt = {}, ...args) {
    if (opt instanceof Expr) {
      args.unshift(opt);
      opt = {};
    }
    let expr = args ? this.apply(...args) : this;
    let steps = opt.steps ?? 0;
    // make sure we make at least 1 step, to tell whether we've reached the normal form
    const max = Math.max(opt.max ?? DEFAULTS.max, 1) + steps;
    let final = false;
    for (; steps < max; ) {
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
  * walk (options = {}) {
    const max = options.max ?? Infinity;
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
  equals (other) {
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
  diff (other, swap = false) {
    if (this === other)
      return null;
    if (other instanceof Alias)
      return other.impl.diff(this, !swap);
    return swap
      ? '[' + other + ' != ' + this  + ']'
      : '[' + this  + ' != ' + other + ']';
  }

  /**
   * @desc Assert expression equality. Can be used in tests.
   * @param {Expr} expected
   * @param {string} comment
   */
  expect (expected, comment = '') {
    comment = comment ? comment + ': ' : '';
    if (!(expected instanceof Expr))
      throw new Error(comment + 'attempt to expect a combinator to equal something else: ' + expected);
    const diff = this.diff(expected);
    if (!diff)
      return; // all good

    // TODO wanna use AssertionError but webpack doesn't recognize it
    // still the below hack works for mocha-based tests.
    const poorMans = new Error(comment + diff);
    poorMans.expected = expected + '';
    poorMans.actual = this + '';
    throw poorMans;
  }

  /**
   * @desc Returns string representation of the expression.
   *       Same as format() without options.
   * @return {string}
   */
  toString () {
    return this.format();
  }

  /**
   * @desc Whether the expression needs parentheses when printed.
   * @param {boolean} [first] - whether this is the first term in a sequence
   * @return {boolean}
   */
  _braced (first) {
    return false;
  }

  /**
   * @desc Whether the expression can be printed without a space when followed by arg.
   * @param {Expr} arg
   * @returns {boolean}
   * @private
   */
  _unspaced (arg) {
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
  format (options = {}) {
    const fallback = options.html
      ? {
        brackets: ['(', ')'],
        space:    ' ',
        var:      ['<var>', '</var>'],
        lambda:   ['', '-&gt;', ''],
        around:   ['', ''],
        redex:    ['', ''],
      }
      : {
        brackets: ['(', ')'],
        space:    ' ',
        var:      ['', ''],
        lambda:   ['', '->', ''],
        around:   ['', ''],
        redex:    ['', ''],
      }
    return this._format({
      terse:     options.terse    ?? true,
      brackets:  options.brackets ?? fallback.brackets,
      space:     options.space    ?? fallback.space,
      var:       options.var      ?? fallback.var,
      lambda:    options.lambda   ?? fallback.lambda,
      around:    options.around   ?? fallback.around,
      redex:     options.redex    ?? fallback.redex,
      inventory: options.inventory, // TODO better name
      html:      options.html     ?? false,
    }, 0);
  }

  /**
   * @desc Internal method for format(), which performs the actual formatting.
   * @param {Object} options
   * @param {number} nargs
   * @returns {string}
   * @private
   */
  _format (options, nargs) {
    throw new Error( 'No _format() method defined in class ' + this.constructor.name );
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
  diag () {
    const rec = (e, indent) => {
      if (e instanceof App)
        return [indent + 'App:', ...e.unroll().flatMap(s => rec(s, indent + '  '))];
      if (e instanceof Lambda)
        return [`${indent}Lambda (${e.arg}[${e.arg.id}]):`, ...rec(e.impl, indent + '  ')];
      if (e instanceof Alias)
        return [`Alias (${e.name}):`, ...rec(e.impl, indent + '  ')];
      if (e instanceof FreeVar)
        return [`${indent}FreeVar: ${e.name}[${e.id}]`];
      return [`${indent}${e.constructor.name}: ${e}`];
    }

    const out = rec(this, '');
    return out.join('\n');
  }

  /**
   * @desc Convert the expression to a JSON-serializable format.
   * @returns {string}
   */
  toJSON () {
    return this.format();
  }
}

class App extends Expr {
  /**
   * @desc Application of fun() to args.
   * Never ever use new App(fun, arg) directly, use fun.apply(...args) instead.
   * @param {Expr} fun
   * @param {Expr} arg
   */
  constructor (fun, arg) {
    super();

    this.arg = arg;
    this.fun = fun;
    this.final = false;
    this.arity = this.fun.arity > 0 ? this.fun.arity - 1 : 0;
  }

  weight () {
    return this.fun.weight() + this.arg.weight();
  }

  _infer (options, preArgs = [], steps = 0) {
    if (preArgs.length > options.maxArgs || steps > options.max)
      return { normal: false, steps };

    /*
     * inside and App there are 3 main possibilities:
     * 1) The parent infer() actually is able to do the job. Then we just proxy the result.
     * 2) Both `fun` and `arg` form good enough lambda terms. Then lump them together & return.
     * 3) We literally have no idea, so we just pick the shortest defined term from the above.
     */

    const proxy = super._infer(options, preArgs, steps);
    if (proxy.normal)
      return proxy;
    steps = proxy.steps; // reimport extra iterations

    const [first, ...list] = this.unroll();
    if (!(first instanceof FreeVar))
      return { normal: false, steps }
    // TODO maybe do it later

    let discard = false;
    let duplicate = false;
    const out = [];
    for (const term of list) {
      const guess = term._infer({
        ...options,
        maxArgs: options.maxArgs - preArgs.length,
        max:     options.max - steps,
        index:   preArgs.length + options.index,
      });
      steps += guess.steps;
      if (!guess.normal)
        return { normal: false, steps };
      out.push(guess.expr);
      discard = discard || guess.discard;
      duplicate = duplicate || guess.duplicate;
    }

    return {
      normal: true,
      steps,
      ...maybeLambda(preArgs, first.apply(...out), {
        discard,
        duplicate,
      }),
    };
  }

  traverse (change) {
    const replaced = change(this);
    if (replaced instanceof Expr)
      return replaced;

    const fun = this.fun.traverse(change);
    const arg = this.arg.traverse(change);

    if (!fun && !arg)
      return null; // no changes

    return (fun ?? this.fun).apply(arg ?? this.arg);
  }

  any (predicate) {
    return predicate(this) || this.fun.any(predicate) || this.arg.any(predicate);
  }

  _fold (initial, combine) {
    const [value = initial, action = 'descend'] = unwrap(combine(initial, this));
    if (action === control.prune)
      return value;
    if (action === control.stop)
      return control.stop(value);
    const [fValue = value, fAction = 'descend'] = unwrap(this.fun._fold(value, combine));
    if (fAction === control.stop)
      return control.stop(fValue);
    const [aValue = fValue, aAction = 'descend'] = unwrap(this.arg._fold(fValue, combine));
    if (aAction === control.stop)
      return control.stop(aValue);
    return aValue;
  }

  subst (search, replace) {
    const fun = this.fun.subst(search, replace);
    const arg = this.arg.subst(search, replace);

    return (fun || arg) ? (fun ?? this.fun).apply(arg ?? this.arg) : null;
  }

  /**
   * @return {{expr: Expr, steps: number}}
   */

  step () {
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

  invoke (arg) {
    // propagate invocation towards the root term,
    // caching partial applications as we go
    const partial = this.fun.invoke(this.arg);
    if (partial instanceof Expr)
      return partial.apply(arg);
    else if (typeof partial === 'function') {
      this.invoke = partial;
      return partial(arg);
    } else {
      // invoke = null => we're uncomputable, cache for next time
      this.invoke = _ => null;
      return null;
    }
  }

  unroll () {
    return [...this.fun.unroll(), this.arg];
  }

  _rski (options) {
    if (options.steps >= options.max)
      return this;
    return this.fun._rski(options).apply(this.arg._rski(options));
  }

  diff (other, swap = false) {
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

  _braced (first) {
    return !first;
  }

  _format (options, nargs) {
    const fun = this.fun._format(options, nargs + 1);
    const arg = this.arg._format(options, 0);
    const wrap = nargs ? ['', ''] : options.around;
    // TODO ignore terse for now
    if (options.terse && !this.arg._braced(false))
      return wrap[0] + fun + (this.fun._unspaced(this.arg) ? '' : options.space) + arg + wrap[1];
    else
      return wrap[0] + fun + options.brackets[0] + arg + options.brackets[1] + wrap[1];
  }

  _unspaced (arg) {
    return this.arg._braced(false) ? true : this.arg._unspaced(arg);
  }
}

class Named extends Expr {
  /**
   * @desc An abstract class representing a term named 'name'.
   *
   * @param {String} name
   */
  constructor (name) {
    super();
    if (typeof name !== 'string' || name.length === 0)
      throw new Error('Attempt to create a named term with improper name');
    this.name = name;
  }

  _unspaced (arg) {
    return !!(
      (arg instanceof Named) && (
        (this.name.match(/^[A-Z+]$/) && arg.name.match(/^[a-z+]/i))
          || (this.name.match(/^[a-z+]/i) && arg.name.match(/^[A-Z+]$/))
      )
    );
  }

  _format (options, nargs) {
    // NOTE fancyName is not yet official and may change name or meaning
    const name = options.html ? this.fancyName ?? this.name : this.name;
    return this.arity > 0 && this.arity <= nargs
      ? options.redex[0] + name + options.redex[1]
      : name;
  }
}

let freeId = 0;

class FreeVar extends Named {
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
  constructor (name, scope) {
    super(name);
    this.id = ++freeId;
    // TODO temp compatibility mode
    this.scope = scope === undefined ? this : scope;
  }

  weight () {
    return 0;
  }

  diff (other, swap = false) {
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

  subst (search, replace) {
    if (search instanceof FreeVar && search.name === this.name && search.scope === this.scope)
      return replace;
    return null;
  }

  _format (options, nargs) {
    const name = options.html ? this.fancyName ?? this.name : this.name;
    return options.var[0] + name + options.var[1];
  }
}

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
   * @param {{note?: string, arity?: number, canonize?: boolean, apply?: function(Expr):(Expr|null) }} [opt]
   */
  constructor (name, impl, opt = {}) {
    super(name);
    // setup essentials
    this.invoke  = impl;

    // TODO infer lazily (on demand, only once); app capabilities such as discard and duplicate
    // try to bootstrap and infer some of our properties
    const guess = (opt.canonize ?? true) ? this.infer() : { normal: false };

    /** @type {number} */
    this.arity = opt.arity || guess.arity || 1;
    /** @type {string} */
    this.note = opt.note ?? guess.expr?.format({ terse: true, html: true, lambda: ['', ' &mapsto; ', ''] });
  }

  _rski (options) {
    if (this === native.I || this === native.K || this === native.S || (options.steps >= options.max))
      return this;
    const canon = this.infer().expr;
    if (!canon)
      return this;
    options.steps++;
    return canon._rski(options);
  }
}

// predefined global combinator list
// it is required by toSKI method, otherwise it could've as well be in parse.js
/**
 * @type {{[key: string]: Native}}
 */
const native = {};
function addNative (name, impl, opt) {
  native[name] = new Native(name, impl, opt);
}

class Lambda extends Expr {
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
  constructor (arg, impl) {
    if (Array.isArray(arg)) {
      // check args before everything
      if (arg.length === 0)
        throw new Error('empty argument list in lambda constructor');

      const [my, ...tail] = arg;
      const known = new Set([my.name]);

      while (tail.length > 0) {
        const last = tail.pop();
        if (known.has(last.name))
          throw new Error('Duplicate free var name ' + last + ' in lambda expression');
        known.add(last.name);

        // TODO keep track of arity to speed up execution
        impl = new Lambda(last, impl);
      }
      arg = my;
    }

    super();

    // localize argument variable and bind it to oneself
    const local = new FreeVar(arg.name, this);
    this.arg = local;
    this.impl = impl.subst(arg, local) ?? impl;
    this.arity = 1;
  }

  weight () {
    return this.impl.weight() + 1;
  }

  _infer (options, preArgs = [], steps = 0) {
    if (preArgs.length > options.maxArgs)
      return { normal: false, steps };

    const push = nthvar(preArgs.length + options.index);
    return this.invoke(push)._infer(options, [...preArgs, push], steps + 1);
  }

  invoke (arg) {
    return this.impl.subst(this.arg, arg) ?? this.impl;
  }

  traverse (change) {
    const replaced = change(this);
    if (replaced instanceof Expr)
      return replaced;

    // alas no proper shielding of self.arg is possible
    const impl = this.impl.traverse(change);

    if (!impl)
      return null; // no changes

    return new Lambda(this.arg, impl);
  }

  any (predicate) {
    return predicate(this) || this.impl.any(predicate);
  }

  _fold (initial, combine) {
    const [value = initial, action = 'descend'] = unwrap(combine(initial, this));
    if (action === control.prune)
      return value;
    if (action === control.stop)
      return control.stop(value);
    const [iValue, iAction] = unwrap(this.impl._fold(value, combine));
    if (iAction === control.stop)
      return control.stop(iValue);
    return iValue ?? value;
  }

  subst (search, replace) {
    if (search === this.arg)
      return null;
    const change = this.impl.subst(search, replace);
    return change ? new Lambda(this.arg, change) : null;
  }

  _rski (options) {
    const impl = this.impl._rski(options);
    if (options.steps >= options.max)
      return new Lambda(this.arg, impl);
    options.steps++;
    if (impl === this.arg)
      return native.I;
    if (!impl.any(e => e === this.arg))
      return native.K.apply(impl);
    if (impl instanceof App) {
      const { fun, arg } = impl;
      // try eta reduction
      if (arg === this.arg && !fun.any(e => e === this.arg))
        return fun._rski(options);
      // fall back to S
      return native.S.apply(
        (new Lambda(this.arg, fun))._rski(options),
        (new Lambda(this.arg, arg))._rski(options)
      );
    }
    throw new Error('Don\'t know how to convert to SKI' + this);
  }

  diff (other, swap = false) {
    if (!(other instanceof Lambda))
      return super.diff(other, swap);

    const t = new FreeVar('t'); // TODO better placeholder name

    const diff = this.invoke(t).diff(other.invoke(t), swap);
    if (diff)
      return '(t->' + diff + ')'; // parentheses required to avoid ambiguity
    return null;
  }

  _format (options, nargs) {
    return (nargs > 0 ? options.brackets[0] : '')
      + options.lambda[0]
      + this.arg._format(options, 0) // TODO highlight redex if nargs > 0
      + options.lambda[1]
      + this.impl._format(options, 0) + options.lambda[2]
      + (nargs > 0 ? options.brackets[1] : '');
  }

  _braced (first) {
    return true;
  }
}

class Church extends Native {
  /**
   * @desc Church numeral representing non-negative integer n:
   *      n f x = f(f(...(f x)...)) with f applied n times.
   * @param {number} n
   */
  constructor (n) {
    const p = Number.parseInt(n);
    if (!(p >= 0))
      throw new Error('Church number must be a non-negative integer');
    const name = '' + p;
    const impl = x => y => {
      let expr = y;
      for (let i = p; i-- > 0; )
        expr = x.apply(expr);
      return expr;
    };

    super(name, impl, { arity: 2, canonize: false, note: name });

    /** @type {number} */
    this.n = p;
    this.arity = 2;
  }

  diff (other, swap = false) {
    if (!(other instanceof Church))
      return super.diff(other, swap);
    if (this.n === other.n)
      return null;
    return swap
      ? '[' + other.n + ' != ' + this.n + ']'
      : '[' + this.n + ' != ' + other.n + ']';
  }

  _unspaced (arg) {
    return false;
  }
}

function waitn (expr, n) {
  return arg => n <= 1 ? expr.apply(arg) : waitn(expr.apply(arg), n - 1);
}

class Alias extends Named {
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
   * @param {{canonize?: boolean, max?: number, maxArgs?: number, note?: string, terminal?: boolean}} [options]
   */
  constructor (name, impl, options = {}) {
    super(name);
    if (!(impl instanceof Expr))
      throw new Error('Attempt to create an alias for a non-expression: ' + impl);
    this.impl = impl;

    if (options.note)
      this.note = options.note;

    const guess = options.canonize
      ? impl.infer({ max: options.max, maxArgs: options.maxArgs })
      : { normal: false };
    this.arity = (guess.proper && guess.arity) || 0;
    this.proper = guess.proper ?? false;
    this.terminal = options.terminal ?? this.proper;
    this.canonical = guess.expr;
    this.invoke = waitn(impl, this.arity);
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

  weight () {
    return this.terminal ? 1 : this.impl.weight();
  }

  traverse (change) {
    return change(this) ?? this.impl.traverse(change);
  }

  any (predicate) {
    return predicate(this) || this.impl.any(predicate);
  }

  _fold (initial, combine) {
    const [value = initial, action] = unwrap(combine(initial, this));
    if (action === control.prune)
      return value;
    if (action === control.stop)
      return control.stop(value);
    const [iValue, iAction] = unwrap(this.impl._fold(value, combine));
    if (iAction === control.stop)
      return control.stop(iValue);
    return iValue ?? value;
  }

  subst (search, replace) {
    if (this === search)
      return replace;
    return this.impl.subst(search, replace);
  }

  _infer (options, preArgs = [], steps = 0) {
    return this.impl._infer(options, preArgs, steps);
  }

  // DO NOT REMOVE TYPE or tsc chokes with
  //       TS2527: The inferred type of 'Alias' references an inaccessible 'this' type.
  /**
   * @return {{expr: Expr, steps: number, changed: boolean}}
   */
  step () {
    // arity known = waiting for args to expand
    if (this.arity > 0)
      return { expr: this, steps: 0, changed: false };
    // expanding is a change but it takes 0 steps
    return { expr: this.impl, steps: 0, changed: true };
  }

  diff (other, swap = false) {
    if (this === other)
      return null;
    return other.diff(this.impl, !swap);
  }

  _rski (options) {
    return this.impl._rski(options);
  }

  _braced (first) {
    return this.outdated ? this.impl._braced(first) : false;
  }

  _format (options, nargs) {
    const outdated = options.inventory
      ? options.inventory[this.name] !== this
      : this.outdated;
    return outdated ? this.impl._format(options, nargs) : super._format(options, nargs);
  }
}

// ----- Expr* classes end here -----

// declare native combinators
addNative('I', x => x);
addNative('K', x => _ => x);
addNative('S', x => y => z => x.apply(z, y.apply(z)));
addNative('B', x => y => z => x.apply(y.apply(z)));
addNative('C', x => y => z => x.apply(z).apply(y));
addNative('W', x => y => x.apply(y).apply(y));

addNative(
  '+',
  n => n instanceof Church
    ? new Church(n.n + 1)
    : f => x => f.apply(n.apply(f, x)),
  {
    note: 'Increase a Church numeral argument by 1, otherwise n => f => x => f(n f x)',
  }
);

// utility functions dependent on Expr* classes, in alphabetical order

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
 * @returns {{expr: Expr, arity?: number, skip?: Set<number>, dup?: Set<number>, duplicate?, discard?, proper: boolean}}
 */
function maybeLambda (args, expr, caps = {}) {
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
  });

  const skip = new Set();
  const dup = new Set();
  for (let i = 0; i < args.length; i++) {
    if (count[i] === 0)
      skip.add(i);
    else if (count[i] > 1)
      dup.add(i);
  }

  return {
    expr:      args.length ? new Lambda(args, expr) : expr,
    ...(caps.synth ? {} : { arity: args.length }),
    ...(skip.size ? { skip } : {}),
    ...(dup.size ? { dup } : {}),
    duplicate: !!dup.size  || caps.duplicate || false,
    discard:   !!skip.size || caps.discard   || false,
    proper,
  };
}

function nthvar (n) {
  return new FreeVar('abcdefgh'[n] ?? 'x' + n);
}

/**
 * @private
 * @param {Expr} expr
 * @param {{max?: number, maxArgs?: number}} options
 * @param {number} maxWeight
 * @yields {{expr: Expr, steps?: number, comment?: string}}
 */
function * simplifyLambda (expr, options = {}, state = { steps: 0 }) {
  // expr is a lambda, free variable, or an application thereof
  // we want to find an equivalent lambda term with less weight
  // which we do sequentially from leaves to the root of the AST

  yield { expr, steps: state.steps, comment: '(self)' };

  // short-circuit
  if (expr.freeOnly())
    return;

  let maxWeight = expr.weight();

  if (expr instanceof Lambda) {
    for (const term of simplifyLambda(expr.impl, options, state)) {
      const candidate = new Lambda(expr.arg, term.expr);
      if (candidate.weight() < maxWeight) {
        maxWeight = candidate.weight();
        yield { expr: candidate, steps: state.steps, comment: '(lambda)' + term.comment };
      }
    }
  }

  // fun * arg Descartes product
  if (expr instanceof App) {
    // try to split into fun+arg, then try canonization but exposing each step
    let { fun, arg } = expr;

    for (const term of simplifyLambda(fun, options, state)) {
      const candidate = term.expr.apply(arg);
      if (candidate.weight() < maxWeight) {
        maxWeight = candidate.weight();
        fun = term.expr;
        yield { expr: candidate, steps: state.steps, comment: '(fun)' + term.comment };
      }
    }

    for (const term of simplifyLambda(arg, options, state)) {
      const candidate = fun.apply(term.expr);
      if (candidate.weight() < maxWeight) {
        maxWeight = candidate.weight();
        yield { expr: candidate, steps: state.steps, comment: '(arg)' + term.comment };
      }
    }
  }

  const canon = expr.infer({ max: options.max, maxArgs: options.maxArgs });
  state.steps += canon.steps;
  if (canon.expr && canon.expr.weight() < maxWeight)
    yield { expr: canon.expr, steps: state.steps, comment: '(canonical)' };
}

/**
 * @desc  Sort a list in such a way that dependent terms come after the (named) terms they depend on.
 *        If env is given, only terms listed there are taken into account.
 *        If env is omitted, it will be implied from the list.
 *        If list is omitted, it will default to values of env.
 *        If just one term is given instead of a list, it will be coerced into a list.
 *
 *        No terms outside env + list may ever appear in the result.
 *
 *        The terms in env must be named and their names must match their keys.
 *
 * @param {Expr|Expr[]} list
 * @param {{[s:string]: Named}} env
 * @returns {{list: Expr[], env: {[s:string]: Named}}}
 *
 * @example
 *    const expr = ski.parse(src);
 *    toposort([expr], ski.getTerms()); // returns all terms appearing in Expr in correct order
 */
function toposort (list, env) {
  if (list instanceof Expr)
    list = [list];
  if (env) {
    // TODO check in[name].name === name
    if (!list)
      list = Object.keys(env).sort().map(k => env[k]); // ensure deterministic order
  } else {
    if (!list)
      return [];
    if (!env) {
      env = {};
      for (const item of list) {
        if (!(item instanceof Named))
          continue;
        if (env[item.name])
          throw new Error('duplicate name ' + item);
        env[item.name] = item;
      }
    }
  }

  const out = [];
  const seen = new Set();
  const rec = term => {
    if (seen.has(term))
      return;
    term.fold(null, (acc, e) => {
      if (e !== term && e instanceof Named && env[e.name] === e) {
        rec(e);
        return Expr.control.prune(null);
      }
    });
    out.push(term);
    seen.add(term);
  };

  for (const term of list)
    rec(term);

  return {
    list: out,
    env,
  };
}

Expr.native = native;
Expr.control = control;
Expr.extras = { toposort };

module.exports = { Expr, App, Named, FreeVar, Lambda, Native, Alias, Church };
