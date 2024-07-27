const { expect } = require('chai');
const { SKI } = require('../index');

describe('SKI.equals', () => {
    it ('actually works as equality', done => {
        const ski = new SKI;
        expect( ski.parse('SII').equals(ski.parse('SII'))).to.equal(true);
        expect( ski.parse('K').equals(ski.parse('K'))).to.equal(true);
        expect( ski.parse('KI').equals(ski.parse('SK'))).to.equal(false);
        done();
    });

    it ('is not fooled my similar free terms', done => {
        const ski = new SKI;
        expect( ski.parse('x').equals(ski.parse('x'))).to.equal(false);
        expect( ski.parse('Ix').equals(ski.parse('Ix'))).to.equal(false);
        done();
    });

    it ('can actually be used to compare function by feeding them the same free terms', done => {
        const ski = new SKI;
        const e1 = ski.parse('SK');
        const e2 = ski.parse('KI');
        const x = ski.parse('x');
        const y = ski.parse('y');

        expect( e1.run(x).result.equals(e2.run(x).result) ).to.equal(false);
        expect( e1.run(x, y).result.equals(e2.run(x, y).result) ).to.equal(true);
        expect( e1.run(x, y).result.equals(e2.run(y, x).result) ).to.equal(false);

        done();
    });
});
