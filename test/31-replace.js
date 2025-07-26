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
  ];

  const ski = new SKI();
  for (const [initial, terms, result] of cases) {
    it(`rewrites ${initial} using ${terms}`, () => {
      const jar = {};
      const expr = ski.parse(initial, jar);
      const rework = expr.replace(deepMap(terms, t => ski.parse(t, jar)));
      expect(rework).to.be.instanceof(SKI.classes.Expr);
      ski.parse(result, jar).expect(rework);
    });
  }
});

function deepMap (obj, fn) {
  if (Array.isArray(obj))
    return obj.map(x => deepMap(x, fn));
  return fn(obj);
}
