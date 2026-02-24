import { AutoShape } from '../types/shape';
import { GeometryPath, PathCommand } from '../types/geometry';
import { toPdfTransform, PdfTransform, applyRotation, applyFlip } from '../geometry/transform';
import { buildPresetGeometry } from '../geometry/path-builder';
import { emuToPoints } from '../geometry/emu';
import { renderTextBody } from './text-renderer';

/**
 * Render an AutoShape onto the PDFKit document.
 */
export function renderShape(
  doc: any,
  shape: AutoShape,
  fontDirs: string[],
  fontMap: Record<string, string | Buffer>
): void {
  const t = toPdfTransform(shape.transform);

  if (t.width <= 0 || t.height <= 0) return;

  // Build geometry paths
  const paths = shape.geometryPaths ||
    buildPresetGeometry(shape.presetGeometry || 'rect', t.width, t.height, shape.adjustValues);

  doc.save();

  // Apply rotation
  if (t.rotation) {
    applyRotation(doc, t.x, t.y, t.width, t.height, t.rotation);
  }

  // Apply flips
  if (t.flipH || t.flipV) {
    applyFlip(doc, t.x, t.y, t.width, t.height, !!t.flipH, !!t.flipV);
  }

  // Determine if there's anything to paint
  const hasFill = shape.fill != null && shape.fill.type !== 'none';
  const hasStroke = shape.line != null && shape.line.color != null;

  // Only draw geometry if there's a fill or stroke to apply
  if (hasFill || hasStroke) {
    for (const geoPath of paths) {
      const shouldFill = geoPath.fill !== false && hasFill;
      const shouldStroke = geoPath.stroke !== false && hasStroke;

      if (!shouldFill && !shouldStroke) continue;

      renderPath(doc, geoPath.commands, t.x, t.y);

      // Set fill color
      if (shouldFill && shape.fill!.type === 'solid') {
        const { r, g, b, a } = shape.fill!.color;
        doc.fillColor(rgbToHexString(r, g, b), a);
      }

      // Set stroke style
      if (shouldStroke) {
        const lineWidth = shape.line!.width ? emuToPoints(shape.line!.width) : 1;
        doc.lineWidth(lineWidth);

        const { r, g, b, a } = shape.line!.color!;
        doc.strokeColor(rgbToHexString(r, g, b), a);

        applyDashStyle(doc, shape.line!.dashStyle, lineWidth);

        if (shape.line!.capType) {
          doc.lineCap(shape.line!.capType);
        }
      }

      // Execute fill/stroke
      if (shouldFill && shouldStroke) {
        doc.fillAndStroke();
      } else if (shouldFill) {
        doc.fill();
      } else if (shouldStroke) {
        doc.stroke();
      }
    }
  }

  doc.restore();

  // Render text body (after restore so text isn't clipped)
  if (shape.textBody) {
    renderTextBody(doc, shape.textBody, t, fontDirs, fontMap);
  }
}

/**
 * Render a geometry path (array of path commands) onto PDFKit.
 */
function renderPath(doc: any, commands: PathCommand[], offsetX: number, offsetY: number): void {
  for (const cmd of commands) {
    switch (cmd.type) {
      case 'moveTo':
        doc.moveTo(offsetX + cmd.x, offsetY + cmd.y);
        break;
      case 'lineTo':
        doc.lineTo(offsetX + cmd.x, offsetY + cmd.y);
        break;
      case 'cubicBezTo':
        doc.bezierCurveTo(
          offsetX + cmd.x1, offsetY + cmd.y1,
          offsetX + cmd.x2, offsetY + cmd.y2,
          offsetX + cmd.x, offsetY + cmd.y
        );
        break;
      case 'close':
        doc.closePath();
        break;
      case 'arcTo':
        // arcTo commands should have been converted to cubic Bezier
        // during geometry evaluation. Skip for now.
        break;
    }
  }
}

function applyDashStyle(doc: any, dashStyle: string | undefined, lineWidth: number): void {
  if (!dashStyle || dashStyle === 'solid') {
    doc.undash();
    return;
  }

  const w = lineWidth;
  switch (dashStyle) {
    case 'dash':
      doc.dash(w * 4, { space: w * 3 });
      break;
    case 'dot':
      doc.dash(w, { space: w * 2 });
      break;
    case 'dashDot':
      doc.dash(w * 4, { space: w * 2 });
      break;
    case 'lgDash':
      doc.dash(w * 8, { space: w * 3 });
      break;
    default:
      doc.undash();
  }
}

function rgbToHexString(r: number, g: number, b: number): string {
  const toHex = (c: number) => Math.round(Math.max(0, Math.min(255, c))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
