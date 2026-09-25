import type { Notation, TunerReading } from '../../types';
import { stateColor } from '../../lib/signalText';

interface Props {
  reading: TunerReading | null;
  notation: Notation;
}

/** Nombre de nota grande + nombre alterno + frecuencia (plan §6.1). */
export function NoteDisplay({ reading, notation }: Props) {
  const hasNote = reading?.noteNameIntl != null;
  const primary =
    notation === 'latin' ? reading?.noteNameLatin : reading?.noteNameIntl;
  const secondary =
    notation === 'latin' ? reading?.noteNameIntl : reading?.noteNameLatin;

  // Separar nombre y octava para jerarquía visual: "LA" grande, "4" pequeño
  const match = primary ? /^(.+?)(\d+)$/.exec(primary) : null;
  const namePart = match?.[1] ?? '—';
  const octavePart = match?.[2] ?? '';

  return (
    <div className="flex flex-col items-center gap-1" aria-live="off">
      <div
        className={`font-bold tracking-tight transition-colors ${stateColor(reading)}`}
      >
        <span className="text-7xl tabular-nums sm:text-8xl">{namePart}</span>
        {octavePart && (
          <span className="align-super text-3xl sm:text-4xl">{octavePart}</span>
        )}
      </div>
      <p className="text-lg text-brand-muted">
        {hasNote ? secondary : ' '}
      </p>
      <p className="text-xl font-semibold text-brand-white tabular-nums">
        {reading?.freq != null ? `${reading.freq.toFixed(1)} Hz` : '— Hz'}
      </p>
    </div>
  );
}
