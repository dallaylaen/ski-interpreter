/**
 * Ensure that new Alias(...).makeInline() is indistinguishable
 * from new Alias(..., { inline: true }).
 */

import { expect } from 'chai';
import { SKI } from '../../../src';
import { Alias, Expr } from '../../../src/expr';

const ski = new SKI();
const { a, b, c } = SKI.vars({});

describe('Alias.makeInline() vs Alias constructor with inline option', () => {
  describe('has the same:', () => {
    const [inline, mutated] = mkPair('V', 'BC(CI)');
    it('arity', () => expect(inline.arity).to.equal(mutated.arity));
    it('toString()', () => expect(inline.toString()).to.equal(mutated.toString()));
    it('walk()', () => expect(walk(inline)).to.deep.equal(walk(mutated)));
    it('walk(a, b, c)', () => expect(walk(inline, a, b, c)).to.deep.equal(walk(mutated, a, b, c)));
    it('produces predictable eval', () => c.apply(a, b).expect(mutated.apply(a, b, c).run().expr));
  })
});

function mkPair (name: string, src: string, options = {}) {
  const expr = ski.parse(src);
  return [
    new Alias(name, expr, { ...options, inline: true }),
    new Alias(name, expr, { ...options, inline: false }).makeInline(),
  ]
}

function walk (expr: Expr, ...args: Expr[]): string[] {
  return [...expr.apply(...args).walk()].map(e => e.toString());
}
