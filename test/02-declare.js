const { expect } = require('chai');
const { SKI } = require('../index');

describe( 'SKI', () => {
    it('can declare terms', done => {
        const ski = new SKI;
        ski.add('sub', 'S(K(SI))K');

        const term = ski.parse('sub x y');
        const result = term.run();

        expect( ''+result).to.equal('y(x)');

        // console.log(ski.list());

        done();
    });

    it('does not overwrite read-only data', done => {
        const ski = new SKI;
        ski.add('sub', 'S', 'just an alias');

        const known = ski.list();

        expect (known.S.note).to.match(/S.*->/);
        expect (known.sub.note).to.equal('just an alias');

        done();
    });

    it('can perform some complex computations, correctly', done => {
        const ski = new SKI();
        ski.add('inc', 'S(S(K(S))(K))');
        ski.add('n2', 'inc I');
        const expr = ski.parse('n2 n2 n2 x y');

        const result = expr.run( 10000);

        expect( (''+result).replace(/[() ]/g, '') )
            .to.equal('x'.repeat(16)+'y');

        done();
    });
});
