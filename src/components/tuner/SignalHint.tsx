import type { TunerReading } from '../../types';
import { signalHint, stateColor, stateColorHex } from '../../lib/signalText';

interface Props {
  reading: TunerReading | null;
}

/** Pista de señal discreta en formato chip (plan §6.2). aria-live para accesibilidad. */
export function SignalHint({ reading }: Props) {
  const tuned = reading?.state === 'tuned';
  const dotColor = stateColorHex(reading);
  return (
    <p
      aria-live="polite"
      className={`inline-flex min-h-8 items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.03] px-4 py-1.5 text-center text-sm font-medium ${stateColor(reading)} ${
        tuned ? 'tuned-pulse' : ''
      }`}
    >
      <span
        aria-hidden
        className="h-2 w-2 shrink-0 rounded-full transition-colors duration-300"
        style={{ backgroundColor: dotColor, boxShadow: `0 0 8px ${dotColor}` }}
      />
      {signalHint(reading)}
    </p>
  );
}
