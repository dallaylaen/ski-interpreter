'use strict';

const { expect } = require('chai');
const { SKI } = require('../index');

const { Lambda, App, Church } = SKI.classes;

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
});
