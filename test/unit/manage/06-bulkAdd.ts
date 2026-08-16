import { expect } from 'chai';
import { SKI } from '../../../src';
import { isInstanceOf } from '../../lib/assert';
import { PureNative } from '../../../src/expr';

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

  it('can import @atomic terms', () => {
    const ski = new SKI({ atomic: true });
    ski.bulkAdd(['@atomic V=a->b->f->f a b']);

    isInstanceOf(ski.getTerms().V, PureNative);

    const trace = [...ski.parse('V a b f').walk()].map(x => x.expr + '');

    expect(trace.map(s => s.replace(/ /g, ''))).to.deep.equal(['Vabf', 'fab']);
  });
});
