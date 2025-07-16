const { SKI } = require('./parser');
const { Expr, FreeVar, Alias, Lambda } = SKI.classes;

/**
 * @typedef {{
 *   pass: boolean,
 *   reason: string?,
 *   steps: number,
 *   start: Expr,
 *   found: Expr,
 *   expected: Expr,
 *   note: string?,
 *   args: Expr[],
 *   case: Case
 * }} CaseResult
 */

class Quest {
  /**
   * @description A combinator problem with a set of test cases for the proposed solution.
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
        this.vars[expr.name] = new Alias(expr.name, expr.impl, { terminal: true, canonize: false });
        // Canonized aliases won't expand with insufficient arguments,
        // causing correct solutions to fail, so alas...
    }

    this.input = [];
    for (const term of Array.isArray(input) ? input : [input])
      this.addInput(term);
    if (!this.input.length)
      throw new Error('Quest needs at least one input placeholder');
    if (subst)
      this.input[0].fancy = this.subst[0];

    this.varsFull = { ...this.vars };
    for (const term of this.input) {
      if (term.name in this.varsFull)
        throw new Error('input placeholder name is duplicated or clashes with vars: ' + term.name);
      this.varsFull[term.name] = term.placeholder;
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
    const allow = this.restrict.allow ?? '';
    const vars = Object.keys(this.vars).sort();
    // In case vars are present and restrictions aren't, don't clutter the output with all the known terms
    return allow
      ? this.engine.showRestrict(allow + '+' + vars.join(' '))
      : vars.map( s => '+' + s).join(' ');
  }

  addInput (term) {
    if (typeof term !== 'object')
      term = { name: term };
    if (typeof term.name !== 'string')
      throw new Error("quest 'input' field must be a string or a {name: string, ...} object");

    [term.placeholder] = SKI.free(term.name);
    // TODO more checks
    this.input.push(term);
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
    } else
      opt = { ...opt };

    opt.engine = opt.engine  ?? this.engineFull;
    opt.vars = opt.vars ?? this.varsFull;

    const input = this.input.map( t => t.placeholder );
    this.cases.push(
      opt.linear
        ? new LinearCase(input, opt, terms)
        : new ExprCase(input, opt, terms)
    );
    return this;
  }

  /**
   * @description Statefully parse a list of strings into expressions or fancy aliases thereof.
   * @param {string[]} input
   * @return {{terms: Expr[], weight: number}}
   */
  prepare (...input) {
    if (input.length !== this.input.length)
      throw new Error('Solutions provided ' + input.length + ' terms where ' + this.input.length + ' are expected');

    let weight = 0;
    const prepared = [];
    const jar = { ...this.vars };
    for (let i = 0; i < input.length; i++) {
      const spec = this.input[i];
      const impl = this.engine.parse(input[i], jar, {
        allow:   spec.allow ?? this.restrict.allow,
        numbers: spec.numbers ?? this.restrict.numbers,
        lambdas: spec.lambdas ?? this.restrict.lambdas,
      });
      weight += impl.weight();
      const expr = impl instanceof FreeVar
        ? impl
        : new Alias(spec.fancy ?? spec.name, impl, { terminal: true, canonize: false });
      jar[spec.name] = expr;
      prepared.push(expr);
    }
    return {
      prepared,
      weight,
    };
  }

  /**
   *
   * @param {string} input
   * @return {{
   *             expr: Expr?,
   *             pass: boolean,
   *             details: CaseResult[],
   *             exception: Error?,
   *             steps: number,
   *             input: Expr[]|string[],
   *             weight: number?
   *         }}
   */
  check (...input) {
    try {
      const { prepared, weight } = this.prepare(...input);
      const details = this.cases.map( c => c.check(...prepared) );
      const pass = details.reduce((acc, val) => acc && val.pass, true);
      const steps = details.reduce((acc, val) => acc + val.steps, 0);
      return {
        expr:  prepared[0],
        input: prepared,
        pass,
        steps,
        details,
        weight,
      };
    } catch (e) {
      return { pass: false, details: [], exception: e, steps: 0, input };
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
  constructor (input, options) {
    this.max = options.max ?? 1000;
    this.note = options.note;
    this.vars = { ...(options.vars ?? {}) }; // shallow copy to avoid modifying the original
    this.input = input;
    this.engine = options.engine;
  }

  parse (src) {
    return new Lambda(this.input, this.engine.parse(src, this.vars));
  }

  /**
   * @param {Expr} expr
   * @return {CaseResult}
   */
  check ( ...expr ) {
    throw new Error('not implemented');
  }
}

class ExprCase extends Case {
  /**
   * @param {FreeVar[]} input
   * @param {{
   *    max: number?,
   *    note: string?,
   *    vars: {string: Expr}?,
   *    engine: SKI?
   * }} options
   * @param {[e1: string, e2: string]} terms
   */
  constructor (input, options, terms) {
    if (terms.length !== 2)
      throw new Error('Case accepts exactly 2 strings');

    super(input, options);

    [this.e1, this.e2] = terms.map(src => this.parse(src));
  }

  check (...expr) {
    // we do it the fancy way and instead of just "apply" to avoid
    // displaying (foo->foo this that)(user input) as 1st step
    const subst = (outer, inner) => outer.reduce(inner) ?? outer.apply(...inner);

    const start = subst(this.e1, expr);
    const r1 = start.run({ max: this.max });
    const r2 = subst(this.e2, expr).run({ max: this.max });
    let reason = null;
    if (!r1.final || !r2.final)
      reason = 'failed to reach normal form in ' + this.max + ' steps';
    else if (!r1.expr.equals(r2.expr))
      reason = 'expected: ' + r2.expr;
    // NOTE maybe there should be expand() on both sides of equal() but we'll see.

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

class LinearCase extends Case {
  // test that an expression uses all of its inputs exactly once
  constructor (input, options, terms) {
    super(input, options);
    this.expr = this.parse(terms[0]);
  }

  check (...expr) {
    const start = this.expr.apply(...expr);
    const r = start.run({ max: this.max });
    const arity = r.expr.canonize();
    const reason = arity.linear
      ? null
      : 'expected a linear expression, i.e. such that uses all inputs exactly once';
    return {
      pass:  !reason,
      reason,
      steps: r.steps,
      start,
      found: r.expr,
      case:  this,
      note:  this.note,
      args:  expr,
    }
  }
}

function list2str (str) {
  if (str === undefined)
    return str;
  return Array.isArray(str) ? str.join(' ') : '' + str;
}

module.exports = { Quest };
