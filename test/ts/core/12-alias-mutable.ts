/**
 * Ensure that new Alias(...).makeInline() is indistinguishable
 * from new Alias(..., { inline: true }).
 */

import { expect } from 'chai';
import { SKI } from '../../../src';
import { Alias } from '../../../src/expr';

const ski = new SKI();

describe('Alias.makeInline() vs Alias constructor with inline option', () => {
  // A few representative expressions to alias
  const cases: Array<[string, string]> = [
    ['I',       'I'],
    ['B',       'S(KS)K'],
    ['L',       'BWB'],
    ['10 L I x', 'BWB'],
  ];

  for (const [label, implStr] of cases) {
    describe(`label = ${implStr}`, () => {
      const impl = ski.parse(implStr);

      const viaConstructor = new Alias(label, impl, { inline: true });
      const viaMakeInline  = new Alias(label, impl).makeInline();

      it('both have inline === true', () => {
        expect(viaConstructor.inline).to.equal(true);
        expect(viaMakeInline.inline).to.equal(true);
      });

      it('size matches impl.size', () => {
        expect(viaConstructor.size).to.equal(impl.size, 'constructor path');
        expect(viaMakeInline.size).to.equal(impl.size, 'makeInline() path');
      });

      it('sizes are equal to each other', () => {
        expect(viaMakeInline.size).to.equal(viaConstructor.size);
      });

      it('arity is identical', () => {
        expect(viaMakeInline.arity).to.equal(viaConstructor.arity);
      });

      it('invoke produces the same result', () => {
        const arg = ski.parse('x');
        const r1 = viaConstructor.invoke(arg);
        const r2 = viaMakeInline.invoke(arg);
        // Both should reduce identically — compare formatted output
        if (r1 === null || r2 === null)
          expect(r1).to.equal(r2);
        else {
          const run1 = (typeof r1 === 'function' ? r1 : r1).toString();
          const run2 = (typeof r2 === 'function' ? r2 : r2).toString();
          expect(run2).to.equal(run1);
        }
      });

      it('step() expands to impl', () => {
        const s1 = viaConstructor.step();
        const s2 = viaMakeInline.step();
        expect(s1.changed).to.equal(s2.changed, 'changed flag');
        expect(s1.steps).to.equal(s2.steps, 'steps count');
        s1.expr.expect(s2.expr, `step() result for ${implStr}`);
      });
    });
  }
});
