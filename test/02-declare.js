const { expect } = require('chai');
const { SKI } = require('../index');

describe( 'SKI', () => {
    it('can declare terms', done => {
        const ski = new SKI;
        ski.add('sub', 'S(K(SI))K');

        const term = ski.parse('sub x y');

        const result = term.run();

        expect( ''+result.result).to.equal('y(x)');

        // console.log(ski.list());

        done();
    });

    it('does not overwrite read-only data', done => {
        const ski = new SKI;
        ski.add('sub', 'S', 'just an alias');

        const known = ski.getTerms();

        expect (known.S.note).to.match(/x.*y.*z.*->.*x.*z.*\(y.*z\)/);
        expect (known.sub.note).to.equal('just an alias');

        let expr = known.sub;
        expect( expr.isNative() ).to.equal(false);
        expr = expr.step();
        expect( expr.isNative() ).to.equal(true);

        done();
    });

    it('can perform some complex computations, correctly', done => {
        const ski = new SKI();
        ski.add('inc', 'S(S(K(S))(K))');
        ski.add('n2', 'inc I');
        const expr = ski.parse('n2 n2 n2 x y');

        const canonic = expr.expand();
        expect( ''+canonic ).to.match(/^[SKI()]+\(x\)\(y\)$/);

        const result = expr.run( 10000).result;
        expect( (''+result).replace(/[() ]/g, '') )
            .to.equal('x'.repeat(16)+'y');

        const alt = canonic.run(10000).result;
        expect(''+alt).to.equal(''+result);

        done();
    });
});
