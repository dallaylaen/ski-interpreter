const { expect } = require('chai');
const { SKI } = require('../index');

describe( 'SKI.restrict', () => {
    it('can restrict allowed combinator set', () => {
        const ski = new SKI();
        expect(ski.restrict('-IBCW')).to.equal(ski);
        expect(()=>ski.parseLine('Ix')).to.throw(/I.*restricted/);
        expect(ski.parse('SKKx').run().expr+'').to.equal('x');
        expect(ski.restrict('+I')).to.equal(ski);
        expect(ski.parseLine('Ix').run().expr+'').to.equal('x');
    });

    it ('honors restrictions in getTerms', () => {
        const ski = new SKI({allow: 'SKI'});
        expect(Object.keys(ski.getTerms()).sort()).to.deep.equal(['I', 'K', 'S']);
    });

    it ('can display restrictions', () => {
        const ski = new SKI();
        ski.restrict('SKI');
        expect(ski.showRestrict()).to.equal('IKS');
        expect(ski.showRestrict('-I')).to.equal('KS');
        expect(ski.showRestrict('+foo')).to.equal('IKS foo');
        expect(ski.showRestrict('foo bar')).to.equal( 'bar foo');
    });
});
