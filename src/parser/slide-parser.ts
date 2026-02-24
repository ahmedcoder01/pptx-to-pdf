import { parseXml } from './xml-parser';
import { attr, numAttr, boolAttr, child, children, ensureArray, deepChild, textContent } from '../utils/xml-utils';
import { PptxArchive } from './pptx-archive';
import { Relationship } from './relationships-parser';
import { Transform2D, Point2D, Size2D, Margin } from '../types/common';
import { ColorSource, ThemeColorRef } from '../types/color';
import { Fill } from '../types/fill';
import { TextBody, Paragraph, TextRun, RunProperties, ParagraphProperties, TextAlignment, VerticalAlignment, AutofitType } from '../types/text';
import { SlideElement, AutoShape, Picture, Table, TableCell, GroupShape, Connector, LineStyle } from '../types/shape';
import { Slide } from '../types/slide';

/**
 * Parse slideN.xml into a Slide IR.
 */
export async function parseSlide(
  xml: string,
  slideIndex: number,
  archive: PptxArchive,
  slideRels: Map<string, Relationship>,
  slidePath: string
): Promise<Slide> {
  const parsed = parseXml(xml);
  const sldEl = parsed?.['p:sld'];
  if (!sldEl) {
    return { index: slideIndex, elements: [] };
  }

  const cSld = child(sldEl, 'cSld');
  if (!cSld) {
    return { index: slideIndex, elements: [] };
  }

  // Parse background
  const background = parseSlideBg(child(cSld, 'bg'));

  // Parse shape tree
  const spTree = child(cSld, 'spTree');
  const elements = spTree
    ? await parseShapeTree(spTree, archive, slideRels, slidePath)
    : [];

  return { index: slideIndex, elements, background };
}

/** Parse slide background */
function parseSlideBg(bgEl: any): Fill | undefined {
  if (!bgEl) return undefined;

  const bgPr = child(bgEl, 'bgPr');
  if (bgPr) {
    return parseFillFromElement(bgPr);
  }

  const bgRef = child(bgEl, 'bgRef');
  if (bgRef) {
    // Background style reference — simplified: extract color if present
    const color = parseColorSource(bgRef);
    if (color) {
      return { type: 'solid', color: { r: 255, g: 255, b: 255, a: 1 } };
    }
  }

  return undefined;
}

/** Parse shape tree (spTree) → array of slide elements */
async function parseShapeTree(
  spTree: any,
  archive: PptxArchive,
  rels: Map<string, Relationship>,
  slidePath: string
): Promise<SlideElement[]> {
  const elements: SlideElement[] = [];

  // Parse shapes (sp)
  for (const sp of ensureArray(child(spTree, 'sp'))) {
    const shape = parseAutoShape(sp);
    if (shape) elements.push(shape);
  }

  // Parse pictures (pic)
  for (const pic of ensureArray(child(spTree, 'pic'))) {
    const picture = await parsePicture(pic, archive, rels, slidePath);
    if (picture) elements.push(picture);
  }

  // Parse group shapes (grpSp)
  for (const grpSp of ensureArray(child(spTree, 'grpSp'))) {
    const group = await parseGroupShape(grpSp, archive, rels, slidePath);
    if (group) elements.push(group);
  }

  // Parse connectors (cxnSp)
  for (const cxnSp of ensureArray(child(spTree, 'cxnSp'))) {
    const connector = parseConnector(cxnSp);
    if (connector) elements.push(connector);
  }

  // Parse tables (graphicFrame with a:tbl)
  for (const gf of ensureArray(child(spTree, 'graphicFrame'))) {
    const table = parseGraphicFrame(gf);
    if (table) elements.push(table);
  }

  return elements;
}

