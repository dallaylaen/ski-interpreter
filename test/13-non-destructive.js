const { expect } = require('chai');
const { SKI } = require('../index');

describe('Expr.step', () => {
  it('does not destroy Native on execution', () => {
    const ski = new SKI();
    const expr = ski.parse('S(K(SI))K foo bar');

    const before = '' + expr;
    expr.step();
    const after = '' + expr;

    expect(after).to.equal(before);
  });

  it('does not destroy Lambda on execution', () => {
    const ski = new SKI();
    const expr = ski.parse('(x->y->y(x)) foo bar');

    const before = '' + expr;
    expr.step();
    const after = '' + expr;

    expect(after).to.equal(before);
  });

  it('does not destroy Church numbers on execution', () => {
    const ski = new SKI();
    const expr = ski.parse('20 foo bar');

    const before = '' + expr;
    expr.step();
    const after = '' + expr;

    expect(after).to.equal(before);
  });
});
