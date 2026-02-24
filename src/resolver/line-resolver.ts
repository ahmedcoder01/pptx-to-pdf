import { LineStyle } from '../types/shape';
import { ThemeColorScheme } from '../types/presentation';
import { resolveColorFromElement } from './fill-resolver';
import { child, attr, numAttr } from '../utils/xml-utils';

/**
 * Resolve line (outline) properties from raw XML, resolving theme colors.
 */
export function resolveLineFromXml(
  ln: any,
  colorScheme: ThemeColorScheme
): LineStyle | undefined {
  if (!ln) return undefined;

  // Check for noFill
  if (child(ln, 'noFill') !== undefined) return undefined;

  const width = numAttr(ln, 'w');

  // Resolve line color
  const solidFill = child(ln, 'solidFill');
  const color = solidFill
    ? resolveColorFromElement(solidFill, colorScheme)
    : undefined;

  const prstDash = child(ln, 'prstDash');
  const dashStyle = (attr(prstDash, 'val') as LineStyle['dashStyle']) || 'solid';

  const cap = attr(ln, 'cap');
  const capType = (cap === 'rnd' ? 'round' : cap === 'sq' ? 'square' : 'flat') as LineStyle['capType'];

  return {
    width,
    color,
    dashStyle,
    capType,
  };
}
