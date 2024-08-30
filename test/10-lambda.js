const { expect } = require('chai');
const { SKI } = require('../index');

const { Lambda } = SKI.classes;

describe('Lambda', function () {
    const [x, y, z, t1, t2] = SKI.free('x', 'y', 'z', 't1', 't2');

    it ('is indeed a lambda expression', () => {
        const expr = new Lambda([x, y], y.apply(x));

        const got = expr.run(t1, t2).expr;

        expect(''+got).to.equal('t2(t1)');
    });

    it ('has consistent equality', () => {
        const e1 = new Lambda([x, y], y.apply(x));
        const e2 = new Lambda([y, z], z.apply(y));
        const e3 = new Lambda([x, z], y.apply(x));
        const e4 = new Lambda([x], new Lambda([y], x));

        expect( e1.equals(e2)).to.equal(true);
        expect( e1.equals(e3)).to.equal(false);
        expect( e2.equals(e3)).to.equal(false);
        expect( e1.equals(SKI.K)).to.equal(false);
        expect( e1.equals(e4)).to.equal(false);
    });

    it ('successfully emulates K', () => {
        const k = new Lambda([x], new Lambda([y], x));
        expect(k.run(y, x).expr).to.equal(y);
    });

    it ('works with aliases', () => {
        const ski = new SKI;
        ski.add('T', 'S(K(SI))K');
        const expr = new Lambda( [x], ski.parse('T', {x}));

        expect(''+expr.run(y, z, t1).expr).to.equal('t1(z)');
        expect(expr.impl).to.be.instanceOf(SKI.classes.Alias);
    });

    it ('forbids empty var list', () => {
        expect( () => new Lambda([], x)).to.throw(/empty.*argument/i);
    });
    it ('forbids duplicate vars', () => {
        expect(() => new Lambda(SKI.free('x', 'x'), x)).to.throw(/duplicate/i);
    });

    it ('another stupid use case', () => {
        const kk = new Lambda([x], new Lambda([y], z));
        expect(kk.run(t1, t2).expr).to.equal(z);
    });

    it ('handles partial application', () => {
        const expr = new Lambda( [x, y], y.apply(x));
        const partial = expr.run(z).expr;
        const complete = partial.run(t1).expr;
        expect( ''+complete ).to.equal('t1(z)');
    });

    it('stringifies', () => {
        const expr = new Lambda([x, y], z);
        expect(''+expr).to.equal('x->y->z');
    });
});

describe ('Lambda parsing', () => {
    const ski = new SKI({lambdas: true});
    const [x, y, z, t1, t2] = SKI.free('x', 'y', 'z', 't1', 't2');

    it('can parse simple expressions', () => {
        const expr = ski.parseLine('x->y->x');
        expect( expr.run(t1, t2).expr ).to.equal(t1);
    });

    it('can parse compound terms', ()=>{
        const expr = ski.parse('x->xSK');
        expect( expr.run(expr, t1).expr ).to.equal(t1);
    });

    it ('handles complicated expressions', () => {
        const expr = ski.parse('x->K(y->y(x))');
        expect(expr.run(x, y, z).expr + '').to.equal('z(x)');
    });

    // TODO proper error handling, not this mess
    it ('forbids naughty syntax', () => {
        expect(()=>console.log(ski.parseLine('x->->y'))).to.throw();
    });

    it ('forbids naughty syntax II', () => {
        expect(()=>ski.parseLine('x->x->y')).to.throw();
    });

    it ('forbids naughty syntax III', () => {
        expect(()=>ski.parseLine('x(S)->y')).to.throw();
    });

    it ('forbids naughty syntax III', () => {
        expect(()=>ski.parseLine('x->y->y(x)->S')).to.throw();
    });

});

describe ('more lambdas', () =>{
    it ('allows partial evaluation', () => {
        const ski = new SKI();
        const expr = ski.parse('(x->y->x) S');

        expect(expr.run().expr.toString()).to.equal('y->S');
    });
});
