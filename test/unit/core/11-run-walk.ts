/**
 * Ensure that `run` and `walk` functions behave consistently.
 */

import { expect } from 'chai';
import { SKI } from '../../../src';
import { RunOptions } from '../../../src/expr';
const { deepFormat } = SKI.extras;

const ski = new SKI();

describe('Expr.run() vs Expr.walk()', () => {
  runAndWalk('I');
  runAndWalk('K x y', { steps: 0 });
  runAndWalk('L=BWB; 10 LI x', { maxSize: 50 });
  runAndWalk('WI(x y z)', { maxSize: 7 });
  runAndWalk('SII(SII)', { max: 20 });
  runAndWalk('WS(BWB) W x', { max: 30 });
  runAndWalk('BBB a b c d', { max: -1 });
  runAndWalk('BBB a b c d', { steps: 111 }); // continue an older calculation
});

function runAndWalk (input: string, options: RunOptions = {}): void {
  describe('holds for ' + input + ' at ' + JSON.stringify(options), () => {
    const expr = ski.parse(input);
    const end = expr.run(options);

    if (!end.final) {
      it('makes at least one step', () => {
        expect(end.steps).to.be.greaterThan(0);
      });
    }

    let last;
    for (last of expr.walk(options)); // drain the iterator

    if (typeof last === 'undefined')
      it('walk() must yield at least one step', done => done('failed'));
    else {
      it('produces the same expression', () => {
        end.expr.expect(last.expr, 'Final expressions in run and walk');
      });
      it('produces identical metadata', () => {
        expect(deepFormat(last)).to.deep.equal(deepFormat(end));
      });
    }
  });
}
