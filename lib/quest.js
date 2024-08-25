const { SKI } = require('./ski');
const { /* Expr, */ /* FreeVar, */ Alias, Lambda } = SKI.classes;

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
   *    engine: SKI?,
   *    engineFull: SKI?,
   *    cases: [{max: number?, note: string?, feedInput: boolean, lambdas: boolean?}|string[], ...string[][]]?
   * }} options
   */
  constructor (options = {}) {
    const { title, descr, allow, numbers, vars, cases, lambdas, subst, engine, engineFull, ...meta } = options;

    //
    this.engine = engine ?? new SKI();
    this.engineFull = engineFull ?? new SKI();
    this.restrict = { allow, numbers: numbers ?? false, lambdas: lambdas ?? false };
    this.vars = {};
    this.subst = subst ?? 'f';

    // options.vars is a list of expressions.
    // we suck all free variables + all term declarations from there into this.vars
    // to feed it later to every case's parser.
    if (vars) {
      for (const term of vars) {
        const expr = this.engineFull.parse(term, this.vars);
        if (expr instanceof SKI.classes.Alias)
          this.vars[expr.name] = expr.impl;
      }
    }

    this.cases = [];
    this.title = title;
    this.descr = Array.isArray(descr) ? descr.join(' ') : descr;
    this.meta = meta;

    for (const c of cases ?? [])
      this.add(...c);
  }

  /**
   *
   * @param {{} | string} opt
   * @param {string} terms
   * @return {Quest}
   */
  add (opt, ...terms) {
    if (typeof opt === 'string') {
      terms.unshift(opt);
      opt = {};
    }

    this.cases.push(new Case(terms, opt, this.vars, this.engineFull));
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

class Case {
  /**
   *
   * @param {[input: string, e1: string, e2: string]}terms
   * @param {{max: number?, note: string?}} options
   * @param {{[key: string]: Expr}} vars
   * @param {SKI} engine
   */
  constructor (terms, options = {}, vars = {}, engine = new SKI()) {
    if (terms.length !== 2)
      throw new Error('Case accepts exactly 2 strings');

    const [e1, e2] = terms;

    this.max = options.max ?? 1000;
    this.note = options.note;

    vars = { ...vars }; // shallow copy of self
    const prepare = src =>
      engine.parse(src, vars).run({ max: this.max, throw: true }).result;

    this.e1 = prepare(e1);
    this.e2 = prepare(e2);
  }

  check (expr) {
    const e1 = this.e1 instanceof Lambda
      ? this.e1.reduce([expr])
      : this.e1.apply(expr);
    const r1 = e1.run({ max: this.max });
    const r2 = this.e2.expand().run({ max: this.max }, expr);

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
