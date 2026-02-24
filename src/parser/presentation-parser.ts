import { parseXml } from './xml-parser';
import { attr, numAttr, child, ensureArray } from '../utils/xml-utils';
import { Size2D } from '../types/common';

export interface PresentationInfo {
  slideSize: Size2D;
  slideIds: { id: string; rId: string }[];
}

/**
 * Parse presentation.xml → slide size and ordered slide references.
 */
export function parsePresentation(xml: string): PresentationInfo {
  const parsed = parseXml(xml);
  const presEl = parsed?.['p:presentation'];

  // Default to standard 10"x7.5" (widescreen would be 13.333"x7.5")
  const defaultSize: Size2D = { cx: 9144000, cy: 6858000 };

  if (!presEl) {
    return { slideSize: defaultSize, slideIds: [] };
  }

  // Parse slide size
  const sldSz = child(presEl, 'sldSz');
  const slideSize: Size2D = {
    cx: numAttr(sldSz, 'cx') || defaultSize.cx,
    cy: numAttr(sldSz, 'cy') || defaultSize.cy,
  };

  // Parse slide list
  const sldIdLst = child(presEl, 'sldIdLst');
  const sldIds = ensureArray(child(sldIdLst, 'sldId'));

  const slideIds = sldIds.map((sldId: any) => ({
    id: attr(sldId, 'id') || '',
    rId: attr(sldId, 'r:id') || attr(sldId, 'id') || '',
  }));

  return { slideSize, slideIds };
}
