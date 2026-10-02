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

  const match = primary ? /^(.+?)(\d+)$/.exec(primary) : null;
  const namePart = match?.[1] ?? '—';
  const octavePart = match?.[2] ?? '';
  const freqText =
    reading?.freq != null ? `${reading.freq.toFixed(1)} Hz` : '— Hz';

  return (
    <div
      className="relative flex w-full max-w-sm shrink-0 flex-col items-center gap-1 pt-4 sm:pt-5"
      aria-live="off"
    >
      {/* Altura fija: la octava va en un hueco reservado para no mover el medidor. */}
      <div
        className={`flex h-24 w-full shrink-0 items-center justify-center font-extrabold tracking-tighter transition-[color,filter] duration-300 sm:h-32 ${stateColor(reading)} ${
          tuned
            ? '[filter:drop-shadow(0_0_28px_rgb(65_220_139/0.45))]'
            : hasNote
              ? '[filter:drop-shadow(0_0_18px_rgb(255_255_255/0.10))]'
              : ''
        }`}
      >
        {hasNote ? (
          <div className="inline-flex items-start justify-center leading-none">
            <span className="text-8xl tabular-nums sm:text-9xl">{namePart}</span>
            <span
              className={`relative -top-7 min-w-[1.1ch] text-3xl font-bold sm:-top-9 sm:text-4xl ${
                octavePart ? '' : 'invisible'
              }`}
              aria-hidden={!octavePart}
            >
              {octavePart || '4'}
            </span>
          </div>
        ) : (
          <div className="flex w-full items-center justify-center">
            <span
              className="block h-1 w-14 rounded-full bg-white/20 sm:w-16"
              aria-hidden
            />
            <span className="sr-only">Sin nota detectada</span>
          </div>
        )}
      </div>

      <p
        className="min-h-4 w-full shrink-0 text-center text-xs font-semibold tracking-[0.25em] text-brand-muted uppercase"
      >
        <span className={hasNote ? '' : 'invisible'}>
          {hasNote ? secondary : 'LA'}
        </span>
      </p>

      <p
        className="mt-1 flex min-h-8 w-full shrink-0 items-center justify-center rounded-full border border-white/[0.07] bg-white/[0.03] px-3 py-1 text-sm font-semibold text-brand-white tabular-nums"
      >
        <span className={reading?.freq != null ? '' : 'text-brand-muted/50'}>
          {freqText}
        </span>
      </p>
    </div>
  );
}
