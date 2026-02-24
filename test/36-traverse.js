'use strict';

const { expect } = require('chai');
const { SKI } = require('../index');
const { Alias } = SKI.classes;

describe('SKI.traverse', () => {
  const ski = new SKI();
  ski.add('T', 'CI');
  ski.add('V', 'BCT');
  const expr = ski.parse('S(x->5 x K)(V(Wf))');

  it('visits all nodes in pre-order', () => {
    const nodes = [];
    expr.traverse(e => {
      if (!(e instanceof SKI.classes.App))
        nodes.push(e.format({ terse: false }));
    });
    expect(nodes).to.deep.equal([
      'S',
      'x->5(x)(K)',
      '5',
      'x',
      'K',
      'V',
      'B',
      'C',
      'T',
      'C',
      'I',
      'W',
      'f',
    ]);
  });

  it('adheres to SKI.control.stop', () => {
    const { x, y } = SKI.vars();
    let expr = ski.parse('S(a->a x)(x(x x))', { env: { x } });

    const trace = [];
    do {
      trace.push(expr + '');
      expr = expr.traverse(e => {
        if (e === x)
          return SKI.control.stop(y);
      });
    } while (expr);

    for (let i = 0; i < trace.length - 1; i++) {
      // s/x/y === trace[0]
      // n of y's === i
      expect(trace[i].replace(/y/g, 'x')).to.equal(trace[0]);
      expect(trace[i].match(/y/g) || []).to.have.lengthOf(i);
    }
  });

  it('can emulate LO eval', () => {
    const initial = ski.parse('BC(CI) x y f'); // f x y z

    // convert to lambdas
    let expr = initial.traverse(e => {
      if (e instanceof SKI.classes.Native)
        return e.infer().expr;
    });

    const steps = [...expr.walk()].map(e => e.expr + '');
    const trace = [];

    while (expr) {
      trace.push(expr + '');
      expr = expr.traverse(e => {
        if (e instanceof SKI.classes.Lambda)
          return SKI.control.prune(null);
        if (e instanceof SKI.classes.App && e.fun instanceof SKI.classes.Lambda)
          return SKI.control.stop(e.fun.invoke(e.arg));
      });
    }

    expect(trace).to.deep.equal(steps);
  });

  it('can expand aliases, recursively', () => {
    const expr = ski.parse('t1 = CI; t2 = t1; T = t2; V = BCT; pair = (V a b)');

    const bare = expr.traverse(e => {
      // console.log('in ' + e);
      if (e instanceof Alias) {
        // console.log('found alias ' + e.name);
        return SKI.control.redo(e.impl);
      }
    });

    // console.log(bare.diag());
    expect(bare.any(e => e instanceof Alias)).to.equal(false, 'No aliases in bare');
    bare.expect(expr);
  });

  it('can extract equivalent terms', () => {
    const expr = ski.parse('(S(S(KS)K) (S(S(KS)K) (SK)))');
    const terms = [SKI.native['+'], SKI.church(0)];
    const short = expr.traverse(e => {
      const canon = e.infer().expr;
      for (const t of terms) {
        if (canon.equals(t.infer().expr))
          return t;
      }
    });

    expect(short + '').to.equal('+(+ 0)');
  });
});
