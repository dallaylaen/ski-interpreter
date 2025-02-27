// this is a mocha-based test like all others here

const { expect } = require ('chai');
const { SKI } = require('../index');

describe ('Expr.weight', () => {
    it('should return 0 for FreeVar', () => {
        const [expr] = SKI.free('x');
        expect(expr.weight()).to.equal(0);
    });

    it('should return 1 for Native', () => {
        expect(SKI.I.weight()).to.equal(1);
        expect(SKI.K.weight()).to.equal(1);
    });

    it ('works for complex expressions', () => {
        const ski = new SKI();
        const expr = ski.parse('S(KI)I');
        expect(expr.weight()).to.equal(4);
    });

    it ('works for Church numerals', () => {
        expect(SKI.church(0).weight()).to.equal(1);
        expect(SKI.church(1).weight()).to.equal(1);
        expect(SKI.church(2).weight()).to.equal(1);
        expect(SKI.church(100).weight()).to.equal(1);
    });

    it ('works for proper aliases', () => {
        const ski = new SKI();
        ski.add('T','CI');
        const expr = ski.parse('T x y');
        expect(expr.weight()).to.equal(1);
    });

    it ('works for improper aliases', () => {
        const ski = new SKI();
        ski.add('X', 'x->xSK');
        expect(ski.parse('X').weight()).to.equal(3);
    });

    it ('works for lambdas', () => {
        const ski = new SKI();
        const expr = ski.parse('x->y->y x');
        expect(expr.weight()).to.equal(2);
    });

    it ('works for lambdas that are not proper combinators', () => {
        const ski = new SKI();
        const expr = ski.parse('x->x(xII)');
        expect(expr.weight()).to.equal(3);
    });
});
