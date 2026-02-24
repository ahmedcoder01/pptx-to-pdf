import { describe, it, expect } from 'vitest';
import { emuToPoints, emuToInches, pointsToEmu, inchesToEmu, ooxmlAngleToDegrees, hundredthsPointToPoints } from '../../src/geometry/emu';

describe('EMU conversions', () => {
  it('converts EMU to points', () => {
    expect(emuToPoints(12700)).toBe(1);
    expect(emuToPoints(914400)).toBe(72);
  });

  it('converts EMU to inches', () => {
    expect(emuToInches(914400)).toBe(1);
    expect(emuToInches(4572000)).toBe(5);
  });

  it('converts points to EMU', () => {
    expect(pointsToEmu(1)).toBe(12700);
    expect(pointsToEmu(72)).toBe(914400);
  });

  it('converts inches to EMU', () => {
    expect(inchesToEmu(1)).toBe(914400);
    expect(inchesToEmu(10)).toBe(9144000);
  });

  it('converts OOXML angles to degrees', () => {
    expect(ooxmlAngleToDegrees(5400000)).toBe(90);
    expect(ooxmlAngleToDegrees(0)).toBe(0);
    expect(ooxmlAngleToDegrees(21600000)).toBe(360);
  });

  it('converts hundredths of a point to points', () => {
    expect(hundredthsPointToPoints(1200)).toBe(12);
    expect(hundredthsPointToPoints(1800)).toBe(18);
  });
});
