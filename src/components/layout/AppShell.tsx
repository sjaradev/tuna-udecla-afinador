import type { ReactNode } from 'react';

/** Contenedor principal: safe areas, ancho máximo, fondo ambiental con auroras. */
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="safe-top safe-bottom safe-left safe-right relative min-h-dvh overflow-x-hidden bg-brand-navy">
      {/* Fondo ambiental: resplandores azul/dorado flotando sobre navy profundo */}
      <div aria-hidden className="pointer-events-none fixed inset-0">
        <div className="animate-aurora absolute -top-40 left-1/2 h-[26rem] w-[46rem] -translate-x-1/2 rounded-full bg-brand-blue/15 blur-[130px]" />
        <div className="animate-aurora-slow absolute top-1/3 -left-40 h-[20rem] w-[24rem] rounded-full bg-brand-blue-bright/10 blur-[110px]" />
        <div className="animate-aurora absolute -right-32 bottom-0 h-[22rem] w-[26rem] rounded-full bg-brand-gold/[0.08] blur-[120px]" />
        {/* Viñeta para dar profundidad */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgb(3_6_12/0.55)_100%)]" />
      </div>

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
