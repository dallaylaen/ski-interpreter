'use strict';

const expect = require('chai').expect;

const { SKI } = require('../index');
const { search } = SKI.extras;

describe('SKI.extras.search', () => {
  const vars = SKI.vars();
  const { x, y, z } = vars;
  check('finds S', [SKI.S], {}, (e, _) => e === SKI.S ? 1 : 0);
  check('finds I', [SKI.S, SKI.K], {}, (e, _) => getsto(e, [x], x));
  check('finds nothing and terminates', [SKI.S, SKI.K], { tries: 100 },
    () => -1,
    (res) => {
      expect(res.expr).to.equal(undefined);
      expect(res.total).to.equal(2);
    });
  check('finds B', [SKI.S, SKI.K], {},
    (e, _) => getsto(e, [x, y, z], x.apply(y.apply(z))) ? 1 : 0);
});

function check (name, seed, options, predicate, extras) {
  describe(name, () => {
    const trace = [];
    const wrap = (e, props) => {
      trace.push({ e, props });
      return predicate(e, props);
    };

    const res = search(seed, { tries: 100000, ...options }, wrap);
    it('returns expected fields', () => {
      expect(res).to.be.an('object');
      expect(res.total).to.be.a('number');
      expect(res.probed).to.be.a('number');
      expect(res.gen).to.be.a('number');

      if (res.expr !== undefined)
        expect(res.expr).to.be.instanceOf(SKI.classes.Expr);

      expect(res.gen).to.be.within(1, options.depth ?? 100);
      expect(res.probed).to.be.lessThanOrEqual(res.total);
      expect(res.probed).to.equal(trace.length);
    });

    if (res.expr !== undefined) {
      it('actually found an expression matching the predicate', () => {
        const props = res.expr.infer({ max: options.max, maxArgs: options.maxArgs });
        expect(predicate(res.expr, props)).to.be.greaterThan(0);
      });
    }

    it('doesn\'t probe duplicates', () => {
      const seen = {};
      for (const { e } of trace) {
        expect(seen[e]).to.equal(undefined);
        seen[e] = true;
      }
    });

    if (options.infer && !options.noskip) {
      it('skips duplicates based on inference', () => {
        const seen = {};
        for (const { props } of trace) {
          if (props.expr) {
            expect(seen[props.expr]).to.equal(undefined);
            seen[props.expr] = true;
          }
        }
      });
    }

    if (extras) {
      it('passes user conditions', () => {
        extras(res, trace);
      });
    }
  });
}

// simplify predicate boilerplate a bit
function getsto (expr, args, exp) {
  return expr.run(...args).expr.equals(exp) ? 1 : 0;
}
