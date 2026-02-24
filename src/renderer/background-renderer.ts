import { Fill } from '../types/fill';

/**
 * Render slide background onto the PDFKit document.
 */
export function renderBackground(
  doc: any,
  background: Fill | undefined,
  pageWidth: number,
  pageHeight: number
): void {
  if (!background) {
    doc.rect(0, 0, pageWidth, pageHeight).fill('#FFFFFF');
    return;
  }

  switch (background.type) {
    case 'solid': {
      const { r, g, b } = background.color;
      doc.rect(0, 0, pageWidth, pageHeight).fill(rgbToHexString(r, g, b));
      break;
    }

    case 'gradient':
      if (background.stops.length > 0) {
        const stop = background.stops[0];
        doc.rect(0, 0, pageWidth, pageHeight).fill(rgbToHexString(stop.color.r, stop.color.g, stop.color.b));
      } else {
        doc.rect(0, 0, pageWidth, pageHeight).fill('#FFFFFF');
      }
      break;

    case 'picture':
      // Render image background stretched to fill the page
      try {
        doc.image(background.imageData, 0, 0, {
          width: pageWidth,
          height: pageHeight,
        });
      } catch (e) {
        // Fallback to white if image fails
        doc.rect(0, 0, pageWidth, pageHeight).fill('#FFFFFF');
      }
      break;

    case 'none':
    default:
      doc.rect(0, 0, pageWidth, pageHeight).fill('#FFFFFF');
      break;
  }
}

function rgbToHexString(r: number, g: number, b: number): string {
  const toHex = (c: number) => Math.round(Math.max(0, Math.min(255, c))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
