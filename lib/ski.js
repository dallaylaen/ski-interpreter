/**
 * Combinatory logic simulator
 */

class Expr {
  constructor () {
    if (new.target === Expr)
      throw new Error('Attempt to instantiate abstract class Expr');
  }

  /**
   * postprocess term after parsing. typically return self but may return other term or die
   * @return {Expr}
   */
  postParse () {
    return this;
  }

  /**
   * @desc apply self to zero or more terms and return the resulting term,
   * without performing any calculations whatsoever
   * @param {Expr} args
   * @return {Expr}
   */
  apply (...args) {
    return args.length > 0 ? new App(this, ...args) : this;
  }

  /**
   * expand all terms but don't perform any calculations
   * @return {Expr}
   */
  expand () {
    return this;
  }

  /**
   * Apply self to list of given args.
   * Normally, only native combinators know how to do it.
   * @param {Expr[]} args
   * @return {Expr|null}
   */
  reduce (args) {
    return null;
  }

  /**
   * Replace all instances of free vars with corresponding values and return the resulting expression.
   * return nulls if no changes could be made, just like step() does, to save memory.
   * @param {[replace: FreeVar, withValue: Expr][]} list
   * @return {Expr|null}
   */
  subst (list) {
    return null;
  }

  /**
   * @desc iterate one step of calculation in accordance with known rules.
   *       return the new expression if reduction was possible. or null otherwise
   * @return {{expr: Expr, steps: number}}
   */
  step () { return { steps: 0, expr: this } }

  /**
   * @desc Run uninterrupted sequence of step() applications
   *       until the expression is irreducible, or max number of steps is reached.
   *       Default number of steps = 1000.
   * @param {{max: number?, steps: number?, throw: boolean?}|Expr} [opt]
   * @param {Expr} args
   * @return {{expr: Expr, steps: number, final: boolean}}
   */
  run (opt = {}, ...args) {
    if (opt instanceof Expr) {
      args.unshift(opt);
      opt = {};
    }
    let expr = args ? this.apply(...args) : this;
    let steps = opt.steps ?? 0;
    const max = (opt.max ?? 1000) + steps;
    let final = false;
    for (; steps < max; ) {
      const next = expr.step();
      if (next.steps === 0) {
        final = true;
        break;
      }
      steps += next.steps;
      expr = next.expr;
    }
    if (opt.throw && !final)
      throw new Error('Failed to compute expression in ' + max + ' steps');
    return { final, steps, expr };
  }

  /**
   * Execute step() while possible, yielding a brief description of events after each step.
   * Mnemonics: like run() but slower.
   * @param {{max: number?}} options
   * @return {IterableIterator<{final: boolean, expr: Expr, steps: number}>}
   */
  * walk (options = {}) {
    const max = options.max ?? Infinity;
    let steps = 0;
    let expr = this;
    let final = false;

    while (steps < max) {
      const next = expr.step();
      if (next.steps === 0)
        final = true;
      yield { expr, steps, final };
      if (final)
        break;
      steps += next.steps;
      expr = next.expr;
    }
  }

  /**
   *
   * @param {Expr} other
   * @return {boolean}
   */
  equals (other) {
    return this === other;
  }

  /**
   * @return {string} string representation of the expression
   */
  toString () {
    // uncomment the following line if you want to debug the parser with prints
    // return this.constructor.name
    throw new Error( 'No toString() method defined in class ' + this.constructor.name );
  }
}

class App extends Expr {
  /**
   * @desc Application of fun() to args
   * @param {Expr} fun
   * @param {Expr} args
   */
  constructor (fun, ...args) {
    super();
    this.fun = fun;
    this.args = args;
    this.final = false;
  }

  apply (...args) {
    if (args.length === 0)
      return this;
    return this.fun.apply( ...this.args, ...args);
  }

  expand () {
    return this.fun.expand().apply(...this.args.map(x => x.expand()));
  }

  subst (list) {
    const fun = this.fun.subst(list);
    let change = fun === null ? 0 : 1;
    const args = [];
    for (const x of this.args) {
      const next = x.subst(list);
      if (next === null)
        args.push(x);
      else {
        args.push(next);
        change++;
      }
    }

    return change ? (fun ?? this.fun).apply(...args) : null;
  }

