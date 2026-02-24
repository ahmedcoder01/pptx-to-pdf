import { ResolvedColor, GradientStop } from './color';

export interface NoFill {
  type: 'none';
}

export interface SolidFill {
  type: 'solid';
  color: ResolvedColor;
}

export interface GradientFill {
  type: 'gradient';
  stops: GradientStop[];
  angle?: number; // degrees
  linear?: boolean;
}

export interface PictureFill {
  type: 'picture';
  imageData: Buffer;
  contentType: string;
  stretch?: boolean;
}

export type Fill = NoFill | SolidFill | GradientFill | PictureFill;
