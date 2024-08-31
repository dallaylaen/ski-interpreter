/*
 * ATTENTION: The "eval" devtool has been used (maybe by default in mode: "development").
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ "./index.js":
/*!******************!*\
  !*** ./index.js ***!
  \******************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

eval("const ski = __webpack_require__(/*! ./lib/parser */ \"./lib/parser.js\");\nconst quest = __webpack_require__(/*! ./lib/quest */ \"./lib/quest.js\");\n\nmodule.exports = { ...ski, ...quest };\nif (typeof window !== 'undefined') {\n  window.SKI = ski.SKI;\n  window.SKI.Quest = quest.Quest;\n}\n\n\n//# sourceURL=webpack://ski-interpreter/./index.js?");

/***/ }),

/***/ "./lib/expr.js":
/*!*********************!*\
  !*** ./lib/expr.js ***!
  \*********************/
/***/ ((module) => {

eval("class Expr {\n  constructor () {\n    if (new.target === Expr)\n      throw new Error('Attempt to instantiate abstract class Expr');\n  }\n\n  /**\n     * postprocess term after parsing. typically return self but may return other term or die\n     * @return {Expr}\n     */\n  postParse () {\n    return this;\n  }\n\n  /**\n     * @desc apply self to zero or more terms and return the resulting term,\n     * without performing any calculations whatsoever\n     * @param {Expr} args\n     * @return {Expr}\n     */\n  apply (...args) {\n    return args.length > 0 ? new App(this, ...args) : this;\n  }\n\n  /**\n     * expand all terms but don't perform any calculations\n     * @return {Expr}\n     */\n  expand () {\n    return this;\n  }\n\n  /**\n     * Apply self to list of given args.\n     * Normally, only native combinators know how to do it.\n     * @param {Expr[]} args\n     * @return {Expr|null}\n     */\n  reduce (args) {\n    return null;\n  }\n\n  /**\n     * Replace all instances of free vars with corresponding values and return the resulting expression.\n     * return nulls if no changes could be made, just like step() does, to save memory.\n     * @param {[replace: FreeVar, withValue: Expr][]} list\n     * @return {Expr|null}\n     */\n  subst (list) {\n    return null;\n  }\n\n  /**\n     * @desc iterate one step of calculation in accordance with known rules.\n     *       return the new expression if reduction was possible. or null otherwise\n     * @return {{expr: Expr, steps: number}}\n     */\n  step () { return { steps: 0, expr: this } }\n\n  /**\n     * @desc Run uninterrupted sequence of step() applications\n     *       until the expression is irreducible, or max number of steps is reached.\n     *       Default number of steps = 1000.\n     * @param {{max: number?, steps: number?, throw: boolean?}|Expr} [opt]\n     * @param {Expr} args\n     * @return {{expr: Expr, steps: number, final: boolean}}\n     */\n  run (opt = {}, ...args) {\n    if (opt instanceof Expr) {\n      args.unshift(opt);\n      opt = {};\n    }\n    let expr = args ? this.apply(...args) : this;\n    let steps = opt.steps ?? 0;\n    const max = (opt.max ?? 1000) + steps;\n    let final = false;\n    for (; steps < max; ) {\n      const next = expr.step();\n      if (next.steps === 0) {\n        final = true;\n        break;\n      }\n      steps += next.steps;\n      expr = next.expr;\n    }\n    if (opt.throw && !final)\n      throw new Error('Failed to compute expression in ' + max + ' steps');\n    return { final, steps, expr };\n  }\n\n  /**\n     * Execute step() while possible, yielding a brief description of events after each step.\n     * Mnemonics: like run() but slower.\n     * @param {{max: number?}} options\n     * @return {IterableIterator<{final: boolean, expr: Expr, steps: number}>}\n     */\n  * walk (options = {}) {\n    const max = options.max ?? Infinity;\n    let steps = 0;\n    let expr = this;\n    let final = false;\n\n    while (steps < max) {\n      const next = expr.step();\n      if (next.steps === 0)\n        final = true;\n      yield { expr, steps, final };\n      if (final)\n        break;\n      steps += next.steps;\n      expr = next.expr;\n    }\n  }\n\n  /**\n     *\n     * @param {Expr} other\n     * @return {boolean}\n     */\n  equals (other) {\n    return this === other;\n  }\n\n  expect (other) {\n    if (!(other instanceof Expr))\n      throw new Error('Attempt to expect a combinator to equal something else: ' + other);\n    if (this.equals(other))\n      return;\n\n    // TODO wanna use AssertionError but webpack doesn't recognize it\n    // still the below hack works for mocha-based tests.\n    const poorMans = new Error('Found term ' + this + ' but expected ' + other);\n    poorMans.expected = other.toString();\n    poorMans.actual = this.toString();\n    throw poorMans;\n  }\n\n  /**\n   * @param {{terse: boolean?}} options\n   * @return {string} string representation of the expression\n   */\n  toString (options = {}) {\n    // uncomment the following line if you want to debug the parser with prints\n    // return this.constructor.name\n    throw new Error( 'No toString() method defined in class ' + this.constructor.name );\n  }\n\n  toJSON () {\n    return this.expand().toString({ terse: false });\n  }\n}\n\nconst needSpace = new Set([8 * 2 + 1, 8 * 2 + 2, 8 * 3 + 2]);\n\nclass App extends Expr {\n  /**\n     * @desc Application of fun() to args\n     * @param {Expr} fun\n     * @param {Expr} args\n     */\n  constructor (fun, ...args) {\n    super();\n    this.fun = fun;\n    this.args = args;\n    this.final = false;\n  }\n\n  apply (...args) {\n    if (args.length === 0)\n      return this;\n    return this.fun.apply( ...this.args, ...args);\n  }\n\n  expand () {\n    return this.fun.expand().apply(...this.args.map(x => x.expand()));\n  }\n\n  subst (list) {\n    const fun = this.fun.subst(list);\n    let change = fun === null ? 0 : 1;\n    const args = [];\n    for (const x of this.args) {\n      const next = x.subst(list);\n      if (next === null)\n        args.push(x);\n      else {\n        args.push(next);\n        change++;\n      }\n    }\n\n    return change ? (fun ?? this.fun).apply(...args) : null;\n  }\n\n  /**\n     * @desc Recursively calculates all terms in the expression. If nothing has to be done,\n     * tries to apply the first n-ary term to first n arguments.\n     * @return {{expr: Expr, steps: number}}\n     */\n  step () {\n    if (this.final)\n      return { expr: this, steps: 0 };\n\n    // first try to cut off some subtrees so we don't need to calculate them at all\n    if (this.fun.fast) {\n      const maybe = this.fun.reduce(this.args);\n      if (maybe)\n        return { expr: maybe, steps: 1 };\n    }\n\n    // now try recursing\n    let change = 0;\n\n    // TODO must be inefficient, rewrite later\n    const acc = next => { change += next.steps; return next.expr };\n\n    // if subtrees changed, return new self\n    const fun = acc(this.fun.step());\n    const args = this.args.map(term => acc(term.step()));\n\n    if (change)\n      return { expr: fun.apply(...args), steps: change };\n\n    // if nothing has changed, but the fun knows how to proceed, let it do the stuff\n    const reduced = this.fun.reduce(this.args);\n    if (reduced)\n      return { expr: reduced, steps: 1 };\n\n    // no more reductions can be made\n    this.final = true;\n    return { expr: this, steps: 0 };\n  }\n\n  equals (other) {\n    if (!(other instanceof App))\n      return false;\n    if (other.args.length !== this.args.length)\n      return false;\n    if (!this.fun.equals(other.fun))\n      return false;\n    for (let i = 0; i < this.args.length; i++) {\n      if (!this.args[i].equals(other.args[i]))\n        return false;\n    }\n    return true;\n  }\n\n  toString (opt = {}) {\n    if (opt.terse) {\n      const out = [];\n\n      let oldType = 1 << 3; // Type: 1 = uppercase 1-letter, 2 = lowercase id/number, 3 = in parens\n\n      for (const term of [this.fun, ...this.args]) {\n        let s = term.toString(opt);\n        let newType;\n        if (s.match(/^[A-Z]$/))\n          newType = 1;\n        else if (s.match(/^[a-z_0-9]+$/))\n          newType = 2;\n        else {\n          newType = 3;\n          if (out.length !== 0 || term instanceof Lambda)\n            s = '(' + s + ')';\n        }\n        if (needSpace.has(oldType | newType))\n          out.push(' ');\n        out.push(s);\n        oldType = newType << 3;\n      }\n      return out.join('');\n    } else {\n      const root = this.fun instanceof Lambda ? '(' + this.fun + ')' : this.fun + '';\n      return root + this.args.map(x => '(' + x + ')').join('');\n    }\n  }\n}\n\nclass Named extends Expr {\n  /**\n     * @desc a constant named 'name'\n     * @param {String} name\n     */\n  constructor (name) {\n    super();\n    if (typeof name !== 'string' || name.length === 0)\n      throw new Error('Attempt to create a named term with improper name');\n    this.name = name;\n  }\n\n  toString () {\n    return this.name;\n  }\n}\n\nclass FreeVar extends Named {\n  subst (list) {\n    for (const item of list)\n      if (this === item[0]) return item[1];\n    return null;\n  }\n}\n\nclass Lambda extends Expr {\n  /**\n     * @param {FreeVar[]} args\n     * @param {Expr} impl\n     */\n  constructor (args, impl) {\n    // check args before everything\n    if (args.length === 0)\n      throw new Error('empty argument list in lambda');\n\n    const [my, ...tail] = args;\n\n    if (tail.length > 0) {\n      const known = new Set([my.name]);\n      for (const x of tail) {\n        if (known.has(x.name))\n          throw new Error('Duplicate free var name ' + x + ' in lambda expression');\n        known.add(x.name);\n      }\n      while (tail.length > 0) {\n        // TODO keep track of arity to speed up execution\n        impl = new Lambda([tail.pop()], impl);\n      }\n    }\n\n    super();\n\n    // We don't know where args come from and whether they are used elsewhere.\n    // So, replace them with fresh free vars with identical names\n    //    and adjust impl accordingly\n    const rename = new FreeVar(my.name);\n    this.impl = impl.subst([[my, rename]]) ?? impl;\n    this.args = [rename];\n  }\n\n  reduce (input) {\n    if (input.length < this.args.length)\n      return null;\n\n    const zip = this.args.map( (x, i) => [x, input[i]] );\n\n    return (this.impl.subst(zip) ?? this.impl).apply(...input.slice(this.args.length));\n  }\n\n  subst (list) {\n    const change = this.impl.subst(list);\n    if (change)\n      return new Lambda(this.args, change);\n    return null;\n  }\n\n  equals (other) {\n    if (!(other instanceof Lambda))\n      return false;\n    if (this.args.length !== other.args.length)\n      return false;\n\n    // rename free variables before comparing\n    // note that reduce() is destructive, so we have to shallow copy it\n    const common = this.args.map((_, i) => new FreeVar('t' + i));\n\n    return other.reduce([...common]).equals(this.reduce([...common]));\n  }\n\n  toString (opt = {}) {\n    return this.args.join('->') + '->' + this.impl.toString(opt);\n  }\n}\n\nclass Native extends Named {\n  /**\n     * @desc A term named 'name' that converts next 'arity' arguments into\n     *       an expression returned by 'impl' function\n     * @param {String} name\n     * @param {Number} arity\n     * @param {function(...Expr): Expr} impl\n     * @param {{note: string?, fast: boolean?}} opt\n     */\n  constructor (name, arity, impl, opt = {}) {\n    super(name);\n    this.arity = arity;\n    this.impl  = impl;\n    if (opt.fast)\n      this.fast = true;\n    if (opt.note !== undefined)\n      this.note = opt.note;\n  }\n\n  reduce (args) {\n    if (args.length < this.arity)\n      return null;\n    return this.impl(...args.slice(0, this.arity)).apply(...args.slice(this.arity));\n  }\n\n  toJSON () {\n    return 'Native:' + this.name;\n  }\n}\n\nclass Church extends Native {\n  constructor (n) {\n    const p = Number.parseInt(n);\n    if (!(p >= 0))\n      throw new Error('Church number must be a nonnegative integer');\n    super('' + p, 2, function (x, y) {\n      let expr = y;\n      for (let i = p; i-- > 0; )\n        expr = x.apply(expr);\n      return expr;\n    });\n    this.n = p;\n  }\n\n  equals (other) {\n    if (other instanceof Church)\n      return this.n === other.n;\n    return false;\n  }\n}\n\nclass Alias extends Named {\n  /**\n     * @desc An existing expression under a different name.\n     * @param {String} name\n     * @param {Expr} impl\n     */\n  constructor (name, impl) {\n    super(name);\n    this.impl = impl;\n  }\n\n  expand () {\n    return this.impl.expand();\n  }\n\n  subst (list) {\n    return this.impl.subst(list);\n  }\n\n  step () {\n    // TODO make it a zero-step change but later (will break App as of current)\n    return { expr: this.impl, steps: 1 };\n  }\n\n  equals (other) {\n    return other.equals(this.impl);\n  }\n\n  toString (opt) {\n    return this.outdated ? this.impl.toString(opt) : super.toString(opt);\n  }\n}\n\n/**\n *\n * @type {{[key: string]: Native}}\n */\nconst native = {\n  I: new Native('I', 1, x => x, { fast: true, note: 'x -> x' }),\n  K: new Native('K', 2, (x, _) => x, { fast: true, note: 'x -> y -> x' }),\n  S: new Native('S', 3, (x, y, z) => x.apply(z, y.apply(z)), { note: 'x -> y -> z -> x z (y z)' }),\n  B: new Native('B', 3, (x, y, z) => x.apply(y.apply(z)), { note: 'x -> y -> z -> x (y z)' }),\n  C: new Native('C', 3, (x, y, z) => x.apply(z).apply(y), { note: 'x -> y -> z -> x z y' }),\n  W: new Native('W', 2, (x, y) => x.apply(y).apply(y), { note: 'x -> y -> x y y' }),\n};\n\nmodule.exports = { Expr, App, FreeVar, Lambda, Native, Alias, Church, native };\n\n\n//# sourceURL=webpack://ski-interpreter/./lib/expr.js?");

/***/ }),

