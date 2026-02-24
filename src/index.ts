import { PptxArchive } from './parser/pptx-archive';
import { parsePresentation } from './parser/presentation-parser';
import { parseTheme } from './parser/theme-parser';
import { parseSlide } from './parser/slide-parser';
import { parseXml } from './parser/xml-parser';
import { getRelByType, getRelsByType, Relationship } from './parser/relationships-parser';
import { parseSlideLayout, LayoutPlaceholder } from './parser/layout-parser';
import { parseSlideMaster, MasterPlaceholder } from './parser/master-parser';
import { resolveSlide } from './resolver/inheritance-resolver';
import { resolveFillFromXml, resolveColorFromElement } from './resolver/fill-resolver';
import { resolveLineFromXml } from './resolver/line-resolver';
import { resolveFont } from './resolver/font-resolver';
import { Theme, Presentation, ThemeColorScheme, MasterTextStyles } from './types/presentation';
import { Slide } from './types/slide';
import { SlideElement, AutoShape } from './types/shape';
import { Fill, PictureFill } from './types/fill';
import { RunProperties } from './types/text';
import { renderPdf, RenderOptions } from './renderer/pdf-renderer';
import { child, attr, numAttr, ensureArray } from './utils/xml-utils';

export interface ConvertOptions {
  slides?: number[];
  fontDirs?: string[];
  fontMap?: Record<string, string | Buffer>;
  dpi?: number;
  onWarning?: (msg: string) => void;
}

/**
 * Convert a PPTX buffer to a PDF buffer.
 */