/** Parse an AutoShape (p:sp) */
function parseAutoShape(sp: any): AutoShape | undefined {
  if (!sp) return undefined;

  const nvSpPr = child(sp, 'nvSpPr');
  const spPr = child(sp, 'spPr');
  const name = attr(child(nvSpPr, 'cNvPr'), 'name') || 'Shape';

  // Check for placeholder info
  const nvPr = child(nvSpPr, 'nvPr');
  const ph = child(nvPr, 'ph');
  const placeholderType = ph ? (attr(ph, 'type') || 'body') : undefined;
  const placeholderIdx = ph ? numAttr(ph, 'idx') : undefined;

  const transform = parseTransform2D(child(spPr, 'xfrm'));

  // If no transform and not a placeholder, skip this shape
  if (!transform && !placeholderType) return undefined;

  // For placeholders without transforms, use a zero-size placeholder transform
  // that will be resolved later from layout/master
  const effectiveTransform = transform || {
    offset: { x: 0, y: 0 },
    extents: { cx: 0, cy: 0 },
  };

  const prstGeom = child(spPr, 'prstGeom');
  const presetGeometry = prstGeom ? attr(prstGeom, 'prst') : undefined;

  const adjustValues = parseAdjustValues(prstGeom);
  const fill = parseFillFromElement(spPr);
  const line = parseLineStyle(child(spPr, 'ln'));
  const textBody = parseTextBody(child(sp, 'txBody'));

  return {
    type: 'shape',
    name,
    transform: effectiveTransform,
    presetGeometry,
    adjustValues,
    fill,
    line,
    textBody,
    placeholderType,
    placeholderIdx,
  };
}

