import { describe, it, expect } from 'vitest';
import { buildPresetGeometry } from '../../src/geometry/path-builder';

describe('path builder', () => {
  it('builds a rectangle', () => {
    const paths = buildPresetGeometry('rect', 100, 50);
    expect(paths).toHaveLength(1);
    expect(paths[0].commands).toHaveLength(5); // moveTo + 3 lineTo + close
    expect(paths[0].commands[0]).toEqual({ type: 'moveTo', x: 0, y: 0 });
    expect(paths[0].commands[1]).toEqual({ type: 'lineTo', x: 100, y: 0 });
    expect(paths[0].commands[4]).toEqual({ type: 'close' });
  });

  it('builds a rounded rectangle', () => {
    const paths = buildPresetGeometry('roundRect', 200, 100);
    expect(paths).toHaveLength(1);
    // roundRect has lineTo and cubicBezTo commands
    const types = paths[0].commands.map((c) => c.type);
    expect(types).toContain('cubicBezTo');
    expect(types).toContain('close');
  });

  it('builds an ellipse', () => {
    const paths = buildPresetGeometry('ellipse', 100, 100);
    expect(paths).toHaveLength(1);
    // Ellipse is 4 cubic Bezier curves
    const bezCount = paths[0].commands.filter((c) => c.type === 'cubicBezTo').length;
    expect(bezCount).toBe(4);
  });

  it('builds a triangle', () => {
    const paths = buildPresetGeometry('triangle', 100, 100);
    expect(paths).toHaveLength(1);
    expect(paths[0].commands).toHaveLength(4); // moveTo + 2 lineTo + close
  });

  it('builds a diamond', () => {
    const paths = buildPresetGeometry('diamond', 100, 100);
    expect(paths).toHaveLength(1);
    expect(paths[0].commands).toHaveLength(5); // moveTo + 3 lineTo + close
  });

  it('builds a line', () => {
    const paths = buildPresetGeometry('line', 200, 0);
    expect(paths).toHaveLength(1);
    expect(paths[0].fill).toBe(false);
    expect(paths[0].stroke).toBe(true);
  });

  it('falls back to rectangle for unknown shapes', () => {
    const paths = buildPresetGeometry('unknownShape123', 100, 50);
    expect(paths).toHaveLength(1);
    expect(paths[0].commands[0]).toEqual({ type: 'moveTo', x: 0, y: 0 });
  });

  it('applies adjustment values to rounded rect', () => {
    const paths = buildPresetGeometry('roundRect', 200, 100, { adj: 50000 });
    // With adj=50000 (50%), the corner radius should be larger
    const firstBez = paths[0].commands.find((c) => c.type === 'cubicBezTo');
    expect(firstBez).toBeDefined();
  });
});
