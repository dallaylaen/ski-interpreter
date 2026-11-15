import { expect } from 'chai';

import { SKI } from '../../../src';
import { Alias, Expr, Lambda, Named, Atomic } from '../../../src/expr';


describe('Atomic: supports legacy @atomic def', () => {
  const ski = new SKI({ atomic: true, experimental: true });
  it('works for non self-ref', () => {
    const src = '@atomic T = x->y->y x';
    const T = ski.parse(src);
    expect(T + '').to.equal('T');
    const { a, b } = SKI.vars();
    const res = T.run(a, b);
    expect(res.steps).to.equal(1);
    b.apply(a).expect(res.expr);
  });

  it('works for self-ref terms', () => {
    const src = '@atomic P = x->xPx';
    const P = ski.parse(src);

    expect(P + '').to.equal('P');
    const { f } = SKI.vars();
    const res = P.run(f);
    expect(res.steps).to.equal(1);
    f.apply(P, f).expect(res.expr);

    expect(P.declare()).to.match(/^P\s*x\s*=\s*x\s*P\s*x;?$/);
  });
});