/** Parse a Picture (p:pic) */
async function parsePicture(
  pic: any,
  archive: PptxArchive,
  rels: Map<string, Relationship>,
  slidePath: string
): Promise<Picture | undefined> {
  if (!pic) return undefined;

  const nvPicPr = child(pic, 'nvPicPr');
  const blipFill = child(pic, 'blipFill');
  const spPr = child(pic, 'spPr');
  const name = attr(child(nvPicPr, 'cNvPr'), 'name') || 'Picture';

  const transform = parseTransform2D(child(spPr, 'xfrm'));
  if (!transform) return undefined;

  // Get image data via relationship
  const blip = child(blipFill, 'blip');
  const rEmbed = attr(blip, 'r:embed');
  if (!rEmbed) return undefined;

  const rel = rels.get(rEmbed);
  if (!rel) return undefined;

  const imagePath = archive.resolveTarget(slidePath, rel.target);
  const imageData = await archive.getBinary(imagePath);
  if (!imageData) return undefined;

  // Determine content type
  const ext = imagePath.split('.').pop()?.toLowerCase() || '';
  const contentType = ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext}`;

  // Parse source rect (crop)
  const srcRect = child(blipFill, 'srcRect');
  const cropRect = srcRect
    ? {
        l: numAttr(srcRect, 'l') || 0,
        t: numAttr(srcRect, 't') || 0,
        r: numAttr(srcRect, 'r') || 0,
        b: numAttr(srcRect, 'b') || 0,
      }
    : undefined;

  return {
    type: 'picture',
    name,
    transform,
    imageData,
    contentType,
    srcRect: cropRect,
  };
}

/** Parse a group shape */
async function parseGroupShape(
  grpSp: any,
  archive: PptxArchive,
  rels: Map<string, Relationship>,
  slidePath: string
): Promise<GroupShape | undefined> {
  if (!grpSp) return undefined;

  const nvGrpSpPr = child(grpSp, 'nvGrpSpPr');
  const grpSpPr = child(grpSp, 'grpSpPr');
  const name = attr(child(nvGrpSpPr, 'cNvPr'), 'name') || 'Group';

  const xfrm = child(grpSpPr, 'xfrm');
  const transform = parseTransform2D(xfrm);
  if (!transform) return undefined;

  const chOff = child(xfrm, 'chOff');
  const chExt = child(xfrm, 'chExt');

  const childOffset = {
    x: numAttr(chOff, 'x') || 0,
    y: numAttr(chOff, 'y') || 0,
  };
  const childExtents = {
    cx: numAttr(chExt, 'cx') || transform.extents.cx,
    cy: numAttr(chExt, 'cy') || transform.extents.cy,
  };

  const children = await parseShapeTree(grpSp, archive, rels, slidePath);

  return {
    type: 'group',
    name,
    transform,
    childOffset,
    childExtents,
    children,
  };
}

/** Parse a connector shape */
function parseConnector(cxnSp: any): Connector | undefined {
  if (!cxnSp) return undefined;

  const nvCxnSpPr = child(cxnSp, 'nvCxnSpPr');
  const spPr = child(cxnSp, 'spPr');
  const name = attr(child(nvCxnSpPr, 'cNvPr'), 'name') || 'Connector';

  const transform = parseTransform2D(child(spPr, 'xfrm'));
  if (!transform) return undefined;

  const prstGeom = child(spPr, 'prstGeom');
  const presetGeometry = prstGeom ? attr(prstGeom, 'prst') : 'line';

  const line = parseLineStyle(child(spPr, 'ln'));

  return {
    type: 'connector',
    name,
    transform,
    presetGeometry,
    line,
  };
}

/** Parse a graphicFrame (tables) */
function parseGraphicFrame(gf: any): Table | undefined {
  if (!gf) return undefined;

  const nvGraphicFramePr = child(gf, 'nvGraphicFramePr');
  const xfrm = child(gf, 'xfrm');
  const name = attr(child(nvGraphicFramePr, 'cNvPr'), 'name') || 'Table';

  // Try to get transform from the graphicFrame's own xfrm
  const gfXfrm = child(gf, 'xfrm') || deepChild(gf, 'p:xfrm');
  const transform = parseTransform2D(gfXfrm);
  if (!transform) return undefined;

  // Find the table element
  const graphic = child(gf, 'graphic');
  const graphicData = child(graphic, 'graphicData');
  const tbl = child(graphicData, 'tbl');
  if (!tbl) return undefined;

  // Parse table grid
  const tblGrid = child(tbl, 'tblGrid');
  const gridCols = ensureArray(child(tblGrid, 'gridCol'));
  const widths = gridCols.map((col: any) => numAttr(col, 'w') || 0);

  // Parse rows
  const trs = ensureArray(child(tbl, 'tr'));
  const rows = trs.map((tr: any) => {
    const height = numAttr(tr, 'h') || 0;
    const tcs = ensureArray(child(tr, 'tc'));
    const cells: TableCell[] = tcs.map((tc: any) => parseTableCell(tc));
    return { height, cells };
  });

  return {
    type: 'table',
    name,
    transform,
    grid: { widths },
    rows,
  };
}

function parseTableCell(tc: any): TableCell {
  const textBody = parseTextBody(child(tc, 'txBody'));
  const tcPr = child(tc, 'tcPr');
  const fill = tcPr ? parseFillFromElement(tcPr) : undefined;

  return {
    text: textBody,
    fill,
    gridSpan: numAttr(tc, 'gridSpan'),
    rowSpan: numAttr(tc, 'rowSpan'),
    hMerge: boolAttr(tc, 'hMerge'),
    vMerge: boolAttr(tc, 'vMerge'),
  };
}

/** Parse xfrm → Transform2D */
export function parseTransform2D(xfrm: any): Transform2D | undefined {
  if (!xfrm) return undefined;

  const off = child(xfrm, 'off');
  const ext = child(xfrm, 'ext');

  if (!off && !ext) return undefined;

  return {
    offset: {
      x: numAttr(off, 'x') || 0,
      y: numAttr(off, 'y') || 0,
    },
    extents: {
      cx: numAttr(ext, 'cx') || 0,
      cy: numAttr(ext, 'cy') || 0,
    },
    rot: numAttr(xfrm, 'rot') ? (numAttr(xfrm, 'rot')! / 60000) : undefined,
    flipH: boolAttr(xfrm, 'flipH'),
    flipV: boolAttr(xfrm, 'flipV'),
  };
}

/** Parse adjustment values from prstGeom */
function parseAdjustValues(prstGeom: any): Record<string, number> | undefined {
  if (!prstGeom) return undefined;
  const avLst = child(prstGeom, 'avLst');
  if (!avLst) return undefined;

  const gdList = ensureArray(child(avLst, 'gd'));
  if (gdList.length === 0) return undefined;

  const values: Record<string, number> = {};
  for (const gd of gdList) {
    const name = attr(gd, 'name');
    const fmla = attr(gd, 'fmla');
    if (name && fmla) {
      const match = fmla.match(/val\s+(\d+)/);
      if (match) {
        values[name] = parseInt(match[1], 10);
      }
    }
  }

  return Object.keys(values).length > 0 ? values : undefined;
}

/** Parse fill from a shape property element (spPr or tcPr) */
export function parseFillFromElement(el: any): Fill | undefined {
  if (!el) return undefined;

  // No fill
  if (child(el, 'noFill') !== undefined) {
    return { type: 'none' };
  }

  // Solid fill
  const solidFill = child(el, 'solidFill');
  if (solidFill) {
    return {
      type: 'solid',
      color: { r: 0, g: 0, b: 0, a: 1 }, // Will be resolved later
    };
  }

  // Gradient fill
  const gradFill = child(el, 'gradFill');
  if (gradFill) {
    return {
      type: 'gradient',
      stops: [],
      linear: true,
    };
  }

  return undefined;
}

/** Parse a color source from various OOXML color elements */
export function parseColorSource(el: any): ColorSource | undefined {
  if (!el) return undefined;

  const srgbClr = child(el, 'srgbClr');
  if (srgbClr) {
    const hex = attr(srgbClr, 'val');
    if (hex) {
      const alpha = numAttr(child(srgbClr, 'alpha'), 'val');
      return { type: 'srgb', hex, alpha };
    }
  }

  const schemeClr = child(el, 'schemeClr');
  if (schemeClr) {
    const ref: ThemeColorRef = {
      scheme: attr(schemeClr, 'val') || 'dk1',
      lumMod: numAttr(child(schemeClr, 'lumMod'), 'val'),
      lumOff: numAttr(child(schemeClr, 'lumOff'), 'val'),
      tint: numAttr(child(schemeClr, 'tint'), 'val'),
      shade: numAttr(child(schemeClr, 'shade'), 'val'),
      satMod: numAttr(child(schemeClr, 'satMod'), 'val'),
      satOff: numAttr(child(schemeClr, 'satOff'), 'val'),
      alpha: numAttr(child(schemeClr, 'alpha'), 'val'),
    };
    return { type: 'scheme', ref };
  }

  const prstClr = child(el, 'prstClr');
  if (prstClr) {
    const name = attr(prstClr, 'val');
    if (name) {
      const alpha = numAttr(child(prstClr, 'alpha'), 'val');
      return { type: 'preset', name, alpha };
    }
  }

  return undefined;
}

/** Parse line/outline style */
export function parseLineStyle(ln: any): LineStyle | undefined {
  if (!ln) return undefined;
  if (child(ln, 'noFill') !== undefined) return undefined;

  const width = numAttr(ln, 'w');
  const colorSrc = parseColorSource(child(ln, 'solidFill') || ln);

  return {
    width,
    dashStyle: attr(child(ln, 'prstDash'), 'val') as any || 'solid',
  };
}

/** Parse text body (txBody) */
export function parseTextBody(txBody: any): TextBody | undefined {
  if (!txBody) return undefined;

  const bodyPr = child(txBody, 'bodyPr');
  const paragraphs = ensureArray(child(txBody, 'p')).map(parseParagraph);

  if (paragraphs.length === 0) return undefined;

  // Parse body properties
  const anchor = attr(bodyPr, 'anchor') as string | undefined;
  const vertAlign: VerticalAlignment | undefined =
    anchor === 'ctr' ? 'middle' :
    anchor === 'b' ? 'bottom' :
    anchor === 't' ? 'top' :
    undefined;

  const normAutofit = child(bodyPr, 'normAutofit');
  const spAutoFit = child(bodyPr, 'spAutoFit');
  let autofit: AutofitType = 'none';
  if (normAutofit) autofit = 'shrink';
  if (spAutoFit) autofit = 'resize';

  const lIns = numAttr(bodyPr, 'lIns');
  const tIns = numAttr(bodyPr, 'tIns');
  const rIns = numAttr(bodyPr, 'rIns');
  const bIns = numAttr(bodyPr, 'bIns');

  const margin: Margin | undefined =
    lIns !== undefined || tIns !== undefined || rIns !== undefined || bIns !== undefined
      ? {
          left: lIns ?? 91440, // Default 0.1 inch
          top: tIns ?? 45720,  // Default 0.05 inch
          right: rIns ?? 91440,
          bottom: bIns ?? 45720,
        }
      : undefined;

  return {
    paragraphs,
    bodyProperties: {
      anchor: vertAlign,
      anchorCtr: boolAttr(bodyPr, 'anchorCtr'),
      wrap: attr(bodyPr, 'wrap') === 'none' ? 'none' : 'square',
      autofit,
      margin,
    },
  };
}

function parseParagraph(pEl: any): Paragraph {
  const pPr = child(pEl, 'pPr');
  const properties = parseParagraphProperties(pPr);

  const runs: TextRun[] = [];

  // Text runs
  for (const r of ensureArray(child(pEl, 'r'))) {
    const rPr = child(r, 'rPr');
    const text = textContent(child(r, 't'));
    if (text || text === '') {
      runs.push({
        text,
        properties: parseRunProperties(rPr),
      });
    }
  }

  // Line breaks
  for (const br of ensureArray(child(pEl, 'br'))) {
    runs.push({
      text: '\n',
      properties: parseRunProperties(child(br, 'rPr')),
      isLineBreak: true,
    });
  }

  // Field codes (e.g. slide numbers, dates)
  const fld = child(pEl, 'fld');
  if (fld) {
    const fldRuns = ensureArray(fld);
    for (const f of fldRuns) {
      const text = textContent(child(f, 't'));
      if (text) {
        runs.push({ text, properties: parseRunProperties(child(f, 'rPr')) });
      }
    }
  }

  return { runs, properties };
}

function parseParagraphProperties(pPr: any): ParagraphProperties {
  if (!pPr) return {};

  const algn = attr(pPr, 'algn');
  const alignment: TextAlignment | undefined =
    algn === 'ctr' ? 'center' :
    algn === 'r' ? 'right' :
    algn === 'just' ? 'justify' :
    algn === 'dist' ? 'distributed' :
    algn === 'l' ? 'left' :
    undefined;

  return {
    alignment,
    level: numAttr(pPr, 'lvl'),
    indent: numAttr(pPr, 'indent'),
    marginLeft: numAttr(pPr, 'marL'),
    lineSpacing: parseSpacing(child(pPr, 'lnSpc')),
    spaceBefore: parseSpacing(child(pPr, 'spcBef')),
    spaceAfter: parseSpacing(child(pPr, 'spcAft')),
    defaultRunProps: parseRunProperties(child(pPr, 'defRPr')),
  };
}

function parseSpacing(spc: any): number | undefined {
  if (!spc) return undefined;
  const spcPct = child(spc, 'spcPct');
  if (spcPct) return numAttr(spcPct, 'val');
  const spcPts = child(spc, 'spcPts');
  if (spcPts) return numAttr(spcPts, 'val');
  return undefined;
}

export function parseRunProperties(rPr: any): RunProperties {
  if (!rPr) return {};

  const latin = child(rPr, 'latin');
  const cs = child(rPr, 'cs');
  const ea = child(rPr, 'ea');

  const solidFill = child(rPr, 'solidFill');
  const color = solidFill ? parseColorSource(solidFill) : undefined;

  return {
    fontFamily: attr(latin, 'typeface') || attr(cs, 'typeface') || attr(ea, 'typeface'),
    fontSize: numAttr(rPr, 'sz'),
    bold: boolAttr(rPr, 'b'),
    italic: boolAttr(rPr, 'i'),
    underline: attr(rPr, 'u') !== undefined && attr(rPr, 'u') !== 'none',
    strikethrough: attr(rPr, 'strike') !== undefined && attr(rPr, 'strike') !== 'noStrike',
    color,
    baseline: numAttr(rPr, 'baseline'),
    spacing: numAttr(rPr, 'spc'),
    lang: attr(rPr, 'lang'),
  };
}
