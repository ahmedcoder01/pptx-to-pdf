import { EMU } from '../types/common';

const EMU_PER_INCH = 914400;
const EMU_PER_POINT = 12700;
const POINTS_PER_INCH = 72;

export function emuToPoints(emu: EMU): number {
  return emu / EMU_PER_POINT;
}

export function emuToInches(emu: EMU): number {
  return emu / EMU_PER_INCH;
}

export function pointsToEmu(points: number): EMU {
  return Math.round(points * EMU_PER_POINT);
}

export function inchesToEmu(inches: number): EMU {
  return Math.round(inches * EMU_PER_INCH);
}

export function emuToPixels(emu: EMU, dpi: number = 96): number {
  return (emu / EMU_PER_INCH) * dpi;
}

export function hundredthsPointToPoints(val: number): number {
  return val / 100;
}

/** Convert OOXML angle (60000ths of a degree) to degrees */
export function ooxmlAngleToDegrees(angle: number): number {
  return angle / 60000;
}

/** Convert degrees to radians */
export function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export { EMU_PER_INCH, EMU_PER_POINT, POINTS_PER_INCH };
