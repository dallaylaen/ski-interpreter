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
        this.vars[expr.name] = new Alias(expr.name, expr.impl, { canonize: false });
        // TODO canonize but it currently breaks tests
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
   *   @return {string}
   */
  allowed () {
    // TODO also display given vars & lambda/numbers flags
    const allow = this.restrict.allow ?? '';
    return allow ? this.engine.showRestrict(allow) : '';
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

    this.max = options.max ?? 1000;
    this.note = options.note;

    vars = { ...vars }; // shallow copy to avoid modifying the original

    [this.e1, this.e2] = terms.map(src => new Lambda(input, engine.parse(src, vars)));
  }

  /**
   * @param {Expr} expr
   * @return {{
   *   pass: boolean,
   *   reason: string?,
   *   steps: number,
   *   start: Expr,
   *   found: Expr,
   *   expected: Expr,
   *   note: string?,
   *   args: Expr[],
   *   case: Case
   * }}
   */
  check (...expr) {
    // we do it the fancy way and instead of just "apply" to avoid
    // displaying (foo->foo this that)(user input) as 1st step
    const subst = (outer, inner) => outer.reduce(inner) ?? outer.apply(...inner);

    const start = subst(this.e1, expr);
    const r1 = start.run({ max: this.max });
    const r2 = subst(this.e2, expr).expand().run({ max: this.max });
    let reason = null;
    if (!r1.final || !r2.final)
      reason = 'failed to reach normal form in ' + this.max + ' steps';
    else if (!r1.expr.equals(r2.expr))
      reason = 'expected: ' + r2.expr;

    return {
      pass:     !reason,
      reason,
      steps:    r1.steps,
      start,
      found:    r1.expr,
      expected: r2.expr,
      note:     this.note,
      args:     expr,
      case:     this,
    };
  }
}

function list2str (str) {
  if (str === undefined)
    return str;
  return Array.isArray(str) ? str.join(' ') : '' + str;
}

module.exports = { Quest };
