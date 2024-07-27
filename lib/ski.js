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
  combine (...args) {
    return args.length > 0 ? new Call(this, ...args) : this;
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
   * @param {{max: number, count: number}|Ast} [opt]
   * @param {Ast} args
   * @return {{result: Ast, steps: number, final: boolean}}
   */
  run (opt = {}, ...args) {
    if (opt instanceof Ast) {
      args.unshift(opt);
      opt = {};
    }
    let expr = args ? this.combine(...args) : this;
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

class Call extends Ast {
  /**
   * @desc Application of fun() to args
   * @param {Ast} args
   */
  constructor (fun, ...args) {
    super();
    this.fun = fun;
    this.args = args;
    this.final = false;
  }

  combine (...args) {
    if (args.length === 0)
      return this;
    return this.fun.combine( ...this.args, ...args);
  }

  expand () {
    return this.fun.expand().combine(...this.args.map(x => x.expand()));
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
      return (fun ?? this.fun).combine(...args);

    // if nothing has changed, but the fun knows how to proceed, let it do stuff
    const reduced = this.fun.reduce(this.args);
    if (reduced)
      return reduced;

    // no more reductions can be made
    this.final = true;
    return null;
  }

  equals (other) {
    if (!(other instanceof Call))
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

class Value extends Ast {
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

class Special extends Value {
  /**
   * @desc A term named 'name' that converts next 'arity' arguments into
   *       an expression returned by 'impl' function
   * @param {String} name
   * @param {Number} arity
   * @param {function(...Ast): Ast} impl
   * @param {Object} opt
   */
  constructor (name, arity, impl, opt = {}) {
    super(name);
    this.arity = arity;
    this.impl  = impl;
    if (opt.fast)
      this.fast = true;
  }

  reduce (args) {
    if (args.length < this.arity)
      return null;
    const tail = args.splice(this.arity);
    return this.impl(...args).combine(...tail);
  }

  isNative () {
    return true;
  }
}

class Empty extends Ast {
  combine (...args) {
    return args.length ? args.shift().combine(...args) : this;
  }

  toString () {
    return '<empty>';
  }
}

class Alias extends Value {
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

class SKI {
  constructor () {
    // TODO options, e.g. allow BCW combinators
    this.known = {};

    this.add('I', [1, x => x, { fast: true }], 'x -> x');
    this.add('K', [2, (x, _) => x, { fast: true }], '(x y) -> x');
    this.add('S', [3, (x, y, z) => x.combine(z, y.combine(z))],
      '(x y z) -> x z (y z)');
  }

  /**
   *
   * @param {String} name
   * @param {Ast|String|[number, (...Ast[]) => Ast]} impl
   * @param {String} [descr]
   * @return {SKI} chainable
   */
  add (name, impl, note = '') {
    if (typeof impl === 'string')
      impl = new Alias( name, this.parse(impl));
    else if (Array.isArray(impl))
      impl = new Special(name, impl[0], impl[1], impl[2] ?? {});
    else if (impl instanceof Ast)
      impl = new Alias( name, impl );
    else
      throw new Error('add: impl must be an Ast, a string, or a [arity, impl] pair');

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
   * @param {String} str S(KI)I
   * @return {Ast} parsed expression
   */
  parse (str) {
    const rex = /([()A-Z]|[a-z_][a-z_0-9]*)|\s+|($)/sgy;

    const split = [...str.matchAll(rex)];

    const eol = split.pop();
    if (eol[2] !== '')
      throw new Error('Unknown tokens in string starting with ' + str.substring(eol.index));

    // TODO die if unknown non-whitespace

    const tokens = split.map(x => x[1]).filter(x => typeof x !== 'undefined');

    const empty = new Empty();
    const stack = [empty];

    for ( const c of tokens) {
      // console.log("parse: found "+c+"; stack =", stack.join(", "));
      if (c === '(')
        stack.push(empty);
      else if ( c === ')') {
        if (stack.length < 2)
          throw new Error('unbalanced input: ' + str);
        const x = stack.pop();
        const f = stack.pop();
        stack.push(f.combine(x));
      } else {
        const f = stack.pop();
        const x = this.known[c] ?? new Value(c);
        // console.log("combine", f, x)
        stack.push(f.combine(x));
      }
    }

    if (stack.length !== 1)
      throw new Error('unbalanced input: ' + str);

    return stack[0];
  }
}

module.exports = { SKI };
