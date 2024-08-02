/**
 * Combinatory logic simulator
 */

class Ast {
  /**
   * @desc apply self to zero or more terms and return the resulting term,
   * without performing any calculations whatsoever
   * @param {Ast} args
   * @return {Ast}
   */
  apply (...args) {
    return args.length > 0 ? new App(this, ...args) : this;
  }

  /**
   * expand all terms but don't perform any calculations
   * @return {Ast}
   */
  expand () {
    return this;
  }

  /**
   * Apply self to list of given args.
   * Normally, only native combinators know how to do it.
   * @param {Ast[]} args
   * @return {Ast|null}
   */
  reduce (args) {
    return null;
  }

  /**
   * @desc iterate one step of calculation in accordance with known rules.
   *       return the new expression if reduction was possible. or null otherwise
   * @return {Ast|null}
   */
  step () { return null }

  /**
   * @desc Run uninterrupted sequence of step() applications
   *       until the expression is irreducible, or max number of steps is reached.
   *       Default number of steps = 1000.
   * @param {{max: number?, count: number?, throw: boolean?}|Ast} [opt]
   * @param {Ast} args
   * @return {{result: Ast, steps: number, final: boolean}}
   */
  run (opt = {}, ...args) {
    if (opt instanceof Ast) {
      args.unshift(opt);
      opt = {};
    }
    let expr = args ? this.apply(...args) : this;
    let steps = opt.count ?? 0;
    const max = (opt.max ?? 1000) + steps;
    let final = false;
    for (; steps < max; steps++ ) {
      const next = expr.step();
      if (!next) {
        final = true;
        break;
      }
      expr = next;
    }
    if (opt.throw && !final)
      throw new Error('Failed to compute expression in ' + max + ' steps');
    return { final, steps, result: expr };
  }

  isNative () { return false; }

  /**
   *
   * @param {Ast} other
   * @return {boolean}
   */
  equals (other) {
    return this === other;
  }

  /**
   * @return {string} string representation of the expression
   */
  toString () {
    throw new Error( 'toString() undefined for generic AST' );
  }
}

class App extends Ast {
  /**
   * @desc Application of fun() to args
   * @param {Ast} fun
   * @param {Ast} args
   */
  constructor (fun, ...args) {
    super();
    this.fun = fun;
    this.args = args;
    this.final = false;
  }

  apply (...args) {
    if (args.length === 0)
      return this;
    return this.fun.apply( ...this.args, ...args);
  }

  expand () {
    return this.fun.expand().apply(...this.args.map(x => x.expand()));
  }

  /**
   * @desc Recursively calculates all terms in the expression. If nothing has to be done,
   * tries to apply the first n-ary term to first n arguments.
   * @return {Ast|null}
   */
  step () {
    if (this.final)
      return null;

    // first try to cut off some subtrees so we don't need to calculate them at all
    if (this.fun.fast) {
      const maybe = this.fun.reduce(this.args);
      if (maybe)
        return maybe;
    }

    // if subtrees changed, return new self
    const fun = this.fun.step();
    let change = fun ? 1 : 0;

    const args = [];
    for (const x of this.args) {
      const next = x.step();
      args.push(next ?? x);
      if (next)
        change++;
    }

    if (change)
      return (fun ?? this.fun).apply(...args);

    // if nothing has changed, but the fun knows how to proceed, let it do stuff
    const reduced = this.fun.reduce(this.args);
    if (reduced)
      return reduced;

    // no more reductions can be made
    this.final = true;
    return null;
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

  toString () {
    return this.fun.toString() + this.args.map(x => '(' + x + ')').join('');
  }
}

class FreeVar extends Ast {
  /**
   * @desc a constant named 'name'
   * @param {String} name
   */
  constructor (name) {
    super();
    this.name = name;
  }

  toString () {
    return this.name;
  }
}

class Native extends FreeVar {
  /**
   * @desc A term named 'name' that converts next 'arity' arguments into
   *       an expression returned by 'impl' function
   * @param {String} name
   * @param {Number} arity
   * @param {function(...Ast): Ast} impl
   * @param {{note: string?, fast: boolean?}} opt
   */
  constructor (name, arity, impl, opt = {}) {
    super(name);
    this.arity = arity;
    this.impl  = impl;
    if (opt.fast)
      this.fast = true;
    if (opt.note !== undefined)
      this.note = opt.note;
  }

  reduce (args) {
    if (args.length < this.arity)
      return null;
    const tail = args.splice(this.arity);
    return this.impl(...args).apply(...tail);
  }

  isNative () {
    return true;
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
  }
}

class Alias extends FreeVar {
  /**
   * @desc An existing expression under a different name.
   * @param {String} name
   * @param {Ast} impl
   */
  constructor (name, impl) {
    super(name);
    this.impl = impl;
  }

  expand () {
    return this.impl.expand();
  }

