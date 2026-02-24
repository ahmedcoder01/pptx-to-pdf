import { TextBody } from '../types/text';
import { PdfTransform } from '../geometry/transform';
import { emuToPoints, pointsToEmu } from '../geometry/emu';
import { layoutText, TextLayoutResult, LayoutLine, LayoutRun } from '../layout/text-layout';
import { getBundledFont, resolveFont as resolveFontPath } from '../utils/font-utils';

/**
 * Render a text body onto the PDFKit document.
 */
export function renderTextBody(
  doc: any,
  textBody: TextBody,
  shapeTransform: PdfTransform,
  fontDirs: string[],
  fontMap: Record<string, string | Buffer>
): void {
  const { x, y, width, height } = shapeTransform;

  // Get text margins
  const margin = textBody.bodyProperties.margin || {
    left: 91440,
    top: 45720,
    right: 91440,
    bottom: 45720,
  };

  const marginL = emuToPoints(margin.left);
  const marginT = emuToPoints(margin.top);
  const marginR = emuToPoints(margin.right);
  const marginB = emuToPoints(margin.bottom);

  // Layout text
  const layout = layoutText(
    textBody,
    pointsToEmu(width),
    pointsToEmu(height),
    fontDirs,
    fontMap
  );

  // Compute vertical offset based on alignment
  const availHeight = height - marginT - marginB;
  let verticalOffset = 0;

  switch (layout.verticalAlign) {
    case 'middle':
      verticalOffset = Math.max(0, (availHeight - layout.totalHeight) / 2);
      break;
    case 'bottom':
      verticalOffset = Math.max(0, availHeight - layout.totalHeight);
      break;
    case 'top':
    default:
      verticalOffset = 0;
      break;
  }

  // Render each paragraph and line
  const textX = x + marginL;
  const textY = y + marginT + verticalOffset;

  for (const para of layout.paragraphs) {
    for (const line of para.lines) {
      renderLine(doc, line, textX, textY, fontDirs, fontMap);
    }
  }
}

function renderLine(
  doc: any,
  line: LayoutLine,
  baseX: number,
  baseY: number,
  fontDirs: string[],
  fontMap: Record<string, string | Buffer>
): void {
  for (const run of line.runs) {
    if (!run.text || run.text === '\n') continue;

    const runX = baseX + run.x;
    // PDFKit's doc.text() positions at the top of the text, not the baseline
    const runY = baseY + line.y;

    // Set font
    const fontPath = resolveFontPath(run.fontFamily, run.bold, run.italic, fontDirs, fontMap);
    try {
      if (Buffer.isBuffer(fontPath)) {
        doc.font(fontPath);
      } else {
        doc.font(fontPath as string);
      }
    } catch {
      doc.font(getBundledFont(run.fontFamily, run.bold, run.italic));
    }

    doc.fontSize(run.fontSize);

    // Set color
    const { r, g, b, a } = run.color;
    doc.fillColor(rgbToHexString(r, g, b), a);

    // Render text
    doc.text(run.text, runX, runY, {
      lineBreak: false,
    });

    // Render underline
    if (run.underline) {
      const underlineY = runY + line.height + 1;
      doc.save();
      doc
        .moveTo(runX, underlineY)
        .lineTo(runX + run.width, underlineY)
        .lineWidth(Math.max(0.5, run.fontSize * 0.05))
        .strokeColor(rgbToHexString(r, g, b), a)
        .stroke();
      doc.restore();
    }

    // Render strikethrough
    if (run.strikethrough) {
      const strikeY = runY + line.height * 0.4;
      doc.save();
      doc
        .moveTo(runX, strikeY)
        .lineTo(runX + run.width, strikeY)
        .lineWidth(Math.max(0.5, run.fontSize * 0.05))
        .strokeColor(rgbToHexString(r, g, b), a)
        .stroke();
      doc.restore();
    }
  }
}

function rgbToHexString(r: number, g: number, b: number): string {
  const toHex = (c: number) => Math.round(Math.max(0, Math.min(255, c))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
