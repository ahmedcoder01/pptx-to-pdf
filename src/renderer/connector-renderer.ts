import { Connector } from '../types/shape';
import { toPdfTransform, applyRotation, applyFlip } from '../geometry/transform';
import { emuToPoints } from '../geometry/emu';

/**
 * Render a connector shape (line between shapes) onto the PDFKit document.
 */
export function renderConnector(doc: any, connector: Connector): void {
  const t = toPdfTransform(connector.transform);

  doc.save();

  if (t.rotation) {
    applyRotation(doc, t.x, t.y, t.width, t.height, t.rotation);
  }

  if (t.flipH || t.flipV) {
    applyFlip(doc, t.x, t.y, t.width, t.height, !!t.flipH, !!t.flipV);
  }

  // Default line style
  const lineWidth = connector.line?.width ? emuToPoints(connector.line.width) : 1;
  doc.lineWidth(lineWidth);

  if (connector.line?.color) {
    const { r, g, b, a } = connector.line.color;
    doc.strokeColor(rgbToHexString(r, g, b), a);
  } else {
    doc.strokeColor('#000000');
  }

  // Draw based on preset geometry
  switch (connector.presetGeometry) {
    case 'bentConnector2':
    case 'bentConnector3':
    case 'bentConnector4':
    case 'bentConnector5':
      // Elbow connector — simplified as L-shape
      doc.moveTo(t.x, t.y)
         .lineTo(t.x + t.width, t.y)
         .lineTo(t.x + t.width, t.y + t.height)
         .stroke();
      break;

    case 'curvedConnector2':
    case 'curvedConnector3':
    case 'curvedConnector4':
    case 'curvedConnector5':
      // Curved connector — simplified as cubic Bezier
      doc.moveTo(t.x, t.y)
         .bezierCurveTo(
           t.x + t.width / 2, t.y,
           t.x + t.width / 2, t.y + t.height,
           t.x + t.width, t.y + t.height
         )
         .stroke();
      break;

    case 'line':
    case 'straightConnector1':
    default:
      // Straight line
      doc.moveTo(t.x, t.y)
         .lineTo(t.x + t.width, t.y + t.height)
         .stroke();
      break;
  }

  doc.restore();
}

function rgbToHexString(r: number, g: number, b: number): string {
  const toHex = (c: number) => Math.round(Math.max(0, Math.min(255, c))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
