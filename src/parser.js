/**
 * Combinatory logic simulator
 */
'use strict';

const { Tokenizer, restrict } = require('./internal');
const classes = require('./expr');

const { Expr, Named, Native, Alias, FreeVar, Lambda, Church } = classes;
const { native } = Expr;

class Empty extends Expr {
  apply (...args) {
    return args.length ? args.shift().apply(...args) : this;
  }

  postParse () {
    throw new Error('Attempt to use empty expression () as a term');
  }
}

class PartialLambda extends Empty {
  // TODO mutable! rewrite ro when have time
  constructor (term, known = {}) {
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

  apply (term, ...tail) {
    if (term === null || tail.length !== 0 )
      throw new Error('bad syntax in partial lambda expr');
    this.impl = this.impl.apply(term);
    return this;
  }

  postParse () {
    return new Lambda(this.terms, this.impl);
  }

  // uncomment if debugging with prints
  /* toString () {
    return this.terms.join('->') + '->' + (this.impl ?? '???');
  } */
}

function postParse (expr) {
  return expr.postParse ? expr.postParse() : expr;
}

const combChars = new Tokenizer(
  '[()]', '[A-Z]', '[a-z_][a-z_0-9]*', '\\b[0-9]+\\b', '->', '\\+'
);

class SKI {
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
  constructor (options = {}) {
    this.annotate = options.annotate ?? false;
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
        if (!options.terms[name].match(/^Native:/))
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
   * @desc Declare a new term
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
  add (term, impl, options ) {
    term = this._named(term, impl);

    // backward compat
    if (typeof options === 'string')
      options = { note: options, canonize: false };
    term._setup({ canonize: this.annotate, ...options });

    if (this.known[term.name])
      this.known[term.name].outdated = true;
    this.known[term.name] = term;
    this.allow.add(term.name);

    return this;
  }

  /**
   * @desc Internal helper for add() that creates an Alias or Native term from the given arguments.
   * @param {Alias|string} term
   * @param {string|Expr|function(Expr):Partial} impl
   * @returns {Native|Alias}
   * @private
   */
  _named (term, impl) {
    if (term instanceof Alias)
      return new Alias(term.name, term.impl, { canonize: true });
    if (typeof term !== 'string')
      throw new Error('add(): term must be an Alias or a string');
    if (impl === undefined)
      throw new Error('add(): impl must be provided when term is a string');
    if (typeof impl === 'string')
      return new Alias(term, this.parse(impl), { canonize: true });
    if (impl instanceof Expr)
      return new Alias(term, impl, { canonize: true });
    if (typeof impl === 'function')
      return new Native(term, impl);
    // idk what this is
    throw new Error('add(): impl must be an Expr, a string, or a function with a signature Expr => ... => Expr');
  }

  /**
   * @desc Declare a new term if it is not known, otherwise just allow it.
   *       Currently only used by quests.
   *       Use with caution, this function may change its signature, behavior, or even be removed in the future.
   *
   * @experimental
   * @param {string|Alias} name
   * @param {string|Expr|function(Expr):Partial} impl
   * @returns {SKI}
   */
  maybeAdd (name, impl) {
    if (this.known[name])
      this.allow.add(name);
    else
      this.add(name, impl);
    return this;
  }

  /**
   * @desc Declare and remove multiple terms at once
   *       term=impl adds term
   *       term= removes term
   * @param {string[]} list
   * @return {SKI} chainable
   */
  bulkAdd (list) {
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
  restrict (spec) {
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
    let prevShort = true;
    for (const term of [...restrict(this.allow, spec)].sort()) {
      const nextShort = term.match(/^[A-Z]$/);
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
  remove (name) {
    this.known[name].outdated = true;
    delete this.known[name];
    this.allow.delete(name);
    return this;
  }

  /**
   *
   * @return {{[key:string]: Native|Alias}}
   */
  getTerms () {
    const out = {};
    for (const name of Object.keys(this.known)) {
      if (this.allow.has(name))
        out[name] = this.known[name];
    }
    return out;
  }

  /**
   * @desc Export term declarations for use in bulkAdd().
   * Currently only Alias terms are serialized.
   * @returns {string[]}
   */
  declare () {
    // TODO accept argument to declare specific terms only
    const env = this.getTerms();

    // not serializing native terms, and we don't care about free vars
    for (const name in env) {
      if (!(env[name] instanceof Alias))
        delete env[name];
    }

    // avert conflicts if native terms were redefined:
    // create a temporary alias for each native term that was redefined;
    // replace usage of redefined term in subexpressions;
    // finally, remove the temporary aliases from the output
    const needDetour = {};
    let i = 1;
    for (const name in native) {
      if (!(env[name] instanceof Alias))
        continue;
      while ('tmp' + i in env)
        i++;
      const temp = new Alias('tmp' + i, env[name]);
      needDetour[temp] = env[name];
      env[temp] = temp;
      delete env[name];
    }

    // console.log(env);

    const list = Expr.extras.toposort(undefined, env).list;

    const detour = new Map();
    if (Object.keys(needDetour).length) {
      // replace aliases with their detoured counterparts.
      // we have to go recursive, otherwise an unrelated alias may be expanded to its impl
      // and name infos will be erased
      const rework = expr => {
        return expr.traverse(e => {
          if (!(e instanceof Alias))
            return null; // continue
          const newAlias = detour.get(e);
          if (newAlias)
            return newAlias;
          return new Alias(e.name, rework(e.impl));
        }) ?? expr;
      };

      for (let i = 0; i < list.length; i++) {
        // upon processing list[i], only terms declared before it may be detoured
        list[i] = rework(list[i], detour);
        detour.set(needDetour[list[i].name], list[i]);
        env[list[i].name] = list[i];
        console.log(`list[${i}] = ${list[i].name}=${list[i].impl};`);
      }
      console.log('detour:', detour);
    }

    // console.log(res);
    const out = list.map(e => needDetour[e]
      ? e.name + '=' + needDetour[e].name + '=' + e.impl.format({ inventory: env })
      : e.name + '=' + e.impl.format({ inventory: env })
    );

    for (const [name, temp] of detour)
      out.push(name + '=' + temp, temp + '=');

    return out;
  }

  /**
   * @template T
   * @param {string} source
   * @param {Object} [options]
   * @param {{[keys: string]: Expr}} [options.env]
   * @param {T} [options.scope]
   * @param {boolean} [options.numbers]
   * @param {boolean} [options.lambdas]
   * @param {string} [options.allow]
   * @return {Expr}
   */
  parse (source, options = {}) {
    if (typeof source !== 'string')
      throw new Error('parse: source must be a string, got ' + typeof source);

    const lines = source.replace(/\/\/[^\n]*$/gm, ' ')
      .replace(/\/\*.*?\*\//gs, ' ')
      .trim()
      .split(/\s*;[\s;]*/).filter( s => s.match(/\S/));

    const jar = { ...options.env };

    let expr = new Empty();
    for (const item of lines) {
      if (expr instanceof Alias)
        expr.outdated = true;

      const def = item.match(/^([A-Z]|[a-z][a-z_0-9]*)\s*=(.*)$/s);
      if (def && def[2] === '')
        expr = new FreeVar(def[1], options.scope ?? FreeVar.global);
      else
        expr = this.parseLine(item, jar, options);

      if (def) {
        if (jar[def[1]] !== undefined)
          throw new Error('Attempt to redefine a known term: ' + def[1]);
        jar[def[1]] = expr;
      }

      // console.log('parsed line:', item, '; got:', expr,'; jar now: ', jar);
    }

    expr.context = {
      env:    { ...this.getTerms(), ...jar }, // also contains pre-parsed terms
      scope:  options.scope,
      src:    source,
      parser: this,
    };
    return expr;
  }

  /**
   * @desc Parse a single line of source code, without splitting it into declarations.
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
  parseLine (source, env = {}, options = {}) {
    const aliased = source.match(/^\s*([A-Z]|[a-z][a-z_0-9]*)\s*=\s*(.*)$/s);
    if (aliased)
      return new Alias(aliased[1], this.parseLine(aliased[2], env, options));

    const opt = {
      numbers: options.numbers ?? this.hasNumbers,
      lambdas: options.lambdas ?? this.hasLambdas,
      allow:   restrict(this.allow, options.allow),
    };
    // make sure '+' usage is in sync with numerals
    opt.numbers ? opt.allow.add('+') : opt.allow.delete('+');

    const tokens = combChars.split(source);

    const empty = new Empty();
    /** @type {Expr[]} */
    const stack = [empty];
    const context = options.scope || FreeVar.global; // default is global unbound vars

    // TODO each token should carry along its position in source
    for (const c of tokens) {
      // console.log("parseLine: found "+c+"; stack =", stack.join(", "));
      if (c === '(')
        stack.push(empty);
      else if (c === ')') {
        if (stack.length < 2)
          throw new Error('unbalanced input: extra closing parenthesis' + source);
        const x = postParse(stack.pop());
        const f = stack.pop();
        stack.push(f.apply(x));
      } else if (c === '->') {
        if (!opt.lambdas)
          throw new Error('Lambdas not supported, allow them explicitly');
        stack.push(new PartialLambda(stack.pop(), env));
      } else if (c.match(/^[0-9]+$/)) {
        if (!opt.numbers)
          throw new Error('Church numbers not supported, allow them explicitly');
        const f = stack.pop();
        stack.push(f.apply(new Church(c)));
      } else {
        const f = stack.pop();
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

    return postParse(stack.pop());
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
}

/**
 *  Public static shortcuts to common functions (see also ./extras.js)
 */

/**
 * @desc Create a proxy object that generates variables on demand,
 *       with names corresponding to the property accessed.
 *       Different invocations will return distinct variables,
 *       even if with the same name.
 *
 *
 * @example const {x, y, z} = SKI.vars();
 *          x.name; // 'x'
 *          x instanceof FreeVar; // true
 *          x.apply(y).apply(z); // x(y)(z)
 *
 * @template T
 * @param {T} [scope] - optional context to bind the generated variables to
 * @return {{[key: string]: FreeVar}}
 */
SKI.vars = function (scope = {}) {
  const cache = {};
  return new Proxy({}, {
    get: (target, name) => {
      if (!(name in cache))
        cache[name] = new FreeVar(name, scope);
      return cache[name];
    }
  });
};

/**
 * Convert a number to Church encoding
 * @param {number} n
 * @return {Church}
 */
SKI.church = n => new Church(n);

/**
 *
 * @type {{[key: string]: Native}}
 */

for (const name in native)
  SKI[name] = native[name];

SKI.classes = classes;
SKI.native = native;
/**
 * @desc Traverse control functions, used by Expr.traverse() and Expr.fold()
 * @template T
 * @type {{
 *    descend: function(T): TraverseControl<T>,
 *    prune: function(T): TraverseControl<T>,
 *    redo: function(T): TraverseControl<T>,
 *    stop: function(T): TraverseControl<T>
 * }}
 */
SKI.control = Expr.control;

module.exports = { SKI };
