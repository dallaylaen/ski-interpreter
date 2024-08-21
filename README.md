# Simple Kombinator Interpreter

Welcome to the wonderful world of combinators, a lovechild of Lisp and Brainfuck, discovered by Haskell Curry himself.

This little project provides a JS playground for combinatory logic and lambda calculus.

# Playground

https://dallaylaen.github.io/ski-interpreter/

You start with some basic terms and can either define new terms, or execute expressions containing already known and free terms. E.g. `S(S(K(S))(K))(I) x y` would produce `x(x(y))`. [Try it!](https://dallaylaen.github.io/ski-interpreter/?code=S%28S%28K%28S%29%29%28K%29%29%28I%29%20x%20y&terms=)

# Quests

https://dallaylaen.github.io/ski-interpreter/quest.html

This page contains small tasks of increasing complexity. Each task requires the user to build a combinator with specific properties.

# CLI

The file [bin/ski.js](bin/ski.js) can be used to calculate SKI expressions, albeit lacking REPL and ability to define more terms. Use the playground instead. `¯\_(ツ)_/¯`

# The library

```javascript
const {SKI} = require('./index.js');

const ski = new SKI();
const expr = ski.parse('S f g x');
expr.run().result; // f(x)(g(x))

// declare free variables. 
// note that free variables with the same name are
// distinct unless it's the same object
const [x, y, z] = SKI.free('x', 'y', 'z');

// obtain "native" combinators (BCIKSW)
const si = SKI.S.apply(SKI.I);

// check type
if (si instanceof SKI.classes.Expr) {
    console.log('expression: ' + si);
}

// compare expressions
if (ski.parse('SKK').run(x).result.equals(x)) {
    console.log('created I from S and K')
}

// Church numerals
console.log(ski.parse('15 man chest').run().result + ' and a bottle of rum');

// generic lambda expressions
ski.parse('x->y->z->x(z)(y(z))'); // same as S

// run with argumens
const U = ski.parse('SII');
U.run({max: 100, throw: true}, U);
// throws an exception because U(U) is an infinite loop
```

All expressions are immutable and will return a brand new expression if anything changes, or just themselves.

# Thanks

* [@ivanaxe](https://github.com/ivanaxe) for luring me into [icfpc 2011](http://icfpc2011.blogspot.com/2011/06/task-description-contest-starts-now.html) where I was introduced to combinators.
* [@akuklev](https://github.com/akuklev) for explaining functional programming to me so many times that I actually got some idea.

# License and copyright

MIT

&copy; Konstantin Uvarin 2024
