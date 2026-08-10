import { expect } from 'chai';
import { SKI } from '../../../src';

describe('Edge cases', () => {
  for (const src of ['', '/* */', '()', '(())', 'S()', 'S(())', '()S', '(())S', 'x->', 'x->()']) {
    it('should not allow empty expressions list "' + src + '"', () => {
      const ski = new SKI();
      expect(() => ski.parse(src)).to.throw(/empty expression/);
    });
  }
});
