'use strict';

const { expect } = require('chai');

const { SKI } = require('../../src/index');
const { search } = SKI.extras;

/**
 * Consume the search generator and return a summary object that mirrors the
 * old SearchResult shape so the existing check() helper still works.
 * Also accumulates all found expressions in res.found[].
 */
function runSearch (seed, options, predicate) {
  const gen = search(seed, options, predicate);
  let last;
  const found = [];
  for (const progress of gen) {
    last = progress;
    if (progress.found && progress.expr !== undefined)
      found.push(progress.expr);
  }
  // The last yielded progress (or a synthetic one if the generator was empty)
  const base = last ?? { gen: 0, total: 0, probed: 0, cache: [[]] };
  return { ...base, expr: found[0], found };
}

describe('SKI.extras.search', () => {
  const vars = SKI.vars();
  const { x, y, z } = vars;

  describe('some basic conditions', () => {
    it('generates all possible combinations without repetition', () => {
      // Consume the generator to the end; collect the last progress so we get
      // the final cache state.
      const gen = SKI.extras.search([x, y], { depth: 5, infer: false }, () => 0);
      let last;
      for (const p of gen) last = p;
      const { cache, total } = last;

      // console.log(SKI.extras.deepFormat(cache));

      expect(Array.isArray(cache)).to.equal(true, 'cache is array');
      const uniq = {};
      const dupes = [];

      for (let g = 0; g < cache.length; g++) {
        expect(Array.isArray(cache[g])).to.equal(true, 'level ' + g + ' is an array, not ' + typeof (cache[g]));
        for (const item of cache[g]) {
          expect((item + '').replace(/[() ]/g, '').length ).to.equal(g + 1, item + ' in gen ' + g);
          if (uniq[item])
            dupes.push(item + '');
          uniq[item] = true;
        }
      }

      expect(cache[0]).to.deep.equal([x, y]);

      expect(dupes).to.deep.equal([]);
      expect(Object.keys(uniq).length).to.equal(total);
    });

    it('yields step:true at generation boundaries', () => {
      const steps = [];
      for (const p of SKI.extras.search([x, y], { depth: 3, infer: false }, () => ({ found: true }))) {
        if (p.step)
          steps.push(p.gen);
      }

      expect(steps).to.deep.equal([1, 2]);
    });

    it('yields found:true only when predicate returns found', () => {
      const foundYields = [];
      for (const p of SKI.extras.search([x, y], { depth: 3, infer: false },
        (e) => e === x ? { found: true } : 0
      ))
        if (p.found) foundYields.push(p.expr);

      // x is in the seed; it should be found once without stopping
      expect(foundYields).to.deep.equal([x]);
    });

    it('stops immediately when predicate returns stop:true without found', () => {
      let count = 0;
      for (const _ of SKI.extras.search([x, y], { depth: 10, infer: false },
        () => { count++; return { stop: true }; }
      )) {
        // nothing
      }
      // only the first seed term is probed before stop
      expect(count).to.equal(1);
    });

    it('returns all found terms when stop is not set', () => {
      const res = runSearch([x, y], { depth: 3, infer: false },
        (e) => (e === x || e === y) ? { found: true } : 0
      );
      expect(res.found.length).to.be.greaterThanOrEqual(2);
    });

    it('terminates if no more terms could be generated', () => {
      const gen = SKI.extras.search([SKI.I], {}, () => ({ found: true }));
      const trace = [];
      for (const p of gen) {
        if (p.expr)
          trace.push(p.expr + '');
        expect(p.gen).to.be.below(3);
      }
      expect(trace).to.deep.equal(['I']);
    });

    it('honors maxSize option', () => {
      const gen = SKI.extras.search([SKI.K], { depth: 20, maxSize: 3 }, (_, p) => ( p.normal ? { found: true, offset: 0 } : -1));
      for (const p of gen) {
        if (p.expr && p.expr.size !== undefined)
          expect(p.expr.size).to.be.lessThanOrEqual(4);
        expect(p.gen).to.be.below(9);
      }
    });
  });

  check('finds S', [SKI.S], {}, (e, _) => e === SKI.S ? { found: true, stop: true } : 0);
  check('finds I', [SKI.S, SKI.K], {}, (e, _) => getsto(e, [x], x) ? { found: true, stop: true } : 0);
  check('finds nothing and terminates', [SKI.S, SKI.K], { tries: 100 },
    () => { return { offset: -1 }; },
    (res) => {
      expect(res.expr).to.equal(undefined);
      expect(res.total).to.equal(2);
    });
  check('finds B', [SKI.S, SKI.K], {},
    (e, _) => getsto(e, [x, y, z], x.apply(y.apply(z))) ? { found: true, stop: true } : 0);
  check('tries exhausted', [SKI.S, SKI.K], { tries: 10, depth: 5 }, () => 0, (res) => {
    expect(res.expr).to.equal(undefined);
    expect(res.total).to.equal(10);
  });

  describe('new semantics', () => {
    it('found and stop are orthogonal: found without stop keeps searching', () => {
      const found = [];
      for (const p of SKI.extras.search([SKI.S, SKI.K], { tries: 500 },
        (e, _) => e === SKI.S || e === SKI.K ? { found: true } : 0
      ))
        if (p.found) found.push(p.expr);

      expect(found.length).to.be.greaterThanOrEqual(2);
    });

    it('negative offset discards; explicit non-negative offset places term', () => {
      // Return offset:5 for everything — all terms end up far in the future,
      // so gen-1 and gen-2 cache slots stay empty and nothing further is built
      // from them. We just check it doesn't throw and yields coherently.
      let lastGen = 0;
      for (const p of SKI.extras.search([x, y], { depth: 4, infer: false },
        () => ({ offset: 5 })
      ))
        lastGen = p.gen;

      expect(lastGen).to.be.a('number');
    });

    it('cache is present on every yielded progress', () => {
      for (const p of SKI.extras.search([x, y], { depth: 2, infer: false }, () => 0))
        expect(p.cache).to.be.an('array');
    });
  });
});

function check (name, seed, options, predicate, extras) {
  describe(name, () => {
    const trace = [];
    const wrap = (e, props) => {
      trace.push({ e, props });
      return predicate(e, props);
    };

    const res = runSearch(seed, { tries: 100000, ...options }, wrap);
    it('returns expected fields', () => {
      expect(res).to.be.an('object');
      expect(res.total).to.be.a('number');
      expect(res.probed).to.be.a('number');
      expect(res.gen).to.be.a('number');

      if (res.expr !== undefined)
        expect(res.expr).to.be.instanceOf(SKI.classes.Expr);

      expect(res.gen).to.be.within(0, (options.depth ?? 16) + 1);
      expect(res.probed).to.be.lessThanOrEqual(res.total);
      expect(res.probed).to.equal(trace.length);
    });

    if (res.expr !== undefined) {
      it('actually found an expression matching the predicate', () => {
        const props = res.expr.infer({ max: options.max, maxArgs: options.maxArgs });
        const raw = predicate(res.expr, props);
        const result = typeof raw === 'number' ? { found: raw > 0 } : (raw ?? {});
        expect(result.found).to.equal(true);
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
  return expr.run(...args).expr.equals(exp);
}
