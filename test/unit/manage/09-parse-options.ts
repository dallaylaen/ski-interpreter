import { expect } from 'chai';
import { SKI } from '../../../src';
import { Named } from '../../../src/expr';
import { isInstanceOf } from '../../lib/assert';

describe('Parser: engine options as ParseOptions defaults', () => {
  it('stores engine-wide defaults in a single options object', () => {
    const ski = new SKI({ numbers: false, lambdas: false, atomic: true, experimental: true, annotate: true, addContext: true });
    expect(ski.options).to.deep.equal({
      numbers:      false,
      lambdas:      false,
      atomic:       true,
      experimental: true,
      annotate:     true,
      addContext:   true,
    });
  });

  it('defaults to permissive numbers/lambdas and restrictive atomic/experimental', () => {
    const ski = new SKI();
    expect(ski.options).to.deep.equal({
      numbers:      true,
      lambdas:      true,
      atomic:       false,
      experimental: false,
      annotate:     false,
      addContext:   false,
    });
  });

  it('honors numbers/lambdas overrides per parse() call', () => {
    const ski = new SKI({ numbers: false, lambdas: false });

    expect(() => ski.parse('3')).to.throw(/Church numbers/);
    expect(ski.parse('3', { numbers: true }).run().expr + '').to.equal('3');

    expect(() => ski.parse('x->x')).to.throw(/Lambdas/);
    expect(ski.parse('x->x', { lambdas: true }).run().expr + '').to.equal('x->x');
  });

  it('honors atomic/experimental overrides per parse() call', () => {
    const ski = new SKI(); // atomic: false, experimental: false by default

    expect(() => ski.parse('@atomic M = x->x x')).to.throw(/atomic terms explicitly/);
    const m1 = ski.parse('@atomic M = x->x x', { atomic: true });
    const m2 = ski.parse('@atomic M = x->x x', { experimental: true });
    isInstanceOf(m1, Named);
    isInstanceOf(m2, Named);
    expect((m1 as Named).name).to.equal('M');
    expect((m2 as Named).name).to.equal('M');
  });

  it('honors addContext override per parse() call', () => {
    const ski = new SKI(); // addContext: false by default

    expect(ski.parse('S K K').context).to.equal(undefined);
    expect(ski.parse('S K K', { addContext: true }).context).to.not.equal(undefined);
  });

  it('does not mutate engine defaults when overriding per parse() call', () => {
    const ski = new SKI({ numbers: false });
    ski.parse('3', { numbers: true });
    expect(ski.options.numbers).to.equal(false);
    expect(() => ski.parse('3')).to.throw(/Church numbers/);
  });
});
