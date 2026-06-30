'use strict';

const { expect } = require('chai');
const { SKI } = require('../../src');

describe('Parser.bulkAdd', () => {
  it('can set up terms', () => {
    const ski = new SKI();
    ski.bulkAdd(['T=CI', 'V=BCT']);

    expect(ski.getTerms().V).to.be.instanceof(SKI.classes.Alias);

    ski.parse('c a b').expect(ski.parse('V a b c').run().expr);
  });

  it('can lift restrictions', () => {
    const ski = new SKI();
    ski.restrict('I-I'); // forbid all terms

    expect(() => ski.parse('T=CI')).to.throw(/restricted set/);

    ski.bulkAdd(['I', 'B', 'C', 'T=CI', 'V=BCT']);

    expect(ski.getTerms().V).to.be.instanceof(SKI.classes.Alias);

    ski.parse('c a b').expect(ski.parse('V a b c').run().expr);
  });
});
