import type { ReactNode } from 'react';

/** Contenedor principal: safe areas, ancho máximo, fondo ambiental con auroras. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="safe-top safe-bottom safe-left safe-right relative min-h-dvh overflow-x-hidden bg-brand-navy">
      {/* Fondo ambiental ESTÁTICO (degradados pintados una sola vez; los
          blurs animados consumían GPU constantemente y calentaban el equipo) */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0"
        style={{
          background: [
            'radial-gradient(46rem 26rem at 50% -10%, rgb(59 125 224 / 0.15), transparent 70%)',
            'radial-gradient(24rem 20rem at -10% 35%, rgb(107 163 242 / 0.09), transparent 70%)',
            'radial-gradient(26rem 22rem at 110% 100%, rgb(240 192 74 / 0.07), transparent 70%)',
            'radial-gradient(ellipse at center, transparent 45%, rgb(3 6 12 / 0.55) 100%)',
          ].join(', '),
        }}
      />

      {/* Cinta diagonal azul/dorado, motivo de la beca de tuna */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-1 opacity-70"
        style={{
          background:
            'repeating-linear-gradient(135deg, #f0c04a 0 18px, #3b7de0 18px 36px)',
          maskImage:
            'linear-gradient(to right, transparent, black 12%, black 88%, transparent)',
          WebkitMaskImage:
            'linear-gradient(to right, transparent, black 12%, black 88%, transparent)',
        }}
      />
      <div className="relative mx-auto w-full max-w-6xl px-4 pt-4 pb-6">
        {children}
      </div>
    </div>
  );
}
