const {expect} = require('chai');
const { SKI } = require('../index');

describe('Expr.hasLambda', () => {
  it('can detect lambda', () => {
  const ski = new SKI();
  const expr = ski.parse('x->y->y (x y)');
  expect(expr.hasLambda()).to.equal(true);
  });

  it('can detect lambda in nested exprs', () => {
  const ski = new SKI();
  const expr = ski.parse('S x (y->y (x y))');
  expect(expr.hasLambda()).to.equal(true);
  });

  it ('shows no lambda in simple exprs', () => {
  const ski = new SKI();
  const expr = ski.parse('S x (y y) z');
  expect(expr.hasLambda()).to.equal(false);
  });

  it ('shows lambda in aliases', () => {
  const ski = new SKI();
  const expr = ski.parse('X = x->x SK'); // this one isn't proper
  expect(expr.hasLambda()).to.equal(true);
  });

  it ('shows no lambda in (proper) aliases', () => {
  const ski = new SKI();
  ski.add('M', 'x->x x');
  const expr = ski.parse('M');
  expect(expr.hasLambda()).to.equal(false);
  });
});
