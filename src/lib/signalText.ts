/** Textos de estado y pistas de señal (plan §6.2). Nunca depender solo del color. */
import type { TunerReading } from '../types';

export type TuneLabel =
  | 'muy-bajo'
  | 'bajo'
  | 'afinado'
  | 'alto'
  | 'muy-alto'
  | null;

export function tuneLabel(cents: number | null, state: string): TuneLabel {
  if (cents === null) return null;
  if (state === 'tuned') return 'afinado';
  if (cents < -15) return 'muy-bajo';
  if (cents < -5) return 'bajo';
  if (cents <= 5) return 'afinado';
  if (cents <= 15) return 'alto';
  return 'muy-alto';
}

export const LABEL_TEXT: Record<NonNullable<TuneLabel>, string> = {
  'muy-bajo': 'Muy bajo · Tensa',
  bajo: 'Bajo · Tensa',
  afinado: 'Afinado',
  alto: 'Alto · Afloja',
  'muy-alto': 'Muy alto · Afloja',
};

/** Texto de la pista de señal discreta bajo el medidor. */
export function signalHint(reading: TunerReading | null): string {
  if (!reading) return 'Escuchando…';
  switch (reading.state) {
    case 'listening':
      return 'Escuchando…';
    case 'weak':
      return 'Señal débil — acerca el micrófono';
    case 'unstable':
      return 'Inestable — toca una sola cuerda';
    case 'tuned':
      return 'Afinado';
    case 'tracking': {
      const label = tuneLabel(reading.cents, reading.state);
      return label ? LABEL_TEXT[label] : 'Escuchando…';
    }
  }
}

/** Color semántico en hex (para la aguja SVG, que no usa clases). */
export function stateColorHex(reading: TunerReading | null): string {
  if (!reading || reading.cents === null) return '#93a5c2';
  const label = tuneLabel(reading.cents, reading.state);
  switch (label) {
    case 'afinado':
      return '#41dc8b';
    case 'bajo':
    case 'alto':
      return '#f0c04a';
    case 'muy-bajo':
    case 'muy-alto':
      return '#f26d6d';
    default:
      return '#93a5c2';
  }
}

/** Color semántico del estado (además del texto). */
export function stateColor(reading: TunerReading | null): string {
  if (!reading || reading.cents === null) return 'text-brand-muted';
  const label = tuneLabel(reading.cents, reading.state);
  switch (label) {
    case 'afinado':
      return 'text-brand-green';
    case 'bajo':
    case 'alto':
      return 'text-brand-gold';
    case 'muy-bajo':
    case 'muy-alto':
      return 'text-brand-red';
    default:
      return 'text-brand-muted';
  }
}
