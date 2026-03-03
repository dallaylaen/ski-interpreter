import { Parser } from './parser';
import { Expr, FreeVar, Alias, Named, control } from './expr';

export type CaseResult = {
  pass: boolean,
  reason?: string,
  steps: number,
  start: Expr,
  found: Expr,
  expected?: Expr,
  note?: string,
  args: Expr[],
  // eslint-disable-next-line no-use-before-define
  case: Case
};

export type Capability = {
  linear?: boolean,
  affine?: boolean,
  normal?: boolean,
  proper?: boolean,
  discard?: boolean,
  duplicate?: boolean,
  arity?: number,
};

export type TestCase =
  [string, string]
  | [{max?: number}, string, string]
  | [{caps: Capability, max?: number}, string];

export type InputSpec = {
  name: string,
  fancy?: string,
  allow?: string,
  numbers?: boolean,
  lambdas?: boolean
};

export type QuestResult = {
  pass: boolean,
  details: CaseResult[],
  expr?: Expr,
  input: Expr[]|string[],
  exception?: Error,
  steps: number,
  weight?: number
};

// metadata not typechecked as long as it's an object
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type QuestMeta = { [key: string]: any };

export type QuestSpec = {
  input: string | InputSpec | (string | InputSpec)[],
  cases: TestCase[],

  // the rest is optional

  allow?: string,
  numbers?: boolean,
  lambdas?: boolean,
  env?: string[],
  engine?: Parser,
  engineFull?: Parser,

  // metadata, also any fields not listed here will go to quest.meta.???
  id?: string | number,
  name?: string,
  intro?: string | string[], // multiple strings will be concatenated with spaces
} & QuestMeta;

export type SelfCheck = { accepted?: string[][], rejected?: string[][] };

type AddCaseOptions = {
  engine?: Parser,
  env?: { [key: string]: Expr },
  max?: number,
  note?: string,
  caps?: Capability,
};

export class Quest {
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
  input: (InputSpec & {placeholder: FreeVar})[];
  // eslint-disable-next-line no-use-before-define
  cases: Case[];

  engineFull: Parser;
  engine: Parser;
  restrict: { allow?: string, numbers?: boolean, lambdas?: boolean };
  env: { [key: string]: Expr };
  envFull: { [key: string]: Expr };
  id?: string | number;
  name?: string
  intro?: string;
  // yes allow any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  meta?: QuestMeta;

