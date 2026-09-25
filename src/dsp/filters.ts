/** Biquads paso alto / paso bajo con fórmulas RBJ (spec §4.1). */

export class Biquad {
  private b0 = 1;
  private b1 = 0;
  private b2 = 0;
  private a1 = 0;
  private a2 = 0;
  private x1 = 0;
  private x2 = 0;
  private y1 = 0;
  private y2 = 0;

  static highpass(fc: number, sr: number, Q = Math.SQRT1_2): Biquad {
    const b = new Biquad();
    const w0 = (2 * Math.PI * fc) / sr;
    const cw = Math.cos(w0);
    const sw = Math.sin(w0);
    const aq = sw / (2 * Q);
    const a0 = 1 + aq;
    b.b0 = (1 + cw) / 2 / a0;
    b.b1 = -(1 + cw) / a0;
    b.b2 = (1 + cw) / 2 / a0;
    b.a1 = (-2 * cw) / a0;
    b.a2 = (1 - aq) / a0;
    return b;
  }

  static lowpass(fc: number, sr: number, Q = Math.SQRT1_2): Biquad {
    const b = new Biquad();
    const w0 = (2 * Math.PI * fc) / sr;
    const cw = Math.cos(w0);
    const sw = Math.sin(w0);
    const aq = sw / (2 * Q);
    const a0 = 1 + aq;
    b.b0 = (1 - cw) / 2 / a0;
    b.b1 = (1 - cw) / a0;
    b.b2 = (1 - cw) / 2 / a0;
    b.a1 = (-2 * cw) / a0;
    b.a2 = (1 - aq) / a0;
    return b;
  }

  processInPlace(x: Float32Array | Float64Array): void {
    for (let i = 0; i < x.length; i++) {
      const xi = x[i];
      const y =
        this.b0 * xi +
        this.b1 * this.x1 +
        this.b2 * this.x2 -
        this.a1 * this.y1 -
        this.a2 * this.y2;
      this.x2 = this.x1;
      this.x1 = xi;
      this.y2 = this.y1;
      this.y1 = y;
      x[i] = y;
    }
  }

  reset(): void {
    this.x1 = this.x2 = this.y1 = this.y2 = 0;
  }
}

/**
 * Cadena HP + LP según el rango de búsqueda activo (spec §4.1):
 * HP en 0.6·fMin, LP en clamp(8·fMax, 800, 5000).
 */
export class FilterChain {
  private hp: Biquad | null = null;
  private lp: Biquad | null = null;
  private key = '';

  configure(fMin: number, fMax: number, sr: number): void {
    const fcHp = Math.max(20, 0.6 * fMin);
    const fcLp = Math.min(Math.max(8 * fMax, 800), 5000);
    const key = `${fcHp.toFixed(1)}|${fcLp.toFixed(1)}|${sr}`;
    if (key === this.key) return;
    this.key = key;
    this.hp = Biquad.highpass(Math.min(fcHp, sr / 4), sr);
    this.lp = Biquad.lowpass(Math.min(fcLp, sr / 2.2), sr);
  }

  process(x: Float32Array | Float64Array): void {
    this.hp?.processInPlace(x);
    this.lp?.processInPlace(x);
  }

  reset(): void {
    this.hp?.reset();
    this.lp?.reset();
  }
}
