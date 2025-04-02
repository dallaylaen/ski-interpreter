const { missingIndices, isSubset } = require('./util');

const globalOptions = {
  terse:   false,
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
    this.arity = Infinity;
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
   * @desc rought estimate of the complexity of the term
   * @return {number}
   */
  weight () {
    return 1;
  }

  /**
   *
   * @param {{max: number?, maxArgs: number?, bestGuess?: Expr}} options
   * @return {{
   *    found: boolean,
   *    proper: boolean,
   *    arity: number?,
   *    linear: boolean?,
   *    canonical?: Expr,
   *    skip: Set<number>?
   * }}
   */
  canonize (options = {}) {
    const max = options.max ?? globalOptions.max;
    const maxArgs = options.maxArgs ?? globalOptions.maxArgs;

    let expr = this;
    const jar = [];
    for (let i = 0; i < maxArgs; i++) {
      const calc = expr.run({ max });
      if (!calc.final)
        break;
      expr = calc.expr;
      if (!expr.wantsArgs()) {
        // found!
        const symbols = expr.getSymbols();
        const skip = missingIndices(jar, symbols);
        const proper = isSubset(symbols.keys(), new Set(jar));
        const duplicates = [...symbols.entries()].filter(([_, v]) => v > 1);
        const linear = proper && skip.size === 0 && duplicates.length === 0;
        return {
          arity:     i,
          found:     true,
          canonical: maybeLambda(jar, expr),
          proper,
          linear,
          ...(skip.size ? { skip } : {}),
        };
      }
      const next = new FreeVar('abcdefgh'[i] ?? 'x' + i);
      jar.push(next);
      expr = expr.apply(next);
    }

    const fallback = { found: false, proper: false };
    if (options.bestGuess)
      fallback.canonical = options.bestGuess;
    return fallback;
  }

  /**
   * @desc Convert expression to equivalent lambda form, step by step,
   *       preferably by evaluation as a whole but falling back to divide and conquer.
   * @param {{
   *   max: number?,
   *   maxArgs: number?,
   *   varGen: function(void): FreeVar?,
   *   steps: number?
   * }}options
   * @return {IterableIterator<{expr: Expr, steps: number, final: boolean}>}
   */
  * lambdify (options = {}) {
    // similar to canonize, but line by line and recurses into subexpressions
    const varGen = options.varGen ?? freeSeq();
    const max = options.max ?? globalOptions.max;
    const maxArgs = options.maxArgs ?? globalOptions.maxArgs;
    let steps = 0;
    const jar = [];
    let expr = this; // @type {Expr}

    if (expr instanceof Alias) {
      expr = expr.impl;
      yield { expr, steps, final: false };
    }

    for (let i = 0; i < maxArgs; i++) {
      if (!expr.wantsArgs())
        break;
      const arg = varGen();
      const next = expr.run({ max }, arg);
      if (!next.final)
        break;
      jar.push(arg);
      expr = next.expr;
      steps += next.steps;
      yield { expr: new Lambda(jar, expr), steps, final: false };
    }

    // try to short cirquit if nothing but lambdas & free vars are left
    const sym = expr.getSymbols();
    const unresolved = [...sym]
      .filter(([key, _]) => !(key instanceof FreeVar || key === Expr.lambdaPlaceholder));
    if (unresolved.length === 0) {
      yield { expr: maybeLambda(jar, expr), steps, final: true };
      return;
    }

    // if we got here, all we can do is recurse
    if (expr instanceof App) {
      let [fun, arg] = expr.split();
      for (const next of fun.lambdify({ max, maxArgs, varGen })) {
        steps += next.steps;
        fun = next.expr;
        yield { expr: maybeLambda(jar, new App(fun, arg)), steps, final: false };
      }

      for (const next of arg.lambdify({ max, maxArgs, varGen })) {
        steps += next.steps;
        arg = next.expr;
        yield { expr: maybeLambda(jar, new App(fun, arg)), steps, final: next.final };
      }
      return;
    }

    //
    throw new Error('Unexpected expression type reached in lambdify: ' + expr);
  }

  /**
   *
   * @param {{max: number?}} options
   * @return {{changed: boolean, expr: Expr, steps: number}}
   */
  rewriteSKI (options = {}) {
    const opt = {
      max:   options.max ?? Infinity,
      steps: 0,
    };
    // carrying around a mutable object, but it is what it is
    const expr = this._rski(opt);
    return {
      expr,
      steps:   opt.steps,
      changed: opt.steps !== 0,
    };
  }

  _rski (options) {
    return this;
  }

  /**
   * @desc Whether the term will reduce further if given more arguments.
   *       In practice, equivalent to "starts with a FreeVar"
   *       Used by canonize (duh...)
   * @return {boolean}
   */
  wantsArgs () {
    return true;
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
    const max = (opt.max ?? globalOptions.max) + steps;
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

  expect (other) {
    if (!(other instanceof Expr))
      throw new Error('Attempt to expect a combinator to equal something else: ' + other);
    if (this.equals(other))
      return;

    // TODO wanna use AssertionError but webpack doesn't recognize it
    // still the below hack works for mocha-based tests.
    const poorMans = new Error('Found term ' + this + ' but expected ' + other);
    poorMans.expected = other.toString();
    poorMans.actual = this.toString();
    throw poorMans;
  }

  /**
   * @param {{terse: boolean?}} options
   * @return {string} string representation of the expression
   */
  toString (options = {}) {
    // uncomment the following line if you want to debug the parser with prints
    // return this.constructor.name
    throw new Error( 'No toString() method defined in class ' + this.constructor.name );
  }

  /**
   *
   * @return {boolean}
   */
  needsParens () {
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

/**
 *   Constants that define when whitespace between terms may be omitted in App.toString()
 */
const BITS = 4;
const [T_UNKNOWN, T_PARENS, T_UPPER, T_LOWER]
    = (function * () { for (let i = 0; ; yield i++); })();
const canLump = new Set([
  (T_PARENS  << BITS) + T_PARENS,
  (T_PARENS  << BITS) + T_UPPER,
  (T_UPPER   << BITS) + T_PARENS,
  (T_UPPER   << BITS) + T_UPPER,
  (T_UPPER   << BITS) + T_LOWER,
  (T_LOWER   << BITS) + T_PARENS,
  (T_UNKNOWN << BITS) + T_PARENS,
]);

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
    this.fun = fun;
    this.args = args;
    this.final = false;
  }

  weight () {
    return this.args.reduce((acc, x) => acc + x.weight(), this.fun.weight());
  }

  getSymbols () {
    const out = this.fun.getSymbols();
    for (const term of this.args) {
      for (const [key, value] of term.getSymbols())
        out.set(key, (out.get(key) ?? 0) + value);
    }
    return out;
  }

  wantsArgs () {
    return this.fun.wantsArgs();
  }

  apply (...args) {
    if (args.length === 0)
      return this;
    return this.fun.apply( ...this.args, ...args);
  }

  expand () {
    return this.fun.expand().apply(...this.args.map(x => x.expand()));
  }

  canonize (options = {}) {
    const [fun, arg] = this.split().map(x => x.canonize(options).canonical);
    return super.canonize({
      ...options,
      ...(fun && arg ? { bestGuess: fun.apply(arg) } : {})
    });
  }

  subst (plug, value) {
    const fun = this.fun.subst(plug, value);
    let change = fun === null ? 0 : 1;
    const args = [];
    for (const x of this.args) {
      const next = x.subst(plug, value);
      if (next === null)
        args.push(x);
      else {
        args.push(next);
        change++;
      }
    }

    return change ? (fun ?? this.fun).apply(...args) : null;
  }

  /**
   * @return {{expr: Expr, steps: number}}
   */

  step () {
    // normal reduction order: first try root, then at most 1 step
    if (!this.final) {
      const reduced = this.fun.reduce(this.args);
      if (reduced)
        return { expr: reduced, steps: 1, changed: true };

      // now try recursing

      const fun = this.fun.step();
      if (fun.changed)
        return { expr: fun.expr.apply(...this.args), steps: fun.steps, changed: true };

      for (let i = 0; i < this.args.length; i++) {
        const next = this.args[i].step();
        if (!next.changed)
          continue;
        const args = this.args.slice();
        args[i] = next.expr;
        return { expr: this.fun.apply(...args), steps: next.steps, changed: true };
      }
    }
    this.final = true;
    return { expr: this, steps: 0, changed: false };
  }

  split () {
    // pretend we are an elegant (cons fun arg) and not a sleazy imperative array
    const args = this.args.slice();
    const last = args.pop();
    return [this.fun.apply(...args), last];
  }

  /**
   * @desc Convert the expression to SKI combinatory logic
   * @return {Expr}
   */

  _rski (options) {
    if (options.steps >= options.max)
      return this;
    return this.fun._rski(options).apply(...this.args.map(x => x._rski(options)));
  }

  equals (other) {
    if (!(other instanceof App))
      return false;
    if (other.args.length !== this.args.length)
      return false;
    if (!this.fun.equals(other.fun))
      return false;
    for (let i = 0; i < this.args.length; i++) {
      if (!this.args[i].equals(other.args[i]))
        return false;
    }
    return true;
  }

  toString (opt = {}) {
    if (opt.terse ?? globalOptions.terse) {
      const out = [];
      let oldType = 0;
      // stupid ad-hoc state machine, see above for constant definitions
      for (const term of [this.fun, ...this.args]) {
        let s = term.toString(opt);
        let newType = T_UNKNOWN;
        if (s.match(/^[A-Z]$/))
          newType = T_UPPER;
        else if (s.match(/^[a-z][a-z_0-9]*$/))
          newType = T_LOWER;
        else if (s.match(/^[0-9]+$/))
          // no special treatment for numerals, skip
          ;
        else if (out.length !== 0 || term.needsParens()) {
          s = '(' + s + ')';
          newType = T_PARENS;
        }
        if (!canLump.has((oldType << BITS) | newType) && out.length > 0)
          out.push(' ');
        out.push(s);
        oldType = newType;
      }
      return out.join('');
    } else {
      const root = this.fun.needsParens() ? '(' + this.fun + ')' : this.fun + '';
      return root + this.args.map(x => '(' + x + ')').join('');
    }
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

  wantsArgs () {
    return false;
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
    const guess = (opt.canonize ?? true) ? this.canonize() : { found: false };

    if (!opt.arity)
      this.arity = guess.arity || 1;

    this.note = opt.note ?? guess.canonical?.toString({ terse: true });
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
    const canon = this.canonize().canonical;
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

  equals (other) {
    if (!(other instanceof Lambda))
      return false;

    const t = new FreeVar('t');

    return other.reduce([t]).equals(this.reduce([t]));
  }

  toString (opt = {}) {
    return this.arg + '->' + this.impl.toString(opt);
  }

  needsParens () {
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
      ? impl.canonize({ max: options.max, maxArgs: options.maxArgs })
      : { found: false };
    this.arity = (guess.found && guess.proper && guess.arity) || 0;
    this.proper = guess.proper ?? false;
    this.terminal = options.terminal ?? this.proper;
    this.canonical = guess.canonical;
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

  wantsArgs () {
    return this.impl.wantsArgs();
  }

  equals (other) {
    return other.equals(this.impl);
  }

  _rski (options) {
    return this.impl._rski(options);
  }

  toString (opt) {
    return this.outdated ? this.impl.toString(opt) : super.toString(opt);
  }

  needsParens () {
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
  note:  'n->n+1 or SB',
  apply: arg => arg instanceof Church ? new Church(arg.n + 1) : null
});

function maybeLambda (args, expr) {
  if (args.length === 0)
    return expr;
  return new Lambda(args, expr);
}

function freeSeq () {
  let n = 0;
  return function () {
    return new FreeVar('x' + n++);
  }
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
