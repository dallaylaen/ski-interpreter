/**
 * Combinatory logic simulator
 */

class Ast {
  combine (...args) {
    return args.length > 0 ? new Call(this, args) : this;
  }

  step () { return null }

  run (max = 1000) {
    let expr = this;
    for (let i = 0; i < max; i++) {
      const next = expr.step();
      if (!next)
        return expr;
      expr = next;
    }
    throw new Error('Failed to resolve expression in ' + max + ' steps');
  }

  toString () {
    throw new Error( 'toString() undefined for generic AST' );
  }
}

class Call extends Ast {
  /**
   *
   * @param {Ast} fun
   * @param {Ast[]} args
   */
  constructor (fun, args) {
    super();
    this.fun = fun;
    this.args = args;
  }

  combine (...args) {
    if (args.length === 0)
      return this;
    return new Call(this.fun, [...this.args, ...args]);
  }

  step () {
    // if subtrees changed, return new self
    let change = 0;
    const f = this.fun.step();
    if (f)
      change++;
      // console.log("change in function: "+this.fun + " => " + f);

    // console.log("this.args = ", this.args);
    const args = [];
    for (const x of this.args) {
      const next = x.step();
      args.push(next ?? x);
      if (next)
        change++;
        // console.log("change in arg: "+x+" => "+next);
    }

    if (change)
      return (f ?? this.fun).combine(...args);

    // if nothing has changed, but there's known combinator, reduce it
    if (this.fun instanceof Special && this.args.length >= this.fun.arity) {
      const args = [...this.args]; // shallow copy
      const enough = args.splice(0, this.fun.arity);
      const result = this.fun.impl(...enough)
      // console.log("step: apply "+this.fun+" to "+enough.join(", ")+" => "+result);
      return result.combine(...args);
    }

    // no change whatsoever
    return null;
  }

  toString () {
    return this.fun.toString() + this.args.map(x => '(' + x + ')').join('');
  }
}

class Value extends Ast {
  constructor (name) {
    super();
    this.name = name;
  }

  toString () {
    return this.name;
  }
}

class Special extends Value {
  constructor (name, arity, impl) {
    super(name);
    this.arity = arity;
    this.impl  = impl;
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

class SKI {
  constructor () {
    // TODO options, e.g. allow BCW combinators
    this.known = {};

    this.add('I', [1, x => x]);
    this.add('K', [2, (x, _) => x]);
    this.add('S', [3, (x, y, z) => x.combine(z).combine(y.combine(z))]);
  }

  /**
   *
   * @param {String} name
   * @param {Ast|String|[number, (...Ast[]) => Ast]} impl
   * @param {String} [descr]
   * @return {SKI} chainable
   */
  add (name, impl, descr = '') {
    if (typeof impl === 'string')
      impl = this.parse(impl);
    else if (Array.isArray(impl))
      impl = new Special(name, impl[0], impl[1]);
    else if (!(impl instanceof Ast))
      throw new Error('add: impl must be an Ast, a string, or a [arity, impl] pair');

    this.known[name] = impl;

    return this;
  }

  /**
   *
   * @param str S(KI)I
   * @return {Ast} parsed expression
   */
  parse (str) {
    const letters = Object.keys(this.known).join('|');
    const rex = new RegExp('[()]|' + letters + '|(?:[a-z_][a-z_0-9]*)', 'g');

    // TODO die if unknown non-whitespace
    const tokens = [...str.matchAll(rex)].map(x => x[0]);

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
