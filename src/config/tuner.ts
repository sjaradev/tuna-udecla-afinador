/**
 * TODAS las constantes del DSP, agrupadas por modo (spec §2).
 * Fuente de verdad: cualquier cambio aquí debe reflejarse en
 * IMPLEMENTATION_PLAN.md §13 y TUNER_TECHNICAL_SPEC.md §2.
 */
import type { NoiseMode, Sensitivity } from '../types';

export interface ModeParams {
  kClarity: number;
  clarityMin: number;
  gateFloorDb: number;
  gateOpenDb: number;
  gateCloseDb: number;
  noiseTauUpMs: number;
  noiseTauDownMs: number;
  transientDb: number;
  transientHoldMs: number;
  stringRangeCents: number;
  bufSize: number;
  outlierCents: number;
  minValid: number;
  emaTauMs: number;
  emaTauFastMs: number;
  emaFastCents: number;
  lockCents: number;
  relockFrames: number;
  octaveFrames: number;
}

export const HOP = 1024;

export const MODE_PARAMS: Record<NoiseMode, ModeParams> = {
  normal: {
    kClarity: 0.8,
    clarityMin: 0.6,
    gateFloorDb: -62,
    gateOpenDb: 9,
    gateCloseDb: 5,
    noiseTauUpMs: 400,
    noiseTauDownMs: 3000,
    transientDb: 6,
    transientHoldMs: 70,
    stringRangeCents: 600,
    bufSize: 7,
    outlierCents: 35,
    minValid: 3,
    emaTauMs: 120,
    emaTauFastMs: 35,
    emaFastCents: 15,
    lockCents: 60,
    relockFrames: 4,
    octaveFrames: 8,
  },
  noisy: {
    kClarity: 0.85,
    clarityMin: 0.7,
    gateFloorDb: -56,
    gateOpenDb: 13,
    gateCloseDb: 8,
    noiseTauUpMs: 400,
    noiseTauDownMs: 3000,
    transientDb: 6,
    transientHoldMs: 100,
    stringRangeCents: 600,
    bufSize: 9,
    outlierCents: 25,
    minValid: 5,
    emaTauMs: 220,
    emaTauFastMs: 35,
    emaFastCents: 15,
    lockCents: 40,
    relockFrames: 6,
    octaveFrames: 12,
  },
};

/** Desplazamiento del umbral del gate según sensibilidad (spec §2). */
export const SENSITIVITY_OFFSET_DB: Record<Sensitivity, number> = {
  low: 6,
  medium: 0,
  high: -6,
};

/* Constantes comunes a ambos modos (spec §2) */
export const NOTE_HYST_CENTS = 65;
export const DISPLAY_STEP_CENTS = 0.5;
export const DEAD_ZONE_CENTS = 2;
export const TUNED_CENTS = 5;
export const TUNED_MS: Record<NoiseMode, number> = { normal: 400, noisy: 550 };
export const UNTUNED_CENTS = 7;
export const UNTUNED_MS = 150;
export const HOLD_MS = 700;
export const LABEL_HYST_CENTS = 2;
export const LABEL_NEAR_CENTS = 15;

/** Pesos del scoring de candidatos en modo automático (spec §6.2). */
export const AUTO_SCORE_W_CLARITY = 0.5;
export const AUTO_SCORE_W_PROXIMITY = 0.3;
export const AUTO_SCORE_W_CONTINUITY = 0.2;
/** Degradación de claridad por octava hacia abajo en modo automático. */
export const SUBHARMONIC_PENALTY = 0.85;
/** Tolerancia para considerar una relación armónica entera (validación cruzada). */
export const HARMONIC_RATIO_TOL = 0.06;
export const HARMONIC_CLARITY_MARGIN = 0.15;
