import { Table, TableCell, LineStyle } from '../types/shape';
import { toPdfTransform, PdfTransform } from '../geometry/transform';
import { emuToPoints } from '../geometry/emu';
import { renderTextBody } from './text-renderer';

/**
 * Render a table onto the PDFKit document.
 */
export function renderTable(
  doc: any,
  table: Table,
  fontDirs: string[],
  fontMap: Record<string, string | Buffer>
): void {
  const t = toPdfTransform(table.transform);
  if (t.width <= 0 || t.height <= 0) return;

  const colWidths = table.grid.widths.map(emuToPoints);
  let currentY = t.y;

  for (const row of table.rows) {
    const rowHeight = emuToPoints(row.height);
    let currentX = t.x;

    for (let ci = 0; ci < row.cells.length; ci++) {
      const cell = row.cells[ci];
      const cellWidth = colWidths[ci] || 0;

      if (cell.hMerge || cell.vMerge) {
        currentX += cellWidth;
        continue;
      }

      // Calculate actual cell width (accounting for gridSpan)
      let actualWidth = cellWidth;
      if (cell.gridSpan && cell.gridSpan > 1) {
        for (let s = 1; s < cell.gridSpan && ci + s < colWidths.length; s++) {
          actualWidth += colWidths[ci + s];
        }
      }

      // Render cell background
      if (cell.fill && cell.fill.type === 'solid') {
        const { r, g, b, a } = cell.fill.color;
        doc.rect(currentX, currentY, actualWidth, rowHeight)
           .fillColor(rgbToHexString(r, g, b), a)
           .fill();
      }

      // Render cell text
      if (cell.text) {
        const cellTransform: PdfTransform = {
          x: currentX,
          y: currentY,
          width: actualWidth,
          height: rowHeight,
        };
        renderTextBody(doc, cell.text, cellTransform, fontDirs, fontMap);
      }

      // Render cell borders
      renderCellBorders(doc, currentX, currentY, actualWidth, rowHeight, cell.borders);

      currentX += cellWidth;
    }

    currentY += rowHeight;
  }
}

function renderCellBorders(
  doc: any,
  x: number,
  y: number,
  w: number,
  h: number,
  borders?: {
    left?: LineStyle;
    right?: LineStyle;
    top?: LineStyle;
    bottom?: LineStyle;
  }
): void {
  // Default thin border
  const defaultColor = '#D0D0D0';
  const defaultWidth = 0.5;

  doc.save();

  // Top border
  const topLine = borders?.top;
  doc.moveTo(x, y).lineTo(x + w, y)
    .lineWidth(topLine?.width ? emuToPoints(topLine.width) : defaultWidth)
    .strokeColor(topLine?.color ? rgbToHexString(topLine.color.r, topLine.color.g, topLine.color.b) : defaultColor)
    .stroke();

  // Bottom border
  const bottomLine = borders?.bottom;
  doc.moveTo(x, y + h).lineTo(x + w, y + h)
    .lineWidth(bottomLine?.width ? emuToPoints(bottomLine.width) : defaultWidth)
    .strokeColor(bottomLine?.color ? rgbToHexString(bottomLine.color.r, bottomLine.color.g, bottomLine.color.b) : defaultColor)
    .stroke();

  // Left border
  const leftLine = borders?.left;
  doc.moveTo(x, y).lineTo(x, y + h)
    .lineWidth(leftLine?.width ? emuToPoints(leftLine.width) : defaultWidth)
    .strokeColor(leftLine?.color ? rgbToHexString(leftLine.color.r, leftLine.color.g, leftLine.color.b) : defaultColor)
    .stroke();

  // Right border
  const rightLine = borders?.right;
  doc.moveTo(x + w, y).lineTo(x + w, y + h)
    .lineWidth(rightLine?.width ? emuToPoints(rightLine.width) : defaultWidth)
    .strokeColor(rightLine?.color ? rgbToHexString(rightLine.color.r, rightLine.color.g, rightLine.color.b) : defaultColor)
    .stroke();

  doc.restore();
}

function rgbToHexString(r: number, g: number, b: number): string {
  const toHex = (c: number) => Math.round(Math.max(0, Math.min(255, c))).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
