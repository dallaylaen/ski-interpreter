const { expect } = require('chai');
const { SKI } = require('../index');

describe('SKI.toJSON', () => {
  it('makes data round trip', () => {
    const ski = new SKI({ numbers: false });
    ski.add('swap', 'C(WK)');
    ski.restrict('SKI swap');

    const str = JSON.stringify(ski);

    const copy = new SKI(JSON.parse(str));

    expect(copy.hasLambdas).to.equal(true);
    expect(copy.hasNumbers).to.equal(false);
    expect(copy.showRestrict('+')).to.equal(ski.showRestrict('+'));

    copy.parse('y x')
      .expect( copy.parse('swap x y').run().expr);
  });

  it('preserves interdependent terms', () => {
    const ski = new SKI();
    ski.add('T', 'CI');
    ski.add('R', 'BBT');
    ski.add('V', 'BCT');
    ski.add('v3', 'BBBCV');

    const str = JSON.stringify(ski);

    const raw = JSON.parse(str);

    expect(raw.terms.length).to.equal(4);
    declarationPreceedsUsage(raw.terms, 'BCIKSW');

    const copy = new SKI(raw);

    expect(copy.parse('v3 a b c f').run().expr + '').to.equal('f a b c');
    const terms = copy.getTerms();
    expect(terms.V.impl + '').to.equal('BCT');
    expect(terms.v3.impl + '').to.equal('BBBCV');

    expect(JSON.stringify(copy)).to.equal(str); // some stupid round trip
  });

  it('preserves swapped native terms', () => {
    const ski = new SKI({ numbers: false, lambdas: false, allow: 'SK' });
    ski.add('tmp', 'S');
    ski.add('S', 'K');
    ski.add('K', 'tmp');
    ski.remove('tmp');
    ski.add('B', 'K(SK)S');

    const str = JSON.stringify(ski);
    const raw = JSON.parse(str);

    console.log(raw.terms);

    declarationPreceedsUsage(raw.terms, 'SKB');

    const copy = new SKI(raw);

    const expr1 = copy.parse('K(SK)S a b c');
    expect(expr1.run().expr + '').to.equal('a(b c)');
    expect(expr1 + '').to.equal('K(SK)Sa b c');

    const expr2 = copy.parse('B a b c');
    expect(expr2.run().expr + '').to.equal('a(b c)');

    // expect(copy.getTerms().B?.impl.format().replace(' ', '')).to.equal('K(SK)S');
  });
});

function declarationPreceedsUsage (list, known = '') {
  // list = ['foo = bar baz', 'quux = foo ...', ...]
  const token = /\b[a-z_][a-z_0-9]*\b|[A-Z]/g;
  const predefined = new Set(known.match(token));
  const defined = new Set();
  for (const line of list) {
    const [name, impl] = line.split('=').map(s => s.trim());
    if (defined.has(name) && impl !== '')
      throw new Error(`Term "${name}" declared twice.`);
    const tokens = impl.replace(/^.*=/, '').match(token) || [];
    for (const token of tokens) {
      if (defined.has(token)) continue;
      if (predefined.has(token)) continue;
      if (token === name) continue; // self-reference allowed
      throw new Error(`Term "${token}" used before its declaration in ${impl.replace(/^.*=/, '')}`);
    }
    defined.add(name);
  }
}
