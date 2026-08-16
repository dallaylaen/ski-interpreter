import { expect } from 'chai';
// import { isInstanceOf } from '../../lib/assert';

import { SKI } from '../../../src';
import { Alias, Expr, Lambda, Named, PureNative } from '../../../src/expr';
import { isInstanceOf } from '../../lib/assert';

describe('PureNative', () => {
  const ski = new SKI({ native: true });

  describe('new PureNative()', () => {
    const { x, y } = SKI.vars();
    const M = new PureNative('M', new Lambda(x, x.apply(x)));

    it('has name', () => {
      expect(M.name).to.equal('M');
    });

    it('has predictable arity', () => {
      expect(M.arity).to.equal(1);
    });

    it('reduces predictably', () => {
      y.apply(y).expect(M.apply(y).run().expr);
    });
  });

  describe('T', () => {
    const T = stripAlias(ski.parse('@atomic T = x->y->y x'));

    it('has correct type and name', () => {
      isInstanceOf(T, PureNative);
      expect(T.name).to.equal('T');
      expect(T + '').to.equal('T');
    });

    it('has predictable arity', () => {
      expect(T.arity).to.equal(2);
    });

    it('reduces predictably', () => {
      const { x, y } = SKI.vars();
      y.apply(x).expect(T.apply(x, y).run().expr);
    })
  });

  describe('iota', () => {
    const iota = stripAlias(ski.parse('@atomic X = x->xSK'));

    it('has type and name', () => {
      isInstanceOf(iota, PureNative);
      expect(iota.name).to.equal('X');
      expect(iota + '').to.equal('X');
    });

    it('has predictable arity', () => {
      expect(iota.arity).to.equal(1);
    });

    it('reduces predictably', () => {
      const { x, y, z } = SKI.vars();
      expect( iota.apply(iota, x).run().expr ).to.equal(x);
      expect( iota.apply(iota.apply(iota), x, y).run().expr ).to.equal(y);
      x.apply(z, y.apply(z)).expect(SKI.church(4).apply(iota, iota, x, y, z).run().expr );
    });
  });

  describe('Y combinator', () => {
    const Y = stripAlias(ski.parse('@atomic Y = f->f(Y f)'));

    it('has predictable arity', () => {
      expect(Y.arity).to.equal(1);
    });

    it('reduces predictably', () => {
      const { x } = SKI.vars();
      const trace = [...Y.apply(SKI.W, x).walk({ max: 20 })].map(r => r.expr + '');
      expect(trace[2]).to.equal('YWx x');
      expect(trace[3]).to.equal('W(YW)x x');
      expect(trace[4]).to.equal('YWx x x');
    });
  });
});

// move to test/lib?
/**
 * The parser may add an invisible eponymous Alias wrapper around a Named term
 * to protect the original term from modifications.
 * This function reveals the underlying term instead.
 * @param expr
 */
function stripAlias (expr: Expr): Expr {
  let next = expr;
  while (next instanceof Alias && next.impl instanceof Named && next.impl.name === next.name)
    next = next.impl;
  return next;
}