export async function convert(
  pptxBuffer: Buffer | Uint8Array,
  options: ConvertOptions = {}
): Promise<Buffer> {
  const warn = options.onWarning || (() => {});

  // Step 1: Extract archive
  const archive = await PptxArchive.load(pptxBuffer);

  // Step 2: Parse presentation.xml
  const presXml = await archive.getXml('ppt/presentation.xml');
  if (!presXml) {
    throw new Error('Invalid PPTX: missing ppt/presentation.xml');
  }
  const presInfo = parsePresentation(presXml);

  // Step 3: Parse relationships
  const presRels = await archive.getRels('ppt/presentation.xml');

  // Step 4: Parse theme
  const themeRel = getRelByType(presRels, 'theme');
  let theme: Theme;
  if (themeRel) {
    const themePath = archive.resolveTarget('ppt/presentation.xml', themeRel.target);
    const themeXml = await archive.getXml(themePath);
    theme = themeXml ? parseTheme(themeXml) : defaultTheme();
  } else {
    theme = defaultTheme();
  }

  // Step 5: Parse each slide with full inheritance
  const slides: Slide[] = [];

  for (let i = 0; i < presInfo.slideIds.length; i++) {
    const slideId = presInfo.slideIds[i];
    const slideRel = presRels.get(slideId.rId);
    if (!slideRel) {
      warn(`Slide ${i}: missing relationship ${slideId.rId}`);
      continue;
    }

    const slidePath = archive.resolveTarget('ppt/presentation.xml', slideRel.target);
    const slideXml = await archive.getXml(slidePath);
    if (!slideXml) {
      warn(`Slide ${i}: missing XML at ${slidePath}`);
      continue;
    }

    const slideRels = await archive.getRels(slidePath);

    // Parse slide elements
    let slide = await parseSlide(slideXml, i, archive, slideRels, slidePath);

    // Resolve colors from raw XML
    const rawParsed = parseXml(slideXml);
    slide = resolveSlideColors(slide, rawParsed, slideRels, archive, slidePath, theme);

    // --- Background, Layout & Placeholder Inheritance ---
    // Find the slide's layout
    const layoutRel = getRelByType(slideRels, 'slideLayout');
    let layoutBg: Fill | undefined;
    let layoutElements: SlideElement[] = [];
    let layoutPlaceholders: LayoutPlaceholder[] = [];
    let masterPlaceholders: MasterPlaceholder[] = [];
    let masterTextStyles: MasterTextStyles | undefined;

    if (layoutRel) {
      const layoutPath = archive.resolveTarget(slidePath, layoutRel.target);
      const layoutXml = await archive.getXml(layoutPath);
      if (layoutXml) {
        const layoutRels = await archive.getRels(layoutPath);

        // Parse layout background
        layoutBg = await parseBackgroundFromXml(layoutXml, archive, layoutRels, layoutPath, theme);

        // Parse layout placeholders (with transforms and text properties)
        const layoutInfo = parseSlideLayout(layoutXml);
        layoutPlaceholders = layoutInfo.placeholders;

        // Parse layout shapes (pics + shapes that should appear on the slide)
        const layoutParsed = parseXml(layoutXml);
        const layoutEl = layoutParsed?.['p:sldLayout'];
        const layoutCSld = child(layoutEl, 'cSld');
        const layoutSpTree = child(layoutCSld, 'spTree');
        if (layoutSpTree) {
          layoutElements = await parseLayoutShapes(layoutSpTree, archive, layoutRels, layoutPath);
        }

        // Parse master for background fallback and placeholder fallback
        const masterRel = getRelByType(layoutRels, 'slideMaster');
        if (masterRel) {
          const masterPath = archive.resolveTarget(layoutPath, masterRel.target);
          const masterXml = await archive.getXml(masterPath);
          if (masterXml) {
            const masterRels = await archive.getRels(masterPath);

            // Background fallback
            if (!layoutBg) {
              layoutBg = await parseBackgroundFromXml(masterXml, archive, masterRels, masterPath, theme);
            }

            // Master placeholders and text styles for fallback
            const masterInfo = parseSlideMaster(masterXml);
            masterPlaceholders = masterInfo.placeholders;
            masterTextStyles = masterInfo.textStyles;
          }
        }
      }
    }

    // Apply background inheritance: slide → layout → master
    if (!slide.background || slide.background.type === 'none') {
      if (layoutBg) {
        slide = { ...slide, background: layoutBg };
      }
    }

    // Resolve placeholder inheritance for slide shapes
    slide = resolvePlaceholderInheritance(slide, layoutPlaceholders, masterPlaceholders, theme, masterTextStyles);

    // Prepend layout elements before slide elements (layout shapes appear behind)
    if (layoutElements.length > 0) {
      slide = { ...slide, elements: [...layoutElements, ...slide.elements] };
    }

    // Resolve theme references
    slide = resolveSlide(slide, theme);

    slides.push(slide);
  }

  // Step 6: Build presentation
  const presentation: Presentation = {
    slideSize: presInfo.slideSize,
    slides,
    theme,
  };

  // Step 7: Render to PDF
  return renderPdf(presentation, {
    slides: options.slides,
    fontDirs: options.fontDirs,
    fontMap: options.fontMap,
    dpi: options.dpi,
    onWarning: warn,
  });
}

/**
 * Resolve placeholder inheritance for slide shapes.
 * Shapes with placeholderType inherit transform, fill, and text properties
 * from matching placeholders in layout → master, and text styles from master txStyles.
 */