/***/ "./lib/parser.js":
/*!***********************!*\
  !*** ./lib/parser.js ***!
  \***********************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

eval("/**\n * Combinatory logic simulator\n */\n\nconst { Tokenizer, restrict } = __webpack_require__(/*! ./util */ \"./lib/util.js\");\nconst { Expr, App, FreeVar, Lambda, Native, Alias, Church, native } = __webpack_require__(/*! ./expr */ \"./lib/expr.js\");\n\nclass Empty extends Expr {\n  apply (...args) {\n    return args.length ? args.shift().apply(...args) : this;\n  }\n\n  postParse () {\n    throw new Error('Attempt to use empty expression () as a term');\n  }\n}\n\nclass PartialLambda extends Empty {\n  // TODO mutable! rewrite ro when have time\n  constructor (term, known = {}) {\n    super();\n    this.impl = new Empty();\n    if (term instanceof FreeVar)\n      this.terms = [term];\n    else if (term instanceof PartialLambda) {\n      if (!(term.impl instanceof FreeVar))\n        throw new Error('Expected FreeVar->...->FreeVar->Expr');\n      this.terms = [...term.terms, term.impl];\n    } else\n      throw new Error('Expected FreeVar or PartialLambda');\n  }\n\n  apply (term, ...tail) {\n    if (term === null || tail.length !== 0 )\n      throw new Error('bad syntax in partial lambda expr');\n    this.impl = this.impl.apply(term);\n    return this;\n  }\n\n  postParse () {\n    return new Lambda(this.terms, this.impl);\n  }\n\n  // uncomment if debugging with prints\n  /* toString () {\n    return this.terms.join('->') + '->' + (this.impl ?? '???');\n  } */\n}\n\nconst combChars = new Tokenizer('[()]', '[A-Z]', '[a-z_][a-z_0-9]*', '\\\\b[0-9]+\\\\b', '->');\n\nclass SKI {\n  /**\n   *\n   * @param {{\n   *    allow: string?,\n   *    numbers: boolean?,\n   *    lambdas: boolean?,\n   *    terms: { [key: string]: Expr|string}?\n   * }} [options]\n   */\n  constructor (options = {}) {\n    this.known = { ...native };\n    this.hasNumbers = true;\n    this.hasLambdas = true;\n    this.allow = new Set(Object.keys(this.known));\n\n    // Import terms, if any. Omit native ones\n    for (const name in options.terms ?? {}) {\n      // Native terms already handled by allow\n      if (!options.terms[name].match(/^Native:/))\n        this.add(name, options.terms[name]);\n    }\n\n    // Finally, impose restrictions\n    // We must do it after recreating terms, or else terms reliant on forbidden terms will fail\n    this.hasNumbers = options.numbers ?? true;\n    this.hasLambdas = options.lambdas ?? true;\n    if (options.allow)\n      this.restrict(options.allow);\n  }\n\n  /**\n   *\n   * @param {String} name\n   * @param {Expr|String|[number, function(...Expr): Expr, {note: string?, fast: boolean?}]} impl\n   * @param {String} [note]\n   * @return {SKI} chainable\n   */\n  add (name, impl, note ) {\n    if (typeof impl === 'string')\n      impl = new Alias( name, this.parseLine(impl));\n    else if (impl instanceof Expr)\n      impl = new Alias( name, impl );\n    else\n      throw new Error('add: impl must be an Expr or a string');\n\n    if (note !== undefined)\n      impl.note = note;\n    this.known[name] = impl;\n    this.allow.add(name);\n\n    return this;\n  }\n\n  maybeAdd (name, impl) {\n    if (this.known[name])\n      this.allow.add(name);\n    else\n      this.add(name, impl);\n    return this;\n  }\n\n  /**\n   * Restrict the interpreter to given terms. Terms prepended with '+' will be added\n   * and terms preceeded with '-' will be removed.\n   * @example ski.restrict('SK') // use the basis\n   * @example ski.restrict('+I') // allow I now\n   * @example ski.restrict('-SKI +BCKW' ); // switch basis\n   * @example ski.restrict('-foo -bar'); // forbid some user functions\n   * @param {string} spec\n   * @return {SKI} chainable\n   */\n  restrict (spec) {\n    this.allow = restrict(this.allow, spec);\n    return this;\n  }\n\n  /**\n   *\n   * @param {string} spec\n   * @return {string}\n   */\n  showRestrict (spec = '+') {\n    const out = [];\n    let prevShort = true;\n    for (const term of [...restrict(this.allow, spec)].sort()) {\n      const nextShort = term.match(/^[A-Z]$/);\n      if (out.length && !(prevShort && nextShort))\n        out.push(' ');\n      out.push(term);\n      prevShort = nextShort;\n    }\n    return out.join('');\n  }\n\n  /**\n   *\n   * @param {String} name\n   * @return {SKI}\n   */\n  remove (name) {\n    this.known[name].outdated = true;\n    delete this.known[name];\n    this.allow.delete(name);\n    return this;\n  }\n\n  /**\n   *\n   * @return {{[key:string]: Expr}}\n   */\n  getTerms () {\n    const out = {};\n    for (const name of Object.keys(this.known)) {\n      if (this.allow.has(name))\n        out[name] = this.known[name];\n    }\n    return out;\n  }\n\n  /**\n   *\n   * @param {string} source\n   * @param {{[keys: string]: Expr}} vars\n   * @param {{numbers: boolean?, lambdas: boolean?, allow: string?}} options\n   * @return {Expr}\n   */\n  parse (source, vars = {}, options = {}) {\n    const lines = source.replace(/\\/\\/[^\\n]*\\n/gs, '')\n      .split(/\\s*;[\\s;]*/).filter( s => s.match(/\\S/));\n\n    const jar = { ...vars };\n\n    let expr = new Empty();\n    for (const item of lines) {\n      const [_, save, str] = item.match(/^(?:\\s*([A-Z]|[a-z][a-z_0-9]*)\\s*=\\s*)?(.*)$/s);\n      if (expr instanceof Alias)\n        expr.outdated = true;\n      expr = this.parseLine(str, jar, options);\n\n      if (save !== undefined) {\n        if (jar[save] !== undefined)\n          throw new Error('Attempt to redefine a known term: ' + save);\n        expr = new Alias(save, expr);\n        jar[save] = expr;\n      }\n    }\n\n    // reimport free variables, so that co-parsing x(y(z)) and z(x(y)) with the same jar\n    //     results in _equal_ free vars and not just ones with the same name\n    for (const name in jar) {\n      if (!vars[name] && jar[name] instanceof SKI.classes.FreeVar)\n        vars[name] = jar[name];\n    }\n\n    return expr;\n  }\n\n  /**\n   *\n   * @param {String} source S(KI)I\n   * @param {{[keys: string]: Expr}} vars\n   * @param {{numbers: boolean?, lambdas: boolean?, allow: string?}} options\n   * @return {Expr} parsed expression\n   */\n  parseLine (source, vars = {}, options = {}) {\n    const opt = {\n      numbers: options.numbers ?? this.hasNumbers,\n      lambdas: options.lambdas ?? this.hasLambdas,\n      allow:   restrict(this.allow, options.allow),\n    };\n\n    const tokens = combChars.split(source);\n\n    const empty = new Empty();\n    /** @type {Expr[]} */\n    const stack = [empty];\n\n    for (const c of tokens) {\n      // console.log(\"parseLine: found \"+c+\"; stack =\", stack.join(\", \"));\n      if (c === '(')\n        stack.push(empty);\n      else if (c === ')') {\n        if (stack.length < 2)\n          throw new Error('unbalanced input: ' + source);\n        const x = stack.pop().postParse();\n        const f = stack.pop();\n        stack.push(f.apply(x));\n      } else if (c === '->') {\n        if (!opt.lambdas)\n          throw new Error('Lambdas not supported, allow them explicitly');\n        stack.push(new PartialLambda(stack.pop(), vars));\n      } else if (c.match(/^[0-9]+$/)) {\n        if (!opt.numbers)\n          throw new Error('Church numbers not supported, allow them explicitly');\n        const f = stack.pop();\n        stack.push(f.apply(new Church(c)));\n      } else {\n        const f = stack.pop();\n        if (this.known[c] && !opt.allow.has(c)) {\n          throw new Error('Term ' + c + ' is not in the restricted set '\n            + [...opt.allow].sort().join(' '));\n        }\n        const x = this.known[c] ?? (vars[c] = vars[c] ?? new FreeVar(c));\n        stack.push(f.apply(x));\n      }\n    }\n\n    if (stack.length !== 1)\n      throw new Error('unbalanced input: ' + source);\n\n    return stack.pop().postParse();\n  }\n\n  toJSON () {\n    return {\n      allow:   this.showRestrict('+'),\n      numbers: this.hasNumbers,\n      lambdas: this.hasLambdas,\n      terms:   this.getTerms(),\n    }\n  }\n}\n\n// Create shortcuts for common terms\n/**\n * Create free var(s) for subsequent use\n * @param {String} names\n * @return {FreeVar[]}\n */\nSKI.free = (...names) => names.map(s => new FreeVar(s));\n\n/**\n * Convert a number to Church encoding\n * @param {number} n\n * @return {Church}\n */\nSKI.church = n => new Church(n);\nSKI.classes = { Expr, Native, Alias, FreeVar, Lambda };\nfor (const name in native)\n  SKI[name] = native[name];\n\nmodule.exports = { SKI };\n\n\n//# sourceURL=webpack://ski-interpreter/./lib/parser.js?");

