const { expect } = require('chai');

const { SKI } = require('../index');

const ski = new SKI();

describe('Expr.format', () => {
  check('SKK', {}, 'SKK');
  check('foo bar', {}, 'foo bar');
  check('foo bar quux', {}, 'foo bar quux');
  check('foo (bar quux)', {}, 'foo(bar quux)');
  check('(foo bar) quux', {}, 'foo bar quux');
  check('foo bar', { html: true, terse: false }, '<var>foo</var>(<var>bar</var>)');
  check('IIx', {html: true}, '<b>I</b>I<var>x</var>');
  check('a->a a', {html: true}, '<var>a</var>-&gt;<var>a</var> <var>a</var>');
  check('(x->y->y x)(foo)', {}, '(x->y->y x)foo');
});

function check (src, options, result, comment) {
  describe(src, () => {
    const jar = {};
    const expr = ski.parse(src, jar);
    const formatted = expr.format(options);
    it (`formats to ${result}`, () => {
      expect(formatted).to.equal(result, comment);
    });

    it ('round-trips', () => {
      const stripped = options.html
        ? formatted.replace(/<[^>]+>/g, '').replace(/&gt;/g, '>')
        : formatted;
      const expr2 = ski.parse(stripped, jar);
      expr.expect(expr2);
    });


  });
}