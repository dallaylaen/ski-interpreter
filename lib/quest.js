const { SKI } = require('./parser');
const { Expr, FreeVar, Alias, Lambda } = SKI.classes;

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
    const { input, vars, cases, allow, numbers, lambdas, subst, engine, engineFull, ...meta } = options;

    //
    this.engine = engine ?? new SKI();
    this.engineFull = engineFull ?? new SKI();
    this.restrict = { allow, numbers: numbers ?? false, lambdas: lambdas ?? false };
    this.vars = {};
    this.subst = Array.isArray(subst) ? subst : [subst ?? 'phi'];

    // options.vars is a list of expressions.
    // we suck all free variables + all term declarations from there into this.vars
    // to feed it later to every case's parser.
    for (const term of vars ?? []) {
      const expr = this.engineFull.parse(term, this.vars);
      if (expr instanceof SKI.classes.Alias)
        this.vars[expr.name] = expr.impl;
    }

    // check user solution placeholders
    this.input = SKI.free(...Array.isArray(input) ? input : [input]);
    if (input.length === 0)
      throw new Error('input parameter must be string or string[]');

    this.varsFull = { ...this.vars };
    for (const term of this.input) {
      if (term.name in this.varsFull)
        throw new Error('input placeholder name is duplicated or clashes with vars: ' + term.name);
      this.varsFull[term.name] = term;
    }

    this.cases = [];
    this.title = meta.title;
    meta.descr = list2str(meta.descr);
    this.descr = meta.descr;
    this.meta = meta;

    for (const c of cases ?? [])
      this.add(...c);
  }

  /**
   *   Display allowed terms based on what engine thinks of this.vars + this.restrict.allow
   *   @return {string | undefined}
   */
  allowed () {
    const vars = Object.keys(this.vars);
    const allow = this.restrict.allow;
    if (!allow && !vars.length)
      return undefined;
    return this.engine.showRestrict(allow + '+' + vars.join(' '));
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

    this.cases.push(new Case(this.input, terms, opt, this.varsFull, this.engineFull));
    return this;
  }

  /**
   *
   * @param {Expr|string} input
   * @return {{
   *             expr: Expr?,
   *             pass: boolean,
   *             details: {pass: boolean, steps: number, found: Expr, expected: Expr, start: Expr?, args: Expr[]?}[],
   *             exception: Error?,
   *             steps: number,
   *             input: Expr[]
   *         }}
   */
  check (...input) {
    try {
      if (input.length !== this.input.length)
        throw new Error('Solutions provided ' + input.length + ' terms where ' + this.input.length + ' are expected');

      const prepared = input
        .map(expr => (typeof expr === 'string') ? this.engine.parse(expr, this.vars, this.restrict) : expr)
        .map((expr, i) => new Alias(this.subst[i] ?? this.input[i], expr));

      const details = this.cases.map( c => c.check(...prepared) );
      const pass = details.reduce((acc, val) => acc && val.pass, true);
      const steps = details.reduce((acc, val) => acc + val.steps, 0);
      return {
        expr:  prepared[0],
        input: prepared,
        pass,
        steps,
        details,
      };
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
   * @param {FreeVar[]} input
   * @param {[e1: string, e2: string]} terms
   * @param {{max: number?, note: string?}} options
   * @param {{[key: string]: Expr}} vars
   * @param {SKI} engine
   */
  constructor (input, terms, options = {}, vars = {}, engine = new SKI()) {
    if (terms.length !== 2)
      throw new Error('Case accepts exactly 2 strings');

    const [e1, e2] = terms;

    this.max = options.max ?? 1000;
    this.note = options.note;

    vars = { ...vars }; // shallow copy of self
    const prepare = src =>
      new Lambda(input, engine.parse(src, vars));

    this.e1 = prepare(e1);
    this.e2 = prepare(e2);
  }

  check (...expr) {
    const subst = (outer, inner) => outer.reduce(inner) ?? outer.apply(...inner);

    const e1 = subst(this.e1, expr);
    const r1 = e1.expand().run({ max: this.max });
    const r2 = subst(this.e2, expr).expand().run({ max: this.max });

    return {
      pass:     r1.final && r2.final && r1.expr.equals(r2.expr),
      steps:    r1.steps + r2.steps,
      start:    e1,
      found:    r1.expr,
      expected: r2.expr,
      note:     this.note,
      args:     expr,
      case:     this,
    }
  }
}

function list2str (str) {
  if (str === undefined)
    return str;
  return Array.isArray(str) ? str.join(' ') : '' + str;
}

module.exports = { Quest };
