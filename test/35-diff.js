'use strict';

const { expect } = require('chai');

const { SKI } = require('../index');

describe('Expr.diff', () => {
  it ('computes differences between expressions', () => {
    const ski = new SKI();

    const expr1 = ski.parse('S(Kfoo)K');
    const expr2 = ski.parse('S(Kbar)K');

    const diff = expr1.diff(expr2); // string

    expect(diff).to.match(/^S\(K\(/, 'contains common prefix');
    expect(diff).to.match(/foo *!= *bar/, 'shows differing part in correct order');

    expect(expr1.diff(expr2, true)).to.match(/bar *!= *foo/, 'reversed order when requested');
  });

  it ('shows when expressions are identical', () => {
    const ski = new SKI();

    const expr1 = ski.parse('S(KS)K');
    const expr2 = ski.parse('S(KS)K');

    expect(expr1.diff(expr2)).to.equal(null);
  });

  it ('handles aliases correctly', () => {
    const ski = new SKI();


  });
});