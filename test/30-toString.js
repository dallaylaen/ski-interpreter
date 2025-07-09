const { expect } = require('chai');

const { SKI } = require('../index');

describe('Expr.toString', () => {
  const ski = new SKI();
  const cases = [
    [ 'x y z', 'x(y)(z)', 'x y z', '<var>x</var>(<var>y</var>)(<var>z</var>)', '<var>x</var> <var>y</var> <var>z</var>' ],
    [ 'a c (b c)', 'a(c)(b(c))', 'a c(b c)', '<var>a</var>(<var>c</var>)(<var>b</var>(<var>c</var>))', '<var>a</var> <var>c</var>(<var>b</var> <var>c</var>)' ],
  ];
  for (const [input, plain, terse, html, terseHtml] of cases) {
    it (`converts "${input}" to "${plain} without options"`, () => {
      const expr = ski.parse(input);
      expect(expr.toString({ terse: false, html: false })).to.equal(plain);
    });
    it (`converts "${input}" to "${terse}" with terse:true`, () => {
      const expr = ski.parse(input);
      expect(expr.toString({ terse: true, html: false})).to.equal(terse);
    });
    it (`converts "${input}" to "${html}" with html:true`, () => {
      const expr = ski.parse(input);
      expect(expr.toString({ terse: false, html: true })).to.equal(html);
    });
    it (`converts "${input}" to "${terseHtml}" with terse:true and html:true`, () => {
      const expr = ski.parse(input);
      expect(expr.toString({ terse: true, html: true })).to.equal(terseHtml);
    });
  }

});
