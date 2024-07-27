const { expect } = require('chai');
const { SKI } = require('../index');

describe( 'SKI', () => {
    it ('can parse basic expr: I', done => {
       const ski = new SKI;
       let expr = ski.parse('I x');
       expect(''+expr).to.equal('I(x)');
       expr = expr.step();
       expect(''+expr).to.equal('x');
       expr = expr.step();
       expect(expr).to.equal(null);
       done();
    });

    it ('can parse basic expr: K', done => {
        const ski = new SKI;
        let expr = ski.parse('K x y');
        expect(''+expr).to.equal('K(x)(y)');
        expr = expr.step();
        expect(''+expr).to.equal('x');
        expr = expr.step();
        expect(expr).to.equal(null);
        done();
    });

    it ('can parse basic expr: S', done => {
        const ski = new SKI;
        let expr = ski.parse('S x y z');
        expect(''+expr).to.equal('S(x)(y)(z)');
        expr = expr.step();
        expect(''+expr).to.equal('x(z)(y(z))');
        expr = expr.step();
        expect(expr).to.equal(null);
        done();
    });

    it ('can execute simple expr: S K I x', done => {
        const ski = new SKI;
        const expr = ski.parse("SKIx");
        const result = expr.run(10);
        expect(''+result.result).to.equal('x');
        expect( result.final).to.equal(true);
        done();
    });

    it ('can execute simple expr: composition of funcs', done => {
        const ski = new SKI;
        const expr = ski.parse("S(K(S(S(KS)K)))K f g x");
        const result = expr.run(15);
        expect(''+result.result).to.equal('g(f(x))');
        expect(result.final).to.equal(true);
        done();
    });

    it ('can parse unknown words', done => {
        const ski = new SKI;
        const expr = ski.parse("food bard");
        expect(''+expr).to.equal("food(bard)");
        expect(expr.step()).to.equal(null);
        done();
    });

    it ('can perform unlimited calculations', done => {
        const ski = new SKI;
        const expr = ski.parse('SII(SII)');
        const result = expr.run(42);

        expect(''+result.result).to.equal('S(I)(I)(S(I)(I))');
        expect(result.steps).to.equal(42);
        expect(result.final).to.equal(false);

        done();
    });
});
