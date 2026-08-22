import { expect } from 'chai';
import { isInstanceOf } from '../../lib/assert';

import { SKI } from '../../../src';
import { Alias, depSort, Expr, Lambda, Named } from '../../../src/expr';

describe('depSort', () => {
  const ski = new SKI({ atomic: true });

  describe('corner cases', () => {
    it('forbids duplicate names', () => {
      expect(() => depSort([ski.parse('T'), ski.parse('T=CI')]))
        .to.throw();
    });
  });

  const t: Record<string, Expr> = {};

  t.T = ski.parse('T=CI', { env: t });
  t.V = ski.parse('V=BCT', { env: t });
  t.M = ski.parse('M=WI', { env: t });
  t.R = ski.parse('R=BBT', { env: t });
  t.L = ski.parse('L=BWB', { env: t });

  t.iota = ski.parse('iota=x->xSK', { env: t });
  t.mono = ski.parse('mono=x->xBTI', { env: t });
  t.nat = ski.parse('@atomic nat=x->xT iota', { env: t });
  t.Y = ski.parse('@atomic Y=f->f(Yf)', { env: t });

  check('no duplicates: (I)', [SKI.I, SKI.I, SKI.I], [[SKI.I]], 1);
  check('simple alias (T)', [t.T], [[SKI.C, t.T], [SKI.I, t.T]], 3);
  check('compound alias (V)', [t.V], [[SKI.B, t.V], [SKI.C, t.V], [t.T, t.V]], 5);
  check('lambda (x->xSK)', [t.iota], [[SKI.S, t.iota], [SKI.K, t.iota]], 3, sorted => {
    it('does not expose parasitic vars', () => {
      isInstanceOf(t.iota, Alias);
      isInstanceOf(t.iota.impl, Lambda);
      expect(sorted).to.not.contain(t.iota.impl.arg);
    });
  });

  check('self-ref atomic (Y)', [t.Y], [[t.Y]], 1);

  check('all together', Object.values(t), [], Object.keys(t).length + 6);
});

function check (comment: string, src: Expr[], order: Expr[][], size: number, additional?: (list: Expr[]) => void) {
  describe(comment + ': ' + src.map(e => e + '').join(', '), () => {
    const sorted = depSort(src);

    it('has no repetitions', () => {
      const set = new Set();
      const duplicates = new Set();
      for (const e of sorted) {
        if (set.has(e))
          duplicates.add(e);
        else
          set.add(e);
      }
      expect(duplicates.size).to.equal(0, 'duplicates: ' + [...duplicates].join(', '));
    });

    // TODO no same-name aliases

    // ensure all src terms are in the sorted list
    it('contains all src terms', () => {
      const set = new Set(sorted);
      for (const e of src)
        expect(set).to.contain(unwrap(e));
    });

    // ensure all lists inside `order` appear in the sorted list in the same order
    it('adheres partial order', () => {
      for (const group of order) {
        expect(isSubSeq(group.map(unwrap), sorted)).to.equal(
          true,
          'group ' + group.map(e => e + '').join(', ')
          + ' is not a subsequence of ' + sorted.map(e => e + '').join(', ')
        );
      }
    });

    it('has unique names', () => {
      const names: Record<string, Named> = {};
      for (const term of sorted) {
        if (!(term instanceof Named))
          continue;
        if (names[term.name] !== undefined)
          term.expect(names[term.name], 'different terms with name: ' + term.name);
        names[term.name] = term;
      }
    });

    it('has the expected size', () => {
      expect(sorted.length).to.equal(size, 'expected array(' + size + '), got: \n' + diag(sorted) );
    });

    if (additional)
      additional(sorted);
  });
}

function isSubSeq<T> (sub: T[], seq: T[]): boolean {
  let i = 0;
  for (const e of seq) {
    if (e === sub[i])
      i++;
  }
  return i === sub.length;
}

function diag (list: Expr[]): string {
  return list.map((e, i) => '--- ' + i + ' ---\n' + e.diag()).join('\n') + '\n--- end ---\n';
}

function unwrap (e: Expr): Expr {
  while (e instanceof Alias && e.impl instanceof Named && e.name === e.impl.name)
    e = e.impl;
  return e;
}
