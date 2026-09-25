import { describe, expect, it } from 'vitest';
import { PitchStabilizer } from '../dsp/stabilizer';
import { MODE_PARAMS, TUNED_MS } from '../config/tuner';
import { mulberry32 } from './signals';

const DT = 21.33; // hop de 1024 @ 48 kHz, en ms

function makeStabilizer() {
  return new PitchStabilizer(MODE_PARAMS.normal, TUNED_MS.normal);
}

describe('estabilizador — suavizado (T12)', () => {
  it('jitter de ±3 cents → desviación estándar mostrada < 1 cent', () => {
    const stab = makeStabilizer();
    const rand = mulberry32(1234);
    const outputs: number[] = [];
    for (let i = 0; i < 150; i++) {
      const jitterSemis = (rand() * 2 - 1) * 0.03; // ±3 cents
      const out = stab.pushValid(69 + jitterSemis, 69, 'n69', i * DT);
      if (i >= 30 && out.published && out.centsDisplay !== null) {
        outputs.push(out.centsDisplay);
      }
    }
    expect(outputs.length).toBeGreaterThan(80);
    const mean = outputs.reduce((a, b) => a + b, 0) / outputs.length;
    const variance =
      outputs.reduce((a, b) => a + (b - mean) ** 2, 0) / outputs.length;
    expect(Math.sqrt(variance)).toBeLessThan(1);
    expect(Math.abs(mean)).toBeLessThan(1);
  });
});

describe('estabilizador — estado "Afinado" (T13)', () => {
  it('se alcanza ~400 ms después de la primera lectura publicada', () => {
    const stab = makeStabilizer();
    let firstPublishedMs: number | null = null;
    let tunedMs: number | null = null;
    for (let i = 0; i < 100; i++) {
      const t = i * DT;
      const out = stab.pushValid(69, 69, 'n69', t);
      if (out.published && firstPublishedMs === null) firstPublishedMs = t;
      if (out.tuned && tunedMs === null) {
        tunedMs = t;
        break;
      }
    }
    expect(firstPublishedMs).not.toBeNull();
    expect(tunedMs).not.toBeNull();
    const elapsed = tunedMs! - firstPublishedMs!;
    expect(elapsed).toBeGreaterThanOrEqual(300);
    expect(elapsed).toBeLessThanOrEqual(500);
  });

  it('sale de "Afinado" si la desviación supera 7 cents por 150 ms', () => {
    const stab = makeStabilizer();
    let t = 0;
    for (let i = 0; i < 60; i++, t += DT) stab.pushValid(69, 69, 'n69', t);
    // Desviar +10 cents (0.1 semitonos) de forma sostenida
    let exited = false;
    for (let i = 0; i < 30; i++, t += DT) {
      const out = stab.pushValid(69.1, 69, 'n69', t);
      if (!out.tuned) {
        exited = true;
        break;
      }
    }
    expect(exited).toBe(true);
  });
});

describe('estabilizador — pitch lock y cambio de nota', () => {
  it('un outlier aislado de +200 cents se rechaza', () => {
    const stab = makeStabilizer();
    let t = 0;
    for (let i = 0; i < 30; i++, t += DT) stab.pushValid(69, 69, 'n69', t);
    const before = stab.pushValid(69, 69, 'n69', (t += DT));
    const outlier = stab.pushValid(71, 71, 'n71', (t += DT));
    expect(outlier.rejectedByLock).toBe(true);
    expect(outlier.centsDisplay).toBe(before.centsDisplay);
    const after = stab.pushValid(69, 69, 'n69', (t += DT));
    expect(Math.abs(after.centsDisplay!)).toBeLessThan(5);
  });

  it('cambio de nota real (A4 → E4) sin notas intermedias falsas', () => {
    const stab = makeStabilizer();
    let t = 0;
    for (let i = 0; i < 40; i++, t += DT) stab.pushValid(69, 69, 'n69', t);
    const refs = new Set<number | null>();
    for (let i = 0; i < 60; i++, t += DT) {
      const out = stab.pushValid(64, 64, 'n64', t);
      if (out.published) refs.add(out.refMidi);
    }
    // Solo la referencia original o la nueva; nunca una intermedia
    expect([...refs].every((r) => r === 69 || r === 64)).toBe(true);
    expect(refs.has(64)).toBe(true);
  });

  it('salto de octava exige frames sostenidos antes de aceptarse', () => {
    const stab = makeStabilizer();
    let t = 0;
    for (let i = 0; i < 40; i++, t += DT) stab.pushValid(57, 57, 'n57', t);
    let acceptedAt: number | null = null;
    for (let i = 0; i < 40; i++, t += DT) {
      const out = stab.pushValid(69, 69, 'n69', t);
      if (out.published && out.refMidi === 69 && acceptedAt === null) {
        acceptedAt = i;
      }
    }
    expect(acceptedAt).not.toBeNull();
    // Debe tardar: relock (4) + minValid (3) + octaveFrames (8) ≈ 15+ frames
    expect(acceptedAt!).toBeGreaterThanOrEqual(10);
  });
});

describe('estabilizador — pérdida de señal', () => {
  it('retiene la última lectura 2000 ms y luego vuelve a "Escuchando"', () => {
    const stab = makeStabilizer();
    let t = 0;
    for (let i = 0; i < 40; i++, t += DT) stab.pushValid(69, 69, 'n69', t);
    const held = stab.pushInvalid((t += 1500));
    expect(held.published).toBe(true);
    const gone = stab.pushInvalid((t += 600)); // 2100 ms sin señal
    expect(gone.published).toBe(false);
  });
});
