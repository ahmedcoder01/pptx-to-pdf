import { describe, it, expect } from 'vitest';
import { resolveColor } from '../../src/resolver/color-resolver';
import { ThemeColorScheme } from '../../src/types/presentation';

const defaultScheme: ThemeColorScheme = {
  dk1: '000000',
  lt1: 'FFFFFF',
  dk2: '44546A',
  lt2: 'E7E6E6',
  accent1: '4472C4',
  accent2: 'ED7D31',
  accent3: 'A5A5A5',
  accent4: 'FFC000',
  accent5: '5B9BD5',
  accent6: '70AD47',
  hlink: '0563C1',
  folHlink: '954F72',
};

describe('color resolver', () => {
  it('resolves srgb colors', () => {
    const result = resolveColor({ type: 'srgb', hex: 'FF0000' }, defaultScheme);
    expect(result).toEqual({ r: 255, g: 0, b: 0, a: 1 });
  });

  it('resolves srgb colors with alpha', () => {
    const result = resolveColor({ type: 'srgb', hex: 'FF0000', alpha: 50000 }, defaultScheme);
    expect(result).toEqual({ r: 255, g: 0, b: 0, a: 0.5 });
  });

  it('resolves scheme colors', () => {
    const result = resolveColor(
      { type: 'scheme', ref: { scheme: 'accent1' } },
      defaultScheme
    );
    expect(result.r).toBe(68); // 0x44
    expect(result.g).toBe(114); // 0x72
    expect(result.b).toBe(196); // 0xC4
    expect(result.a).toBe(1);
  });

  it('resolves scheme bg1/tx1 aliases', () => {
    const bg1 = resolveColor({ type: 'scheme', ref: { scheme: 'bg1' } }, defaultScheme);
    expect(bg1.r).toBe(255); // lt1 = FFFFFF

    const tx1 = resolveColor({ type: 'scheme', ref: { scheme: 'tx1' } }, defaultScheme);
    expect(tx1.r).toBe(0); // dk1 = 000000
  });

  it('resolves preset colors', () => {
    const result = resolveColor({ type: 'preset', name: 'red' }, defaultScheme);
    expect(result).toEqual({ r: 255, g: 0, b: 0, a: 1 });
  });

  it('returns black for undefined source', () => {
    const result = resolveColor(undefined, defaultScheme);
    expect(result).toEqual({ r: 0, g: 0, b: 0, a: 1 });
  });
});
