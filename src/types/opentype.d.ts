declare module 'opentype.js' {
  export interface Font {
    unitsPerEm: number;
    ascender: number;
    descender: number;
    charToGlyph(char: string): Glyph;
  }

  export interface Glyph {
    advanceWidth: number;
    name: string;
  }

  export function parse(buffer: ArrayBuffer): Font;
  export function loadSync(path: string): Font;
}