  /**
   * @desc Recursively calculates all terms in the expression. If nothing has to be done,
   * tries to apply the first n-ary term to first n arguments.
   * @return {{expr: Expr, steps: number}}
   */
  step () {
    if (this.final)
      return { expr: this, steps: 0 };

    // first try to cut off some subtrees so we don't need to calculate them at all
    if (this.fun.fast) {
      const maybe = this.fun.reduce(this.args);
      if (maybe)
        return { expr: maybe, steps: 1 };
    }

    // now try recursing
    let change = 0;

    // TODO must be inefficient, rewrite later
    const acc = next => { change += next.steps; return next.expr };

    // if subtrees changed, return new self
    const fun = acc(this.fun.step());
    const args = this.args.map(term => acc(term.step()));

    if (change)
      return { expr: fun.apply(...args), steps: change };

    // if nothing has changed, but the fun knows how to proceed, let it do the stuff
    const reduced = this.fun.reduce(this.args);
    if (reduced)
      return { expr: reduced, steps: 1 };

    // no more reductions can be made
    this.final = true;
    return { expr: this, steps: 0 };
  }

  equals (other) {
    if (!(other instanceof App))
      return false;
    if (other.args.length !== this.args.length)
      return false;
    if (!this.fun.equals(other.fun))
      return false;
    for (let i = 0; i < this.args.length; i++) {
      if (!this.args[i].equals(other.args[i]))
        return false;
    }
    return true;
  }

  toString () {
    const root = this.fun instanceof Lambda ? '(' + this.fun + ')' : this.fun + '';
    return root + this.args.map(x => '(' + x + ')').join('');
  }
}

class Named extends Expr {
  /**
   * @desc a constant named 'name'
   * @param {String} name
   */
  constructor (name) {
    super();
    if (typeof name !== 'string' || name.length === 0)
      throw new Error('Attempt to create a named term with improper name');
    this.name = name;
  }

  toString () {
    return this.name;
  }
}

class FreeVar extends Named {
  subst (list) {
    for (const item of list)
      if (this === item[0]) return item[1];
    return null;
  }
}

class Lambda extends Expr {
  /**
   * @param {FreeVar[]} args
   * @param {Expr} impl
   */
  constructor (args, impl) {
    super();
    if (args.length === 0)
      throw new Error('empty argument list in lambda');
    const known = new Set();
    for (const x of args) {
      if (known.has(x.name))
        throw new Error('Duplicate free var name ' + x + ' in lambda expression');
      known.add(x.name);
    }

    // We don't know where args come from and whether they are used elsewhere.
    // So, replace them with fresh free vars with identical names
    //    and adjust impl accordingly
    const zip = args.map(x => [x, new FreeVar(x.name)]);
    this.impl = impl.subst(zip) ?? impl;
    this.args = zip.map(x => x[1]);
  }

  reduce (input) {
    if (input.length < this.args.length)
      return null;

    const zip = this.args.map( (x, i) => [x, input[i]] );

    return (this.impl.subst(zip) ?? this.impl).apply(...input.slice(this.args.length));
  }

  subst (list) {
    const change = this.impl.subst(list);
    if (change)
      return new Lambda(this.args, change);
    return null;
  }

  equals (other) {
    if (!(other instanceof Lambda))
      return false;
    if (this.args.length !== other.args.length)
      return false;

    // rename free variables before comparing
    // note that reduce() is destructive, so we have to shallow copy it
    const common = this.args.map((_, i) => new FreeVar('t' + i));

    return other.reduce([...common]).equals(this.reduce([...common]));
  }

  toString () {
    return this.args.join('->') + '->' + this.impl;
  }
}

class Native extends Named {
  /**
   * @desc A term named 'name' that converts next 'arity' arguments into
   *       an expression returned by 'impl' function
   * @param {String} name
   * @param {Number} arity
   * @param {function(...Expr): Expr} impl
   * @param {{note: string?, fast: boolean?}} opt
   */
  constructor (name, arity, impl, opt = {}) {
    super(name);
    this.arity = arity;
    this.impl  = impl;
    if (opt.fast)
      this.fast = true;
    if (opt.note !== undefined)
      this.note = opt.note;
  }

  reduce (args) {
    if (args.length < this.arity)
      return null;
    return this.impl(...args.slice(0, this.arity)).apply(...args.slice(this.arity));
  }
}

class Church extends Native {
  constructor (n) {
    const p = Number.parseInt(n);
    if (!(p >= 0))
      throw new Error('Church number must be a nonnegative integer');
    super('' + p, 2, function (x, y) {
      let expr = y;
      for (let i = p; i-- > 0; )
        expr = x.apply(expr);
      return expr;
    });
    this.n = p;
  }

  equals (other) {
    if (other instanceof Church)
      return this.n === other.n;
    return false;
  }
}

class Alias extends Named {
  /**
   * @desc An existing expression under a different name.
   * @param {String} name
   * @param {Expr} impl
   */
  constructor (name, impl) {
    super(name);
    this.impl = impl;
  }

