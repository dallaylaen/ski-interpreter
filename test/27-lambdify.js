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
  ];

  for (const [term, final] of cases) {
    it(`evaluates ${term} to ${final}`, () => {
      const jar = {};
      const expr = ski.parse(term, jar);
      const steps = [...expr.lambdify()];

      console.log(steps.map(step => ({
        ...step,
        expr: step.expr.toString({terse: true}),
      })));

      const last = steps[steps.length - 1];
      ski.parse(final, jar).expect(last.expr);
    });
  }
});
