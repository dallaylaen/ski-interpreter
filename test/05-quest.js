const { expect } = require('chai');
const { SKI, Quest } = require('../index');

describe('Quest', () => {
    const reduct = item => item.start + ' -> ' + item.found + ' vs ' + item.expected;

    it('can validate I', () => {
        const quest = new Quest({
            subst: '&phi;',
            allow: 'SK',
            cases: [
                [ 'f->f x', 'f->x']
            ]
        });
        const pass = quest.check('SKK');
        expect(pass.exception).to.equal(undefined);
        expect(pass.pass).to.equal(true);

        const details = pass.details[0];
        expect(details.start + ' -> ' + details.found).to.equal('&phi;(x) -> x');

        const fail = quest.check('S(SKK)(SKK)');
        expect(fail.pass).to.equal(false);
        expect(reduct(fail.details[0])).to.equal('&phi;(x) -> x(x) vs x');

        const violate = quest.check('I');
        expect(violate.pass).to.equal(false);
        expect( violate.exception + '' ).to.match(/\bI\b.* restricted .*\bK\s*S\b/);
        expect(violate.details).to.deep.equal([]);
    });

    it ('can validate quine', () => {
        const quest = new Quest({
            subst: '&phi;',
            cases: [['f->f x', 'I']],
        });

        const pass = quest.check('SII (S(S(KS)K)K)');
        expect(pass.pass).to.equal(true);
        expect(reduct(pass.details[0])).to.match(/&phi;\(x\) -> ([SKI()]+) vs \1/);
    });

    it ('can validate truth tables', () => {
        const quest = new Quest({
            subst: '&phi;',
            cases: [
                [ 'f->f (KI) (KI)', 'f->KI' ],
                [ {max: 10}, 'f->f (KI) (K )', 'f->KI' ],
                [ 'f->f (K ) (KI)', 'f->KI' ],
                [ 'f->f (K ) (K )', 'f->K ' ],
            ],
        });

        const never = quest.check('K(K(KI))');

        expect(never.pass).to.equal(false);
        expect(never.details.map(i => i.pass ? 1 : 0).join('')).to.equal('1110');
    });

    it ('rejects bad specs', () => {
        expect(() => new Quest({cases: [['f->f']]})).to.throw(/exactly 2/);
        expect(() => new Quest({cases: [['f', 'I', 'I']]})).to.throw(/exactly 2/);
    });

    it ('handles global unlockable engine', () => {
        const ski = new SKI({allow: 'SK'});
        const quest = new Quest({engine: ski, cases: [['f->f x', 'f->I x']]});
        const fail = quest.check('I');
        expect(fail.exception + '').to.match(/restricted/);

        ski.restrict('+I'); // oh noes! spooky action at a distance
        const pass = quest.check('I');
        expect (pass.exception).to.equal(undefined);

    });

});
