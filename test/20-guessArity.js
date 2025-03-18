const { expect } = require('chai');
const { SKI } = require('../index');

describe('Expr.guessArity', () => {
    const cases = [
        // proper
        ['I',           {arity: 1, proper: true, linear: true,  found: true}, 'x->x'],
        ['K',           {arity: 2, proper: true, linear: false, found: true, skip: new Set([1])}],
        ['S',           {arity: 3, proper: true, linear: false, found: true}, 'x->y->z->x z (y z)'],
        ['SK',          {arity: 2, proper: true, linear: false, found: true, skip: new Set([0])}],
        ['CI',          {arity: 2, proper: true, linear: true,  found: true}, 'x->y->y x'],
        ['x->y->x x',   {arity: 2, proper: true, linear: false, found: true, skip: new Set([1])}],
        ['10',          {arity: 2, proper: true, linear: false, found: true}],

        // improper
        ['CIS',         {arity: 1, proper: false, linear: false, found: true}],
        ['x->xSK',      {arity: 1, proper: false, linear: false, found: true}],
        ['x->x(a->b->c->a c (b c))(a->b->a)',
                        {arity: 1, proper: false, linear: false, found: true}],
        ['x->K(xS)',    {arity: 2, proper: false, linear: false, found: true, skip: new Set([1])}],

        ['x',           {arity: 0, proper: false, linear: false, found: true}],
        ['x->y x',      {arity: 1, proper: false, linear: false, found: true}, 'x->y x'],
        ['By',          {arity: 2, proper: false, linear: false, found: true}],

        // infinite recursion
        ['SII(SII)',    {proper: false, found: false}],
        // quine eats all args
        ['WI(SBK)',     {proper: false, found: false}],

        // hidden by an alias
        ['P=a->b->c->d->b(a d c); P',       {proper: true, found: true, linear: true,  arity: 4}, 'a->b->c->d->b(a d c)'],
        ['P=a->b->c->d->b(a d c); P(PII)',  {proper: true, found: true, linear: true,  arity: 3}, 'a->b->c->a(b c)'],
    ];

    const ski = new SKI();
    for (const pair of cases) {
        const [term, expected, lambda] = pair;
        it ('handles '+term, ()=> {
            const jar = {};
            const found = ski.parse(term, jar).guessArity();
            const canon = found.canonical;
            delete found.canonical;
            expect(found).to.deep.equal(expected);
            if (found.found)
                expect(canon).to.be.instanceof(SKI.classes.Expr);
            if (lambda)
                canon.expect(ski.parse(lambda, jar));
        });
    }
});
