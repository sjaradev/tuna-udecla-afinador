import { describe, expect, it } from 'vitest';
import {
  centsBetween,
  freqToMidi,
  midiToFreq,
  midiToNoteName,
  nearestString,
  parseNoteName,
} from '../dsp/music';
import { instrumentPresets, presetRangeHz, stringTargetHz } from '../config/instruments';

describe('music', () => {
  it('A4 = 440 Hz por defecto', () => {
    expect(midiToFreq(69)).toBeCloseTo(440, 6);
    expect(freqToMidi(440)).toBeCloseTo(69, 6);
  });

  it('E2 ≈ 82.41 Hz', () => {
    expect(midiToFreq(40)).toBeCloseTo(82.4069, 3);
  });

  it('las frecuencias escalan con la referencia A4', () => {
    const f440 = midiToFreq(69, 440);
    const f432 = midiToFreq(69, 432);
    expect(f432).toBeCloseTo(432, 6);
    expect(f432 / f440).toBeCloseTo(432 / 440, 9);
    // E2 con A4=432
    expect(midiToFreq(40, 432)).toBeCloseTo(82.4069 * (432 / 440), 3);
  });

  it('cents', () => {
    expect(centsBetween(440, 440)).toBeCloseTo(0, 9);
    expect(centsBetween(880, 440)).toBeCloseTo(1200, 6);
    expect(centsBetween(220, 440)).toBeCloseTo(-1200, 6);
  });

  it('nombres latinos e internacionales', () => {
    expect(midiToNoteName(69)).toMatchObject({ intl: 'A4', latin: 'LA4' });
    expect(midiToNoteName(68)).toMatchObject({ intl: 'G#4', latin: 'SOL♯4' });
    expect(midiToNoteName(60)).toMatchObject({ intl: 'C4', latin: 'DO4' });
    expect(midiToNoteName(59)).toMatchObject({ intl: 'B3', latin: 'SI3' });
  });

  it('parseNoteName', () => {
    expect(parseNoteName('A4')).toBe(69);
    expect(parseNoteName('E2')).toBe(40);
    expect(parseNoteName('G#3')).toBe(56);
    expect(parseNoteName('A1')).toBe(33);
    expect(() => parseNoteName('H2')).toThrow();
  });

  it('nearestString usa escala logarítmica', () => {
    // Guitarra E2(40) A2(45): frontera en 42.5 MIDI.
    const midis = instrumentPresets.guitarra.targetMidis;
    expect(nearestString(midiToFreq(42.4), midis, 440).index).toBe(0);
    expect(nearestString(midiToFreq(42.6), midis, 440).index).toBe(1);
  });
});

describe('instrumentPresets', () => {
  it('contiene los 5 instrumentos', () => {
    expect(Object.keys(instrumentPresets).sort()).toEqual([
      'bandurria',
      'cromatico',
      'guitaron',
      'guitarra',
      'laud',
    ]);
  });

  it('guitarrón: A1 D2 G2 C3 E3 A2', () => {
    const g = instrumentPresets.guitaron;
    expect(g.notes.map((n) => n.name)).toEqual([
      'A1',
      'D2',
      'G2',
      'C3',
      'E3',
      'A2',
    ]);
    expect(stringTargetHz(g, 0)).toBeCloseTo(55, 4);
  });

  it('bandurria y laúd tienen órdenes dobles', () => {
    expect(instrumentPresets.bandurria.stringsPerCourse).toBe(2);
    expect(instrumentPresets.laud.stringsPerCourse).toBe(2);
    expect(instrumentPresets.bandurria.notes).toHaveLength(6);
  });

  it('rangos por preset con media octava de margen', () => {
    const g = instrumentPresets.guitarra;
    const range = presetRangeHz(g);
    expect(range.fMin).toBeCloseTo(midiToFreq(40 - 6), 4);
    expect(range.fMax).toBeCloseTo(midiToFreq(64 + 6), 4);
    const crom = presetRangeHz(instrumentPresets.cromatico);
    expect(crom).toEqual({ fMin: 40, fMax: 2000 });
  });
});
