export interface RGBColor {
  r: number; // 0-255
  g: number;
  b: number;
}

export interface HSLColor {
  h: number; // 0-360
  s: number; // 0-1
  l: number; // 0-1
}

export interface ThemeColorRef {
  scheme: string; // e.g. 'dk1', 'lt1', 'accent1'
  lumMod?: number; // percentage (e.g. 75000 = 75%)
  lumOff?: number;
  tint?: number;
  shade?: number;
  satMod?: number;
  satOff?: number;
  alpha?: number; // 0-100000 (percentage * 1000)
}

export interface ResolvedColor {
  r: number;
  g: number;
  b: number;
  a: number; // 0-1
}

export interface GradientStop {
  position: number; // 0-100000
  color: ResolvedColor;
}

export type ColorSource =
  | { type: 'srgb'; hex: string; alpha?: number }
  | { type: 'scheme'; ref: ThemeColorRef }
  | { type: 'preset'; name: string; alpha?: number };
