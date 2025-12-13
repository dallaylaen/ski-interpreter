'use strict';

const { expect } = require('chai');

const { SKI } = require('../index');
const { emitDeclarations } = require('../lib/expr');

describe('SKI.emitDeclaration', () => {
  it('declares terms (no overrides)', () => {
    const ski = new SKI();

    ski.add('T', 'CI');
    ski.add('R', 'BBT');
    ski.add('V', 'BCT');

    expect(emitDeclarations(ski.getTerms())).to.deep.equal(
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

    const decl = emitDeclarations(inventory);

    const ski2 = new SKI();
    for (const d of decl) {
      const [name, exprStr] = d.split('=');
      ski2.add(name, exprStr);
    }
    ;

    const inventory2 = ski2.getTerms();

    for (const name of Object.keys(inventory)) {
      expect(inventory2).to.have.property(name);
      inventory[name].expect(inventory2[name]);
    }
  });

  it('declares terms (with native overrides', () => {
    const ski = new SKI();

    ski.restrict('SK')
    ski.add('tmp', 'S');
    ski.add('S', 'K');
    ski.add('K', 'tmp');
    ski.remove('tmp');

    expect(ski.parse('K(SK)S a b c').run().expr + '').to.equal('a(b c)');

    const inventory = ski.getTerms();

    // TODO this fails miserably, will fix later
    const decl = emitDeclarations(inventory);
    console.log(decl);
  });
});