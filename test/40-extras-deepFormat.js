const { expect } = require('chai');
const { SKI } = require('../index');
const { extras } = SKI;

describe('deepFormat', () => {
  const ski = new SKI();

  it('formats a single SKI expression', () => {
    const expr = ski.parse('S(K(SI))K');
    const result = extras.deepFormat(expr);
    expect(result).to.be.a('string');
    expect(result).to.equal(expr.format());
  });

  it('formats an array of SKI expressions', () => {
    const arr = [ski.parse('S'), ski.parse('K'), ski.parse('I')];
    const result = extras.deepFormat(arr);
    expect(result).to.deep.equal(arr.map(e => e.format()));
  });

  it('formats an object containing SKI expressions', () => {
    const obj = {
      a: ski.parse('S'),
      b: ski.parse('K'),
      c: ski.parse('I')
    };
    const result = extras.deepFormat(obj);
    expect(result).to.deep.equal({
      a: obj.a.format(),
      b: obj.b.format(),
      c: obj.c.format()
    });
  });

  it('returns primitives unchanged', () => {
    expect(extras.deepFormat(42)).to.equal(42);
    expect(extras.deepFormat('foo')).to.equal('foo');
    expect(extras.deepFormat(null)).to.equal(null);
    expect(extras.deepFormat(undefined)).to.equal(undefined);
  });

  it('does not modify non-Expr objects', () => {
    const date = new Date();
    const regex = /test/;
    const obj = { date, regex };
    const result = extras.deepFormat(obj);
    expect(result).to.deep.equal(obj);
    expect(result.date).to.equal(date);
    expect(result.regex).to.equal(regex);
  });

  it('formats nested structures', () => {
    const nested = {
      arr: [ski.parse('S'), { x: ski.parse('K') }],
      val: ski.parse('I'),
      num: 7
    };
    const result = extras.deepFormat(nested);
    expect(result).to.deep.equal({
      arr: ['S', { x: 'K' }],
      val: 'I',
      num: 7
    });

    expect(JSON.parse(JSON.stringify(nested))).to.deep.equal(result);
  });
});
