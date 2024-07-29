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

eval("const ski = __webpack_require__(/*! ./lib/ski */ \"./lib/ski.js\");\nconst quest = __webpack_require__(/*! ./lib/quest */ \"./lib/quest.js\");\n\nmodule.exports = { ...ski, ...quest };\nif (typeof window !== 'undefined') {\n  window.SKI = ski.SKI;\n  window.SKI.Quest = quest.Quest;\n}\n\n\n//# sourceURL=webpack://ski-interpreter/./index.js?");

/***/ }),

/***/ "./lib/quest.js":
/*!**********************!*\
  !*** ./lib/quest.js ***!
  \**********************/
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

eval("const { SKI } = __webpack_require__(/*! ./ski */ \"./lib/ski.js\");\n\nclass Quest {\n  /**\n     *\n     * @param {{title:string?, descr:string?, allow: string?, numbers: boolean?}} options\n     * @param {[Object|string, ...string[]]} cases\n     */\n  constructor (options = {}, ...cases) {\n    this.engine = new SKI({ allow: options.allow, numbers: options.numbers });\n    this.vars = {};\n    this.cases = [];\n    this.title = options.title;\n    this.descr = options.descr;\n\n    for (const c of cases)\n      this.add(...c);\n  }\n\n  /**\n     *\n     * @param {{note: string?, max: number?}|string} opt\n     * @param {String} terms\n     * @return {Quest}\n     */\n  add (opt = {}, ...terms) {\n    if (typeof opt === 'string') {\n      terms.unshift(opt);\n      opt = {};\n    }\n\n    if (terms.length < 1)\n      throw new Error('Too little data for a testcase');\n\n    this.cases.push( new TestCase(this.engine, this.vars, opt, terms.shift(), ...terms) );\n    return this;\n  }\n\n  /**\n     *\n     * @param {Ast|string} expr\n     * @return {{pass: boolean, details: {pass: boolean, count: number, found: Ast, expected: Ast, args: Ast[]}[]}}\n     */\n  check (expr) {\n    if (typeof expr === 'string')\n      expr = this.engine.parse(expr);\n    const details = this.cases.map( c => c.check(expr) );\n    const pass = details.reduce((acc, val) => acc && val.pass, true);\n    return { pass, details };\n  }\n\n  /**\n     *\n     * @return {TestCase[]}\n     */\n  show () {\n    return [...this.cases];\n  }\n}\n\nclass TestCase {\n  /**\n     *\n     * @param {SKI} ski\n     * @param {Object}vars\n     * @param {{max: number?, note: string?}}options\n     * @param {string} expect\n     * @param {string} terms\n     */\n  constructor (ski, vars, options, expect, ...terms) {\n    this.expect = ski.parse(expect, vars);\n    this.max = options.max;\n    this.note = options.note;\n    this.args = terms.map(s => ski.parse(s, vars));\n  }\n\n  /**\n     *\n     * @param {Ast} expr\n     * @return {{args: Ast[], found: Ast, pass: boolean, expected: Ast, count: number}}\n     */\n  check (expr) {\n    const found = expr.run({ max: this.max }, ...this.args);\n    return {\n      pass:     found.final && this.expect.equals(found.result),\n      count:    found.steps,\n      found:    found.result,\n      expected: this.expect,\n      args:     this.args,\n    };\n  }\n}\n\nmodule.exports = { Quest };\n\n\n//# sourceURL=webpack://ski-interpreter/./lib/quest.js?");

/***/ }),

/***/ "./lib/ski.js":
/*!********************!*\
  !*** ./lib/ski.js ***!
  \********************/
