const { expect } = require('chai');
const { SKI } = require('../index');

describe('Expr.lambdify', () => {
  const ski = new SKI();

  const cases = [
    ["S", "x->y->z->x z (y z)"],
    ["x->xSK", "x->x (a->b->c->a c (b c)) (a->b->a)" ],
    ["M=SII; MM", "(x->x x) (x->x x)"],
  ];

  for (const [term, final] of cases) {
    it(`evaluates ${term} to ${final}`, () => {
      const expr = ski.parse(term);
      const steps = [...expr.lambdify()];

      console.log(steps.map(step => ({
        expr: step.expr.toString({terse: true}),
        steps: step.steps,
        final: step.final,
      })));

      const last = steps[steps.length - 1];
      ski.parse(final).expect(last.expr);
    });
  }
});
