const { expect } = require('chai');
const { SKI, Quest } = require('../index');

describe('Quest', () => {
    it( 'can validate I', done => {
        const quest = new Quest()
            .add('x', 'x');
        const ski = new SKI;
        const result = quest.check(ski.parse('SKK'));

        expect( result.pass ).to.equal(true);

        // try to fool the parser with eponymous free var
        const bad = quest.check(ski.parse('Kx'));
        expect( bad.pass ).to.equal(false);

        done();
    });


})
