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

/** Botones de cuerdas/órdenes + "Automático" (plan §6.1). */
export function StringSelector({ preset, selected, detected, notation, onSelect }: Props) {
  if (preset.id === 'cromatico') return null;

  return (
    <div className="w-full">
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
        <button
          onClick={() => onSelect(null)}
          aria-pressed={selected === null}
          className={`min-h-12 rounded-2xl px-2 py-2 text-sm font-semibold transition-all active:scale-95 ${
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
              className={`relative min-h-12 rounded-2xl px-2 py-1.5 text-sm font-bold transition-all active:scale-95 ${
                isSelected
                  ? 'bg-gradient-to-b from-brand-gold-soft to-brand-gold text-brand-navy shadow-[0_4px_20px_rgb(240_192_74/0.35)]'
                  : 'border border-white/[0.07] bg-white/[0.04] text-brand-white hover:bg-white/[0.08]'
              } ${isDetected ? 'ring-2 ring-brand-blue-bright/80 shadow-[0_0_18px_rgb(107_163_242/0.30)]' : ''}`}
            >
              {notation === 'latin' ? note.latin : note.intl}
              <span className="block text-[10px] font-normal opacity-75">
                {note.stringNumber}ª{preset.stringsPerCourse === 2 ? ' (×2)' : ''}
              </span>
            </button>
          );
        })}
      </div>
      {preset.hint && (
        <p className="mt-2 text-center text-xs text-brand-muted">{preset.hint}</p>
      )}
    </div>
  );
}
