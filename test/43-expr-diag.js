const { expect } = require('chai');
const { SKI } = require('../index');

const ski = new SKI();

describe('Expr.diag: basic expressions', () => {
  it('returns indented representation of a single combinator', () => {
    const expr = ski.parse('S');
    const result = expr.diag();

    expect(result).to.be.a('string');
    expect(result).to.include('S');
    expect(result).to.include('Native');
    expect(result).to.match(/^[^\n]+\n?$/s, 'result should be single line');
  });

  it('returns indented representation of a free variable', () => {
    const expr = ski.parse('x');
    const result = expr.diag();

    expect(result).to.be.a('string');
    expect(result).to.include('FreeVar');
    expect(result).to.include('x');
    expect(result).to.match(/^[^\n]+\n?$/s, 'result should be single line');
  });

  it('returns indented representation of multiple free variables', () => {
    const expr = ski.parse('x y z');
    const result = expr.diag();

    expect(result).to.include('App');
    expect(result).to.include('FreeVar');
    expect(result).to.match(/x.*y.*z/s, 'should show all free variables in order');
  });

  it('distinguishes different free variables with ids', () => {
    const x1 = new SKI.classes.FreeVar('x', 1);
    const x2 = new SKI.classes.FreeVar('x', 2);
    const app = x1.apply(x2);

    const lines = app.diag().split('\n');
    expect(lines.length).to.equal(3);
    expect(lines[0]).to.include('App');
    expect(lines[1]).to.match(/^ {2}FreeVar.*\bx/);
    expect(lines[2]).to.match(/^ {2}FreeVar.*\bx/);
    // lines are different nevertheless
    expect(lines[1]).to.not.equal(lines[2]);
  });
});

describe('Expr.diag: application expressions', () => {
  it('returns indented representation of simple application', () => {
    const expr = ski.parse('S K');
    const result = expr.diag();

    expect(result).to.include('App');
    expect(result).to.include('S');
    expect(result).to.include('K');
  });

  it('indents nested applications', () => {
    const expr = ski.parse('S K I');
    const result = expr.diag();

    const lines = result.split('\n');
    // Should have multiple lines with increasing indentation
    expect(lines.length).to.equal(4); // App, S, K, I

    expect(lines[0]).to.match(/^App/);
    for (let i = 1; i < lines.length; i++)
      expect(lines[i]).to.match(/^ {2}\b.*[SKI]/)
  });

  it('handles deeply nested applications with proper indentation', () => {
    const expr = ski.parse('S(KS)K');
    const result = expr.diag();

    expect(indentCount(result)).to.deep.equal([0, 2, 2, 4, 4, 2]);
  });
});

describe('Expr.diag: lambda expressions', () => {
  it('returns indented representation of lambda expression', () => {
    const expr = ski.parse('x->x');
    const result = expr.diag();

    expect(result).to.include('Lambda');
    expect(result).to.include('FreeVar');
  });

  it('shows lambda argument and its id', () => {
    const expr = ski.parse('x->y->y x');
    const result = expr.diag();

    expect(indentCount(result)).to.deep.equal([0, 2, 4, 6, 6]);
    expect(result).to.match(/Lambda \(\w+\[\d+\]\):/);
    expect(result).to.match(/(x\[\d+\]).*(y\[\d+\]).*\2.*\1/s);
  });

  it('indents lambda body', () => {
    const expr = ski.parse('a->a a');
    const result = expr.diag();

    const lines = result.split('\n');
    // Lambda declaration at root, body indented
    expect(lines[0]).to.include('Lambda');
    expect(lines.length).to.be.greaterThan(1);
  });

  it('handles nested lambdas with multiple levels of indentation', () => {
    const expr = ski.parse('x->y->z->x z (y z)');
    const result = expr.diag();

    expect(indentCount(result)).to.deep.equal([0, 2, 4, 6, 8, 8, 8, 10, 10]);
  });
});

