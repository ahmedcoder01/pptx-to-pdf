import { GeometryPath, PathCommand } from '../types/geometry';

/**
 * Build geometry paths for preset shapes.
 * Coordinates are normalized to the shape's extents (0,0)→(w,h).
 */
export function buildPresetGeometry(
  presetName: string,
  w: number,
  h: number,
  adjustValues?: Record<string, number>
): GeometryPath[] {
  const builder = PRESET_BUILDERS[presetName];
  if (!builder) {
    // Unknown preset — return a rectangle as fallback
    return buildRect(w, h);
  }
  return builder(w, h, adjustValues || {});
}

type PresetBuilder = (w: number, h: number, adj: Record<string, number>) => GeometryPath[];

function buildRect(w: number, h: number): GeometryPath[] {
  return [{
    commands: [
      { type: 'moveTo', x: 0, y: 0 },
      { type: 'lineTo', x: w, y: 0 },
      { type: 'lineTo', x: w, y: h },
      { type: 'lineTo', x: 0, y: h },
      { type: 'close' },
    ],
  }];
}

function buildRoundRect(w: number, h: number, adj: Record<string, number>): GeometryPath[] {
  // adj1 defaults to 16667 (1/6 of shorter side)
  const adj1 = adj.adj || 16667;
  const r = Math.min(w, h) * (adj1 / 100000);

  return [{
    commands: [
      { type: 'moveTo', x: r, y: 0 },
      { type: 'lineTo', x: w - r, y: 0 },
      { type: 'cubicBezTo', x1: w - r * 0.45, y1: 0, x2: w, y2: r * 0.45, x: w, y: r },
      { type: 'lineTo', x: w, y: h - r },
      { type: 'cubicBezTo', x1: w, y1: h - r * 0.45, x2: w - r * 0.45, y2: h, x: w - r, y: h },
      { type: 'lineTo', x: r, y: h },
      { type: 'cubicBezTo', x1: r * 0.45, y1: h, x2: 0, y2: h - r * 0.45, x: 0, y: h - r },
      { type: 'lineTo', x: 0, y: r },
      { type: 'cubicBezTo', x1: 0, y1: r * 0.45, x2: r * 0.45, y2: 0, x: r, y: 0 },
      { type: 'close' },
    ],
  }];
}

function buildEllipse(w: number, h: number): GeometryPath[] {
  const kappa = 0.5522847498; // 4 * (sqrt(2) - 1) / 3
  const cx = w / 2;
  const cy = h / 2;
  const rx = w / 2;
  const ry = h / 2;
  const ox = rx * kappa;
  const oy = ry * kappa;

  return [{
    commands: [
      { type: 'moveTo', x: cx, y: 0 },
      { type: 'cubicBezTo', x1: cx + ox, y1: 0, x2: w, y2: cy - oy, x: w, y: cy },
      { type: 'cubicBezTo', x1: w, y1: cy + oy, x2: cx + ox, y2: h, x: cx, y: h },
      { type: 'cubicBezTo', x1: cx - ox, y1: h, x2: 0, y2: cy + oy, x: 0, y: cy },
      { type: 'cubicBezTo', x1: 0, y1: cy - oy, x2: cx - ox, y2: 0, x: cx, y: 0 },
      { type: 'close' },
    ],
  }];
}

function buildTriangle(w: number, h: number, adj: Record<string, number>): GeometryPath[] {
  const adj1 = adj.adj || 50000; // apex position (0=left, 50000=center, 100000=right)
  const apex = w * (adj1 / 100000);

  return [{
    commands: [
      { type: 'moveTo', x: apex, y: 0 },
      { type: 'lineTo', x: w, y: h },
      { type: 'lineTo', x: 0, y: h },
      { type: 'close' },
    ],
  }];
}

function buildDiamond(w: number, h: number): GeometryPath[] {
  return [{
    commands: [
      { type: 'moveTo', x: w / 2, y: 0 },
      { type: 'lineTo', x: w, y: h / 2 },
      { type: 'lineTo', x: w / 2, y: h },
      { type: 'lineTo', x: 0, y: h / 2 },
      { type: 'close' },
    ],
  }];
}

function buildLine(w: number, h: number): GeometryPath[] {
  return [{
    commands: [
      { type: 'moveTo', x: 0, y: 0 },
      { type: 'lineTo', x: w, y: h },
    ],
    fill: false,
    stroke: true,
  }];
}

function buildRightArrow(w: number, h: number, adj: Record<string, number>): GeometryPath[] {
  const adj1 = adj.adj1 || 50000; // shaft width %
  const adj2 = adj.adj2 || 50000; // head length %
  const shaftHalf = h * (1 - adj1 / 100000) / 2;
  const headStart = w * (1 - adj2 / 100000);

  return [{
    commands: [
      { type: 'moveTo', x: 0, y: shaftHalf },
      { type: 'lineTo', x: headStart, y: shaftHalf },
      { type: 'lineTo', x: headStart, y: 0 },
      { type: 'lineTo', x: w, y: h / 2 },
      { type: 'lineTo', x: headStart, y: h },
      { type: 'lineTo', x: headStart, y: h - shaftHalf },
      { type: 'lineTo', x: 0, y: h - shaftHalf },
      { type: 'close' },
    ],
  }];
}

