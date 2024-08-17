const { expect } = require('chai');
const { SKI } = require('../index');

const { Lambda } = SKI.classes;

describe('Lambda', function () {
    it ('is indeed a lambda expression', () => {
        const [x, y, t1, t2] = SKI.free('x', 'y', 't1', 't2');
        const expr = new Lambda([x, y], y.apply(x));

        const got = expr.run(t1, t2).result;

        expect(''+got).to.equal('t2(t1)');
    });

    it ('has consistent equality', () => {
        const [x, y, z, t] = SKI.free('x', 'y', 'z', 't');
        const e1 = new Lambda([x, y], y.apply(x));
        const e2 = new Lambda([y, z], z.apply(y));
        const e3 = new Lambda([x, z], y.apply(x));

        expect( e1.equals(e2)).to.equal(true);
        expect( e1.equals(e3)).to.equal(false);
        expect( e2.equals(e3)).to.equal(false);
    });

    // TODO must test nested lambdas to not confuse vars
});
