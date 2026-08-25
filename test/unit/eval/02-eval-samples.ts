import { expect } from 'chai';
import { SKI } from '../../../src';
import { Alias } from '../../../src/expr';

const ski = new SKI({ experimental: true });

describe('expression samples evaluate correctly', () => {
  checkExpr( 'single builtin', 'S x y z', 'x z (y z)', 1 );
  checkExpr( 'app of builtins', 'SK x y', 'y', 2 );

  checkExpr( 'alias', 'T=CI; T x y', 'y x', 3 );
  checkExpr( 'atomic', '@atomic T=a->b->b a; T x y', 'y x', 1 );

  checkExpr( 'nested alias', 'T=CI; V=BCT; V x y z', 'z x y', 6 );

  checkExpr( 'lambda', '(x->y->y x) f g', 'g f', 2 );

  // PII = T, PT = B - check it!
  checkExpr( 'self-application of aliased lambda', 'P = a->b->c->d->b(a d c); P(PII) x y z', 'x (y z)', 14 );
  checkExpr( 'self-application of an atomic term', '@atomic P = a->b->c->d->b(a d c); P(PII) x y z', 'x (y z)', 4 );
  // ditto but no alias
  checkExpr( 'self-application of lambda via lambda', '(x->x(xII))(a->b->c->d->b(a d c)) x y z', 'x(y z)', 14 );

  //
  checkExpr( 'MT', 'WI(a->b->a b) x y', 'x y', 7 );

  // church numerals coercion
  checkExpr( 'builtin plus applied to non-numeric', '+ x y z', 'y(x y z)', 1 );
  checkExpr( 'not enough args', '+x', '+x', 0 );
  checkExpr( 'plus numbers', '4 + 3', '7', 5 );
  checkExpr( '+ 0 idiom', 'WB(WB)(WB) + 0', '16', 70 );
});

function checkExpr (comment: string, start: string, end: string, steps?: number) {
  describe(comment + ': ' + start, () => {
    const expr = ski.parse(start);
    const target = ski.parse(end);

    const got = expr.run({ max: steps ? steps + 1 : undefined });

    it('evaluates to ' + end + ' in at most ' + steps + ' steps', () => {
      try {
        target.expect(got.expr);
      } catch (e) {
        // run a failing sample in slo mo
        backPedal(start, end, steps);
        throw e;
      }
      expect(got.final).to.equal(true, 'final expr in ' + steps + ' steps');
    });
  });
}

function backPedal (start: string, end: string, steps?: number) {
  const expr = ski.parse(start);
  const target = ski.parse(end);

  console.log('rechecking ' + start + ' vs ' + end);

  for (const state of expr.walk()) {
    console.log('step ' + state.steps + ': ' + state.expr);
    console.log(state.expr.diag());
    if (steps !== undefined && state.steps > steps)
      break;
  }
  console.log('expected');
  console.dir(target, { depth: Infinity });
}
