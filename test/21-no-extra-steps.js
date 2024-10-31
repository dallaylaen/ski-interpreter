const { expect } = require ('chai');
const { SKI } = require('../index');

describe ('SKI does not take unneeded steps', () => {
    const cases = [
        ['S x y z', 'x z (y z)', 1],

        ['T = CI',,1],
        ['T x y', 'y x', 3],

        ['V = BCT',,1],
        ['V x y z', 'z x y', 6],

        ['SK x y', 'y', 2],

        ['(x->y->y x) f g', 'g f', 2],
    ];

    const ski = new SKI();
    for (const entry of cases) {
        const [start, end, steps] = entry;
        const jar = {};
        it ('evaluates ' + start + ' in at most ' + steps + ' steps', () => {
            const got = ski.parse(start, jar).run({max: steps ? steps+1 : undefined}); // 1 extra step for the "final" badge
            console.log(got);
            if (end !== undefined)
                got.expr.expect(ski.parse(end, jar));
            expect(got.final).to.equal(true, 'final expr in '+steps+' steps');
            if (got.expr instanceof SKI.classes.Alias)
                ski.add(got.expr.name, got.expr.impl);
        });
    }
});
