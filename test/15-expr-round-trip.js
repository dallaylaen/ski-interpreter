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
    ];

    const ski = new SKI();
    for (const c of cases) {
        const [ name, source ] = c;
        it (name, () => {
            const jar = {}; // keep track of common free vars
            const expr = ski.parse(source, jar);
            const before = '' + expr;
            const expr2 = ski.parse(before, jar);
            const after =  '' + expr2;
            expect(after).to.equal(before);
            expect(expr.equals(expr2)).to.equal(true, 'expressions are equal internally');
        });
    }
});
