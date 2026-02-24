import PDFDocument from 'pdfkit';
import { Presentation } from '../types/presentation';
import { Slide } from '../types/slide';
import { SlideElement } from '../types/shape';
import { emuToPoints } from '../geometry/emu';
import { renderBackground } from './background-renderer';
import { renderShape } from './shape-renderer';
import { renderImage } from './image-renderer';
import { renderTable } from './table-renderer';
import { renderGroup } from './group-renderer';
import { renderConnector } from './connector-renderer';

export interface RenderOptions {
  slides?: number[];
  fontDirs?: string[];
  fontMap?: Record<string, string | Buffer>;
  dpi?: number;
  onWarning?: (msg: string) => void;
}

/**
 * Render a parsed presentation to a PDF buffer.
 */
export async function renderPdf(
  presentation: Presentation,
  options: RenderOptions = {}
): Promise<Buffer> {
  const pageWidth = emuToPoints(presentation.slideSize.cx);
  const pageHeight = emuToPoints(presentation.slideSize.cy);
  const fontDirs = options.fontDirs || [];
  const fontMap = options.fontMap || {};
  const warn = options.onWarning || (() => {});

  // Filter slides if specified
  const slidesToRender = options.slides
    ? presentation.slides.filter((_, i) => options.slides!.includes(i))
    : presentation.slides;

  if (slidesToRender.length === 0) {
    throw new Error('No slides to render');
  }

  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];

    const doc = new PDFDocument({
      size: [pageWidth, pageHeight],
      autoFirstPage: false,
      bufferPages: true,
      margin: 0,
    });

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    for (let i = 0; i < slidesToRender.length; i++) {
      const slide = slidesToRender[i];

      // Add page
      doc.addPage({ size: [pageWidth, pageHeight], margin: 0 });

      // Render background
      renderBackground(doc, slide.background, pageWidth, pageHeight);

      // Render elements in z-order (array order)
      for (const element of slide.elements) {
        try {
          renderElement(doc, element, fontDirs, fontMap);
        } catch (e) {
          warn(`Failed to render element "${element.name || 'unknown'}": ${e}`);
        }
      }
    }

    doc.end();
  });
}

/**
 * Render a single slide element (dispatches by type).
 * Exported for use by group-renderer.
 */
export function renderElement(
  doc: any,
  element: SlideElement,
  fontDirs: string[],
  fontMap: Record<string, string | Buffer>
): void {
  switch (element.type) {
    case 'shape':
      renderShape(doc, element, fontDirs, fontMap);
      break;
    case 'picture':
      renderImage(doc, element);
      break;
    case 'table':
      renderTable(doc, element, fontDirs, fontMap);
      break;
    case 'group':
      renderGroup(doc, element, fontDirs, fontMap);
      break;
    case 'connector':
      renderConnector(doc, element);
      break;
  }
}
