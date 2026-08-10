import { expect } from 'chai';
import { isInstanceOf } from '../../lib/assert';
import { SKI } from '../../../src/index';
import { Native } from '../../../src/expr';

describe('native combinators', () => {
  const list: Record<string, string> = {
    B: 'x(y(z))',
    C: 'x(z)(y)',
    I: 'x(y)(z)',
    K: 'x(z)',
    S: 'x(z)(y(z))',
    W: 'x(y)(y)(z)',
  };

  const { x, y, z } = SKI.vars();

  const skiStatics = SKI as unknown as Record<string, Native>;

  for (const comb in list) {
    it('contains combinator ' + comb, () => {
      isInstanceOf(skiStatics[comb], Native);
      expect(skiStatics[comb].run(x, y, z).expr.format({ terse: false })).to.equal(list[comb]);
    });
  }
});
