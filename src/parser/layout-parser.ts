import { parseXml } from './xml-parser';
import { child, ensureArray, attr, numAttr } from '../utils/xml-utils';
import { parseTextBody, parseFillFromElement, parseTransform2D, parseLineStyle, parseRunProperties } from './slide-parser';
import { Fill } from '../types/fill';
import { TextBody, RunProperties } from '../types/text';
import { Transform2D } from '../types/common';
import { LineStyle } from '../types/shape';
import { DefaultTextStyle } from '../types/presentation';

export interface LayoutPlaceholder {
  type: string;
  idx?: number;
  transform?: Transform2D;
  fill?: Fill;
  line?: LineStyle;
  presetGeometry?: string;
  textBody?: TextBody;
  lstStyle?: DefaultTextStyle;
}

export interface SlideLayoutInfo {
  background?: Fill;
  placeholders: LayoutPlaceholder[];
}

/**
 * Parse slideLayoutN.xml → background and placeholders.
 */
export function parseSlideLayout(xml: string): SlideLayoutInfo {
  const parsed = parseXml(xml);
  const layoutEl = parsed?.['p:sldLayout'];
  if (!layoutEl) {
    return { placeholders: [] };
  }

  const cSld = child(layoutEl, 'cSld');
  const background = parseFillFromElement(child(child(cSld, 'bg'), 'bgPr'));

  const spTree = child(cSld, 'spTree');
  const placeholders = parsePlaceholders(spTree);

  return { background, placeholders };
}

function parsePlaceholders(spTree: any): LayoutPlaceholder[] {
  if (!spTree) return [];
  const placeholders: LayoutPlaceholder[] = [];

  for (const sp of ensureArray(child(spTree, 'sp'))) {
    const nvSpPr = child(sp, 'nvSpPr');
    const nvPr = child(nvSpPr, 'nvPr');
    const ph = child(nvPr, 'ph');
    if (!ph) continue;

    const type = attr(ph, 'type') || 'body';
    const idx = numAttr(ph, 'idx');

    const spPr = child(sp, 'spPr');
    const transform = parseTransform2D(child(spPr, 'xfrm'));
    const fill = parseFillFromElement(spPr);
    const line = parseLineStyle(child(spPr, 'ln'));

    const prstGeom = child(spPr, 'prstGeom');
    const presetGeometry = prstGeom ? attr(prstGeom, 'prst') : undefined;

    const txBody = child(sp, 'txBody');
    const textBody = parseTextBody(txBody);
    const lstStyle = parseLstStyle(child(txBody, 'lstStyle'));

    placeholders.push({ type, idx, transform, fill, line, presetGeometry, textBody, lstStyle });
  }

  return placeholders;
}

/**
 * Parse lstStyle element → DefaultTextStyle with level-specific run properties.
 */
function parseLstStyle(lstStyle: any): DefaultTextStyle | undefined {
  if (!lstStyle) return undefined;

  const result: DefaultTextStyle = { levels: {} };

  for (let level = 1; level <= 9; level++) {
    const lvlPPr = child(lstStyle, `lvl${level}pPr`);
    if (lvlPPr) {
      const defRPr = child(lvlPPr, 'defRPr');
      if (!result.levels) result.levels = {};
      result.levels[level] = {
        rPr: defRPr ? parseRunProperties(defRPr) : undefined,
      };
    }
  }

  return Object.keys(result.levels || {}).length > 0 ? result : undefined;
}
