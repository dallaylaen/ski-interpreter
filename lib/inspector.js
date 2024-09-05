const { Expr, Church, Native } = require('./expr');

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
    const probe = new Church(0);
    const succ = new Native('succ[!nat]', 1, expr => {
      if (expr !== probe)
        throw new Error('Attempt to coerce unknown term to a Church numeral: ' + expr);
      probe.n++;
      return probe;
    });
    // TODO make max increase with each succ application
    const result = args[0].run({ max: 100000 }, succ, probe).expr;
    if (result !== probe)
      throw new Error('Attempt to coerce unknown term to a Church numeral: ' + args[0]);
    return new Church(probe.n);
  },
}).register();

module.exports = { Inspector, inspectors };
