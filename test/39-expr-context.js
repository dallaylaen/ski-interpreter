'use strict';

const { expect } = require('chai');
const { SKI } = require('../index');

const { Expr, Alias } = SKI.classes;

describe('Expr.context', () => {
  const ski = new SKI();

  it('describes where the expr comes from', () => {
    const src = 'M=WI; L=BWB; BML';
    const expr = ski.parse(src);
    expect(typeof expr.context).to.equal('object');
    expect(expr.context.parser).to.equal(ski);
    expect(expr.context.src).to.equal(src);

    const env = expr.context.env;
    expect(typeof env).to.equal('object');
    expect(env.M).to.be.instanceOf(Expr);
    expect(env.M).to.be.instanceOf(Alias);
    expect(env.L).to.be.instanceOf(Expr);
    expect(env.L).to.be.instanceOf(Alias);
  });
});
