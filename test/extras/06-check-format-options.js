'use strict';

const { expect } = require('chai');
const { SKI } = require('../../src/index');

describe('SKI.extras.checkFormatOptions', () => {
  const { checkFormatOptions } = SKI.extras;
  const ski = new SKI();

  describe('valid inputs', () => {
    it('accepts an empty object', () => {
      const res = checkFormatOptions({});
      expect(res).to.deep.equal({ ok: true, format: {} });
    });

    it('accepts all boolean fields', () => {
      const res = checkFormatOptions({ terse: true, html: false });
      expect(res.ok).to.equal(true);
      expect(res.format).to.deep.equal({ terse: true, html: false });
    });

    it('accepts a string space field', () => {
      const res = checkFormatOptions({ space: ' ' });
      expect(res.ok).to.equal(true);
      expect(res.format.space).to.equal(' ');
    });

    it('accepts valid string-pair fields', () => {
      const opts = { brackets: ['(', ')'], var: ['<b>', '</b>'], around: ['[', ']'], redex: ['{', '}'] };
      const res = checkFormatOptions(opts);
      expect(res.ok).to.equal(true);
      expect(res.format).to.deep.equal(opts);
    });

    it('accepts a valid lambda triple', () => {
      const res = checkFormatOptions({ lambda: ['\\', '.', ''] });
      expect(res.ok).to.equal(true);
      expect(res.format.lambda).to.deep.equal(['\\', '.', '']);
    });

    it('accepts an inventory of Expr values', () => {
      const S = SKI.S;
      const K = SKI.K;
      const res = checkFormatOptions({ inventory: { S, K } });
      expect(res.ok).to.equal(true);
      expect(res.format.inventory).to.deep.equal({ S, K });
    });

    it('returns the same object reference in format on success', () => {
      const opts = { terse: true };
      const res = checkFormatOptions(opts);
      expect(res.ok).to.equal(true);
      expect(res.format).to.equal(opts);
    });

    it('the returned format can be passed directly to expr.format()', () => {
      const expr = ski.parse('S K I');
      const res = checkFormatOptions({ terse: true });
      expect(res.ok).to.equal(true);
      expect(() => expr.format(res.format)).to.not.throw();
    });
  });

  describe('invalid inputs — top-level type', () => {
    it('rejects null',      () => expect(checkFormatOptions(null)).to.deep.equal({ ok: false }));
    it('rejects a string',  () => expect(checkFormatOptions('terse')).to.deep.equal({ ok: false }));
    it('rejects a number',  () => expect(checkFormatOptions(42)).to.deep.equal({ ok: false }));
    it('rejects an array',  () => expect(checkFormatOptions([])).to.deep.equal({ ok: false }));
    it('rejects undefined', () => expect(checkFormatOptions(undefined)).to.deep.equal({ ok: false }));
  });

  describe('invalid inputs — wrong field types', () => {
    it('rejects terse: 1',        () => expect(checkFormatOptions({ terse: 1 }).ok).to.equal(false));
    it('rejects html: "yes"',     () => expect(checkFormatOptions({ html: 'yes' }).ok).to.equal(false));
    it('rejects space: true',     () => expect(checkFormatOptions({ space: true }).ok).to.equal(false));
    it('rejects brackets: ["("]', () => expect(checkFormatOptions({ brackets: ['('] }).ok).to.equal(false));
    it('rejects brackets: "()"',  () => expect(checkFormatOptions({ brackets: '()' }).ok).to.equal(false));
    it('rejects var: [1, 2]',     () => expect(checkFormatOptions({ var: [1, 2] }).ok).to.equal(false));
    it('rejects lambda: ["a","b"]', () => expect(checkFormatOptions({ lambda: ['a', 'b'] }).ok).to.equal(false));
    it('rejects lambda: ["a","b","c","d"]', () => expect(checkFormatOptions({ lambda: ['a', 'b', 'c', 'd'] }).ok).to.equal(false));
    it('rejects around: null',    () => expect(checkFormatOptions({ around: null }).ok).to.equal(false));
    it('rejects redex: {}',       () => expect(checkFormatOptions({ redex: {} }).ok).to.equal(false));
  });

  describe('invalid inputs — inventory', () => {
    it('rejects inventory: null',                     () => expect(checkFormatOptions({ inventory: null }).ok).to.equal(false));
    it('rejects inventory: []',                       () => expect(checkFormatOptions({ inventory: [] }).ok).to.equal(false));
    it('rejects inventory with a non-Expr value',     () => expect(checkFormatOptions({ inventory: { x: 'S' } }).ok).to.equal(false));
    it('rejects inventory with a mixed value',        () => expect(checkFormatOptions({ inventory: { S: SKI.S, x: 42 } }).ok).to.equal(false));
  });
});
