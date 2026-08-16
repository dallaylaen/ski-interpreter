import { expect } from 'chai';
import { SKI } from '../../../src/index';
import { Expr, FormatOptions } from '../../../src/expr';

const ski = new SKI();

describe('Expr.declare', () => {
  roundTrip('simple', 'SKK');
  roundTrip('lone', 'S', { inventory: ski.getTerms() });
  roundTrip('free var', 'x');
  roundTrip('multistage', 'T=CI; V=BCT; pair=V x y;');
  roundTrip('multistage (no native)', 'T=CI; V=BCT; pair=V x y;', { inventory: ski.getTerms() }, (expr, decl) => {
    it('declares no native combinators', () => {
      expect(decl).to.not.match(/\b[A-Z];/);
    });
  });
  roundTrip('lambda', 'a->aSK', {}, (expr, decl) => {
    it('does not leak the bound variable as a separate declaration', () => {
      expect(decl).to.not.match(/\ba\s*=/);
    });
  });
});

function roundTrip (
  message: string,
  src: string,
  options?: FormatOptions & { declaration?: [string, string, string] },
  extra?: (expr: Expr, decl: string, expr2: Expr) => void
) {
  describe(message + ': ' + src, () => {
    const expr = ski.parse(src);
    const decl = expr.declare(options);
    const expr2 = ski.parse(decl);
    it('round-trips', () => {
      expr.expect(expr2);
    });
    if (extra)
      extra(expr, decl, expr2);
  });
}
