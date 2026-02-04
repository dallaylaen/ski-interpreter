/**
 *  Smoke test the interpreter and also the facilities used by other tests.
 *  Ideally we should bail out if these tests fail.
 */

'use strict';
const { expect } = require('chai');
const { SKI } = require('../index');

describe ('SKI.classes', () => {
  it ('exposes the core classes', () => {
    // expect to be object
    expect(SKI.classes).to.be.an('object');

    // expect some core classes to be present & be constructors
    for (const cls of ['Expr', 'FreeVar', 'Lambda', 'Native', 'Alias']) {
      expect(SKI.classes[cls]).to.be.a('function', 'Expected SKI.classes.' + cls + ' to be a constructor');
    }
  });
});

describe( 'SKI.classes.FreeVar', () => {
  it ('creates global free vars identical to one another', () => {
    const x0 = new SKI.classes.FreeVar('x', null);
    const x1 = new SKI.classes.FreeVar('x', null);
    const y = new SKI.classes.FreeVar('y', null);

    expect(x1.equals(x0)).to.equal(true);
    expect(x1.equals(y)).to.equal(false);
    expect(x1.subst(x0, y).equals(y)).to.equal(true);
  });
});

describe( 'SKI.vars', () => {
  it ('can create named variables with unforeknown names', () => {
    const {x, y, z} = SKI.vars();

    expect(x).to.be.instanceOf(SKI.classes.FreeVar);
    expect(y).to.be.instanceOf(SKI.classes.FreeVar);
    expect(z).to.be.instanceOf(SKI.classes.FreeVar);

    expect(x.name).to.equal('x');
    expect(y.name).to.equal('y');
    expect(z.name).to.equal('z');

    expect(x.apply(z, y.apply(z)) + '').to.equal('x z(y z)');
  });

  it ('distinguishes different invocations', () => {
    const first = SKI.vars();
    const second = SKI.vars();

    const a0 = first.a;
    const a1 = first.a;
    const a2 = second.a;

    expect(a1.equals(a0)).to.equal(true);
    expect(a1.equals(a1)).to.equal(true);
    expect(a1.equals(a2)).to.equal(false);

    const b1 = first.b;
    const b2 = second.b;

    expect(b1.equals(b2)).to.equal(false);
    expect(a1.equals(b1)).to.equal(false);
  });
});


describe( 'SKI', () => {
  it ('can handle pedestrian free var application', () => {
    const {a, b, c} = SKI.vars();
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

  it('can parse with respect to scope', () => {
    const ski = new SKI();
    const ctx = {};
    const expr1 = ski.parse('foo', { scope: ctx });
    expect(expr1.scope).to.equal(ctx);
    expect(expr1.name).to.equal('foo');

    const expr2 = ski.parse('foo', { scope: ctx });

    expect(expr1.equals(expr2)).to.equal(true);

    const expr3 = ski.parse('foo');
    expect(expr1.equals(expr3)).to.equal(false);

    const expr4 = ski.parse('bar', { scope: ctx });
    expect(expr1.equals(expr4)).to.equal(false);
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
    expect(() => expr1.expect(expr2)).to.throw(/S *!= *K/);
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
    expect(() => expr1.expect(expr2, 'foobared')).to.throw(/foobared: .*\bS *!= *K\b/);
  });
  it ('lives for equal expressions', () => {
    const ski = new SKI;
    const expr1 = ski.parse('a->a a');
    const expr2 = ski.parse('x->x x');
    expr1.expect(expr2);
  });
});

describe('normal reduction order', () => {
  const descend = (src, ...path) => {
    it ('reduces ' + src + ' via ' + path.join(", "), () => {
      const ski = new SKI();
      let expr = ski.parse(src);
      for (const step of path) {
        expr = expr.step().expr;
        ski.parse(step).expect(expr);
      }
    });
  };

  descend( 'S K _ x', 'K x (_ x)', 'x');
  descend( 'CK(Ix)', 'CKx', 'CKx');
  descend( 'CK(Ix)y', 'Ky(Ix)', 'y');
  descend( 'C(IK)(Ix)', 'CK(Ix)', 'CKx', 'CKx');
  descend( 'C(IK)(Ix)y', 'IKy(Ix)', 'Ky(Ix)', 'y');
  descend( 'WI(WI)', 'I(WI)(WI)', 'WI(WI)');
  descend( 'S(K(SI))K x y', 'K(SI)x(Kx)y', 'SI(Kx)y', 'Iy(Kx y)', 'y(Kx y)', 'y x');
  descend( 'a->Ix', 'a->Ix');
  descend( '(a->Ix) y', 'Ix', 'x' );

});