  constructor (options: QuestSpec) {
    const { input, cases, allow, numbers, lambdas, engine, engineFull, ...meta } = options;
    const env = options.env ?? []; // backwards compatibility

    //
    this.engineFull = engineFull ?? new Parser();
    this.engine = engine ?? this.engineFull;
    this.restrict = { allow, numbers: numbers ?? false, lambdas: lambdas ?? false };
    this.env = {};

    const jar = {};

    // option.env is a list of expressions.
    // we suck all free variables + all term declarations from there into this.env
    // to feed it later to every case's parser.
    for (const term of env ?? []) {
      const expr: Expr = this.engineFull.parse(term, { env: jar, scope: this });
      if (expr instanceof Alias)
        this.env[expr.name] = new Alias(expr.name, expr.impl, { terminal: true, canonize: false });
        // Canonized aliases won't expand with insufficient arguments,
        // causing correct solutions to fail, so alas...
      else if (expr instanceof FreeVar)
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
      (this.add as (...args: unknown[]) => void)(...c);
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

  addInput (term: string | InputSpec): void {
    if (typeof term !== 'object')
      term = { name: term };
    if (typeof term.name !== 'string')
      throw new Error("quest 'input' field must be a string or a {name: string, ...} object");

    const full = term as InputSpec & { placeholder: FreeVar };
    full.placeholder = new FreeVar(term.name);
    // TODO more checks
    this.input.push(full);
  }

  /**
   *
   * @param {{} | string} opt
   * @param {string} terms
   * @return {Quest}
   */
  add (opt: AddCaseOptions | string, ...terms: string[]) {
    let o: AddCaseOptions;
    if (typeof opt === 'string') {
      terms.unshift(opt);
      o = {};
    } else
      o = { ...opt };

    o.engine = o.engine  ?? this.engineFull;
    o.env = o.env ?? this.envFull;

    const input = this.input.map( t => t.placeholder );
    this.cases.push(
      o.caps
        ? new PropertyCase(input, o, terms)
        : new ExprCase(input, o, terms)
    );
    return this;
  }

  /**
   * @description Statefully parse a list of strings into expressions or fancy aliases thereof.
   * @param {string[]} input
   * @return {{terms: Expr[], weight: number}}
   */
  prepare (...input: string[]) {
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
        if (e instanceof Named && arsenal[e.name] === e)
          return control.prune( a + 1);
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
  check (...input: string[]): QuestResult {
    try {
      const { prepared, weight } = this.prepare(...input);
      const details = this.cases.map( c => c.check(...prepared) ) as unknown as CaseResult[];
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
      return { pass: false, details: [], exception: e as Error, steps: 0, input };
    }
  }

  verify (options: { solutions?: SelfCheck | { [key: string | number]: SelfCheck }, seen?: Set<string | number>, date?: boolean }) {
    const findings: { [key: string]: unknown } = this.verifyMeta(options);
    if (options.solutions) {
      const solCheck = this.verifySolutions(options.solutions);
      if (solCheck)
        findings.solutions = solCheck;
    }
    if (options.seen) {
      if (!this.id)
        findings.seen = 'No id in quest ' + (this.name ?? '(unnamed)');
      if (options.seen.has(this.id!))
        findings.seen = 'Duplicate quest id ' + this.id;
      options.seen.add(this.id!); // mutating but who cares
    }
    return Object.keys(findings).length ? findings : null;
  }

  /**
   * @desc Verify that solutions that are expected to pass/fail do so.
   * @param {SelfCheck|{[key: string]: SelfCheck}} dataset
   * @return {{shouldPass: {input: string[], result: QuestResult}[], shouldFail: {input: string[], result: QuestResult}[]} | null}
   */
  verifySolutions (dataset: SelfCheck | { [key: string | number]: SelfCheck }) {
    // dataset is either a SelfCheck object or a hash of { quest_id: SelfCheck }
    if (typeof dataset === 'object' && !Array.isArray((dataset as SelfCheck).accepted) && !Array.isArray((dataset as SelfCheck).rejected)) {
      // dataset is a hash of { quest_id: SelfCheck } so extract data
      if (!this.id || !(dataset as { [key: string | number]: SelfCheck })[this.id])
        return null; // no self-check data for this quest, skip
    }

    const byId = this.id !== undefined ? (dataset as { [key: string | number]: SelfCheck })[this.id] : undefined;
    const { accepted = [], rejected = [] } = byId ?? (dataset as SelfCheck);

    type SolEntry = { input: string[], result: QuestResult };
    const ret: { shouldPass: SolEntry[], shouldFail: SolEntry[] } = { shouldPass: [], shouldFail: [] };
    for (const input of accepted) {
      const result = this.check(...input);
      if (!result.pass)
        ret.shouldPass.push({ input, result });
    }
    for (const input of rejected) {
      const result = this.check(...input);
      if (result.pass)
        ret.shouldFail.push({ input, result });
    }
    return (ret.shouldFail.length + ret.shouldPass.length) ? ret : null; // return null if all good
  }

  verifyMeta (options: { date?: boolean } = {}): { [key: string]: unknown } {
    const findings: { [key: string]: unknown } = {};

    for (const field of ['name', 'intro']) {
      const found = checkHtml((this as unknown as { [key: string]: string })[field]);
      if (found)
        findings[field] = found;
    }
    if (options.date) {
      const date = new Date(this.meta?.created_at);
      if (isNaN(date.getTime()))
        findings.date = 'invalid date format: ' + this.meta?.created_at;
      else if (date.getTime() < new Date('2024-07-15').getTime() || date.getTime() > new Date().getTime())
        findings.date = 'date out of range: ' + this.meta?.created_at;
    }

    return findings;
  }

  /**
     *
     * @return {TestCase[]}
     */
  show ():Case[] {
    return [...this.cases];
  }

  // eslint-disable-next-line no-use-before-define
  static Group: new (options: { name?: string, intro?: string | string[], id?: string | number, content?: (Quest | QuestSpec)[] }) => { verify: (options: { seen?: Set<string | number>, date?: boolean }) => { [key: string]: unknown } };
  // eslint-disable-next-line no-use-before-define
  static Case: new (input: FreeVar[], options: AddCaseOptions) => Case;
}

class Case {
  /**
   * @param {FreeVar[]} input
   * @param {{
   *   max?: number,
   *   note?: string,
   *   env?: {[key:string]: Expr},
   *   engine: Parser
   * }} options
   */
  max: number;
  note: string;
  env: { [key: string]: Expr };
  input: FreeVar[];
  engine: Parser;
  constructor (input: FreeVar[], options: AddCaseOptions) {
    this.max = options.max ?? 1000;
    this.note = options.note!;
    this.env = { ...(options.env ?? {}) }; // note: env already contains input placeholders
    this.input = input;
    this.engine = options.engine!;
  }

  parse (src: string) {
    return new Subst(this.engine.parse(src, { env: this.env, scope: this  }), this.input);
  }

  /**
   * @param {Expr} expr
   * @return {CaseResult}
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  check ( ..._expr: Expr[] ): CaseResult {
    throw new Error('not implemented');
  }
}

class ExprCase extends Case {
  // eslint-disable-next-line no-use-before-define
  e1: Subst;
  // eslint-disable-next-line no-use-before-define
  e2: Subst;
  /**
   * @param {FreeVar[]} input
   * @param {{
   *    max?: number,
   *    note?: string,
   *    env?: {string: Expr},
   *    engine?: Parser
   * }} options
   * @param {[e1: string, e2: string]} terms
   */
  constructor (input: FreeVar[], options: AddCaseOptions, terms: string[]) {
    if (terms.length !== 2)
      throw new Error('Case accepts exactly 2 strings');

    super(input, options);

    [this.e1, this.e2] = terms.map( (s: string) => this.parse(s) );
  }

  check (...args: Expr[]): CaseResult {
    const e1 = this.e1.apply(args);
    const r1 = e1.run({ max: this.max });
    const e2 = this.e2.apply(args);
    const r2 = e2.run({ max: this.max });

    let reason: string | null = null;
    if (!r1.final || !r2.final)
      reason = 'failed to reach normal form in ' + this.max + ' steps';
    else
      reason = r1.expr.diff(r2.expr);

    return {
      pass:     !reason,
      reason:   reason ?? undefined,
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

const knownCaps: { [key: string]: boolean } = {
  normal:    true,
  proper:    true,
  discard:   true,
  duplicate: true,
  linear:    true,
  affine:    true,
  arity:     true,
}

class PropertyCase extends Case {
  // eslint-disable-next-line no-use-before-define
  expr: Subst;
  caps: Capability;
  // test that an expression uses all of its inputs exactly once
  constructor (input: FreeVar[], options: AddCaseOptions, terms: string[]) {
    super(input, options);
    if (terms.length > 1)
      throw new Error('PropertyCase accepts exactly 1 string');
    if (!options.caps || typeof options.caps !== 'object' || !Object.keys(options.caps).length)
      throw new Error('PropertyCase requires a caps object with at least one capability');
    const unknown = Object.keys(options.caps).filter( c => !knownCaps[c] );
    if (unknown.length)
      throw new Error('PropertyCase: don\'t know how to test these capabilities: ' + unknown.join(', '));

    this.expr = this.parse(terms[0]);
    this.caps = { ...options.caps };

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

  check (...expr: Expr[]): CaseResult {
    const start = this.expr.apply(expr);
    const r = start.run({ max: this.max });
    const guess = r.expr.infer({ max: this.max });

    const reason: string[] = [];
    for (const cap in this.caps) {
      if ((guess as unknown as { [key: string]: unknown })[cap] !== (this.caps as unknown as { [key: string]: unknown })[cap])
        reason.push('expected property ' + cap + ' to be ' + (this.caps as unknown as { [key: string]: unknown })[cap] + ', found ' + (guess as unknown as { [key: string]: unknown })[cap]);
    }

    return {
      pass:   !reason.length,
      reason: reason.length ? reason.join('\n') : undefined,
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
  expr: Expr;
  // TODO rename env => args wtf?
  env: FreeVar[];
  constructor (expr: Expr, env: FreeVar[]) {
    this.expr = expr;
    this.env = env;
  }

  apply (list:Expr[]):Expr {
    if (list.length !== this.env.length)
      throw new Error('Subst: expected ' + this.env.length + ' terms, got ' + list.length);

    let expr = this.expr;
    for (let i = 0; i < this.env.length; i++)
      expr = expr.subst(this.env[i], list[i]) ?? expr;

    return expr;
  }
}

// corresponds to "chapter" in the quest page
class Group {
  name?: string;
  intro?: string;
  id?: string|number;
  content?: Quest[];

  constructor (options: { name?: string, intro?: string | string[], id?: string | number, content?: (Quest | QuestSpec)[] }) {
    this.name = options.name;
    this.intro = list2str(options.intro);
    this.id = options.id;

    // TODO don't die on failed quests
    if (options.content)
      this.content = options.content.map( c => c instanceof Quest ? c : new Quest(c) );
  }

  verify (options: { seen?: Set<string | number>, date?: boolean }): { [key: string]: unknown } {
    const findings: { [key: string]: unknown } = {};
    const id = checkId(this.id!, options.seen!);
    if (id)
      findings.id = id;
    for (const field of ['name', 'intro']) {
      const found = checkHtml((this as unknown as { [key: string]: string })[field]);
      if (found)
        findings[field] = found;
    }

    findings.content = this.content!.map(q => q.verify(options));
    return findings;
  }
}

/**
 * @desc Concatenate long strings represented as arrays, or just pass along if already string or undefined.
 * @param {string|Array<string>|undefined} str
 * @returns {string|undefined}
 */
function list2str (str: string|string[]|undefined):string|undefined {
  if (str === undefined || typeof str === 'string')
    return str;
  return Array.isArray(str) ? str.join(' ') : '' + str;
}

function checkId (id:string|number, seen:Set<string|number>) {
  if (id === undefined)
    return 'missing';
  if (typeof id !== 'string' && typeof id !== 'number' )
    return 'is a ' + typeof id;
  if (seen) {
    if (seen.has(id))
      return 'duplicate id ' + id;
    seen.add(id);
  }
  // return nothing = success
}

function checkHtml (str: string): string | null {
  if (str === undefined)
    return 'missing';
  if (typeof str !== 'string')
    return 'not a string but ' + typeof str;

  // very basic check for unclosed tags, just to catch common mistakes in the quest text
  const tagStack = [];
  const tagRegex = /<\/?([a-z]+)(?:\s[^>]*)?>/gi;
  let match;
  while ((match = tagRegex.exec(str)) !== null) {
    const [fullTag, tagName] = match;
    if (fullTag.startsWith('</')) {
      // Closing tag
      if (tagStack.length === 0 || tagStack.pop() !== tagName)
        return (`Unmatched closing tag: </${tagName}>`);
    } else {
      // Opening tag
      tagStack.push(tagName);
    }
  }
  if (tagStack.length > 0)
    return (`Unclosed tags: ${tagStack.join(', ')}`);

  return null; // No issues found
}

Quest.Group = Group;
Quest.Case = Case;
