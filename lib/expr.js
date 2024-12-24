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
   *
   * @return {Set<FreeVar>}
   */
  freeVars () {
    return new Set();
  }

  /**
   *
   * @param {{max: number?, maxArgs: number?}} options
   * @return {{arity: number?, found: boolean, proper: boolean, canonical?: Expr}}
   */
  guessArity (options = {}) {
    const max = options.max ?? 1000;
    const maxArgs = options.maxArgs ?? 32;

    let expr = this;
    const jar = [];
    for (let i = 0; i < maxArgs; i++) {
      const calc = expr.run({ max });
      if (!calc.final)
        break;
      expr = calc.expr;
      if (expr.acceptsNoArgs()) {
        return {
          arity:     i,
          proper:    expr.hasOnly(new Set(jar)),
          found:     true,
          canonical: jar.length ? new Lambda(jar, expr) : expr,
        }
      }
      const next = new FreeVar('x' + i);
      jar.push(next);
      expr = expr.apply(next);
    }

    return {
      proper: false,
      found:  false,
    }
  }

  hasOnly (set) {
    return set.has(this);
  }

  acceptsNoArgs () {
    return false;
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
     * return nulls if no changes could be made, just like step() does, to save memory.
     * @param {FreeVar} plug
     * @param {Expr} value
     * @return {Expr|null}
     */
  subst (plug, value) {
    return null;
  }

  /**
     * @desc iterate one step of calculation in accordance with known rules.
     *       return the new expression if reduction was possible. or null otherwise
     * @return {{expr: Expr, steps: number}}
     */
  step () { return { steps: 0, expr: this } }

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
    const max = (opt.max ?? 1000) + steps;
    let final = false;
    for (; steps < max; ) {
      const next = expr.step();
      if (next.steps === 0) {
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
      if (next.steps === 0)
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
     * @desc Application of fun() to args
     * @param {Expr} fun
     * @param {Expr} args
     */
  constructor (fun, ...args) {
    super();
    this.fun = fun;
    this.args = args;
    this.final = false;
  }

  freeVars () {
    return new Set([...this.fun.freeVars(), ...this.args.flatMap( term => [...term.freeVars()] )]);
  }

  hasOnly (set) {
    for (const term of [this.fun, ...this.args]) {
      if (!term.hasOnly(set))
        return false;
    }
    return true;
  }

  acceptsNoArgs () {
    return this.fun.acceptsNoArgs();
  }

  apply (...args) {
    if (args.length === 0)
      return this;
    return this.fun.apply( ...this.args, ...args);
  }

  expand () {
    return this.fun.expand().apply(...this.args.map(x => x.expand()));
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
     * @desc Recursively calculates all terms in the expression. If nothing has to be done,
     * tries to apply the first n-ary term to first n arguments.
     * @return {{expr: Expr, steps: number}}
     */
  step () {
    if (this.final)
      return { expr: this, steps: 0 };

    // now try recursing
    let change = 0;

    const skip = this.fun.skip;

    // TODO must be inefficient, rewrite later
    const acc = (expr, pos) => {
      if (skip && skip.has(pos))
        return expr;
      const next = expr.step();
      change += next.steps;
      return next.expr;
    };

    // if subtrees changed, return new self
    const fun = acc(this.fun, -1);
    const args = this.args.map(acc);

    // if nothing has changed, but the fun knows how to proceed, let it do the stuff
    const reduced = fun.reduce(args);
    if (reduced)
      return { expr: reduced, steps: change + 1 };
    else if (change)
      return { expr: fun.apply(...args), steps: change };

    // no more reductions can be made
    this.final = true;
    return { expr: this, steps: 0 };
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
    if (opt.terse) {
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
        else if (out.length !== 0 || term instanceof Lambda) {
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
      const root = this.fun instanceof Lambda ? '(' + this.fun + ')' : this.fun + '';
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

  freeVars () {
    return new Set([this]);
  }

  acceptsNoArgs () {
    return true;
  }
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

  freeVars () {
    const set = this.impl.freeVars();
    set.delete(this.arg)
    return set;
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

  equals (other) {
    if (!(other instanceof Lambda))
      return false;

    const t = new FreeVar('t');

    return other.reduce([t]).equals(this.reduce([t]));
  }

  toString (opt = {}) {
    return this.arg + '->' + this.impl.toString(opt);
  }
}

class Native extends Named {
  /**
     * @desc A term named 'name' that converts next 'arity' arguments into
     *       an expression returned by 'impl' function
     * @param {String} name
     * @param {Number} arity
     * @param {function(...Expr): Expr} impl
     * @param {{note: string?, skip: Array<number>?}} opt
     */
  constructor (name, arity, impl, opt = {}) {
    super(name);
    this.arity = arity;
    this.impl  = impl;

    if (opt.skip !== undefined)
      this.skip = new Set(opt.skip);

    if (opt.note !== undefined)
      this.note = opt.note;
  }

  reduce (args) {
    if (args.length < this.arity)
      return null;
    return this.impl(...args.slice(0, this.arity)).apply(...args.slice(this.arity));
  }

  toJSON () {
    return 'Native:' + this.name;
  }
}

class Church extends Native {
  constructor (n) {
    const p = Number.parseInt(n);
    if (!(p >= 0))
      throw new Error('Church number must be a nonnegative integer');
    super('' + p, 2, function (x, y) {
      let expr = y;
      for (let i = p; i-- > 0; )
        expr = x.apply(expr);
      return expr;
    });
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
     */
  constructor (name, impl) {
    super(name);
    this.impl = impl;
    const guess = impl.guessArity();
    this.arity = (guess.found && guess.proper && guess.arity) || 0;
  }

  freeVars () {
    return this.impl.freeVars();
  }

  expand () {
    return this.impl.expand();
  }

  subst (plug, value) {
    return this.impl.subst(plug, value);
  }

  reduce (args) {
    if (args.length < this.arity)
      return null;
    return this.impl.apply(...args);
  }

  equals (other) {
    return other.equals(this.impl);
  }

  toString (opt) {
    return this.outdated ? this.impl.toString(opt) : super.toString(opt);
  }
}

/**
 *
 * @type {{[key: string]: Native}}
 */
const native = {
  I: new Native('I', 1, x => x, { note: 'x -> x' }),
  K: new Native('K', 2, (x, _) => x, { skip: [1], note: 'x -> y -> x' }),
  S: new Native('S', 3, (x, y, z) => x.apply(z, y.apply(z)), { note: 'x -> y -> z -> x z (y z)' }),
  B: new Native('B', 3, (x, y, z) => x.apply(y.apply(z)), { note: 'x -> y -> z -> x (y z)' }),
  C: new Native('C', 3, (x, y, z) => x.apply(z).apply(y), { note: 'x -> y -> z -> x z y' }),
  W: new Native('W', 2, (x, y) => x.apply(y).apply(y), { note: 'x -> y -> x y y' }),
};

module.exports = { Expr, App, FreeVar, Lambda, Native, Alias, Church, native };
