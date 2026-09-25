import escudoUrl from '../../assets/brand/escudo-udec.svg';

/**
 * Logo vertical de la Tuna UdeC Campus Los Ángeles:
 * TUNA / UNIVERSIDAD DE CONCEPCIÓN / escudo / CAMPUS LOS ÁNGELES / CHILE.
 * El escudo conserva su proporción original (366×450 → h fija, w auto).
 */
export function TunaLogo() {
  return (
    <div className="relative flex flex-col items-center text-center">
      {/* Halo dorado detrás del conjunto */}
      <div
        aria-hidden
        className="absolute top-1/2 left-1/2 -z-10 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-gold/12 blur-3xl"
      />
      <p className="translate-x-[0.19em] text-4xl font-black tracking-[0.38em] text-brand-gold">
        TUNA
      </p>
      <p className="mt-1.5 translate-x-[0.09em] text-[11px] font-semibold tracking-[0.18em] text-brand-gold/90">
        UNIVERSIDAD DE CONCEPCIÓN
      </p>
      <img
        src={escudoUrl}
        alt="Escudo Universidad de Concepción"
        className="my-5 h-36 w-auto drop-shadow-[0_0_24px_rgb(240_192_74/0.25)]"
      />
      <p className="translate-x-[0.11em] text-sm font-bold tracking-[0.22em] text-brand-gold">
        CAMPUS LOS ÁNGELES
      </p>
      <p className="mt-1.5 translate-x-[0.19em] text-[10px] font-semibold tracking-[0.38em] text-brand-gold/75">
        CHILE
      </p>
    </div>
  );
}
