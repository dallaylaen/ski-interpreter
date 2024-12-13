const { expect } = require('chai');
const { SKI } = require('../index');

describe('Expr.guessArity', () => {
    const cases = [
        // proper
        ['I', {arity: 1, proper: true, found: true}, 'x->x'],
        ['K', {arity: 2, proper: true, found: true}],
        ['S', {arity: 3, proper: true, found: true}, 'x->y->z->x z (y z)'],
        ['SK', {arity: 2, proper: true, found: true}],
        ['CI', {arity: 2, proper: true, found: true}],
        ['x->y->x x', {arity: 2, proper: true, found: true}],
        ['10', {arity: 2, proper: true, found: true}],

        // improper
        ['CIS', {arity: 1, proper: false, found: true}],
        ['x->xSK', {arity: 1, proper: false, found: true}],
        ['x->K(xS)', {arity: 2, proper: false, found: true}],

        ['x', {arity: 0, proper: false, found: true}],
        ['x->y x', {arity: 1, proper: false, found: true}, 'x->y x'],
        ['By', {arity: 2, proper: false, found: true}],

        // infinite recursion
        ['SII(SII)', {proper: false, found: false}],
        // quine eats all args
        ['WI(SBK)', {proper: false, found: false}]
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
