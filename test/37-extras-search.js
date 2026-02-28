'use strict';

const { expect } = require('chai');

const { SKI } = require('../index');
const { search } = SKI.extras;

describe('SKI.extras.search', () => {
  const vars = SKI.vars();
  const { x, y, z } = vars;

  describe('some basic conditions', () => {
    it('generates all possible combinations without repetition', () => {
      const { cache, total } = SKI.extras.search([x, y], { depth: 5, retain: true, infer: false }, () => 0);

      // console.log(SKI.extras.deepFormat(cache));

      expect(Array.isArray(cache)).to.equal(true, 'cache is array');
      const uniq = {};
      const dupes = [];

      for (let gen = 0; gen < cache.length; gen++) {
        expect(Array.isArray(cache[gen])).to.equal(true, 'level ' + gen + ' is an array, not ' + typeof (cache[gen]));
        for (const item of cache[gen]) {
          expect((item + '').replace(/[() ]/g, '').length ).to.equal(gen + 1, item + ' in gen ' + gen);
          if (uniq[item])
            dupes.push(item + '');
          uniq[item] = true;
        }
      }

      expect(cache[0]).to.deep.equal([x, y]);

      expect(dupes).to.deep.equal([]);
      expect(Object.keys(uniq).length).to.equal(total);
    })
  });

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
  check('tries exhausted', [SKI.S, SKI.K], { tries: 10, depth: 5 }, () => 0, (res) => {
    expect(res.expr).to.equal(undefined);
    expect(res.total).to.equal(10);
  });
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
