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

// TODO remove the below after all quests are migrated
describe('Quest (old)', () => {
    it( 'can validate I', done => {
        const quest = new Quest()
            .add('x', 'x');
        const ski = new SKI;
        const result = quest.check(ski.parse('SKK'));

        expect( result.expr instanceof SKI.classes.Expr ).to.equal(true,
            'result.expr must be present & instanceof AST');
        expect( result.pass ).to.equal(true);

        // try to fool the parser with eponymous free var
        const bad = quest.check(ski.parse('Kx'));
        expect( bad.pass ).to.equal(false);

        done();
    });

    it ('works for if', done => {
        const quest = new Quest(
            {title:"if (then) (else) (true|false)", cases: [
                [ 'x', 'x', 'y', 'K'],
                [ 'y', 'x', 'y', 'KI'],
            ]}
        );

        const ski = new SKI();

        const rot = ski.parse('S(S(K(S))(S(K(K))(S(K(S))(S(K(S(I)))(K)))))(K(K))');
        const pass = quest.check(rot);

        expect(pass.pass).to.equal(true);
        expect(pass.details.length).to.equal(2);

        expect(pass.details[0].args.join(' ')).to.equal('x y K');

        const bad = ski.parse('KK');
        const fail = quest.check(bad);

        expect(fail.pass).to.equal(false);
        expect(fail.details.length).to.equal(2);

        expect(fail.details[0].pass).to.equal(false);
        expect(fail.details[1].pass).to.equal(true);

        expect(''+fail.details[0].found).to.equal('y');
        expect(''+fail.details[0].expected).to.equal('x');

        expect(pass.details[0].args.join(' ')).to.equal('x y K');

        done();
    });

    it('can verify locked down solutions', done => {
        const quest = new Quest(
            {title: 'I from S & K', allow: 'SK', cases: [['x', 'x']]}
        );

        const good = quest.check('SKK');
        expect(good.pass).to.equal(true);

        const bad = quest.check('I');
        expect(bad.pass).to.equal(false);
        expect(bad.exception).to.match(/ative.* I .*restricted.* KS/)
        // expect(''+bad.details[0].found).to.equal('I(x)');

        done();
    });

    it( 'can verify terms that require calculations', done => {
        const quest = new Quest(
            {
                numbers: true, allow: 'SKIBCW',
                cases: [
                    ['5 x y', '4', 'x', 'y'],
                ],
            }
        );
        const good = quest.check('SB');
        expect( good.pass ).to.equal (true);

        const bad = quest.check('I');

        expect( bad.pass ).to.equal(false);
        expect(''+bad.details[0].expected).to.equal('x(x(x(x(x(y)))))');
        expect(''+bad.details[0].found).to.equal('x(x(x(x(y))))');

        done();
    });

    it ('does not die on incorrect inputs', done => {
        const quest = new Quest({cases: [['x', 'x']],});

        const result = quest.check('I)))');

        expect(result.pass).to.equal(false);
        expect(result.details).to.deep.equal([]);
        expect(result.exception).to.match(/unbalanced input/i);

        done();
    });

    it ('Can apply expect to input if needed', done => {
        const quest = new Quest({cases: [[{feedInput: true}, 'K', 'x']]});

        const result = quest.check('y');
        expect(''+result.details[0].expected).to.equal('K(y)');
        expect(''+result.details[0].found).to.equal('y(x)');
        expect(result.pass).to.equal(false);

        done();
    });
})
