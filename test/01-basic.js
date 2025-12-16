const { expect } = require('chai');
const { SKI } = require('../index');
const { Expr } = SKI.classes;

describe( 'SKI', () => {
  it ('can handle pedestrian free var application', () => {
    const [a, b, c] = SKI.free('a', 'b', 'c');
    const app = a.apply(c, b.apply(c));
    expect(app.format({terse: false})).to.equal('a(c)(b(c))');
  });

  it ('Can parse basic applications', () => {
    const ski = new SKI;
    const expr = ski.parseLine('x z (y z)');
    console.log(expr.format({terse: false}));
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

  it ('makes at least one step on any calculation', () => {
    const ski = new SKI;
    const expr = ski.parseLine('SK x y ');

    for (const max of [0, 0.99, -1.5]) {
      const result = expr.run({max});
      expect(result.steps).to.equal(1);
      expect('' + result.expr).to.match(/^K *\(?y\)? *\(x *\(?y\)?\)$/);
    }

    // make sure continued calculation does the same, too
    const result = expr.run({max: 1, steps: 100});
    expect(result.steps).to.equal(101);
    expect('' + result.expr).to.match(/^K *\(?y\)? *\(x *\(?y\)?\)$/);
  });
});

describe('Expr.expect', () => {
  it ('throws on non-equal expressions', () => {
    const ski = new SKI;
    const expr1 = ski.parse('S');
    const expr2 = ski.parse('K');
    expect(() => expr1.expect(expr2)).to.throw(/found.*S.*expected.*K/);
  });
  it ('provides a diff', () => {
    const ski = new SKI;
    const expr1 = ski.parse('S');
    const expr2 = ski.parse('K');
    try {
      expr1.expect(expr2);
    }
    catch (e) {
      expect(e.expected).to.equal('K');
      expect(e.actual).to.equal('S');
      return;
    }
    throw new Error('Expected an exception to be thrown');
  });
  it ('adheres comments', () => {
    const ski = new SKI;
    const expr1 = ski.parse('S');
    const expr2 = ski.parse('K');
    expect(() => expr1.expect(expr2, 'foobared')).to.throw(/foobared: .*found.*S.*expected.*K/);
  });
  it ('lives for equal expressions', () => {
    const ski = new SKI;
    const expr1 = ski.parse('a->a a');
    const expr2 = ski.parse('x->x x');
    expr1.expect(expr2);
  });
});

describe('normal reduction order', () => {
  const check = (src, dst, max) => {
    it ('calculates ' + src + ' to the end', () => {
      const ski = new SKI();
      const jar = {};
      const start = ski.parse(src, jar);
      const end = ski.parse(dst, jar);

      start.run({max, throw: 1}).expr.expect(end);
    });
  };

  check( 'S K _ x', 'x', 10);
  check( 'WI(W(B(SI))) (KI)', 'I', 50);
  check( 'CI(WWW)(Kx)', 'x', 50);
  check( 'KI(WWW)', 'I', 2);
});
