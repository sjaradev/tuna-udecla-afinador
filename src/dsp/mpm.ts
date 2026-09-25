/**
 * MPM — McLeod Pitch Method sobre NSDF calculada por FFT (spec §5).
 *
 * La NSDF mide periodicidad temporal: todos los armónicos contribuyen al mismo
 * τ, por lo que la fundamental se detecta aunque sea espectralmente débil.
 * La FFT solo se usa para acelerar la autocorrelación.
 */
import { FFT, nextPow2 } from './fft';

export const N_MIN = 2048;
export const N_MAX = 8192;

export interface SearchRange {
  fMin: number;
  fMax: number;
}

export interface PitchCandidate {
  freq: number;
  /** Claridad NSDF del máximo elegido, 0..1. Es la `confidence` del sistema. */
  clarity: number;
  tau: number;
  /** Máximo global de la NSDF en el rango completo (para validación cruzada). */
  globalTau: number;
  globalClarity: number;
  /** Claridad NSDF en 2·τ0 y 3·τ0 (confirman subarmónicos reales); 0 si fuera de rango. */
  clarityAt2Tau: number;
  clarityAt3Tau: number;
  /** Claridad NSDF en τ0/2 (detecta fundamental por ENCIMA del rango de búsqueda). */
  clarityAtHalfTau: number;
}

export class MpmDetector {
  readonly sampleRate: number;
  readonly windowSize: number;
  private readonly fft: FFT;
  private readonly re: Float64Array;
  private readonly im: Float64Array;
  private readonly windowed: Float64Array;
  private readonly nsdf: Float64Array;

  constructor(sampleRate: number, fMin: number) {
    this.sampleRate = sampleRate;
    // Multiplicador 4 (no 2.5): con pocas períodos en ventana, los términos de
    // borde de r(τ) y m'(τ) no se cancelan y sesgan el máximo (medido: ~7
    // cents en 110 Hz con N=2048). Con ≥ ~9 períodos el sesgo cae bajo 1 cent.
    const n = Math.min(
      N_MAX,
      Math.max(N_MIN, nextPow2(Math.ceil((4 * sampleRate) / fMin))),
    );
    this.windowSize = n;
    this.fft = new FFT(2 * n);
    this.re = new Float64Array(2 * n);
    this.im = new Float64Array(2 * n);
    this.windowed = new Float64Array(n);
    this.nsdf = new Float64Array(n);
    // NOTA: se usa ventana rectangular a propósito. Una ventana (Hann, etc.)
    // sesga la posición del máximo de la NSDF hacia τ menores porque la
    // autocorrelación y m'(τ) decaen distinto con τ; el error crece en graves
    // (medido: ~12 cents en 82 Hz, ~47 cents en 41 Hz). MPM es un método de
    // dominio temporal y no necesita ventana.
  }

  /**
   * Detecta el pitch en `x` (debe tener exactamente `windowSize` muestras).
   * `range` restringe la búsqueda de máximos; `kClarity` es el umbral de
   * key maximum (spec §5.3). Devuelve null si no hay máximos en rango.
   */
  detect(
    x: Float32Array | Float64Array,
    range: SearchRange,
    kClarity: number,
  ): PitchCandidate | null {
    const n = this.windowSize;
    const sr = this.sampleRate;
    const { re, im, windowed, nsdf } = this;

    // 1. Ventana rectangular + zero-padding a 2N
    let sumSq = 0;
    for (let i = 0; i < n; i++) {
      const v = x[i];
      windowed[i] = v;
      sumSq += v * v;
      re[i] = v;
      im[i] = 0;
    }
    for (let i = n; i < 2 * n; i++) {
      re[i] = 0;
      im[i] = 0;
    }
    if (sumSq < 1e-12) return null;

    // 2. Autocorrelación vía FFT: r = IFFT(|X|²)
    this.fft.forward(re, im);
    for (let i = 0; i < 2 * n; i++) {
      const p = re[i] * re[i] + im[i] * im[i];
      re[i] = p;
      im[i] = 0;
    }
    this.fft.inverse(re, im); // re[τ] = r(τ)

    // 3. m'(τ) incremental (recurrencia O(N) del paper) y NSDF
    //    m'(τ) = Σ_{j=0}^{N-1-τ} (x_j² + x_{j+τ}²)
    //    m'(τ) = m'(τ-1) - x[N-τ]² - x[τ-1]²
    let mp = 2 * sumSq;
    nsdf[0] = 1;
    const eps = 1e-9 * sumSq;
    for (let tau = 1; tau < n; tau++) {
      const a = windowed[n - tau];
      const b = windowed[tau - 1];
      mp -= a * a + b * b;
      nsdf[tau] = mp > eps ? (2 * re[tau]) / mp : 0;
    }

    // 4. Máximos locales en el rango restringido + máximo global
    const tauMin = Math.max(2, Math.floor(sr / range.fMax));
    const tauMax = Math.min(n - 2, Math.ceil(sr / range.fMin));
    const gTauMin = Math.max(2, Math.floor(sr / 2000));
    const gTauMax = Math.min(n - 2, Math.ceil(sr / 40));

    let maxClarity = -1;
    let globalClarity = -1;
    let globalTau = 0;
    const maxima: number[] = [];
    for (let tau = gTauMin; tau <= gTauMax; tau++) {
      if (nsdf[tau] > nsdf[tau - 1] && nsdf[tau] >= nsdf[tau + 1]) {
        if (nsdf[tau] > globalClarity) {
          globalClarity = nsdf[tau];
          globalTau = tau;
        }
        if (tau >= tauMin && tau <= tauMax) {
          maxima.push(tau);
          if (nsdf[tau] > maxClarity) maxClarity = nsdf[tau];
        }
      }
    }
    if (maxima.length === 0) return null;

    // 5. Primer key maximum (menor τ con claridad ≥ k·max): anti-subarmónico
    const threshold = kClarity * maxClarity;
    let tau0 = maxima[maxima.length - 1];
    for (const tau of maxima) {
      if (nsdf[tau] >= threshold) {
        tau0 = tau;
        break;
      }
    }

    // 6. Interpolación parabólica (resolución sub-muestra)
    const y0 = nsdf[tau0 - 1];
    const y1 = nsdf[tau0];
    const y2 = nsdf[tau0 + 1];
    const denom = y0 - 2 * y1 + y2;
    let delta = 0;
    if (Math.abs(denom) > 1e-12) {
      delta = Math.max(-1, Math.min(1, (0.5 * (y0 - y2)) / denom));
    }
    const tauStar = tau0 + delta;
    const clarity = y1 - 0.25 * (y0 - y2) * delta;

    const at = (tau: number): number =>
      tau >= 1 && tau < n ? Math.max(0, Math.min(1, nsdf[Math.round(tau)])) : 0;

    return {
      freq: sr / tauStar,
      clarity: Math.max(0, Math.min(1, clarity)),
      tau: tauStar,
      globalTau,
      globalClarity: Math.max(0, Math.min(1, globalClarity)),
      clarityAt2Tau: at(2 * tauStar),
      clarityAt3Tau: at(3 * tauStar),
      clarityAtHalfTau: at(tauStar / 2),
    };
  }
}
