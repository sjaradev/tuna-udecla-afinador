import escudoUrl from '../../assets/brand/escudo-udec.svg';

interface Props {
  onOpenSettings: () => void;
}

export function Header({ onOpenSettings }: Props) {
  return (
    <header className="flex items-center justify-between gap-3 py-2">
      <div className="flex items-center gap-3">
        <img
          src={escudoUrl}
          alt="Escudo Universidad de Concepción"
          className="h-10 w-10"
        />
        <div className="leading-tight">
          <p className="text-sm font-bold tracking-wide">Tuna UdeC</p>
          <p className="text-xs text-brand-muted">Campus Los Ángeles</p>
        </div>
      </div>
      <button
        onClick={onOpenSettings}
        aria-label="Abrir ajustes"
        className="flex min-h-12 min-w-12 items-center justify-center rounded-xl text-brand-muted transition-colors hover:bg-brand-navy-raised hover:text-brand-white"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.11-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.65 8.9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.08A1.7 1.7 0 0 0 10.12 3V3a2 2 0 1 1 4 0v.09c0 .68.4 1.3 1.03 1.56.6.26 1.3.12 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.08c.26.6.88 1.03 1.56 1.03H21a2 2 0 1 1 0 4h-.09c-.68 0-1.3.4-1.51 1.03Z"
            stroke="currentColor"
            strokeWidth="1.8"
          />
        </svg>
      </button>
    </header>
  );
}
