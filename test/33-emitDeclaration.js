'use strict';

const { expect } = require('chai');

const { SKI } = require('../index');
const { declare } = SKI;

describe('SKI.bulkAdd', () => {
  it('can add and remove terms', () => {
    const ski = new SKI();

    ski.bulkAdd([
      'T=CI',
      'R=BBT',
      'V=BCT',
      'T=',
    ]);

    const terms = ski.getTerms();
    expect(terms).to.not.have.property('T');

    ski.parse('BB(CI)').expect(terms.R);
    ski.parse('BC(CI)').expect(terms.V);
  });

  it('throws on invalid declarations', () => {
    const ski = new SKI();

    expect( () => ski.bulkAdd([
      'T=CI',
      'bad declaration',
    ])).to.throw(/invalid/i);

    /*
    // TODO verify that terms remain unchanged
    expect(ski.getTerms()['T']).to.equal(undefined);
     */
  });
});

describe('SKI.emitDeclaration', () => {
  it('declares terms (no overrides)', () => {
    const ski = new SKI();

    ski.add('T', 'CI');
    ski.add('R', 'BBT');
    ski.add('V', 'BCT');

    expect(declare(ski.getTerms())).to.deep.equal(
      ['T=CI', 'R=BBT', 'V=BCT']
    );
  });

  it('declares terms (with overrides)', () => {
    const ski = new SKI();

    ski.add('T', 'CI');
    ski.add('R', 'BBT');
    ski.add('V', 'BCT');
    ski.add('L', 'BWB');
    ski.add('M', 'SII');
    ski.add('Y', 'M(L(SI))');
    ski.add('appender', 'YWI'); // generates itself followed by endless string of I's

    ski.add('M', 'WI');  // more efficient
    ski.add('Y', 'BML'); // same but doesn't loop on its own

    const inventory = ski.getTerms();

    const decl = declare(inventory);

    const ski2 = new SKI();
    ski2.bulkAdd(decl);

    compareInventories(ski2.getTerms(), ski.getTerms());
  });

  it('declares terms (with native overrides', () => {
    const ski = new SKI({ numbers: false, lambdas: false, allow: 'SK' });

    ski.add('tmp', 'S');
    ski.add('S', 'K');
    ski.add('K', 'tmp');
    ski.remove('tmp');

    const jar = {};
    const expr1 = ski.parse('K(SK)S a b c', { to_be_deleted: jar });
    expect(expr1.run().expr + '').to.equal('a(b c)');

    const inventory = ski.getTerms();

    // TODO this fails miserably, will fix later
    const decl = declare(inventory);

    const ski2 = new SKI({ numbers: false, lambdas: false, allow: 'SK' });

    ski2.bulkAdd(decl);

    compareInventories(ski2.getTerms(), ski.getTerms());

    const expr2 = ski2.parse('K(SK)S a b c', { to_be_deleted: jar });
    expect(expr2.run().expr + '').to.equal('a(b c)');
    expr1.expect(expr2);
  });
});

function compareInventories (got, exp) {
  const keys = new Set([...Object.keys(got), ...Object.keys(exp)]);
  const green = {};
  const red = {};
  for (const k of keys) {
    if (!got.hasOwnProperty(k))
      green[k] = exp[k];
    else if (!exp.hasOwnProperty(k))
      red[k] = got[k];
    else if (!got[k].equals(exp[k])) {
      green[k] = exp[k];
      red[k] = got[k];
    }
  }
  if (Object.keys(green).length || Object.keys(red).length) {
    const err = new Error('Inventories differ');
    err.actual = red;
    err.expected = green;
    throw err;
  }
}
