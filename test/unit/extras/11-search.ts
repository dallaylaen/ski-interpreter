import { expect } from 'chai';

import { SKI } from '../../../src';
import { Expr } from '../../../src/expr';
const { search } = SKI.extras;

const ski = new SKI();

describe('SKI.extras.search (ts)', () => {
  it('can report custom evidence types', () => {
    /*
       A term `n K I` will only prodice `m K I` where m <= n via self-application.
       Thus we can return ALL found terms and know in advance what they look like.
     */
    const trace = [];
    let last;
    for (const tick of search([ski.parse('9 K I')], { tries: 200 }, (_, prop) => {
      return { found: prop.arity }
    })) {
      if (tick.found)
        trace.push(tick.found);
      last = tick;
    }
    expect(trace).to.deep.equal([10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);

    if (last) {
      expect(last.total).to.be.below(110, 'all possible terms exhausted by search');
      expect(last.probed).to.equal(trace.length);
    } else
      throw new Error('No search progress was reported ever');
  });

  it('cat prove a base', () => {
    const target: Record<string, Expr> = {};
    for (const term of ['K', 'S']) {
      const lambda = ski.parse(term).infer().expr;
      if (!lambda)
        throw new Error(`Failed to infer ${term}`);
      target[term] = lambda;
    }

    const seed = [ski.parse('X=x->xSK')]; // iota

    const gen = search(
      seed,
      { tries: 1000 },
      (_, prop) => {
        for (const [term, lambda] of Object.entries(target)) {
          if (!prop.expr)
            return -1; // non=terminating => throw away
          if (prop.expr.equals(lambda)) {
            delete target[term];
            return { found: term, stop: Object.keys(target).length === 0 }
          }
        }
      }
    );

    const found: string[] = [];
    for (const tick of gen) {
      if (tick.found)
        found.push(tick.found);
    }

    expect(found).to.include.members(['K', 'S'], 'found all base combinators');
  });
});
