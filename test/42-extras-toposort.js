'use strict';

const { expect } = require('chai');
const { SKI } = require('../index');

describe('SKI.extras.toposort', () => {
  const ski = new SKI();
  it('(self-check', () => {
    checkOrder([SKI.S, SKI.K]);
    checkOrder([SKI.K, SKI.S]);
    const T = ski.parse('T=CI');
    checkOrder([SKI.C, SKI.I, T, SKI.S, SKI.K]);
    expect(() => checkOrder([T, SKI.C])).to.throw(/T at \[0] depends on C at \[1]/);
  });

  it('sorts dependencies', () => {
    const expr = ski.parse('T=CI; V=BCT; pair=V x y;');

    const res = SKI.extras.toposort(expr.context.env, [expr]);

    // console.log(res);

    expect(res).to.be.an('object');
    expect(res).to.have.property('list');
    expect(res).to.have.property('env');
    expect(res.list).to.be.an('array');
    checkOrder(res.list);

    const final = res.list.pop(); // exclude from further tests
    expect(final).to.equal(expr);

    const seen = new Set([final]);
    for (const dep of res.list) {
      expect(dep).to.be.instanceof(SKI.classes.Named);
      expect(res.env[dep.name]).to.equal(dep);
      seen.add(dep);
    }

    final.fold(null, (acc, e) => {
      if (e instanceof SKI.classes.Named)
        expect(seen.has(e)).to.equal(true, `final term depends on ${e} which is missing from the sorted list`);
    });
  });
});

function checkOrder (list) {
  const seen = new Map();
  for (let i = list.length; i-- > 0; ) {
    list[i].fold(null, (acc, e) => {
      if (seen.has(e))
        throw new Error(`term ${list[i]} at [${i}] depends on ${e} at [${seen.get(e)}]`);
    });
    seen.set(list[i], i);
  }
}
