import type { ReactNode } from 'react';

/** Contenedor principal: safe areas, ancho máximo, fondo con textura tenue. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="safe-top safe-bottom safe-left safe-right relative min-h-dvh overflow-x-hidden bg-brand-navy">
      {/* Cinta diagonal azul/dorado, motivo de la beca de tuna */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-1.5"
        style={{
          background:
            'repeating-linear-gradient(135deg, #e8b93b 0 18px, #2f6fd0 18px 36px)',
        }}
      />
      <div className="mx-auto w-full max-w-6xl px-4 pt-4 pb-6">{children}</div>
    </div>
  );
}
