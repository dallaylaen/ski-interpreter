const { expect } = require ('chai');
const { SKI } = require('../index');

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
        ['P = a->b->c->d->b(a d c); P(PII) x y z', 'x (y z)', 12],
    ];

    const ski = new SKI();
    for (const entry of cases) {
        const [start, end, steps] = entry;
        const jar = {};
        it ('evaluates ' + start + ' in at most ' + steps + ' steps', () => {
            const init = ski.parse(start, jar);
            if (init instanceof SKI.classes.Alias)
                ski.add(init.name, init.impl);
            const got = init.run({max: steps ? steps+1 : undefined}); // 1 extra step for the "final" badge
            if (end !== undefined)
                got.expr.expect(ski.parse(end, jar));
            expect(got.final).to.equal(true, 'final expr in '+steps+' steps');
        });
    }
});
