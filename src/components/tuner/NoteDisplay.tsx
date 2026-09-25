import type { Notation, TunerReading } from '../../types';
import { stateColor } from '../../lib/signalText';

interface Props {
  reading: TunerReading | null;
  notation: Notation;
}

/** Nombre de nota grande + nombre alterno + frecuencia (plan §6.1). */
export function NoteDisplay({ reading, notation }: Props) {
  const hasNote = reading?.noteNameIntl != null;
  const tuned = reading?.state === 'tuned';
  const primary =
    notation === 'latin' ? reading?.noteNameLatin : reading?.noteNameIntl;
  const secondary =
    notation === 'latin' ? reading?.noteNameIntl : reading?.noteNameLatin;

  // Separar nombre y octava para jerarquía visual: "LA" grande, "4" pequeño
  const match = primary ? /^(.+?)(\d+)$/.exec(primary) : null;
  const namePart = match?.[1] ?? '—';
  const octavePart = match?.[2] ?? '';

  return (
    <div className="relative flex flex-col items-center gap-1" aria-live="off">
      <div
        className={`font-extrabold tracking-tighter transition-all duration-300 ${stateColor(reading)} ${
          tuned
            ? '[filter:drop-shadow(0_0_28px_rgb(65_220_139/0.45))]'
            : hasNote
              ? '[filter:drop-shadow(0_0_18px_rgb(255_255_255/0.10))]'
              : ''
        }`}
      >
        <span className="text-8xl tabular-nums sm:text-9xl">{namePart}</span>
        {octavePart && (
          <span className="align-super text-3xl font-bold sm:text-4xl">
            {octavePart}
          </span>
        )}
      </div>
      <p className="text-xs font-semibold tracking-[0.25em] text-brand-muted uppercase">
        {hasNote ? secondary : ' '}
      </p>
      <p className="mt-1 rounded-full border border-white/[0.07] bg-white/[0.03] px-3 py-1 text-sm font-semibold text-brand-white tabular-nums">
        {reading?.freq != null ? `${reading.freq.toFixed(1)} Hz` : '— Hz'}
      </p>
    </div>
  );
}
