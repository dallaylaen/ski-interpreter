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

        return action.apply(this, [head]).apply(...tail);
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

const maxInt = 130 * 1024;

new Inspector('nat', {
  onReduce: function (args) {
    const x = new FreeVar('x');
    const y = new FreeVar('y');

    // Tried to increase the threshold with each application of x but that allows to hang the interpreter
    // Tried to inject "clever" pseudo-free terms that count application but that allows fooling the coercion
    // So, just execute for a fixed (large) number of steps and count x(x(...(y)...))
    const result = args[0].run({ max: maxInt }, x, y);
    if (!result.final)
      throw new Error(`Church number coercion failed: expression didn't terminate in ${maxInt} steps: ${args[0]}`);

    let expr = result.expr;
    let ret = 0;
    while (true) {
      if (expr === y)
        return new Church(ret);
      if (expr instanceof App && expr.fun === x && expr.args.length === 1) {
        ret++;
        expr = expr.args[0];
        continue;
      }
      throw new Error('Church number coercion failed: expression is not a number: ' + args[0]);
    }
  },
}).register();

module.exports = { Inspector, inspectors };
