const { expect } = require('chai');
const { SKI } = require('../index');

describe('SKI.test', () => {
    it ('can evaluate expressions with ease', done => {
        const ski = new SKI();
        const wanted = ski.parse('y(x)');
        const found = ski.parse('S(K(SI))K');
        expect( wanted.test(found, 'x y').pass ).to.equal(true);
        expect( wanted.test(found, 'x').pass ).to.equal(false);
        expect( () => wanted.test(found, 'zebra')).to.throw(/[Uu]nknown.*\bzebra\b/);

        done();
    });
})
