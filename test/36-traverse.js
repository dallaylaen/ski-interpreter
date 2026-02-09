'use strict';

const { expect } = require('chai');
const { SKI } = require('../index');

describe('SKI.traverse', () => {
  const ski = new SKI();
  ski.add('T', 'CI');
  ski.add('V', 'BCT');
  const expr = ski.parse('S(x->5 x K)(V(Wf))');

  it('visits all nodes in pre-order', () => {
    const nodes = [];
    expr.traverse(e => {
      if (!(e instanceof SKI.classes.App))
        nodes.push(e.format({ terse: false }));
    });
    expect(nodes).to.deep.equal([
      'S',
      'x->5(x)(K)',
      '5',
      'x',
      'K',
      'V',
      'B',
      'C',
      'T',
      'C',
      'I',
      'W',
      'f',
    ]);
  });
});
