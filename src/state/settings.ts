/**
 * Ajustes persistidos en localStorage con esquema versionado (plan §2.12).
 * Valores fuera de rango o corruptos → defaults. Nunca se almacena audio.
 */
import type {
  InstrumentId,
  NoiseMode,
  Notation,
  Sensitivity,
} from '../types';
import { DEFAULT_A4, MAX_A4, MIN_A4 } from '../dsp/music';

const STORAGE_KEY = 'tuna-tuner:settings:v1';

export interface Settings {
  a4Reference: number;
  noiseMode: NoiseMode;
  notation: Notation;
  sensitivity: Sensitivity;
  vibrateOnTune: boolean;
  lastInstrument: InstrumentId;
  lastString: number | null;
  onboardingDone: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  a4Reference: DEFAULT_A4,
  noiseMode: 'normal',
  notation: 'latin',
  sensitivity: 'medium',
  vibrateOnTune: true,
  lastInstrument: 'guitarra',
  lastString: null,
  onboardingDone: false,
};

const NOISE_MODES: NoiseMode[] = ['normal', 'noisy'];
const NOTATIONS: Notation[] = ['latin', 'international'];
const SENSITIVITIES: Sensitivity[] = ['low', 'medium', 'high'];
const INSTRUMENTS: InstrumentId[] = [
  'guitarra',
  'bandurria',
  'laud',
  'guitaron',
  'cromatico',
];

function pick<T>(value: unknown, allowed: T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

/** Valida un objeto desconocido contra el esquema; lo inválido cae a default. */
export function validateSettings(raw: unknown): Settings {
  if (typeof raw !== 'object' || raw === null) return { ...DEFAULT_SETTINGS };
  const r = raw as Record<string, unknown>;
  const a4 =
    typeof r.a4Reference === 'number' &&
    Number.isFinite(r.a4Reference) &&
    r.a4Reference >= MIN_A4 &&
    r.a4Reference <= MAX_A4
      ? Math.round(r.a4Reference * 10) / 10
      : DEFAULT_SETTINGS.a4Reference;
  return {
    a4Reference: a4,
    noiseMode: pick(r.noiseMode, NOISE_MODES, DEFAULT_SETTINGS.noiseMode),
    notation: pick(r.notation, NOTATIONS, DEFAULT_SETTINGS.notation),
    sensitivity: pick(
      r.sensitivity,
      SENSITIVITIES,
      DEFAULT_SETTINGS.sensitivity,
    ),
    vibrateOnTune:
      typeof r.vibrateOnTune === 'boolean'
        ? r.vibrateOnTune
        : DEFAULT_SETTINGS.vibrateOnTune,
    lastInstrument: pick(
      r.lastInstrument,
      INSTRUMENTS,
      DEFAULT_SETTINGS.lastInstrument,
    ),
    lastString:
      typeof r.lastString === 'number' &&
      Number.isInteger(r.lastString) &&
      r.lastString >= 0 &&
      r.lastString <= 5
        ? r.lastString
        : null,
    onboardingDone:
      typeof r.onboardingDone === 'boolean'
        ? r.onboardingDone
        : DEFAULT_SETTINGS.onboardingDone,
  };
}

function defaultStorage(): Pick<Storage, 'getItem' | 'setItem'> | null {
  // localStorage no existe fuera del navegador (p. ej. tests en Node)
  return typeof localStorage !== 'undefined' ? localStorage : null;
}

export function loadSettings(
  storage?: Pick<Storage, 'getItem'> | null,
): Settings {
  try {
    const store = storage === undefined ? defaultStorage() : storage;
    if (!store) return { ...DEFAULT_SETTINGS };
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return validateSettings(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

/* ---------- Store mínimo con suscripción (para useSyncExternalStore) ---------- */

type Listener = () => void;

class SettingsStore {
  private settings: Settings = loadSettings();
  private listeners = new Set<Listener>();

  getSnapshot = (): Settings => this.settings;

  subscribe = (cb: Listener): (() => void) => {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  };

  update(patch: Partial<Settings>): void {
    this.settings = validateSettings({ ...this.settings, ...patch });
    this.persist();
    for (const cb of this.listeners) cb();
  }

  reset(): void {
    const onboardingDone = this.settings.onboardingDone;
    this.settings = { ...DEFAULT_SETTINGS, onboardingDone };
    this.persist();
    for (const cb of this.listeners) cb();
  }

  private persist(): void {
    try {
      defaultStorage()?.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch {
      // almacenamiento lleno o bloqueado: la app sigue funcionando en memoria
    }
  }
}

export const settingsStore = new SettingsStore();
