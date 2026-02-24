/** English Metric Unit — 1 inch = 914400 EMU */
export type EMU = number;

export interface Point2D {
  x: EMU;
  y: EMU;
}

export interface Size2D {
  cx: EMU;
  cy: EMU;
}

export interface Rect {
  l: EMU;
  t: EMU;
  r: EMU;
  b: EMU;
}

export interface Transform2D {
  offset: Point2D;
  extents: Size2D;
  rot?: number; // degrees (60000ths in OOXML, converted)
  flipH?: boolean;
  flipV?: boolean;
}

export interface Margin {
  left: EMU;
  top: EMU;
  right: EMU;
  bottom: EMU;
}
