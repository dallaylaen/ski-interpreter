const { expect } = require('chai');
const { SKI } = require('../index');

describe( 'SKI', () => {
  it('can declare terms', done => {
    const ski = new SKI;
    ski.add('T', 'S(K(SI))K');

    const term = ski.parseLine('T x y');

    const result = term.run();

    expect( ''+result.expr).to.equal('y(x)');

    // console.log(ski.list());

    done();
  });

  it('does not overwrite read-only data', done => {
    const ski = new SKI;

    const note = SKI.S.note;
    expect(typeof note).to.equal('string', 'note is a string');
    expect(note.replace(/&rarr;|&mapsto;/gi, '->').replace(/<[^>]+>/g, ''))
      .to.match(/([a-z]) *-> *([a-z]) *-> *([a-z]) *-> *\1 \3 *\(\2 \3\)/);

    ski.add('sub', 'S', 'just an alias');

    const known = ski.getTerms();

    expect (known.S.note).to.equal(note);
    expect (known.sub.note).to.equal('just an alias');

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
    expect( ''+canonic ).to.match(/^[SKI()]+\(x\)\(y\)$/);

    const result = expr.run( 10000).expr;
    expect( (''+result).replace(/[() ]/g, '') )
      .to.equal('x'.repeat(16)+'y');

    const alt = canonic.run(10000).expr;
    expect(''+alt).to.equal(''+result);

    done();
  });

  it ('can add aliases', () => {
    const ski = new SKI();
    const alias = ski.parse('T = S(K(SI))K');
    expect(alias).to.be.instanceof(SKI.classes.Alias);
    ski.add(alias);
    const jar = {};
    const expr = ski.parse('T x y', jar).run().expr;
    expr.expect( ski.parse('y x', jar));
  });

  it ('can auto-annotate proper terms', () => {
    const ski = new SKI({annotate: true});
    ski.add('v3', 'BBBC(BC(CI))');
    expect(ski.getTerms().v3.note.replace(/\s*(&rarr;|&mapsto;)\s*/gi, '->').replace(/<[^>]+>/g, ''))
      .to.equal('a->b->c->d->d a b c');
  });

});
