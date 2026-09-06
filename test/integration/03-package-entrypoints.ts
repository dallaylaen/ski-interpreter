/**
 * @desc Verifies that every entry point declared in package.json (main, module,
 *       exports, bin) actually points to a file present in the repository/build
 *       output. This is meant to catch cases where the build was not run, or
 *       package.json was updated without regenerating/renaming the built files.
 */

import { expect } from 'chai';
import * as fs from 'node:fs';
import * as path from 'node:path';

const root = path.resolve(__dirname, '../../');
const pkg: Record<string, unknown> = JSON.parse(
  fs.readFileSync(path.join(root, 'package.json'), 'utf8'),
);

describe('package.json entry points', () => {
  it('main points to an existing file', () => {
    checkEntry('main', pkg.main);
  });

  it('module points to an existing file', () => {
    checkEntry('module', pkg.module);
  });

  describe('exports', () => {
    const exp = pkg.exports as Record<string, unknown> | undefined;
    expect(exp, 'package.json has an exports field').to.be.an('object');

    for (const [condition, target] of Object.entries(exp!)) {
      it(`"${condition}" condition points to existing file(s)`, () => {
        checkExportTarget(condition, target);
      });
    }
  });

  describe('bin', () => {
    const bin = pkg.bin as Record<string, string> | undefined;
    expect(bin, 'package.json has a bin field').to.be.an('object');

    for (const [name, target] of Object.entries(bin!)) {
      it(`"${name}" points to an existing, executable file`, () => {
        const full = checkEntry(`bin.${name}`, target);
        const mode = fs.statSync(full).mode;
        expect(mode & 0o111, `${target} should be executable`).to.not.equal(0);
      });
    }
  });
});

// -- Utility functions --

/**
 * Asserts that `value` is a string pointing to an existing file relative to
 * the repository root, and returns the resolved absolute path.
 */
function checkEntry (label: string, value: unknown): string {
  expect(typeof value, `${label} is a string`).to.equal('string');
  const full = path.join(root, value as string);
  expect(fs.existsSync(full), `${label} (${value}) exists on disk`).to.equal(true);
  expect(fs.statSync(full).isFile(), `${label} (${value}) is a file`).to.equal(true);
  return full;
}

/**
 * "exports" entries may be a plain string, or contain a wildcard ("*"),
 * or be a nested object of sub-conditions (e.g. "types/*").
 * Wildcards can't be checked directly, so we just verify the containing
 * directory exists.
 */
function checkExportTarget (label: string, target: unknown): void {
  if (typeof target === 'string') {
    if (target.includes('*')) {
      const dir = path.join(root, path.dirname(target));
      expect(fs.existsSync(dir), `${label} target directory (${dir}) exists`).to.equal(true);
    } else
      checkEntry(label, target);

    return;
  }

  if (target && typeof target === 'object') {
    for (const [subCondition, subTarget] of Object.entries(target as Record<string, unknown>))
      checkExportTarget(`${label}.${subCondition}`, subTarget);
    return;
  }

  throw new Error(`Unexpected exports value for "${label}": ${JSON.stringify(target)}`);
}
