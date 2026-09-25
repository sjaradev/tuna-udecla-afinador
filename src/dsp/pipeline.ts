/**
 * Pipeline de frame: orquesta filtros → nivel/gate → transientes → MPM →
 * resolución de armónicos → estabilizador (spec §3).
 *
 * TypeScript puro, sin DOM ni Web Audio: testeable en Vitest.
 * El tiempo llega como parámetro (`nowMs`) para tests deterministas.
 */
import type {
  LevelInfo,
  RejectCode,
  TunerConfig,
  TunerReading,
  TunerState,
} from '../types';
import {
  instrumentPresets,
  presetRangeHz,
  type InstrumentPreset,
} from '../config/instruments';
import {
  HOP,
  MODE_PARAMS,
  SENSITIVITY_OFFSET_DB,
  TUNED_MS,
  type ModeParams,
} from '../config/tuner';
import { FilterChain } from './filters';
import { LevelTracker } from './level';
import { MpmDetector, type SearchRange } from './mpm';
import {
  resolveAuto,
  resolveChromatic,
  resolveStringMode,
  type ResolvedPitch,
} from './harmonics';
import { PitchStabilizer } from './stabilizer';
import { midiToFreq, midiToNoteName } from './music';

export interface FrameResult {
  reading: TunerReading;
  level: LevelInfo;
}

export class TunerPipeline {
  private readonly sr: number;
  private config: TunerConfig;
  private params: ModeParams;
  private preset: InstrumentPreset;
  private range: SearchRange;
  private detector: MpmDetector;
  private readonly filters = new FilterChain();
  private readonly level: LevelTracker;
  private readonly stabilizer: PitchStabilizer;
  private readonly buf: Float32Array;
  private prevFreq: number | null = null;

  constructor(sampleRate: number, config: TunerConfig) {
    this.sr = sampleRate;
    this.config = config;
    this.params = MODE_PARAMS[config.mode];
    this.preset = instrumentPresets[config.instrument];
    this.range = this.computeRange();
    this.detector = new MpmDetector(sampleRate, this.range.fMin);
    this.filters.configure(this.range.fMin, this.range.fMax, sampleRate);
    this.level = new LevelTracker(this.levelParams());
    this.stabilizer = new PitchStabilizer(this.params, TUNED_MS[config.mode]);
    this.buf = new Float32Array(this.detector.windowSize);
  }

  get windowSize(): number {
    return this.detector.windowSize;
  }

  setConfig(config: TunerConfig): void {
    const prevRange = this.range;
    this.config = config;
    this.params = MODE_PARAMS[config.mode];
    this.preset = instrumentPresets[config.instrument];
    this.range = this.computeRange();
    if (
      Math.abs(this.range.fMin - prevRange.fMin) > 0.01 ||
      Math.abs(this.range.fMax - prevRange.fMax) > 0.01
    ) {
      // El tamaño de ventana depende de fMin: recrear el detector si cambia
      const next = new MpmDetector(this.sr, this.range.fMin);
      if (next.windowSize !== this.detector.windowSize) {
        this.detector = next;
      }
      this.filters.configure(this.range.fMin, this.range.fMax, this.sr);
      this.stabilizer.reset();
      this.prevFreq = null;
    }
    this.level.setParams(this.levelParams());
    this.stabilizer.setParams(this.params, TUNED_MS[config.mode]);
  }

  /** Rango de búsqueda según modo: cuerda fija (±600 cents), preset o cromático. */
  private computeRange(): SearchRange {
    const { instrument, stringIndex, a4 } = this.config;
    if (instrument !== 'cromatico' && stringIndex !== null) {
      const targetMidi = this.preset.targetMidis[stringIndex];
      const half = this.params.stringRangeCents / 1200;
      const targetFreq = midiToFreq(targetMidi, a4);
      return {
        fMin: targetFreq * Math.pow(2, -half),
        fMax: targetFreq * Math.pow(2, half),
      };
    }
    return presetRangeHz(this.preset, a4);
  }

  private levelParams() {
    const p = this.params;
    return {
      gateFloorDb: p.gateFloorDb,
      gateOpenDb: p.gateOpenDb,
      gateCloseDb: p.gateCloseDb,
      noiseTauUpMs: p.noiseTauUpMs,
      noiseTauDownMs: p.noiseTauDownMs,
      transientDb: p.transientDb,
      transientHoldMs: p.transientHoldMs,
      sensOffsetDb: SENSITIVITY_OFFSET_DB[this.config.sensitivity],
    };
  }

