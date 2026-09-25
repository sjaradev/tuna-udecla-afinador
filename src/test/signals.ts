/**
 * Generador de señales sintéticas para probar el DSP sin micrófono (spec §10.1).
 * PRNG con semilla (mulberry32) → tests deterministas.
 */

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function sine(
  freq: number,
  sr: number,
  durSec: number,
  amp = 0.5,
): Float32Array {
  const n = Math.floor(sr * durSec);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = amp * Math.sin((2 * Math.PI * freq * i) / sr);
  }
  return out;
}

/** Armónicos con amplitudes relativas y decaimiento exponencial opcional. */
export function partials(
  freq: number,
  amps: readonly number[],
  sr: number,
  durSec: number,
  decayPerSec = 0,
): Float32Array {
  const n = Math.floor(sr * durSec);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    let v = 0;
    for (let h = 0; h < amps.length; h++) {
      v += amps[h] * Math.sin(2 * Math.PI * freq * (h + 1) * t);
    }
    out[i] = decayPerSec > 0 ? v * Math.exp(-decayPerSec * t) : v;
  }
  return out;
}

export function whiteNoise(
  sr: number,
  durSec: number,
  amp: number,
  seed = 42,
): Float32Array {
  const rand = mulberry32(seed);
  const n = Math.floor(sr * durSec);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = (rand() * 2 - 1) * amp;
  return out;
}

export function silence(sr: number, durSec: number): Float32Array {
  return new Float32Array(Math.floor(sr * durSec));
}

export function mix(...signals: Float32Array[]): Float32Array {
  const n = Math.min(...signals.map((s) => s.length));
  const out = new Float32Array(n);
  for (const s of signals) {
    for (let i = 0; i < n; i++) out[i] += s[i];
  }
  return out;
}

/** Mezcla ruido a una relación señal/ruido dada (dB). */
export function withSnr(
  signal: Float32Array,
  sr: number,
  snrDb: number,
  seed = 7,
): Float32Array {
  let pSig = 0;
  for (let i = 0; i < signal.length; i++) pSig += signal[i] * signal[i];
  pSig /= signal.length;
  const pNoise = pSig / Math.pow(10, snrDb / 10);
  const noiseAmp = Math.sqrt(pNoise) * Math.sqrt(3); // ruido uniforme → rms = amp/√3
  return mix(signal, whiteNoise(sr, signal.length / sr, noiseAmp, seed));
}

/** Cuerda pulsada (Karplus-Strong), con ataque y decaimiento realistas. */
export function pluck(
  freq: number,
  sr: number,
  durSec: number,
  seed = 1,
): Float32Array {
  const rand = mulberry32(seed);
  const period = Math.max(2, Math.round(sr / freq));
  const delay = new Float64Array(period);
  for (let i = 0; i < period; i++) delay[i] = rand() * 2 - 1;
  const n = Math.floor(sr * durSec);
  const out = new Float32Array(n);
  let idx = 0;
  for (let i = 0; i < n; i++) {
    const cur = delay[idx];
    const nxt = delay[(idx + 1) % period];
    const v = 0.5 * (cur + nxt) * 0.996; // decaimiento
    delay[idx] = v;
    out[i] = cur * 0.5;
    idx = (idx + 1) % period;
  }
  return out;
}

/** Parciales con inharmonicidad de cuerda real: f_n = n·f·sqrt(1 + B·n²). */
export function inharmonic(
  freq: number,
  B: number,
  sr: number,
  durSec: number,
  numPartials = 6,
): Float32Array {
  const n = Math.floor(sr * durSec);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    let v = 0;
    for (let h = 1; h <= numPartials; h++) {
      const fh = h * freq * Math.sqrt(1 + B * h * h);
      v += (1 / h) * Math.sin(2 * Math.PI * fh * t);
    }
    out[i] = v * 0.5;
  }
  return out;
}

/** Corta una señal en ventanas de `size` con salto `hop`. */
export function* windows(
  signal: Float32Array,
  size: number,
  hop: number,
): Generator<Float32Array> {
  for (let start = 0; start + size <= signal.length; start += hop) {
    yield signal.subarray(start, start + size);
  }
}
