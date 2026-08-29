import { expect } from 'chai';
import { SKI } from '../../../src/index';

describe('SKI.extras.declare', () => {
  const ski = new SKI({ addContext: true });
  ski.add('T', 'CI');
  ski.add('V', 'BCT');
  ski.add('pair', 'V x y');
  ski.add('M', 'WI');
  ski.add('R', 'BBT');
  ski.add('L', 'BWB');
  ski.add('Y', 'BML');

  const terms = ski.getTerms();

  it('can sort dependencies', () => {
    // console.log(terms.V.declare({inventory: {...terms, V: undefined}}));

    const decl = terms.V.declare({});

    expect(decl).to.equal('B; C; I; T=CI; V=BCT');
  });

  it('can fetch prerequisites', () => {
    const expr = ski.parse('CL(CL)x(My)');

    const str = expr.declare();
    const expr2 = new SKI().parse(str);
    expr.expect(expr2);
  });

  it('can recover enough info to rebuild the term', () => {
    const expr = ski.parse('swap = CI; pair = BCswap; pair a b f');

    const str = expr.declare();
    // console.log(str);
    const expr2 = new SKI().parse(str);

    expect(expr2.run().expr + '').to.equal('f a b');

    expr.expect(expr2);
  });
});
