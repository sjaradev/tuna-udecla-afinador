import type { ReactNode } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

/** Hoja modal inferior (mobile-first), centrada en escritorio. */
export function Sheet({ open, onClose, title, children }: Props) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className="glass safe-bottom max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-t-[2rem] !bg-[#0a1322]/95 p-6 shadow-2xl sm:rounded-[2rem]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Manija de arrastre (móvil) */}
        <div
          aria-hidden
          className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/15 sm:hidden"
        />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="flex min-h-12 min-w-12 items-center justify-center rounded-full text-2xl text-brand-muted transition-colors hover:bg-white/[0.06] hover:text-brand-white"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
