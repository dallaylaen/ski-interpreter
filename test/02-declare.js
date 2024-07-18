const { expect } = require('chai');
const { SKI } = require('../index');

describe( 'SKI', () => {
    it('can declare terms', done => {
        const ski = new SKI;
        ski.add('sub', 'S(K(SI))K');

        const term = ski.parse('sub x y');
        const result = term.run();

        expect( ''+result).to.equal('y(x)');

        done();
    })
});
