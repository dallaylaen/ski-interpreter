'use strict';

const { expect } = require('chai');
const { SKI } = require('../index');

describe('SKI.extras.foldr', function () {
  it('should foldr over an expression', function () {
    const ski = new SKI();
    const expr = ski.parse('S(x y z)(K(a b))');
    const res = SKI.extras.foldr(expr, (head, tail) => {
      return tail.length ? [head + '', ...tail] : head + '';
    });
    expect(res).to.deep.equal(['S', ['x', 'y', 'z'], ['K', ['a', 'b']]]);
  });
});
