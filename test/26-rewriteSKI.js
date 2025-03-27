const { expect } = require('chai');
const { SKI } = require('../index');

describe('Expr.rewriteSKI()', () => {
  const predictable = [
    ['x->y->x', 'K'],
    ['x->y->z->x z (y z)', 'S'],
    ['x->x', 'I'],
    ['x->x x', 'SII'],
    ['x->y->y x', 'S(K(SI))K'],
    ['B', 'S(KS)K'],
    ['3', 'S(S(K(S))(K))(S(S(K(S))(K))(I))'],
  ];
  const canonical = [
    'C',
    'B',
    'W',
    'BC(CI)',
    '5',
  ];

  const ski = new SKI();

  for (const [got, expected] of predictable) {
    it(`${got} -> ${expected}`, () => {
      ski.parse(expected).expect(ski.parse(got).rewriteSKI().expr);
    });
  }
  for (const src of canonical) {
    const canon = ski.parse(src).canonize().canonical;
    it(`round trips for ${src} aka ${canon}`, () => {
      const bare = canon.rewriteSKI().expr;
      canon.expect(bare.canonize().canonical);
    });
  }

  // enjoy watching rewrite step by step
  it ('can rewrite a term step by step', () => {
    const ski = new SKI();
    let expr = ski.parse('C').canonize().canonical;
    const [a, b, c] = SKI.free('a', 'b', 'c');
    const expected = a.apply(c, b); // C a b c
    let steps = 0;
    while (1) {
      expected.expect(expr.run(a, b, c).expr);
      const next = expr.rewriteSKI({max: 1});
      if (next.final)
        break;
      expr = next.expr;
      steps++;
    }
    expect(expr.toString()).to.match(/^[SKI()]+$/);
    expect(steps).to.be.at.least(8);
  });

});
