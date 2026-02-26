import * as path from 'path';
import * as fs from 'fs';
import { LIBERATION_SANS_REGULAR } from '../fonts/liberation-sans-regular';

const FONTS_DIR = path.join(__dirname, '..', '..', 'fonts');

/** Map of canonical font names to Liberation equivalents */
const FONT_FALLBACK_MAP: Record<string, string> = {
  'arial': 'LiberationSans',
  'helvetica': 'LiberationSans',
  'calibri': 'LiberationSans',
  'segoe ui': 'LiberationSans',
  'trebuchet ms': 'LiberationSans',
  'verdana': 'LiberationSans',
  'tahoma': 'LiberationSans',
  'times new roman': 'LiberationSerif',
  'cambria': 'LiberationSerif',
  'georgia': 'LiberationSerif',
  'book antiqua': 'LiberationSerif',
  'palatino': 'LiberationSerif',
  'courier new': 'LiberationMono',
  'consolas': 'LiberationMono',
  'lucida console': 'LiberationMono',
};

const LIBERATION_VARIANTS: Record<string, Record<string, string>> = {
  LiberationSans: {
    regular: 'LiberationSans-Regular.ttf',
    bold: 'LiberationSans-Bold.ttf',
    italic: 'LiberationSans-Italic.ttf',
    boldItalic: 'LiberationSans-BoldItalic.ttf',
  },
  LiberationSerif: {
    regular: 'LiberationSerif-Regular.ttf',
    bold: 'LiberationSerif-Bold.ttf',
    italic: 'LiberationSerif-Italic.ttf',
    boldItalic: 'LiberationSerif-BoldItalic.ttf',
  },
  LiberationMono: {
    regular: 'LiberationMono-Regular.ttf',
    bold: 'LiberationMono-Bold.ttf',
    italic: 'LiberationMono-Italic.ttf',
    boldItalic: 'LiberationMono-BoldItalic.ttf',
  },
};

export interface FontDescriptor {
  family: string;
  path: string;
  bold: boolean;
  italic: boolean;
}

/**
 * Resolve a font family name + style to a concrete TTF path.
 * Searches: custom fontMap → custom fontDirs → system fonts → bundled Liberation fonts.
 */
export function resolveFont(
  family: string,
  bold: boolean = false,
  italic: boolean = false,
  fontDirs: string[] = [],
  fontMap: Record<string, string | Buffer> = {}
): string | Buffer {
  // 1. Check fontMap (direct mapping)
  const mapKey = buildFontKey(family, bold, italic);
  if (fontMap[mapKey]) return fontMap[mapKey];
  if (fontMap[family]) return fontMap[family];

  // 2. Check custom font directories
  for (const dir of fontDirs) {
    const found = findFontInDir(dir, family, bold, italic);
    if (found) return found;
  }

  // 3. Check system font directories
  const systemDirs = getSystemFontDirs();
  for (const dir of systemDirs) {
    const found = findFontInDir(dir, family, bold, italic);
    if (found) return found;
  }

  // 4. Fall back to bundled Liberation fonts
  return getBundledFont(family, bold, italic);
}

function buildFontKey(family: string, bold: boolean, italic: boolean): string {
  let key = family;
  if (bold) key += '-Bold';
  if (italic) key += '-Italic';
  return key;
}

function findFontInDir(dir: string, family: string, bold: boolean, italic: boolean): string | undefined {
  if (!fs.existsSync(dir)) return undefined;

  const variant = bold && italic ? 'BoldItalic' : bold ? 'Bold' : italic ? 'Italic' : 'Regular';
  const patterns = [
    `${family}-${variant}.ttf`,
    `${family}-${variant}.otf`,
    `${family}${variant}.ttf`,
    `${family}${variant}.otf`,
  ];

  for (const pattern of patterns) {
    const filePath = path.join(dir, pattern);
    if (fs.existsSync(filePath)) return filePath;
  }

  return undefined;
}

export function getBundledFont(family: string, bold: boolean = false, italic: boolean = false): string | Buffer {
  const normalized = family.toLowerCase().trim();
  const libFamily = FONT_FALLBACK_MAP[normalized] || 'LiberationSans';
  const variants = LIBERATION_VARIANTS[libFamily] || LIBERATION_VARIANTS.LiberationSans;

  const variant = bold && italic ? 'boldItalic' : bold ? 'bold' : italic ? 'italic' : 'regular';
  const fontPath = path.join(FONTS_DIR, variants[variant]);

  // If the font file exists on disk, return the path (normal install)
  if (fs.existsSync(fontPath)) return fontPath;

  // In bundled environments, font files may not exist on disk — fall back to embedded font
  return LIBERATION_SANS_REGULAR;
}

function getSystemFontDirs(): string[] {
  if (process.platform === 'darwin') {
    return [
      '/System/Library/Fonts',
      '/Library/Fonts',
      path.join(process.env.HOME || '', 'Library/Fonts'),
    ];
  } else if (process.platform === 'win32') {
    return [path.join(process.env.WINDIR || 'C:\\Windows', 'Fonts')];
  } else {
    return [
      '/usr/share/fonts',
      '/usr/local/share/fonts',
      path.join(process.env.HOME || '', '.fonts'),
      path.join(process.env.HOME || '', '.local/share/fonts'),
    ];
  }
}
