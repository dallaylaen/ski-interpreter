const { expect } = require('chai');
const { SKI } = require('../../src/index');

const ski = new SKI();

describe('Expr.toString() is back parseable', () => {
  roundTrip('single native', 'S');
  roundTrip('lambda', 'x->y->z->x z (y z)');
  roundTrip('number', '5 x y');
  roundTrip('free var', 'foobared');
  roundTrip('some expr', 'SI(Kx)');
  roundTrip('lambda with args', '(x->z->y(x))(t1)(t2)');
  roundTrip('more than 1 free vars', 'yadda yadda yeek');
  roundTrip('numbers + other terms', 'B (T 2) (2 K) (foo 3)');
});

function roundTrip (message, source) {
  describe(message + ' round trip: ' + source, () => {
    it('canonical', () => {
      const expr   = ski.parse(source);
      const before = expr.format({ terse: false });
      const expr2  = ski.parse(before);
      const after  = expr2.format({ terse: false });

      expect(after).to.equal(before);
      expr.expect(expr2);
    });

    it('terse', () => {
      const expr   = ski.parse(source);
      const before = expr.format({ terse: true });
      const expr2  = ski.parse(before);
      const after  = expr2.toString();

      expect(after).to.equal(before);
      expr.expect(expr2);
    });
  });
}
