/**
 * Resolución de armónicos y corrección de errores de octava (spec §6).
 */
import {
  AUTO_SCORE_W_CLARITY,
  AUTO_SCORE_W_CONTINUITY,
  AUTO_SCORE_W_PROXIMITY,
  HARMONIC_CLARITY_MARGIN,
  HARMONIC_RATIO_TOL,
  SUBHARMONIC_PENALTY,
} from '../config/tuner';
import type { PitchCandidate } from './mpm';
import { centsBetween, freqToMidi, nearestString } from './music';

export interface ResolvedPitch {
  freq: number;
  /** MIDI flotante de la frecuencia detectada. */
  midiFloat: number;
  /** MIDI de referencia (cuerda o nota cromática más cercana). */
  refMidi: number;
  refKey: string;
  cents: number;
  stringIndex: number | null;
}

export type HarmonicReject = 'REJECT_RANGE' | 'REJECT_HARMONIC_CONFLICT';

/**
 * Modo cuerda seleccionada (spec §6.1): la búsqueda ya viene restringida a
 * ±stringRangeCents; aquí se valida el rango y se hace la validación cruzada
 * contra el máximo global de la NSDF.
 */
export function resolveStringMode(
  cand: PitchCandidate,
  targetMidi: number,
  stringIndex: number,
  a4: number,
  sr: number,
  rangeCents: number,
): ResolvedPitch | HarmonicReject {
  const targetFreq = Math.pow(2, (targetMidi - 69) / 12) * a4;
  const cents = centsBetween(cand.freq, targetFreq);
  if (Math.abs(cents) > rangeCents) return 'REJECT_RANGE';

  // Fundamental por ENCIMA del rango: si la señal también es periódica en
  // τ0/2, el máximo elegido corresponde a un subarmónico de la nota real
  // (p. ej. un tono de 200 Hz con la cuerda E2 seleccionada "cae" en 100 Hz,
  // dentro del rango de búsqueda). Se rechaza como fuera de rango.
  if (cand.clarityAtHalfTau >= 0.8 * cand.clarity && cand.clarityAtHalfTau > 0.5) {
    return 'REJECT_RANGE';
  }

  // Validación cruzada: una periodicidad global fuerte y NO armónica
  // indica otra fuente sonora (voz, otro instrumento).
  if (cand.globalTau > 0) {
    const globalFreq = sr / cand.globalTau;
    const ratio = globalFreq / cand.freq;
    const rounded = Math.round(ratio);
    const isHarmonic =
      rounded >= 1 &&
      rounded <= 4 &&
      Math.abs(ratio - rounded) <= HARMONIC_RATIO_TOL;
    const invRatio = cand.freq / globalFreq;
    const invRounded = Math.round(invRatio);
    const isSubharmonic =
      invRounded >= 1 &&
      invRounded <= 4 &&
      Math.abs(invRatio - invRounded) <= HARMONIC_RATIO_TOL;
    if (
      cand.globalClarity > cand.clarity + HARMONIC_CLARITY_MARGIN &&
      !isHarmonic &&
      !isSubharmonic
    ) {
      return 'REJECT_HARMONIC_CONFLICT';
    }
  }

  return {
    freq: cand.freq,
    midiFloat: freqToMidi(cand.freq, a4),
    refMidi: targetMidi,
    refKey: `s${stringIndex}`,
    cents,
    stringIndex,
  };
}

/**
 * Modo automático de instrumento (spec §6.2): scoring de candidatos
 * f·{1/3, 1/2, 1, 2, 3} por claridad, cercanía al preset y continuidad.
 */
export function resolveAuto(
  cand: PitchCandidate,
  targetMidis: readonly number[],
  midiMin: number,
  midiMax: number,
  a4: number,
  prevFreq: number | null,
): ResolvedPitch | HarmonicReject {
  const factors = [1 / 3, 1 / 2, 1, 2, 3];
  let best: ResolvedPitch | null = null;
  let bestScore = -Infinity;

  for (const k of factors) {
    const f = cand.freq * k;
    const midiFloat = freqToMidi(f, a4);
    if (midiFloat < midiMin || midiFloat > midiMax) continue;

    // Claridad estimada del candidato
    let clarityEst = cand.clarity;
    if (k === 1 / 2) {
      clarityEst =
        cand.clarityAt2Tau > 0
          ? cand.clarityAt2Tau
          : cand.clarity * SUBHARMONIC_PENALTY;
    } else if (k === 1 / 3) {
      clarityEst =
        cand.clarityAt3Tau > 0
          ? cand.clarityAt3Tau
          : cand.clarity * SUBHARMONIC_PENALTY * SUBHARMONIC_PENALTY;
    }

    const near = nearestString(f, targetMidis, a4);
    const proximity = 1 - Math.min(Math.abs(near.cents) / 100, 1);
    const continuity =
      prevFreq !== null
        ? 1 - Math.min(Math.abs(centsBetween(f, prevFreq)) / 600, 1)
        : 0.5;

    const score =
      AUTO_SCORE_W_CLARITY * clarityEst +
      AUTO_SCORE_W_PROXIMITY * proximity +
      AUTO_SCORE_W_CONTINUITY * continuity;

    if (score > bestScore) {
      bestScore = score;
      best = {
        freq: f,
        midiFloat,
        refMidi: targetMidis[near.index],
        refKey: `s${near.index}`,
        cents: near.cents,
        stringIndex: near.index,
      };
    }
  }

  return best ?? 'REJECT_RANGE';
}

/**
 * Modo cromático (spec §6.3): nota cromática más cercana, sin preset.
 */
export function resolveChromatic(
  cand: PitchCandidate,
  a4: number,
): ResolvedPitch {
  const midiFloat = freqToMidi(cand.freq, a4);
  const refMidi = Math.round(midiFloat);
  return {
    freq: cand.freq,
    midiFloat,
    refMidi,
    refKey: `n${refMidi}`,
    cents: (midiFloat - refMidi) * 100,
    stringIndex: null,
  };
}
