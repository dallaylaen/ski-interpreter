const {expect} = require('chai');
const {SKI} = require('../index');

describe('SKI.remove', () => {
    it('removes terms from the interpreter', () => {
        const ski = new SKI;
        ski.add('T', 'S(K(SI))K');
        const expr = ski.parse('STT');
        expect( expr.run(...SKI.free('x')).expr + '').to.equal('x(x)');
        expect(''+expr).to.equal('S(T)(T)');
        ski.remove('T');
        expect(''+expr).to.equal('S(S(K(S(I)))(K))(S(K(S(I)))(K))');
        expect( expr.run(...SKI.free('x')).expr + '').to.equal('x(x)');

        const expr2 = ski.parse('STT');
        expect( expr2.run(...SKI.free('x')).expr + '').to.equal('T(x)(T(x))');
    });
});
