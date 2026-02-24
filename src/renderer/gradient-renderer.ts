import { GradientFill } from '../types/fill';

/**
 * Apply a gradient fill to the current path in PDFKit.
 * PDFKit supports linear gradients natively.
 */
export function applyGradientFill(
  doc: any,
  fill: GradientFill,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  if (fill.stops.length < 2) {
    // Fallback to first stop color
    if (fill.stops.length === 1) {
      const { r, g, b, a } = fill.stops[0].color;
      doc.fillColor(rgbToHexString(r, g, b), a);
    }
    return;
  }

  // Calculate gradient line based on angle
  const angle = ((fill.angle || 0) * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  const cx = x + width / 2;
  const cy = y + height / 2;
  const halfDiag = Math.sqrt(width * width + height * height) / 2;

  const x1 = cx - cos * halfDiag;
  const y1 = cy - sin * halfDiag;
  const x2 = cx + cos * halfDiag;
  const y2 = cy + sin * halfDiag;

  const grad = doc.linearGradient(x1, y1, x2, y2);

  for (const stop of fill.stops) {
    const pos = stop.position / 100000; // Convert from OOXML percentage
    const { r, g, b } = stop.color;
    grad.stop(Math.max(0, Math.min(1, pos)), rgbToHexString(r, g, b));
  }

  doc.fill(grad);
}

function rgbToHexString(r: number, g: number, b: number): string {
  const toHex = (c: number) => Math.round(Math.max(0, Math.min(255, c))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
