import { ColorSource, ResolvedColor, ThemeColorRef } from '../types/color';
import { ThemeColorScheme } from '../types/presentation';
import { hexToRgb, rgbToHsl, hslToRgb, applyLumMod, applyLumOff, applyTint, applyShade, applySatMod, applySatOff, PRESET_COLORS } from '../utils/color-utils';

/**
 * Resolve a ColorSource to a concrete RGBA color using the theme color scheme.
 */
export function resolveColor(
  source: ColorSource | undefined,
  colorScheme: ThemeColorScheme
): ResolvedColor {
  if (!source) {
    return { r: 0, g: 0, b: 0, a: 1 };
  }

  switch (source.type) {
    case 'srgb': {
      const rgb = hexToRgb(source.hex);
      const alpha = source.alpha !== undefined ? source.alpha / 100000 : 1;
      return { ...rgb, a: alpha };
    }

    case 'scheme': {
      return resolveSchemeColor(source.ref, colorScheme);
    }

    case 'preset': {
      const hex = PRESET_COLORS[source.name] || '000000';
      const rgb = hexToRgb(hex);
      const alpha = source.alpha !== undefined ? source.alpha / 100000 : 1;
      return { ...rgb, a: alpha };
    }

    default:
      return { r: 0, g: 0, b: 0, a: 1 };
  }
}

/**
 * Resolve a theme color reference (schemeClr) with luminance/saturation transforms.
 */
function resolveSchemeColor(ref: ThemeColorRef, colorScheme: ThemeColorScheme): ResolvedColor {
  // Map scheme name to theme color key
  const schemeKey = mapSchemeKey(ref.scheme);
  const hex = colorScheme[schemeKey] || '000000';
  const rgb = hexToRgb(hex);

  // Apply HSL transforms
  let hsl = rgbToHsl(rgb);

  if (ref.lumMod !== undefined) {
    hsl = applyLumMod(hsl, ref.lumMod);
  }
  if (ref.lumOff !== undefined) {
    hsl = applyLumOff(hsl, ref.lumOff);
  }
  if (ref.tint !== undefined) {
    hsl = applyTint(hsl, ref.tint);
  }
  if (ref.shade !== undefined) {
    hsl = applyShade(hsl, ref.shade);
  }
  if (ref.satMod !== undefined) {
    hsl = applySatMod(hsl, ref.satMod);
  }
  if (ref.satOff !== undefined) {
    hsl = applySatOff(hsl, ref.satOff);
  }

  const result = hslToRgb(hsl);
  const alpha = ref.alpha !== undefined ? ref.alpha / 100000 : 1;

  return { ...result, a: alpha };
}

/** Map OOXML scheme color names to our theme keys */
function mapSchemeKey(scheme: string): string {
  const map: Record<string, string> = {
    bg1: 'lt1',
    bg2: 'lt2',
    tx1: 'dk1',
    tx2: 'dk2',
    phClr: 'accent1', // placeholder color → default to accent1
  };
  return map[scheme] || scheme;
}
