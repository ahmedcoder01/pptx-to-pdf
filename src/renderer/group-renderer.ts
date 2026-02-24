import { GroupShape } from '../types/shape';
import { toPdfTransform, applyRotation, applyFlip } from '../geometry/transform';
import { renderElement } from './pdf-renderer';

/**
 * Render a group shape — save state, apply group transform, render children, restore.
 */
export function renderGroup(
  doc: any,
  group: GroupShape,
  fontDirs: string[],
  fontMap: Record<string, string | Buffer>
): void {
  const t = toPdfTransform(group.transform);

  doc.save();

  // Apply group-level rotation
  if (t.rotation) {
    applyRotation(doc, t.x, t.y, t.width, t.height, t.rotation);
  }

  // Apply flips
  if (t.flipH || t.flipV) {
    applyFlip(doc, t.x, t.y, t.width, t.height, !!t.flipH, !!t.flipV);
  }

  // Apply coordinate remapping from child space to group space
  const chOffX = group.childOffset.x;
  const chOffY = group.childOffset.y;
  const chExtW = group.childExtents.cx;
  const chExtH = group.childExtents.cy;

  if (chExtW > 0 && chExtH > 0) {
    const scaleX = t.width / (chExtW / 12700); // childExtents are in EMU
    const scaleY = t.height / (chExtH / 12700);
    const offX = chOffX / 12700;
    const offY = chOffY / 12700;

    doc.translate(t.x - offX * scaleX, t.y - offY * scaleY);
    doc.scale(scaleX, scaleY);
  }

  // Render children
  for (const child of group.children) {
    renderElement(doc, child, fontDirs, fontMap);
  }

  doc.restore();
}
