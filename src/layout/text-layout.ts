import { TextBody, Paragraph, TextRun, TextAlignment, VerticalAlignment, RunProperties } from '../types/text';
import { Margin } from '../types/common';
import { measureText, getFontMetrics } from './text-measurer';
import { emuToPoints, hundredthsPointToPoints } from '../geometry/emu';

export interface LayoutLine {
  runs: LayoutRun[];
  width: number;
  height: number;
  ascender: number;
  y: number; // vertical position within the text body (in points)
}

export interface LayoutRun {
  text: string;
  fontFamily: string;
  fontSize: number; // points
  bold: boolean;
  italic: boolean;
  color: { r: number; g: number; b: number; a: number };
  underline: boolean;
  strikethrough: boolean;
  width: number;
  x: number; // horizontal position within the line (in points)
}

export interface LayoutParagraph {
  lines: LayoutLine[];
  alignment: TextAlignment;
  spaceBefore: number; // points
  spaceAfter: number;
}

export interface TextLayoutResult {
  paragraphs: LayoutParagraph[];
  totalHeight: number;
  verticalAlign: VerticalAlignment;
}

const DEFAULT_FONT_SIZE = 18; // points (1800 hundredths)
const DEFAULT_FONT = 'Liberation Sans';
const DEFAULT_LINE_SPACING = 1.0;

/**
 * Lay out text within a bounding box.
 * Performs line breaking and computes positions for each run.
 */
export function layoutText(
  textBody: TextBody,
  boxWidthEmu: number,
  boxHeightEmu: number,
  fontDirs: string[] = [],
  fontMap: Record<string, string | Buffer> = {}
): TextLayoutResult {
  const margin = textBody.bodyProperties.margin || {
    left: 91440,
    top: 45720,
    right: 91440,
    bottom: 45720,
  };

  const availWidth = emuToPoints(boxWidthEmu) - emuToPoints(margin.left) - emuToPoints(margin.right);
  const availHeight = emuToPoints(boxHeightEmu) - emuToPoints(margin.top) - emuToPoints(margin.bottom);

  const paragraphs: LayoutParagraph[] = [];
  let currentY = 0;

  for (const para of textBody.paragraphs) {
    const alignment = para.properties.alignment || 'left';
    const spaceBefore = para.properties.spaceBefore
      ? hundredthsPointToPoints(para.properties.spaceBefore)
      : 0;
    const spaceAfter = para.properties.spaceAfter
      ? hundredthsPointToPoints(para.properties.spaceAfter)
      : 0;

    currentY += spaceBefore;

    const lines = breakIntoLines(para, availWidth, fontDirs, fontMap);

    // Position lines
    for (const line of lines) {
      line.y = currentY;
      currentY += line.height * getLineSpacingFactor(para.properties.lineSpacing);
    }

    currentY += spaceAfter;

    // Apply horizontal alignment
    for (const line of lines) {
      applyAlignment(line, availWidth, alignment);
    }

    paragraphs.push({ lines, alignment, spaceBefore, spaceAfter });
  }

  const totalHeight = currentY;
  const verticalAlign = textBody.bodyProperties.anchor || 'top';

  return { paragraphs, totalHeight, verticalAlign };
}

function getLineSpacingFactor(lineSpacing: number | undefined): number {
  if (!lineSpacing) return DEFAULT_LINE_SPACING;
  // lineSpacing in OOXML is either percentage (e.g. 100000 = single) or points
  if (lineSpacing > 1000) {
    return lineSpacing / 100000;
  }
  return lineSpacing;
}

/**
 * Break a paragraph into lines based on available width.
 */
