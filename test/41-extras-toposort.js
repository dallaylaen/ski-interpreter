'use strict';

const { expect }   = require('chai');
const { SKI }      = require('../index');
const { toposort } = SKI.extras;

describe('SKI.extras.toposort', () => {
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
    const list = toposort(undefined, [t.V, t.T, t.C]).list;

    // console.log(deep(list));
    expect(list.map(s => s + '')).to.deep.equal(['C', 'T', 'V']);
  });

  it('can fetch prerequisites', () => {
    const expr = ski.parse('CL(CL)x(My)');
    const resp = toposort(t, [expr]);

    const str = resp.list.map(s => s.declare({ inventory: resp.env })).join('; ');
    const expr2 = new SKI().parse(str);
    expr2.expect(expr);
  });

  it('can recover enough info to rebuild the term', () => {
    const expr = ski.parse('swap = CI; pair = BCswap; pair a b f');
    const res = toposort(expr.context?.env, [expr]);

    const str = res.list.map(s => s.declare({ inventory: res.env })).join('; ');
    // console.log(str);
    const expr2 = ski.parse(str);

    expect(expr2.run().expr + '').to.equal('f a b');
    expr2.expect(expr);
  });
});
