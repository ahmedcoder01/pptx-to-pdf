import { Fill } from './fill';
import { SlideElement } from './shape';

export interface Slide {
  index: number;
  elements: SlideElement[];
  background?: Fill;
  layoutIndex?: number;
  masterIndex?: number;
}
