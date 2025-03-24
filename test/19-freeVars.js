const {expect} = require('chai');
const {SKI} = require('../index');

describe('Expr.freeVars', () => {
  const ski = new SKI();
  const set2list = set => [...set].sort().join(', ');
  it('holds for free vars themselves', () => {
    const [x] = SKI.free('x');
    expect(x.freeVars()).to.deep.equal(new Set([x]));
  });

  it ('holds for application', () => {
    const [x, y] = SKI.free('x', 'y');
    expect(x.apply(SKI.K.apply(y)).freeVars()).to.deep.equal(new Set([x, y]));
  });

  it ('holds for lambdas', () => {
    const [y] = SKI.free('y');
    const ty = ski.parse('x->y(x)', {y});
    expect(ty.freeVars()).to.deep.equal(new Set([y]));
  });

  it ('holds for some big equation', () => {
    const expr = ski.parse('K (S y) x (6 y z)');
    expect(set2list(expr.freeVars())).to.equal('x, y, z');
    expect(set2list(expr.run().expr.freeVars())).to.equal('y, z');
  });
});