function breakIntoLines(
  para: Paragraph,
  availWidth: number,
  fontDirs: string[],
  fontMap: Record<string, string | Buffer>
): LayoutLine[] {
  if (para.runs.length === 0) {
    // Empty paragraph — still contributes a line of default height
    const defaultMetrics = getFontMetrics(DEFAULT_FONT, DEFAULT_FONT_SIZE, false, false, fontDirs, fontMap);
    return [{
      runs: [],
      width: 0,
      height: defaultMetrics.lineHeight,
      ascender: defaultMetrics.ascender,
      y: 0,
    }];
  }

  const words = splitRunsIntoWords(para, fontDirs, fontMap);
  const lines: LayoutLine[] = [];
  let currentLine: LayoutRun[] = [];
  let lineWidth = 0;
  let lineHeight = 0;
  let lineAscender = 0;

  for (const word of words) {
    if (word.text === '\n') {
      // Forced line break
      lines.push(finalizeLine(currentLine, lineWidth, lineHeight, lineAscender));
      currentLine = [];
      lineWidth = 0;
      lineHeight = word.fontSize * 1.2;
      lineAscender = word.fontSize * 0.8;
      continue;
    }

    const metrics = getFontMetrics(word.fontFamily, word.fontSize, word.bold, word.italic, fontDirs, fontMap);

    if (lineWidth + word.width > availWidth && currentLine.length > 0) {
      // Wrap to next line
      lines.push(finalizeLine(currentLine, lineWidth, lineHeight, lineAscender));
      currentLine = [];
      lineWidth = 0;
      lineHeight = 0;
      lineAscender = 0;
    }

    word.x = lineWidth;
    currentLine.push(word);
    lineWidth += word.width;
    lineHeight = Math.max(lineHeight, metrics.lineHeight);
    lineAscender = Math.max(lineAscender, metrics.ascender);
  }

  if (currentLine.length > 0 || lines.length === 0) {
    lines.push(finalizeLine(currentLine, lineWidth, lineHeight || DEFAULT_FONT_SIZE * 1.2, lineAscender || DEFAULT_FONT_SIZE * 0.8));
  }

  return lines;
}

function finalizeLine(runs: LayoutRun[], width: number, height: number, ascender: number): LayoutLine {
  return { runs, width, height, ascender, y: 0 };
}

/**
 * Split paragraph runs into word-level layout runs for line breaking.
 */
function splitRunsIntoWords(
  para: Paragraph,
  fontDirs: string[],
  fontMap: Record<string, string | Buffer>
): LayoutRun[] {
  const layoutRuns: LayoutRun[] = [];
  const defaultProps = para.properties.defaultRunProps || {};

  for (const run of para.runs) {
    const props = run.properties;
    const fontFamily = props.fontFamily || defaultProps.fontFamily || DEFAULT_FONT;
    const fontSize = hundredthsPointToPoints(props.fontSize || defaultProps.fontSize || 1800);
    const bold = props.bold ?? defaultProps.bold ?? false;
    const italic = props.italic ?? defaultProps.italic ?? false;
    const underline = props.underline ?? defaultProps.underline ?? false;
    const strikethrough = props.strikethrough ?? defaultProps.strikethrough ?? false;
    const color = props.resolvedColor || defaultProps.resolvedColor || { r: 0, g: 0, b: 0, a: 1 };

    if (run.isLineBreak) {
      layoutRuns.push({
        text: '\n',
        fontFamily,
        fontSize,
        bold,
        italic,
        color,
        underline,
        strikethrough,
        width: 0,
        x: 0,
      });
      continue;
    }

    // Split text at word boundaries (preserving spaces)
    const segments = run.text.match(/\S+\s*|\s+/g) || [run.text];

    for (const segment of segments) {
      const width = measureText(segment, fontFamily, fontSize, bold, italic, fontDirs, fontMap);
      layoutRuns.push({
        text: segment,
        fontFamily,
        fontSize,
        bold,
        italic,
        color,
        underline,
        strikethrough,
        width,
        x: 0,
      });
    }
  }

  return layoutRuns;
}

/**
 * Apply horizontal alignment to a line.
 */
function applyAlignment(line: LayoutLine, availWidth: number, alignment: TextAlignment): void {
  const slack = availWidth - line.width;
  if (slack <= 0) return;

  let offsetX = 0;
  switch (alignment) {
    case 'center':
      offsetX = slack / 2;
      break;
    case 'right':
      offsetX = slack;
      break;
    case 'left':
    case 'justify':
    case 'distributed':
    default:
      offsetX = 0;
      break;
  }

  for (const run of line.runs) {
    run.x += offsetX;
  }
}
