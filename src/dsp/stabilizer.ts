/**
 * Estabilizador de pitch (spec §7). Separa RAW PITCH de DISPLAY PITCH:
 * búfer → mediana → EMA adaptativa → pitch lock → histéresis de nota →
 * zona muerta → máquina de estado "Afinado" → retención tras pérdida.
 *
 * Trabaja internamente en MIDI flotante (1 semitono = 100 cents).
 */
import type { ModeParams } from '../config/tuner';
import {
  DEAD_ZONE_CENTS,
  DISPLAY_STEP_CENTS,
  HOLD_MS,
  NOTE_HYST_CENTS,
  TUNED_CENTS,
  UNTUNED_CENTS,
  UNTUNED_MS,
} from '../config/tuner';
import { emaAlpha } from './music';

export interface StabilizedOutput {
  /** true si hay una lectura publicada (no "Escuchando…"). */
  published: boolean;
  tuned: boolean;
  /** cents mostrados (cuantizados a 0.5, con zona muerta en "Afinado"). */
  centsDisplay: number | null;
  /** cents crudos de la EMA, para el panel debug. */
  rawCents: number | null;
  /** MIDI flotante suavizado (para mostrar Hz). */
  midiSmooth: number | null;
  refMidi: number | null;
  refKey: string | null;
  rejectedByLock: boolean;
}

export class PitchStabilizer {
  private params: ModeParams;
  private tunedMs: number;
  private buffer: number[] = [];
  private emaMidi: number | null = null;
  private curRefMidi: number | null = null;
  private curRefKey: string | null = null;
  private relockCandidates: number[] = [];
  private pendingRef: { midi: number; key: string; count: number } | null = null;
  private tDentroMs = 0;
  private tFueraMs = 0;
  private tuned = false;
  private lastValidMs: number | null = null;
  private lastPublishMs: number | null = null;
  private lastOutput: StabilizedOutput | null = null;

  constructor(params: ModeParams, tunedMs: number) {
    this.params = params;
    this.tunedMs = tunedMs;
  }

  setParams(params: ModeParams, tunedMs: number): void {
    this.params = params;
    this.tunedMs = tunedMs;
  }

