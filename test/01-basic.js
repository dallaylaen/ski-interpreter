const { expect } = require('chai');
const { SKI } = require('../index');
const { Expr } = SKI.classes;

describe( 'SKI', () => {
    it ('can parse basic expr: S', done => {
        const ski = new SKI;
        const s0 = ski.parseLine('S x y z');
        expect(''+s0).to.equal('S(x)(y)(z)');
        const s1 = s0.step();
        expect(''+s1.expr).to.equal('x(z)(y(z))');
        const s2 = s1.expr.step();
        expect(s2.steps).to.equal(0);
        expect(s2.expr).to.equal(s1.expr);
        done();
    });

    it ('can execute simple expr: S K I x', done => {
        const ski = new SKI;
        const expr = ski.parseLine("SKIx");
        const result = expr.run(10);
        expect(''+result.expr).to.equal('x');
        expect( result.final).to.equal(true);
        done();
    });

    it ('can execute simple expr: composition of funcs', done => {
        const ski = new SKI;
        const expr = ski.parseLine("S(K(S(S(KS)K)))K f g x");
        const result = expr.run(15);
        expect(''+result.expr).to.equal('g(f(x))');
        expect(result.final).to.equal(true);
        done();
    });

    it ('can parse unknown words', done => {
        const ski = new SKI;
        const expr = ski.parseLine("food bard");
        expect(''+expr).to.equal("food(bard)");
        expect(expr.step()).to.deep.equal({expr, steps: 0, changed: false});
        done();
    });

    it ('can perform unlimited calculations', done => {
        const ski = new SKI;
        const expr = ski.parseLine('SII(SII)');
        const result = expr.run({max: 42});

        expect(''+result.expr).to.equal('S(I)(I)(S(I)(I))');
        expect(result.steps).to.equal(42);
        expect(result.final).to.equal(false);

        done();
    });

    it ('can throw on hung calculation if told so', done => {
        const ski = new SKI;
        const expr = ski.parseLine('SII(SII)');
        expect( () => expr.run({max: 15, throw: true}) ).to.throw(/failed.*15.*steps/i);

        done();
    });
});
