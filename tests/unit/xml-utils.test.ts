import { describe, it, expect } from 'vitest';
import { attr, numAttr, boolAttr, ensureArray, child, children, textContent } from '../../src/utils/xml-utils';

describe('XML utilities', () => {
  describe('attr', () => {
    it('gets attribute with @_ prefix', () => {
      expect(attr({ '@_val': 'hello' }, 'val')).toBe('hello');
    });

    it('returns undefined for missing attributes', () => {
      expect(attr({}, 'val')).toBeUndefined();
      expect(attr(null, 'val')).toBeUndefined();
    });
  });

  describe('numAttr', () => {
    it('parses numeric attributes', () => {
      expect(numAttr({ '@_cx': '9144000' }, 'cx')).toBe(9144000);
    });

    it('returns undefined for non-numeric', () => {
      expect(numAttr({ '@_val': 'abc' }, 'val')).toBeUndefined();
    });
  });

  describe('boolAttr', () => {
    it('parses boolean attributes', () => {
      expect(boolAttr({ '@_flipH': '1' }, 'flipH')).toBe(true);
      expect(boolAttr({ '@_flipH': 'true' }, 'flipH')).toBe(true);
      expect(boolAttr({ '@_flipH': '0' }, 'flipH')).toBe(false);
    });
  });

  describe('ensureArray', () => {
    it('wraps a single value in an array', () => {
      expect(ensureArray({ id: 1 })).toEqual([{ id: 1 }]);
    });

    it('returns arrays as-is', () => {
      expect(ensureArray([1, 2])).toEqual([1, 2]);
    });

    it('returns empty array for undefined', () => {
      expect(ensureArray(undefined)).toEqual([]);
    });
  });

  describe('child', () => {
    it('finds child by local name', () => {
      const node = { 'xfrm': { '@_rot': '5400000' } };
      expect(child(node, 'xfrm')).toEqual({ '@_rot': '5400000' });
    });

    it('finds child with namespace prefix', () => {
      const node = { 'a:xfrm': { '@_rot': '5400000' } };
      expect(child(node, 'xfrm')).toEqual({ '@_rot': '5400000' });
    });
  });

  describe('textContent', () => {
    it('extracts text from string', () => {
      expect(textContent('hello')).toBe('hello');
    });

    it('extracts text from #text property', () => {
      expect(textContent({ '#text': 'hello' })).toBe('hello');
    });

    it('returns empty string for undefined', () => {
      expect(textContent(undefined)).toBe('');
    });
  });
});
