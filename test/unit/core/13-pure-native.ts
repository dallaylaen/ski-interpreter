import { expect } from 'chai';
// import { isInstanceOf } from '../../lib/assert';

import { SKI } from '../../../src';
import { Lambda, PureNative } from '../../../src/expr';

describe('PureNative', () => {
  const ski = new SKI();

  describe('T', () => {
    const T = new PureNative('T', ski.parse('x->y->y x') as Lambda);
    it('has predictable arity', () => {
      expect(T.arity).to.equal(2);
    });

    it('reduces predictably', () => {
      const { x, y } = SKI.vars();
      y.apply(x).expect(T.apply(x, y).run().expr);
    })
  });

  describe('iota', () => {
    const { X } = SKI.vars();
    const iota = new PureNative(X, ski.parse('x->xSK') as Lambda);

    it('has name', () => {
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
    const { Y } = SKI.vars();
    const natY = new PureNative(Y, ski.parse('f->f(Y f)', { env: { Y } }) as Lambda);

    it('has predictable arity', () => {
      expect(natY.arity).to.equal(1);
    });

    it('reduces predictably', () => {
      const { x } = SKI.vars();
      const trace = [...natY.apply(SKI.W, x).walk({ max: 20 })].map(r => r.expr + '');
      expect(trace[2]).to.equal('YWx x');
      expect(trace[3]).to.equal('W(YW)x x');
      expect(trace[4]).to.equal('YWx x x');
    });
  });
});
