const { expect } = require('chai');
const { SKI } = require('../index');

describe('Expr.ski()', () => {
  const predictable = [
    ['x->y->x', 'K'],
    ['x->y->z->x z (y z)', 'S'],
    ['x->x', 'I'],
    ['x->x x', 'SII'],
    ['x->y->y x', 'S(K(SI))K'],
  ];
  const canonical = [
    'C',
    'B',
    'W',
    'BC(CI)',
  ];

  const ski = new SKI();

  for (const [got, expected] of predictable) {
    it(`${got} -> ${expected}`, () => {
      expect(ski.parse(got).ski().toString({terse: true})).to.equal(expected);
    });
  }
  for (const src of canonical) {
    const expr = ski.parse(src);
    const canon = expr.guessArity().canonical;
    it(`round trips for ${expr} aka ${canon}`, () => {
      const ski = expr.ski();
      canon.expect(ski.guessArity().canonical);
    });
  }
});
