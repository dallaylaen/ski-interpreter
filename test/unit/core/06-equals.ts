import { expect } from 'chai';

import { SKI } from '../../../src/index';
import { Expr } from '../../../src/expr';

describe('Expr.equals', () => {
  check('same builtin', 'S', 'S', true);
  check('same lambda', 'x->x', 'x->x', true);
  check('same lambda with different arg names', 'x->x', 'y->y', true);
  check('different lambdas', 'x->x', 'x->y', false);
  check('different lambdas with different arg names', 'x->x', 'y->z', false);
  check('same alias', 'T=CI', 'T=CI', true);
  check('different aliases', 'T=CI', 'T=IC', false);

  check('alias vs impl', 'T=CI', 'CI', true);

  check('same action, still different', 'SK', 'KI', false);

  check('discarding lambdas', 'x->a', 'y->a', true);

  check('atomic, no self-ref', '@atomic A=x->x', '@atomic A=y->y', true);
  check('atomic, different impl', '@atomic A=x->x', '@atomic A=x->x x', false);
  check('atomic, self-ref', '@atomic A=x->A', '@atomic A=x->A', true);
  check('atomic, self-ref vs non-self-ref', '@atomic A=x->A', '@atomic A=x->x', false);
});

function check (comment: string, src1: string|Expr, src2: string|Expr, expected: boolean) {
  describe(`${comment}: ${src1} ${expected ? '=' : '!'}= ${src2}`, () => {
    const ski = new SKI({ experimental: true });
    const expr1 = src1 instanceof Expr ? src1 : ski.parse(src1);
    const expr2 = src2 instanceof Expr ? src2 : ski.parse(src2);

    it('left-to-right', () => {
      expect(expr1.equals(expr2)).to.equal(expected);
    });
    it('right-to-left', () => {
      expect(expr2.equals(expr1)).to.equal(expected);
    });
  });
}
