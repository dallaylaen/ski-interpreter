'use strict';

const { expect }   = require('chai');
const { SKI }      = require('../index');

describe('SKI.extras.declare', () => {
  const ski = new SKI();
  ski.add('T', 'CI');
  ski.add('V', 'BCT');
  ski.add('pair', 'V x y');
  ski.add('M', 'WI');
  ski.add('R', 'BBT');
  ski.add('L', 'BWB');
  ski.add('Y', 'BML');

  const t = ski.getTerms();

  it('can sort dependencies', () => {
    const decl = SKI.extras.declare(t.V, t);

    expect(decl).to.equal('B; C; I; T=CI; V=BCT');
  });

  it('can fetch prerequisites', () => {
    const expr = ski.parse('CL(CL)x(My)');

    const str = SKI.extras.declare(expr, expr.context.env);
    const expr2 = new SKI().parse(str);
    expr.expect(expr2);
  });

  it('can recover enough info to rebuild the term', () => {
    const expr = ski.parse('swap = CI; pair = BCswap; pair a b f');

    const str = SKI.extras.declare(expr, expr.context.env);
    // console.log(str);
    const expr2 = new SKI().parse(str);

    expect(expr2.run().expr + '').to.equal('f a b');

    expr.expect(expr2);
  });
});
