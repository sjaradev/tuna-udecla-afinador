import { useSettings } from '../../hooks/useSettings';
import { MAX_A4, MIN_A4 } from '../../dsp/music';
import { Sheet } from '../ui/Sheet';
import { Slider } from '../ui/Slider';
import { SegmentedControl } from '../ui/SegmentedControl';
import { Button } from '../ui/Button';

interface Props {
  open: boolean;
  onClose: () => void;
}

const supportsVibration =
  typeof navigator !== 'undefined' && 'vibrate' in navigator;

export function SettingsSheet({ open, onClose }: Props) {
  const { settings, updateSettings, resetSettings } = useSettings();

  return (
    <Sheet open={open} onClose={onClose} title="Ajustes">
      <div className="flex flex-col gap-6">
        <Slider
          label="Referencia A4"
          value={settings.a4Reference}
          min={MIN_A4}
          max={MAX_A4}
          step={0.5}
          unit=" Hz"
          onChange={(v) => updateSettings({ a4Reference: v })}
        />

        <div>
          <p className="mb-1 text-sm text-brand-muted">Modo</p>
          <SegmentedControl
            ariaLabel="Modo de ruido"
            value={settings.noiseMode}
            onChange={(noiseMode) => updateSettings({ noiseMode })}
            options={[
              { value: 'normal', label: 'Normal' },
              { value: 'noisy', label: 'Ambiente ruidoso' },
            ]}
          />
          {settings.noiseMode === 'noisy' && (
            <p className="mt-1 text-xs text-brand-muted">
              Responde un poco más lento, pero con lecturas mucho más estables.
              Selecciona la cuerda para mejores resultados.
            </p>
          )}
        </div>

        <div>
          <p className="mb-1 text-sm text-brand-muted">Notación</p>
          <SegmentedControl
            ariaLabel="Notación"
            value={settings.notation}
            onChange={(notation) => updateSettings({ notation })}
            options={[
              { value: 'latin', label: 'Latina', sublabel: 'DO RE MI' },
              { value: 'international', label: 'Internacional', sublabel: 'C D E' },
            ]}
          />
        </div>

        <div>
          <p className="mb-1 text-sm text-brand-muted">Sensibilidad del micrófono</p>
          <SegmentedControl
            ariaLabel="Sensibilidad"
            value={settings.sensitivity}
            onChange={(sensitivity) => updateSettings({ sensitivity })}
            options={[
              { value: 'low', label: 'Baja' },
              { value: 'medium', label: 'Media' },
              { value: 'high', label: 'Alta' },
            ]}
          />
        </div>

        {supportsVibration && (
          <label className="flex min-h-12 cursor-pointer items-center justify-between gap-4">
            <span className="text-sm text-brand-muted">
              Vibrar al afinar
            </span>
            <span className="relative inline-flex items-center">
              <input
                type="checkbox"
                checked={settings.vibrateOnTune}
                onChange={(e) =>
                  updateSettings({ vibrateOnTune: e.target.checked })
                }
                className="peer sr-only"
              />
              <span
                aria-hidden
                className="h-7 w-12 rounded-full border border-white/10 bg-white/[0.08] transition-colors peer-checked:border-brand-gold/60 peer-checked:bg-brand-gold/90 peer-checked:shadow-[0_0_14px_rgb(240_192_74/0.40)]"
              />
              <span
                aria-hidden
                className="absolute top-1/2 left-1 h-5 w-5 -translate-y-1/2 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5 peer-checked:bg-[#241a04]"
              />
            </span>
          </label>
        )}

        <Button variant="secondary" onClick={resetSettings}>
          Restablecer configuración
        </Button>

        <p className="text-xs leading-relaxed text-brand-muted">
          El audio se analiza en tiempo real en este dispositivo. No se graba ni
          se envía a ningún servidor.
        </p>
        <p className="text-xs text-brand-muted">
          Tuna UdeC — Afinador · v{__APP_VERSION__}
        </p>
      </div>
    </Sheet>
  );
}
