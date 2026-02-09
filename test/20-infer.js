const { expect } = require('chai');
const { SKI } = require('../index');

describe('Expr.infer', () => {
  // proper terms
  describeTerm(
    'I',
    { normal: true, arity: 1, proper: true, discard: false, duplicate: false },
    'x->x',
    { steps: [1, 2] },
  );

  describeTerm(
    'SKK',
    { normal: true, arity: 1, proper: true, discard: false, duplicate: false },
    'x->x',
    { steps: [1, 5] },
  );

  describeTerm(
    'K',
    { normal: true, arity: 2, proper: true, discard: true, duplicate: false, skip: new Set([1]) },
    'a->b->a'
  );
  describeTerm(
    'S',
    { normal: true, arity: 3, proper: true, discard: false, duplicate: true, dup: new Set([2]) },
    'x->y->z->x z (y z)',
    { steps: [1, 1] },
  );
  describeTerm(
    'SK',
    { normal: true, arity: 2, proper: true, discard: true, duplicate: false, skip: new Set([0]) },
    'x->y->y',
    { steps: [2, 2] },
  );
  describeTerm(
    'CI',
    { normal: true, arity: 2, proper: true, discard: false, duplicate: false },
    'x->y->y x'
  );

  describeTerm(
    'x->y->x x',
    {
      normal:    true,
      arity:     2,
      proper:    true,
      discard:   true,
      duplicate: true,
      skip:      new Set([1]),
      dup:       new Set([0])
    },
    'x->y->x x'
  );
  describeTerm(
    '5',
    { normal: true, arity: 2, proper: true, discard: false, duplicate: true, dup: new Set([0]) },
    'x->y->x(x(x(x(x y))))'
  );

  // improper normal terms

  describeTerm(
    '(a->a y) x',
    { normal: true, arity: 0, proper: false, discard: false, duplicate: false },
    'x y',
  );

  // improper
  describeTerm(
    'CIS',
    { normal: true, arity: 1, proper: false, discard: false, duplicate: true },
    'x->x(a->b->c->a c (b c))'
  );
  describeTerm(
    'x->xSK',
    { normal: true, arity: 1, proper: false, duplicate: true, discard: true },
    'x->x(a->b->c->a c (b c))(a->b->a)'
  );
  describeTerm(
    'x->x(a->b->c->a c (b c))(a->b->a)',
    { normal: true, arity: 1, proper: false, duplicate: true, discard: true }
  );
  describeTerm(
    'x->x(a->b->c->d->e->y->z->y)(a->b->c->a c b)(a->b->c->a(b c))',
    { normal: true, arity: 1, proper: false, discard: true, duplicate: false },
    'x->x(a->b->c->d->e->y->z->y)(a->b->c->a c b)(a->b->c->a(b c))',
  );

  describeTerm(
    'x->K(xS)',
    { normal: true, arity: 2, proper: false, discard: true, duplicate: true, skip: new Set([1]) },
    'x->y->x(a->b->c->a c (b c))'
  );
  describeTerm(
    'x',
    { normal: true, arity: 0, proper: false, discard: false, duplicate: false },
    'x',
    { steps: [0, 0] },
  );
  describeTerm(
    'x y',
    { normal: true, arity: 0, proper: false, discard: false, duplicate: false },
    'x y',
    { steps: [0, 0] },
  );
  describeTerm(
    'T=CI; 5 (Ty) x',
    { normal: true, arity: 0, proper: false, discard: false, duplicate: false },
    'x y y y y y',
    { steps: [5, 30] },
  );
  describeTerm(
    'x->y x',
    { normal: true, arity: 1, proper: false, discard: false, duplicate: false },
    'x->y x'
  );
  describeTerm(
    'By',
    { normal: true, arity: 2, proper: false, discard: false, duplicate: false },
    'a->b->y(a b)'
  );

  describeTerm(
    'P=a->b->c->d->b(a d c); P',

    { normal: true, arity: 4, proper: true, discard: false, duplicate: false },
    'a->b->c->d->b(a d c)'
  );
  describeTerm(
    'P=x->y->z->t->y (x t z); P(PII)',
    { normal: true, arity: 3, proper: true, discard: false, duplicate: false },
    'a->b->c->a(b c)'
  );

  // lambda maps to itself
  describeTerm(
    'x->y->z->x z y',
    { normal: true, arity: 3, proper: true, discard: false, duplicate: false },
    'x->y->z->x z y'
  );

  describeTerm(
    'x->x(y->x y)(y->y x)',
    { normal: true, arity: 1, proper: false, discard: false, duplicate: true, dup: new Set([0]) },
    'x->x(y->x y)(y->y x)',
  );

  describeTerm(
    'lst = BS(C(BB)); nil = KI; (lst x1 (lst x2 (lst x3 nil)))',
    { normal: true, arity: 2, proper: false, duplicate: true, discard: false, dup: new Set([0]) },
    'f->z->f x1 (f x2 (f x3 z))'
  );

  describeTerm(
    'x (SK) (KI) (CK) (a->b->b)',
    { normal: true, arity: 0, proper: false, discard: true, duplicate: false },
    'x(a->b->b)(a->b->b)(a->b->b)(a->b->b)',
  );

  /*
    // TODO

  // non-normal terms
  describeTerm(
    'C(BWB)(C(BWB))',
    { normal: false, proper: false, discard: false, duplicate: true },
    '(a->b->b(a a))(a->b->b(a a))'
  );

  // infinite recursion
  describeTerm(
    'SII(SII)',
    {normal: false, proper: false, discard: false, duplicate: true, },
    '(x->x x)(x->x x)',
    {steps: [100, 1020]},
  );
  describeTerm(
    'M=WI; MM',
    {normal: false, proper: false, discard: false, duplicate: true, },
    '(x->x x)(x->x x)'
  );
  describeTerm(
    'M=WI; x->MM',
    {normal: false, proper: false, discard: true, duplicate: true, skip: new Set([0])},
    'x->(y->y y)(y->y y)',
    {max: 100},
  );

  // Y combinator
  describeTerm(
    'Y=WI(W(B(SI)))',
    {normal: false, proper: false, discard: false, duplicate: true,},
    undefined,
    { max: 100, maxArgs: 10 },
  );

  // ditto but in lambda form
  describeTerm(
    '(x->x x)(a->b->b(a a b))',
    {normal: false, proper: false, discard: false, duplicate: true,},
    undefined,
    { max: 100, maxArgs: 10 },
  );
  //    ['(a->b->a b b)((a->b->c->a(b c))((a->b->c->a c(b c))(a->a)))((a->b->a b b)((a->b->c->a(b c))((a->b->c->a c(b c))(a->a))))',
  //      {found: false, arity: 0, });

  // lazy Y combinator
  // TODO in theory this guy could have arity = 2 because Z f x = f (Z f) x
  //      but then the closed form will be different from the expected one...
  describeTerm(
    'WI(BBB(BW)(BBBCC)(K(BWB(SI))))',
    { normal: false, proper: false, discard: false, duplicate: true },
    '(a->a a)(g->f->x->f(g g f) x)'
  );

  // quine eats all args
  describeTerm(
    'WI(SBK)',
    {normal: false, proper: false, discard: true, duplicate: true, },
    '(x->x x) (x->y->x x)',
    { maxArgs: 10, max: 100 }
  );

  */
});

