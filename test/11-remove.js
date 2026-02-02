const {expect} = require('chai');
const {SKI} = require('../index');

describe('SKI.remove', () => {
  it('removes terms from the interpreter', () => {
    const {x} = SKI.vars();
    const show = expr => expr.format({terse: false});

    const ski = new SKI;
    ski.add('T', 'S(K(SI))K');
    const expr = ski.parse('STT');
    expect(show(expr.run(x).expr)).to.equal('x(x)');
    expect(show(expr)).to.equal('S(T)(T)');
    ski.remove('T');
    expect(show(expr)).to.equal('S(S(K(S(I)))(K))(S(K(S(I)))(K))');
    expect(show(expr.run(x).expr)).to.equal('x(x)');

    const expr2 = ski.parse('STT');
    expect(show(expr2.run(x).expr)).to.equal('T(x)(T(x))');
  });
});
