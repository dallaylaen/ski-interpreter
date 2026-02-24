const { expect } = require('chai');
const { SKI } = require('../index');
const { Expr, Alias } = SKI.classes;

describe( 'SKI', () => {
  it( 'catches bad input', done => {
    const ski = new SKI({ numbers: false, lambdas: false, allow: 'SKI' });
    expect( () => { ski.parseLine( 'foo(' ) }).to.throw(/unbalanced/i);
    expect( () => { ski.parseLine( 'foo)' ) }).to.throw(/unbalanced/i);

    expect( () => { ski.parseLine( 'S ~ **' ) }).to.throw(/tokens.*~ \*\*/);
    expect( () => { ski.parseLine( 'S 1 2 3' ) }).to.throw(/numbers.*not supported/);

    expect( () => { ski.parseLine('\\%') }).to.throw(/tokens.*starting with [\\]*%/);

    expect(() => { ski.parseLine('') }).to.throw(/ttempt to .* \(\)/);
    expect(() => { ski.parseLine('SK()') }).to.throw(/ttempt to .* \(\)/);

    done();
  });

  it( 'forbids unknown stringification', () => {
    expect(() => '' + new Noob()).to.throw(/.*defined.*Noob/);
  });

  it('Forbids strange stuff in named terms', () => {
    expect(() => new Alias({ foo: 42 }, SKI.S)).to.throw(/improper name/);
  });

  it('forbids numbers & lambdas when forbidden', () => {
    const ski = new SKI({ lambdas: false, numbers: false, allow: 'SKI' });
    expect( () => ski.parse('x -> y')).to.throw(/Lambdas not supported/i);
    expect( () => ski.parse('5 x y')).to.throw(/numbers not supported/i);
    expect( () => ski.parse('CW')).to.throw(/\bC\b.*not in .* restricted/);
  });

  it('forbids adding garbage to known terms', () => {
    const ski = new SKI();
    expect(() => ski.add('foobar', { foo: 42 })).to.throw(/Expr\b.*\bstring/);
  });
});

class Noob extends Expr {

}
