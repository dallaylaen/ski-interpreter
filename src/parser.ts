/**
 * Combinatory logic simulator
 */
'use strict';

import { Tokenizer, restrict } from './internal';
import { Expr, FreeVar, Lambda, Church, Alias, Native, Named, native, Invocation, RefinedFormatOptions, toposort } from './expr';

class Empty extends Expr {
  apply (...args: Expr[]):Expr {
    return args.length > 0 ? args.shift()!.apply(...args) : this;
  }

  postParse (): Expr {
    throw new Error('Attempt to use empty expression () as a term');
  }

  formatImpl (options: RefinedFormatOptions, nargs: number): string {
    return '()';
  }
}

class PartialLambda extends Empty {
  impl: Expr;
  terms: FreeVar[];
  // TODO mutable! rewrite ro when have time
  constructor (term: Expr, _known = {}) {
    super();
    this.impl = new Empty();
    if (term instanceof FreeVar)
      this.terms = [term];
    else if (term instanceof PartialLambda) {
      if (!(term.impl instanceof FreeVar))
        throw new Error('Expected FreeVar->...->FreeVar->Expr');
      this.terms = [...term.terms, term.impl];
    } else
      throw new Error('Expected FreeVar or PartialLambda');
  }

  apply (term: Expr, ...tail:Expr[]) {
    if (term === null || tail.length !== 0 )
      throw new Error('bad syntax in partial lambda expr');
    this.impl = this.impl.apply(term);
    return this;
  }

  postParse (): Expr {
    let expr = this.impl;
    for (let i = this.terms.length; i-- > 0; )
      expr = new Lambda(this.terms[i], expr);
    return expr;
  }

  // uncomment if debugging with prints
  /* toString () {
    return this.terms.join('->') + '->' + (this.impl ?? '???');
  } */
}

function postParse (expr: Expr): Expr {
  return (expr as Empty).postParse ? (expr as Empty).postParse() : expr;
}

const combChars = new Tokenizer(
  '[()]', '[A-Z]', '[a-z_][a-z_0-9]*', '\\b[0-9]+\\b', '->', '\\+'
);

// TODO names too similar, rename one
export type ParserOptions = {
  allow?: string,
  numbers?: boolean,
  lambdas?: boolean,
  terms?: { [key: string]: Expr | string } | string[],
  annotate?: boolean,
  addContext?: boolean,
};

export type ParseOptions = {
  env?: { [key: string]: Expr },
  scope?: object,
  numbers?: boolean,
  lambdas?: boolean,
  allow?: string,
  canonize?: boolean,
};

export type AddOptions = {
  note?: string,
  canonize?: boolean,
  fancy?: string,
  arity?: number,
};

export class Parser {
  /**
   *
   * @param {{
   *    allow?: string,
   *    numbers?: boolean,
   *    lambdas?: boolean,
   *    terms?: { [key: string]: Expr|string} | string[],
   *    annotate?: boolean,
   * }} [options]
   */

  addContext: boolean;
  annotate: boolean;
  known: Record<string, Named>;
  allow: Set<string>;

  hasNumbers: boolean;
  hasLambdas: boolean;

  constructor (options: ParserOptions = {}) {
    this.annotate = !!options.annotate;
    this.addContext = !!options.addContext;
    this.known = { ...native };
    this.hasNumbers = true;
    this.hasLambdas = true;
    /** @type {Set<string>} */
    this.allow = new Set(Object.keys(this.known));

    // Import terms, if any. Omit native ones
    if (Array.isArray(options.terms))
      this.bulkAdd(options.terms);
    else if (options.terms) {
      for (const name in options.terms) {
        // Native terms already handled by allow
        if (typeof options.terms[name] !== 'string' || !options.terms[name].match(/^Native:/))
          this.add(name, options.terms[name]);
      }
    }

    // Finally, impose restrictions
    // We must do it after recreating terms, or else terms reliant on forbidden terms will fail
    this.hasNumbers = options.numbers ?? true;
    this.hasLambdas = options.lambdas ?? true;
    if (options.allow)
      this.restrict(options.allow);
  }