  /**
   * Procesa una ventana de `windowSize` muestras. `nowMs` debe ser monótono.
   */
  processWindow(win: Float32Array, nowMs: number): FrameResult {
    const p = this.params;
    const dtMs = (HOP / this.sr) * 1000;

    // 1. Filtrado (sobre copia; no mutar la ventana del caller)
    this.buf.set(win.subarray(0, this.detector.windowSize));
    this.filters.process(this.buf);

    // 2. Nivel, piso de ruido, gate
    const lvl = this.level.analyze(this.buf, nowMs, dtMs);
    const levelInfo: LevelInfo = {
      rmsDb: lvl.rmsDb,
      noiseFloorDb: lvl.noiseFloorDb,
      gateOpen: lvl.gateOpen,
    };

    const finish = (
      state: TunerState,
      reject: RejectCode | null,
      out: ReturnType<PitchStabilizer['pushInvalid']>,
    ): FrameResult => {
      const reading = this.buildReading(state, reject, out, lvl.rmsDb, lvl.noiseFloorDb, nowMs);
      return { reading, level: levelInfo };
    };

    // 3. Gate cerrado → sin señal útil
    if (!lvl.gateOpen) {
      const out = this.stabilizer.pushInvalid(nowMs);
      if (out.published) return finish(out.tuned ? 'tuned' : 'tracking', null, out);
      const weak = lvl.rmsDb > lvl.noiseFloorDb + 2;
      return finish(weak ? 'weak' : 'listening', 'REJECT_GATE', out);
    }

    // 4. Transiente → bloqueo y reset del búfer
    if (lvl.transient) {
      this.stabilizer.resetBuffer();
      const out = this.stabilizer.pushInvalid(nowMs);
      return finish(
        out.published ? (out.tuned ? 'tuned' : 'tracking') : 'listening',
        'REJECT_TRANSIENT',
        out,
      );
    }

    // 5. MPM
    const cand = this.detector.detect(this.buf, this.range, p.kClarity);
    if (!cand || cand.clarity < p.clarityMin) {
      const out = this.stabilizer.pushInvalid(nowMs);
      if (out.published) return finish(out.tuned ? 'tuned' : 'tracking', null, out);
      return finish('unstable', 'REJECT_CLARITY', out);
    }

    // 6. Resolución de armónicos según modo
    const { instrument, stringIndex, a4 } = this.config;
    let resolved: ResolvedPitch | 'REJECT_RANGE' | 'REJECT_HARMONIC_CONFLICT';
    if (instrument !== 'cromatico' && stringIndex !== null) {
      resolved = resolveStringMode(
        cand,
        this.preset.targetMidis[stringIndex],
        stringIndex,
        a4,
        this.sr,
        p.stringRangeCents,
      );
    } else if (instrument !== 'cromatico') {
      resolved = resolveAuto(
        cand,
        this.preset.targetMidis,
        this.preset.midiMin,
        this.preset.midiMax,
        a4,
        this.prevFreq,
      );
    } else {
      resolved = resolveChromatic(cand, a4);
    }
    if (typeof resolved === 'string') {
      const out = this.stabilizer.pushInvalid(nowMs);
      if (out.published) return finish(out.tuned ? 'tuned' : 'tracking', null, out);
      return finish('unstable', resolved, out);
    }

    // 7. Estabilizador
    const out = this.stabilizer.pushValid(
      resolved.midiFloat,
      resolved.refMidi,
      resolved.refKey,
      nowMs,
    );
    if (!out.published) {
      return finish('listening', null, out);
    }
    this.prevFreq = resolved.freq;
    const reading = this.buildReading(
      out.tuned ? 'tuned' : 'tracking',
      out.rejectedByLock ? 'REJECT_LOCK' : null,
      out,
      lvl.rmsDb,
      lvl.noiseFloorDb,
      nowMs,
      resolved.stringIndex,
      cand.clarity,
    );
    return { reading, level: levelInfo };
  }

  private buildReading(
    state: TunerState,
    reject: RejectCode | null,
    out: ReturnType<PitchStabilizer['pushInvalid']>,
    rmsDb: number,
    noiseFloorDb: number,
    nowMs: number,
    stringIndex: number | null = null,
    clarity = 0,
  ): TunerReading {
    const published = out.published && out.refMidi !== null;
    const names = published ? midiToNoteName(out.refMidi!) : null;
    return {
      tMs: nowMs,
      state,
      freq:
        published && out.midiSmooth !== null
          ? midiToFreq(out.midiSmooth, this.config.a4)
          : null,
      cents: published ? out.centsDisplay : null,
      noteNameIntl: names?.intl ?? null,
      noteNameLatin: names?.latin ?? null,
      stringIndex: published
        ? this.config.instrument === 'cromatico'
          ? null
          : (stringIndex ?? this.deriveStringIndex(out.refKey))
        : null,
      clarity,
      rmsDb,
      noiseFloorDb,
      rawCents: published ? out.rawCents : null,
      rejectReason: reject,
    };
  }

  private deriveStringIndex(refKey: string | null): number | null {
    if (refKey?.startsWith('s')) {
      const idx = parseInt(refKey.slice(1), 10);
      return Number.isFinite(idx) ? idx : null;
    }
    return null;
  }

  reset(): void {
    this.level.reset();
    this.stabilizer.reset();
    this.filters.reset();
    this.prevFreq = null;
  }
}
