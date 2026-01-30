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
    expect(diff).to.match(/foo\[\d+] *!= *bar\[\d+]/, 'shows differing part in correct order');

    expect(expr1.diff(expr2, true)).to.match(/bar\[\d+] *!= *foo\[\d+]/, 'reversed order when requested');
  });

  it('cannot be fooled by homonymic vars', () => {
    const [x1, x2] = SKI.free('x', 'x');

    expect(x1.toString()).to.equal('x');
    expect(x2.toString()).to.equal('x');

    // buuut...
    expect(x1.diff(x2)).to.match(/x\[\d+] *!= *x\[\d+]/);

    expect(SKI.K.apply(x1).diff(SKI.K.apply(x2))).to.match(/^K\([^A-Za-z]*x\[\d+] *!= *x\[\d+]/);
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