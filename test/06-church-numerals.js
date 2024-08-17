const {expect} = require('chai');
const {SKI} = require('../index');

describe( 'Church numbers', () => {
    it ('represent numbers', done => {
        const ski = new SKI({numbers: true});

        const jar = {};
        for (let i = 0; i < 5; i++) {
            const found = ski.parse(i+' x y', jar).run().result;
            const expected = ski.parse( 'x('.repeat(i)+'y'+')'.repeat(i));

            expect('' + found).to.equal('' + expected);
        }

        done();
    });

    it ('sanitizes input', () => {
        expect(() => SKI.church(-2)).to.throw(/integer/);

    });
});
