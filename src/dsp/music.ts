/** Teoría musical: MIDI ↔ Hz, cents y nombres de nota (spec §1). */

export const NOTE_NAMES_INTL = [
  'C',
  'C#',
  'D',
  'D#',
  'E',
  'F',
  'F#',
  'G',
  'G#',
  'A',
  'A#',
  'B',
] as const;

export const NOTE_NAMES_LATIN = [
  'DO',
  'DO♯',
  'RE',
  'RE♯',
  'MI',
  'FA',
  'FA♯',
  'SOL',
  'SOL♯',
  'LA',
  'LA♯',
  'SI',
] as const;

export const DEFAULT_A4 = 440;
export const MIN_A4 = 430;
export const MAX_A4 = 450;

export function midiToFreq(midi: number, a4: number = DEFAULT_A4): number {
  return a4 * Math.pow(2, (midi - 69) / 12);
}

export function freqToMidi(freq: number, a4: number = DEFAULT_A4): number {
  return 69 + 12 * Math.log2(freq / a4);
}

export function centsBetween(freq: number, target: number): number {
  return 1200 * Math.log2(freq / target);
}

export interface NoteName {
  intl: string;
  latin: string;
  octave: number;
  midi: number;
}

export function midiToNoteName(midi: number): NoteName {
  const m = Math.round(midi);
  const idx = ((m % 12) + 12) % 12;
  const octave = Math.floor(m / 12) - 1;
  return {
    intl: `${NOTE_NAMES_INTL[idx]}${octave}`,
    latin: `${NOTE_NAMES_LATIN[idx]}${octave}`,
    octave,
    midi: m,
  };
}

const NOTE_TO_SEMITONE: Record<string, number> = {
  C: 0,
  'C#': 1,
  D: 2,
  'D#': 3,
  E: 4,
  F: 5,
  'F#': 6,
  G: 7,
  'G#': 8,
  A: 9,
  'A#': 10,
  B: 11,
};

/** Parsea nombres como 'G#3', 'E2', 'A1' a número MIDI. */
export function parseNoteName(name: string): number {
  const match = /^([A-G]#?)(-?\d+)$/.exec(name.trim());
  if (!match) throw new Error(`Nombre de nota inválido: "${name}"`);
  const semitone = NOTE_TO_SEMITONE[match[1]];
  if (semitone === undefined)
    throw new Error(`Nombre de nota inválido: "${name}"`);
  const octave = parseInt(match[2], 10);
  return (octave + 1) * 12 + semitone;
}

/**
 * Cuerda más cercana de un preset en escala logarítmica (spec §1.2).
 * `targetMidis` son los MIDI de las cuerdas del preset.
 * Devuelve el índice de la cuerda y los cents respecto a ella.
 */
export function nearestString(
  freq: number,
  targetMidis: readonly number[],
  a4: number,
): { index: number; cents: number } {
  const midi = freqToMidi(freq, a4);
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < targetMidis.length; i++) {
    const dist = Math.abs(midi - targetMidis[i]);
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  }
  return { index: best, cents: (midi - targetMidis[best]) * 100 };
}

/** Convierte constante de tiempo τ (ms) a coeficiente EMA para un paso Δt (ms). */
export function emaAlpha(tauMs: number, dtMs: number): number {
  return 1 - Math.exp(-dtMs / tauMs);
}
