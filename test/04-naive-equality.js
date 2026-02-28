const { expect } = require('chai');
const { SKI } = require('../index');

describe('SKI.equals', () => {
  it('actually works as equality', done => {
    const ski = new SKI();
    expect( ski.parse('SII').equals(ski.parse('SII'))).to.equal(true);
    expect( ski.parse('K').equals(ski.parse('K'))).to.equal(true);
    expect( ski.parse('KI').equals(ski.parse('SK'))).to.equal(false);
    done();
  });

  it('works for global free variables', done => {
    const ski = new SKI();
    expect( ski.parse('x').equals(ski.parse('x'))).to.equal(true);
    expect( ski.parse('Ix').equals(ski.parse('Ix'))).to.equal(true);
    done();
  });

  it('can actually be used to compare function by feeding them the same free terms', done => {
    const ski = new SKI();
    const e1 = ski.parse('SK');
    const e2 = ski.parse('KI');
    const x = ski.parse('x');
    const y = ski.parse('y');

    expect( e1.run(x).expr.equals(e2.run(x).expr) ).to.equal(false);
    expect( e1.run(x, y).expr.equals(e2.run(x, y).expr) ).to.equal(true);
    expect( e1.run(x, y).expr.equals(e2.run(y, x).expr) ).to.equal(false);

    done();
  });

  it('can compare aliases to the same thing', done => {
    const ski = new SKI();

    ski.add('foo', 'SK');
    ski.add('bar', 'SK');

    const { foo, bar } = ski.getTerms();

    expect(foo.equals(bar)).to.equal(true);

    ski.add('foo', 'KI');
    const foo2 = ski.getTerms().foo;

    expect(foo.equals(foo2)).to.equal(false);

    done();
  });

  it('handles other tricky cases', () => {
    const ski = new SKI();
    expect(ski.parse('SI').equals(ski.parse('SII'))).to.equal(false);
  });

  it('can compare Church numbers', () => {
    expect(SKI.church(5).equals(SKI.church(5))).to.equal(true);
    expect(SKI.church(5).equals(SKI.church(4))).to.equal(false);
    expect(SKI.church(1).equals(SKI.I)).to.equal(false);
  });

  const eqCases = [
    ['x', 'x'],
    ['S', 'S'],
    ['SKK', 'SKK'],
    ['5', '5'],
    ['x->xS', 'y->yS'],
    ['T=CI', 'CI'],
    ['CI', 'T=CI'],
    ['x=SK', 'y=SK'],
  ];

  const ineqCases = [
    ['S', 'K'],
    ['S', 'SK'],
    ['x', 'y'],
    ['5', '6'],
    ['K', 'x->y->x'],
    ['T=CI', 'T=SK'],
  ];

  const ski = new SKI();

  for (const [term1, term2] of eqCases) {
    it(`equates ${term1} to ${term2}`, () => {
      const t1 = ski.parse(term1);
      const t2 = ski.parse(term2);
      expect(t1.equals(t2)).to.equal(true);
      expect(t2.equals(t1)).to.equal(true);
    });
  }

  for (const [term1, term2] of ineqCases) {
    it(`distinguishes ${term1} from ${term2}`, () => {
      const t1 = ski.parse(term1);
      const t2 = ski.parse(term2);
      expect(t1.equals(t2)).to.equal(false);
      expect(t2.equals(t1)).to.equal(false);
    });
  }
});
