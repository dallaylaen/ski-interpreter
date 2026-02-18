const { SKI } = require('./parser');
const { Expr, FreeVar, Alias, Lambda } = SKI.classes;

/**
 * @typedef {{
 *   pass: boolean,
 *   reason?: string,
 *   steps: number,
 *   start: Expr,
 *   found: Expr,
 *   expected: Expr,
 *   note?: string,
 *   args: Expr[],
 *   case: Case
 * }} CaseResult
 */

/**
 * @typedef {{
 *   linear?: boolean,
 *   affine?: boolean,
 *   normal?: boolean,
 *   proper?: boolean,
 *   discard?: boolean,
 *   duplicate?: boolean,
 *   arity?: number,
 * }} Capability
 */

/**
 * @typedef {
 *   [string, string]
 *   | [{max?: number}, string, string]
 *   | [{caps: Capability, max?: number}, string]
 * } TestCase
 */

/**
 * @typedef {string | {name: string, fancy?: string, allow?: string, numbers?: boolean, lambdas?: boolean}} InputSpec
 */

/**
 * @typedef {{
 *   pass: boolean,
 *   details: CaseResult[],
 *   expr?: Expr,
 *   input: Expr[]|string[],
 *   exception?: Error,
 *   steps: number,
 *   weight?: number
 * }} QuestResult
 */

/**
 * @typedef {{
 *    input: InputSpec | InputSpec[],
 *    cases: TestCase[],
 *
 *    // the rest is optional
 *
 *    allow?: string,
 *    numbers?: boolean,
 *    env?: string[],
 *    engine?: SKI,
 *    engineFull?: SKI,
 *
 *    // metadata, also any fields not listed here will go to quest.meta.???
 *    id?: string|number,
 *    name?: string,
 *    intro?: string|string[], // multiple strings will be concatenated with spaces
 * }} QuestSpec
 */

class Quest {
  /**
   * @description A combinator problem with a set of test cases for the proposed solution.
   * @param {QuestSpec} options
   * @example const quest = new Quest({
   *    input: 'identity',
   *    cases: [
   *      ['identity x', 'x'],
   *    ],
   *    allow: 'SK',
   *    intro: 'Find a combinator that behaves like the identity function.',
   * });
   * quest.check('S K K'); // { pass: true, details: [...], ... }
   * quest.check('K S');   // { pass: false, details: [...], ... }
   * quest.check('K x');   // fail! internal variable x is not equal to free variable x,
   *                       //     despite having the same name.
   * quest.check('I');     // fail! I not in the allowed list.
   */
  constructor (options) {
    const { input, cases, allow, numbers, lambdas, engine, engineFull, ...meta } = options;
    const env = options.env ?? options.vars; // backwards compatibility

    //
    this.engine = engine ?? new SKI();
    this.engineFull = engineFull ?? new SKI();
    this.restrict = { allow, numbers: numbers ?? false, lambdas: lambdas ?? false };
    this.env = {};

    const jar = {};

    // option.env is a list of expressions.
    // we suck all free variables + all term declarations from there into this.env
    // to feed it later to every case's parser.
    for (const term of env ?? []) {
      const expr = this.engineFull.parse(term, { env: jar, scope: this });
      if (expr instanceof SKI.classes.Alias)
        this.env[expr.name] = new Alias(expr.name, expr.impl, { terminal: true, canonize: false });
        // Canonized aliases won't expand with insufficient arguments,
        // causing correct solutions to fail, so alas...
      else if (expr instanceof SKI.classes.FreeVar)
        this.env[expr.name] = expr;
      else
        throw new Error('Unsupported given variable type: ' + term);
    }

    this.input = [];
    for (const term of Array.isArray(input) ? input : [input])
      this.addInput(term);
    if (!this.input.length)
      throw new Error('Quest needs at least one input placeholder');

    this.envFull = { ...this.env, ...jar };
    for (const term of this.input) {
      if (term.name in this.envFull)
        throw new Error('input placeholder name is duplicated or clashes with env: ' + term.name);
      this.envFull[term.name] = term.placeholder;
    }

    // NOTE meta is a local variable, can mutate
    // NOTE title/descr are old name/intro respectively, kept for backwards compatibility
    this.cases = [];
    this.name = meta.name ?? meta.title;
    meta.intro = list2str(meta.intro ?? meta.descr);
    this.intro = meta.intro;
    this.id = meta.id;
    this.meta = meta;

    for (const c of cases ?? [])
      this.add(...c);
  }

  /**
   *   Display allowed terms based on what engine thinks of this.env + this.restrict.allow
   *   @return {string}
   */
  allowed () {
    const allow = this.restrict.allow ?? '';
    const env  = Object.keys(this.env).sort();
    // In case vars are present and restrictions aren't, don't clutter the output with all the known terms
    return allow
      ? this.engine.showRestrict(allow + '+' + env.join(' '))
      : env.map( s => '+' + s).join(' ');
  }

