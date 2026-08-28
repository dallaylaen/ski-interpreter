import { expect } from 'chai';
import { SKI } from '../../../src/index';
import { isInstanceOf } from '../../lib/assert';
import { Named } from '../../../src/expr';

describe('SKI: adding terms to an engine, step by step', () => {
  const ski = new SKI({ atomic: true });
  modifyEngine(ski, 'nil=KI', ['nil x y']);
  modifyEngine(ski, 'T=CI', ['T x y']);
  modifyEngine(ski, 'V=BCT', ['V a b c']);
  modifyEngine(ski, '@atomic M=a->a a', ['M x y']);
  modifyEngine(ski, 'T', ['V a b c'], true);
});

function modifyEngine (engine: SKI, modification: string, sample: string[], remove: boolean = false) {
  const comment = `after ${remove ? 'removing' : 'adding'} ${modification}`;

  describe(comment, () => {
    let copy: SKI;

    before(() => {
      if (remove)
        engine.remove(modification);
      else {
        const term = engine.parse(modification);
        isInstanceOf(term, Named);
        engine.add(term);
      }

      const decl = engine.declare();
      console.log(comment, decl);
      copy = new SKI({ experimental: true });
      copy.bulkAdd(decl);
    });

    it('have equal inventories', () => {
      // call getTerms on both and compare the union of keys
      const terms1 = engine.getTerms();
      const terms2 = copy.getTerms();
      const allKeys = new Set([...Object.keys(terms1), ...Object.keys(terms2)]);

      for (const key of allKeys) {
        expect(terms1[key]).to.not.equal(undefined, 'term ' + key + ' missing in left engine');
        expect(terms2[key]).to.not.equal(undefined, 'term ' + key + ' missing in right engine');
        terms1[key].expect(terms2[key]);
        expect(terms2[key] + '').to.equal(terms1[key] + '', 'string representation of term ' + key + ' differs');
      }
    });

    for (const src of sample) {
      it(`sample ${src} should parse to equal expressions`, () => {
        const expr1 = engine.parse(src);
        const expr2 = copy.parse(src);
        expr1.expect(expr2);
      });
    }
  });
}
