const { expect } = require ('chai');
const { SKI } = require ('../index');

describe ('SKI.toJSON', () => {
  it ('makes data round trip', () => {
    const ski = new SKI({numbers: false});
    ski.add('swap', 'C(WK)');
    ski.restrict('SKI swap');

    const str = JSON.stringify(ski);

    const copy = new SKI(JSON.parse(str));

    expect(copy.hasLambdas).to.equal(true);
    expect(copy.hasNumbers).to.equal(false);
    expect(copy.showRestrict('+')).to.equal(ski.showRestrict('+'));

    const jar = {}; // share variables with the same names
    copy.parse('y x', { to_be_deleted: jar })
      .expect( copy.parse('swap x y', { to_be_deleted: jar }).run().expr);

  });

  it ('preserves interdependent terms', () => {
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

    expect (copy.parse('v3 a b c f').run().expr + '').to.equal('f a b c');
    const terms = copy.getTerms();
    expect(terms.V.impl + '').to.equal('BCT');
    expect(terms.v3.impl + '').to.equal('BBBCV');

    expect(JSON.stringify(copy)).to.equal(str); // some stupid round trip
  });

  it ('preserves swapped native terms', () => {
    const ski = new SKI({numbers: false, lambdas: false, allow: 'SK'});
    ski.add('tmp', 'S');
    ski.add('S', 'K');
    ski.add('K', 'tmp');
    ski.remove('tmp');

    const str = JSON.stringify(ski);
    const raw = JSON.parse(str);

    declarationPreceedsUsage(raw.terms, 'SK');

    const copy = new SKI(raw);

    const expr1 = copy.parse('K(SK)S a b c');
    expect(expr1.run().expr + '').to.equal('a(b c)');
  });
  
});

function declarationPreceedsUsage(list, known='') {
  // list = ['foo = bar baz', 'quux = foo ...', ...]
  const token = /\b[a-z_][a-z_0-9]*\b|[A-Z]/g;
  const defined = new Set( known.match(token) || [] );
  for (const line of list) {
    const [name, expr] = line.split('=').map(s => s.trim());
    const tokens = expr.match(token) || [];
    for (const token of tokens) {
      if (defined.has(token)) continue;
      if (token === name) continue; // self-reference allowed
      throw new Error(`Term "${token}" used before its declaration.`);
    }
    defined.add(name);
  }
}