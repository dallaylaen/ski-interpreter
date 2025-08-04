const { expect } = require('chai');
const { SKI } = require('../index');

describe('Expr.canonize', () => {
  const cases = [
    // proper
    ['I',           {found: true, arity: 1, proper: true, linear: true,  discard: false, duplicate: false, }, 'x->x'],
    ['K',           {found: true, arity: 2, proper: true, linear: false, discard: true , duplicate: false, skip: new Set([1])}],
    ['S',           {found: true, arity: 3, proper: true, linear: false, discard: false, duplicate: true , dup: new Set([2])}, 'x->y->z->x z (y z)'],
    ['SK',          {found: true, arity: 2, proper: true, linear: false, discard: true , duplicate: false, skip: new Set([0])}],
    ['CI',          {found: true, arity: 2, proper: true, linear: true,  discard: false, duplicate: false, }, 'x->y->y x'],
    ['x->y->x x',   {found: true, arity: 2, proper: true, linear: false, discard: true , duplicate: true , skip: new Set([1]), dup: new Set([0])}, 'x->y->x x'],
    ['5',           {found: true, arity: 2, proper: true, linear: false, discard: false, duplicate: true, dup: new Set([0])}, 'x->y->x(x(x(x(x y))))'],

    // improper
    ['CIS',         {found: true, arity: 1, proper: false, linear: false, discard: false, duplicate: true, }, 'x->x(a->b->c->a c (b c))'],
    ['x->xSK',      {found: true, arity: 1, proper: false, linear: false, discard: true,  duplicate: true}, 'x->x(a->b->c->a c (b c))(a->b->a)'],
    ['x->x(a->b->c->a c (b c))(a->b->a)',
            {arity: 1, proper: false, linear: false, found: true, discard: true,  duplicate: true}],
    ['x->K(xS)',    {arity: 2, proper: false, linear: false, found: true, discard: true,  duplicate: true, skip: new Set([1])},
                    'x->y->x(a->b->c->a c (b c))'],

    ['x',           {found: true, arity: 0, proper: false, linear: false, discard: false, duplicate: false, }, 'x'],
    ['x->y x',      {found: true, arity: 1, proper: false, linear: false, discard: false, duplicate: false, }, 'x->y x'],
    ['By',          {found: true, arity: 2, proper: false, linear: false, discard: false, duplicate: false, }, 'a->b->y(a b)'],

    // infinite recursion
    ['SII(SII)',    {found: false, arity: 0, proper: false, linear: false, discard: false, duplicate: true}, '(x->x x)(x->x x)'],
    ['M=WI; MM',    {found: false, arity: 0, proper: false, linear: false, discard: false, duplicate: true}, '(x->x x)(x->x x)'],
    ['M=WI; x->MM',   {found: false, arity: 1, proper: false, linear: false, discard: true, duplicate: true, skip: new Set([0])}, 'x->(y->y y)(y->y y)'],
    // Y combinator
    ['Y=WI(W(B(SI)))', {found: false, arity: 0, proper: false, linear: false, discard: false, duplicate: true}],
    // quine eats all args
    ['WI(SBK)',     {found: false, arity: 0, proper: false, linear: false, discard: true, duplicate: true}, '(x->x x) (x->y->x x)'],

    // hidden by an alias
    ['P=a->b->c->d->b(a d c); P',       {found: true, proper: true, linear: true, discard: false, duplicate: false, arity: 4}, 'a->b->c->d->b(a d c)'],
    ['P=a->b->c->d->b(a d c); P(PII)',  {found: true, proper: true, linear: true, discard: false, duplicate: false, arity: 3}, 'a->b->c->a(b c)'],

    // lambda maps to itself
    ['x->y->z->x z y', {found: true, arity: 3, proper: true, linear: true, discard: false, duplicate: false, }, 'x->y->z->x z y'],
  ];

  const ski = new SKI();
  for (const pair of cases) {
    const [term, expected, lambda] = pair;
    it ('handles '+term, ()=> {
      const jar = {};
      const found = ski.parse(term, jar).canonize();
      const canon = found.canonical;
      delete found.canonical;
      const steps = found.steps;
      delete found.steps;
      expect(found).to.deep.equal(expected);
      if (found.found)
        expect(canon).to.be.instanceof(SKI.classes.Expr);
      if (lambda)
        canon.expect(ski.parse(lambda, jar));
      expect(canon).to.be.instanceof(SKI.classes.Expr);
      expect(steps).to.be.a('number');
      if (found.found) {
        expect(steps).to.be.within(
          0,
          SKI.options.max * (found.arity ?? SKI.options.maxArgs),
          'steps should be less than max * arity'
        );
      }
    });
  }
});
