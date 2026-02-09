const { expect } = require('chai');
const { SKI } = require('../index');

describe( 'SKI.*', () => {
  it('provides essential constants', done => {
    const { S, K, I } = SKI;
    expect( S.apply(K).apply(K).apply(I).run().expr.toString() ).to.equal('I');

    done();
  });

  it('provides Church numbers', done => {
    const { x, y } = SKI.vars();
    expect(SKI.church(0).apply(x, y).run().expr.format({ terse: false })).to.equal('y');
    expect(SKI.church(1).apply(x, y).run().expr.format({ terse: false })).to.equal('x(y)');
    expect(
      SKI.church(5).apply(x, y).run().expr.format({ terse: false })
    ).to.equal('x(x(x(x(x(y)))))');

    // ditto but with strings in place of numbers
    expect(SKI.church('0').apply(x, y).run().expr.format({ terse: false })).to.equal('y');
    expect(SKI.church('1').apply(x, y).run().expr.format({ terse: false })).to.equal('x(y)');
    expect(
      SKI.church('5').apply(x, y).run().expr.format({ terse: false })
    ).to.equal('x(x(x(x(x(y)))))');

    // invalid numbers
    expect( () => SKI.church(-1) ).to.throw(/must be a non-?negative/);
    expect( () => SKI.church('foo') ).to.throw(/must be a non-?negative/);

    done();
  });
});
