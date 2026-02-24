import { Picture } from '../types/shape';
import { toPdfTransform, applyRotation, applyFlip } from '../geometry/transform';

/**
 * Render a picture onto the PDFKit document.
 */
export function renderImage(doc: any, picture: Picture): void {
  const t = toPdfTransform(picture.transform);

  if (t.width <= 0 || t.height <= 0) return;

  doc.save();

  // Apply rotation
  if (t.rotation) {
    applyRotation(doc, t.x, t.y, t.width, t.height, t.rotation);
  }

  // Apply flips
  if (t.flipH || t.flipV) {
    applyFlip(doc, t.x, t.y, t.width, t.height, !!t.flipH, !!t.flipV);
  }

  try {
    // Embed image
    const options: any = {
      fit: [t.width, t.height],
      align: 'center',
      valign: 'center',
    };

    // Apply crop if specified
    if (picture.srcRect) {
      // srcRect values are in percentages * 1000
      // PDFKit doesn't support cropping natively, so we use clip
      const cropL = (picture.srcRect.l / 100000) * t.width;
      const cropT = (picture.srcRect.t / 100000) * t.height;
      const cropR = (picture.srcRect.r / 100000) * t.width;
      const cropB = (picture.srcRect.b / 100000) * t.height;

      const clipW = t.width - cropL - cropR;
      const clipH = t.height - cropT - cropB;

      if (clipW > 0 && clipH > 0) {
        doc.rect(t.x + cropL, t.y + cropT, clipW, clipH).clip();
      }
    }

    doc.image(picture.imageData, t.x, t.y, {
      width: t.width,
      height: t.height,
    });
  } catch (e) {
    // Silently skip unsupported image formats
  }

  doc.restore();
}
