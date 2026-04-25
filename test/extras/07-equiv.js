'use strict';

const { expect } = require('chai');
const { SKI } = require('../../src/index');

const ski = new SKI();

describe('SKI.extras.equiv', () => {
  // basic sanity
  isEquiv('self', 'x', 'x', { equal: true });
  isEquiv('different vars', 'x', 'y', { equal: false });
  isEquiv('diff combinators', 'S', 'K', { equal: false });

  // typical equivalences
  isEquiv('M', 'SII', 'SII', { equal: true });
  isEquiv('M (lambda)', 'SII', 'a->a a', { equal: true });
  isEquiv('M (bckw)', 'SII', 'WI', { equal: true });
  isEquiv('2', '2', 'WB', { equal: true });
  isEquiv('3', '3', 'WB', { equal: false });

  // non-terminating terms
  isEquiv('MM', 'SII(SII)', 'WI(WI)', { equal: true });
  isEquiv('MM again', 'SII(SII)', 'WI(a->a a)', { equal: true });
  isEquiv('WWW', 'WWW', 'WI(WI)', { equal: false });
});

function isEquiv (message, src1, src2, options) {
  const { equal } = options;
  const op = equal ? '==' : '!=';
  describe(`${message}: ${src1} ${op} ${src2}`, () => {
    const expr1 = ski.parse(src1);
    const expr2 = ski.parse(src2);
    const res = SKI.extras.equiv(expr1, expr2, options);
    it(equal ? 'equal' : 'not equal', () => {
      expect(res.equal).to.equal(equal);
    });
  });
}
