const { expect } = require('chai');
const { SKI } = require('../index');

describe('Expr.contains', () => {
  const positive = [
    ["SK", "SK"],
    ["S", "SK"],
    ["K", "SK"],
    ["a->b->a", "a->b->c->b"],
    ["x", "Sx y"],
    ["I", "K(K(KI))"],
    ["SII", "M=SII; MM"],

  ];

  const negative = [
    ["SK", "S"],
    ["I", "SKK"],
    ["a->b->a", "a->b->c->a"],
  ];

  for (const [inner, outer] of positive) {
    it(`contains ${inner} in ${outer}`, () => {
      const ski = new SKI();
      const jar = {};
      const expr = ski.parse(outer, jar);
      const innerExpr = ski.parse(inner, jar);
      expect(expr.contains(innerExpr)).to.equal(true);
    });
  }

  for (const [inner, outer] of negative) {
    it(`does not contain ${inner} in ${outer}`, () => {
      const ski = new SKI();
      const jar = {};
      const expr = ski.parse(outer, jar);
      const innerExpr = ski.parse(inner, jar);
      expect(expr.contains(innerExpr)).to.equal(false);
    });
  }
});