  expand () {
    return this.impl.expand();
  }

  subst (list) {
    return this.impl.subst(list);
  }

  step () {
    // TODO make it a zero-step change but later (will break App as of current)
    return { expr: this.impl, steps: 1 };
  }

  equals (other) {
    return other.equals(this.impl);
  }

  toString () {
    return this.outdated ? this.impl.toString() : super.toString();
  }
}

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

class Tokenizer {
  constructor (...terms) {
    const src = '$|(\\s+)|' + terms
      .map(s => '(?:' + s + ')')
      .sort((a, b) => b.length - a.length)
      .join('|');
    this.rex = new RegExp(src, 'gys');
  }

  /**
   *
   * @param {string} str
   * @return {string[]}
   */
  split (str) {
    this.rex.lastIndex = 0;
    const list = [...str.matchAll(this.rex)];

    // did we parse everything?
    const eol = list.pop();
    const last = eol?.index ?? 0;

    if (last !== str.length) {
      throw new Error('Unknown tokens at pos ' + last + '/' + str.length
        + ' starting with ' + str.substring(last));
    }

    // skip whitespace
    return list.filter(x => x[1] === undefined).map(x => x[0]);
  }
}

/**
 *
 * @type {{[key: string]: Native}}
 */
const native = {
  I: new Native('I', 1, x => x, { fast: true, note: 'x -> x' }),
  K: new Native('K', 2, (x, _) => x, { fast: true, note: 'x -> y -> x' }),
  S: new Native('S', 3, (x, y, z) => x.apply(z, y.apply(z)), { note: 'x -> y -> z -> x z (y z)' }),
  B: new Native('B', 3, (x, y, z) => x.apply(y.apply(z)), { note: 'x -> y -> z -> x (y z)' }),
  C: new Native('C', 3, (x, y, z) => x.apply(z).apply(y), { note: 'x -> y -> z -> x z y' }),
  W: new Native('W', 2, (x, y) => x.apply(y).apply(y), { note: 'x -> y -> x y y' }),
};

const combChars = new Tokenizer('[()]', '[A-Z]', '[a-z_][a-z_0-9]*', '\\b[0-9]+\\b', '->');

class SKI {
  /**
   *
   * @param {{allow: string?, numbers: boolean?, lambdas: boolean?}} [options]
   */
  constructor (options = {}) {
    this.known = {};

    this.hasNumbers = options.numbers ?? true;
    this.hasLambdas = options.lambdas ?? true;
    this.known = { ...native };
    this.allow = new Set(Object.keys(this.known));
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

  restrict (spec) {
    this.allow = restrict(this.allow, spec);
    return this;
  }

  showRestrict (spec) {
    // TODO separate terms that are not single capital letters with spaces
    return [...restrict(this.allow, spec)].sort().join('');
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
    const lines = source.replace(/\/\/[^\n]*\n/gs, '')
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

    const tokens = combChars.split(source);

    const empty = new Empty();
    /** @type {Expr[]} */
    const stack = [empty];

    for (const c of tokens) {
      // console.log("parseLine: found "+c+"; stack =", stack.join(", "));
      if (c === '(')
        stack.push(empty);
      else if (c === ')') {
        if (stack.length < 2)
          throw new Error('unbalanced input: ' + source);
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
        if (this.known[c] && !opt.allow.has(c)) {
          throw new Error('Term ' + c + ' is not in the restricted set '
            + [...opt.allow].sort().join(' '));
        }
        const x = this.known[c] ?? (vars[c] = vars[c] ?? new FreeVar(c));
        stack.push(f.apply(x));
      }
    }

    if (stack.length !== 1)
      throw new Error('unbalanced input: ' + source);

    return stack.pop().postParse();
  }
}

const tokRestrict = new Tokenizer('[-=+]', '[A-Z]', '\b[a-z_][a-z_0-9]*\b');
function restrict (set, spec) {
  if (!spec)
    return set;
  let out = new Set([...set]);
  let mode = 0;
  const act = [
    sym => { out = new Set([sym]); mode = 1; },
    sym => { out.add(sym); },
    sym => { out.delete(sym); },
  ];
  for (const sym of tokRestrict.split(spec)) {
    if (sym === '=')
      mode = 0;
    else if (sym === '+')
      mode = +1;
    else if (sym === '-')
      mode = 2;
    else
      act[mode](sym);
  }
  return out;
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
SKI.classes = { Expr, Native, Alias, FreeVar, Lambda };
for (const name in native)
  SKI[name] = native[name];

module.exports = { SKI };
