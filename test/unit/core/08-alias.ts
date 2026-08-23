import { expect } from 'chai';
import { SKI } from '../../../src/index';
import { Alias, Expr } from '../../../src/expr';
import { isInstanceOf } from '../../lib/assert';

describe('Alias', () => {
  const ski = new SKI();
  const { x, y, z } = SKI.vars();

  it('infers own properties', () => {
    const A = new Alias('A', ski.parse('SKK'), { canonize: true });
    expect(A).to.be.instanceOf(SKI.classes.Alias);
    expect(A.name).to.equal('A');

    expect(A.run(x).expr).to.equal(x);
    expect(A.arity).to.equal(1);
    expect(A.props?.normal).to.equal(true);
    expect(A.props?.discard).to.equal(false);
    expect(A.props?.duplicate).to.equal(false);
  });

  it('waits for arguments', () => {
    const C = new Alias('C', ski.parse('S(BBS)(KK)'), { canonize: true });

    expect(C.run(x, y).expr.format({ terse: false })).to.equal('C(x)(y)');

    C.makeInline();

    expect(C.run(x, y).expr.format({ terse: false })).to.equal('S(x)(K(y))');
  });

  it('can have infinite arity', () => {
    const pair = new Alias('pair', x.apply(y), { arity: Infinity });

    expect(pair.run(z, z, z, z, z).expr.format({ terse: false })).to.equal('pair(z)(z)(z)(z)(z)');
  });

  it('can be declared inline', () => {
    const expr = ski.parse('@inline T=CI');
    isInstanceOf(expr, Alias);
    expect(expr.inline).to.equal(true, 'alias with @inline tag is indeed inline');
    expect(expr + '').to.equal('CI');
  });

  it('can be declared inline + non-inline', () => {
    const expr = ski.parse('@inline temp1 = T=CI');
    isInstanceOf(expr, Alias);
    expect(expr.inline).to.equal(true, 'alias with @inline tag is indeed inline');
    isInstanceOf(expr.impl, Alias);
    expect(!expr.impl.inline).to.equal(true, 'nested alias is NOT inline');
    expect(expr + '').to.equal('T');
  });
});