  /**
   *  Declare a new term
   * If the first argument is an Alias, it is added as is.
   * Otherwise, a new Alias or Native term (depending on impl type) is created.
   * If note is not provided and this.annotate is true, an automatic note is generated.
   *
   * If impl is a function, it should have signature (Expr) => ... => Expr
   * (see typedef Partial at top of expr.js)
   *
   * @example ski.add('T', 'S(K(SI))K', 'swap combinator')
   * @example ski.add( ski.parse('T = S(K(SI))K') ) // ditto but one-arg form
   * @example ski.add('T', x => y => y.apply(x), 'swap combinator') // heavy artillery
   * @example ski.add('Y', function (f) { return f.apply(this.apply(f)); }, 'Y combinator')
   *
   * @param {Alias|String} term
   * @param {String|Expr|function(Expr):Partial} [impl]
   * @param {object|string} [options]
   * @param {string} [options.note] - optional annotation for the term, default is auto-generated if this.annotate is true
   * @param {boolean} [options.canonize] - whether to canonize the term's implementation, default is this.annotate
   * @param {boolean} [options.fancy] - alternative HTML-friendly name for the term
   * @param {number} [options.arity] - custom arity for the term, default is inferred from the implementation
   * @return {SKI} chainable
   */
  add (term: Alias | string, impl?: Expr | string | ((arg: Expr) => Invocation), options?: AddOptions | string): this {
    const named = this._named(term, impl);

    // backward compat
    const opts: AddOptions = typeof options === 'string' ? { note: options, canonize: false } : (options ?? {});
    named.annotate({ canonize: this.annotate, ...opts });

    const old = this.known[named.name];
    if (old instanceof Alias)
      old.makeInline();

    this.known[named.name] = named;
    this.allow.add(named.name);

    return this;
  }

  /**
   *  Internal helper for add() that creates an Alias or Native term from the given arguments.
   * @param {Alias|string} term
   * @param {string|Expr|function(Expr):Partial} impl
   * @returns {Native|Alias}
   * @private
   */
  _named (term: Alias | string, impl?: Expr | string | ((arg: Expr) => Invocation)): Native | Alias {
    if (term instanceof Named)
      return maybeAlias(term.name, term);
    if (typeof term !== 'string')
      throw new Error('add(): term must be an Alias or a string');
    if (impl === undefined)
      throw new Error('add(): impl must be provided when term is a string');
    if (typeof impl === 'string')
      return maybeAlias(term, this.parse(impl));
    if (impl instanceof Expr)
      return maybeAlias(term, impl);
    if (typeof impl === 'function')
      return new Native(term, impl);
    // idk what this is
    throw new Error('add(): impl must be an Expr, a string, or a function with a signature Expr => ... => Expr');
  }

  /**
   *  Declare a new term if it is not known, otherwise just allow it.
   *       Currently only used by quests.
   *       Use with caution, this function may change its signature, behavior, or even be removed in the future.
   *
   * @experimental
   * @param {string|Alias} name
   * @param {string|Expr|function(Expr):Partial} impl
   * @returns {SKI}
   */
  maybeAdd (name: string, impl: Expr | string | ((arg: Expr) => Invocation)): this {
    if (this.known[name])
      this.allow.add(name);
    else
      this.add(name, impl);
    return this;
  }

  /**
   *  Declare and remove multiple terms at once
   *       term=impl adds term
   *       term= removes term
   * @param {string[]} list
   * @return {SKI} chainable
   */
  bulkAdd (list: string[]): this {
    for (const item of list) {
      const m = item.match(/^([A-Z]|[a-z][a-z_0-9]*)\s*=\s*(.*)$/s);
      // TODO check all declarations before applying any (but we might need earlier terms for parsing later ones)
      if (!m)
        throw new Error('bulkAdd: invalid declaration: ' + item);
      if (m[2] === '')
        this.remove(m[1]);
      else
        this.add(m[1], this.parse(m[2]));
    }

    return this;
  }

  /**
   * Restrict the interpreter to given terms. Terms prepended with '+' will be added
   * and terms preceeded with '-' will be removed.
   * @example ski.restrict('SK') // use the basis
   * @example ski.restrict('+I') // allow I now
   * @example ski.restrict('-SKI +BCKW' ); // switch basis
   * @example ski.restrict('-foo -bar'); // forbid some user functions
   * @param {string} spec
   * @return {SKI} chainable
   */
  restrict (spec: string): this {
    this.allow = restrict(this.allow, spec);
    return this;
  }

  /**
   *
   * @param {string} spec
   * @return {string}
   */
  showRestrict (spec = '+') {
    const out = [];
    let prevShort: boolean = true;
    for (const term of [...restrict(this.allow, spec)].sort()) {
      const nextShort = !!term.match(/^[A-Z]$/);
      if (out.length && !(prevShort && nextShort))
        out.push(' ');
      out.push(term);
      prevShort = nextShort;
    }
    return out.join('');
  }

