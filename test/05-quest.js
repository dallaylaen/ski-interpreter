const { expect } = require('chai');
const { SKI, Quest } = require('../index');

describe('Quest', () => {
    const reduct = item => item.start + ' -> ' + item.found + ' vs ' + item.expected;

    it('can validate I', () => {
        const quest = new Quest({
            subst: '&phi;',
            allow: 'SK',
            cases: [
                ['sol', 'sol x', 'x']
            ]
        });
        const pass = quest.check('SKK');
        expect(pass.pass).to.equal(true);

        const details = pass.details[0];
        expect(details.start + ' -> ' + details.found).to.equal('&phi;(x) -> x');

        const fail = quest.check('S(SKK)(SKK)');
        expect(fail.pass).to.equal(false);
        expect(reduct(fail.details[0])).to.equal('&phi;(x) -> x(x) vs x');

        const violate = quest.check('I');
        expect(violate.pass).to.equal(false);
        expect( violate.exception + '' ).to.match(/\bI\b.* restricted .*\bKS\b/);
        expect(violate.details).to.deep.equal([]);
    });

    it ('can validate quine', () => {
        const quest = new Quest({
            subst: '&phi;',
            cases: [['sol', 'sol x', 'sol']],
        });

        const pass = quest.check('SII (S(S(KS)K)K)');
        expect(pass.pass).to.equal(true);
        expect(reduct(pass.details[0])).to.match(/&phi;\(x\) -> ([SKI()]+) vs \1/);
    });

    it ('can validate truth tables', () => {
        const quest = new Quest({
            subst: '&phi;',
            cases: [
                [ 'f', 'f (KI) (KI)', 'KI' ],
                [ {max: 10}, 'f', 'f (KI) (K )', 'KI' ],
                [ 'f', 'f (K ) (KI)', 'KI' ],
                [ 'f', 'f (K ) (K )', 'K ' ],
            ],
        });

        const never = quest.check('K(K(KI))');

        expect(never.pass).to.equal(false);
        expect(never.details.map(i => i.pass ? 1 : 0).join('')).to.equal('1110');
    });

    it ('requires exactly 3 strings for each condition', () => {
        expect(() => new Quest({subst: '&phi;', cases: [['Ix', 'x']]})).to.throw(/Exactly 3/i);
    });
});