/***/ ((module) => {

eval("/**\n * Combinatory logic simulator\n */\n\nclass Ast {\n  /**\n   * @desc apply self to zero or more terms and return the resulting term,\n   * without performing any calculations whatsoever\n   * @param {Ast} args\n   * @return {Ast}\n   */\n  apply (...args) {\n    return args.length > 0 ? new App(this, ...args) : this;\n  }\n\n  /**\n   * expand all terms but don't perform any calculations\n   * @return {Ast}\n   */\n  expand () {\n    return this;\n  }\n\n  /**\n   * Apply self to list of given args.\n   * Normally, only native combinators know how to do it.\n   * @param {Ast[]} args\n   * @return {Ast|null}\n   */\n  reduce (args) {\n    return null;\n  }\n\n  /**\n   * @desc iterate one step of calculation in accordance with known rules.\n   *       return the new expression if reduction was possible. or null otherwise\n   * @return {Ast|null}\n   */\n  step () { return null }\n\n  /**\n   * @desc Run uninterrupted sequence of step() applications\n   *       until the expression is irreducible, or max number of steps is reached.\n   *       Default number of steps = 1000.\n   * @param {{max: number?, count: number?}|Ast} [opt]\n   * @param {Ast} args\n   * @return {{result: Ast, steps: number, final: boolean}}\n   */\n  run (opt = {}, ...args) {\n    if (opt instanceof Ast) {\n      args.unshift(opt);\n      opt = {};\n    }\n    let expr = args ? this.apply(...args) : this;\n    let steps = opt.count ?? 0;\n    const max = (opt.max ?? 1000) + steps;\n    let final = false;\n    for (; steps < max; steps++ ) {\n      const next = expr.step();\n      if (!next) {\n        final = true;\n        break;\n      }\n      expr = next;\n    }\n    return { final, steps, result: expr };\n  }\n\n  isNative () { return false; }\n\n  /**\n   *\n   * @param {Ast} other\n   * @return {boolean}\n   */\n  equals (other) {\n    return this === other;\n  }\n\n  /**\n   * @return {string} string representation of the expression\n   */\n  toString () {\n    throw new Error( 'toString() undefined for generic AST' );\n  }\n}\n\nclass App extends Ast {\n  /**\n   * @desc Application of fun() to args\n   * @param {Ast} fun\n   * @param {Ast} args\n   */\n  constructor (fun, ...args) {\n    super();\n    this.fun = fun;\n    this.args = args;\n    this.final = false;\n  }\n\n  apply (...args) {\n    if (args.length === 0)\n      return this;\n    return this.fun.apply( ...this.args, ...args);\n  }\n\n  expand () {\n    return this.fun.expand().apply(...this.args.map(x => x.expand()));\n  }\n\n  /**\n   * @desc Recursively calculates all terms in the expression. If nothing has to be done,\n   * tries to apply the first n-ary term to first n arguments.\n   * @return {Ast|null}\n   */\n  step () {\n    if (this.final)\n      return null;\n\n    // first try to cut off some subtrees so we don't need to calculate them at all\n    if (this.fun.fast) {\n      const maybe = this.fun.reduce(this.args);\n      if (maybe)\n        return maybe;\n    }\n\n    // if subtrees changed, return new self\n    const fun = this.fun.step();\n    let change = fun ? 1 : 0;\n\n    const args = [];\n    for (const x of this.args) {\n      const next = x.step();\n      args.push(next ?? x);\n      if (next)\n        change++;\n    }\n\n    if (change)\n      return (fun ?? this.fun).apply(...args);\n\n    // if nothing has changed, but the fun knows how to proceed, let it do stuff\n    const reduced = this.fun.reduce(this.args);\n    if (reduced)\n      return reduced;\n\n    // no more reductions can be made\n    this.final = true;\n    return null;\n  }\n\n  equals (other) {\n    if (!(other instanceof App))\n      return false;\n    if (other.args.length !== this.args.length)\n      return false;\n    if (!this.fun.equals(other.fun))\n      return false;\n    for (let i = 0; i < this.args.length; i++) {\n      if (!this.args[i].equals(other.args[i]))\n        return false;\n    }\n    return true;\n  }\n\n  toString () {\n    return this.fun.toString() + this.args.map(x => '(' + x + ')').join('');\n  }\n}\n\nclass FreeVar extends Ast {\n  /**\n   * @desc a constant named 'name'\n   * @param {String} name\n   */\n  constructor (name) {\n    super();\n    this.name = name;\n  }\n\n  toString () {\n    return this.name;\n  }\n}\n\nclass Native extends FreeVar {\n  /**\n   * @desc A term named 'name' that converts next 'arity' arguments into\n   *       an expression returned by 'impl' function\n   * @param {String} name\n   * @param {Number} arity\n   * @param {function(...Ast): Ast} impl\n   * @param {{note: string?, fast: boolean?}} opt\n   */\n  constructor (name, arity, impl, opt = {}) {\n    super(name);\n    this.arity = arity;\n    this.impl  = impl;\n    if (opt.fast)\n      this.fast = true;\n    if (opt.note !== undefined)\n      this.note = opt.note;\n  }\n\n  reduce (args) {\n    if (args.length < this.arity)\n      return null;\n    const tail = args.splice(this.arity);\n    return this.impl(...args).apply(...tail);\n  }\n\n  isNative () {\n    return true;\n  }\n}\n\nclass Church extends Native {\n  constructor (n) {\n    const p = Number.parseInt(n);\n    if (!(p >= 0))\n      throw new Error('Church number must be a nonnegative integer');\n    super('' + p, 2, function (x, y) {\n      let expr = y;\n      for (let i = p; i-- > 0; )\n        expr = x.apply(expr);\n      return expr;\n    });\n  }\n}\n\nclass Alias extends FreeVar {\n  /**\n   * @desc An existing expression under a different name.\n   * @param {String} name\n   * @param {Ast} impl\n   */\n  constructor (name, impl) {\n    super(name);\n    this.impl = impl;\n  }\n\n  expand () {\n    return this.impl.expand();\n  }\n\n  step () {\n    return this.impl;\n  }\n\n  toString () {\n    return this.outdated ? this.impl.toString() : super.toString();\n  }\n}\n\nclass Empty extends Ast {\n  apply (...args) {\n    return args.length ? args.shift().apply(...args) : this;\n  }\n\n  toString () {\n    return '<empty>';\n  }\n}\n\n/**\n *\n * @type {{[key: string]: [number,(function(...Ast): Ast),{note: string?, fast: boolean?}]}}\n */\nconst native = {\n  I: [1, x => x, { fast: true, note: 'x -> x' }],\n  K: [2, (x, _) => x, { fast: true, note: '(x y) -> x' }],\n  S: [3, (x, y, z) => x.apply(z, y.apply(z)), { note: '(x y z) -> x z (y z)' }],\n  B: [3, (x, y, z) => x.apply(y.apply(z)), { note: '(x y z) -> x (y z)' }],\n  C: [3, (x, y, z) => x.apply(z).apply(y), { note: '(x y z) -> x z y' }],\n  W: [2, (x, y) => x.apply(y).apply(y), { note: '(x y) -> x y y' }],\n}\n\nclass SKI {\n  /**\n   *\n   * @param {{allow: string?, numbers: boolean?}} [options]\n   */\n  constructor (options = {}) {\n    this.known = {};\n\n    this.hasNumbers = !!options.numbers;\n    const allow = (options.allow ?? 'SKI');\n    for (const term of allow.split(''))\n      this.add(term, native[term]);\n  }\n\n  /**\n   *\n   * @param {String} name\n   * @param {Ast|String|[number, function(...Ast): Ast, {note: string?, fast: boolean?}]} impl\n   * @param {String} [note]\n   * @return {SKI} chainable\n   */\n  add (name, impl, note ) {\n    if (typeof impl === 'string')\n      impl = new Alias( name, this.parse(impl));\n    else if (Array.isArray(impl))\n      impl = new Native(name, impl[0], impl[1], impl[2] ?? {});\n    else if (impl instanceof Ast)\n      impl = new Alias( name, impl );\n    else\n      throw new Error('add: impl must be an Ast, a string, or a [arity, impl] pair');\n\n    if (note !== undefined)\n      impl.note = note;\n    this.known[name] = impl;\n\n    return this;\n  }\n\n  /**\n   *\n   * @param {String} name\n   * @return {SKI}\n   */\n  remove (name) {\n    this.known[name].outdated = true;\n    delete this.known[name];\n    return this;\n  }\n\n  /**\n   *\n   * @return {Object<Ast>}\n   */\n  getTerms () {\n    return { ...this.known };\n  }\n\n  /**\n   *\n   * @param {String} str S(KI)I\n   * @param {Object} vars\n   * @return {Ast} parsed expression\n   */\n  parse (str, vars = {}) {\n    const rex = /([()A-Z]|[a-z_][a-z_0-9]*|\\b[0-9]+\\b)|\\s+|($)/sgy;\n\n    const split = [...str.matchAll(rex)];\n\n    const eol = split.pop();\n    if (eol[2] !== '')\n      throw new Error('Unknown tokens in string starting with ' + str.substring(eol.index));\n\n    // TODO die if unknown non-whitespace\n\n    const tokens = split.map(x => x[1]).filter(x => typeof x !== 'undefined');\n\n    const empty = new Empty();\n    /** @type {Ast[]} */\n    const stack = [empty];\n\n    for (const c of tokens) {\n      // console.log(\"parse: found \"+c+\"; stack =\", stack.join(\", \"));\n      if (c === '(')\n        stack.push(empty);\n      else if (c === ')') {\n        if (stack.length < 2)\n          throw new Error('unbalanced input: ' + str);\n        const x = stack.pop();\n        const f = stack.pop();\n        stack.push(f.apply(x));\n      } else if (c.match(/^[0-9]+$/)) {\n        if (!this.hasNumbers)\n          throw new Error('Church numbers not supported, allow them explicitly');\n        const f = stack.pop();\n        stack.push(f.apply(new Church(c)));\n      } else {\n        const f = stack.pop();\n        const x = this.known[c] ?? (vars[c] = vars[c] ?? new FreeVar(c));\n        stack.push(f.apply(x));\n      }\n    }\n\n    if (stack.length !== 1)\n      throw new Error('unbalanced input: ' + str);\n\n    return stack[0];\n  }\n}\n\nmodule.exports = { SKI };\n\n\n//# sourceURL=webpack://ski-interpreter/./lib/ski.js?");

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