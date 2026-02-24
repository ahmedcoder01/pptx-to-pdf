import { Transform2D } from '../types/common';
import { emuToPoints } from './emu';
import { degreesToRadians } from './emu';

export interface PdfTransform {
  x: number;    // points
  y: number;    // points
  width: number; // points
  height: number; // points
  rotation?: number; // degrees
  flipH?: boolean;
  flipV?: boolean;
}

/**
 * Convert a Transform2D (EMU coordinates) to PDF coordinates (points).
 */
export function toPdfTransform(transform: Transform2D): PdfTransform {
  return {
    x: emuToPoints(transform.offset.x),
    y: emuToPoints(transform.offset.y),
    width: emuToPoints(transform.extents.cx),
    height: emuToPoints(transform.extents.cy),
    rotation: transform.rot,
    flipH: transform.flipH,
    flipV: transform.flipV,
  };
}

/**
 * Apply rotation transform to a PDFKit document.
 * Rotates around the center of the shape.
 */
export function applyRotation(
  doc: any,
  x: number,
  y: number,
  width: number,
  height: number,
  rotation: number
): void {
  const cx = x + width / 2;
  const cy = y + height / 2;
  doc.translate(cx, cy);
  doc.rotate(rotation);
  doc.translate(-cx, -cy);
}

/**
 * Apply flip transforms to a PDFKit document.
 */
export function applyFlip(
  doc: any,
  x: number,
  y: number,
  width: number,
  height: number,
  flipH: boolean,
  flipV: boolean
): void {
  if (flipH) {
    doc.translate(x + width, y);
    doc.scale(-1, 1);
    doc.translate(-x, -y);
  }
  if (flipV) {
    doc.translate(x, y + height);
    doc.scale(1, -1);
    doc.translate(-x, -y);
  }
}

/**
 * Remap child coordinates within a group shape.
 */
export function remapGroupChild(
  childTransform: PdfTransform,
  groupTransform: PdfTransform,
  childOffset: { x: number; y: number },
  childExtents: { cx: number; cy: number }
): PdfTransform {
  const scaleX = groupTransform.width / emuToPoints(childExtents.cx);
  const scaleY = groupTransform.height / emuToPoints(childExtents.cy);
  const offX = emuToPoints(childOffset.x);
  const offY = emuToPoints(childOffset.y);

  return {
    x: groupTransform.x + (childTransform.x - offX) * scaleX,
    y: groupTransform.y + (childTransform.y - offY) * scaleY,
    width: childTransform.width * scaleX,
    height: childTransform.height * scaleY,
    rotation: childTransform.rotation,
    flipH: childTransform.flipH,
    flipV: childTransform.flipV,
  };
}
