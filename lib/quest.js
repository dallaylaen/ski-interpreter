const { SKI } = require('./ski');

class Quest {
  /**
     *
     * @param {{title:string?, descr:string?, allow: string?}} options
     * @param {[Object|string, ...string[]]} cases
     */
  constructor (options = {}, ...cases) {
    this.env = new SKI({ allow: options.allow }); // TODO restrict and/or allow extra terms
    this.vars = {};
    this.cases = [];
    this.title = options.title;
    this.descr = options.descr;

    for (const c of cases)
      this.add(...c);
  }

  /**
     *
     * @param {{note: string?, max: number?}|string} opt
     * @param {String} terms
     * @return {Quest}
     */
  add (opt = {}, ...terms) {
    if (typeof opt === 'string') {
      terms.unshift(opt);
      opt = {};
    }

    if (terms.length < 1)
      throw new Error('Too little data for a testcase');

    this.cases.push( new TestCase(this.env, this.vars, opt, terms.shift(), ...terms) );
    return this;
  }

  /**
     *
     * @param {Ast|string} expr
     * @return {{pass: boolean, details: {pass: boolean, count: number, found: Ast, expected: Ast, args: Ast[]}[]}}
     */
  check (expr) {
    if (typeof expr === 'string')
      expr = this.env.parse(expr);
    const details = this.cases.map( c => c.check(expr) );
    const pass = details.reduce((acc, val) => acc && val.pass, true);
    return { pass, details };
  }

  /**
     *
     * @return {TestCase[]}
     */
  show () {
    return [...this.cases];
  }
}

class TestCase {
  /**
     *
     * @param {SKI} ski
     * @param {Object}vars
     * @param {{max: number?, note: string?}}options
     * @param {string} expect
     * @param {string} terms
     */
  constructor (ski, vars, options, expect, ...terms) {
    this.expect = ski.parse(expect, vars);
    this.max = options.max;
    this.note = options.note;
    this.args = terms.map(s => ski.parse(s, vars));
  }

  /**
     *
     * @param {Ast} expr
     * @return {{args: Ast[], found: Ast, pass: boolean, expected: Ast, count: number}}
     */
  check (expr) {
    const found = expr.run({ max: this.max }, ...this.args);
    return {
      pass:     found.final && this.expect.equals(found.result),
      count:    found.steps,
      found:    found.result,
      expected: this.expect,
      args:     this.args,
    };
  }
}

module.exports = { Quest };
