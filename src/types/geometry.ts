export type PathCommandType = 'moveTo' | 'lineTo' | 'cubicBezTo' | 'arcTo' | 'close';

export interface MoveToCommand {
  type: 'moveTo';
  x: number;
  y: number;
}

export interface LineToCommand {
  type: 'lineTo';
  x: number;
  y: number;
}

export interface CubicBezToCommand {
  type: 'cubicBezTo';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  x: number;
  y: number;
}

export interface ArcToCommand {
  type: 'arcTo';
  rx: number;
  ry: number;
  startAngle: number;
  swingAngle: number;
}

export interface CloseCommand {
  type: 'close';
}

export type PathCommand =
  | MoveToCommand
  | LineToCommand
  | CubicBezToCommand
  | ArcToCommand
  | CloseCommand;

export interface GeometryPath {
  commands: PathCommand[];
  fill?: boolean;
  stroke?: boolean;
  width?: number;
  height?: number;
}

export interface PresetGeometryDef {
  name: string;
  avLst?: Record<string, number>; // adjustment values
  paths: GeometryPath[];
  textRect?: { l: number; t: number; r: number; b: number };
}