  /**
   *
   * @param {String} name
   * @return {SKI}
   */
  remove (name: string): this {
    const old = this.known[name];
    if (old instanceof Alias)
      old.makeInline();
    delete this.known[name];
    this.allow.delete(name);
    return this;
  }

  /**
   *
   * @return {{[key:string]: Native|Alias}}
   */
  getTerms (): Record<string, Named> {
    const out: Record<string, Named> = {};
    for (const name of Object.keys(this.known)) {
      if (this.allow.has(name))
        out[name] = this.known[name];
    }
    return out;
  }

  /**
   *  Export term declarations for use in bulkAdd().
   * Currently only Alias terms are serialized.
   * @returns {string[]}
   */
  declare (): string[] {
    // TODO accept argument to declare specific terms only
    const env: { [key: string]: Alias } = {};
    for (const [name, term] of Object.entries(this.getTerms())) {
      if (term instanceof Alias)
        env[name] = term;
    }

    // avert conflicts if native terms were redefined:
    // create a temporary alias for each native term that was redefined;
    // replace usage of redefined term in subexpressions;
    // finally, remove the temporary aliases from the output
    const needDetour: { [key: string]: Alias } = {};
    let i = 1;
    for (const name in native) {
      if (!(env[name] instanceof Alias))
        continue;
      while ('tmp' + i in env)
        i++;
      const temp = new Alias('tmp' + i, env[name]);
      needDetour[temp.name] = env[name];
      env[temp.name] = temp;
      delete env[name];
    }

    // console.log(env);

    const list = toposort({ list: Object.values(env), allow: {} }).list;

    const detour = new Map<Alias, Alias>();
    if (Object.keys(needDetour).length) {
      // replace aliases with their detoured counterparts.
      // we have to go recursive, otherwise an unrelated alias may be expanded to its impl
      // and name infos will be erased
      const rework = (expr: Expr): Expr => {
        return expr.traverse((e: Expr) => {
          if (!(e instanceof Alias))
            return null; // continue
          const newAlias = detour.get(e);
          if (newAlias)
            return newAlias;
          return new Alias(e.name, rework(e.impl));
        }) ?? expr;
      };

      for (let j = 0; j < list.length; j++) {
        // upon processing list[j], only terms declared before it may be detoured
        list[j] = rework(list[j]);
        detour.set(needDetour[(list[j] as Alias).name], list[j] as Alias);
        env[(list[j] as Alias).name] = list[j] as Alias;
        // console.log(`list[${j}] = ${(list[j] as Alias).name}=${(list[j] as Alias).impl};`);
      }
      // console.log('detour:', detour);
    }

    // console.log(res);
    const out = list.map(e => needDetour[(e as Alias).name]
      ? (e as Alias).name + '=' + needDetour[(e as Alias).name].name + '=' + (e as Alias).impl.format({ inventory: env })
      : (e as Alias).name + '=' + (e as Alias).impl.format({ inventory: env })
    );

    for (const [name, temp] of detour)
      out.push((name as Alias).name + '=' + temp, temp + '=');

    return out;
  }

