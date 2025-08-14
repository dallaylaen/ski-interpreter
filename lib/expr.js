'use strict';

const { skipDup, isSubset } = require('./util');

const globalOptions = {
  terse:   true,
  max:     1000,
  maxArgs: 32,
};

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
   *       Groundedness is a loosely defined concept similar to 'proper',
   *       it means that all applications within a term start with a variable
   *       (whether free or bound). There should be a term for this...
   *
   * @param {{max: number?, maxArgs: number?}} options
   * @return {{
   *    grounded: boolean,
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
  guess (options = {}) {
    const max = options.max ?? globalOptions.max;
    const maxArgs = options.maxArgs ?? globalOptions.maxArgs;
    return this._guess({ max, maxArgs, index: 0 });
  }

  _guess (options, preArgs = [], steps = 0) {
    if (preArgs.length > options.maxArgs || steps > options.max)
      return { grounded: false, steps };

    // happy case
    if (this.freeOnly()) {
      return {
        grounded: true,
        steps,
        ...maybeLambda(preArgs, this),
      };
    }

    // try reaching the normal form
    const next = this.run({ max: (options.max - steps) / 3 });
    steps += next.steps;
    if (!next.final)
      return { grounded: false, steps };

    // normal form != this, redo exercise
    if (next.steps !== 0)
      return next.expr._guess(options, preArgs, steps);

    if (this._firstVar())
      return { grounded: false, steps };

    const push = nthvar(preArgs.length + options.index);
    return this.apply(push)._guess(options, [...preArgs, push], steps);
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

  /**
   * @desc Rename free variables in the expression using the given sequence
   *       This is for eye-candy only, as the interpreter knows darn well hot to distinguish vars,
   *       regardless of names.
   * @param {IterableIterator<string>} seq
   * @return {Expr}
   */
  renameVars (seq) {
    return this;
  }

  _rski (options) {
    return this;
  }

  /**
     * Apply self to list of given args.
     * Normally, only native combinators know how to do it.
     * @param {Expr[]} args
     * @return {Expr|null}
     */
  reduce (args) {
    return null;
  }

  /**
     * Replace all instances of free vars with corresponding values and return the resulting expression.
     * return null if no changes could be made.
     * @param {FreeVar} plug
     * @param {Expr} value
     * @return {Expr|null}
     */
  subst (plug, value) {
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
    return this === other;
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
    poorMans.expected = expected.toString();
    poorMans.actual = this.toString();
    throw poorMans;
  }

  /**
   * @param {{terse: boolean?, html: boolean?}} [options]
   * @return {string} string representation of the expression
   */
  toString (options = {}) {
    // uncomment the following line if you want to debug the parser with prints
    // return this.constructor.name
    throw new Error( 'No toString() method defined in class ' + this.constructor.name );
  }

  /**
   * @desc Whether the expression needs parentheses when printed.
   * @param {boolean} [first] - whether this is the first term in a sequence
   * @return {boolean}
   */
  needsParens (first) {
    return false;
  }

  /**
   *
   * @return {string}
   */
  toJSON () {
    return this.expand().toString({ terse: false });
  }
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
      return { grounded: false, steps };

    /*
     * inside and App there are 3 main possibilities:
     * 1) The parent guess() actually is able to do the job. Then we just proxy the result.
     * 2) Both `fun` and `arg` form good enough lambda terms. Then lump them together & return.
     * 3) We literally have no idea, so we just pick the shortest defined term from the above.
     */

    const proxy = super._guess(options, preArgs, steps);
    if (proxy.grounded)
      return proxy;
    steps = proxy.steps; // reimport extra iterations

    // uh oh here goes heuristics...
    const [fun, arg] = this.split().map(e => e._guess({
      ...options,
      maxArgs: options.maxArgs * 0.8 - 2,
      max:     (options.max) * 0.8 - 10,
      index:   preArgs.length + options.index,
    }));
    steps += fun.steps + arg.steps;
    const split = fun.expr && arg.expr && fun.expr.apply(arg.expr);
    if (split && fun.grounded && arg.grounded && this._firstVar()) {
      return {
        grounded: true,
        steps,
        ...maybeLambda(preArgs, split, {
          discard:   fun.discard || arg.discard,
          duplicate: fun.duplicate || arg.duplicate,
        }),
      };
    }

    // ok we have no idea what's going on, fall back to heuristics
    const maxWeight = proxy.expr?.weight() ?? Infinity;
    if (split && split.weight() < maxWeight) {
      // we have a fancy term that is lighter than the mundane one
      return {
        grounded: false,
        steps,
        ...maybeLambda(preArgs, split, {
          synth:     true,
          discard:   fun.discard || arg.discard,
          duplicate: fun.duplicate || arg.duplicate,
        }),
      };
    }

    return proxy;
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

  renameVars (seq) {
    return this.fun.renameVars(seq).apply(this.arg.renameVars(seq));
  }

  subst (plug, value) {
    const fun = this.fun.subst(plug, value);
    const arg = this.arg.subst(plug, value);

    return (fun || arg) ? (fun ?? this.fun).apply(arg ?? this.arg) : null;
  }

  /**
   * @return {{expr: Expr, steps: number}}
   */

  step () {
    // normal reduction order: first try root, then at most 1 step
    if (!this.final) {
      if (this.arity === 0) {
        // aha! we have just fulfilled some previous function's argument demands
        const reduced = this.fun.reduce([this.arg]);
        // should always be true, but whatever
        if (reduced)
          return { expr: reduced, steps: 1, changed: true };
      }
      // now try recursing

      const fun = this.fun.step();
      if (fun.changed)
        return { expr: fun.expr.apply(this.arg), steps: fun.steps, changed: true };

      const arg = this.arg.step();
      if (arg.changed)
        return { expr: this.fun.apply(arg.expr), steps: arg.steps, changed: true };

      this.final = true;
    }
    return { expr: this, steps: 0, changed: false };
  }

  reduce (args) {
    return this.fun.reduce([this.arg, ...args]);
  }

  split () {
    // pretend we are an elegant (cons fun arg) and not a sleazy imperative array
    return [this.fun, this.arg];
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
      return false; // TODO comparison with Alias should swap args

    return this.fun.equals(other.fun) && this.arg.equals(other.arg);
  }

  contains (other) {
    return this.fun.contains(other) || this.arg.contains(other) || super.contains(other);
  }

  needsParens (first) {
    return !first;
  }

  toString (opt = {}) {
    const fun = this.fun.toString(opt);
    const root = this.fun.needsParens(true) ? '(' + fun + ')' : fun;
    if (opt.terse ?? globalOptions.terse) {
      // terse mode: omit whitespace and parens if possible
      let arg = this.arg.toString(opt);
      if (this.arg.needsParens(false))
        arg = '(' + arg + ')';
      const space = (root.match(/\)$/) || arg.match(/^\(/))
        || (root.match(/[A-Z]$/) && arg.match(/^[a-z]/i))
        ? ''
        : ' ';
      return root + space + arg;
    } else
      return root + '(' + this.arg.toString(opt) + ')';
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

  toString () {
    return this.name;
  }
}

let freeId = 0;

class FreeVar extends Named {
  constructor (name) {
    super(name);
    this.id = ++freeId;
  }

  subst (plug, value) {
    if (this === plug)
      return value;
    return null;
  }

  weight () {
    return 0;
  }

  _firstVar () {
    return true;
  }

  toString ( opt = {} ) {
    return (opt.html && /^[a-z]$/.test(this.name)) ? '<var>' + this.name + '</var>' : this.name;
  }
}

/**
 * @typedef {function(Expr): Expr | AnyArity} AnyArity
 */

class Native extends Named {
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
  constructor (name, impl, opt = {}) {
    super(name);
    // setup essentials
    this.impl  = impl;
    if (opt.apply)
      this.onApply = opt.apply;
    this.arity = opt.arity ?? 1;

    // try to bootstrap and guess some of our properties
    const guess = (opt.canonize ?? true) ? this.guess() : { grounded: false };

    if (!opt.arity)
      this.arity = guess.arity || 1;

    this.note = opt.note ?? guess.expr?.toString({ terse: true, html: true });
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

  reduce (args) {
    if (args.length < this.arity)
      return null;
    let egde = 0;
    let step = this.impl;
    while (typeof step === 'function') {
      if (egde >= args.length)
        return null;
      step = step(args[egde++]);
    }
    if (!(step instanceof Expr))
      throw new Error('Native combinator ' + this + ' reduced to a non-expression: ' + step);
    return step.apply(...args.slice(egde));
  }

  toJSON () {
    return 'Native:' + this.name;
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
      return { grounded: false, steps };

    const push = nthvar(preArgs.length + options.index);
    return this.reduce([push])._guess(options, [...preArgs, push], steps + 1);
  }

  reduce (input) {
    if (input.length === 0)
      return null;

    const [head, ...tail] = input;

    return (this.impl.subst(this.arg, head) ?? this.impl).apply(...tail);
  }

  subst (plug, value) {
    if (plug === this.arg)
      return null;
    const change = this.impl.subst(plug, value);
    if (change)
      return new Lambda(this.arg, change);
    return null;
  }

  expand () {
    return new Lambda(this.arg, this.impl.expand());
  }

  renameVars (seq) {
    const arg = new FreeVar(seq.next().value);
    const impl = this.impl.subst(this.arg, arg) ?? this.impl;
    return new Lambda(arg, impl.renameVars(seq));
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
      return false;

    const t = new FreeVar('t');

    return other.reduce([t]).equals(this.reduce([t]));
  }

  contains (other) {
    return this.equals(other) || this.impl.contains(other);
  }

  toString (opt = {}) {
    const mapsto = opt.html ? ' &mapsto; ' : '->';
    return this.arg.toString(opt) + mapsto + this.impl.toString(opt);
  }

  needsParens (first) {
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
    return false;
  }
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
      : { grounded: false };
    this.arity = (guess.proper && guess.arity) || 0;
    this.proper = guess.proper ?? false;
    this.terminal = options.terminal ?? this.proper;
    this.canonical = guess.expr;
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

  subst (plug, value) {
    return this.impl.subst(plug, value);
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

  reduce (args) {
    if (args.length < this.arity)
      return null;
    return this.impl.apply(...args);
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

  toString (opt) {
    return this.outdated ? this.impl.toString(opt) : super.toString(opt);
  }

  needsParens (first) {
    return this.outdated ? this.impl.needsParens() : false;
  }
}

// declare native combinators
addNative('I', x => x);
addNative('K', x => _ => x);
addNative('S', x => y => z => x.apply(z, y.apply(z)));
addNative('B', x => y => z => x.apply(y.apply(z)));
addNative('C', x => y => z => x.apply(z).apply(y));
addNative('W', x => y => x.apply(y).apply(y));

addNative('+', x => y => z => y.apply(x.apply(y, z)), {
  note:  '<var>n</var> &mapsto; <var>n</var> + 1 <i>or</i> SB',
  apply: arg => arg instanceof Church ? new Church(arg.n + 1) : null
});

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

/**
 *
 * @param {Expr} expr
 * @param {{max: number?, maxArgs: number?}} options
 * @param {number} maxWeight
 * @yields {{expr: Expr, steps: number?, comment: string?}}
 */
function * simplifyLambda (expr, options = {}, maxWeight = Infinity) {
  // expr is a lambda, free variable, or an application thereof
  // we want to find an equivalent lambda term with less weight
  // which we do sequentially from leaves to the root of the AST

  // short-circuit
  if (expr.freeOnly()) {
    if (expr.weight() < maxWeight)
      yield { expr, steps: 0, comment: 'only free vars' };
    return;
  }

  let steps = 0;
  let savedSteps = 0;

  // fun * arg Descartes product
  if (expr instanceof App) {
    // try to split into fun+arg, then try canonization but exposing each step
    const [fun, arg] = expr.split();

    for (const term of simplifyLambda(fun, options, maxWeight - 1)) {
      const candidate = term.expr.apply(arg);
      steps = savedSteps + term.steps;
      if (candidate.weight() < maxWeight) {
        maxWeight = candidate.weight();
        yield { expr: candidate, steps: term.steps, comment: term.comment + '(app)' };
      }
    }
    savedSteps = steps;

    for (const term of simplifyLambda(arg, options, maxWeight - 1)) {
      const candidate = fun.apply(term.expr);
      steps = savedSteps + term.steps;
      if (candidate.weight() < maxWeight) {
        maxWeight = candidate.weight();
        yield { expr: candidate, steps: term.steps, comment: term.comment + '(app)' };
      }
    }
    savedSteps = steps;
  }

  if (expr instanceof Lambda) {
    for (const term of simplifyLambda(expr.impl, options, maxWeight - 1)) {
      const candidate = new Lambda(expr.arg, term.expr);
      if (candidate.weight() < maxWeight) {
        maxWeight = candidate.weight();
        steps = savedSteps + term.steps;
        yield { expr: candidate, steps: term.steps, comment: term.comment + '(lambda)' };
      }
    }
    savedSteps = steps;
  }

  const canon = expr.guess({ max: options.max, maxArgs: options.maxArgs });
  if (canon.expr && canon.expr.weight() < maxWeight)
    yield { expr: canon.expr, steps: savedSteps + canon.steps, comment: 'canonical' };
}

function nthvar (n) {
  return new FreeVar('abcdefgh'[n] ?? 'x' + n);
}

// A global value meaning "lambda is used somewhere in this expression"
// Can't be used (at least for now) to construct lambda expressions, or anything at all.
// See also getSymbols().
Expr.lambdaPlaceholder = new Native('->', x => x, {
  arity:    1,
  canonize: false,
  note:     'Lambda placeholder',
  apply:    x => { throw new Error('Attempt to use a placeholder in expression') }
});

module.exports = { Expr, App, FreeVar, Lambda, Native, Alias, Church, globalOptions, native };