  addInput (term) {
    if (typeof term !== 'object')
      term = { name: term };
    if (typeof term.name !== 'string')
      throw new Error("quest 'input' field must be a string or a {name: string, ...} object");

    term.placeholder = new SKI.classes.FreeVar(term.name);
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
    opt.env = opt.env ?? this.envFull;

    const input = this.input.map( t => t.placeholder );
    this.cases.push(
      opt.caps
        ? new PropertyCase(input, opt, terms)
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
    const jar = { ...this.env };
    for (let i = 0; i < input.length; i++) {
      const spec = this.input[i];
      const impl = this.engine.parse(input[i], {
        env:     jar,
        allow:   spec.allow ?? this.restrict.allow,
        numbers: spec.numbers ?? this.restrict.numbers,
        lambdas: spec.lambdas ?? this.restrict.lambdas,
      });
      const arsenal = { ...this.engine.getTerms(), ...jar };
      weight += impl.fold(0, (a, e) => {
        if (e instanceof SKI.classes.Named && arsenal[e.name] === e)
          return SKI.control.prune( a + 1);
      });
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
   * @return {QuestResult}
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
  /**
   * @param {FreeVar[]} input
   * @param {{
   *   max?: number,
   *   note?: string,
   *   env?: {[key:string]: Expr},
   *   engine: SKI
   * }} options
   */
  constructor (input, options) {
    this.max = options.max ?? 1000;
    this.note = options.note;
    this.env = { ...(options.env ?? {}) }; // note: env already contains input placeholders
    this.input = input;
    this.engine = options.engine;
  }

  parse (src) {
    return new Subst(this.engine.parse(src, { env: this.env, scope: this }), this.input);
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
   *    max?: number,
   *    note?: string,
   *    env?: {string: Expr},
   *    engine?: SKI
   * }} options
   * @param {[e1: string, e2: string]} terms
   */
  constructor (input, options, terms) {
    if (terms.length !== 2)
      throw new Error('Case accepts exactly 2 strings');

    super(input, options);

    [this.e1, this.e2] = terms.map( s => this.parse(s) );
  }

  check (...args) {
    const e1 = this.e1.apply(args);
    const r1 = e1.run({ max: this.max });
    const e2 = this.e2.apply(args);
    const r2 = e2.run({ max: this.max });

    let reason = null;
    if (!r1.final || !r2.final)
      reason = 'failed to reach normal form in ' + this.max + ' steps';
    else
      reason = r1.expr.diff(r2.expr);

    return {
      pass:     !reason,
      reason,
      steps:    r1.steps,
      start:    e1,
      found:    r1.expr,
      expected: r2.expr,
      note:     this.note,
      args,
      case:     this,
    };
  }
}

const knownCaps = {
  normal:    true,
  proper:    true,
  discard:   true,
  duplicate: true,
  linear:    true,
  affine:    true,
  arity:     true,
}

class PropertyCase extends Case {
  // test that an expression uses all of its inputs exactly once
  constructor (input, options, terms) {
    super(input, options);
    if (terms.length > 1)
      throw new Error('PropertyCase accepts exactly 1 string');
    if (!options.caps || typeof options.caps !== 'object' || !Object.keys(options.caps).length)
      throw new Error('PropertyCase requires a caps object with at least one capability');
    const unknown = Object.keys(options.caps).filter( c => !knownCaps[c] );
    if (unknown.length)
      throw new Error('PropertyCase: don\'t know how to test these capabilities: ' + unknown.join(', '));

    this.expr = this.parse(terms[0]);
    this.caps = options.caps;

    if (this.caps.linear) {
      delete this.caps.linear;
      this.caps.duplicate = false;
      this.caps.discard = false;
      this.caps.normal = true;
    }

    if (this.caps.affine) {
      delete this.caps.affine;
      this.caps.normal = true;
      this.caps.duplicate = false;
    }
  }

  check (...expr) {
    const start = this.expr.apply(expr);
    const r = start.run({ max: this.max });
    const guess = r.expr.infer({ max: this.max });

    const reason = [];
    for (const cap in this.caps) {
      if (guess[cap] !== this.caps[cap])
        reason.push('expected property ' + cap + ' to be ' + this.caps[cap] + ', found ' + guess[cap]);
    }

    return {
      pass:   !reason.length,
      reason: reason ? reason.join('\n') : null,
      steps:  r.steps,
      start,
      found:  r.expr,
      case:   this,
      note:   this.note,
      args:   expr,
    };
  }
}

class Subst {
  /**
   * @descr A placeholder object with exactly n free variables to be substituted later.
   * @param {Expr} expr
   * @param {FreeVar[]} env
   */
  constructor (expr, env) {
    this.expr = expr;
    this.env = env;
  }

  apply (list) {
    if (list.length !== this.env.length)
      throw new Error('Subst: expected ' + this.env.length + ' terms, got ' + list.length);

    let expr = this.expr;
    for (let i = 0; i < this.env.length; i++)
      expr = expr.subst(this.env[i], list[i]) ?? expr;

    return expr;
  }
}

/**
 * @desc Concatenate long strings represented as arrays, or just pass along if already string or undefined.
 * @param {string|Array<string>|undefined} str
 * @returns {string|undefined}
 */
function list2str (str) {
  if (str === undefined || typeof str === 'string')
    return str;
  return Array.isArray(str) ? str.join(' ') : '' + str;
}

module.exports = { Quest };
