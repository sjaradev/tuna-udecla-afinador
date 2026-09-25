import { Button } from '../ui/Button';
import { TunaLogo } from '../brand/TunaLogo';

interface Props {
  loading: boolean;
  onActivate: () => void;
}

/** Onboarding corto (plan §16): marca, tagline, activar, privacidad. */
export function Onboarding({ loading, onActivate }: Props) {
  return (
    <div className="relative flex min-h-[80dvh] flex-col items-center justify-center gap-8 text-center">
      {/* Cinta diagonal decorativa */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-24 opacity-20"
        style={{
          background:
            'repeating-linear-gradient(135deg, transparent 0 26px, #3b7de0 26px 34px, transparent 34px 60px, #f0c04a 60px 68px, transparent 68px 94px)',
          maskImage: 'linear-gradient(to bottom, black, transparent)',
          WebkitMaskImage: 'linear-gradient(to bottom, black, transparent)',
        }}
      />

      <TunaLogo />

      <div>
        <h1 className="text-gradient text-5xl font-black tracking-tighter">
          Afinador
        </h1>
        <p className="mx-auto mt-2 max-w-xs text-sm text-brand-muted">
          Afina tu instrumento con precisión, dondequiera que estés.
        </p>
      </div>

      <Button
        onClick={onActivate}
        disabled={loading}
        className="rounded-full px-12 py-4 text-lg tracking-wide"
      >
        {loading ? 'Solicitando micrófono…' : 'ACTIVAR AFINADOR'}
      </Button>

      <p className="glass flex max-w-xs items-center gap-2 rounded-full px-4 py-2 text-xs leading-relaxed text-brand-muted">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
          className="shrink-0 text-brand-green"
        >
          <rect
            x="5"
            y="11"
            width="14"
            height="9"
            rx="2"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M8 11V8a4 4 0 1 1 8 0v3"
            stroke="currentColor"
            strokeWidth="1.8"
          />
        </svg>
        El audio se procesa exclusivamente en tu dispositivo. No se graba ni se
        envía a ningún servidor.
      </p>
    </div>
  );
}
