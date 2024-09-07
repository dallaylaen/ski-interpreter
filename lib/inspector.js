const { Expr, Church, FreeVar, App } = require('./expr');

/**
 *   @classdesc
 *   Inspector is a pseudo-term that, unlike a normal combinator,
 *   may access the structure of the terms it is applied to.
 */

/**
 *
 * @type {{[key: string]: Injection}}
 */
const inspectors = {};

class Inspector extends Expr {
  /**
     *
     * @param {string} name
     * @param {{arity: number, onReduce: function(Expr[]): Expr}} opt
     */
  constructor (name, opt = {}) {
    super();
    this.name = name;
    this.arity = opt.arity ?? 1;

    if (opt.onReduce) {
      const action = opt.onReduce;
      this.reduce = function (args) {
        if (args.length < this.arity)
          return null;
        const head = args.slice(0, this.arity);
        const tail = args.slice(this.arity);

        return action(head).apply(...tail);
      }
    }
  }

  register () {
    inspectors[this] = this;
    return this;
  }

  toString (options = {}) {
    return '!' + this.name;
  }
}

new Inspector('nat', {
  onReduce: args => {
    const x = new FreeVar('x');
    const y = new FreeVar('y');
    let max = 10000;

    const apply = (x.apply ?? x.prototype.apply).bind(x);
    x.apply = (...args) => {
      max += 1000;
      return apply(...args);
    }

    let expr = args[0].apply(x, y);
    let steps = 0;
    while (true) {
      const next = expr.step();
      if (next.steps === 0)
        break;
      steps += next.steps;
      if (steps > max)
        throw new Error('Conversion to Church numeral could not be completed in ' + steps + ' steps');
      expr = next.expr;
    }

    let ret = 0;
    while (true) {
      if (expr === y)
        return new Church(ret);
      if (expr instanceof App && expr.fun === x && expr.args.length === 1) {
        ret++;
        expr = expr.args[0];
        continue;
      }
      throw new Error('Attempt to coerce non-numeric expression into a Church number: ' + args[0]);
    }
  },
}).register();

module.exports = { Inspector, inspectors };
