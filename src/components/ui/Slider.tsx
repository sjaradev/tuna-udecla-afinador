interface Props {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (value: number) => void;
}

export function Slider({ label, value, min, max, step, unit = '', onChange }: Props) {
  return (
    <label className="block">
      <span className="mb-1 flex items-baseline justify-between text-sm">
        <span className="text-brand-muted">{label}</span>
        <span className="font-semibold text-brand-white tabular-nums">
          {value.toFixed(1)}
          {unit}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-12 w-full accent-brand-gold"
      />
    </label>
  );
}
