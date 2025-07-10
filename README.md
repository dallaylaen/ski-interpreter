# Simple Kombinator Interpreter

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

# Installation

```bash
npm install ski-interpreter
```

# Usage

```javascript
const {SKI} = require('ski-interpreter');
const ski = new SKI(); // the parser

// parse an expression
const expr = ski.parse('S(K(SI))K x y');

// run the expression
const result = expr.run({max: 100, throw: true});
console.log('reached '+ result.expr + ' after ' + result.steps + ' steps.');

// inspect the steps taken to reach the result
for (const step of expr.walk())
  console.log(step.expr.toString());

// convert lambda to SKI
const lambda = ski.parse('x->y->z->x z y');
for (const step of lambda.rewriteSKI())
  console.log(step.steps + ': ' + step.expr);

// convert combinators to lambda
const combinator = ski.parse('BSC');
for (const step of combinator.lambdify())
  console.log(step.steps + ': ' + step.expr);

// compare expressions
ski.parse('a->b->a').equals(ski.parse('x->y->x')); // true!

const jar = {}; // share free variables with the same names between parser runs
ski.parse('a->b->f a').equals(ski.parse('x->y->f x')); // false
ski.parse('a->b->f a', jar).equals(ski.parse('x->y->f x', jar)); // true 

// define new terms
ski.add('T', 'S(K(SI))K');
console.log(ski.parse('T x y').run().expr); // prints 'x(y)'

// define terms with JS implementation
const jay = new SKI.classes.Native('J', a=>b=>c=>d=>a.apply(b).apply(a.apply(d).apply(c)));
ski.add('J', jay);

// access predefined terms directly
SKI.C.apply(SKI.S); // a term
const [x, y] = SKI.free('x', 'y'); // free variables
SKI.church(5).apply(x, y).run().expr + ''; // 'x(x(x(x(x y))))'
```

# Playground

https://dallaylaen.github.io/ski-interpreter/

* all of the above features (except comparison and JS-native terms) in your browser
* expressions have permalinks
* can configure verbosity & executeion speed

# Quests

https://dallaylaen.github.io/ski-interpreter/quest.html

This page contains small tasks of increasing complexity. 
Each task requires the user to build a combinator with specific properties.

# CLI

REPL comes with the package as [bin/ski.js](bin/ski.js).

# Execution strategy

Applications and native terms use normal strategy, i.e. the first term in the tree
that has enough arguments is executed and the step ends there.

Lambda terms are lazy, i.e. the body is left intact until
all free variables are bound.

# Thanks

* [@ivanaxe](https://github.com/ivanaxe) for luring me into [icfpc 2011](http://icfpc2011.blogspot.com/2011/06/task-description-contest-starts-now.html) where I was introduced to combinators.
* [@akuklev](https://github.com/akuklev) for explaining functional programming to me so many times that I actually got some idea.

# Prior art and inspiration

* "To Mock The Mockingbird" by Raymond Smulian.
* [combinator birds](https://www.angelfire.com/tx4/cus/combinator/birds.html) by [Chris Rathman](https://www.angelfire.com/tx4/cus/index.html)

# License and copyright

This software is free and available under the MIT license.

&copy; Konstantin Uvarin 2024-2025
