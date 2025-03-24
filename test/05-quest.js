const { expect } = require('chai');
const { SKI, Quest } = require('../index');

describe('Quest', () => {
    const reduct = item => item.start + ' -> ' + item.found + ' vs ' + item.expected;

    it('can validate I', () => {
        const quest = new Quest({
            subst: '&phi;',
            allow: 'SK',
            input: 'phi',
            cases: [
                [ 'phi x', 'x']
            ]
        });

        const pass = quest.check('SKK');
        expect(pass.exception).to.equal(undefined);
        expect(pass.pass).to.equal(true);

        const details = pass.details[0];
        expect(details.start + ' -> ' + details.found).to.equal('&phi;(x) -> x');
        expect(details.steps).to.be.within(2, 3, "SKK=I takes 2-3 steps to validate");

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
            input: 'f',
            cases: [['f x', 'f']],
        });

        const pass = quest.check('SII (S(S(KS)K)K)');
        // console.log(pass);
        expect(pass.pass).to.equal(true);
        expect(reduct(pass.details[0])).to.match(/&phi;\(x\) -> ([SKI()]+) vs \1/);
    });

    it ('can validate truth tables', () => {
        const quest = new Quest({
            subst: '&phi;',
            input: 'f',
            cases: [
                [ 'f (KI) (KI)', 'KI' ],
                [ {max: 10}, 'f (KI) (K )', 'KI' ],
                [ 'f (K ) (KI)', 'KI' ],
                [ 'f (K ) (K )', 'K ' ],
            ],
        });

        const never = quest.check('K(K(KI))');

        expect(never.pass).to.equal(false);
        expect(never.details.map(i => i.pass ? 1 : 0).join('')).to.equal('1110');
        expect(never.steps).to.be.within(1, 100);
        never.expr.expect(never.input[0]);
        never.expr.expect(quest.engine.parse('K(K(KI))'));
    });

    it ('rejects bad specs', () => {
        expect(() => new Quest({input: "foo", cases: [['f->f']]})).to.throw(/exactly 2/);
        expect(() => new Quest({input: "foo", cases: [['f', 'I', 'I']]})).to.throw(/exactly 2/);
    });

    it ('handles global unlockable engine', () => {
        const ski = new SKI({allow: 'SK'});
        const quest = new Quest({engine: ski, input: 'f', cases: [['f x', 'I x']]});
        const fail = quest.check('I');
        expect(fail.exception + '').to.match(/restricted/);

        ski.restrict('+I'); // oh noes! spooky action at a distance
        const pass = quest.check('I');
        expect (pass.exception).to.equal(undefined);

    });

    it ('honors own restrictions', () => {
        const ski = new SKI();
        const quest = new Quest({engine: ski, vars: ['foo'], input: 'f', cases: [['f x', 'x']], allow: 'SK'});
        expect(quest.allowed()).to.match(/^KS(?: foo)?$/);
        const fail = quest.check('I');
        expect(fail.exception + '').to.match(/restricted/);
        const pass = quest.check('SK foo');
        expect(pass.pass).to.equal(true);
    });

    it ('detects infinite loops', () => {
        const quest = new Quest({
            input: 'x',
            cases: [[{max: 20}, 'x x', 'x']],
        });

        const fail = quest.check('SII');
        expect(fail.pass).to.equal(false);
        expect(fail.details[0].steps).to.be.within(20, 100);
        expect(fail.details[0].pass).to.equal(false);
        expect(fail.details[0].reason).to.match(/in 20 steps/);
    });

    it ('honors given vars', () => {
        const quest = new Quest({
            "vars": ["nil=KI", "lst=BS(C(BB))"],
            "input": "rev",
            "cases": [
                ["rev nil", "nil"],
                ["rev (lst a nil)", "lst a nil"],
                ["rev (lst a(lst b(lst c nil)))", "lst c (lst b (lst a nil))"]
            ]
        });

        const result = quest.check("BBBC(BC(CI)) (B(CB)lst) I nil");
        expect(result.pass).to.equal(true, result.details[0].reason);
    });

    it ('supports linear cases', () => {
        const quest = new Quest({
            input: 't',
            cases: [
                [{linear: true}, 't'],
                [ 't x y', 'y x'],
            ],
        });

        const pass = quest.check('B(SI)K');
        expect(pass.pass).to.equal(true);

        const fail = quest.check('KI');
        const details = fail.details;
        expect(details[0].reason).to.match(/linear/);
        expect(details[1].reason).to.match(/expected/);
        expect(details[0].pass).to.equal(false);
        expect(details[1].pass).to.equal(false);
        expect(fail.pass).to.equal(false);
    });
});
