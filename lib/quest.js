const { SKI } = require('./ski');

class Quest {
  /**
     *
     * @param {{title:string?, descr:string?, allow: string?, numbers: boolean?, vars: string[]?}} options
     * @param {[Object|string, ...string[]]} cases
     */
  constructor (options = {}, ...cases) {
    this.engine = new SKI({ allow: options.allow, numbers: options.numbers });
    this.vars = {};

    // options.vars is a list of expressions.
    // we suck all free variables + all term declarations from there into this.vars
    // to feed it later to every case's parser.
    if (options.vars) {
      for (const term of options.vars) {
        const expr = this.engine.parse(term, this.vars);
        if (expr instanceof SKI.classes.Alias)
          this.vars[expr.name] = expr.impl;
      }
    }

    this.cases = [];
    this.title = options.title;
    this.descr = options.descr;
    this.meta = { ...options };

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

    this.cases.push( new TestCase(this.engine, this.vars, opt, terms.shift(), ...terms) );
    return this;
  }

  /**
     *
     * @param {Ast|string} expr
     * @return {{
     *             pass: boolean,
     *             details: {pass: boolean, count: number, found: Ast, expected: Ast, args: Ast[]}[],
     *             exception: Error?
     *         }}
     */
  check (expr) {
    if (typeof expr === 'string') {
      try {
        expr = this.engine.parse(expr, this.vars);
      } catch (e) {
        return { pass: false, details: [], exception: e };
      }
    }
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
     * @param {{max: number?, note: string?, feedInput: boolean}} options
     * @param {string} expect
     * @param {string} terms
     */
  constructor (ski, vars, options, expect, ...terms) {
    vars = { ...vars }; // localize to *this* test case

    // vars{} will contain all free variables (i.e. term with unknown definitions) regardless of parsing order
    this.expect = ski.parse(expect, vars).run({ throw: true }).result;
    this.max = options.max;
    this.note = options.note;
    this.args = terms.map(s => ski.parse(s, vars));
    this.feedInput = options.feedInput;
  }

  /**
     *
     * @param {Ast} expr
     * @return {{args: Ast[], found: Ast, pass: boolean, expected: Ast, count: number}}
     */
  check (expr) {
    // TODO include feedInput steps in summary & fail if it hangs
    const expect = this.feedInput ? this.expect.run({ max: this.max, throw: true }, expr).result : this.expect;
    const found = expr.run({ max: this.max }, ...this.args);

    return {
      pass:     found.final && expect.equals(found.result),
      count:    found.steps,
      found:    found.result,
      expected: expect,
      args:     this.args,
    };
  }
}

module.exports = { Quest };
