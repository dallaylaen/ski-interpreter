const { expect } = require('chai');
const { SKI } = require('../index');

describe('Expr.rewriteSKI()', () => {
  const predictable = [
    ['x->y->x', 'K'],
    ['x->y->z->x z (y z)', 'S'],
    ['x->x', 'I'],
    ['x->x x', 'SII'],
    ['M=x->x x; MM', 'SII(SII)'],
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
      const expr = ski.parse(got);
      const exp = ski.parse(expected);
      const seq = expr.rewriteSKI();
      let done = false;
      for (const step of seq) {
        expect(step.expr).to.be.instanceOf(SKI.classes.Expr);
        expect(step.final).to.be.a('boolean');
        expect(step.steps).to.be.a('number');
        expect(done).to.equal(false, 'we didn\'t iterate past the final step');
        if (step.final) {
          expect('' + step.expr).to.match(/^[SKI()]+$/);
          exp.expect(step.expr);
          done = true;
        }
      }
    });
  }

  for (const src of canonical) {
    const canon = ski.parse(src).guess().expr;
    it(`round trips on every step for ${src} aka ${canon}`, () => {
      const expr = ski.parse(src);
      const seq = expr.rewriteSKI();
      for (const step of seq) {
        canon.expect(step.expr.guess().expr);
      }
    });
  }

});
