const {expect} = require('chai');
const {SKI} = require('../index');

describe( 'SKI.parse', () => {
  it ('handles comments, definitions, and stuff', done => {
    const ski = new SKI ({allow: 'SKI'});
    const vars = {};
    const expr = ski.parse(`
      // this is a comment
      dbl = S (S(KS)K) K;;;;
      dbl dbl dbl
    `, vars);
    expect( expr.run(SKI.S).expr.toString() ).to.equal(expr.run().expr.toString());

    // verify that no aliased terms were created within ski itself
    for (const x of Object.values(ski.getTerms()))
      expect (x).to.be.instanceof(SKI.classes.Native);

    expect(vars).to.deep.equal({});

    done();
  });

  it ('handles comment at definitions end', () => {
    const ski = new SKI();
    const expr = ski.parse('S // just an S combinator');
    expr.expect(SKI.S);
  });

  it ('makes last expr an alias if = given', done => {
    const ski = new SKI();
    const expr = ski.parse('foo = SKK');
    const [x] = SKI.free('x');

    expect( expr.name ).to.equal ("foo");
    expect( expr.run(x).expr).to.equal(x);

    done();
  });

  it ('does not leak intermediate terms', done => {
    const ski = new SKI;
    const [x] = SKI.free('x');
    const jar = { x };
    const intact = { ... jar };
    // console.log(jar);

    const expr = ski.parse('y = SK; z=KI; K', jar);

    expect(jar).to.deep.equal(intact);

    done();
  });

  it('lets local variables trump the global ones', () => {
    const ski = new SKI();

    // setup some vars in the interpreter itself
    ski.add('V', 'BC(CI)'); // x->y->z->z x y'
    const [x, y] = SKI.free('x', 'y');
    ski.add('pair', ski.getTerms().V.apply(x, y));
    ski.add('which', SKI.K);

    // self-test
    ski.parse('pair which').run().expr.expect(x);

    // now override a var
    ski.parse('which = KI; pair which').run().expr.expect(y);
  });

  it('does not allow to define something twice', done => {
    const ski = new SKI();
    expect( () => ski.parse('false = SK; false = KI')).to.throw(/redefine/);

    done();
  });

  it('can co-parseLine terms with same free vars', done => {
    const ski = new SKI;
    const jar = {};
    const xy = ski.parse('x(y)', jar);
    const yx = ski.parse('y(x)', jar);
    const cake = xy.apply(yx);

    expect(cake.equals(ski.parse('x y (y x)', jar))).to.equal(true);
    expect(cake.equals(ski.parse('x y (y x)', {}))).to.equal(false);

    done();
  });

  it('does not display intermediate terms unless added', done => {
    const ski = new SKI;

    // use small letters as we'll make BCKW available by default
    const expr = ski.parse('b = S(KS)K; w = SS(KI); bw = b w');

    expect( expr instanceof SKI.classes.Alias).to.equal(true, 'returns an alias');

    expect(''+expr.impl).to.match(/^[SKI()]*$/, "no traces of b() and w()");

    // just check the expr to work
    expect(expr.run(...SKI.free('x', 'y', 'z')).expr.toString()
      ).to.equal('x y z z');

    done();
  });
});
