const { expect } = require('chai');
const { SKI } = require('../index');

const ski = new SKI();

describe('Expr.lambdify', () => {

    // basic types
    checkTerm("x", "x");
    checkTerm("K x y", "x");
    checkTerm("S", "x->y->z->x z (y z)");
    checkTerm("3", "x->y->x(x(x y))");
    checkTerm("a->b->b a", "x->y->y x");

    checkTerm("x->xSK", "x->x (a->b->c->a c (b c)) (a->b->a)" );
    checkTerm("X=x->xSK; X(X(X(XX)))", "a->b->c->a c (b c)");
    checkTerm("M=SII; MM", "(x->x x) (x->x x)");
    checkTerm("BC(CI)", "a->b->c->c a b");
    checkTerm("T=CI; 5 (Ty) x", "x y y y y y");

    // quine
    checkTerm("SII(C(K(WI)))", "(x->x x) (x->y->x x)");

    // Y combinator
    checkTerm("WI(W(B(SI)))", "(x->x x)(g->f->f(g g f))");

    // SS(KI) decoded as W
    checkTerm("(a->b->c->a c (b c)) (a->b->c->a c (b c)) (a->b->b)", "x->y->x y y");

    checkTerm("WWW", "(x->x x x)(x->y->x y y)");

    // this is f such that f x = f x x (so it generates infinite string of x's)
    checkTerm("WI(BW(BW (C(K(WI))))) ", "(f->f f)(g->x->g g x x)");
    checkTerm("BW(BW (C(K(WI))))", "g->x->g g x x");

    checkTerm("BS(C(BB))", "a->b->c->d->c a(b c d)");
});

function checkTerm(startSrc, endSrc, options = {}) {
  describe (`Expr.lambdify ${startSrc} -> ${endSrc}`, () => {
    try {
      const start = ski.parse(startSrc);
      const end = ski.parse(endSrc);
      const seq = start.lambdify(options);
      let weight = Infinity;
      let steps = 0;
      let expr;
      let finished = false;
      for (let i = 0; i < 30; i++) {
        const {value, done} = seq.next();
        if (done) {
          finished = true;
          break;
        }
        expr = value.expr;
        it ('produces a smaller expression every time: '+expr, () =>{
          expect(expr).to.be.instanceOf(SKI.classes.Expr);
          expect(expr.weight()).to.be.lessThanOrEqual(weight, 'term weight must strictly diminish');
          weight = expr.weight();
          expect(value.steps).to.be.greaterThanOrEqual(steps, 'steps must not decrease');
          steps = value.steps;

          const unwanted = [];
          expr.traverse(e => {
            if (!(e instanceof SKI.classes.FreeVar || e instanceof SKI.classes.App || e instanceof SKI.classes.Lambda))
              unwanted.push(e);
          });
          expect(unwanted).to.be.deep.equal([], 'expr must only have free variables and ->');

          expr.expect(ski.parse(''+expr), 'expression parses to itself when stringified');
        });
      }
      it ('terminates', () => {
        expect(finished).to.equal(true, 'did not finish in 30 steps');
        expect(expr).to.be.instanceOf(SKI.classes.Expr, 'found at least one expression');
      });
      it ('is idempotent', () => {
        expr.expect(drain(expr.lambdify(options)).expr);
      });
    }
    catch (e) {
      it ("doesn't die", () => {
        throw e;
      });
    }
  });

}

function drain(seq) {
  let result;
  for (const step of seq) {
    result = step;
  }
  return result;
}