  step () {
    return this.impl;
  }

  toString () {
    return this.outdated ? this.impl.toString() : super.toString();
  }
}

class Empty extends Ast {
  apply (...args) {
    return args.length ? args.shift().apply(...args) : this;
  }

  toString () {
    return '<empty>';
  }
}

/**
 *
 * @type {{[key: string]: Native}}
 */
const native = {
  I: new Native('I', 1, x => x, { fast: true, note: 'x -> x' }),
  K: new Native('K', 2, (x, _) => x, { fast: true, note: '(x y) -> x' }),
  S: new Native('S', 3, (x, y, z) => x.apply(z, y.apply(z)), { note: '(x y z) -> x z (y z)' }),
  B: new Native('B', 3, (x, y, z) => x.apply(y.apply(z)), { note: '(x y z) -> x (y z)' }),
  C: new Native('C', 3, (x, y, z) => x.apply(z).apply(y), { note: '(x y z) -> x z y' }),
  W: new Native('W', 2, (x, y) => x.apply(y).apply(y), { note: '(x y) -> x y y' }),
};

class SKI {
  /**
   *
   * @param {{allow: string?, numbers: boolean?}} [options]
   */
  constructor (options = {}) {
    this.known = {};

    this.hasNumbers = !!options.numbers;
    const allow = (options.allow ?? 'SKI');
    for (const term of allow.split(''))
      this.known[term] = native[term];
  }

  /**
   *
   * @param {String} name
   * @param {Ast|String|[number, function(...Ast): Ast, {note: string?, fast: boolean?}]} impl
   * @param {String} [note]
   * @return {SKI} chainable
   */
  add (name, impl, note ) {
    if (typeof impl === 'string')
      impl = new Alias( name, this.parse(impl));
    else if (Array.isArray(impl))
      impl = new Native(name, impl[0], impl[1], impl[2] ?? {});
    else if (impl instanceof Ast)
      impl = new Alias( name, impl );
    else
      throw new Error('add: impl must be an Ast, a string, or a [arity, impl] pair');

    if (note !== undefined)
      impl.note = note;
    this.known[name] = impl;

    return this;
  }

  /**
   *
   * @param {String} name
   * @return {SKI}
   */
  remove (name) {
    this.known[name].outdated = true;
    delete this.known[name];
    return this;
  }

  /**
   *
   * @return {Object<Ast>}
   */
  getTerms () {
    return { ...this.known };
  }

  /**
   *
   * @param {string} source
   * @param {{[keys: string]: Ast}} vars
   */
  parseMulti (source, vars = {}) {
    const lines = source.replace(/\/\/[^\n]*\n/gs, '')
      .split(/\s*;[\s;]*/).filter( s => s.match(/\S/));
    let expr = new Empty();
    for (const item of lines) {
      const [_, save, str] = item.match(/^(?:\s*([A-Z]|[a-z][a-z_0-9]*)\s*=\s*)?(.*)$/s);
      expr = this.parse(str, vars);
      if (save !== undefined)
        vars[save] = expr;
    }
    return expr;
  }

  /**
   *
   * @param {String} source S(KI)I
   * @param {{[keys: string]: Ast}} vars
   * @return {Ast} parsed expression
   */
  parse (source, vars = {}) {
    const rex = /([()A-Z]|[a-z_][a-z_0-9]*|\b[0-9]+\b)|\s+|($)/sgy;

    const split = [...source.matchAll(rex)];

    const eol = split.pop();
    if (eol[2] !== '')
      throw new Error('Unknown tokens in string starting with ' + source.substring(eol.index));

    // TODO die if unknown non-whitespace

    const tokens = split.map(x => x[1]).filter(x => typeof x !== 'undefined');

    const empty = new Empty();
    /** @type {Ast[]} */
    const stack = [empty];

    for (const c of tokens) {
      // console.log("parse: found "+c+"; stack =", stack.join(", "));
      if (c === '(')
        stack.push(empty);
      else if (c === ')') {
        if (stack.length < 2)
          throw new Error('unbalanced input: ' + source);
        const x = stack.pop();
        const f = stack.pop();
        stack.push(f.apply(x));
      } else if (c.match(/^[0-9]+$/)) {
        if (!this.hasNumbers)
          throw new Error('Church numbers not supported, allow them explicitly');
        const f = stack.pop();
        stack.push(f.apply(new Church(c)));
      } else {
        const f = stack.pop();
        const x = this.known[c] ?? (vars[c] = vars[c] ?? new FreeVar(c));
        stack.push(f.apply(x));
      }
    }

    if (stack.length !== 1)
      throw new Error('unbalanced input: ' + source);

    return stack[0];
  }
}

// Create shortcuts for common terms
SKI.free = x => new FreeVar(x);
SKI.church = n => new Church(n);
for (const name in native)
  SKI[name] = native[name];

module.exports = { SKI };
