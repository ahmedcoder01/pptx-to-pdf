import { Size2D } from './common';
import { Slide } from './slide';
import { RunProperties, ParagraphProperties } from './text';

export interface ThemeColorScheme {
  dk1: string; // hex RGB
  lt1: string;
  dk2: string;
  lt2: string;
  accent1: string;
  accent2: string;
  accent3: string;
  accent4: string;
  accent5: string;
  accent6: string;
  hlink: string;
  folHlink: string;
  [key: string]: string;
}

export interface ThemeFontScheme {
  majorLatin: string; // e.g. 'Calibri Light'
  minorLatin: string; // e.g. 'Calibri'
}

export interface Theme {
  colorScheme: ThemeColorScheme;
  fontScheme: ThemeFontScheme;
}

export interface DefaultTextStyle {
  defPPr?: ParagraphProperties;
  levels?: Record<number, { pPr?: ParagraphProperties; rPr?: RunProperties }>;
}

export interface MasterTextStyles {
  titleStyle?: DefaultTextStyle;
  bodyStyle?: DefaultTextStyle;
  otherStyle?: DefaultTextStyle;
}

export interface Presentation {
  slideSize: Size2D;
  slides: Slide[];
  theme: Theme;
  defaultTextStyle?: DefaultTextStyle;
}
