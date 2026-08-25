import { expect } from 'chai';
import { SKI } from '../../../src/index';

describe('SKI declare -> bulkAdd -> declare round-trip', () => {
  it('round-trips plain aliases', () => {
    const ski = new SKI();
    ski.bulkAdd(['nil=KI', 'cons=BC(CI)']);

    const decl1 = ski.declare();

    const ski2 = new SKI();
    ski2.bulkAdd(decl1);

    const decl2 = ski2.declare();

    expect(decl2).to.deep.equal(decl1);

    // term behaviour should be preserved too
    ski.parse('nil x y').run().expr.expect(ski2.parse('nil x y').run().expr);
    ski.parse('cons a b f').run().expr.expect(ski2.parse('cons a b f').run().expr);
  });

  it('round-trips atomic terms', () => {
    const ski = new SKI({ atomic: true });
    ski.bulkAdd([
      '@atomic T = x->y->y x',    // proper term
      '@atomic iota = x->xSK',    // refers to other (native) terms
      '@atomic P = x->x P x',     // self-referencing term
    ]);

    const decl1 = ski.declare();

    const ski2 = new SKI({ atomic: true });
    ski2.bulkAdd(decl1);

    const decl2 = ski2.declare();

    expect(decl2).to.deep.equal(decl1);

    // term behaviour should be preserved too.
    // Primitive terms (including @atomic ones) are only ever equal to themselves,
    // so compare the results of applying/running them rather than the bare terms.
    ski.parse('T a b').run().expr.expect(ski2.parse('T a b').run().expr);
    ski.parse('iota x').run().expr.expect(ski2.parse('iota x').run().expr);

    // P is self-referencing and has no normal form. Also, unlike aliases, a @atomic term is
    // only ever equal to itself (it's a distinct PureNative instance in each interpreter),
    // so compare the string representation of a few reduction steps instead of using expect().
    const walk1 = ski.parse('P a').walk();
    const walk2 = ski2.parse('P a').walk();
    for (let i = 0; i < 2; i++)
      expect(walk1.next().value!.expr + '').to.equal(walk2.next().value!.expr + '');
  });
});
