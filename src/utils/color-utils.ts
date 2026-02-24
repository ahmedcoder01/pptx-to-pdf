import { RGBColor, HSLColor } from '../types/color';

export function hexToRgb(hex: string): RGBColor {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (c: number) =>
    Math.round(Math.max(0, Math.min(255, c)))
      .toString(16)
      .padStart(2, '0');
  return `${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function rgbToHsl(rgb: RGBColor): HSLColor {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) {
    return { h: 0, s: 0, l };
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h: number;
  if (max === r) {
    h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  } else if (max === g) {
    h = ((b - r) / d + 2) / 6;
  } else {
    h = ((r - g) / d + 4) / 6;
  }

  return { h: h * 360, s, l };
}

export function hslToRgb(hsl: HSLColor): RGBColor {
  const { h, s, l } = hsl;

  if (s === 0) {
    const val = Math.round(l * 255);
    return { r: val, g: val, b: val };
  }

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hNorm = h / 360;

  return {
    r: Math.round(hue2rgb(p, q, hNorm + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, hNorm) * 255),
    b: Math.round(hue2rgb(p, q, hNorm - 1 / 3) * 255),
  };
}

/** Apply luminance modulation (lumMod) — OOXML percentage (e.g. 75000 = 75%) */
export function applyLumMod(hsl: HSLColor, lumMod: number): HSLColor {
  return { ...hsl, l: hsl.l * (lumMod / 100000) };
}

/** Apply luminance offset (lumOff) — OOXML percentage */
export function applyLumOff(hsl: HSLColor, lumOff: number): HSLColor {
  return { ...hsl, l: Math.min(1, Math.max(0, hsl.l + lumOff / 100000)) };
}

/** Apply tint: move luminance toward white */
export function applyTint(hsl: HSLColor, tint: number): HSLColor {
  const t = tint / 100000;
  return { ...hsl, l: hsl.l * (1 - t) + t };
}

/** Apply shade: move luminance toward black */
export function applyShade(hsl: HSLColor, shade: number): HSLColor {
  const s = shade / 100000;
  return { ...hsl, l: hsl.l * s };
}

/** Apply saturation modulation */
export function applySatMod(hsl: HSLColor, satMod: number): HSLColor {
  return { ...hsl, s: Math.min(1, hsl.s * (satMod / 100000)) };
}

/** Apply saturation offset */
export function applySatOff(hsl: HSLColor, satOff: number): HSLColor {
  return { ...hsl, s: Math.min(1, Math.max(0, hsl.s + satOff / 100000)) };
}

/** Clamp a value to [min, max] */
export function clampColor(val: number): number {
  return Math.max(0, Math.min(255, Math.round(val)));
}

/** Well-known preset colors (subset) */
export const PRESET_COLORS: Record<string, string> = {
  black: '000000',
  white: 'FFFFFF',
  red: 'FF0000',
  green: '008000',
  blue: '0000FF',
  yellow: 'FFFF00',
  cyan: '00FFFF',
  magenta: 'FF00FF',
  silver: 'C0C0C0',
  gray: '808080',
  maroon: '800000',
  olive: '808000',
  lime: '00FF00',
  aqua: '00FFFF',
  teal: '008080',
  navy: '000080',
  purple: '800080',
  fuchsia: 'FF00FF',
  orange: 'FFA500',
  darkRed: '8B0000',
  darkGreen: '006400',
  darkBlue: '00008B',
  lightGray: 'D3D3D3',
  darkGray: 'A9A9A9',
};
