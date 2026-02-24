import { ResolvedColor } from './color';
import { ColorSource } from './color';
import { Fill } from './fill';
import { Margin } from './common';

export interface RunProperties {
  fontFamily?: string;
  fontSize?: number; // in hundredths of a point (e.g. 1200 = 12pt)
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  color?: ColorSource;
  resolvedColor?: ResolvedColor;
  baseline?: number; // superscript (+) / subscript (-)
  spacing?: number; // character spacing in EMU
  lang?: string;
}

export interface TextRun {
  text: string;
  properties: RunProperties;
  isLineBreak?: boolean;
}

export type TextAlignment = 'left' | 'center' | 'right' | 'justify' | 'distributed';
export type VerticalAlignment = 'top' | 'middle' | 'bottom';

export interface BulletProperties {
  type: 'char' | 'autoNum' | 'none';
  char?: string;
  autoNumType?: string;
  fontSize?: number;
  color?: ColorSource;
  resolvedColor?: ResolvedColor;
  font?: string;
}

export interface ParagraphProperties {
  alignment?: TextAlignment;
  level?: number; // indent level (0-8)
  indent?: number; // EMU
  marginLeft?: number; // EMU
  lineSpacing?: number; // percentage (e.g. 100000 = single)
  spaceBefore?: number; // hundredths of a point
  spaceAfter?: number;
  bullet?: BulletProperties;
  defaultRunProps?: RunProperties;
}

export interface Paragraph {
  runs: TextRun[];
  properties: ParagraphProperties;
}

export type AutofitType = 'none' | 'shrink' | 'resize';

export interface TextBody {
  paragraphs: Paragraph[];
  bodyProperties: {
    anchor?: VerticalAlignment;
    anchorCtr?: boolean;
    wrap?: 'square' | 'none';
    autofit?: AutofitType;
    margin?: Margin;
    numCols?: number;
    rot?: number;
  };
}
