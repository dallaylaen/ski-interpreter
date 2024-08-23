const { expect } = require ('chai');
const { SKI } = require('../index');

describe ('Expr.walk', () => {
    it ('produces iterator', () => {
        const ski = new SKI();
        let expr = ski.parse('S(K(SI))K foo bar');

        let n = 0;
        let end = false;
        for (const state of expr.walk()) {
            expect(end).to.equal(false, 'make sure we don\'t run past last iteration');
            expect(state.steps).to.equal(n++);
            expect(typeof state.final).to.equal('boolean');
            expect(''+state.expr).to.equal(''+expr);
            expr = expr.step(); // keep up with the execution
            if (state.final) {
                end = true;
                expect(''+state.expr).to.equal('bar(foo)');
            }
        }
    });
})
