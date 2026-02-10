const { expect } = require('chai');
const { SKI } = require('../index');

describe( 'SKI', () => {
  it('can declare terms', done => {
    const ski = new SKI();
    ski.add('T', 'S(K(SI))K');

    const term = ski.parseLine('T x y');

    const result = term.run();

    expect( '' + result.expr).to.equal('y x');

    // console.log(ski.list());

    done();
  });

  it('does not overwrite read-only data', done => {
    const ski = new SKI();

    const note = SKI.S.note;
    expect(typeof note).to.equal('string', 'note is a string');
    expect(note.replace(/&rarr;|&mapsto;/gi, '->').replace(/<[^>]+>/g, ''))
      .to.match(/([a-z]) *-> *([a-z]) *-> *([a-z]) *-> *\1 \3 *\(\2 \3\)/);

    ski.add('sub', 'S', 'just an alias');

    const known = ski.getTerms();

    expect(known.S.note).to.equal(note);
    expect(known.sub.note).to.equal('just an alias');

    let expr = known.sub;
    expect( expr ).to.be.instanceof( SKI.classes.Alias );
    expr = expr.expand();
    expect( expr  ).to.be.instanceof( SKI.classes.Native );

    done();
  });

  it('can perform some complex computations, correctly', done => {
    const ski = new SKI();
    ski.add('inc', ski.parse('S(S(K(S))(K))'));
    ski.add('n2', 'inc I');
    const expr = ski.parseLine('n2 n2 n2 x y');

    const canonic = expr.expand();
    expect( canonic.format({ terse: false }) ).to.match(/^[SKI()]+\(x\)\(y\)$/);

    const result = expr.run( 10000).expr;
    expect( ('' + result).replace(/[() ]/g, '') )
      .to.equal('x'.repeat(16) + 'y');

    const alt = canonic.run(10000).expr;
    expect('' + alt).to.equal('' + result);

    done();
  });

  it('can add aliases', () => {
    const ski = new SKI();
    const alias = ski.parse('T = S(K(SI))K');
    expect(alias).to.be.instanceof(SKI.classes.Alias);
    ski.add(alias);
    const expr = ski.parse('T x y').run().expr;
    expr.expect( ski.parse('y x'));
  });

  it('can auto-annotate proper terms', () => {
    const ski = new SKI({ annotate: true });
    ski.add('v3', 'BBBC(BC(CI))');
    expect(ski.getTerms().v3.note.replace(/\s*(&rarr;|&mapsto;)\s*/gi, '->').replace(/<[^>]+>/g, ''))
      .to.equal('a->b->c->d->d a b c');
  });

  it('delays proper term computation', () => {
    const ski = new SKI();
    ski.add('T', 'CI');

    const hang = ski.parse('Tx');
    const y = ski.parse('y');
    const x = ski.parse('x');

    const run1 = hang.run();
    expect(run1.expr.toString()).to.match(/^T *x$/);
    expect(run1.steps).to.equal(0);

    const run2 = hang.run(y);
    expect(run2.expr.toString()).to.match(/^y  *x/);
    expect(run2.steps).to.be.greaterThanOrEqual(1);

    const T = ski.getTerms().T;
    expect(T.step().expr.toString()).to.equal('T');
    expect(T.apply(x).step().expr.toString()).to.equal('Tx');
    expect(T.apply(x, y).step().expr.toString()).to.equal('CIx y');
  });

  it('honors alias arity if added via one-arg form', () => {
    const ski = new SKI();
    const alias = ski.parse('T=CI');
    ski.add(alias);

    const y = ski.parse('y');
    const x = ski.parse('x');

    const T = ski.getTerms().T;
    expect(T.step().expr.toString()).to.equal('T');
    expect(T.apply(x).step().expr.toString()).to.equal('Tx');
    expect(T.apply(x, y).step().expr.toString()).to.equal('CIx y');
  });

  it('can declare native terms', () => {
    const ski = new SKI();
    ski.add('T', a => b => b.apply(a));
    ski.add('S', a => b => c => a.apply(c, b.apply(c)));

    expect(ski.parse('T x y').run().expr.toString()).to.equal('y x');
    expect(ski.parse('S T x y').run().expr.toString()).to.equal('x y y');
  })

  it('can handle self-referential terms', () => {
    const ski = new SKI();
    ski.add('Y', function (f) { return f.apply(this.apply(f)); });

    const expr = ski.parse('Y f');
    const walk = expr.walk();
    for (let i = 0; i < 5; i++)
      ski.parse(i + ' f (Y f)').step().expr.expect(walk.next().value.expr);
  });
});
