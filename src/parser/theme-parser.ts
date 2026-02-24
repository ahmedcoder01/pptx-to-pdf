import { parseXml } from './xml-parser';
import { attr, child } from '../utils/xml-utils';
import { Theme, ThemeColorScheme, ThemeFontScheme } from '../types/presentation';

const COLOR_SCHEME_MAP: Record<string, string> = {
  'a:dk1': 'dk1',
  'a:lt1': 'lt1',
  'a:dk2': 'dk2',
  'a:lt2': 'lt2',
  'a:accent1': 'accent1',
  'a:accent2': 'accent2',
  'a:accent3': 'accent3',
  'a:accent4': 'accent4',
  'a:accent5': 'accent5',
  'a:accent6': 'accent6',
  'a:hlink': 'hlink',
  'a:folHlink': 'folHlink',
};

/**
 * Parse themeN.xml → Theme with color scheme and font scheme.
 */
export function parseTheme(xml: string): Theme {
  const parsed = parseXml(xml);
  const themeEl = parsed?.['a:theme'];
  if (!themeEl) {
    return defaultTheme();
  }

  const themeElements = child(themeEl, 'themeElements');
  if (!themeElements) {
    return defaultTheme();
  }

  const colorScheme = parseColorScheme(child(themeElements, 'clrScheme'));
  const fontScheme = parseFontScheme(child(themeElements, 'fontScheme'));

  return { colorScheme, fontScheme };
}

function parseColorScheme(clrSchemeEl: any): ThemeColorScheme {
  const scheme: ThemeColorScheme = {
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

  if (!clrSchemeEl) return scheme;

  for (const [xmlKey, schemeKey] of Object.entries(COLOR_SCHEME_MAP)) {
    const colorEl = clrSchemeEl[xmlKey];
    if (colorEl) {
      const hex = extractColorHex(colorEl);
      if (hex) {
        scheme[schemeKey] = hex;
      }
    }
  }

  return scheme;
}

/** Extract hex color from a color element (srgbClr or sysClr) */
function extractColorHex(el: any): string | undefined {
  const srgb = child(el, 'srgbClr');
  if (srgb) {
    return attr(srgb, 'val') || undefined;
  }
  const sys = child(el, 'sysClr');
  if (sys) {
    return attr(sys, 'lastClr') || attr(sys, 'val') || undefined;
  }
  return undefined;
}

function parseFontScheme(fontSchemeEl: any): ThemeFontScheme {
  const defaultFonts: ThemeFontScheme = {
    majorLatin: 'Calibri Light',
    minorLatin: 'Calibri',
  };

  if (!fontSchemeEl) return defaultFonts;

  const majorFont = child(fontSchemeEl, 'majorFont');
  const minorFont = child(fontSchemeEl, 'minorFont');

  if (majorFont) {
    const latin = child(majorFont, 'latin');
    if (latin) {
      defaultFonts.majorLatin = attr(latin, 'typeface') || defaultFonts.majorLatin;
    }
  }

  if (minorFont) {
    const latin = child(minorFont, 'latin');
    if (latin) {
      defaultFonts.minorLatin = attr(latin, 'typeface') || defaultFonts.minorLatin;
    }
  }

  return defaultFonts;
}

function defaultTheme(): Theme {
  return {
    colorScheme: {
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
    },
    fontScheme: {
      majorLatin: 'Calibri Light',
      minorLatin: 'Calibri',
    },
  };
}
