const { expect } = require ('chai');
const { SKI } = require ('../index');

describe ('SKI.toJSON', () => {
    it ('makes data round trip', () => {
        const ski = new SKI({numbers: false});
        ski.add('T', 'C(WK)');
        ski.restrict('SKIT');

        const str = JSON.stringify(ski);

        const copy = new SKI(JSON.parse(str));

        expect(copy.hasLambdas).to.equal(true);
        expect(copy.hasNumbers).to.equal(false);
        expect(copy.showRestrict('+')).to.equal(ski.showRestrict('+'));

        expect(copy.parse('T x y').run().expr + '').to.equal('y(x)');


    });
});

