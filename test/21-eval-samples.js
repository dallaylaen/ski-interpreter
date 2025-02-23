const { expect } = require ('chai');
const { SKI } = require('../index');

const ski = new SKI();

describe ('expression samples evaluate correctly', () => {
    // [source, final state, # of steps]
    const cases = [
        ['S x y z', 'x z (y z)', 1],

        ['T = CI'],
        ['T x y', 'y x', 3],

        ['V = BCT'],
        ['V x y z', 'z x y', 6],

        ['SK x y', 'y', 2],

        ['(x->y->y x) f g', 'g f', 2],

        // PII = T, PT = B - check it!
        ['P = a->b->c->d->b(a d c); P(PII) x y z', 'x (y z)', 14],
        // ditto but no alias
        ['(x->x(xII))(a->b->c->d->b(a d c)) x y z', 'x(y z)', 14],

        //
        ['WI(a->b->a b) x y', 'x y', 7],

        // church numerals coercion
        ['+ x y z', 'y(x y z)', 1],
        ['+x', '+x', 0],
        ['4 + 3', '7', 4],
        ['WB(WB)(WB) + 0', '16', 32],

    ];

    for (const entry of cases) {
        const [start, end, steps] = entry;
        const jar = {};
        it ('evaluates ' + start + ' in at most ' + steps + ' steps', () => {
            const expr = ski.parse(start, jar);
            if (expr instanceof SKI.classes.Alias)
                ski.add(expr.name, expr.impl);
            const got = expr.run({max: steps ? steps+1 : undefined}); // 1 extra step for the "final" badge
            if (end !== undefined) {
                try {
                    got.expr.expect(ski.parse(end, jar));
                } catch (e) {
                    recheck(start, end, steps);
                    throw e;
                }
            }
            expect(got.final).to.equal(true, 'final expr in '+steps+' steps');
        });
    }

    // run in super slo mo whatever failed

});

function recheck (start, end, steps) {
    const jar = {};
    const expr = ski.parse(start, jar);
    const target = ski.parse(end, jar);

    console.log('rechecking '+start+ ' vs '+end);

    for (let state of expr.walk()) {
        console.log('step ' + state.steps + ': ' + state.expr);
        console.dir (state.expr, { depth: Infinity });
        if (state.steps > steps)
            break;
    }
    console.log('expected');
    console.dir(target, { depth: Infinity});
}
