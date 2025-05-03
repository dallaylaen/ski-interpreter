const { expect } = require('chai');
const { SKI } = require('../index');

describe('Expr.lambdify', () => {
  const ski = new SKI();

  const cases = [
    // basic types
    ["x", "x"],
    ["K x y", "x"],
    ["S", "x->y->z->x z (y z)"],
    ["3", "x->y->x(x(x y))"],
    ["a->b->b a", "x->y->y x"],

    ["x->xSK", "x->x (a->b->c->a c (b c)) (a->b->a)" ],
    ["X=x->xSK; X(X(X(XX)))", "a->b->c->a c (b c)"],
    ["M=SII; MM", "(x->x x) (x->x x)"],
    ["BC(CI)", "a->b->c->c a b"],
    ["T=CI; 5 (Ty) x", "x y y y y y"],

    // quine
    ["SII(C(K(WI)))", "(x->x x) (x->y->x x)"],

    // Y combinator
    ["WI(W(B(SI)))", "(x->x x)(g->f->f(g g f))"],

    // SS(KI) decoded as W
    ["(a->b->c->a c (b c)) (a->b->c->a c (b c)) (a->b->b)", "x->y->x y y"],

    ["WWW", "(x->x x x)(x->y->x y y)"],

    // this is f such that f x = f x x (so it generates infinite string of x's)
    ["WI(BW(BW (C(K(WI))))) ", "(f->f f)(g->x->g g x x)"],
    ["BW(BW (C(K(WI))))", "g->x->g g x x"],

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
        const expr = step.expr;
        expect(expr).to.be.instanceOf(SKI.classes.Expr);
        // expect(step.steps).to.be.a('number');
        expect(done).to.equal(false, 'we didn\'t iterate past the final step');

        console.log('[' + step.steps + '] ' + expr.toString({terse:true}) + ' // ' + step.comment);

        const sym = expr.getSymbols();
        const nonFree = [...sym.keys()].filter(s => !(s instanceof SKI.classes.FreeVar) && s !== SKI.classes.Expr.lambdaPlaceholder);
        expect(nonFree).to.be.deep.equal([], 'expr must only have free variables and ->');

        // don't do fancy variables unless explicitly told to
        ski.parse('' + expr, jar); // TODO .expect(step.expr);

        if (step.final) {
          expected.expect(expr);
          done = true;
        }

        // TODO add max steps expectation to every step
        expect(i).to.be.lessThanOrEqual(30);
        i++;
      }
    });
  }


});
