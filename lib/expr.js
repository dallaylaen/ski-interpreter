'use strict';

const { skipDup, isSubset } = require('./util');

const globalOptions = {
  terse:   true,
  max:     1000,
  maxArgs: 32,
};

/**
 * @typedef {Expr | function(Expr): Partial} Partial
 */

class Expr {
  /**
   *  @descr A generic combinatory logic expression.
   */
  constructor () {
    if (new.target === Expr)
      throw new Error('Attempt to instantiate abstract class Expr');
  }

  /**
     * postprocess term after parsing. typically return self but may return other term or die
     * @return {Expr}
     */
  postParse () {
    return this;
  }

  /**
     * @desc apply self to zero or more terms and return the resulting term,
     * without performing any calculations whatsoever
     * @param {Expr} args
     * @return {Expr}
     */
  apply (...args) {
    return args.length > 0 ? new App(this, ...args) : this;
  }

  /**
     * expand all terms but don't perform any calculations
     * @return {Expr}
     */
  expand () {
    return this;
  }

  /**
   * @desc return all free variables within the term
   * @return {Set<FreeVar>}
   */
  freeVars () {
    const symbols = this.getSymbols();
    const out = new Set();
    for (const [key, _] of symbols) {
      if (key instanceof FreeVar)
        out.add(key);
    }
    return out;
  }

  hasLambda () {
    const sym = this.getSymbols();
    return sym.has(Expr.lambdaPlaceholder);
  }

  freeOnly () {
    for (const [key, _] of this.getSymbols()) {
      if (!(key instanceof FreeVar))
        return false;
    }
    return true;
  }

  /**
   * @desc return all terminal values within the term, that is, values not
   * composed of other terms. For example, in S(KI)K, the terminals are S, K, I.
   * @return {Map<Expr, number>}
   */
  getSymbols () {
    // TODO better name!
    return new Map([[this, 1]]);
  }

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
  replace (terms, opt = {}) {
    const pairs = [];
    if (terms.length === 0)
      return this; // nothing to replace, return self
    for (const entry of terms) {
      const pair = (Array.isArray(entry) ? entry : [entry, entry]);
      pair[0] = pair[0].guess(opt).expr;
      if (!pair[0])
        throw new Error('Failed to canonize term ' + entry);
      if (pair.length !== 2)
        throw new Error('Expected a pair of terms to replace, got ' + entry);
      pairs.push(pair);
    }
    return this._replace(pairs, opt) ?? this;
  }

  _replace (pairs, opt) {
    const check = this.guess(opt).expr;
    for (const [canon, term] of pairs) {
      if (check.equals(canon))
        return term;
    }
    return null;
  }

  /**
   * @desc rought estimate of the complexity of the term
   * @return {number}
   */
  weight () {
    return 1;
  }

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
  guess (options = {}) {
    const max = options.max ?? globalOptions.max;
    const maxArgs = options.maxArgs ?? globalOptions.maxArgs;
    const out = this._guess({ max, maxArgs, index: 0 });
    return out;
  }

  _guess (options, preArgs = [], steps = 0) {
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
      return next.expr._guess(options, preArgs, steps);

    if (this._firstVar())
      return { normal: false, steps };

    const push = nthvar(preArgs.length + options.index);
    return this.apply(push)._guess(options, [...preArgs, push], steps);
  }

  _aslist () {
    return [this];
  }

  _firstVar () {
    // boolean, whether the expression starts with a free variable
    // used by guess()
    return false;
  }

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
  * lambdify (options = {}) {
    const expr = naiveCanonize(this, options);
    yield * simplifyLambda(expr, options);
  }

