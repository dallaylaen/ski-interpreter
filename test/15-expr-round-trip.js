const { expect } = require ('chai');
const { SKI } = require('../index');

describe('Expr <-> string', () => {
    const cases = [
        ['single native', 'S'],
        ['lambda', 'x->y->z->x z (y z)'],
        ['number', '5 x y'],
        ['free var', 'foobared'],
        ['some expr', 'SI(Kx)'],
        ['lambda with args', '(x->z->y(x))(t1)(t2)'],
        ['more than 1 free vars', 'yadda yadda yeek'],
        ['numbers + other terms', 'B (T 2) (2 K) (foo 3)'],
    ];

    const ski = new SKI();
    for (const c of cases) {
        const [ name, source ] = c;
        it (name + ' (canonical)', () => {
            const jar    = {}; // keep track of common free vars
            const expr   = ski.parse(source, jar);
            const before = '' + expr;
            const expr2  = ski.parse(before, jar);
            const after  =  '' + expr2;

            expect(after).to.equal(before);
            expr.expect(expr2);
        });

        it (name + ' (terse)', () => {
            const jar    = {}; // keep track of common free vars
            const expr   = ski.parse(source, jar);
            const before = expr.toString({terse: true});
            const expr2  = ski.parse(before, jar);
            const after  = expr2.toString(({terse: true}));

            expect(after).to.equal(before);
            expr.expect(expr2);
        });
    }
});
