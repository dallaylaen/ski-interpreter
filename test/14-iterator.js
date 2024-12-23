const { expect } = require ('chai');
const { SKI } = require('../index');

describe ('Expr.walk', () => {
    it ('works exactly for very simple example', () => {
        const ski = new SKI();
        const expr = ski.parse('KI x y');
        const frames = [ ... expr.walk() ].map( entry => [entry.expr + '', entry.steps, entry.final]);

        expect (frames).to.deep.equal([
            [ 'K(I)(x)(y)', 0, false ],
            [ 'I(y)', 1, false ],
            [ 'y', 2, true],
        ]);
    });

    const cases = [
        [ 'S(K(SI))K foo bar', 'bar foo'],
        [ '2 x y ', 'x(x y)'],
        [ 'WI(C(K(WI))) x y z t', 'C(K(WI))(C(K(WI)))'],
        [ '10 (CIx) y', 'y x x x x x x x x x x']
    ];

    for (const line of cases) {
        const [ start, result ] = line;
        it('iterates correctly over '+start, () => {
            const ski = new SKI();

            const jar = {};
            let expr = ski.parse(start, jar);

            let n = 0;
            let end = false;
            for (const state of expr.walk()) {
                expect(end).to.equal(false, 'make sure we never run past last iteration');

                console.log("step", state.steps, ":", state.expr.toString({terse: true}));

                // steps must be ascending
                expect(state.steps).to.be.within(n, Infinity);
                n = state.steps + 1;
                expect(typeof state.final).to.equal('boolean');
                expect('' + state.expr).to.equal('' + expr);
                expr = expr.step().expr; // keep up with the execution
                if (state.final) {
                    end = true;
                    expr.expect(ski.parse(result, jar));
                }
            }
        });
    }
})
