interface Option<T extends string | number> {
  value: T;
  label: string;
  sublabel?: string;
}

interface Props<T extends string | number> {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  /** Variante compacta: menos alto y relleno (selectores del afinador). */
  compact?: boolean;
}

/** Control segmentado con botones grandes (≥ 48 px), usable con una mano. */
export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  ariaLabel,
  compact = false,
}: Props<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={`glass flex overflow-x-auto rounded-2xl [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
        compact ? 'gap-0.5 p-0.5' : 'gap-1 p-1'
      }`}
    >
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt.value)}
            className={`shrink-0 rounded-xl font-semibold whitespace-nowrap transition-all active:scale-95 ${
              compact
                ? 'min-h-9 px-3 text-xs'
                : 'min-h-12 px-4 py-2 text-sm'
            } ${
              selected
                ? 'bg-gradient-to-b from-[#4b8bec] to-[#2b5fb8] text-brand-white shadow-[0_4px_16px_rgb(59_125_224/0.40)]'
                : 'text-brand-muted hover:bg-white/[0.05] hover:text-brand-white'
            }`}
          >
            {opt.label}
            {opt.sublabel && (
              <span className="block text-xs font-normal opacity-80">
                {opt.sublabel}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