  /** Lectura válida del pipeline. */
  pushValid(midiFloat: number, refMidi: number, refKey: string, nowMs: number): StabilizedOutput {
    const p = this.params;

    // 1. Pitch lock
    if (this.emaMidi !== null) {
      const devCents = (midiFloat - this.emaMidi) * 100;
      if (Math.abs(devCents) > p.lockCents) {
        this.relockCandidates.push(midiFloat);
        if (this.relockCandidates.length > p.relockFrames) {
          this.relockCandidates.shift();
        }
        const agree =
          this.relockCandidates.length >= p.relockFrames &&
          this.relockCandidates.every(
            (v) =>
              Math.abs((v - this.relockCandidates[0]) * 100) <= 15,
          );
        if (agree) {
          // Re-bloqueo: la fuente cambió de verdad
          this.resetBuffer();
          this.emaMidi = midiFloat;
          this.relockCandidates = [];
        } else {
          return this.holdOutput(nowMs, true);
        }
      } else {
        this.relockCandidates = [];
      }
    }

    // 2. Búfer + mediana
    this.buffer.push(midiFloat);
    if (this.buffer.length > p.bufSize) this.buffer.shift();
    if (this.buffer.length < p.minValid) {
      this.lastValidMs = nowMs;
      return this.notPublished(nowMs);
    }
    const med = median(this.buffer);
    const valid = this.buffer.filter(
      (v) => Math.abs((v - med) * 100) <= p.outlierCents,
    );
    if (valid.length < p.minValid) {
      this.lastValidMs = nowMs;
      return this.notPublished(nowMs);
    }
    const medV = median(valid);

    // 3. EMA adaptativa
    const dtMs =
      this.lastPublishMs !== null ? Math.max(1, nowMs - this.lastPublishMs) : 21;
    if (this.emaMidi === null) {
      this.emaMidi = medV;
      this.curRefMidi = refMidi;
      this.curRefKey = refKey;
    } else {
      const fast =
        Math.abs((medV - this.emaMidi) * 100) > p.emaFastCents;
      const tau = fast ? p.emaTauFastMs : p.emaTauMs;
      this.emaMidi += emaAlpha(tau, dtMs) * (medV - this.emaMidi);
    }

    // 4. Cambio de nota/cuerda con histéresis (+ regla de salto de octava)
    if (this.curRefMidi !== null) {
      const centsVsRef = (this.emaMidi - this.curRefMidi) * 100;
      if (Math.abs(centsVsRef) > NOTE_HYST_CENTS && refKey !== this.curRefKey) {
        const isOctaveJump =
          Math.abs(Math.abs(refMidi - this.curRefMidi) - 12) < 0.3;
        if (isOctaveJump) {
          if (this.pendingRef?.key === refKey) {
            this.pendingRef.count++;
          } else {
            this.pendingRef = { midi: refMidi, key: refKey, count: 1 };
          }
          if (this.pendingRef.count >= p.octaveFrames) {
            this.curRefMidi = refMidi;
            this.curRefKey = refKey;
            this.pendingRef = null;
          }
        } else {
          this.curRefMidi = refMidi;
          this.curRefKey = refKey;
          this.pendingRef = null;
        }
      } else if (refKey === this.curRefKey) {
        this.pendingRef = null;
      }
    } else {
      this.curRefMidi = refMidi;
      this.curRefKey = refKey;
    }

    // 5. Cents respecto a la referencia vigente + resolución de display
    const rawCents =
      this.curRefMidi !== null ? (this.emaMidi - this.curRefMidi) * 100 : 0;
    let centsDisplay =
      Math.round(rawCents / DISPLAY_STEP_CENTS) * DISPLAY_STEP_CENTS;

    // 7. Máquina de estado "Afinado" (antes de la zona muerta)
    if (Math.abs(rawCents) <= TUNED_CENTS) {
      this.tDentroMs += dtMs;
      this.tFueraMs = 0;
    } else {
      this.tFueraMs += dtMs;
      this.tDentroMs = 0;
    }
    if (!this.tuned && this.tDentroMs >= this.tunedMs) this.tuned = true;
    if (
      this.tuned &&
      Math.abs(rawCents) > UNTUNED_CENTS &&
      this.tFueraMs >= UNTUNED_MS
    ) {
      this.tuned = false;
    }

    // 6. Zona muerta: solo en estado "Afinado"
    if (this.tuned && Math.abs(centsDisplay) <= DEAD_ZONE_CENTS) {
      centsDisplay = 0;
    }

    this.lastValidMs = nowMs;
    this.lastPublishMs = nowMs;
    const out: StabilizedOutput = {
      published: true,
      tuned: this.tuned,
      centsDisplay,
      rawCents,
      midiSmooth: this.emaMidi,
      refMidi: this.curRefMidi,
      refKey: this.curRefKey,
      rejectedByLock: false,
    };
    this.lastOutput = out;
    return out;
  }

  /** Frame inválido (gate, transiente, claridad, etc.): aplica retención. */
  pushInvalid(nowMs: number): StabilizedOutput {
    if (
      this.lastValidMs !== null &&
      nowMs - this.lastValidMs <= HOLD_MS &&
      this.lastOutput?.published
    ) {
      return this.lastOutput;
    }
    return this.notPublished(nowMs);
  }

  resetBuffer(): void {
    this.buffer = [];
    this.relockCandidates = [];
  }

  reset(): void {
    this.buffer = [];
    this.emaMidi = null;
    this.curRefMidi = null;
    this.curRefKey = null;
    this.relockCandidates = [];
    this.pendingRef = null;
    this.tDentroMs = 0;
    this.tFueraMs = 0;
    this.tuned = false;
    this.lastValidMs = null;
    this.lastPublishMs = null;
    this.lastOutput = null;
  }

  private holdOutput(nowMs: number, rejectedByLock: boolean): StabilizedOutput {
    this.lastValidMs = nowMs;
    if (this.lastOutput?.published) {
      return { ...this.lastOutput, rejectedByLock };
    }
    return this.notPublished(nowMs);
  }

  private notPublished(_nowMs: number): StabilizedOutput {
    const out: StabilizedOutput = {
      published: false,
      tuned: false,
      centsDisplay: null,
      rawCents: null,
      midiSmooth: null,
      refMidi: this.curRefMidi,
      refKey: this.curRefKey,
      rejectedByLock: false,
    };
    this.lastOutput = out;
    return out;
  }
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}
