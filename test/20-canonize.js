const { expect } = require('chai');
const { SKI } = require('../index');

describe('Expr.guess', () => {

  // proper terms
  describeTerm(
    'I',
    { grounded: true, arity: 1, proper: true, discard: false, duplicate: false, },
    'x->x',
    { steps: [1, 2]},
  );

  describeTerm(
    'SKK',
    { grounded: true, arity: 1, proper: true, discard: false, duplicate: false, },
    'x->x',
    { steps: [1, 5]},
  );

  describeTerm(
    'K',
    {grounded: true, arity: 2, proper: true, discard: true, duplicate: false, skip: new Set([1])},
    'a->b->a'
  );
  describeTerm(
    'S',
    {grounded: true, arity: 3, proper: true, discard: false, duplicate: true, dup: new Set([2])},
    'x->y->z->x z (y z)',
    {steps: [1, 1]},
  );
  describeTerm(
    'SK',
    {grounded: true, arity: 2, proper: true, discard: true, duplicate: false, skip: new Set([0])},
    'x->y->y',
    {steps: [2, 2]},
  );
  describeTerm(
    'CI',
    {grounded: true, arity: 2, proper: true, discard: false, duplicate: false, },
    'x->y->y x'
  );

  describeTerm(
    'x->y->x x',
    {grounded: true, arity: 2, proper: true, discard: true, duplicate: true,
      skip: new Set([1]), dup: new Set([0])
    },
    'x->y->x x'
  );
  describeTerm(
    '5',
    {grounded: true, arity: 2, proper: true, discard: false, duplicate: true, dup: new Set([0])},
    'x->y->x(x(x(x(x y))))'
  );

  // improper grounded terms

  describeTerm(
    '(a->a y) x',
    {grounded: true, arity: 0, proper: false, discard: false, duplicate: false},
    'x y',
  );

  // improper
  describeTerm(
    'CIS',
    {grounded: true, arity: 1, proper: false, discard: false, duplicate: true},
    'x->x(a->b->c->a c (b c))'
  );
  describeTerm(
    'x->xSK',
    {grounded: true, arity: 1, proper: false, duplicate: true, discard: true },
    'x->x(a->b->c->a c (b c))(a->b->a)'
  );
  describeTerm(
    'x->x(a->b->c->a c (b c))(a->b->a)',
    {grounded: true, arity: 1, proper: false, duplicate: true, discard: true }
  );
  describeTerm(
    'x->K(xS)',
    {grounded: true, arity: 2, proper: false, discard: true, duplicate: true, skip: new Set([1])},
    'x->y->x(a->b->c->a c (b c))'
  );
  describeTerm(
    'x',
    {grounded: true, arity: 0, proper: false, discard: false, duplicate: false, },
    'x',
    { steps: [0, 0]},
  );
  describeTerm(
    'x y',
    {grounded: true, arity: 0, proper: false, discard: false, duplicate: false,},
    'x y',
    { steps: [0, 0]},
  );
  describeTerm(
    'T=CI; 5 (Ty) x',
    {grounded: true, arity: 0, proper: false, discard: false, duplicate: false,},
    'x y y y y y',
    { steps: [5, 30]},
  );
  describeTerm(
    'x->y x',
    {grounded: true, arity: 1, proper: false, discard: false, duplicate: false,},
    'x->y x'
  );
  describeTerm(
    'By',
    {grounded: true, arity: 2, proper: false, discard: false, duplicate: false,},
    'a->b->y(a b)'
  );

  describeTerm(
    'P=a->b->c->d->b(a d c); P',

    {grounded: true, arity: 4, proper: true, discard: false, duplicate: false, },
    'a->b->c->d->b(a d c)'
  );
  describeTerm(
    'P=x->y->z->t->y (x t z); P(PII)',
    {grounded: true, arity: 3, proper: true, discard: false, duplicate: false,},
    'a->b->c->a(b c)'
  );

  // lambda maps to itself
  describeTerm(
    'x->y->z->x z y',
    {grounded: true, arity: 3, proper: true, discard: false, duplicate: false },
    'x->y->z->x z y'
  );

  describeTerm(
    'lst = BS(C(BB)); nil = KI; (lst a (lst b (lst c nil)))',
    { grounded: true, arity: 2, proper: false, duplicate: true, discard: false, dup: new Set([0])},
    'f->x->f a (f b (f c x))'
  );

  describeTerm(
    'x (SK) (KI) (CK) (a->b->b)',
    { grounded: true, arity: 0, proper: false, discard: true, duplicate: false },
    'x(a->b->b)(a->b->b)(a->b->b)(a->b->b)',
  );

  // non-grounded terms
  describeTerm(
    'C(BWB)(C(BWB))',
    { grounded: false, proper: false, discard: false, duplicate: true },
    '(a->b->b(a a))(a->b->b(a a))'
  );

  // infinite recursion
  describeTerm(
    'SII(SII)',
    {grounded: false, proper: false, discard: false, duplicate: true, },
    '(x->x x)(x->x x)',
    {steps: [1000, 1020]},
  );
  describeTerm(
    'M=WI; MM',
    {grounded: false, proper: false, discard: false, duplicate: true, },
    '(x->x x)(x->x x)'
  );
  describeTerm(
    'M=WI; x->MM',
    {grounded: false, proper: false, discard: true, duplicate: true, skip: new Set([0])},
    'x->(y->y y)(y->y y)'
  );

  // Y combinator
  describeTerm(
    'Y=WI(W(B(SI)))',
    {grounded: false, proper: false, discard: false, duplicate: true, }
  );

  // ditto but in lambda form
  describeTerm(
    '(x->x x)(a->b->b(a a b))',
    {grounded: false, proper: false, discard: false, duplicate: true, }
  );
  //    ['(a->b->a b b)((a->b->c->a(b c))((a->b->c->a c(b c))(a->a)))((a->b->a b b)((a->b->c->a(b c))((a->b->c->a c(b c))(a->a))))',
  //      {found: false, arity: 0, });

  // lazy Y combinator
  // TODO in theory this guy could have arity = 2 because Z f x = f (Z f) x
  //      but then the closed form will be different from the expected one...
  describeTerm(
    'WI(BBB(BW)(BBBCC)(K(BWB(SI))))',
    { grounded: false, proper: false, discard: false, duplicate: true },
    '(a->a a)(g->f->x->f(g g f) x)'
  );

  // quine eats all args
  describeTerm(
    'WI(SBK)',
    {grounded: false, proper: false, discard: true, duplicate: true, },
    '(x->x x) (x->y->x x)'
  );

  // hidden by an alias

});

/**
 *
 * @param {string} term
 * @param {{
 *   grounded: boolean,
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
function describeTerm(term, expected, lambda, options={}) {
  describe ('handles '+term, done => {
    try {
      // console.log('testing ' + term);
      const ski = new SKI();
      const jar = {};
      const found = ski.parse(term, jar).guess();

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
      if (lambda) it('produces exactly expected result ' + lambda, () => {
        canon.expect(ski.parse(lambda, jar));
      });
      it('produces predictable properties', () => {
        expect(found).to.deep.equal(expected);
      });
      it ('is idempotent', () =>{
        canon.guess().expr.expect(canon);
      });
    } catch (err) {
      it ('doesn\'t die', () => {
        expect.fail(err);
      });
    }
  });
}