  /**
   * @desc same semantics as walk() but rewrite step by step instead of computing
   * @param {{max: number?}} options
   * @return {IterableIterator<{final: boolean, expr: Expr, steps: number}>}
   */
  * rewriteSKI (options = {}) {
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

  _rski (options) {
    return this;
  }

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
  subst (search, replace) {
    return this === search ? replace : null;
  }

  /**
   * @desc TODO
   *
   * @param {Expr} arg
   * @returns {Partial | null}
   */

  invoke (arg) {
    return null;
  }

  /**
     * @desc iterate one step of calculation in accordance with known rules.
     * @return {{expr: Expr, steps: number, changed: boolean}}
     */
  step () { return { expr: this, steps: 0, changed: false } }

  /**
     * @desc Run uninterrupted sequence of step() applications
     *       until the expression is irreducible, or max number of steps is reached.
     *       Default number of steps = 1000.
     * @param {{max: number?, steps: number?, throw: boolean?}|Expr} [opt]
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
    const max = Math.max(opt.max ?? globalOptions.max, 1) + steps;
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
     * @param {{max: number?}} options
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
   *
   * @param {Expr} other
   * @return {boolean}
   */
  equals (other) {
    if (this === other)
      return true;
    if (other instanceof Alias)
      return other.equals(this);
    return false;
  }

  contains (other) {
    return this === other || this.equals(other);
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
    if (this.equals(expected))
      return;

    // TODO wanna use AssertionError but webpack doesn't recognize it
    // still the below hack works for mocha-based tests.
    const poorMans = new Error(comment + 'found term ' + this + ' but expected ' + expected);
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

  format (options = {}) {
    const defaults = options.html
      ? {
        brackets: ['(', ')'],
        space:    ' ',
        var:      ['<var>', '</var>'],
        lambda:   ['', '-&gt;', ''],
        around:   ['', ''],
        redex:    ['<b>', '</b>'],
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
      terse:     options.terse    ?? globalOptions.terse,
      brackets:  options.brackets ?? defaults.brackets,
      space:     options.space    ?? defaults.space,
      var:       options.var      ?? defaults.var,
      lambda:    options.lambda   ?? defaults.lambda,
      around:    options.around   ?? defaults.around,
      redex:     options.redex    ?? defaults.redex,
      inventory: options.inventory, // TODO better name
    }, 0);
  }

  _format (options, nargs) {
    throw new Error( 'No _format() method defined in class ' + this.constructor.name );
  }

  // output: string[] /* appended */, inventory: { [key: string]: Expr }, seen: Set<Expr>
  _declare (output, inventory, seen) {}
}

class App extends Expr {
  /**
   * @desc Application of fun() to args.
   * Never ever use new App(fun, ...args) directly, use fun.apply(...args) instead.
   * @param {Expr} fun
   * @param {Expr} args
   */
  constructor (fun, ...args) {
    if (args.length === 0)
      throw new Error('Attempt to create an application with no arguments (likely interpreter bug)');
    super();

    this.arg = args.pop();
    this.fun = args.length ? new App(fun, ...args) : fun;
    this.final = false;
    this.arity = this.fun.arity > 0 ? this.fun.arity - 1 : 0;
  }

  weight () {
    return this.fun.weight() + this.arg.weight();
  }

  getSymbols () {
    const out = this.fun.getSymbols();
    for (const [key, value] of this.arg.getSymbols())
      out.set(key, (out.get(key) ?? 0) + value);
    return out;
  }

