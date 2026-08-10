import { expect } from 'chai';
import { SKI } from '../../../src/index';

type Tree = string | Tree[];

describe('Expr.foldBottomUp', function () {
  it('should foldr over an expression', function () {
    const ski = new SKI();
    const expr = ski.parse('S(x y z)(K(a b))');
    const res = expr.foldBottomUp<Tree>((head, tail) => {
      return tail.length ? [head + '', ...tail] : head + '';
    });
    expect(res).to.deep.equal(['S', ['x', 'y', 'z'], ['K', ['a', 'b']]]);
  });

  it('prints fancy HTML', function () {
    const ski = new SKI();
    const expr = ski.parse('BBBWC');
    const html = expr.foldBottomUp((head, tail: string[]) => {
      if (head.arity && head.arity <= tail.length) {
        return '(<span class="redex">'
          + [head, ...tail.slice(0, head.arity)].join('')
          + '</span>'
          + tail.slice(head.arity).join('')
          + ')';
      } else
        return '(' + [head, ...tail].join(' ') + ')';
    });
    expect(html).to.equal('(<span class="redex">B(B)(B)(W)</span>(C))');
  });
});
