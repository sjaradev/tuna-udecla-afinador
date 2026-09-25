/**
 * Nivel de señal, piso de ruido, noise gate con histéresis y rechazo de
 * transientes (spec §4.2–4.3).
 */
import { emaAlpha } from './music';

export interface LevelParams {
  gateFloorDb: number;
  gateOpenDb: number;
  gateCloseDb: number;
  noiseTauUpMs: number;
  noiseTauDownMs: number;
  transientDb: number;
  transientHoldMs: number;
  sensOffsetDb: number;
}

export interface LevelResult {
  rmsDb: number;
  noiseFloorDb: number;
  gateOpen: boolean;
  transient: boolean;
  openThresholdDb: number;
}

export class LevelTracker {
  private params: LevelParams;
  private noiseFloorDb = -80;
  private gateOpen = false;
  private prevRms: number[] = [];
  private blockedUntilMs = -1;

  constructor(params: LevelParams) {
    this.params = params;
  }

  setParams(params: LevelParams): void {
    this.params = params;
  }

  analyze(
    x: Float32Array | Float64Array,
    nowMs: number,
    dtMs: number,
  ): LevelResult {
    let sumSq = 0;
    for (let i = 0; i < x.length; i++) sumSq += x[i] * x[i];
    const rms = Math.sqrt(sumSq / x.length);
    const rmsDb = 20 * Math.log10(Math.max(rms, 1e-7));

    // Piso de ruido: EMA asimétrica, congelada con el gate abierto
    if (!this.gateOpen) {
      const tau =
        rmsDb > this.noiseFloorDb
          ? this.params.noiseTauUpMs
          : this.params.noiseTauDownMs;
      this.noiseFloorDb += emaAlpha(tau, dtMs) * (rmsDb - this.noiseFloorDb);
    }

    // Gate con histéresis
    const openTh =
      Math.max(this.params.gateFloorDb, this.noiseFloorDb + this.params.gateOpenDb) +
      this.params.sensOffsetDb;
    const closeTh =
      Math.max(this.params.gateFloorDb, this.noiseFloorDb + this.params.gateCloseDb) +
      this.params.sensOffsetDb;
    if (!this.gateOpen && rmsDb > openTh) this.gateOpen = true;
    else if (this.gateOpen && rmsDb < closeTh) this.gateOpen = false;

    // Transiente: salto brusco respecto a la mediana de los 3 hops anteriores
    let transient = false;
    if (this.prevRms.length >= 3) {
      const sorted = [...this.prevRms].sort((a, b) => a - b);
      const med = sorted[1];
      if (rmsDb - med > this.params.transientDb) {
        transient = true;
        this.blockedUntilMs = nowMs + this.params.transientHoldMs;
      }
    }
    this.prevRms.push(rmsDb);
    if (this.prevRms.length > 3) this.prevRms.shift();
    if (nowMs < this.blockedUntilMs) transient = true;

    return {
      rmsDb,
      noiseFloorDb: this.noiseFloorDb,
      gateOpen: this.gateOpen,
      transient,
      openThresholdDb: openTh,
    };
  }

  reset(): void {
    this.noiseFloorDb = -80;
    this.gateOpen = false;
    this.prevRms = [];
    this.blockedUntilMs = -1;
  }
}
