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

    it ('works for if', done => {
        const quest = new Quest(
            {title:"if (then) (else) (true|false)"},
            [ 'x', 'x', 'y', 'K'],
            [ 'y', 'x', 'y', 'KI'],
        );

        const ski = new SKI();

        const rot = ski.parse('S(S(K(S))(S(K(K))(S(K(S))(S(K(S(I)))(K)))))(K(K))');
        const pass = quest.check(rot);

        expect(pass.pass).to.equal(true);
        expect(pass.details.length).to.equal(2);

        expect(pass.details[0].args.join(' ')).to.equal('x y K');

        const bad = ski.parse('KK');
        const fail = quest.check(bad);

        expect(fail.pass).to.equal(false);
        expect(fail.details.length).to.equal(2);

        expect(fail.details[0].pass).to.equal(false);
        expect(fail.details[1].pass).to.equal(true);

        expect(''+fail.details[0].found).to.equal('y');
        expect(''+fail.details[0].expected).to.equal('x');

        expect(pass.details[0].args.join(' ')).to.equal('x y K');

        done();
    });

    it('can verify locked down solutions', done => {
        const quest = new Quest(
            {title: 'I from S & K', allow: 'SK'},
            ['x', 'x']
        );

        const good = quest.check('SKK');
        expect(good.pass).to.equal(true);

        const bad = quest.check('I');
        expect(bad.pass).to.equal(false);
        expect(''+bad.details[0].found).to.equal('I(x)');

        done();
    });
})
