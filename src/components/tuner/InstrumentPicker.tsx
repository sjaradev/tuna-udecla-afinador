import type { InstrumentId } from '../../types';
import { INSTRUMENT_ORDER, instrumentPresets } from '../../config/instruments';
import { SegmentedControl } from '../ui/SegmentedControl';

interface Props {
  value: InstrumentId;
  onChange: (id: InstrumentId) => void;
}

export function InstrumentPicker({ value, onChange }: Props) {
  return (
    <SegmentedControl
      ariaLabel="Instrumento"
      value={value}
      onChange={onChange}
      options={INSTRUMENT_ORDER.map((id) => ({
        value: id,
        label: instrumentPresets[id].name,
      }))}
    />
  );
}