function resolvePlaceholderInheritance(
  slide: Slide,
  layoutPlaceholders: LayoutPlaceholder[],
  masterPlaceholders: MasterPlaceholder[],
  theme: Theme,
  masterTextStyles?: MasterTextStyles
): Slide {
  const resolvedElements = slide.elements.map((element) => {
    if (element.type !== 'shape' || !element.placeholderType) return element;

    // Find matching placeholder: first in layout, then in master
    const layoutMatch = findPlaceholder(layoutPlaceholders, element.placeholderType, element.placeholderIdx);
    const masterMatch = findPlaceholder(masterPlaceholders, element.placeholderType, element.placeholderIdx);
    const phMatch = layoutMatch || masterMatch;

    let resolved = { ...element };

    // Inherit transform if the shape has a zero-size placeholder transform
    if (resolved.transform.extents.cx === 0 && resolved.transform.extents.cy === 0) {
      // Try layout first, then master
      const inheritedTransform = layoutMatch?.transform || masterMatch?.transform;
      if (inheritedTransform) {
        resolved.transform = inheritedTransform;
      }
    }

    // Inherit fill if the shape has no fill
    if (!resolved.fill) {
      const inheritedFill = layoutMatch?.fill || masterMatch?.fill;
      if (inheritedFill) {
        resolved.fill = inheritedFill;
      }
    }

    // Inherit line if the shape has no line
    if (!resolved.line) {
      const inheritedLine = layoutMatch?.line || masterMatch?.line;
      if (inheritedLine) {
        resolved.line = inheritedLine;
      }
    }

    // Inherit preset geometry if the shape has none
    if (!resolved.presetGeometry && phMatch?.presetGeometry) {
      resolved.presetGeometry = phMatch.presetGeometry;
    }

    // Determine the master text style for this placeholder type
    const masterStyle = getMasterStyleForPlaceholder(element.placeholderType, masterTextStyles);

    // Get layout placeholder's lstStyle (intermediate priority between slide and master)
    const layoutLstStyle = (layoutMatch as LayoutPlaceholder | undefined)?.lstStyle;

    // Inherit text properties — build effective defaults from hierarchy:
    // Priority (highest to lowest): slide run props > ph textBody > layout lstStyle > master txStyles
    if (resolved.textBody) {
      resolved.textBody = applyTextHierarchy(
        resolved.textBody,
        layoutMatch?.textBody || masterMatch?.textBody,
        layoutLstStyle,
        masterStyle
      );
    }

    return resolved;
  });

  return { ...slide, elements: resolvedElements };
}

/**
 * Get the appropriate master text style for a placeholder type.
 */
function getMasterStyleForPlaceholder(
  phType: string,
  masterTextStyles?: MasterTextStyles
): import('./types/presentation').DefaultTextStyle | undefined {
  if (!masterTextStyles) return undefined;

  switch (phType) {
    case 'title':
    case 'ctrTitle':
      return masterTextStyles.titleStyle;
    case 'body':
    case 'subTitle':
    case 'obj':
      return masterTextStyles.bodyStyle;
    default:
      return masterTextStyles.otherStyle || masterTextStyles.bodyStyle;
  }
}

/**
 * Find a matching placeholder by type and optionally by idx.
 */
function findPlaceholder(
  placeholders: (LayoutPlaceholder | MasterPlaceholder)[],
  type: string,
  idx?: number
): LayoutPlaceholder | MasterPlaceholder | undefined {
  // First try exact match by type and idx
  if (idx !== undefined) {
    const match = placeholders.find((p) => p.type === type && p.idx === idx);
    if (match) return match;
  }

  // Then match by type only
  const byType = placeholders.find((p) => p.type === type);
  if (byType) return byType;

  // Special mappings: ctrTitle → title, subTitle → body
  if (type === 'ctrTitle') {
    return placeholders.find((p) => p.type === 'title' || p.type === 'ctrTitle');
  }
  if (type === 'subTitle') {
    return placeholders.find((p) => p.type === 'body' || p.type === 'subTitle');
  }

  return undefined;
}

/**
 * Apply the full text property hierarchy to a text body.
 * Builds effective defaults from bottom to top, then applies to each run.
 * Priority (highest to lowest):
 *   slide run properties > phTextBody defaults > layout lstStyle > master txStyles
 */
