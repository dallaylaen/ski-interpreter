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

# Execution strategy

Applications and native terms use normal strategy, i.e. the first term in the tree
that has enough arguments is executed and the step ends there.

Lambda terms are lazy, i.e. the body is not touched until
all free variables are bound.

# Installation

```bash
npm install @dallaylaen/ski-interpreter
```

# Usage

```javascript
const {SKI} = require('@dallaylaen/ski-interpreter');
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



# Thanks

* [@ivanaxe](https://github.com/ivanaxe) for luring me into [icfpc 2011](http://icfpc2011.blogspot.com/2011/06/task-description-contest-starts-now.html) where I was introduced to combinators.
* [@akuklev](https://github.com/akuklev) for explaining functional programming to me so many times that I actually got some idea.

# Prior art and inspiration

* "To Mock The Mockingbird" by Raymond Smulian.
* [combinator birds](https://www.angelfire.com/tx4/cus/combinator/birds.html) by [Chris Rathman](https://www.angelfire.com/tx4/cus/index.html)
* [Fun with combinators](https://doisinkidney.com/posts/2020-10-17-ski.html) by [@oisdk](https://github.com/oisdk)
* [Conbinatris](https://dirk.rave.org/combinatris/) by Dirk van Deun

# License and copyright

This software is free and available under the MIT license.

&copy; Konstantin Uvarin 2024-2025
