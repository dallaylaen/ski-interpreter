const {expect} = require('chai');
const {SKI} = require('../index');

describe('SKI.options (global)', () => {
  const saved = { ...SKI.options };
  afterEach(() => {
    Object.assign(SKI.options, saved);
  });

  it ('can control max steps', () => {
    // emulate Perl's `local $Package::variable` with `try` and `finally`
    // is there a better way?
    const ski = new SKI();
    const saved = SKI.options.max;
    expect (ski.parse('SII(SII)').run().steps).to.equal(1000);
    SKI.options.max = 10;
    expect (ski.parse('SII(SII)').run().steps).to.equal(10);
  });

  it ('can control terse', () => {
    const ski = new SKI();
    const expr = ski.parse('SII(SII)');
    SKI.options.terse = false;
    expect(expr.toString()).to.equal('S(I)(I)(S(I)(I))');
    SKI.options.terse = true;
    expect(expr.toString()).to.equal('SII(SII)');
  });

  it ('can control maxArgs in canonical form search', () =>{
    const ski = new SKI();
    ski.add('c2', 'C');
    expect(ski.getTerms().c2.proper).to.equal(true);
    SKI.options.maxArgs = 2;
    ski.add('c3', 'C');
    expect(ski.getTerms().c3.proper).to.equal(false);
  });
});
