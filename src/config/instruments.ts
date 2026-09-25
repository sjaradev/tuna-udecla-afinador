/**
 * Presets de instrumentos construidos desde las afinaciones de texto.
 * Única fuente de verdad: ningún componente define frecuencias por su cuenta.
 */
import type { InstrumentId } from '../types';
import {
  midiToFreq,
  midiToNoteName,
  parseNoteName,
  DEFAULT_A4,
} from '../dsp/music';
import {
  BANDURRIA_TUNING,
  GUITARRA_TUNING,
  GUITARRON_TUNING,
  LAUD_TUNING,
} from './tunings';

export interface PresetNote {
  /** Nombre canónico en texto, p. ej. 'G#3'. */
  name: string;
  midi: number;
  intl: string;
  latin: string;
  octave: number;
  /** Número de cuerda/orden, 1 = la más grave. */
  stringNumber: number;
  /** Cuerdas por orden (2 en bandurria/laúd, 1 en guitarra/guitarrón). */
  stringsPerCourse: number;
  label?: string;
}

export interface InstrumentPreset {
  id: InstrumentId;
  name: string;
  notes: PresetNote[];
  stringsPerCourse: number;
  /** MIDI de las cuerdas (vacío en cromático). */
  targetMidis: number[];
  /** Rango de detección en MIDI (media octava de margen). */
  midiMin: number;
  midiMax: number;
  /** Consejo específico del instrumento, si aplica. */
  hint?: string;
}

/** Margen de media octava (6 semitonos) sobre la cuerda más grave/aguda. */
const RANGE_MARGIN_SEMITONES = 6;

function buildPreset(
  id: InstrumentId,
  name: string,
  tuning: readonly string[],
  stringsPerCourse: number,
  hint?: string,
): InstrumentPreset {
  const notes: PresetNote[] = tuning.map((noteName, i) => {
    const midi = parseNoteName(noteName);
    const names = midiToNoteName(midi);
    return {
      name: noteName,
      midi,
      intl: names.intl,
      latin: names.latin,
      octave: names.octave,
      stringNumber: i + 1,
      stringsPerCourse,
    };
  });
  const midis = notes.map((n) => n.midi);
  return {
    id,
    name,
    notes,
    stringsPerCourse,
    targetMidis: midis,
    midiMin: Math.min(...midis) - RANGE_MARGIN_SEMITONES,
    midiMax: Math.max(...midis) + RANGE_MARGIN_SEMITONES,
    hint,
  };
}

const COURSE_HINT =
  'Cada orden tiene 2 cuerdas: afina una por una, tapando suavemente la otra.';

export const instrumentPresets: Record<InstrumentId, InstrumentPreset> = {
  guitarra: buildPreset('guitarra', 'Guitarra', GUITARRA_TUNING, 1),
  bandurria: buildPreset('bandurria', 'Bandurria', BANDURRIA_TUNING, 2, COURSE_HINT),
  laud: buildPreset('laud', 'Laúd', LAUD_TUNING, 2, COURSE_HINT),
  guitaron: buildPreset(
    'guitaron',
    'Guitarrón',
    GUITARRON_TUNING,
    1,
    'El guitarrón suena muy grave: selecciona la cuerda manualmente para máxima precisión.',
  ),
  // Cromático: sin cuerdas; rango amplio 40–2000 Hz (≈ E1–C7).
  cromatico: {
    id: 'cromatico',
    name: 'Cromático',
    notes: [],
    stringsPerCourse: 1,
    targetMidis: [],
    midiMin: 27, // ~40 Hz
    midiMax: 88, // ~2000 Hz... se acota por frecuencia en el pipeline
  },
};

/** Rango de detección en Hz para un preset, calculado con la A4 vigente. */
export function presetRangeHz(
  preset: InstrumentPreset,
  a4: number = DEFAULT_A4,
): { fMin: number; fMax: number } {
  if (preset.id === 'cromatico') return { fMin: 40, fMax: 2000 };
  return {
    fMin: midiToFreq(preset.midiMin, a4),
    fMax: midiToFreq(preset.midiMax, a4),
  };
}

/** Frecuencia objetivo de una cuerda del preset con la A4 vigente. */
export function stringTargetHz(
  preset: InstrumentPreset,
  stringIndex: number,
  a4: number = DEFAULT_A4,
): number {
  return midiToFreq(preset.targetMidis[stringIndex], a4);
}

export const INSTRUMENT_ORDER: InstrumentId[] = [
  'guitarra',
  'bandurria',
  'laud',
  'guitaron',
  'cromatico',
];
