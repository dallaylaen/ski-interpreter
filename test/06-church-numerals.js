const {expect} = require('chai');
const {SKI} = require('../index');

describe( 'Church numbers', () => {
  it ('represent numbers', done => {
    const ski = new SKI({numbers: true});

    const jar = {};
    for (let i = 0; i < 5; i++) {
      const found = ski.parse(i+' x y', jar).run().expr;
      const expected = ski.parse( 'x('.repeat(i)+'y'+')'.repeat(i));

      expect('' + found).to.equal('' + expected);
    }

    done();
  });

  it ('sanitizes input', () => {
    expect(() => SKI.church(-2)).to.throw(/integer/);

  });

  it ('keeps track of whether numbers are allowed', () => {
    const allow = new SKI({numbers: true});
    expect(allow.parse('2')).to.be.instanceof(SKI.classes.Church);
    expect(allow.parse('+')).to.be.instanceof(SKI.classes.Native);
  });
  it ( 'keeps track of whether numbers are NOT allowed',() => {
    const deny = new SKI({numbers: false});
    expect(() => deny.parse('2')).to.throw(/Church num.*er.*s/);
    expect(() => deny.parse('+')).to.throw(/'\+' .* restricted|Church num.*er.*s/);

  });
});