function applyTextHierarchy(
  slideTextBody: NonNullable<AutoShape['textBody']>,
  phTextBody: NonNullable<AutoShape['textBody']> | undefined,
  layoutLstStyle: import('./types/presentation').DefaultTextStyle | undefined,
  masterStyle: import('./types/presentation').DefaultTextStyle | undefined
): NonNullable<AutoShape['textBody']> {
  const mergedParagraphs = slideTextBody.paragraphs.map((para, pi) => {
    const level = para.properties.level || 0;

    // Build effective defaults from hierarchy (lowest priority first, highest last)
    // Each layer overrides values set by lower layers
    let effectiveDefaults: RunProperties = {};

    // Layer 1 (lowest): master txStyles
    if (masterStyle) {
      const masterLevelProps = masterStyle.levels?.[level + 1] || masterStyle.levels?.[1];
      const masterRunProps = masterLevelProps?.rPr;
      const masterDefProps = masterStyle.defPPr?.defaultRunProps;
      if (masterRunProps || masterDefProps) {
        effectiveDefaults = mergeRunProps(masterRunProps || {}, masterDefProps || {});
      }
    }

    // Layer 2: layout lstStyle (overrides master)
    if (layoutLstStyle) {
      const lstLevelProps = layoutLstStyle.levels?.[level + 1] || layoutLstStyle.levels?.[1];
      const lstRunProps = lstLevelProps?.rPr;
      if (lstRunProps) {
        effectiveDefaults = overrideRunProps(effectiveDefaults, lstRunProps);
      }
    }

    // Layer 3: placeholder textBody paragraph defaults (overrides lstStyle)
    if (phTextBody) {
      const phPara = pi < phTextBody.paragraphs.length
        ? phTextBody.paragraphs[pi]
        : phTextBody.paragraphs[0];
      if (phPara?.properties.defaultRunProps) {
        effectiveDefaults = overrideRunProps(effectiveDefaults, phPara.properties.defaultRunProps);
      }
    }

    // Now apply effective defaults to the paragraph's own default run props
    const mergedParaDefRunProps = overrideRunProps(effectiveDefaults, para.properties.defaultRunProps || {});

    // Apply merged defaults to each text run (slide run props take highest priority)
    const mergedRuns = para.runs.map((run) => ({
      ...run,
      properties: mergeRunProps(run.properties, mergedParaDefRunProps),
    }));

    // Merge paragraph-level properties
    const mergedProps = { ...para.properties, defaultRunProps: mergedParaDefRunProps };
    if (!mergedProps.alignment && phTextBody) {
      const phPara = pi < phTextBody.paragraphs.length
        ? phTextBody.paragraphs[pi]
        : phTextBody.paragraphs[0];
      if (phPara?.properties.alignment) {
        mergedProps.alignment = phPara.properties.alignment;
      }
    }

    return { ...para, properties: mergedProps, runs: mergedRuns };
  });

  // Merge body properties
  const mergedBodyProps = { ...slideTextBody.bodyProperties };
  if (phTextBody) {
    if (!mergedBodyProps.anchor && phTextBody.bodyProperties.anchor) {
      mergedBodyProps.anchor = phTextBody.bodyProperties.anchor;
    }
    if (!mergedBodyProps.margin && phTextBody.bodyProperties.margin) {
      mergedBodyProps.margin = phTextBody.bodyProperties.margin;
    }
  }

  return { paragraphs: mergedParagraphs, bodyProperties: mergedBodyProps };
}

/**
 * Merge run properties: slide values take precedence over placeholder defaults.
 */
function mergeRunProps(slide: RunProperties, ph: RunProperties): RunProperties {
  return {
    fontFamily: slide.fontFamily || ph.fontFamily,
    fontSize: slide.fontSize || ph.fontSize,
    bold: slide.bold !== undefined ? slide.bold : ph.bold,
    italic: slide.italic !== undefined ? slide.italic : ph.italic,
    underline: slide.underline !== undefined ? slide.underline : ph.underline,
    strikethrough: slide.strikethrough !== undefined ? slide.strikethrough : ph.strikethrough,
    color: slide.color || ph.color,
    resolvedColor: slide.resolvedColor || ph.resolvedColor,
    baseline: slide.baseline || ph.baseline,
    spacing: slide.spacing || ph.spacing,
    lang: slide.lang || ph.lang,
  };
}

/**
 * Override run properties: the `override` argument's defined values take priority over `base`.
 * This is the inverse of mergeRunProps — used when a higher-priority layer should overwrite.
 */
