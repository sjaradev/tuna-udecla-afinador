/**
 * FFT radix-2 iterativa, con twiddles precalculados y búferes reutilizables.
 * Solo se instancia una vez por tamaño de ventana (spec §11).
 */
export class FFT {
  readonly size: number;
  private readonly levels: number;
  private readonly cosTable: Float64Array;
  private readonly sinTable: Float64Array;
  private readonly revTable: Uint32Array;

  constructor(size: number) {
    if (size < 2 || (size & (size - 1)) !== 0) {
      throw new Error(`FFT: el tamaño debe ser potencia de 2, recibido ${size}`);
    }
    this.size = size;
    this.levels = Math.log2(size);
    this.cosTable = new Float64Array(size / 2);
    this.sinTable = new Float64Array(size / 2);
    for (let i = 0; i < size / 2; i++) {
      this.cosTable[i] = Math.cos((-2 * Math.PI * i) / size);
      this.sinTable[i] = Math.sin((-2 * Math.PI * i) / size);
    }
    this.revTable = new Uint32Array(size);
    for (let i = 0; i < size; i++) {
      let rev = 0;
      for (let j = 0; j < this.levels; j++) {
        rev = (rev << 1) | ((i >>> j) & 1);
      }
      this.revTable[i] = rev;
    }
  }

  /** Transformada directa in-place sobre re/im. */
  forward(re: Float64Array, im: Float64Array): void {
    this.transform(re, im, false);
  }

  /** Transformada inversa in-place (normalizada por 1/N). */
  inverse(re: Float64Array, im: Float64Array): void {
    this.transform(re, im, true);
  }

  private transform(re: Float64Array, im: Float64Array, invert: boolean): void {
    const n = this.size;
    for (let i = 0; i < n; i++) {
      const j = this.revTable[i];
      if (j > i) {
        const tr = re[i];
        re[i] = re[j];
        re[j] = tr;
        const ti = im[i];
        im[i] = im[j];
        im[j] = ti;
      }
    }
    const sign = invert ? -1 : 1;
    for (let size = 2; size <= n; size *= 2) {
      const half = size / 2;
      const step = n / size;
      for (let i = 0; i < n; i += size) {
        for (let j = i, k = 0; j < i + half; j++, k += step) {
          const c = this.cosTable[k];
          const s = this.sinTable[k] * sign;
          const l = j + half;
          const tre = re[l] * c - im[l] * s;
          const tim = re[l] * s + im[l] * c;
          re[l] = re[j] - tre;
          im[l] = im[j] - tim;
          re[j] += tre;
          im[j] += tim;
        }
      }
    }
    if (invert) {
      for (let i = 0; i < n; i++) {
        re[i] /= n;
        im[i] /= n;
      }
    }
  }
}

export function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}
