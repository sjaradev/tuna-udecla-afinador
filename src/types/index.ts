/** Tipos compartidos entre DSP, audio, estado y UI. */

export type InstrumentId =
  | 'guitarra'
  | 'bandurria'
  | 'laud'
  | 'guitaron'
  | 'cromatico';

export type NoiseMode = 'normal' | 'noisy';
export type Sensitivity = 'low' | 'medium' | 'high';
export type Notation = 'latin' | 'international';

export type RejectCode =
  | 'REJECT_GATE'
  | 'REJECT_TRANSIENT'
  | 'REJECT_CLARITY'
  | 'REJECT_RANGE'
  | 'REJECT_HARMONIC_CONFLICT'
  | 'REJECT_LOCK';

export type TunerState =
  | 'listening'
  | 'weak'
  | 'unstable'
  | 'tracking'
  | 'tuned';

/** Lectura estabilizada que emite el worker hacia el hilo principal. */
export interface TunerReading {
  tMs: number;
  state: TunerState;
  freq: number | null;
  cents: number | null;
  noteNameIntl: string | null;
  noteNameLatin: string | null;
  /** Índice de cuerda/orden de referencia (modo instrumento), null en cromático. */
  stringIndex: number | null;
  clarity: number;
  rmsDb: number;
  noiseFloorDb: number;
  /** Crudo, solo para el panel ?debug=1. */
  rawCents: number | null;
  rejectReason: RejectCode | null;
}

export interface LevelInfo {
  rmsDb: number;
  noiseFloorDb: number;
  gateOpen: boolean;
}

/** Configuración que el hilo principal envía al worker. Datos planos (clonables). */
export interface TunerConfig {
  mode: NoiseMode;
  sensitivity: Sensitivity;
  a4: number;
  instrument: InstrumentId;
  /** null = automático. En cromático se ignora. */
  stringIndex: number | null;
}

export type MicState =
  | 'idle'
  | 'requesting'
  | 'running'
  | 'suspended'
  | 'awaitingGesture'
  | 'denied'
  | 'unavailable'
  | 'error';

export type MicErrorKind =
  | 'denied'
  | 'blocked'
  | 'notfound'
  | 'busy'
  | 'insecure'
  | 'unknown';

export interface MicError {
  kind: MicErrorKind;
  message?: string;
}

/* ---------- Protocolo de mensajes (spec §8) ---------- */

export interface CaptureChunk {
  type: 'chunk';
  samples: Float32Array;
}

export type MainToWorker =
  | { type: 'init'; sampleRate: number; port: MessagePort; config: TunerConfig }
  | { type: 'config'; config: TunerConfig };

export type WorkerToMain =
  | { type: 'reading'; reading: TunerReading }
  | { type: 'level'; level: LevelInfo };
