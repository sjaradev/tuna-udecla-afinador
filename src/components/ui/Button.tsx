import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-gradient-to-b from-brand-gold-soft to-brand-gold text-[#241a04] font-bold shadow-[0_6px_24px_rgb(240_192_74/0.30)] hover:shadow-[0_6px_32px_rgb(240_192_74/0.45)] hover:brightness-105 active:scale-[0.97]',
  secondary:
    'border border-white/10 bg-white/[0.05] text-brand-white hover:bg-white/[0.09] active:scale-[0.98]',
  ghost: 'text-brand-muted hover:text-brand-white',
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

export function Button({ variant = 'primary', className = '', children, ...rest }: Props) {
  return (
    <button
      className={`min-h-12 min-w-12 rounded-2xl px-6 py-3 text-base transition-all disabled:opacity-40 ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
