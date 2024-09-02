const { expect } = require('chai');
const { SKI } = require('../index');

describe( 'interventions', () => {
    const ski = new SKI();

    it ('can detect and coerce numbers', () => {
        const coerce = ski.parse('x -> !nat x');

        expect(coerce.run(ski.parse('4 5')).expr.toString()).to.equal('' + 625);
        expect( () => coerce.run(ski.parse('S'))).to.throw(/non-numeric/);

    });
    it ('rejects unknown terms', () => {
        expect( () => ski.parse('x->!foobar x') ).to.throw(/[Uu]nknown.*!foobar\b/);
    });

})
