const { expect } = require('chai');

const { SKI } = require('../index');

const ski = new SKI();

describe('Expr.format: literal', () => {
  check('SKK', {}, 'SKK');
  check('foo bar', {}, 'foo bar');
  check('foo bar quux', {}, 'foo bar quux');
  check('foo (bar quux)', {}, 'foo(bar quux)');
  check('(foo bar) quux', {}, 'foo bar quux');
  check('foo bar', { html: true, terse: false }, '<var>foo</var>(<var>bar</var>)');
  check('IIx', {html: true}, '<b>I</b>I<var>x</var>');
  check('a->a a', {html: true}, '<var>a</var>-&gt;<var>a</var> <var>a</var>');
  check('(x->y->y x)(foo)', {}, '(x->y->y x)foo');
  check('K 2 S', {}, 'K 2 S');
  check('5 x y', {}, '5 x y');
  check('5 SK', {}, '5 SK');
});

describe('Expr.format: round-trip', () => {
  roundTrip('foo');
  roundTrip('foo bar');
  roundTrip('foo (bar baz)');
  roundTrip('(foo bar) baz');

  roundTrip('S K K');
  roundTrip('I x');
  roundTrip('x->x');
  roundTrip('(x->x x)(x->x x)');

  roundTrip('S(KS)K');
  roundTrip('x->y->z->x z (y z)');
  roundTrip('x(y(z t))')
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

function roundTrip (src) {
  describe(src + ' round trips', () => {
    const jar = {};
    const expr = ski.parse(src, jar);

    it ('format w/o options coincides with toString', () => {
      expect(expr.format()).to.equal(expr.toString());
    });

    sameAs(
      expr.format({}),
      jar,
      expr,
      'default options'
    );

    sameAs(
      expr.format({terse: false}),
      jar,
      expr,
      'terse: false'
    );

    it ('round-trips with html:true', () => {
      const formatted = expr.format({html: true});
      const stripped = formatted.replace(/<[^>]+>/g, '').replace(/&gt;/g, '>');
      const expr2 = ski.parse(stripped, jar);
      expr.expect(expr2);
    });

    sameAs(
      expr.format({ around: ['(', ')'], brackets: ['', ''], lambda: ['(', '->', ')'] }),
      jar,
      expr,
      'lisp style: braces around application, not arguments'
    );
  });
}

function sameAs (src, jar, expr, comment) {
  it (`${comment}: evaluates ${src} as ${expr}`, () => {
    const expr2 = ski.parse(src, jar);
    expr.expect(expr2, comment);
  });
}