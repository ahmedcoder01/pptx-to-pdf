import { describe, it, expect } from 'vitest';
import { resolveFont } from '../../src/resolver/font-resolver';
import { ThemeFontScheme } from '../../src/types/presentation';

describe('font resolver', () => {
  const fontScheme: ThemeFontScheme = {
    majorLatin: 'Calibri Light',
    minorLatin: 'Calibri',
  };

  it('resolves +mj-lt to major Latin font', () => {
    expect(resolveFont('+mj-lt', fontScheme)).toBe('Calibri Light');
  });

  it('resolves +mn-lt to minor Latin font', () => {
    expect(resolveFont('+mn-lt', fontScheme)).toBe('Calibri');
  });

  it('returns concrete font names as-is', () => {
    expect(resolveFont('Arial', fontScheme)).toBe('Arial');
  });

  it('defaults to minor Latin when undefined', () => {
    expect(resolveFont(undefined, fontScheme)).toBe('Calibri');
  });
});
