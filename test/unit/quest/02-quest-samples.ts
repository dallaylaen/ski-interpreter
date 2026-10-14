import { expect } from 'chai';

import { Quest } from '../../../src/quest';

describe('Quest (samples)', () => {
  batch(new Quest({
    name:  'I from SK',
    input: 'i',
    cases: [['i x', 'x']],
    allow: 'SK',
  }), quest => {
    solution(quest, ['SKK'], { pass: true });
    solution(quest, ['CKK'], { pass: false });
    solution(quest, ['I'], { pass: false });
  });

  batch(new Quest({
    name:  'T, linear',
    input: 't',
    cases: [
      ['t x y', 'y x'],
      [{ caps: { linear: true } }, 't'],
    ],
  }), quest => {
    solution(quest, ['CI'], { pass: true });
    solution(quest, ['S(K(SI))K'], { pass: true });
  });

  batch(new Quest({
    name:  'M from W, linear',
    input: 'm',
    cases: [
      ['m W x', 'x x'],
      [{ caps: { linear: true } }, 'm'],
    ],
  }), quest => {
    solution(quest, ['CII'], { pass: true });
    solution(quest, ['SI(KI)'], { pass: true });
    solution(quest, ['K(WI)'], { pass: false, reason: [undefined, /duplicate/] });
  });

  batch(new Quest({
    name:  'multiple inputs + lambda',
    input: [
      { name: 'X', lambdas: true, allow: 'I-I' },
      { name: 'b', allow: 'XI' },
      { name: 't', allow: 'XI' },
    ],
    cases: [
      [{ caps: { linear: true } }, 'X'],
      ['b x y z', 'x (y z)'],
      ['t x y', 'y x'],
    ],
  }), quest => {
    solution(quest, ['a->b->c->d->b (a d c)', 'X(XII)', 'XII'], { pass: true });
    solution(quest,
      ['a->a(b->c->d->b d (c d))(b->c->b)', 'X(X(X(XI))I(X(XI)))', 'X(X(XI))(X(XI)(X(X(XI))I))(X(XI))'],
      { pass: false, reason: [/duplicate/, undefined, undefined] });
    solution(quest, ['a->b->b a', 'XX', 'X'], { pass: false, reason: [undefined, /!=/, undefined] });
  });

  batch(new Quest({
    name:  'wait for more args',
    input: 'f',
    cases: [['f x y z', 'x y z'], ['f (WI)(WI)', 'f (WI)(WI)']],
  }), quest => {
    solution(quest, ['BCC'], { pass: true });
    solution(quest, ['I'], { pass: false, reason: [undefined, /failed/] });
    solution(quest, ['C'], { pass: false, reason: [/.../, undefined] });
  });
});

/*
 * NOTE! `batch` and `solution` are written in such a way that
 * failed tests are attribute to the exact line where they happen
 * This should hold, but overall structure is too verbose,
 * improvements welcome.
 */
function batch (quest: Quest, run: (q: Quest) => void): void {
  describe(`${quest.name}`, () => {
    run(quest);
  });
}

function solution (quest: Quest, solution: string[], exp: {
  pass: boolean,
  reason?: (RegExp|undefined)[],
}): void {
  describe(`solution [${solution.join('; ')}]`, () => {
    const { pass, reason } = exp;
    const result = quest.check(...solution);
    it(pass ? 'passes' : 'fails', () => {
      expect(result.pass).to.equal(pass);
    });
    if (reason === undefined)
      return;
    const details = result.details;
    for (let i = 0; i < reason.length && i < details.length; i++) {
      const r = reason[i];
      if (r instanceof RegExp) {
        it('fails with reason ' + reason[i], () => {
          expect(details[i].reason).to.match(r);
          expect(details[i].pass).to.equal(false);
        });
      } else {
        it('passes case ' + i, () => {
          expect(details[i].pass).to.equal(true, details[i].reason);
        });
      }
    }
  });
}