function buildLeftArrow(w: number, h: number, adj: Record<string, number>): GeometryPath[] {
  const adj1 = adj.adj1 || 50000;
  const adj2 = adj.adj2 || 50000;
  const shaftHalf = h * (1 - adj1 / 100000) / 2;
  const headEnd = w * (adj2 / 100000);

  return [{
    commands: [
      { type: 'moveTo', x: w, y: shaftHalf },
      { type: 'lineTo', x: headEnd, y: shaftHalf },
      { type: 'lineTo', x: headEnd, y: 0 },
      { type: 'lineTo', x: 0, y: h / 2 },
      { type: 'lineTo', x: headEnd, y: h },
      { type: 'lineTo', x: headEnd, y: h - shaftHalf },
      { type: 'lineTo', x: w, y: h - shaftHalf },
      { type: 'close' },
    ],
  }];
}

function buildUpArrow(w: number, h: number, adj: Record<string, number>): GeometryPath[] {
  const adj1 = adj.adj1 || 50000;
  const adj2 = adj.adj2 || 50000;
  const shaftHalf = w * (1 - adj1 / 100000) / 2;
  const headEnd = h * (adj2 / 100000);

  return [{
    commands: [
      { type: 'moveTo', x: shaftHalf, y: h },
      { type: 'lineTo', x: shaftHalf, y: headEnd },
      { type: 'lineTo', x: 0, y: headEnd },
      { type: 'lineTo', x: w / 2, y: 0 },
      { type: 'lineTo', x: w, y: headEnd },
      { type: 'lineTo', x: w - shaftHalf, y: headEnd },
      { type: 'lineTo', x: w - shaftHalf, y: h },
      { type: 'close' },
    ],
  }];
}

function buildDownArrow(w: number, h: number, adj: Record<string, number>): GeometryPath[] {
  const adj1 = adj.adj1 || 50000;
  const adj2 = adj.adj2 || 50000;
  const shaftHalf = w * (1 - adj1 / 100000) / 2;
  const headStart = h * (1 - adj2 / 100000);

  return [{
    commands: [
      { type: 'moveTo', x: shaftHalf, y: 0 },
      { type: 'lineTo', x: shaftHalf, y: headStart },
      { type: 'lineTo', x: 0, y: headStart },
      { type: 'lineTo', x: w / 2, y: h },
      { type: 'lineTo', x: w, y: headStart },
      { type: 'lineTo', x: w - shaftHalf, y: headStart },
      { type: 'lineTo', x: w - shaftHalf, y: 0 },
      { type: 'close' },
    ],
  }];
}

function buildPentagon(w: number, h: number): GeometryPath[] {
  const cx = w / 2;
  const points = [];
  for (let i = 0; i < 5; i++) {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / 5;
    points.push({
      x: cx + (w / 2) * Math.cos(angle),
      y: (h / 2) + (h / 2) * Math.sin(angle),
    });
  }

  const commands: PathCommand[] = [
    { type: 'moveTo', x: points[0].x, y: points[0].y },
    ...points.slice(1).map((p) => ({ type: 'lineTo' as const, x: p.x, y: p.y })),
    { type: 'close' },
  ];

  return [{ commands }];
}

function buildHexagon(w: number, h: number, adj: Record<string, number>): GeometryPath[] {
  const adj1 = adj.adj || 25000;
  const d = w * (adj1 / 100000);

  return [{
    commands: [
      { type: 'moveTo', x: d, y: 0 },
      { type: 'lineTo', x: w - d, y: 0 },
      { type: 'lineTo', x: w, y: h / 2 },
      { type: 'lineTo', x: w - d, y: h },
      { type: 'lineTo', x: d, y: h },
      { type: 'lineTo', x: 0, y: h / 2 },
      { type: 'close' },
    ],
  }];
}

function buildStar5(w: number, h: number): GeometryPath[] {
  const cx = w / 2;
  const cy = h / 2;
  const outerR = Math.min(w, h) / 2;
  const innerR = outerR * 0.382; // golden ratio
  const commands: PathCommand[] = [];

  for (let i = 0; i < 5; i++) {
    const outerAngle = -Math.PI / 2 + (2 * Math.PI * i) / 5;
    const innerAngle = outerAngle + Math.PI / 5;

    const ox = cx + outerR * Math.cos(outerAngle) * (w / h || 1);
    const oy = cy + outerR * Math.sin(outerAngle);
    const ix = cx + innerR * Math.cos(innerAngle) * (w / h || 1);
    const iy = cy + innerR * Math.sin(innerAngle);

    if (i === 0) {
      commands.push({ type: 'moveTo', x: ox, y: oy });
    } else {
      commands.push({ type: 'lineTo', x: ox, y: oy });
    }
    commands.push({ type: 'lineTo', x: ix, y: iy });
  }
  commands.push({ type: 'close' });

  return [{ commands }];
}

