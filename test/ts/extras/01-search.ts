import { expect } from 'chai';

import { SKI } from '../../../src';
const { search } = SKI.extras;

const ski = new SKI();

describe('SKI.extras.search (ts)', () => {
  it('can report custom evidence types', () => {
    const trace = [];
    for (const tick of search([ski.parse('9 K I')], { tries: 100 }, (_, prop) => {
      return { found: prop.arity }
    })) {
      if (tick.found)
        trace.push(tick.found);
    }
    expect(trace).to.deep.equal([10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
  })
});
