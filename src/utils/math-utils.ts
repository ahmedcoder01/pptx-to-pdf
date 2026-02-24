/** Convert OOXML angle (60000ths of a degree) to radians */
export function ooxmlAngleToRadians(angle: number): number {
  return (angle / 60000) * (Math.PI / 180);
}

/** Clamp a number to [min, max] */
export function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val));
}

/** Linear interpolation */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Approximate an arc with cubic Bezier curves.
 * Returns array of {x1, y1, x2, y2, x, y} control points.
 */
export function arcToBezier(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  startAngle: number,
  sweepAngle: number
): { x1: number; y1: number; x2: number; y2: number; x: number; y: number }[] {
  const curves: { x1: number; y1: number; x2: number; y2: number; x: number; y: number }[] = [];

  // Split arcs > 90 degrees into smaller segments
  const segments = Math.ceil(Math.abs(sweepAngle) / (Math.PI / 2));
  const anglePerSegment = sweepAngle / segments;

  let angle = startAngle;
  for (let i = 0; i < segments; i++) {
    const endAngle = angle + anglePerSegment;
    const alpha = (4 / 3) * Math.tan(anglePerSegment / 4);

    const cos1 = Math.cos(angle);
    const sin1 = Math.sin(angle);
    const cos2 = Math.cos(endAngle);
    const sin2 = Math.sin(endAngle);

    const p1x = cx + rx * cos1;
    const p1y = cy + ry * sin1;
    const p2x = cx + rx * cos2;
    const p2y = cy + ry * sin2;

    curves.push({
      x1: p1x - alpha * rx * sin1,
      y1: p1y + alpha * ry * cos1,
      x2: p2x + alpha * rx * sin2,
      y2: p2y - alpha * ry * cos2,
      x: p2x,
      y: p2y,
    });

    angle = endAngle;
  }

  return curves;
}
