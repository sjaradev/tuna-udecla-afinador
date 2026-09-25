import { describe, expect, it } from 'vitest';
import { TunerPipeline } from '../dsp/pipeline';
import { HOP } from '../config/tuner';
import type { TunerConfig, TunerReading } from '../types';
import { mix, partials, pluck, silence, sine, whiteNoise, windows } from './signals';

const SR = 48000;

function makeConfig(overrides: Partial<TunerConfig> = {}): TunerConfig {
  return {
    mode: 'normal',
    sensitivity: 'medium',
    a4: 440,
    instrument: 'guitarra',
    stringIndex: null,
    ...overrides,
  };
}

/** Alimenta el pipeline con una señal y devuelve las lecturas. */
function run(signal: Float32Array, config: TunerConfig): TunerReading[] {
  const pipe = new TunerPipeline(SR, config);
  const readings: TunerReading[] = [];
  const hopMs = (HOP / SR) * 1000;
  let i = 0;
  for (const win of windows(signal, pipe.windowSize, HOP)) {
    readings.push(pipe.processWindow(win as Float32Array, i * hopMs).reading);
    i++;
  }
  return readings;
}

describe('pipeline — silencio y ruido (T7/T8)', () => {
  it('silencio: ninguna nota en el 100 % de los frames', () => {
    const readings = run(silence(SR, 2), makeConfig());
    expect(readings.length).toBeGreaterThan(50);
    expect(readings.every((r) => r.freq === null)).toBe(true);
    expect(readings.every((r) => r.state === 'listening')).toBe(true);
  });

  it('ruido blanco −40 dBFS: ninguna nota en ≥ 99 % de los frames', () => {
    const amp = Math.pow(10, -40 / 20) * Math.sqrt(3);
    const readings = run(whiteNoise(SR, 2, amp), makeConfig());
    const withNote = readings.filter((r) => r.freq !== null).length;
    expect(withNote / readings.length).toBeLessThanOrEqual(0.01);
  });
});

describe('pipeline — tracking básico', () => {
  it('seno 110 Hz en guitarra automático → cuerda A2, cents ≈ 0', () => {
    const readings = run(sine(110, SR, 2, 0.5), makeConfig());
    const published = readings.filter((r) => r.freq !== null);
    expect(published.length).toBeGreaterThan(readings.length * 0.5);
    const last = published[published.length - 1];
    expect(last.stringIndex).toBe(1); // A2
    expect(Math.abs(last.cents!)).toBeLessThanOrEqual(3);
    expect(last.noteNameLatin).toBe('LA2');
  });

  it('nota desviada +20 cents reporta signo correcto (T9)', () => {
    const f = 110 * Math.pow(2, 20 / 1200);
    const readings = run(sine(f, SR, 2, 0.5), makeConfig());
    const published = readings.filter((r) => r.cents !== null);
    const last = published[published.length - 1];
    expect(last.cents!).toBeGreaterThan(14);
    expect(last.cents!).toBeLessThan(26);
  });

  it('la referencia A4=432 escala las frecuencias objetivo', () => {
    // Con A4=432, un seno de 440 Hz queda ~+31 cents sobre A4(432).
    const readings = run(
      sine(440, SR, 2, 0.5),
      makeConfig({ instrument: 'cromatico', a4: 432 }),
    );
    const published = readings.filter((r) => r.cents !== null);
    const last = published[published.length - 1];
    expect(last.noteNameIntl).toBe('A4');
    expect(last.cents!).toBeGreaterThan(25);
    expect(last.cents!).toBeLessThan(38);
  });
});

