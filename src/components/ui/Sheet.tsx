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
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={onClose}
    >
      <div
        className="safe-bottom max-h-[85dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-brand-navy-soft p-6 shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="flex min-h-12 min-w-12 items-center justify-center rounded-xl text-2xl text-brand-muted hover:text-brand-white"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
