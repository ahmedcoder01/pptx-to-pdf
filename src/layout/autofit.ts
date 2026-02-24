import { TextBody, AutofitType } from '../types/text';
import { layoutText, TextLayoutResult } from './text-layout';
import { emuToPoints } from '../geometry/emu';

/**
 * Apply autofit logic: shrink text to fit within the shape bounds.
 * Returns a scale factor (0-1) to apply to font sizes.
 */
export function computeAutofitScale(
  textBody: TextBody,
  boxWidthEmu: number,
  boxHeightEmu: number,
  fontDirs: string[] = [],
  fontMap: Record<string, string | Buffer> = {}
): number {
  if (textBody.bodyProperties.autofit !== 'shrink') {
    return 1.0;
  }

  const margin = textBody.bodyProperties.margin || {
    left: 91440,
    top: 45720,
    right: 91440,
    bottom: 45720,
  };

  const availHeight = emuToPoints(boxHeightEmu) - emuToPoints(margin.top) - emuToPoints(margin.bottom);

  // Binary search for the largest scale that fits
  let lo = 0.5; // Don't shrink below 50%
  let hi = 1.0;
  let bestScale = 1.0;

  for (let i = 0; i < 10; i++) {
    const mid = (lo + hi) / 2;
    const scaledBody = scaleTextBody(textBody, mid);
    const layout = layoutText(scaledBody, boxWidthEmu, boxHeightEmu, fontDirs, fontMap);

    if (layout.totalHeight <= availHeight) {
      bestScale = mid;
      lo = mid;
    } else {
      hi = mid;
    }
  }

  return bestScale;
}

function scaleTextBody(textBody: TextBody, scale: number): TextBody {
  return {
    ...textBody,
    paragraphs: textBody.paragraphs.map((p) => ({
      ...p,
      runs: p.runs.map((r) => ({
        ...r,
        properties: {
          ...r.properties,
          fontSize: r.properties.fontSize ? Math.round(r.properties.fontSize * scale) : undefined,
        },
      })),
    })),
  };
}