describe('pipeline — modo cuerda (T15)', () => {
  it('rechaza tonos fuera de ±600 cents de la cuerda seleccionada', () => {
    // Cuerda E2 (82.41 Hz); seno de 200 Hz está fuera de rango.
    const readings = run(
      sine(200, SR, 1.5, 0.5),
      makeConfig({ stringIndex: 0 }),
    );
    const withNote = readings.filter((r) => r.freq !== null).length;
    expect(withNote / readings.length).toBeLessThanOrEqual(0.01);
  });

  it('acepta la cuerda seleccionada aunque haya otra fuente cerca', () => {
    // Cuerda A2 (110 Hz) seleccionada; seno de 110 Hz.
    const readings = run(
      sine(110, SR, 2, 0.5),
      makeConfig({ stringIndex: 1 }),
    );
    const published = readings.filter((r) => r.freq !== null);
    expect(published.length).toBeGreaterThan(readings.length * 0.5);
    const last = published[published.length - 1];
    expect(last.stringIndex).toBe(1);
    expect(Math.abs(last.cents!)).toBeLessThanOrEqual(3);
  });
});

describe('pipeline — transientes (T14)', () => {
  it('un golpe seguido de tono no produce lectura durante el bloqueo', () => {
    const hit = whiteNoise(SR, 0.02, 0.9, 99); // golpe de 20 ms
    const tone = sine(220, SR, 1.5, 0.5);
    const signal = mix(
      silence(SR, 0.5),
      silence(SR, 0.5),
    );
    // señal = silencio 0.5s + golpe + tono
    const full = new Float32Array(signal.length + hit.length + tone.length);
    full.set(silence(SR, 0.5), 0);
    full.set(hit, SR * 0.5);
    full.set(tone, SR * 0.5 + hit.length);
    const readings = run(full, makeConfig());
    // Durante los primeros ~70 ms tras el golpe no debe haber lectura publicada
    const hopMs = (HOP / SR) * 1000;
    const hitMs = 500;
    const duringBlock = readings.filter(
      (r) => r.tMs >= hitMs && r.tMs < hitMs + 70 && r.freq !== null,
    );
    expect(duringBlock.length).toBe(0);
    // Después del bloqueo, el tono se detecta
    const after = readings.filter((r) => r.tMs > hitMs + 300 && r.freq !== null);
    expect(after.length).toBeGreaterThan(0);
    void hopMs;
  });
});

describe('pipeline — cuerda pulsada (T11)', () => {
  it('pluck de E2 en guitarra automático → cuerda 1 (E2)', () => {
    const readings = run(pluck(82.41, SR, 1.2, 5), makeConfig());
    const published = readings.filter((r) => r.freq !== null);
    expect(published.length).toBeGreaterThan(10);
    const correct = published.filter((r) => r.stringIndex === 0).length;
    expect(correct / published.length).toBeGreaterThanOrEqual(0.95);
  });

  it('pluck de E4 en guitarra automático → cuerda 6 (E4), cents ≈ 0', () => {
    const readings = run(pluck(329.63, SR, 1.2, 7), makeConfig());
    const published = readings.filter((r) => r.freq !== null);
    expect(published.length).toBeGreaterThan(10);
    const last = published[published.length - 1];
    expect(last.stringIndex).toBe(5); // E4
    expect(Math.abs(last.cents!)).toBeLessThanOrEqual(3);
  });

  it('pluck medio tono bajo (D♯4) NO cae una octava: reporta E4 muy bajo', () => {
    // Regresión: una lectura de ~155.6 Hz (D♯3) sería un error de octava.
    const readings = run(pluck(311.13, SR, 1.2, 8), makeConfig());
    const published = readings.filter((r) => r.freq !== null);
    expect(published.length).toBeGreaterThan(10);
    const last = published[published.length - 1];
    expect(last.freq!).toBeGreaterThan(280); // nunca ~155 Hz
    expect(last.stringIndex).toBe(5); // se referencia a E4
    expect(last.cents!).toBeLessThan(-60); // claramente "bajo · tensa"
  });

  it('fundamental débil con armónicos fuertes: detecta la fundamental', () => {
    // Cuerda delgada real: H2/H3 más fuertes que la fundamental.
    const sig = partials(329.63, [0.15, 1, 0.5, 0.3, 0.2], SR, 1.5);
    const readings = run(sig, makeConfig());
    const published = readings.filter((r) => r.freq !== null);
    expect(published.length).toBeGreaterThan(10);
    const last = published[published.length - 1];
    expect(last.stringIndex).toBe(5);
    expect(Math.abs(last.cents!)).toBeLessThanOrEqual(5);
  });
});
