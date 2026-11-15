import { expect } from 'chai';
import { spawnSync, SpawnSyncReturns } from 'node:child_process';
import * as path from 'node:path';

import { SKI } from '../../src/';

// Some cli utilities
const CLI = path.resolve(__dirname, '../../bin/ski.js');

type CliResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
}

const ski = new SKI();

describe('ski CLI', () => {
  describe('eval', () => {
    it('evaluates a simple expression exactly', () => {
      const { stdout, stderr, exitCode } = cli(['eval', '-q', 'CI x y']);
      expect(stderr).to.equal('');
      expect(stdout).to.equal('y x\n');
      expect(exitCode).to.equal(0);
    });

    it('evaluates a simple expression, verbosely', () => {
      const { stderr, stdout, exitCode } = cli(['eval', '-v', 'SKKx']);
      expect(exitCode).to.equal(0);
      expect(stderr).to.equal('');
      const lines = stdout.split(/\r?\n/);
      expect(lines.length).to.equal(5, 'output:\n----\n' + stdout + '\n----');
      expect(lines[0]).to.equal('SKKx;');
      expect(lines[1]).to.equal('Kx(Kx);');
      expect(lines[2]).to.match(/^\/\/ *2 +steps?.*\d+m?s/);
      expect(lines[3]).to.equal('x');
      expect(lines[4]).to.equal('', 'newline at end of output');

      backParse(stdout, 'x', 'eval output should be parseable');
    });

    it('reads expression from stdin with -', () => {
      const { stdout, exitCode } = cli(['eval', '-'], 'SKK x');
      expect(exitCode).to.equal(0);
      expect(stdout).to.include('x');
    });

    it('produces an error for invalid expressions', () => {
      const { exitCode, stderr } = cli(['eval', '((']);
      expect(exitCode).to.equal(1);
      expect(stderr).to.match(/Error/i);
    });
  });

  describe('compare', () => {
    it('exits 0 for equivalent expressions', () => {
      const { exitCode, stdout } = cli(['compare', 'SKK', 'I']);
      expect(exitCode).to.equal(0);
      expect(stdout).to.match(/equivalent/i);
    });

    it('exits 1 for non-equivalent expressions', () => {
      const { exitCode } = cli(['compare', 'K', 'I']);
      expect(exitCode).to.equal(1);
    });
  });

  describe('search', () => {
    it('produces plausible search results', () => {
      const { exitCode, stdout } = cli(['search', '-v', '-t', 'B', 'S', 'K']);
      expect(stdout).to.match(/^B *= */m, 'output is a definition');
      const expr = ski.parse(stdout);
      const { a, b, c } = SKI.vars();
      a.apply(b.apply(c)).expect(expr.run(a, b, c).expr);
      expect(exitCode).to.equal(0);
    });
  });

  describe('error handling', () => {
    it('exits 2 and prints help on unknown subcommand', () => {
      const { exitCode, stderr, stdout } = cli(['no-such-command']);
      expect(stderr + stdout).to.match(/Usage/i);
      expect(exitCode).to.be.greaterThan(0);
    });

    it('rejects non-integer --max', () => {
      const { exitCode, stderr } = cli(['--max', 'abc', 'eval', 'SKK']);
      expect(exitCode).to.be.greaterThan(0);
      expect(stderr).to.include('--max');
    });
  });
});

// -- Utility functions --

function cli (args: string[], input?: string): CliResult {
  const result: SpawnSyncReturns<Buffer> = spawnSync(
    process.execPath,
    ['--stack-size=20600', CLI, ...args],
    {
      input,
      timeout: 1_000,
    }
  );

  return {
    stdout:   result.stdout?.toString('utf8') ?? '',
    stderr:   result.stderr?.toString('utf8') ?? '',
    exitCode: result.status ?? -1,
  };
}

function backParse (got: string, expected: string, message?: string): void {
  ski.parse(expected).expect(ski.parse(got), message);
}
