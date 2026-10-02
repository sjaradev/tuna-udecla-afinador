import { describe, expect, it } from 'vitest';
import { centsToAngle } from '../hooks/useNeedle';

describe('centsToAngle', () => {
  it('mapea 0 → 0° y ±50 → ±60°', () => {
    expect(centsToAngle(0)).toBe(0);
    expect(centsToAngle(50)).toBe(60);
    expect(centsToAngle(-50)).toBe(-60);
  });

  it('recorta fuera de ±50 cents', () => {
    expect(centsToAngle(200)).toBe(60);
    expect(centsToAngle(-200)).toBe(-60);
  });
});