  _guess (options, preArgs = [], steps = 0) {
    if (preArgs.length > options.maxArgs || steps > options.max)
      return { normal: false, steps };

    /*
     * inside and App there are 3 main possibilities:
     * 1) The parent guess() actually is able to do the job. Then we just proxy the result.
     * 2) Both `fun` and `arg` form good enough lambda terms. Then lump them together & return.
     * 3) We literally have no idea, so we just pick the shortest defined term from the above.
     */

    const proxy = super._guess(options, preArgs, steps);
    if (proxy.normal)
      return proxy;
    steps = proxy.steps; // reimport extra iterations

    const [first, ...list] = this._aslist();
    if (!(first instanceof FreeVar))
      return { normal: false, steps }
    // TODO maybe do it later

    let discard = false;
    let duplicate = false;
    const out = [];
    for (const term of list) {
      const guess = term._guess({
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
      ...maybeLambda(preArgs, new App(first, ...out), {
        discard,
        duplicate,
      }),
    };
  }

  _firstVar () {
    return this.fun._firstVar();
  }

  apply (...args) {
    if (args.length === 0)
      return this;
    return new App(this, ...args);
  }

  expand () {
    return this.fun.expand().apply(this.arg.expand());
  }

  _replace (pairs, opt) {
    const maybe = super._replace(pairs, opt);
    if (maybe)
      return maybe;
    const [fun, arg] = this.split();
    return (fun._replace(pairs, opt) ?? fun).apply(arg._replace(pairs, opt) ?? arg);
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
      const partial = this.fun.invoke(this.arg);
      if (partial instanceof Expr)
        return { expr: partial, steps: 1, changed: true };
      else if (typeof partial === 'function')
        this.invoke = partial; // cache for next time

      const fun = this.fun.step();
      if (fun.changed)
        return { expr: fun.expr.apply(this.arg), steps: fun.steps, changed: true };

      const arg = this.arg.step();
      if (arg.changed)
        return { expr: this.fun.apply(arg.expr), steps: arg.steps, changed: true };

      this.final = true; // mark as irreducible at root
    }

    return { expr: this, steps: 0, changed: false };
  }

  invoke (arg) {
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

  split () {
    // pretend we are an elegant (cons fun arg) and not a sleazy imperative array
    return [this.fun, this.arg];
  }

  _aslist () {
    return [...this.fun._aslist(), this.arg];
  }

  /**
   * @desc Convert the expression to SKI combinatory logic
   * @return {Expr}
   */

  _rski (options) {
    if (options.steps >= options.max)
      return this;
    return this.fun._rski(options).apply(this.arg._rski(options));
  }

  equals (other) {
    if (!(other instanceof App))
      return super.equals(other);

    return this.fun.equals(other.fun) && this.arg.equals(other.arg);
  }

  contains (other) {
    return this.fun.contains(other) || this.arg.contains(other) || super.contains(other);
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

  _declare (output, inventory, seen) {
    this.fun._declare(output, inventory, seen);
    this.arg._declare(output, inventory, seen);
  }

  _unspaced (arg) {
    return this.arg._braced(false) ? true : this.arg._unspaced(arg);
  }
}

class Named extends Expr {
  /**
     * @desc a constant named 'name'
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
    return this.arity > 0 && this.arity <= nargs
      ? options.redex[0] + this.name + options.redex[1]
      : this.name;
  }
}

let freeId = 0;

class FreeVar extends Named {
  constructor (name) {
    super(name);
    this.id = ++freeId;
  }

  weight () {
    return 0;
  }

  _firstVar () {
    return true;
  }

  _format (options, nargs) {
    return options.var[0] + this.name + options.var[1];
  }
}

class Native extends Named {
  /**
   * @desc A term named 'name' that converts next 'arity' arguments into
   *       an expression returned by 'impl' function
   *       If an apply: Expr=>Expr|null function is given, it will be attempted upon application
   *       before building an App object. This allows to plug in argument coercions,
   *       e.g. instantly perform a numeric operation natively if the next term is a number.
   * @param {String} name
   * @param {Partial} impl
   * @param {{note: string?, arity: number?, canonize: boolean?, apply: function(Expr):(Expr|null) }} [opt]
   */
  constructor (name, impl, opt = {}) {
    super(name);
    // setup essentials
    this.invoke  = impl;
    if (opt.apply)
      this.onApply = opt.apply;

    // TODO guess lazily (on demand, only once); app capabilities such as discard and duplicate
    // try to bootstrap and guess some of our properties
    const guess = (opt.canonize ?? true) ? this.guess() : { normal: false };

    this.arity = opt.arity || guess.arity || 1;
    this.note = opt.note ?? guess.expr?.format({ terse: true, html: true, lambda: ['', ' &mapsto; ', ''] });
  }

  apply (...args) {
    if (this.onApply && args.length >= 1) {
      if (typeof this.onApply !== 'function') {
        throw new Error('Native combinator ' + this + ' has an invalid onApply property  of type'
          + typeof this.onApply + ': ' + this.onApply);
      }
      const subst = this.onApply(args[0]);
      if (subst instanceof Expr)
        return subst.apply(...args.slice(1));
    }
    return super.apply(...args);
  }

  _rski (options) {
    if (this === native.I || this === native.K || this === native.S || (options.steps >= options.max))
      return this;
    const canon = this.guess().expr;
    if (!canon)
      return this;
    options.steps++;
    return canon._rski(options);
  }
}

const native = {};
function addNative (name, impl, opt) {
  native[name] = new Native(name, impl, opt);
}

class Lambda extends Expr {
  /**
     * @param {FreeVar|FreeVar[]} arg
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

    // localize argument variable as it may appear elsewhere
    const local = new FreeVar(arg.name);
    this.arg = local;
    this.impl = impl.subst(arg, local) ?? impl;
    this.arity = 1;
  }

  getSymbols () {
    const out = this.impl.getSymbols();
    out.delete(this.arg);
    out.set(Expr.lambdaPlaceholder, (out.get(Expr.lambdaPlaceholder) ?? 0) + 1);
    return out;
  }

  weight () {
    return this.impl.weight() + 1;
  }

  _guess (options, preArgs = [], steps = 0) {
    if (preArgs.length > options.maxArgs)
      return { normal: false, steps };

    const push = nthvar(preArgs.length + options.index);
    return this.invoke(push)._guess(options, [...preArgs, push], steps + 1);
  }

  invoke (arg) {
    return this.impl.subst(this.arg, arg) ?? this.impl;
  }

  subst (search, replace) {
    if (search === this.arg)
      return null;
    const change = this.impl.subst(search, replace);
    return change ? new Lambda(this.arg, change) : null;
  }

  expand () {
    return new Lambda(this.arg, this.impl.expand());
  }

  _rski (options) {
    const impl = this.impl._rski(options);
    if (options.steps >= options.max)
      return new Lambda(this.arg, impl);
    options.steps++;
    if (impl === this.arg)
      return native.I;
    if (!impl.getSymbols().has(this.arg))
      return native.K.apply(impl);
    if (impl instanceof App) {
      const [fst, snd] = impl.split();
      // try eta reduction
      if (snd === this.arg && !fst.getSymbols().has(this.arg))
        return fst._rski(options);
      // fall back to S
      return native.S.apply(
        (new Lambda(this.arg, fst))._rski(options),
        (new Lambda(this.arg, snd))._rski(options)
      );
    }
    throw new Error('Don\'t know how to convert to SKI' + this);
  }

  _replace (pairs, opt) {
    const maybe = super._replace(pairs, opt);
    if (maybe)
      return maybe;
    // TODO filter out terms containing this.arg
    return new Lambda(this.arg, this.impl._replace(pairs, opt) ?? this.impl);
  }

  equals (other) {
    if (!(other instanceof Lambda))
      return super.equals(other);

    const t = new FreeVar('t');

    return other.invoke(t).equals(this.invoke(t));
  }

  contains (other) {
    return this.equals(other) || this.impl.contains(other);
  }

  _format (options, nargs) {
    return (nargs > 0 ? options.brackets[0] : '')
      + options.lambda[0]
      + this.arg._format(options, 0) // TODO highlight redex if nargs > 0
      + options.lambda[1]
      + this.impl._format(options, 0) + options.lambda[2]
      + (nargs > 0 ? options.brackets[1] : '');
  }

  _declare (output, inventory, seen) {
    this.impl._declare(output, inventory, seen);
  }

  _braced (first) {
    return true;
  }
}

class Church extends Native {
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

    this.n = p;
    this.arity = 2;
  }

  equals (other) {
    if (other instanceof Church)
      return this.n === other.n;
    return super.equals(other);
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
   * @desc An existing expression under a different name.
   * @param {String} name
   * @param {Expr} impl
   * @param {{canonize: boolean?, max: number?, maxArgs: number?, note: string?, terminal: boolean?}} [options]
   */
  constructor (name, impl, options = {}) {
    super(name);
    this.impl = impl;

    if (options.note)
      this.note = options.note;

    const guess = options.canonize
      ? impl.guess({ max: options.max, maxArgs: options.maxArgs })
      : { normal: false };
    this.arity = (guess.proper && guess.arity) || 0;
    this.proper = guess.proper ?? false;
    this.terminal = options.terminal ?? this.proper;
    this.canonical = guess.expr;
    this.invoke = waitn(impl, this.arity);
  }

  getSymbols () {
    return this.terminal ? new Map([[this, 1]]) : this.impl.getSymbols();
  }

  weight () {
    return this.terminal ? 1 : this.impl.weight();
  }

  expand () {
    return this.impl.expand();
  }

  subst (search, replace) {
    if (this === search)
      return replace;
    return this.impl.subst(search, replace);
  }

  _guess (options, preArgs = [], steps = 0) {
    return this.impl._guess(options, preArgs, steps);
  }

  /**
   *
   * @return {{expr: Expr, steps: number}}
   */
  step () {
    // arity known = waiting for args to expand
    if (this.arity > 0)
      return { expr: this, steps: 0, changed: false };
    // expanding is a change but it takes 0 steps
    return { expr: this.impl, steps: 0, changed: true };
  }

  _firstVar () {
    return this.impl._firstVar();
  }

  equals (other) {
    return other.equals(this.impl);
  }

  contains (other) {
    return this.impl.contains(other);
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

  _declare (output, inventory, seen) {
    // only once
    if (seen.has(this))
      return;
    seen.add(this);

    // topological order
    this.impl._declare(output, inventory, seen);

    // only declare if in inventory and matches
    if (inventory[this.name] === this)
      output.push(this.name + '=' + this.impl.format({ terse: true, inventory }));
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

addNative('+', x => y => z => y.apply(x.apply(y, z)), {
  note:  'SB<span class="note">, specifically </span><var>n</var> &mapsto; 1 + <var>n</var><span class="note"> for numerals</span>',
  apply: arg => arg instanceof Church ? new Church(arg.n + 1) : null
});

// A global value meaning "lambda is used somewhere in this expression"
// Can't be used (at least for now) to construct lambda expressions, or anything at all.
// See also getSymbols().
Expr.lambdaPlaceholder = new Native('->', x => x, {
  arity:    1,
  canonize: false,
  note:     'Lambda placeholder',
  apply:    x => { throw new Error('Attempt to use a placeholder in expression') }
});

// utility functions dependent on Expr* classes, in alphabetical order

/**
 *
 * @param {Expr[]} inventory
 * @return {string[]}
 */
function declare (inventory) {
  const misnamed = Object.keys(inventory)
    .filter(s => !(inventory[s] instanceof Named && inventory[s].name === s))
    .map(s => s + ' = ' + inventory[s]);
  if (misnamed.length > 0)
    throw new Error('Inventory must be a hash of named terms with matching names: ' + misnamed.join(', '));

  inventory = { ...inventory }; // shallow copy to avoid mutating input

  // If any aliases mask native terms, those cannot be easily restored.
  // Moreover, subsequent terms may refer to both native term and and the conflicting alias.
  // Therefore, we will instead rename such aliases to something else
  // and only restore them at the end.
  const detour = [];
  let tmpId = 1;
  for (const name in native) {
    if (!(inventory[name] instanceof Alias))
      continue;
    while ('temp' + tmpId in inventory)
      tmpId++;
    const temp = 'temp' + tmpId;
    const orig = inventory[name];
    delete inventory[name];
    const masked = new Alias(temp, orig);
    for (const key in inventory)
      inventory[key] = inventory[key].subst(orig, masked) ?? inventory[key];

    inventory[temp] = masked;
    detour.push([name, temp]);
  }

  // only want to declare aliases
  const terms = Object.values(inventory)
    .filter(s => s instanceof Alias)
    .sort((a, b) => a.name.localeCompare(b.name));

  const out = [];
  const seen = new Set();
  for (const term of terms)
    term._declare(out, inventory, seen);

  for (const [name, temp] of detour) {
    out.push(name + '=' + temp); // rename
    out.push(temp + '=');        // delete
  }

  return out;
}

function maybeLambda (args, expr, caps = {}) {
  const sym = expr.getSymbols();

  const [skip, dup] = skipDup(args, sym);

  return {
    expr:      args.length ? new Lambda(args, expr) : expr,
    ...(caps.synth ? {} : { arity: args.length }),
    ...(skip.size ? { skip } : {}),
    ...(dup.size ? { dup } : {}),
    duplicate: !!dup.size  || caps.duplicate || false,
    discard:   !!skip.size || caps.discard   || false,
    proper:    isSubset(sym.keys(), new Set(args)),
  };
}

function naiveCanonize (expr) {
  if (expr instanceof App)
    return naiveCanonize(expr.fun).apply(naiveCanonize(expr.arg));

  if (expr instanceof Lambda)
    return new Lambda(expr.arg, naiveCanonize(expr.impl));

  if (expr instanceof Alias)
    return naiveCanonize(expr.impl);

  const canon = expr.guess();
  if (canon.expr)
    return canon.expr;

  throw new Error('Failed to canonize expression: ' + expr);
}

function nthvar (n) {
  return new FreeVar('abcdefgh'[n] ?? 'x' + n);
}

/**
 *
 * @param {Expr} expr
 * @param {{max: number?, maxArgs: number?}} options
 * @param {number} maxWeight
 * @yields {{expr: Expr, steps: number?, comment: string?}}
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
    let [fun, arg] = expr.split();

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

  const canon = expr.guess({ max: options.max, maxArgs: options.maxArgs });
  state.steps += canon.steps;
  if (canon.expr && canon.expr.weight() < maxWeight)
    yield { expr: canon.expr, steps: state.steps, comment: '(canonical)' };
}

module.exports = { Expr, App, FreeVar, Lambda, Native, Alias, Church, globalOptions, native, declare };
