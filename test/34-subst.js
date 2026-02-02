const {expect} = require('chai');

const {SKI} = require('../index');
const {Alias} = SKI.classes;

const ski = new SKI();

describe('Expr.subst', () => {
  const {x, y, z} = SKI.vars()

  it('handles simple variable cases', () => {
    check(x.subst(y, z), null);
    check(x.subst(x, z), z);
    check(x.apply(x).subst(x, y), y.apply(y));
    check(x.apply(x).subst(y, z), null);
    check(x.apply(y.apply(x)).subst(x, z), z.apply(y.apply(z)));
  });

  it('works on aliases', () => {
    const tx = new Alias('tx', ski.parse('CI').apply(x));

    check(tx.subst(y, z), null);
    check(tx.subst(x, z), 'CIz', {z});
    check(tx.subst(tx, z), z);
    check(tx.subst(SKI.C, SKI.K), 'K I x', {x});
    check(tx.subst(SKI.K, SKI.S), null);
  });

  describe('handles arbitrary expressions', () => {
    const runcase = (comment, input, plug, replacement, result) => {
      it(`${comment}: ${input} [${plug} := ${replacement}] == ${result}`, () => {
        const jar = {};
        const expr = ski.parse(input, { vars: jar });
        const plugExpr = ski.parse(plug, { vars: jar });
        const replExpr = ski.parse(replacement, { vars: jar });
        const expected = result ? ski.parse(result, { vars: jar }) : null;

        const got = expr.subst(plugExpr, replExpr);

        if (expected === null) {
          expect(got).to.equal(null);
        } else {
          expected.expect(got);
        }
      });
    };

    runcase('lambda shielding', 'x->y->x y', 'y', 'z', null);
    runcase('lambda no shielding', 'x->z->x y', 'y', 'x', 'a->b->a x');

    runcase('some expr', 'f=5 x; a->f a', 'x', 'y', 'a->5 y a');
  });



});

function check (got, expected, jar) {
  if (expected === null) {
    expect(got).to.equal(null);
  } else if (typeof expected === 'string') {
    ski.parse(expected, { vars: jar }).expect(got);
  } else {
    expected.expect(got);
  }
}