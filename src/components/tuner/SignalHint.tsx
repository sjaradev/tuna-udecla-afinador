import type { TunerReading } from '../../types';
import { signalHint, stateColor } from '../../lib/signalText';

interface Props {
  reading: TunerReading | null;
}

/** Pista de señal discreta (plan §6.2). aria-live para accesibilidad. */
export function SignalHint({ reading }: Props) {
  const tuned = reading?.state === 'tuned';
  return (
    <p
      aria-live="polite"
      className={`min-h-6 text-center text-sm font-medium ${stateColor(reading)} ${
        tuned ? 'tuned-pulse' : ''
      }`}
    >
      {signalHint(reading)}
    </p>
  );
}
