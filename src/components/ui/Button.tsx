import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-brand-gold text-brand-navy font-bold hover:bg-brand-gold-soft active:scale-[0.98]',
  secondary:
    'bg-brand-navy-raised text-brand-white border border-brand-blue/40 hover:border-brand-blue-bright',
  ghost: 'text-brand-muted hover:text-brand-white',
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

export function Button({ variant = 'primary', className = '', children, ...rest }: Props) {
  return (
    <button
      className={`min-h-12 min-w-12 rounded-xl px-6 py-3 text-base transition-all disabled:opacity-40 ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
