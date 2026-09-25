import { useState } from 'react';
import type { InstrumentPreset } from '../../config/instruments';
import type { Notation } from '../../types';

interface Props {
  preset: InstrumentPreset;
  /** null = Automático */
  selected: number | null;
  /** Cuerda detectada en modo automático (para resaltarla). */
  detected: number | null;
  notation: Notation;
  onSelect: (index: number | null) => void;
}

/**
 * Selector de cuerda plegable (plan §6.1): por defecto ocupa una sola
 * barra ("Automática" + cuerda detectada); al tocarla se despliega la
 * grilla para fijar una cuerda objetivo (útil en ambientes ruidosos).
 */
export function StringSelector({ preset, selected, detected, notation, onSelect }: Props) {
  const [open, setOpen] = useState(false);

  if (preset.id === 'cromatico') return null;

  const nameOf = (i: number) =>
    notation === 'latin' ? preset.notes[i].latin : preset.notes[i].intl;
  const selectedName = selected !== null ? nameOf(selected) : null;
  const detectedName =
    selected === null && detected !== null ? nameOf(detected) : null;

  return (
    <div className="w-full">
      {/* Barra plegada */}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="glass flex min-h-11 w-full items-center justify-between gap-2 rounded-2xl px-4 text-sm transition-colors hover:bg-white/[0.06]"
      >
        <span className="text-brand-muted">Cuerda</span>
        <span className="flex items-center gap-2 font-semibold">
          {selectedName ?? 'Automática'}
          {detectedName && (
            <span className="text-xs font-medium text-brand-blue-bright">
              · detectada {detectedName}
            </span>
          )}
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
            className={`text-brand-muted transition-transform ${open ? 'rotate-180' : ''}`}
          >
            <path
              d="m6 9 6 6 6-6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>

      {/* Grilla desplegada */}
      {open && (
        <div className="mt-2 grid grid-cols-4 gap-1.5 sm:grid-cols-7">
          <button
            onClick={() => onSelect(null)}
            aria-pressed={selected === null}
            className={`min-h-10 rounded-xl px-2 py-1.5 text-xs font-semibold transition-all active:scale-95 ${
              selected === null
                ? 'bg-gradient-to-b from-brand-gold-soft to-brand-gold text-brand-navy shadow-[0_4px_20px_rgb(240_192_74/0.35)]'
                : 'border border-white/[0.07] bg-white/[0.04] text-brand-muted hover:bg-white/[0.08] hover:text-brand-white'
            }`}
          >
            Auto
          </button>
          {preset.notes.map((note, i) => {
            const isSelected = selected === i;
            const isDetected = selected === null && detected === i;
            return (
              <button
                key={note.name}
                onClick={() => onSelect(i)}
                aria-pressed={isSelected}
                aria-label={`Cuerda ${note.stringNumber}: ${note.latin}`}
                className={`relative min-h-10 rounded-xl px-2 py-1 text-xs font-bold transition-all active:scale-95 ${
                  isSelected
                    ? 'bg-gradient-to-b from-brand-gold-soft to-brand-gold text-brand-navy shadow-[0_4px_20px_rgb(240_192_74/0.35)]'
                    : 'border border-white/[0.07] bg-white/[0.04] text-brand-white hover:bg-white/[0.08]'
                } ${isDetected ? 'ring-2 ring-brand-blue-bright/80 shadow-[0_0_18px_rgb(107_163_242/0.30)]' : ''}`}
              >
                {notation === 'latin' ? note.latin : note.intl}
                <span className="block text-[9px] font-normal opacity-75">
                  {note.stringNumber}ª{preset.stringsPerCourse === 2 ? ' (×2)' : ''}
                </span>
              </button>
            );
          })}
        </div>
      )}
      {open && preset.hint && (
        <p className="mt-2 text-center text-xs text-brand-muted">{preset.hint}</p>
      )}
    </div>
  );
}
