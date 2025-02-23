/**
 * Combinatory logic simulator
 */

const { Tokenizer, restrict } = require('./util');
const { Expr, App, FreeVar, Lambda, Native, Alias, Church } = require('./expr');

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

const combChars = new Tokenizer(
  '[()]', '[A-Z]', '[a-z_][a-z_0-9]*', '\\b[0-9]+\\b', '->', '\\+'
);

class SKI {
  /**
   *
   * @param {{
   *    allow: string?,
   *    numbers: boolean?,
   *    lambdas: boolean?,
   *    terms: { [key: string]: Expr|string}?
   * }} [options]
   */
  constructor (options = {}) {
    this.known = { ...native };
    this.hasNumbers = true;
    this.hasLambdas = true;
    this.allow = new Set(Object.keys(this.known));

    // Import terms, if any. Omit native ones
    for (const name in options.terms ?? {}) {
      // Native terms already handled by allow
      if (!options.terms[name].match(/^Native:/))
        this.add(name, options.terms[name]);
    }

    // Finally, impose restrictions
    // We must do it after recreating terms, or else terms reliant on forbidden terms will fail
    this.hasNumbers = options.numbers ?? true;
    this.hasLambdas = options.lambdas ?? true;
    if (options.allow)
      this.restrict(options.allow);
  }

  /**
   *
   * @param {String} name
   * @param {Expr|String|[number, function(...Expr): Expr, {note: string?, fast: boolean?}]} impl
   * @param {String} [note]
   * @return {SKI} chainable
   */
  add (name, impl, note ) {
    if (typeof impl === 'string')
      impl = new Alias( name, this.parseLine(impl));
    else if (impl instanceof Expr)
      impl = new Alias( name, impl );
    else
      throw new Error('add: impl must be an Expr or a string');

    if (note !== undefined)
      impl.note = note;
    this.known[name] = impl;
    this.allow.add(name);

    return this;
  }

  maybeAdd (name, impl) {
    if (this.known[name])
      this.allow.add(name);
    else
      this.add(name, impl);
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
   * @return {{[key:string]: Expr}}
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
   *
   * @param {string} source
   * @param {{[keys: string]: Expr}} vars
   * @param {{numbers: boolean?, lambdas: boolean?, allow: string?}} options
   * @return {Expr}
   */
  parse (source, vars = {}, options = {}) {
    const lines = source.replace(/\/\/[^\n]*$/gm, '')
      .split(/\s*;[\s;]*/).filter( s => s.match(/\S/));

    const jar = { ...vars };

    let expr = new Empty();
    for (const item of lines) {
      const [_, save, str] = item.match(/^(?:\s*([A-Z]|[a-z][a-z_0-9]*)\s*=\s*)?(.*)$/s);
      if (expr instanceof Alias)
        expr.outdated = true;
      expr = this.parseLine(str, jar, options);

      if (save !== undefined) {
        if (jar[save] !== undefined)
          throw new Error('Attempt to redefine a known term: ' + save);
        expr = new Alias(save, expr);
        jar[save] = expr;
      }

      // console.log('parsed line:', item, '; got:', expr,'; jar now: ', jar);
    }

    // reimport free variables, so that co-parsing x(y(z)) and z(x(y)) with the same jar
    //     results in _equal_ free vars and not just ones with the same name
    for (const name in jar) {
      if (!vars[name] && jar[name] instanceof SKI.classes.FreeVar)
        vars[name] = jar[name];
    }

    return expr;
  }

  /**
   *
   * @param {String} source S(KI)I
   * @param {{[keys: string]: Expr}} vars
   * @param {{numbers: boolean?, lambdas: boolean?, allow: string?}} options
   * @return {Expr} parsed expression
   */
  parseLine (source, vars = {}, options = {}) {
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

    // TODO each token should carry along its position in source
    for (const c of tokens) {
      // console.log("parseLine: found "+c+"; stack =", stack.join(", "));
      if (c === '(')
        stack.push(empty);
      else if (c === ')') {
        if (stack.length < 2)
          throw new Error('unbalanced input: extra closing parenthesis' + source);
        const x = stack.pop().postParse();
        const f = stack.pop();
        stack.push(f.apply(x));
      } else if (c === '->') {
        if (!opt.lambdas)
          throw new Error('Lambdas not supported, allow them explicitly');
        stack.push(new PartialLambda(stack.pop(), vars));
      } else if (c.match(/^[0-9]+$/)) {
        if (!opt.numbers)
          throw new Error('Church numbers not supported, allow them explicitly');
        const f = stack.pop();
        stack.push(f.apply(new Church(c)));
      } else {
        const f = stack.pop();
        if (!vars[c] && this.known[c] && !opt.allow.has(c)) {
          throw new Error('Term \'' + c + '\' is not in the restricted set '
            + [...opt.allow].sort().join(' '));
        }
        // look in temp vars first, then in known terms, then fallback to creating free var
        const x = vars[c] ?? this.known[c] ?? (vars[c] = new FreeVar(c));
        stack.push(f.apply(x));
      }
    }

    if (stack.length !== 1) {
      throw new Error('unbalanced input: missing '
          + (stack.length - 1) + ' closing parenthesis:' + source);
    }

    return stack.pop().postParse();
  }

  toJSON () {
    return {
      allow:   this.showRestrict('+'),
      numbers: this.hasNumbers,
      lambdas: this.hasLambdas,
      terms:   this.getTerms(),
    }
  }
}

// Create shortcuts for common terms
/**
 * Create free var(s) for subsequent use
 * @param {String} names
 * @return {FreeVar[]}
 */
SKI.free = (...names) => names.map(s => new FreeVar(s));

/**
 * Convert a number to Church encoding
 * @param {number} n
 * @return {Church}
 */
SKI.church = n => new Church(n);
SKI.classes = { Expr, Native, Alias, FreeVar, Lambda, Church };

/**
 *
 * @type {{[key: string]: Native}}
 */
const native = {
  I:   new Native('I', 1, x => x, { note: 'x -> x' }),
  K:   new Native('K', 2, (x, _) => x, { skip: [1], note: 'x -> y -> x' }),
  S:   new Native('S', 3, (x, y, z) => x.apply(z, y.apply(z)), { note: 'x -> y -> z -> x z (y z)' }),
  B:   new Native('B', 3, (x, y, z) => x.apply(y.apply(z)), { note: 'x -> y -> z -> x (y z)' }),
  C:   new Native('C', 3, (x, y, z) => x.apply(z).apply(y), { note: 'x -> y -> z -> x z y' }),
  W:   new Native('W', 2, (x, y) => x.apply(y).apply(y), { note: 'x -> y -> x y y' }),
  '+': new Native('+', 3, (x, y, z) => y.apply(x.apply(y, z)), {
    note:  'x->y->z->y(x y z) // or x+1 if x is numeric',
    apply: arg => arg instanceof Church ? new Church(arg.n + 1) : null
  })
};

for (const name in native)
  SKI[name] = native[name];
SKI.native = native;

module.exports = { SKI };
