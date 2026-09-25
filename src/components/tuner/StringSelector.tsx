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
          className={`min-h-12 rounded-xl px-2 py-2 text-sm font-semibold transition-colors ${
            selected === null
              ? 'bg-brand-gold text-brand-navy'
              : 'bg-brand-navy-raised text-brand-muted hover:text-brand-white'
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
              className={`relative min-h-12 rounded-xl px-2 py-1.5 text-sm font-bold transition-colors ${
                isSelected
                  ? 'bg-brand-gold text-brand-navy'
                  : 'bg-brand-navy-raised text-brand-white hover:bg-brand-blue'
              } ${isDetected ? 'ring-2 ring-brand-blue-bright' : ''}`}
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
