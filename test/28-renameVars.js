const { expect } = require('chai');
const { SKI } = require('../index');

describe('Expr.renameVars', () => {
  const cases = [
    ['K x y', 'Kx y'],
    ['x->x', 'a->a'],
    ['x->y z', 'a->y z'],
    ['x->xSK', 'a->a SK'],
    ['(x->x x)(x->x x)', '(a->a a)(b->b b)'],
    ['x->y->z->x z (y z)', 'a->b->c->a c(b c)'],
    ['(x->x)(x->x)(x->S)(x->x)', '(a->a)(b->b)(c->S)(d->d)'],
    ['x->(x->y->x)(x->y->y)', 'a->(b->c->b)(d->e->e)'],
    // ['M=x->x x; MM', 'MM'], wtf?
  ];

  const names = function * () {
    const latin = 'abcdefgh';
    for (let i = 0; ; i++) {
      yield latin[i] ?? 'x' + i;
    }
  };

  const ski = new SKI();
  for (const [term, exp] of cases) {
    it(`renames ${term} to ${exp}`, () => {
      const seq = names();
      const expr = ski.parse(term);
      const renamed = expr.renameVars(seq);
      // must compare verbatim as SKI's equals() aligns variable names
      // in compared expressions
      expect(renamed.toString({terse:true})).to.equal(exp);
    });
  }
});
