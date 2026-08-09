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

    it('evaluates a simple expression', () => {
      const { stdout, exitCode } = cli(['eval', 'CI x y']);
      expect(exitCode).to.equal(0);
      expect(stdout).to.match(/y x/);
      backParse(stdout, 'y x', 'eval output should be parseable');
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
