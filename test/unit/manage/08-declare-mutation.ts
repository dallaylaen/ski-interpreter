import { expect } from 'chai';
import { SKI } from '../../../src';
import { isInstanceOf } from '../../lib/assert';
import { Named } from '../../../src/expr';

describe('SKI: adding terms to an engine, step by step', () => {
  describe('easy case, minimal interdependencies', () => {
    const ski = new SKI({ atomic: true });
    modifyEngine(ski, 'nil=KI', [['nil x y', 'y']]);
    modifyEngine(ski, 'T=CI', [['T x y', 'y x']]);
    modifyEngine(ski, 'V=BCT', [['V a b c', 'c a b']]);
    modifyEngine(ski, '@atomic M=a->a a', [['M x', 'x x']]);
    modifyEngine(ski, 'T', [['V a b c', 'c a b'], ['T a b', 'T=; T a b']], true);
  });

  describe('override primitive term', () => {
    const ski = new SKI({ atomic: true });
    modifyEngine(ski, 'T=S(K(SI))K', [['T x y', 'y x']]);
    modifyEngine(ski, 'M=SII', [['M x', 'x x']]);
    modifyEngine(ski, 'tmp = S', []);
    modifyEngine(ski, 'S=K', []);
    modifyEngine(ski, 'K=tmp', []);
    modifyEngine(ski, 'tmp', [], true);
    modifyEngine(ski, 'B=K(SK)S', [['B x y z', 'x (y z)']]);
    modifyEngine(ski, 'R=MBT', [['R x y z', 'y z x']]);
  });

  describe('compound atomic terms', () => {
    const ski = new SKI({ atomic: true });
    modifyEngine(ski, '@atomic P = x->y->x', [['P a b', 'a']]);
    modifyEngine(ski, '@atomic Q = x->y->z->x z (y z)', [['Q a b c', 'a c (b c)'], ['QPPa', 'a']]);
    modifyEngine(ski, '@atomic X = x->xQP', [['X(XX) a b', 'b']]);
  });
});

function modifyEngine (engine: SKI, modification: string, sample: [src: string, result: string][], remove: boolean = false) {
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
      // console.log(comment, decl);
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

    for (const [src, toSrc] of sample) {
      it(`sample '${src}' should be equal and reduce to '${toSrc}'`, () => {
        const expr1 = engine.parse(src);
        const expr2 = copy.parse(src);
        const result = engine.parse(toSrc);
        expr1.expect(expr2);
        result.expect(expr1.run().expr);
        result.expect(expr2.run().expr);
      });
    }
  });
}
