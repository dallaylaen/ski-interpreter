'use strict';

const { expect } = require('chai');
const { SKI } = require('../../src/index');

const ski = new SKI();

describe('Expr.declare', () => {
  roundTrip('simple', 'SKK');
  roundTrip('lone', 'S', { inventory: ski.getTerms() });
  roundTrip('free var', 'x');
  roundTrip('multistage', 'T=CI; V=BCT; pair=V x y;');
  roundTrip('multistage (no native)', 'T=CI; V=BCT; pair=V x y;', { inventory: ski.getTerms() }, (expr, decl, expr2) => {
    it('declares no native combinators', () => {
      expect(decl).to.not.match(/\b[A-Z];/);
    });
  });
});

function roundTrip (message, src, options, extra) {
  describe(message + ': ' + src, () => {
    const expr = ski.parse(src);
    const decl = expr.declare(options);
    const expr2 = ski.parse(decl);
    it('round-trips', () => {
      expr.expect(expr2);
    });
    if (extra)
      extra(expr, decl, expr2);
  })
}
