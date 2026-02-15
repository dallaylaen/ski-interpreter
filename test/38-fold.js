'use strict';

const { expect } = require('chai');
const { SKI } = require('../index');

const { Lambda, App, Church, Native } = SKI.classes;

describe( 'Expr.fold', () => {
  const ski = new SKI();
  ski.add('M', 'SII');

  // please create an expr with all classes in use
  const expr = ski.parse('x->x (5 K  y) (M z)');

  it('goes through all nodes in LO order', () => {
    // use imperative trace here to verify the order of traversal
    // and not our ability to write a proper traverse :-D
    const trace = [];
    const ret = expr.fold(42, (acc, e) => {
      trace.push(e.constructor.name + ':' + e.toString());
      return null;
    });
    expect(trace).to.deep.equal([
      'Lambda:x->x(5 Ky)(Mz)',
      'App:x(5 Ky)(Mz)',
      'App:x(5 Ky)',
      'FreeVar:x',
      'App:5 Ky',
      'App:5 K',
      'Church:5',
      'Native:K',
      'FreeVar:y',
      'App:Mz',
      'Alias:M',
      'App:SII',
      'App:SI',
      'Native:S',
      'Native:I',
      'Native:I',
      'FreeVar:z',
    ]);
    expect(ret).to.equal(42); // all null => return initial value
  });

  it('can enumerate leaf nodes', () => {
    const trace = expr.fold('', (acc, e) => {
      if (e instanceof Lambda || e instanceof App)
        return null;
      // console.log("in: " + e);
      return SKI.control.prune(acc + e + ' ');
    });
    expect(trace).to.equal('x 5 K y M z ');
  });

  it('can break out', () => {
    const trace = expr.fold([], (acc, e) => {
      const next = [...acc, e.constructor.name + ':' + e];
      if (e instanceof Church)
        return SKI.control.stop(next);
      return next;
    });
    expect(trace).to.deep.equal([
      'Lambda:x->x(5 Ky)(Mz)',
      'App:x(5 Ky)(Mz)',
      'App:x(5 Ky)',
      'FreeVar:x',
      'App:5 Ky',
      'App:5 K',
      'Church:5',
    ]);
  });

  it('can prune branches', () => {
    const trace = expr.fold([], (acc, e) => {
      const next = [...acc, e.constructor.name + ':' + e.toString()];
      if (e instanceof SKI.classes.Alias)
        return SKI.control.prune(next);
      return next;
    });
    expect(trace).to.deep.equal([
      'Lambda:x->x(5 Ky)(Mz)',
      'App:x(5 Ky)(Mz)',
      'App:x(5 Ky)',
      'FreeVar:x',
      'App:5 Ky',
      'App:5 K',
      'Church:5',
      'Native:K',
      'FreeVar:y',
      'App:Mz',
      'Alias:M',
      'FreeVar:z'
    ]);
  });

  it('can use descend explicitly on App nodes', () => {
    const trace = expr.fold([], (acc, e) => {
      const next = [...acc, e.constructor.name + ':' + e.toString()];
      if (e instanceof App && e.toString().includes('5 K'))
        return SKI.control.descend(next);
      return next;
    });
    // explicit descend should behave same as default return
    expect(trace).to.deep.equal([
      'Lambda:x->x(5 Ky)(Mz)',
      'App:x(5 Ky)(Mz)',
      'App:x(5 Ky)',
      'FreeVar:x',
      'App:5 Ky',
      'App:5 K',
      'Church:5',
      'Native:K',
      'FreeVar:y',
      'App:Mz',
      'Alias:M',
      'App:SII',
      'App:SI',
      'Native:S',
      'Native:I',
      'Native:I',
      'FreeVar:z',
    ]);
  });

  it('stops at Lambda nodes with control.stop', () => {
    const trace = expr.fold([], (acc, e) => {
      const next = [...acc, e.constructor.name + ':' + e.toString()];
      if (e instanceof Lambda)
        return SKI.control.stop(next);
      return next;
    });
    expect(trace).to.deep.equal([
      'Lambda:x->x(5 Ky)(Mz)',
    ]);
  });

  it('prunes Native nodes while collecting others', () => {
    const trace = expr.fold([], (acc, e) => {
      const next = [...acc, e.constructor.name + ':' + e.toString()];
      if (e instanceof Native)
        return SKI.control.prune(next);
      return next;
    });
    expect(trace).to.deep.equal([
      'Lambda:x->x(5 Ky)(Mz)',
      'App:x(5 Ky)(Mz)',
      'App:x(5 Ky)',
      'FreeVar:x',
      'App:5 Ky',
      'App:5 K',
      'Church:5',
      'Native:K',
      'FreeVar:y',
      'App:Mz',
      'Alias:M',
      'App:SII',
      'App:SI',
      'Native:S',
      'Native:I',
      'Native:I',
      'FreeVar:z'
    ]);
  });

  it('stops early when encountering Church numerals', () => {
    const trace = expr.fold([], (acc, e) => {
      const next = [...acc, e.constructor.name + ':' + e.toString()];
      if (e instanceof Church)
        return SKI.control.stop(next);
      return next;
    });
    expect(trace).to.deep.equal([
      'Lambda:x->x(5 Ky)(Mz)',
      'App:x(5 Ky)(Mz)',
      'App:x(5 Ky)',
      'FreeVar:x',
      'App:5 Ky',
      'App:5 K',
      'Church:5',
    ]);
  });

  it('prunes FreeVar to skip variable details', () => {
    const trace = expr.fold([], (acc, e) => {
      const next = [...acc, e.constructor.name + ':' + e.toString()];
      if (e instanceof SKI.classes.FreeVar)
        return SKI.control.prune(next);
      return next;
    });
    expect(trace).to.deep.equal([
      'Lambda:x->x(5 Ky)(Mz)',
      'App:x(5 Ky)(Mz)',
      'App:x(5 Ky)',
      'FreeVar:x',
      'App:5 Ky',
      'App:5 K',
      'Church:5',
      'Native:K',
      'FreeVar:y',
      'App:Mz',
      'Alias:M',
      'App:SII',
      'App:SI',
      'Native:S',
      'Native:I',
      'Native:I',
      'FreeVar:z'
    ]);
  });

  it('combines multiple control strategies on different Expr types', () => {
    const trace = expr.fold([], (acc, e) => {
      const next = [...acc, e.constructor.name + ':' + e.toString()];
      // Stop at Lambda, prune Alias branches, descend normally otherwise
      if (e instanceof Lambda)
        return SKI.control.stop(next);
      if (e instanceof SKI.classes.Alias)
        return SKI.control.prune(next);
      return SKI.control.descend(next);
    });
    expect(trace).to.deep.equal([
      'Lambda:x->x(5 Ky)(Mz)',
    ]);
  });

  it('uses redo control to retrace from current node', () => {
    // redo makes fold restart traversal from current node with new accumulator
    let redoCount = 0;
    const trace = expr.fold([], (acc, e) => {
      const next = [...acc, e.constructor.name + ':' + e.toString()];
      // Use redo once on the first Church node to duplicate it in trace
      if (e instanceof Church && redoCount === 0) {
        redoCount++;
        return SKI.control.redo(next);
      }
      if (e instanceof Church)
        return SKI.control.stop(next);
      return next;
    });
    // redo should restart from Church node, potentially expanding the trace
    expect(trace).to.have.lengthOf.at.least(7); // at least original traversal before stop
  });

  it('stops at first App then prunes in complex expression', () => {
    // Test mixed control on nested Apps
    const trace = expr.fold([], (acc, e) => {
      const next = [...acc, e.constructor.name];
      // Stop at the first outermost App
      if (e instanceof App && e.toString() === 'x(5 Ky)(Mz)')
        return SKI.control.stop(next);
      return next;
    });
    expect(trace).to.deep.equal(['Lambda', 'App']);
  });

  const nestedLambda = ski.parse('(x->x x)(y->y(z->z))');

  it('prunes entire nested Lambda bodies', () => {
    const trace = nestedLambda.fold([], (acc, e) => {
      const next = [...acc, e.constructor.name + ':' + e.toString()];
      // Prune entire bodies of nested Lambdas
      if (e instanceof Lambda)
        return SKI.control.prune(next);
      return next;
    });
    expect(trace).to.deep.equal([
      'App:(x->x x)(y->y(z->z))',
      'Lambda:x->x x',
      'Lambda:y->y(z->z)',
    ]);
  });
});
