const { expect } = require('chai');
const { SKI } = require('../../src/index');

describe('SKI.parse', () => {
  it('does not affect existing terms', () => {
    const ski = new SKI({ addContext: true });
    const S = ski.getTerms().S;
    const saved = {};
    Object.getOwnPropertyNames(S).forEach(name => { saved[name] = S[name]; });

    const scope = ['local'];

    const expr = ski.parse('S', { scope });

    expect(expr.context?.scope).to.equal(scope);
    expect(S.context?.scope).to.equal(undefined);

    S.expect(expr);

    const saved2 = {};
    Object.getOwnPropertyNames(S).forEach(name => { saved2[name] = S[name]; });

    expect(saved2).to.deep.equal(saved, 'own properties of S were unchanged');
  });
});
