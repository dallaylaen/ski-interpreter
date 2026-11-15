import { expect } from 'chai';

import { SKI } from '../../../src';
import { stripAlias, isInstanceOf } from '../../lib/assert';

describe('Atomic: supports legacy @atomic def', () => {
  const ski = new SKI({ atomic: true, experimental: true });
  it('works for non self-ref', () => {
    const src = '@atomic T = x->y->y x';
    const T = ski.parse(src);
    isInstanceOf(stripAlias(T), SKI.classes.Atomic);
    expect(T + '').to.equal('T');
    const { a, b } = SKI.vars();
    const res = T.run(a, b);
    expect(res.steps).to.equal(1);
    b.apply(a).expect(res.expr);

    ski.parse('T a b = b a').expect(T);
  });

  it('works for self-ref terms', () => {
    const src = '@atomic P = x->xPx';
    const P = ski.parse(src);

    isInstanceOf(stripAlias(P), SKI.classes.Atomic);

    expect(P + '').to.equal('P');
    const { f } = SKI.vars();
    const res = P.run(f);
    expect(res.steps).to.equal(1);
    f.apply(P, f).expect(res.expr);

    expect(P.declare()).to.match(/^P\s*x\s*=\s*x\s*P\s*x;?$/);

    ski.parse('P x = x P x').expect(P);
  });
});