  /**
   * @param {string} source
   * @param {Object} [options]
   * @param [options.env] - additional
   * @param [options.scope] - assign this scope to unknown free variables
   * @param {boolean} [options.numbers] - whether numbers are allowed
   * @param {boolean} [options.lambdas] - whether lambdas are allowed
   * @param {string} [options.allow] - restrict known terms
   * @param [options.canonize] - whether to calculate canonical form, arity, and properties
   *                             of intermediate aliases
   * @return {Expr}
   */
  parse (source: string, options: ParseOptions = {}): Expr {
    if (typeof source !== 'string')
      throw new Error('parse: source must be a string, got ' + typeof source);

    const lines = source.replace(/\/\/[^\n]*$/gm, ' ')
      .replace(/\/\*.*?\*\//gs, ' ')
      .trim()
      .split(/\s*;[\s;]*/).filter( s => s.match(/\S/));

    const jar = { ...options.env };

    let expr: Expr = new Empty();
    for (const item of lines) {
      const [_, name, def] = item.match(/^([A-Z]|[a-z][a-z_0-9]*)\s*=(.*)$/s) || [];

      if (name !== undefined) {
        if (jar[name] instanceof Alias && jar[name] !== options.env?.[name]) {
          // locally defined alias => demote
          jar[name].makeInline();
        }
        delete jar[name];
      }

      if (def === '')
        expr = new FreeVar(name, options.scope ?? FreeVar.global);
      else
        expr = this.parseLine(item, jar, options);

      if (name)
        jar[name] = expr;

      // console.log('parsed line:', item, '; got:', expr,'; jar now: ', jar);
    }

    if (this.addContext) {
      // create a transparent alias to avoid mutating the original term
      if (expr instanceof Named)
        expr = new Alias(expr.name, expr, { inline: true });
      expr.context = {
        env:    { ...this.getTerms(), ...jar }, // also contains pre-parsed terms
        scope:  options.scope,
        src:    source,
        parser: this,
      };
    }
    return expr;
  }

  /**
   *  Parse a single line of source code, without splitting it into declarations.
   *       Internal, always use parse() instead.
   * @template T
   * @param {String} source S(KI)I
   * @param {{[keys: string]: Expr}} env
   * @param {Object} [options]
   * @param {{[keys: string]: Expr}} [options.env] - unused, see 'env' argument
   * @param {T} [options.scope]
   * @param {boolean} [options.numbers]
   * @param {boolean} [options.lambdas]
   * @param {string} [options.allow]
   * @return {Expr} parsed expression
   */
  parseLine (source: string, env: { [key: string]: Expr } = {}, options: ParseOptions = {}): Expr {
    const aliased = source.match(/^\s*([A-Z]|[a-z][a-z_0-9]*)\s*=\s*(.*)$/s);
    if (aliased)
      return new Alias(aliased[1], this.parseLine(aliased[2], env, options), { canonize: options.canonize });

    const opt = {
      numbers: options.numbers ?? this.hasNumbers,
      lambdas: options.lambdas ?? this.hasLambdas,
      allow:   restrict(this.allow, options.allow),
    };
    // make sure '+' usage is in sync with numerals
    if (opt.numbers) opt.allow.add('+'); else opt.allow.delete('+');

    const tokens = combChars.split(source);

    const empty = new Empty();
    /** @type {Expr[]} */
    const stack: Expr[] = [empty];
    const context = options.scope || FreeVar.global; // default is global unbound vars

    // TODO each token should carry along its position in source
    for (const c of tokens) {
      // console.log("parseLine: found "+c+"; stack =", stack.join(", "));
      if (c === '(')
        stack.push(empty);
      else if (c === ')') {
        if (stack.length < 2)
          throw new Error('unbalanced input: extra closing parenthesis' + source);
        const x = postParse(stack.pop()!);
        const f = stack.pop()!;
        stack.push(f.apply(x));
      } else if (c === '->') {
        if (!opt.lambdas)
          throw new Error('Lambdas not supported, allow them explicitly');
        stack.push(new PartialLambda(stack.pop()!));
      } else if (c.match(/^[0-9]+$/)) {
        if (!opt.numbers)
          throw new Error('Church numbers not supported, allow them explicitly');
        const f = stack.pop()!;
        stack.push(f.apply(new Church(Number.parseInt(c))));
      } else {
        const f = stack.pop()!;
        if (!env[c] && this.known[c] && !opt.allow.has(c)) {
          throw new Error('Term \'' + c + '\' is not in the restricted set '
            + [...opt.allow].sort().join(' '));
        }
        // look in temp vars first, then in known terms, then fallback to creating free var
        const x = env[c] ?? this.known[c] ?? (env[c] = new FreeVar(c, context));
        stack.push(f.apply(x));
      }
    }

    if (stack.length !== 1) {
      throw new Error('unbalanced input: missing '
          + (stack.length - 1) + ' closing parenthesis:' + source);
    }

    return postParse(stack.pop()!);
  }

  toJSON () {
    return {
      version:  '1.1.1', // set to incremented package.json version whenever SKI serialization changes
      allow:    this.showRestrict('+'),
      numbers:  this.hasNumbers,
      lambdas:  this.hasLambdas,
      annotate: this.annotate,
      terms:    this.declare(),
    }
  }

  /**
 *  Public static shortcuts to common functions (see also ./extras.js)
 */
}

function maybeAlias (name: string, impl: Expr): Named {
  // Remove unnecessary extra aliases with the same name
  while (impl instanceof Alias && impl.name === name)
    impl = impl.impl;
  if (impl instanceof Named && impl.name === name)
    return impl;
  return new Alias(name, impl, { canonize: true });
}
