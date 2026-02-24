import * as opentype from 'opentype.js';
import * as path from 'path';
import { resolveFont as resolveFontPath, getBundledFont } from '../utils/font-utils';

const fontCache = new Map<string, opentype.Font>();

/**
 * Load a font using opentype.js for accurate glyph measurement.
 */
export function loadFont(
  fontFamily: string,
  bold: boolean = false,
  italic: boolean = false,
  fontDirs: string[] = [],
  fontMap: Record<string, string | Buffer> = {}
): opentype.Font {
  const cacheKey = `${fontFamily}-${bold ? 'B' : ''}-${italic ? 'I' : ''}`;
  const cached = fontCache.get(cacheKey);
  if (cached) return cached;

  const fontSource = resolveFontPath(fontFamily, bold, italic, fontDirs, fontMap);

  let font: opentype.Font;
  if (Buffer.isBuffer(fontSource)) {
    const ab = fontSource.buffer.slice(
      fontSource.byteOffset,
      fontSource.byteOffset + fontSource.byteLength
    ) as ArrayBuffer;
    font = opentype.parse(ab);
  } else {
    font = opentype.loadSync(fontSource as string);
  }

  fontCache.set(cacheKey, font);
  return font;
}

/**
 * Measure the width of a text string in points.
 */
export function measureText(
  text: string,
  fontFamily: string,
  fontSize: number, // in points
  bold: boolean = false,
  italic: boolean = false,
  fontDirs: string[] = [],
  fontMap: Record<string, string | Buffer> = {}
): number {
  try {
    const font = loadFont(fontFamily, bold, italic, fontDirs, fontMap);
    const scale = fontSize / font.unitsPerEm;
    let width = 0;

    for (let i = 0; i < text.length; i++) {
      const glyph = font.charToGlyph(text[i]);
      width += (glyph.advanceWidth || 0) * scale;
    }

    return width;
  } catch {
    // Fallback: rough estimation based on average char width
    return text.length * fontSize * 0.6;
  }
}

/**
 * Get font metrics (ascender, descender, line height) in points.
 */
export function getFontMetrics(
  fontFamily: string,
  fontSize: number,
  bold: boolean = false,
  italic: boolean = false,
  fontDirs: string[] = [],
  fontMap: Record<string, string | Buffer> = {}
): { ascender: number; descender: number; lineHeight: number } {
  try {
    const font = loadFont(fontFamily, bold, italic, fontDirs, fontMap);
    const scale = fontSize / font.unitsPerEm;

    return {
      ascender: font.ascender * scale,
      descender: Math.abs(font.descender * scale),
      lineHeight: (font.ascender - font.descender) * scale,
    };
  } catch {
    return {
      ascender: fontSize * 0.8,
      descender: fontSize * 0.2,
      lineHeight: fontSize * 1.2,
    };
  }
}

/** Clear the font cache */
export function clearFontCache(): void {
  fontCache.clear();
}
