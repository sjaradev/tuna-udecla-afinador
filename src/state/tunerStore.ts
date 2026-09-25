/**
 * Estado discreto de la UI del afinador (plan §2.4):
 * se publica como máximo ~15 veces/segundo y solo cuando cambian los campos
 * discretos. La aguja NO pasa por aquí (usa su propio canal por rAF).
 */
import type { LevelInfo, MicError, MicState, TunerReading } from '../types';

export interface TunerUIState {
  micState: MicState;
  micError: MicError | null;
  reading: TunerReading | null;
  level: LevelInfo | null;
}

const INITIAL: TunerUIState = {
  micState: 'idle',
  micError: null,
  reading: null,
  level: null,
};

type Listener = () => void;

const MIN_PUBLISH_INTERVAL_MS = 66; // ~15 Hz

class TunerStore {
  private state: TunerUIState = INITIAL;
  private listeners = new Set<Listener>();
  private lastPublishMs = 0;

  getSnapshot = (): TunerUIState => this.state;

  subscribe = (cb: Listener): (() => void) => {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  };

  setMicState(micState: MicState, micError: MicError | null): void {
    this.commit({ ...this.state, micState, micError });
  }

  setLevel(level: LevelInfo): void {
    // El nivel solo alimenta el medidor discreto; mismo throttle
    this.setReadingThrottled(null, level);
  }

  setReading(reading: TunerReading): void {
    this.setReadingThrottled(reading, null);
  }

  private setReadingThrottled(
    reading: TunerReading | null,
    level: LevelInfo | null,
  ): void {
    const prev = this.state;
    const nextReading = reading ?? prev.reading;
    const nextLevel = level ?? prev.level;

    const discreteChanged =
      !prev.reading ||
      !nextReading ||
      prev.reading.state !== nextReading.state ||
      prev.reading.noteNameIntl !== nextReading.noteNameIntl ||
      prev.reading.stringIndex !== nextReading.stringIndex ||
      prev.reading.cents !== nextReading.cents ||
      prev.reading.rejectReason !== nextReading.rejectReason;

    const now = performance.now();
    const due = now - this.lastPublishMs >= MIN_PUBLISH_INTERVAL_MS;

    if (!discreteChanged && !due && !level) return;

    this.lastPublishMs = now;
    this.commit({ ...prev, reading: nextReading, level: nextLevel });
  }

  private commit(next: TunerUIState): void {
    this.state = next;
    for (const cb of this.listeners) cb();
  }
}

export const tunerStore = new TunerStore();