function overrideRunProps(base: RunProperties, override: RunProperties): RunProperties {
  return {
    fontFamily: override.fontFamily || base.fontFamily,
    fontSize: override.fontSize || base.fontSize,
    bold: override.bold !== undefined ? override.bold : base.bold,
    italic: override.italic !== undefined ? override.italic : base.italic,
    underline: override.underline !== undefined ? override.underline : base.underline,
    strikethrough: override.strikethrough !== undefined ? override.strikethrough : base.strikethrough,
    color: override.color || base.color,
    resolvedColor: override.resolvedColor || base.resolvedColor,
    baseline: override.baseline || base.baseline,
    spacing: override.spacing || base.spacing,
    lang: override.lang || base.lang,
  };
}

/**
 * Parse background from any slide/layout/master XML, including blipFill (image backgrounds).
 */
async function parseBackgroundFromXml(
  xml: string,
  archive: PptxArchive,
  rels: Map<string, Relationship>,
  partPath: string,
  theme: Theme
): Promise<Fill | undefined> {
  const parsed = parseXml(xml);

  // Try slide, layout, and master root elements
  const rootEl = parsed?.['p:sld'] || parsed?.['p:sldLayout'] || parsed?.['p:sldMaster'];
  if (!rootEl) return undefined;

  const cSld = child(rootEl, 'cSld');
  if (!cSld) return undefined;

  const bgEl = child(cSld, 'bg');
  if (!bgEl) return undefined;

  const bgPr = child(bgEl, 'bgPr');
  if (!bgPr) return undefined;

  // Check for blipFill (image background)
  const blipFill = child(bgPr, 'blipFill');
  if (blipFill) {
    const blip = child(blipFill, 'blip');
    const rEmbed = attr(blip, 'r:embed');
    if (rEmbed) {
      const rel = rels.get(rEmbed);
      if (rel) {
        const imagePath = archive.resolveTarget(partPath, rel.target);
        const imageData = await archive.getBinary(imagePath);
        if (imageData) {
          const ext = imagePath.split('.').pop()?.toLowerCase() || '';
          // Skip SVG — PDFKit can't embed it
          if (ext === 'svg') return undefined;
          const contentType = ext === 'png' ? 'image/png' : ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext}`;
          return {
            type: 'picture',
            imageData,
            contentType,
            stretch: true,
          };
        }
      }
    }
  }

  // Check for solidFill / gradFill
  const resolved = resolveFillFromXml(bgPr, theme.colorScheme);
  return resolved;
}

/**
 * Parse shapes from a layout/master shape tree (pics and visible shapes only).
 * Skips placeholder shapes (they're just templates, not visible content).
 */
async function parseLayoutShapes(
  spTree: any,
  archive: PptxArchive,
  rels: Map<string, Relationship>,
  partPath: string
): Promise<SlideElement[]> {
  const elements: SlideElement[] = [];

  // Parse pictures from layout (logos, decorative images)
  for (const pic of ensureArray(child(spTree, 'pic'))) {
    const nvPicPr = child(pic, 'nvPicPr');
    const spPr = child(pic, 'spPr');
    const blipFill = child(pic, 'blipFill');
    const name = attr(child(nvPicPr, 'cNvPr'), 'name') || 'Layout Picture';

    // Skip if no transform
    const xfrm = child(spPr, 'xfrm');
    if (!xfrm) continue;

    const off = child(xfrm, 'off');
    const ext = child(xfrm, 'ext');
    if (!off || !ext) continue;

    // Get image data
    const blip = child(blipFill, 'blip');
    const rEmbed = attr(blip, 'r:embed');
    if (!rEmbed) continue;

    const rel = rels.get(rEmbed);
    if (!rel) continue;

    const imagePath = archive.resolveTarget(partPath, rel.target);
    const imageData = await archive.getBinary(imagePath);
    if (!imageData) continue;

    const imgExt = imagePath.split('.').pop()?.toLowerCase() || '';
    if (imgExt === 'svg') continue; // Skip SVG
    const contentType = imgExt === 'png' ? 'image/png' : imgExt === 'jpg' || imgExt === 'jpeg' ? 'image/jpeg' : `image/${imgExt}`;

    elements.push({
      type: 'picture',
      name,
      transform: {
        offset: { x: numAttr(off, 'x') || 0, y: numAttr(off, 'y') || 0 },
        extents: { cx: numAttr(ext, 'cx') || 0, cy: numAttr(ext, 'cy') || 0 },
      },
      imageData,
      contentType,
    });
  }

  return elements;
}

/**
 * Re-parse slide XML to resolve fills/lines/text with proper theme color resolution.
 */
function resolveSlideColors(
  slide: Slide,
  rawParsed: any,
  slideRels: Map<string, Relationship>,
  archive: PptxArchive,
  slidePath: string,
  theme: Theme
): Slide {
  const sldEl = rawParsed?.['p:sld'];
  if (!sldEl) return slide;

  const cSld = child(sldEl, 'cSld');
  if (!cSld) return slide;

  // Resolve shape fills and lines
  const spTree = child(cSld, 'spTree');
  if (!spTree) return slide;

  const rawShapes = ensureArray(child(spTree, 'sp'));

  // Match raw shapes to parsed elements by index (only shape-type elements)
  let rawIdx = 0;
  for (const element of slide.elements) {
    if (element.type !== 'shape') continue;
    if (rawIdx >= rawShapes.length) break;

    const rawSp = rawShapes[rawIdx];
    rawIdx++;

    const spPr = child(rawSp, 'spPr');
    if (spPr) {
      const resolvedFill = resolveFillFromXml(spPr, theme.colorScheme);
      if (resolvedFill) {
        (element as AutoShape).fill = resolvedFill;
      }
      const resolvedLine = resolveLineFromXml(child(spPr, 'ln'), theme.colorScheme);
      if (resolvedLine) {
        (element as AutoShape).line = resolvedLine;
      }
    }

    // Resolve text run colors
    if (element.type === 'shape' && element.textBody) {
      const txBody = child(rawSp, 'txBody');
      if (txBody) {
        resolveTextColors(element, txBody, theme);
      }
    }
  }

  return slide;
}

function resolveTextColors(element: AutoShape, txBody: any, theme: Theme): void {
  if (!element.textBody) return;

  const rawParas = ensureArray(child(txBody, 'p'));
  for (let pi = 0; pi < element.textBody.paragraphs.length && pi < rawParas.length; pi++) {
    const para = element.textBody.paragraphs[pi];
    const rawPara = rawParas[pi];
    const rawRuns = ensureArray(child(rawPara, 'r'));

    // Resolve default run props color
    const pPr = child(rawPara, 'pPr');
    if (pPr) {
      const defRPr = child(pPr, 'defRPr');
      if (defRPr && para.properties.defaultRunProps) {
        const solidFill = child(defRPr, 'solidFill');
        if (solidFill) {
          para.properties.defaultRunProps.resolvedColor =
            resolveColorFromElement(solidFill, theme.colorScheme);
        }
      }
    }

    let runIdx = 0;
    for (const run of para.runs) {
      if (run.isLineBreak) continue;
      if (runIdx < rawRuns.length) {
        const rawRun = rawRuns[runIdx];
        const rPr = child(rawRun, 'rPr');
        if (rPr) {
          const solidFill = child(rPr, 'solidFill');
          if (solidFill) {
            run.properties.resolvedColor =
              resolveColorFromElement(solidFill, theme.colorScheme);
          }
          const latin = child(rPr, 'latin');
          if (latin) {
            const typeface = attr(latin, 'typeface');
            if (typeface) {
              run.properties.fontFamily = resolveFont(typeface, theme.fontScheme);
            }
          }
        }
        runIdx++;
      }
    }
  }
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

// Re-export types
export type { Presentation } from './types/presentation';
export type { Slide } from './types/slide';
export type { SlideElement, AutoShape, Picture, Table, GroupShape, Connector } from './types/shape';
export type { TextBody, Paragraph, TextRun } from './types/text';
export type { Fill, SolidFill, GradientFill } from './types/fill';
export type { ResolvedColor } from './types/color';
