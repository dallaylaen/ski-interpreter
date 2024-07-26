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

eval("/**\n * Combinatory logic simulator\n */\n\nclass Ast {\n  /**\n   * @desc apply self to zero or more terms and return the resulting term,\n   * without performing any calculations whatsoever\n   * @param {Ast} args\n   * @return {Ast}\n   */\n  combine (...args) {\n    return args.length > 0 ? new Call(this, ...args) : this;\n  }\n\n  /**\n   * expand all terms but don't perform any calculations\n   * @return {Ast}\n   */\n  expand () {\n    return this;\n  }\n\n  /**\n   * @desc iterate one step of calculation in accordance with known rules.\n   *       return the new expression if reduction was possible. or null otherwise\n   * @return {Ast|null}\n   */\n  step () { return null }\n\n  /**\n   * @desc Run step() until either no more substitutions can be done, or maximum number\n   * of steps is reached. throws an error in the latter case.\n   * @param {Number} max\n   * @return {Ast}\n   */\n  run (max = 1000) {\n    let expr = this;\n    for (let i = 0; i < max; i++) {\n      const next = expr.step();\n      if (!next)\n        return expr;\n      expr = next;\n    }\n    throw new Error('Failed to resolve expression in ' + max + ' steps');\n  }\n\n  /**\n   * @desc returns string representation of the implementation of the term at hand\n   * @return {string}\n   */\n  getImpl () { return this.toString() }\n\n  /**\n   * @return {string} string representation of the expression\n   */\n  toString () {\n    throw new Error( 'toString() undefined for generic AST' );\n  }\n}\n\nclass Call extends Ast {\n  /**\n   * @desc Application of fun() to args\n   * @param {Ast} args\n   */\n  constructor (...args) {\n    super();\n    this.args = args;\n    this.final = false;\n  }\n\n  combine (...args) {\n    if (args.length === 0)\n      return this;\n    return new Call(...this.args, ...args);\n  }\n\n  expand () {\n    return new Call(...this.args.map(x => x.expand()));\n  }\n\n  /**\n   * @desc Recursively calculates all terms in the expression. If nothing has to be done,\n   * tries to apply the first n-ary term to first n arguments.\n   * @return {Ast|null}\n   */\n  step () {\n    if (this.final)\n      return null;\n\n    // if subtrees changed, return new self\n    let change = 0;\n\n    // console.log(\"this.args = \", this.args);\n    const args = [];\n    for (const x of this.args) {\n      const next = x.step();\n      args.push(next ?? x);\n      if (next)\n        change++;\n        // console.log(\"change in arg: \"+x+\" => \"+next);\n    }\n\n    if (change)\n      return new Call(...args);\n\n    // if nothing has changed, but there's known combinator, reduce it\n    if (this.args[0] instanceof Special && this.args.length > this.args[0].arity) {\n      const [fun, ...args] = [...this.args]; // shallow copy\n      const enough = args.splice(0, fun.arity);\n      const result = fun.impl(...enough);\n      // console.log(\"step: apply \"+this.fun+\" to \"+enough.join(\", \")+\" => \"+result);\n      return result.combine(...args);\n    }\n\n    // no more reductions can be made\n    this.final = true;\n    return null;\n  }\n\n  toString () {\n    return this.args.map((x, i) => i ? ('(' + x + ')') : x.toString()).join('');\n  }\n}\n\nclass Value extends Ast {\n  /**\n   * @desc a constant named 'name'\n   * @param {String} name\n   */\n  constructor (name) {\n    super();\n    this.name = name;\n  }\n\n  getImpl () {\n    return 'constant';\n  }\n\n  toString () {\n    return this.name;\n  }\n}\n\nclass Special extends Value {\n  /**\n   * @desc A term named 'name' that converts next 'arity' arguments into\n   *       an expression returned by 'impl' function\n   * @param {String} name\n   * @param {Number} arity\n   * @param {function(...Ast): Ast} impl\n   */\n  constructor (name, arity, impl) {\n    super(name);\n    this.arity = arity;\n    this.impl  = impl;\n  }\n\n  getImpl () {\n    return 'native';\n  }\n}\n\nclass Empty extends Ast {\n  combine (...args) {\n    return args.length ? args.shift().combine(...args) : this;\n  }\n\n  toString () {\n    return '<empty>';\n  }\n}\n\nclass Alias extends Value {\n  /**\n   * @desc An existing expression under a different name.\n   * @param {String} name\n   * @param {Ast} impl\n   */\n  constructor (name, impl) {\n    super(name);\n    this.impl = impl;\n  }\n\n  combine (...args) {\n    return this.impl.combine(...args);\n  }\n\n  expand () {\n    return this.impl;\n  }\n\n  step () {\n    return this.impl;\n  }\n\n  getImpl () {\n    return this.impl.toString();\n  }\n}\n\nclass SKI {\n  constructor () {\n    // TODO options, e.g. allow BCW combinators\n    this.known = {};\n\n    this.add('I', [1, x => x], 'I x -> x');\n    this.add('K', [2, (x, _) => x], 'K x y -> x');\n    this.add('S', [3, (x, y, z) => x.combine(z).combine(y.combine(z))],\n      'S x y z -> x(z)(y(z))');\n  }\n\n  /**\n   *\n   * @param {String} name\n   * @param {Ast|String|[number, (...Ast[]) => Ast]} impl\n   * @param {String} [descr]\n   * @return {SKI} chainable\n   */\n  add (name, impl, note = '') {\n    if (typeof impl === 'string')\n      impl = new Alias( name, this.parse(impl));\n    else if (Array.isArray(impl))\n      impl = new Special(name, impl[0], impl[1]);\n    else if (impl instanceof Ast)\n      impl = new Alias( name, impl )\n    else\n      throw new Error('add: impl must be an Ast, a string, or a [arity, impl] pair');\n\n    impl.note = note;\n    this.known[name] = impl;\n\n    return this;\n  }\n\n  // TODO remove\n\n  /**\n   * @desc returns a hash of known terms\n   * @return {Object}\n   */\n  list () {\n    const out = {};\n    for (const name in this.known) {\n      const entry = this.known[name];\n      out[name] = {\n        name,\n        impl:  entry.getImpl(),\n        note:  entry.note,\n        arity: entry.arity,\n      }\n    }\n    return out;\n  }\n\n  /**\n   *\n   * @param {String} str S(KI)I\n   * @return {Ast} parsed expression\n   */\n  parse (str) {\n    const rex = /([()A-Z]|[a-z_][a-z_0-9]*)|\\s+|($)/sgy;\n\n    const split = [...str.matchAll(rex)];\n\n    const eol = split.pop();\n    if (eol[2] !== '')\n      throw new Error('Unknown tokens in string starting with ' + str.substring(eol.index));\n\n    // TODO die if unknown non-whitespace\n\n    const tokens = split.map(x => x[1]).filter(x => typeof x !== 'undefined');\n\n    const empty = new Empty();\n    const stack = [empty];\n\n    for ( const c of tokens) {\n      // console.log(\"parse: found \"+c+\"; stack =\", stack.join(\", \"));\n      if (c === '(')\n        stack.push(empty);\n      else if ( c === ')') {\n        if (stack.length < 2)\n          throw new Error('unbalanced input: ' + str);\n        const x = stack.pop();\n        const f = stack.pop();\n        stack.push(f.combine(x));\n      } else {\n        const f = stack.pop();\n        const x = this.known[c] ?? new Value(c);\n        // console.log(\"combine\", f, x)\n        stack.push(f.combine(x));\n      }\n    }\n\n    if (stack.length !== 1)\n      throw new Error('unbalanced input: ' + str);\n\n    return stack[0];\n  }\n}\n\nmodule.exports = { SKI };\n\n\n//# sourceURL=webpack://ski-interpreter/./lib/ski.js?");

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