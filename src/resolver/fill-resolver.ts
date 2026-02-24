import { Fill, SolidFill } from '../types/fill';
import { ColorSource, ResolvedColor } from '../types/color';
import { ThemeColorScheme } from '../types/presentation';
import { resolveColor } from './color-resolver';
import { parseXml } from '../parser/xml-parser';
import { child, ensureArray, attr, numAttr } from '../utils/xml-utils';

/**
 * Resolve fill properties from raw parsed XML, resolving theme colors.
 */
export function resolveFillFromXml(
  el: any,
  colorScheme: ThemeColorScheme
): Fill | undefined {
  if (!el) return undefined;

  // Check noFill
  const noFill = child(el, 'noFill');
  if (noFill !== undefined) return { type: 'none' };

  // Solid fill
  const solidFill = child(el, 'solidFill');
  if (solidFill) {
    return resolveSolidFill(solidFill, colorScheme);
  }

  // Gradient fill
  const gradFill = child(el, 'gradFill');
  if (gradFill) {
    return resolveGradientFill(gradFill, colorScheme);
  }

  return undefined;
}

function resolveSolidFill(solidFill: any, colorScheme: ThemeColorScheme): SolidFill {
  const color = resolveColorFromElement(solidFill, colorScheme);
  return { type: 'solid', color };
}

function resolveGradientFill(gradFill: any, colorScheme: ThemeColorScheme): Fill {
  const gsLst = child(gradFill, 'gsLst');
  const stops = ensureArray(child(gsLst, 'gs')).map((gs: any) => {
    const pos = numAttr(gs, 'pos') || 0;
    const color = resolveColorFromElement(gs, colorScheme);
    return { position: pos, color };
  });

  const lin = child(gradFill, 'lin');
  const angle = lin ? (numAttr(lin, 'ang') || 0) / 60000 : 0;

  return {
    type: 'gradient',
    stops,
    angle,
    linear: true,
  };
}

/** Resolve color from any element that may contain srgbClr/schemeClr/prstClr */
export function resolveColorFromElement(el: any, colorScheme: ThemeColorScheme): ResolvedColor {
  if (!el) return { r: 0, g: 0, b: 0, a: 1 };

  // srgbClr
  const srgbClr = child(el, 'srgbClr');
  if (srgbClr) {
    const hex = attr(srgbClr, 'val') || '000000';
    const alphaEl = child(srgbClr, 'alpha');
    const alpha = alphaEl ? (numAttr(alphaEl, 'val') || 100000) / 100000 : 1;
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return { r, g, b, a: alpha };
  }

  // schemeClr
  const schemeClr = child(el, 'schemeClr');
  if (schemeClr) {
    const source: ColorSource = {
      type: 'scheme',
      ref: {
        scheme: attr(schemeClr, 'val') || 'dk1',
        lumMod: numAttr(child(schemeClr, 'lumMod'), 'val'),
        lumOff: numAttr(child(schemeClr, 'lumOff'), 'val'),
        tint: numAttr(child(schemeClr, 'tint'), 'val'),
        shade: numAttr(child(schemeClr, 'shade'), 'val'),
        satMod: numAttr(child(schemeClr, 'satMod'), 'val'),
        satOff: numAttr(child(schemeClr, 'satOff'), 'val'),
        alpha: numAttr(child(schemeClr, 'alpha'), 'val'),
      },
    };
    return resolveColor(source, colorScheme);
  }

  // prstClr
  const prstClr = child(el, 'prstClr');
  if (prstClr) {
    const name = attr(prstClr, 'val') || 'black';
    return resolveColor({ type: 'preset', name }, colorScheme);
  }

  return { r: 0, g: 0, b: 0, a: 1 };
}
