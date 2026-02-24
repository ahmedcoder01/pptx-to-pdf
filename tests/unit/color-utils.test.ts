import { describe, it, expect } from 'vitest';
import { hexToRgb, rgbToHsl, hslToRgb, applyLumMod, applyLumOff, applyTint, applyShade } from '../../src/utils/color-utils';

describe('color utilities', () => {
  it('converts hex to RGB', () => {
    expect(hexToRgb('FF0000')).toEqual({ r: 255, g: 0, b: 0 });
    expect(hexToRgb('00FF00')).toEqual({ r: 0, g: 255, b: 0 });
    expect(hexToRgb('000000')).toEqual({ r: 0, g: 0, b: 0 });
    expect(hexToRgb('FFFFFF')).toEqual({ r: 255, g: 255, b: 255 });
  });

  it('converts RGB to HSL and back', () => {
    const red = { r: 255, g: 0, b: 0 };
    const hsl = rgbToHsl(red);
    expect(hsl.h).toBe(0);
    expect(hsl.s).toBeCloseTo(1, 1);
    expect(hsl.l).toBeCloseTo(0.5, 1);

    const back = hslToRgb(hsl);
    expect(back.r).toBe(255);
    expect(back.g).toBe(0);
    expect(back.b).toBe(0);
  });

  it('handles grayscale in HSL', () => {
    const gray = { r: 128, g: 128, b: 128 };
    const hsl = rgbToHsl(gray);
    expect(hsl.s).toBe(0);

    const back = hslToRgb(hsl);
    expect(back.r).toBe(128);
    expect(back.g).toBe(128);
    expect(back.b).toBe(128);
  });

  it('applies luminance modulation', () => {
    const hsl = { h: 0, s: 1, l: 0.5 };
    const result = applyLumMod(hsl, 75000); // 75%
    expect(result.l).toBeCloseTo(0.375, 3);
  });

  it('applies luminance offset', () => {
    const hsl = { h: 0, s: 1, l: 0.5 };
    const result = applyLumOff(hsl, 25000); // +25%
    expect(result.l).toBeCloseTo(0.75, 3);
  });

  it('applies tint (toward white)', () => {
    const hsl = { h: 0, s: 1, l: 0.5 };
    const result = applyTint(hsl, 50000); // 50% tint
    expect(result.l).toBeCloseTo(0.75, 3);
  });

  it('applies shade (toward black)', () => {
    const hsl = { h: 0, s: 1, l: 0.5 };
    const result = applyShade(hsl, 50000); // 50% shade
    expect(result.l).toBeCloseTo(0.25, 3);
  });
});