describe('Expr.diag: alias expressions', () => {
  it('returns indented representation of alias', () => {
    const ski2 = new SKI();
    ski2.add('T', 'CI');
    const expr = ski2.parse('T');
    const result = expr.diag();

    expect(result).to.include('Alias');
    expect(result).to.include('T');
  });

  it('indents alias implementation', () => {
    const ski2 = new SKI();
    ski2.add('M', 'SII');
    const expr = ski2.parse('M');
    const result = expr.diag();

    const lines = result.split('\n');
    // Alias name at root, implementation indented
    expect(lines[0]).to.include('Alias');
    expect(lines.length).to.be.greaterThan(1);
  });

  it('shows complete alias structure in application', () => {
    const ski2 = new SKI();
    ski2.add('T', 'CI');
    const expr = ski2.parse('T I');
    const result = expr.diag();

    expect(result).to.include('App');
    expect(result).to.include('Alias');
  });
});

describe('Expr.diag: complex expressions', () => {
  it('returns indented representation of mixed expression', () => {
    const expr = ski.parse('x->S(Kx)I');
    const result = expr.diag();

    expect(result).to.include('Lambda');
    expect(result).to.include('App');
    expect(result).to.include('FreeVar');
  });

  it('handles applications with both combinators and free variables', () => {
    const expr = ski.parse('S(Kx)y');
    const result = expr.diag();

    expect(result).to.include('App');
    expect(result).to.include('S');
    expect(result).to.include('x');
    expect(result).to.include('y');
  });

  it('handles expressions with multiple applications', () => {
    const expr = ski.parse('S K K I');
    const result = expr.diag();

    const lines = result.split('\n');
    // Should have multiple lines showing the structure
    expect(lines.length).to.be.greaterThan(1);
  });

  it('produces consistent output for the same expression', () => {
    const expr = ski.parse('S(KS)K');
    const result1 = expr.diag();
    const result2 = expr.diag();

    expect(result1).to.equal(result2);
  });
});

describe('Expr.diag: formatting details', () => {
  it('returns a string with newline separators', () => {
    const expr = ski.parse('S K');
    const result = expr.diag();

    expect(result).to.be.a('string');
    expect(result).to.include('\n');
  });

  it('uses consistent indentation (2 spaces per level)', () => {
    const expr = ski.parse('S(KI)');
    const result = expr.diag();

    const lines = result.split('\n');
    const indents = lines.map(line => {
      const match = line.match(/^( *)/);
      return match ? match[1].length : 0;
    });

    // All indents should be multiples of 2
    indents.forEach(indent => {
      expect(indent % 2).to.equal(0);
    });
  });

  it('includes constructor names for all nodes', () => {
    const expr = ski.parse('x->S K x');
    const result = expr.diag();

    // Should contain type information
    expect(result).to.match( /^[^:]*\(.*\):|FreeVar:|App:|Lambda|Alias/ );
  });
});

describe('Expr.diag: edge cases', () => {
  it('handles expressions with numbers', () => {
    const expr = ski.parse('5');
    const result = expr.diag();

    expect(result).to.be.a('string');
    expect(result.length).to.be.greaterThan(0);
  });

  it('handles complex nested structures', () => {
    const expr = ski.parse('((x->x)(y->y))(z->z)');
    const result = expr.diag();

    const lines = result.split('\n');
    expect(lines.length).to.be.greaterThan(1);
    expect(result).to.include('Lambda');
    expect(result).to.include('App');
  });

  it('shows FreeVar with id information', () => {
    const expr = ski.parse('x y x');
    const result = expr.diag();

    // FreeVar lines should include the variable name and id
    const freeVarLines = result.split('\n').filter(line => line.includes('FreeVar'));
    freeVarLines.forEach(line => {
      expect(line).to.match(/FreeVar: \w+\[\d+\]/);
    });
  });

  it('shows Lambda with argument id information', () => {
    const expr = ski.parse('x->x');
    const result = expr.diag();

    // Lambda line should include argument name and id
    expect(result).to.match(/Lambda \(\w+\[\d+\]\):/);
  });
});

function indentCount (text) {
  const lines = text.split('\n');
  return lines.map(line => {
    const match = line.match(/^( *)/);
    return match ? match[1].length : 0;
  });
}
