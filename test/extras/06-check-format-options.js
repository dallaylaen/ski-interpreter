'use strict';

const { expect } = require('chai');
const { SKI } = require('../../src/index');

describe('SKI.extras.checkFormatOptions', () => {
  const { checkFormatOptions } = SKI.extras;

  describe('positive cases', () => {
    it('accepts an empty object', () => {
      const res = checkFormatOptions({});
      expect(res).to.deep.equal({ value: {} });
    });

    it('accepts undefined', () => {
      const res = checkFormatOptions(undefined);
      expect(res).to.deep.equal({ value: {} });
    });

    it('accepts some irl cases', () => {
      const res = checkFormatOptions({ lambda: ['(', '->', ')'], around: ['(', ')'], brackets: ['', ''] });
      expect(res).to.deep.equal({ value: { lambda: ['(', '->', ')'], around: ['(', ')'], brackets: ['', ''] } });
    });
  });

  describe('negative cases', () => {
    it('rejects non-object', () => {
      const res = checkFormatOptions('not an object');
      expect(res).to.deep.equal({ error: { object: 'Format options must be an object, not String' } });
    });

    it('rejects unknown fields', () => {
      const res = checkFormatOptions({ foo: 42 });
      expect(res).to.deep.equal({ error: { foo: 'unknown option' } });
    });

    it('catches wrong number of parameters', () => {
      const res = checkFormatOptions({ brackets: ['()'] });
      expect(res).to.deep.equal({ error: { brackets: 'must be a pair of strings' } });
    });
  });
});