/***/ }),

/***/ "./lib/quest.js":
/*!**********************!*\
  !*** ./lib/quest.js ***!
  \**********************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

eval("const { SKI } = __webpack_require__(/*! ./parser */ \"./lib/parser.js\");\nconst { Expr, FreeVar, Alias, Lambda } = SKI.classes;\n\nclass Quest {\n  /**\n   *\n   * @param {{\n   *    title: string?,\n   *    descr: string?,\n   *    subst: string?,\n   *    allow: string?,\n   *    numbers: boolean?,\n   *    vars: string[]?,\n   *    engine: SKI?,\n   *    engineFull: SKI?,\n   *    cases: [{max: number?, note: string?, feedInput: boolean, lambdas: boolean?}|string[], ...string[][]]?\n   * }} options\n   */\n  constructor (options = {}) {\n    const { title, descr, allow, numbers, vars, cases, lambdas, subst, engine, engineFull, ...meta } = options;\n\n    //\n    this.engine = engine ?? new SKI();\n    this.engineFull = engineFull ?? new SKI();\n    this.restrict = { allow, numbers: numbers ?? false, lambdas: lambdas ?? false };\n    this.vars = {};\n    this.subst = subst ?? 'f';\n\n    // options.vars is a list of expressions.\n    // we suck all free variables + all term declarations from there into this.vars\n    // to feed it later to every case's parser.\n    if (vars) {\n      for (const term of vars) {\n        const expr = this.engineFull.parse(term, this.vars);\n        if (expr instanceof SKI.classes.Alias)\n          this.vars[expr.name] = expr.impl;\n      }\n    }\n\n    this.cases = [];\n    this.title = title;\n    this.descr = Array.isArray(descr) ? descr.join(' ') : descr;\n    this.meta = meta;\n\n    for (const c of cases ?? [])\n      this.add(...c);\n  }\n\n  /**\n   *\n   * @param {{} | string} opt\n   * @param {string} terms\n   * @return {Quest}\n   */\n  add (opt, ...terms) {\n    if (typeof opt === 'string') {\n      terms.unshift(opt);\n      opt = {};\n    }\n\n    this.cases.push(new Case(terms, opt, this.vars, this.engineFull));\n    return this;\n  }\n\n  /**\n   *\n   * @param {Expr|string} input\n   * @return {{\n   *             expr: Expr?,\n   *             pass: boolean,\n   *             details: {pass: boolean, steps: number, found: Expr, expected: Expr, start: Expr?, args: Expr[]?}[],\n   *             exception: Error?\n   *         }}\n   */\n  check (input) {\n    try {\n      let expr = (typeof input === 'string') ? this.engine.parse(input, this.vars, this.restrict) : input;\n      if (this.subst)\n        expr = new Alias(this.subst, expr);\n      const details = this.cases.map( c => c.check(expr) );\n      const pass = details.reduce((acc, val) => acc && val.pass, true);\n      return { expr, pass, details };\n    } catch (e) {\n      return { pass: false, details: [], exception: e };\n    }\n  }\n\n  /**\n     *\n     * @return {TestCase[]}\n     */\n  show () {\n    return [...this.cases];\n  }\n}\n\nclass Case {\n  /**\n   *\n   * @param {[input: string, e1: string, e2: string]}terms\n   * @param {{max: number?, note: string?}} options\n   * @param {{[key: string]: Expr}} vars\n   * @param {SKI} engine\n   */\n  constructor (terms, options = {}, vars = {}, engine = new SKI()) {\n    if (terms.length !== 2)\n      throw new Error('Case accepts exactly 2 strings');\n\n    const [e1, e2] = terms;\n\n    this.max = options.max ?? 1000;\n    this.note = options.note;\n\n    vars = { ...vars }; // shallow copy of self\n    const prepare = src =>\n      engine.parse(src, vars).run({ max: this.max, throw: true }).expr;\n\n    this.e1 = prepare(e1);\n    this.e2 = prepare(e2);\n  }\n\n  check (expr) {\n    const subst = (outer, inner) => outer.reduce([inner]) ?? outer.apply(inner);\n\n    const e1 = subst(this.e1, expr);\n    const r1 = e1.expand().run({ max: this.max });\n    const r2 = subst(this.e2, expr).expand().run({ max: this.max });\n\n    return {\n      pass:     r1.final && r2.final && r1.expr.equals(r2.expr),\n      steps:    r1.steps + r2.steps,\n      start:    e1,\n      found:    r1.expr,\n      expected: r2.expr,\n      note:     this.note,\n      args:     [],\n    }\n  }\n}\n\nmodule.exports = { Quest };\n\n\n//# sourceURL=webpack://ski-interpreter/./lib/quest.js?");

