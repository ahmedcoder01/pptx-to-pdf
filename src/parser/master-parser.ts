import { parseXml } from './xml-parser';
import { child, ensureArray, attr, numAttr } from '../utils/xml-utils';
import { parseTextBody, parseFillFromElement, parseRunProperties, parseTransform2D, parseLineStyle } from './slide-parser';
import { Fill } from '../types/fill';
import { TextBody } from '../types/text';
import { DefaultTextStyle, MasterTextStyles } from '../types/presentation';
import { Transform2D } from '../types/common';
import { LineStyle } from '../types/shape';

export interface MasterPlaceholder {
  type: string; // e.g. 'title', 'body', 'dt', 'ftr', 'sldNum', 'ctrTitle', 'subTitle'
  idx?: number;
  transform?: Transform2D;
  fill?: Fill;
  line?: LineStyle;
  presetGeometry?: string;
  textBody?: TextBody;
}

export interface SlideMasterInfo {
  background?: Fill;
  placeholders: MasterPlaceholder[];
  defaultTextStyle?: DefaultTextStyle;
  textStyles?: MasterTextStyles;
}

/**
 * Parse slideMasterN.xml → background, placeholders, text styles.
 */
export function parseSlideMaster(xml: string): SlideMasterInfo {
  const parsed = parseXml(xml);
  const masterEl = parsed?.['p:sldMaster'];
  if (!masterEl) {
    return { placeholders: [] };
  }

  const cSld = child(masterEl, 'cSld');
  const background = parseMasterBackground(child(cSld, 'bg'));

  // Parse shape tree for placeholders
  const spTree = child(cSld, 'spTree');
  const placeholders = parsePlaceholders(spTree);

  // Parse text styles
  const txStyles = child(masterEl, 'txStyles');
  const defaultTextStyle = parseDefaultTextStyle(txStyles);
  const textStyles = parseMasterTextStyles(txStyles);

  return { background, placeholders, defaultTextStyle, textStyles };
}

function parseMasterBackground(bgEl: any): Fill | undefined {
  if (!bgEl) return undefined;
  const bgPr = child(bgEl, 'bgPr');
  if (bgPr) {
    return parseFillFromElement(bgPr);
  }
  return undefined;
}

function parsePlaceholders(spTree: any): MasterPlaceholder[] {
  if (!spTree) return [];
  const placeholders: MasterPlaceholder[] = [];

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

    const textBody = parseTextBody(child(sp, 'txBody'));

    placeholders.push({ type, idx, transform, fill, line, presetGeometry, textBody });
  }

  return placeholders;
}

function parseDefaultTextStyle(txStyles: any): DefaultTextStyle | undefined {
  if (!txStyles) return undefined;

  const style: DefaultTextStyle = { levels: {} };

  // Parse title style
  const titleStyle = child(txStyles, 'titleStyle');
  if (titleStyle) {
    parseLevelStyles(titleStyle, style);
  }

  // Parse body style
  const bodyStyle = child(txStyles, 'bodyStyle');
  if (bodyStyle) {
    parseLevelStyles(bodyStyle, style);
  }

  return style;
}

function parseLevelStyles(styleEl: any, target: DefaultTextStyle): void {
  // Default paragraph properties
  const defPPr = child(styleEl, 'defPPr');
  if (defPPr) {
    const defRPr = child(defPPr, 'defRPr');
    target.defPPr = { defaultRunProps: defRPr ? parseRunProperties(defRPr) : undefined };
  }

  // Level 1-9 properties
  for (let level = 1; level <= 9; level++) {
    const lvlPPr = child(styleEl, `lvl${level}pPr`);
    if (lvlPPr) {
      const defRPr = child(lvlPPr, 'defRPr');
      if (!target.levels) target.levels = {};
      target.levels[level] = {
        rPr: defRPr ? parseRunProperties(defRPr) : undefined,
      };
    }
  }
}

function parseMasterTextStyles(txStyles: any): MasterTextStyles | undefined {
  if (!txStyles) return undefined;

  const result: MasterTextStyles = {};

  const titleStyle = child(txStyles, 'titleStyle');
  if (titleStyle) {
    result.titleStyle = { levels: {} };
    parseLevelStyles(titleStyle, result.titleStyle);
  }

  const bodyStyle = child(txStyles, 'bodyStyle');
  if (bodyStyle) {
    result.bodyStyle = { levels: {} };
    parseLevelStyles(bodyStyle, result.bodyStyle);
  }

  const otherStyle = child(txStyles, 'otherStyle');
  if (otherStyle) {
    result.otherStyle = { levels: {} };
    parseLevelStyles(otherStyle, result.otherStyle);
  }

  return result;
}
