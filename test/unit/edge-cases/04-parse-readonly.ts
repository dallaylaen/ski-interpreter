import { expect } from 'chai';
import { SKI } from '../../../src/index';

describe('SKI.parse', () => {
  it('does not affect existing terms', () => {
    const ski = new SKI({ addContext: true });
    const S = ski.getTerms().S;
    const dynamic = S as unknown as Record<string, unknown>;
    const saved: Record<string, unknown> = {};
    Object.getOwnPropertyNames(S).forEach(name => { saved[name] = dynamic[name]; });

    const scope = ['local'];

    const expr = ski.parse('S', { scope });

    expect(expr.context?.scope).to.equal(scope);
    expect(S.context?.scope).to.equal(undefined);

    S.expect(expr);

    const saved2: Record<string, unknown> = {};
    Object.getOwnPropertyNames(S).forEach(name => { saved2[name] = dynamic[name]; });

    expect(saved2).to.deep.equal(saved, 'own properties of S were unchanged');
  });
});