/***/ }),

/***/ "./lib/util.js":
/*!*********************!*\
  !*** ./lib/util.js ***!
  \*********************/
/***/ ((module) => {

eval("class Tokenizer {\n  constructor (...terms) {\n    const src = '$|(\\\\s+)|' + terms\n      .map(s => '(?:' + s + ')')\n      .sort((a, b) => b.length - a.length)\n      .join('|');\n    this.rex = new RegExp(src, 'gys');\n  }\n\n  /**\n     *\n     * @param {string} str\n     * @return {string[]}\n     */\n  split (str) {\n    this.rex.lastIndex = 0;\n    const list = [...str.matchAll(this.rex)];\n\n    // did we parse everything?\n    const eol = list.pop();\n    const last = eol?.index ?? 0;\n\n    if (last !== str.length) {\n      throw new Error('Unknown tokens at pos ' + last + '/' + str.length\n                + ' starting with ' + str.substring(last));\n    }\n\n    // skip whitespace\n    return list.filter(x => x[1] === undefined).map(x => x[0]);\n  }\n}\n\nconst tokRestrict = new Tokenizer('[-=+]', '[A-Z]', '\\\\b[a-z_][a-z_0-9]*\\\\b');\nfunction restrict (set, spec) {\n  if (!spec)\n    return set;\n  let out = new Set([...set]);\n  let mode = 0;\n  const act = [\n    sym => { out = new Set([sym]); mode = 1; },\n    sym => { out.add(sym); },\n    sym => { out.delete(sym); },\n  ];\n  for (const sym of tokRestrict.split(spec)) {\n    if (sym === '=')\n      mode = 0;\n    else if (sym === '+')\n      mode = +1;\n    else if (sym === '-')\n      mode = 2;\n    else\n      act[mode](sym);\n  }\n  return out;\n}\n\nmodule.exports = { Tokenizer, restrict };\n\n\n//# sourceURL=webpack://ski-interpreter/./lib/util.js?");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__("./index.js");
/******/ 	
/******/ })()
;