const { expect } = require('chai');
const { SKI } = require('../index');
const { Expr } = SKI.classes;

describe( 'SKI', () => {
  it ('can handle pedestrian free var application', () => {
    const [a, b, c] = SKI.free('a', 'b', 'c');
    const app = a.apply(c, b.apply(c));
    expect(app.toString({terse: false})).to.equal('a(c)(b(c))');
  });

  it ('Can parse basic applications', () => {
    const ski = new SKI;
    const expr = ski.parseLine('x z (y z)');
    console.log(expr.toString({terse: false}));
  });

  it ('Installed the basic terms correctly', () => {
    expect(SKI.S.arity).to.equal(3);
    expect(SKI.S.note.replace(/<\/?var>/g, '').replace(/\s*&mapsto;\s*/g, '->')).to.equal('a->b->c->a c(b c)');
  });

  it ('can parse basic expr: S', done => {
    const ski = new SKI;
    const s0 = ski.parseLine('S x y z');
    expect(''+s0).to.equal('Sx y z');
    const s1 = s0.step();
    expect(''+s1.expr).to.equal('x z(y z)');
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
    expect(''+result.expr).to.equal('g(f x)');
    expect(result.final).to.equal(true);
    done();
  });

  it ('can parse unknown words', done => {
    const ski = new SKI;
    const expr = ski.parseLine("food bard");
    expect(''+expr).to.equal("food bard");
    expect(expr.step()).to.deep.equal({expr, steps: 0, changed: false});
    done();
  });

  it ('can perform unlimited calculations', done => {
    const ski = new SKI;
    const expr = ski.parseLine('WWW');
    const result = expr.run({max: 42});

    expect(''+result.expr).to.equal('WWW');
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
