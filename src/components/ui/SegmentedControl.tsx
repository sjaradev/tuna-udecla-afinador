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
}

/** Control segmentado con botones grandes (≥ 48 px), usable con una mano. */
export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  ariaLabel,
}: Props<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className="flex gap-2 overflow-x-auto rounded-2xl bg-brand-navy-soft p-1.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt.value)}
            className={`min-h-12 shrink-0 rounded-xl px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors ${
              selected
                ? 'bg-brand-blue text-brand-white shadow'
                : 'text-brand-muted hover:text-brand-white'
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
