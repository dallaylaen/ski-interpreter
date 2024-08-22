const { SKI } = require('./ski');
const { /* Expr, */ FreeVar, Alias } = SKI.classes;

class Quest {
  /**
   *
   * @param {{
   *    title: string?,
   *    descr: string?,
   *    subst: string?,
   *    allow: string?,
   *    numbers: boolean?,
   *    vars: string[]?,
   *    cases: [{max: number?, note: string?, feedInput: boolean, lambdas: boolean?}|string[], ...string[][]]?
   * }} options
   */
  constructor (options = {}, engine = new SKI()) {
    const { title, descr, allow, numbers, vars, cases, lambdas, subst, ...meta } = options;

    this.engine = engine;
    this.restrict = { allow: allow ?? 'SKI', numbers: numbers ?? false, lambdas: lambdas ?? false };
    this.vars = {};
    this.subst = subst;

    // options.vars is a list of expressions.
    // we suck all free variables + all term declarations from there into this.vars
    // to feed it later to every case's parser.
    if (vars) {
      for (const term of vars) {
        const expr = this.engine.parse(term, this.vars);
        if (expr instanceof SKI.classes.Alias)
          this.vars[expr.name] = expr.impl;
      }
    }

    this.cases = [];
    this.title = title;
    this.descr = Array.isArray(descr) ? descr.join(' ') : descr;
    this.meta = meta;

    for (const c of cases ?? [])
      this.subst ? this.add2(...c) : this.add(...c);
  }

  /**
   *
   * @param {{} | string} opt
   * @param {string} terms
   * @return {Quest}
   */
  add2 (opt, ...terms) {
    if (typeof opt === 'string') {
      terms.unshift(opt);
      opt = {};
    }

    this.cases.push(new Case(terms, opt, this.vars, this.engine));
    return this;
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
   * @param {Expr|string} input
   * @return {{
   *             expr: Expr?,
   *             pass: boolean,
   *             details: {pass: boolean, count: number, found: Expr, expected: Expr, start: Expr?, args: Expr[]?}[],
   *             exception: Error?
   *         }}
   */
  check (input) {
    try {
      let expr = (typeof input === 'string') ? this.engine.parse(input, this.vars, this.restrict) : input;
      if (this.subst)
        expr = new Alias(this.subst, expr);
      const details = this.cases.map( c => c.check(expr) );
      const pass = details.reduce((acc, val) => acc && val.pass, true);
      return { expr, pass, details };
    } catch (e) {
      return { pass: false, details: [], exception: e };
    }
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
     * @param {Expr} expr
     * @return {{args: Expr[], found: Expr, pass: boolean, expected: Expr, count: number}}
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

class Case {
  /**
   *
   * @param {[input: string, e1: string, e2: string]}terms
   * @param {{max: number?, note: string?}} options
   * @param {{[key: string]: Expr}} vars
   * @param {SKI} engine
   */
  constructor (terms, options = {}, vars = {}, engine = new SKI()) {
    if (terms.length !== 3)
      throw new Error('Exactly 3 string arguments requires for subst-based case');
    const [name, e1, e2] = terms;

    this.max = options.max ?? 1000;
    this.note = options.note;
    this.input = new FreeVar(name + '[my]');

    vars = { ...vars }; // shallow copy of self
    vars[name] = this.input;

    const prepare = src =>
      engine.parse(src, vars).run({ max: this.max, throw: true }).result;

    this.e1 = prepare(e1);
    this.e2 = prepare(e2);
  }

  check (expr) {
    const e1 = this.e1.subst([[this.input, expr]]) ?? this.e1;
    const r1 = e1.expand().run({ max: this.max });
    const e2 = this.e2.subst([[this.input, expr]]) ?? this.e2;
    const r2 = e2.expand().run({ max: this.max });

    return {
      pass:     r1.final && r2.final && r1.result.equals(r2.result),
      count:    r1.steps + r2.steps,
      start:    e1,
      found:    r1.result,
      expected: r2.result,
      note:     this.note,
      args:     [],
    }
  }
}

module.exports = { Quest };
