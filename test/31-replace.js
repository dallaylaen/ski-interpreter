const { expect } = require('chai');

const { SKI } = require('../index');

describe('Expr.replace', () => {
  const cases = [
    // initial term, terms to look for, result
    [ 'SKK', ['I'], 'I' ],
    [ 'S(S(KS)K)(S(KS)K)', ['B'], 'SBB' ],
    [ 'S', ['I'], 'S' ],
    [ 'Sx x', [['x', 'y']], 'Sy y'],
    [ 'x (SK) (KI) (CK) (a->b->b)', ['KI'], 'x(KI)(KI)(KI)(KI)'],
    [ 'S(KS)K(S(KS)K)', ['B'], 'BB'],
  ];

  const ski = new SKI();
  for (const [initial, terms, result] of cases) {
    it(`rewrites ${initial} using ${terms}`, () => {
      const jar = {};
      const expr = ski.parse(initial, { to_be_deleted: jar });
      const rework = expr.replace(deepMap(terms, t => ski.parse(t, { to_be_deleted: jar })));
      expect(rework).to.be.instanceof(SKI.classes.Expr);
      ski.parse(result, { to_be_deleted: jar }).expect(rework);
    });
  }
});

function deepMap (obj, fn) {
  if (Array.isArray(obj))
    return obj.map(x => deepMap(x, fn));
  return fn(obj);
}
