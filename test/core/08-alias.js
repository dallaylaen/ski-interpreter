'use strict';

const { expect } = require('chai');
const { SKI } = require('../../src/index');

describe('Alias', () => {
  const ski = new SKI();
  const { x, y, z } = SKI.vars();

  it('infers own properties', () => {
    const A = new SKI.classes.Alias('A', ski.parse('SKK'), { canonize: true });
    expect(A).to.be.instanceOf(SKI.classes.Alias);
    expect(A.name).to.equal('A');

    expect(A.run(x).expr).to.equal(x);
    expect(A.arity).to.equal(1);
    expect(A.props?.normal).to.equal(true);
    expect(A.props?.discard).to.equal(false);
    expect(A.props?.duplicate).to.equal(false);
  });

  it('waits for arguments', () => {
    const C = new SKI.classes.Alias('C', ski.parse('S(BBS)(KK)'), { canonize: true });

    expect(C.run(x, y).expr.format({ terse: false })).to.equal('C(x)(y)');

    C.makeInline();

    expect(C.run(x, y).expr.format({ terse: false })).to.equal('S(x)(K(y))');
  });

  it('can have infinite arity', () => {
    const pair = new SKI.classes.Alias('pair', x.apply(y), { arity: Infinity });

    expect(pair.run(z, z, z, z, z).expr.format({ terse: false })).to.equal('pair(z)(z)(z)(z)(z)');
  });
});
