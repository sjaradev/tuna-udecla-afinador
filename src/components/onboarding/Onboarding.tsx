import { Button } from '../ui/Button';
import escudoUrl from '../../assets/brand/escudo-udec.svg';

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
            'repeating-linear-gradient(135deg, transparent 0 26px, #2f6fd0 26px 34px, transparent 34px 60px, #e8b93b 60px 68px, transparent 68px 94px)',
          maskImage: 'linear-gradient(to bottom, black, transparent)',
          WebkitMaskImage: 'linear-gradient(to bottom, black, transparent)',
        }}
      />

      <img src={escudoUrl} alt="" className="h-20 w-20" />

      <div>
        <p className="text-sm font-semibold tracking-[0.3em] text-brand-gold">
          TUNA UDEC
        </p>
        <h1 className="mt-1 text-5xl font-black tracking-tight">Afinador</h1>
        <p className="mt-3 max-w-xs text-brand-muted">
          Afina tu instrumento con precisión, dondequiera que estés.
        </p>
      </div>

      <Button
        onClick={onActivate}
        disabled={loading}
        className="px-10 py-4 text-lg"
      >
        {loading ? 'Solicitando micrófono…' : 'ACTIVAR AFINADOR'}
      </Button>

      <p className="max-w-xs text-xs leading-relaxed text-brand-muted">
        El audio se procesa exclusivamente en tu dispositivo. No se graba ni se
        envía a ningún servidor.
      </p>
    </div>
  );
}
