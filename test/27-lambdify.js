const { expect } = require('chai');
const { SKI } = require('../index');

describe('Expr.lambdify', () => {
  const ski = new SKI();

  const cases = [
    ["x", "x"],
    ["K x y", "x"],
    ["S", "x->y->z->x z (y z)"],
    ["x->xSK", "x->x (a->b->c->a c (b c)) (a->b->a)" ],
    ["M=SII; MM", "(x->x x) (x->x x)"],
    ["BC(CI)", "a->b->c->c a b"],
    ["T=CI; 5 (Ty) x", "x y y y y y"],
    // ["SII(C(K(WI)))", "(x->x x) (x->y->x x)"],
  ];

  for (const [term, final] of cases) {
    it(`evaluates ${term} to ${final}`, () => {
      const jar = {};
      const expr = ski.parse(term, jar);
      const seq = expr.lambdify({latin: 6, maxArgs: 10});
      const expected = ski.parse(final, jar);

      let done = false;
      let i = 0;
      for (const step of seq) {
        expect(step.expr).to.be.instanceOf(SKI.classes.Expr);
        expect(step.final).to.be.a('boolean');
        expect(step.steps).to.be.a('number');
        expect(done).to.equal(false, 'we didn\'t iterate past the final step');

        console.log(step.expr.toString({terse:true}));

        // don't do fancy variables unless explicitly told to
        ski.parse('' + step.expr, jar); // TODO .expect(step.expr);

        if (step.final) {
          expected.expect(step.expr);
          done = true;
        }

        // TODO add max steps expectation to every step
        expect(i).to.be.lessThanOrEqual(30);
        i++;
      }
    });
  }


});
