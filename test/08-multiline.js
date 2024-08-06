const {expect} = require('chai');
const {SKI} = require('../index');

describe( 'SKI.pasreMulti', () => {
    it ('handles comments, definitions, and stuff', done => {
        const ski = new SKI;
        const vars = {};
        const expr = ski.parseMulti(`
            // this is a comment
            dbl = S (S(KS)K) K;;;;
            dbl dbl x
        `, vars);
        expect( expr.run(SKI.S).result.toString() ).to.equal(expr.run().result.toString());
        expect(Object.keys(ski.getTerms()).sort()).to.deep.equal(['I', 'K', 'S']);

        expect(Object.keys(vars).sort()).to.deep.equal(['dbl', 'x']);
        expect(vars.dbl.run(SKI.K, SKI.I).result.toString()).to.equal('K(K)');

        done();
    });

    it ('makes last expr an alias if = given', done => {
        const ski = new SKI();
        const expr = ski.parseMulti('foo = SKK');
        const x = SKI.free('x');

        expect( expr.name ).to.equal ("foo");
        expect( expr.run(x).result).to.equal(x);

        done();
    });
});
