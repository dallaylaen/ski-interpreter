const { expect } = require('chai');
const { SKI } = require('../index.js');

describe('native combinators', () => {
    const list = {
        B: 'x(y(z))',
        C: 'x(z)(y)',
        I: 'x(y)(z)',
        K: 'x(z)',
        S: 'x(z)(y(z))',
        W: 'x(y)(y)(z)',
    };

    const [x, y, z] = SKI.free('x', 'y', 'z');

    for (const comb in list) {
        it ('contains combinator '+comb, () => {
            expect(SKI[comb]).to.be.instanceOf(SKI.classes.Native);
            expect(SKI[comb].run(x, y, z).result + '').to.equal(list[comb]);
        });
    }
});
