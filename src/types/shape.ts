import { Transform2D } from './common';
import { Fill } from './fill';
import { ResolvedColor } from './color';
import { TextBody } from './text';
import { GeometryPath } from './geometry';

export interface LineStyle {
  width?: number; // EMU
  color?: ResolvedColor;
  dashStyle?: 'solid' | 'dash' | 'dot' | 'dashDot' | 'lgDash' | 'lgDashDot' | 'sysDash' | 'sysDot';
  compoundType?: 'single' | 'double' | 'thickThin' | 'thinThick' | 'triple';
  capType?: 'flat' | 'round' | 'square';
  joinType?: 'bevel' | 'miter' | 'round';
}

export interface AutoShape {
  type: 'shape';
  name: string;
  transform: Transform2D;
  presetGeometry?: string; // e.g. 'rect', 'roundRect', 'ellipse'
  adjustValues?: Record<string, number>;
  geometryPaths?: GeometryPath[];
  fill?: Fill;
  line?: LineStyle;
  textBody?: TextBody;
  placeholderType?: string; // e.g. 'title', 'body', 'ctrTitle', 'subTitle'
  placeholderIdx?: number;
}

export interface Picture {
  type: 'picture';
  name: string;
  transform: Transform2D;
  imageData: Buffer;
  contentType: string;
  srcRect?: { l: number; t: number; r: number; b: number }; // crop percentages
}

export interface TableCell {
  text?: TextBody;
  fill?: Fill;
  borders?: {
    left?: LineStyle;
    right?: LineStyle;
    top?: LineStyle;
    bottom?: LineStyle;
  };
  gridSpan?: number;
  rowSpan?: number;
  hMerge?: boolean;
  vMerge?: boolean;
}

export interface Table {
  type: 'table';
  name: string;
  transform: Transform2D;
  grid: { widths: number[] }; // column widths in EMU
  rows: { height: number; cells: TableCell[] }[];
}

export interface GroupShape {
  type: 'group';
  name: string;
  transform: Transform2D;
  childOffset: { x: number; y: number };
  childExtents: { cx: number; cy: number };
  children: SlideElement[];
}

export interface Connector {
  type: 'connector';
  name: string;
  transform: Transform2D;
  presetGeometry?: string;
  line?: LineStyle;
}

export type SlideElement = AutoShape | Picture | Table | GroupShape | Connector;
