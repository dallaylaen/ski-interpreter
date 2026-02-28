# Simple Kombinator Interpreter

> **A humane tooling for inhuman logic**

This package contains a
[combinatory logic](https://en.wikipedia.org/wiki/Combinatory_logic)
and [lambda calculus](https://en.wikipedia.org/wiki/Lambda_calculus)
parser and interpreter focused on traceability and inspectability.

It is written in plain JavaScript (with bolted on TypeScript support)
and can be used in Node.js or in the browser.

# Features:

* SKI and BCKW combinators
* Lambda expressions
* Church numerals
* Defining new terms
* &lambda; &lrarr; SKI conversion
* Comparison of expressions
* Includes a class for building and executing test cases for combinators

# Syntax

* Uppercase terms are always single characters and may be lumped together;
* Lowercase alphanumeric terms may have multiple letters and must therefore be separated by spaces;
* Whole non-negative numbers are interpreted as Church numerals, e.g. `5 x y` evaluates to `x(x(x(x(x y))))`. They must also be space-separated from other terms;
* `x y z` is the same as `(x y) z` or `x(y)(z)` but **not** `x (y z)`;
* Unknown terms are assumed to be free variables;
* Lambda terms are written as `x->y->z->expr`, which is equivalent to
`x->(y->(z->expr))` (aka right associative). Free variables in a lambda expression ~~stay in Vegas~~ are isolated from terms with the same name outside it;
* X = y z defines a new term.

## Starting combinators:

* <code>I x &mapsto; x</code> _// identity_;
* <code>K x y &mapsto; x</code> _//constant_;
* <code>S x y z &mapsto; x z (y z)</code> _// fusion_;
* <code>B x y z &mapsto; x (y z)</code> _// composition_;
* <code>C x y z &mapsto; x z y</code> _// swapping_;
* <code>W x y &mapsto; x y y</code> _//duplication_;

The special combinator `+` will increment Church numerals, if they happen to come after it:

* `+ 0` // 1
* `2 + 3` // -> `+(+(3))` -> `+(4)` -> `5`

The `term + 0` idiom may be used to convert
numbers obtained via computation (e.g. factorials)
back to human readable form.

# Execution strategy

Applications and native terms use leftmost-outermost strategy, i.e. the first term in the tree
that has enough arguments is executed and the step ends there.

Lambda terms are lazy, i.e. the body is not touched whatsoever
until all the free variables are bound.
This is consistent with combinator behavior under LO order.

# Playground

* [Interactive interpreter](https://dallaylaen.github.io/ski-interpreter/)

  * all of the above features (except comparison and JS-native terms) in your browser
  * expressions have permalinks
  * can configure verbosity and execution speed
  * switchable visual highlighting of redexes and outline of subexpressions

* [Quests](https://dallaylaen.github.io/ski-interpreter/quest.html)

This page contains small combinatory logic exercises of increasing (hopefully) diffuculty.
Each task requires the user to build a combinator with specific properties.
New combinators are unlocked as the user progresses.

# Installation

```bash
npm install @dallaylaen/ski-interpreter
```

# CLI

[bin/ski.js](bin/ski.js) - also available as `npx ski` - contains several subcommands:

## Subcommands

* **`repl`** - Start an interactive REPL
  * `--verbose` - Show all evaluation steps
  * Built-in commands (type `!help` in REPL):
    * `!ls` - List all defined terms
    * `!help` - Show available commands

* **`eval <expression>`** - Evaluate a single expression
  * `--verbose` - Show all evaluation steps
  * Example: `ski eval "S K K x"`

* **`file <filepath>`** - Evaluate expressions from a file
  * `--verbose` - Show all evaluation steps
  * Example: `ski file script.ski`

* **`quest-check <files...>`** - Validate quest definition files
  * `--solution <file>` - Load solutions from a JSON file for verification
  * Example: `ski quest-check quest1.json quest2.json --solution solutions.json`

If no subcommand is provided, help is displayed.

Running `SKI_REPL=1 node -r @dallaylaen/ski-interpreter/bin/ski.js`
will start a node shell with the `SKI` class available as a global variable.

# Usage

## A minimal example

```javascript
#!node

const { SKI } = require('@dallaylaen/ski-interpreter');

// Create a parser instance
const ski = new SKI();

// Parse an expression
const expr = ski.parse(process.argv[2]);

// Evaluate it step by step
for (const step of expr.walk({max: 100})) {
  console.log(`[${step.steps}] ${step.expr}`);
}
```

## Main features

```javascript
const { SKI } = require('@dallaylaen/ski-interpreter');
const ski = new SKI();

const expr = ski.parse(src);

// evaluating expressions
const next = expr.step(); // { steps: 1, expr: '...' }
const final = expr.run({max: 1000}); // { steps: 42, expr: '...' }
const iterator = expr.walk();

// applying expressions
const result = expr.run({max: 1000}, arg1, arg2 ...);
// same sa
expr.apply(arg1).apply(arg2).run();
// or simply
expr.apply(arg1, arg2).run();

// equality check
ski.parse('x->y->x').equals(ski.parse('a->b->a')); // true
ski.parse('S').equals(SKI.S); // true
ski.parse('x').apply(ski.parse('y')).equals(ski.parse('x y')); // also true

// defining new terms
ski.add('T', 'CI'); // T x y = C I x y = I y x = y
ski.add('M', 'x->x x'); // M x = x x

// also with native JavaScript implementations:
ski.add('V', x=>y=>f=>f.apply(x, y), 'pair constructor');

ski.getTerms(); // all of the above as an object

// converting lambda expressions to SKI
const lambdaExpr = ski.parse('x->y->x y');
const steps = [...lambdaExpr.toSKI()];
// steps[steps.length - 1].expr only contains S, K, I, and free variables, if any

// converting SKI expressions to lambda
const skiExpr = ski.parse('S K K');
const lambdaSteps = [...skiExpr.toLambda()];
// lambdaSteps[lambdaSteps.length - 1].expr only contains lambda abstractions and applications
```

## Fancy formatting

`expr.format(options?)` converts an expression to a string with fine-grained
control over notation. Called without arguments it is equivalent to
`expr.toString()`.

```javascript
const expr = ski.parse('S K K');

expr.format()                        // 'S K K'  (default, terse)
expr.format({ terse: false })        // 'S(K)(K)' — every argument gets parentheses
expr.format({ html: true })          // HTML-safe: free vars wrapped in <var>,
                                     // '->' becomes '-&gt;', fancyName used when set

// Custom lambda notation
expr.format({ lambda: ['', '=>', ''], terse: false })    // JavaScript style
expr.format({ lambda: ['&lambda;', '.', ''] })           // math style
expr.format({ lambda: ['(', '->', ')'], around: ['(', ')'], brackets: ['', ''] })
                                                         // Lisp style, still parseable

// Redex highlighting (e.g. for step-by-step HTML output)
ski.parse('I x').format({ html: true, redex: ['<b>', '</b>'] })
// '<b>I</b> <var>x</var>'

// inventory: show listed aliases by name, expand everything else
const { T } = ski.getTerms();
expr.format({ inventory: { T } })    // keeps T as 'T', expands any other aliases
```

The `brackets`, `var`, `around`, and `redex` options each take a `[open, close]`
pair of strings; `lambda` takes a `[prefix, separator, suffix]` triple.

`expr.diag()` will instead output an indented expression tree (breadth-first)
with class information and variables labeled for disambiguation.

## Variable scoping

By default, parsed free variables are global and equal to any other variable with the same name.
Variables inside lambdas are local to said lambda and will not be equal to anything except themselves.

A special `scope` argument may be given to parse to limit the scope. It can be any object.

```javascript
const scope1 = {};
const scope2 = {};
const expr1 = ski.parse('x y', {scope: scope1});
const expr2 = ski.parse('x y', {scope: scope2}); // not equal
const expr3 = ski.parse('x y'); // equal to neither
const expr4 = ski.parse('x', {scope: scope1}).apply(ski.parse('y', {scope: scope1})); // equal to expr1
```

Variables can also be created using magic `SKI.vars(scope)` method:

```javascript
const scope = {};
const {x, y, z} = SKI.vars(scope); // no need to specify names
```

## Querying the expressions

Expressions are trees, so they can be traversed.

```javascript
expr.any(e => e.equals(SKI.S)); // true if any subexpression is S

expr.traverse(e => e.equals(SKI.I) ? SKI.S.apply(SKI.K, SKI.K) : null);
// replaces all I's with S K K
// here a returned `Expr` object replaces the subexpression,
// whereas `null` means "leave it alone and descend if possible"

expr.fold(0, (acc, e) => acc + (e.equals(SKI.K) ? acc+1 : acc));
// counts the number of K's in the expression
```

## Test cases

The `Quest` class may be used to build and execute test cases for combinators.

```javascript
const { Quest } = require('@dallaylaen/ski-interpreter');

const q = new Quest({
    name: 'Test combinator T',
    description: 'T x y should equal y x',
    input: 'T',
    cases: [
        ['T x y', 'y x'],
    ],
});

q.check('CI'); // pass
q.check('a->b->b a'); // ditto
q.check('K'); // fail
q.check('K(K(y x))') // nope! the variable scopes won't match
```

See also [the quest guide](quest-intro.md) for more details on building your own quests or even interactive quest pages.

# Package contents

* `lib/ski-interpreter.cjs.js` - main entry point for Node.js;
* `lib/ski-interpreter.esm.js` - main entry point for ES modules;
* `lib/ski-interpreter.min.js` - minified version for browsers;
* `lib/ski-quest.min.js` - script with the interpreter
plus `QuestBox`, `QuestChapter`, and `QuestPage` classes
for building interactive quest pages from JSON-encoded quest data;
* `bin/ski.js` - a CLI REPL;
* `types` - TypeScript type definitions.

# Thanks

* [@ivanaxe](https://github.com/ivanaxe) for luring me into [icfpc 2011](http://icfpc2011.blogspot.com/2011/06/task-description-contest-starts-now.html) where I was introduced to combinators.
* [@akuklev](https://github.com/akuklev) for explaining functional programming to me so many times that I actually got some idea.
* [One happy fellow](https://github.com/happyfellow-one) whose [riddle](https://blog.happyfellow.dev/a-riddle/) trolled me into writing an early `traverse` prototype.

# Prior art and inspiration

* "To Mock The Mockingbird" by Raymond Smulian.
* [combinator birds](https://www.angelfire.com/tx4/cus/combinator/birds.html) by [Chris Rathman](https://www.angelfire.com/tx4/cus/index.html)
* [Fun with combinators](https://doisinkidney.com/posts/2020-10-17-ski.html) by [@oisdk](https://github.com/oisdk)
* [Conbinatris](https://dirk.rave.org/combinatris/) by Dirk van Deun

# License and copyright

This software is free and available under the MIT license.

&copy; Konstantin Uvarin 2024&ndash;2026