/**
 *
 * @param {string} term
 * @param {{
 *   normal: boolean,
 *   arity: number,
 *   proper?: boolean,
 *   discard?: boolean,
 *   duplicate?: boolean,
 *   skip?: Set<number>,
 *   dup?: Set<number>,
 * }}expected
 * @param {string} lambda?
 * @param {{
 *
 * }} options?
 */
function describeTerm (term, expected, lambda, options = {}) {
  describe('handles ' + term, done => {
    try {
      // console.log('testing ' + term);

      const runOptions = {
        max:     options.max,
        maxArgs: options.maxArgs,
      };

      const ski = new SKI();
      const found = ski.parse(term).infer( runOptions );

      const canon = found.expr;
      delete found.expr; // we'll do a separate test for that
      const steps = found.steps;
      delete found.steps; // unpredictable

      it('produces some term', () => {
        expect(canon).to.be.instanceof(SKI.classes.Expr);
      });
      it('produces a step count (' + steps + ')', () => {
        expect(steps).to.be.a('number');
        const limits = options.steps;
        if (limits)
          expect(steps).to.be.within(limits[0], limits[1]);
      });
      if (lambda) {
        it('produces exactly expected result ' + lambda, () => {
          canon.expect(ski.parse(lambda));
        });
      }
      it('produces predictable properties', () => {
        try {
          expect(found).to.deep.equal(expected);
        } catch (err) {
          console.log('Term    :', term);
          console.log('Expected:', expected);
          console.log('Found   :', found);
          throw err;
        }
      });
      it('is idempotent', () => {
        canon.infer().expr.expect(canon);
      });
      it('is back parseable', () => {
        ski.parse('' + canon).expect(canon);
      });
    } catch (err) {
      it('doesn\'t die', () => {
        throw err;
      });
    }
  });
}
