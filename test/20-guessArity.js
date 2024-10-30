const { expect } = require('chai');
const { SKI } = require('../index');

describe('Expr.guessArity', () => {
    const cases = [
        // proper
        ['I', {arity: 1, proper: true, found: true}],
        ['K', {arity: 2, proper: true, found: true}],
        ['S', {arity: 3, proper: true, found: true}],
        ['SK', {arity: 2, proper: true, found: true}],
        ['CI', {arity: 2, proper: true, found: true}],
        ['x->y->x x', {arity: 2, proper: true, found: true}],
        ['10', {arity: 2, proper: true, found: true}],

        // improper
        ['CIS', {arity: 1, proper: false, found: true}],
        ['x->xSK', {arity: 1, proper: false, found: true}],
        ['x->K(xS)', {arity: 2, proper: false, found: true}],

        ['x', {arity: 0, proper: false, found: true}],
        ['x->y x', {arity: 1, proper: false, found: true}],
        ['By', {arity: 2, proper: false, found: true}],

        // infinite
        ['SII(SII)', {arity: undefined, proper: undefined, found: false}],
        ['WI(SBK)', {arity: undefined, proper: undefined, found: false}]
    ];

    const ski = new SKI();
    for (const pair of cases) {
        const [term, result] = pair;
        it ('handles '+term, ()=> {
            expect(ski.parse(term).guessArity()).to.deep.equal(result);
        });
    }
});
