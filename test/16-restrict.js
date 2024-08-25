const { expect } = require('chai');
const { SKI } = require('../index');

describe( 'SKI.restrict', () => {
    it('can restrict allowed combinator set', () => {
        const ski = new SKI();
        expect(ski.restrict('-IBCW')).to.equal(ski);
        expect(()=>ski.parseLine('Ix')).to.throw(/I.*restricted/);
        expect(ski.parse('SKKx').run().result+'').to.equal('x');
        expect(ski.restrict('+I')).to.equal(ski);
        expect(ski.parseLine('Ix').run().result+'').to.equal('x');
    });
});
