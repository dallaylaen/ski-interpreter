const { expect } = require('chai');
const { Runtime } = require('../index');

describe( 'SKI', () => {
    it ('can parse basic expr: I', done => {
       const ski = new Runtime;
       let expr = ski.parse('I x');
       expect(''+expr).to.equal('I(x)');
       expr = expr.eval();
       expect(''+expr).to.equal('x');
       expr = expr.eval();
       expect(expr).to.equal(null);
       done();
    });

    it ('can parse basic expr: K', done => {
        const ski = new Runtime;
        let expr = ski.parse('K x y');
        expect(''+expr).to.equal('K(x)(y)');
        expr = expr.eval();
        expect(''+expr).to.equal('x');
        expr = expr.eval();
        expect(expr).to.equal(null);
        done();
    });

    it ('can parse basic expr: S', done => {
        const ski = new Runtime;
        let expr = ski.parse('S x y z');
        expect(''+expr).to.equal('S(x)(y)(z)');
        expr = expr.eval();
        expect(''+expr).to.equal('x(z)(y(z))');
        expr = expr.eval();
        expect(expr).to.equal(null);
        done();
    });

    it ('can execute simple expr: S K I x', done => {
        const ski = new Runtime;
        const expr = ski.parse("SKIx");
        const result = expr.run(10);
        expect(''+result).to.equal('x');
        done();
    });

    it ('can execute simple expr: composition of funcs', done => {
        const ski = new Runtime;
        const expr = ski.parse("S(K(S(S(KS)K)))K f g x");
        const result = expr.run(15);
        expect(''+result).to.equal('g(f(x))');
        done();
    });
});
