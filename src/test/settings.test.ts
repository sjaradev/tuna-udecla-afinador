import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SETTINGS,
  loadSettings,
  validateSettings,
} from '../state/settings';

function mockStorage(value: string | null): Pick<Storage, 'getItem'> {
  return { getItem: () => value };
}

describe('settings', () => {
  it('defaults cuando no hay nada guardado', () => {
    expect(loadSettings(mockStorage(null))).toEqual(DEFAULT_SETTINGS);
  });

  it('roundtrip de valores válidos', () => {
    const saved = {
      ...DEFAULT_SETTINGS,
      a4Reference: 442,
      noiseMode: 'noisy',
      notation: 'international',
      sensitivity: 'high',
      lastInstrument: 'bandurria',
      lastString: 3,
      onboardingDone: true,
    };
    expect(loadSettings(mockStorage(JSON.stringify(saved)))).toEqual(saved);
  });

  it('valores corruptos caen a defaults', () => {
    const corrupt = {
      a4Reference: 999, // fuera de 430–450
      noiseMode: 'ultra',
      notation: 42,
      sensitivity: null,
      vibrateOnTune: 'yes',
      lastInstrument: 'ukelele',
      lastString: 99,
      onboardingDone: 1,
    };
    expect(validateSettings(corrupt)).toEqual(DEFAULT_SETTINGS);
  });

  it('JSON inválido → defaults', () => {
    expect(loadSettings(mockStorage('{not json'))).toEqual(DEFAULT_SETTINGS);
  });

  it('A4 en los bordes 430 y 450 es válida', () => {
    expect(validateSettings({ a4Reference: 430 }).a4Reference).toBe(430);
    expect(validateSettings({ a4Reference: 450 }).a4Reference).toBe(450);
    expect(validateSettings({ a4Reference: 429.9 }).a4Reference).toBe(440);
  });
});
