const { expect } = require("chai");
const { SKI } = require("../index");

describe( "Expr.getSymbols", () => {
  it ("handler simple exprs", () => {
    const ski = new SKI();
    const jar = {};
    const expr = ski.parse("S x (y y) z", jar);
    expect(expr.getSymbols()).to.deep.equal(new Map([[SKI.S, 1], [jar.x, 1], [jar.y, 2], [jar.z, 1]]));
  });

  it ("handles aliases", () => {
    const ski = new SKI();
    const jar = {};
    const expr = ski.parse("M = SII; M x y", jar);
    expect(expr.getSymbols()).to.deep.equal(new Map([[SKI.S, 1], [SKI.I, 2], [jar.x, 1], [jar.y, 1]]));
  });

  it ("handles nested exprs", () => {
    const ski = new SKI();
    const jar = {};
    const expr = ski.parse("S x (y (z z))", jar);
    expect(expr.getSymbols()).to.deep.equal(new Map([[SKI.S, 1], [jar.x, 1], [jar.y, 1], [jar.z, 2]]));
  });

  it ("handles lambda exprs", () => {
    const ski = new SKI();
    const jar = {};
    const expr = ski.parse("x->y->y (x y)", jar);
    expect(expr.getSymbols()).to.deep.equal(new Map([[SKI.lambdaPlaceholder, 2]]));
  });

  it ("handles more lambda exprs", () => {
    const ski = new SKI();
    const jar = {};
    const expr = ski.parse("x->xSK", jar);
    expect(expr.getSymbols()).to.deep.equal(new Map([[SKI.S, 1], [SKI.K, 1], [SKI.lambdaPlaceholder, 1]]));
  });
});
