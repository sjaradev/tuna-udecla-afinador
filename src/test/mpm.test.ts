import { describe, expect, it } from 'vitest';
import { MpmDetector } from '../dsp/mpm';
import { centsBetween } from '../dsp/music';
import { mix, partials, sine, windows } from './signals';

const SR = 48000;
const K = 0.8;

/** Error máximo en cents sobre las ventanas de una señal. */
function maxAbsCents(
  signal: Float32Array,
  target: number,
  fMin: number,
): { maxErr: number; detected: number; total: number } {
  const det = new MpmDetector(SR, fMin);
  let maxErr = 0;
  let detected = 0;
  let total = 0;
  for (const win of windows(signal, det.windowSize, 2048)) {
    const c = det.detect(win, { fMin, fMax: Math.min(2000, target * 4) }, K);
    total++;
    if (c && c.clarity > 0.6) {
      detected++;
      maxErr = Math.max(maxErr, Math.abs(centsBetween(c.freq, target)));
    }
  }
  return { maxErr, detected, total };
}

describe('MPM — senos puros (T1/T2)', () => {
  it.each([82.41, 110, 146.83, 196, 246.94, 329.63, 440, 587.33, 987.77])(
    'detecta %f Hz con error ≤ 1 cent',
    (freq) => {
      const { maxErr, detected, total } = maxAbsCents(sine(freq, SR, 1), freq, 40);
      expect(detected / total).toBeGreaterThan(0.95);
      expect(maxErr).toBeLessThanOrEqual(1);
    },
  );

  it.each([41.2, 55, 65.4, 73.42])(
    'detecta graves %f Hz con error ≤ 2 cents',
    (freq) => {
      const { maxErr, detected, total } = maxAbsCents(sine(freq, SR, 1.5), freq, 40);
      expect(detected / total).toBeGreaterThan(0.9);
      expect(maxErr).toBeLessThanOrEqual(2);
    },
  );
});

describe('MPM — armónicos (T4/T5/T6)', () => {
  it('fundamental débil (0.3) con armónicos fuertes → octava correcta', () => {
    const sig = partials(110, [0.3, 1.0, 0.8, 0.5], SR, 1);
    const det = new MpmDetector(SR, 40);
    let ok = 0;
    let total = 0;
    for (const win of windows(sig, det.windowSize, 2048)) {
      const c = det.detect(win, { fMin: 40, fMax: 2000 }, K);
      if (c && c.clarity > 0.6) {
        total++;
        if (Math.abs(centsBetween(c.freq, 110)) < 50) ok++;
      }
    }
    expect(ok / total).toBeGreaterThanOrEqual(0.98);
  });

  it('2.º armónico 10 dB sobre la fundamental → fundamental correcta', () => {
    // amplitud 3.16 ≈ +10 dB sobre 1.0
    const sig = partials(196, [1.0, 3.16, 0.5, 0.3], SR, 1);
    const det = new MpmDetector(SR, 40);
    let ok = 0;
    let total = 0;
    for (const win of windows(sig, det.windowSize, 2048)) {
      const c = det.detect(win, { fMin: 40, fMax: 2000 }, K);
      if (c && c.clarity > 0.6) {
        total++;
        if (Math.abs(centsBetween(c.freq, 196)) < 50) ok++;
      }
    }
    expect(ok / total).toBeGreaterThanOrEqual(0.98);
  });

  it('mezcla 220 + 440 Hz → detecta 220 Hz', () => {
    const sig = mix(sine(220, SR, 1), sine(440, SR, 1, 0.4));
    const det = new MpmDetector(SR, 40);
    let ok = 0;
    let total = 0;
    for (const win of windows(sig, det.windowSize, 2048)) {
      const c = det.detect(win, { fMin: 40, fMax: 2000 }, K);
      if (c && c.clarity > 0.6) {
        total++;
        if (Math.abs(centsBetween(c.freq, 220)) < 50) ok++;
      }
    }
    expect(ok / total).toBeGreaterThanOrEqual(0.95);
  });
});
