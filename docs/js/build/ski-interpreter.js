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

eval("const ski = __webpack_require__ (/*! ./lib/ski */ \"./lib/ski.js\");\n\nmodule.exports = { ...ski };\nif (typeof window !== 'undefined') {\n    window.SKI = ski.SKI;\n}\n\n\n//# sourceURL=webpack://ski-interpreter/./index.js?");

/***/ }),

/***/ "./lib/ski.js":
/*!********************!*\
  !*** ./lib/ski.js ***!
  \********************/
/***/ ((module) => {

eval("/**\n * Combinatory logic simulator\n */\n\nclass Ast {\n  /**\n   * @desc apply self to zero or more terms and return the resulting term,\n   * without performing any calculations whatsoever\n   * @param {Ast} args\n   * @return {Ast}\n   */\n  combine (...args) {\n    return args.length > 0 ? new Apply(this, ...args) : this;\n  }\n\n  /**\n   * expand all terms but don't perform any calculations\n   * @return {Ast}\n   */\n  expand () {\n    return this;\n  }\n\n  /**\n   * Apply self to list of given args.\n   * Normally, only native combinators know how to do it.\n   * @param {Ast[]} args\n   * @return {Ast|null}\n   */\n  reduce (args) {\n    return null;\n  }\n\n  /**\n   * @desc iterate one step of calculation in accordance with known rules.\n   *       return the new expression if reduction was possible. or null otherwise\n   * @return {Ast|null}\n   */\n  step () { return null }\n\n  /**\n   * @desc Run uninterrupted sequence of step() applications\n   *       until the expression is irreducible, or max number of steps is reached.\n   *       Default number of steps = 1000.\n   * @param {{max: number, count: number}|Ast} [opt]\n   * @param {Ast} args\n   * @return {{result: Ast, steps: number, final: boolean}}\n   */\n  run (opt = {}, ...args) {\n    if (opt instanceof Ast) {\n      args.unshift(opt);\n      opt = {};\n    }\n    let expr = args ? this.combine(...args) : this;\n    let steps = opt.count ?? 0;\n    const max = (opt.max ?? 1000) + steps;\n    let final = false;\n    for (; steps < max; steps++ ) {\n      const next = expr.step();\n      if (!next) {\n        final = true;\n        break;\n      }\n      expr = next;\n    }\n    return { final, steps, result: expr };\n  }\n\n  isNative () { return false; }\n\n  /**\n   *\n   * @param {Ast} other\n   * @return {boolean}\n   */\n  equals (other) {\n    return this === other;\n  }\n\n  /**\n   * @return {string} string representation of the expression\n   */\n  toString () {\n    throw new Error( 'toString() undefined for generic AST' );\n  }\n}\n\nclass Apply extends Ast {\n  /**\n   * @desc Application of fun() to args\n   * @param {Ast} args\n   */\n  constructor (fun, ...args) {\n    super();\n    this.fun = fun;\n    this.args = args;\n    this.final = false;\n  }\n\n  combine (...args) {\n    if (args.length === 0)\n      return this;\n    return this.fun.combine( ...this.args, ...args);\n  }\n\n  expand () {\n    return this.fun.expand().combine(...this.args.map(x => x.expand()));\n  }\n\n  /**\n   * @desc Recursively calculates all terms in the expression. If nothing has to be done,\n   * tries to apply the first n-ary term to first n arguments.\n   * @return {Ast|null}\n   */\n  step () {\n    if (this.final)\n      return null;\n\n    // first try to cut off some subtrees so we don't need to calculate them at all\n    if (this.fun.fast) {\n      const maybe = this.fun.reduce(this.args);\n      if (maybe)\n        return maybe;\n    }\n\n    // if subtrees changed, return new self\n    const fun = this.fun.step();\n    let change = fun ? 1 : 0;\n\n    const args = [];\n    for (const x of this.args) {\n      const next = x.step();\n      args.push(next ?? x);\n      if (next)\n        change++;\n    }\n\n    if (change)\n      return (fun ?? this.fun).combine(...args);\n\n    // if nothing has changed, but the fun knows how to proceed, let it do stuff\n    const reduced = this.fun.reduce(this.args);\n    if (reduced)\n      return reduced;\n\n    // no more reductions can be made\n    this.final = true;\n    return null;\n  }\n\n  equals (other) {\n    if (!(other instanceof Apply))\n      return false;\n    if (other.args.length !== this.args.length)\n      return false;\n    if (!this.fun.equals(other.fun))\n      return false;\n    for (let i = 0; i < this.args.length; i++) {\n      if (!this.args[i].equals(other.args[i]))\n        return false;\n    }\n    return true;\n  }\n\n  toString () {\n    return this.fun.toString() + this.args.map(x => '(' + x + ')').join('');\n  }\n}\n\nclass FreeTerm extends Ast {\n  /**\n   * @desc a constant named 'name'\n   * @param {String} name\n   */\n  constructor (name) {\n    super();\n    this.name = name;\n  }\n\n  toString () {\n    return this.name;\n  }\n}\n\nclass Native extends FreeTerm {\n  /**\n   * @desc A term named 'name' that converts next 'arity' arguments into\n   *       an expression returned by 'impl' function\n   * @param {String} name\n   * @param {Number} arity\n   * @param {function(...Ast): Ast} impl\n   * @param {Object} opt\n   */\n  constructor (name, arity, impl, opt = {}) {\n    super(name);\n    this.arity = arity;\n    this.impl  = impl;\n    if (opt.fast)\n      this.fast = true;\n  }\n\n  reduce (args) {\n    if (args.length < this.arity)\n      return null;\n    const tail = args.splice(this.arity);\n    return this.impl(...args).combine(...tail);\n  }\n\n  isNative () {\n    return true;\n  }\n}\n\nclass Empty extends Ast {\n  combine (...args) {\n    return args.length ? args.shift().combine(...args) : this;\n  }\n\n  toString () {\n    return '<empty>';\n  }\n}\n\nclass Alias extends FreeTerm {\n  /**\n   * @desc An existing expression under a different name.\n   * @param {String} name\n   * @param {Ast} impl\n   */\n  constructor (name, impl) {\n    super(name);\n    this.impl = impl;\n  }\n\n  expand () {\n    return this.impl.expand();\n  }\n\n  step () {\n    return this.impl;\n  }\n\n  toString () {\n    return this.outdated ? this.impl.toString() : super.toString();\n  }\n}\n\nclass SKI {\n  constructor () {\n    // TODO options, e.g. allow BCW combinators\n    this.known = {};\n\n    this.add('I', [1, x => x, { fast: true }], 'x -> x');\n    this.add('K', [2, (x, _) => x, { fast: true }], '(x y) -> x');\n    this.add('S', [3, (x, y, z) => x.combine(z, y.combine(z))],\n      '(x y z) -> x z (y z)');\n  }\n\n  /**\n   *\n   * @param {String} name\n   * @param {Ast|String|[number, (...Ast[]) => Ast]} impl\n   * @param {String} [descr]\n   * @return {SKI} chainable\n   */\n  add (name, impl, note = '') {\n    if (typeof impl === 'string')\n      impl = new Alias( name, this.parse(impl));\n    else if (Array.isArray(impl))\n      impl = new Native(name, impl[0], impl[1], impl[2] ?? {});\n    else if (impl instanceof Ast)\n      impl = new Alias( name, impl );\n    else\n      throw new Error('add: impl must be an Ast, a string, or a [arity, impl] pair');\n\n    impl.note = note;\n    this.known[name] = impl;\n\n    return this;\n  }\n\n  /**\n   *\n   * @param {String} name\n   * @return {SKI}\n   */\n  remove (name) {\n    this.known[name].outdated = true;\n    delete this.known[name];\n    return this;\n  }\n\n  /**\n   *\n   * @return {Object<Ast>}\n   */\n  getTerms () {\n    return { ...this.known };\n  }\n\n  /**\n   *\n   * @param {String} str S(KI)I\n   * @return {Ast} parsed expression\n   */\n  parse (str) {\n    const rex = /([()A-Z]|[a-z_][a-z_0-9]*)|\\s+|($)/sgy;\n\n    const split = [...str.matchAll(rex)];\n\n    const eol = split.pop();\n    if (eol[2] !== '')\n      throw new Error('Unknown tokens in string starting with ' + str.substring(eol.index));\n\n    // TODO die if unknown non-whitespace\n\n    const tokens = split.map(x => x[1]).filter(x => typeof x !== 'undefined');\n\n    const empty = new Empty();\n    const stack = [empty];\n\n    for ( const c of tokens) {\n      // console.log(\"parse: found \"+c+\"; stack =\", stack.join(\", \"));\n      if (c === '(')\n        stack.push(empty);\n      else if ( c === ')') {\n        if (stack.length < 2)\n          throw new Error('unbalanced input: ' + str);\n        const x = stack.pop();\n        const f = stack.pop();\n        stack.push(f.combine(x));\n      } else {\n        const f = stack.pop();\n        const x = this.known[c] ?? new FreeTerm(c);\n        // console.log(\"combine\", f, x)\n        stack.push(f.combine(x));\n      }\n    }\n\n    if (stack.length !== 1)\n      throw new Error('unbalanced input: ' + str);\n\n    return stack[0];\n  }\n}\n\nmodule.exports = { SKI };\n\n\n//# sourceURL=webpack://ski-interpreter/./lib/ski.js?");

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