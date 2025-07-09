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
    copy.parse('y x', jar).expect( copy.parse('swap x y', jar).run().expr);

  });
});