function buildPlus(w: number, h: number, adj: Record<string, number>): GeometryPath[] {
  const adj1 = adj.adj || 25000;
  const d = Math.min(w, h) * (adj1 / 100000);

  return [{
    commands: [
      { type: 'moveTo', x: d, y: 0 },
      { type: 'lineTo', x: w - d, y: 0 },
      { type: 'lineTo', x: w - d, y: d },
      { type: 'lineTo', x: w, y: d },
      { type: 'lineTo', x: w, y: h - d },
      { type: 'lineTo', x: w - d, y: h - d },
      { type: 'lineTo', x: w - d, y: h },
      { type: 'lineTo', x: d, y: h },
      { type: 'lineTo', x: d, y: h - d },
      { type: 'lineTo', x: 0, y: h - d },
      { type: 'lineTo', x: 0, y: d },
      { type: 'lineTo', x: d, y: d },
      { type: 'close' },
    ],
  }];
}

function buildParallelogram(w: number, h: number, adj: Record<string, number>): GeometryPath[] {
  const adj1 = adj.adj || 25000;
  const d = w * (adj1 / 100000);

  return [{
    commands: [
      { type: 'moveTo', x: d, y: 0 },
      { type: 'lineTo', x: w, y: 0 },
      { type: 'lineTo', x: w - d, y: h },
      { type: 'lineTo', x: 0, y: h },
      { type: 'close' },
    ],
  }];
}

function buildTrapezoid(w: number, h: number, adj: Record<string, number>): GeometryPath[] {
  const adj1 = adj.adj || 25000;
  const d = w * (adj1 / 100000);

  return [{
    commands: [
      { type: 'moveTo', x: d, y: 0 },
      { type: 'lineTo', x: w - d, y: 0 },
      { type: 'lineTo', x: w, y: h },
      { type: 'lineTo', x: 0, y: h },
      { type: 'close' },
    ],
  }];
}

function buildChevron(w: number, h: number, adj: Record<string, number>): GeometryPath[] {
  const adj1 = adj.adj || 50000;
  const d = w * (adj1 / 100000);

  return [{
    commands: [
      { type: 'moveTo', x: 0, y: 0 },
      { type: 'lineTo', x: w - d, y: 0 },
      { type: 'lineTo', x: w, y: h / 2 },
      { type: 'lineTo', x: w - d, y: h },
      { type: 'lineTo', x: 0, y: h },
      { type: 'lineTo', x: d, y: h / 2 },
      { type: 'close' },
    ],
  }];
}

const PRESET_BUILDERS: Record<string, PresetBuilder> = {
  rect: (w, h) => buildRect(w, h),
  roundRect: buildRoundRect,
  ellipse: (w, h) => buildEllipse(w, h),
  triangle: buildTriangle,
  rtTriangle: (w, h) => [{
    commands: [
      { type: 'moveTo', x: 0, y: h },
      { type: 'lineTo', x: 0, y: 0 },
      { type: 'lineTo', x: w, y: h },
      { type: 'close' },
    ],
  }],
  diamond: (w, h) => buildDiamond(w, h),
  parallelogram: buildParallelogram,
  trapezoid: buildTrapezoid,
  pentagon: (w, h) => buildPentagon(w, h),
  hexagon: buildHexagon,
  star5: (w, h) => buildStar5(w, h),
  plus: buildPlus,
  mathPlus: buildPlus,
  cross: buildPlus,
  line: buildLine,
  straightConnector1: buildLine,
  rightArrow: buildRightArrow,
  leftArrow: buildLeftArrow,
  upArrow: buildUpArrow,
  downArrow: buildDownArrow,
  chevron: buildChevron,
  homePlate: buildChevron,
  // Flowchart shapes — simplified as basic shapes
  flowChartProcess: (w, h) => buildRect(w, h),
  flowChartDecision: (w, h) => buildDiamond(w, h),
  flowChartTerminator: (w, h) => buildRoundRect(w, h, { adj: 50000 }),
  flowChartConnector: (w, h) => buildEllipse(w, h),
  // Callouts — simplified as rectangles
  wedgeRoundRectCallout: buildRoundRect,
  wedgeRectCallout: (w, h) => buildRect(w, h),
  wedgeEllipseCallout: (w, h) => buildEllipse(w, h),
};

/** Get the text rect for a preset geometry (for inscribing text) */
export function getPresetTextRect(
  presetName: string,
  w: number,
  h: number,
  adjustValues?: Record<string, number>
): { l: number; t: number; r: number; b: number } | undefined {
  // For most shapes, the text rect is inset from the bounding box
  switch (presetName) {
    case 'ellipse':
      const inset = 0.293; // ~1-1/sqrt(2)
      return { l: w * inset, t: h * inset, r: w * (1 - inset), b: h * (1 - inset) };
    case 'triangle': {
      const adj = adjustValues?.adj || 50000;
      const apex = w * (adj / 100000);
      return { l: w * 0.25, t: h * 0.5, r: w * 0.75, b: h };
    }
    case 'diamond':
      return { l: w * 0.25, t: h * 0.25, r: w * 0.75, b: h * 0.75 };
    default:
      return undefined; // Use full bounding box
  }
}
