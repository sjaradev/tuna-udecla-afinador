import { useEffect, useRef, useState } from 'react';
import { audioEngine } from '../../audio/AudioEngine';
import { useTuner } from '../../hooks/useTuner';
import { useSettings } from '../../hooks/useSettings';
import { instrumentPresets } from '../../config/instruments';
import { stateColorHex } from '../../lib/signalText';
import { InstrumentPicker } from './InstrumentPicker';
import { NoteDisplay } from './NoteDisplay';
import { CentsGauge } from './CentsGauge';
import { StringSelector } from './StringSelector';
import { SignalHint } from './SignalHint';

const DEBUG = new URLSearchParams(window.location.search).has('debug');

export function TunerScreen() {
  const { reading } = useTuner();
  const { settings, updateSettings } = useSettings();

  // Canal rápido para la aguja: lecturas directas del engine, sin React
  const centsRef = useRef(0);
  useEffect(() => {
    return audioEngine.onReading((msg) => {
      if (msg.type === 'reading' && msg.reading.cents !== null) {
        centsRef.current = msg.reading.cents;
      }
    });
  }, []);

  // Vibración corta al entrar en "Afinado" (si el navegador la soporta)
  const prevState = useRef<string | null>(null);
  useEffect(() => {
    const state = reading?.state ?? null;
    if (
      state === 'tuned' &&
      prevState.current !== 'tuned' &&
      settings.vibrateOnTune &&
      'vibrate' in navigator
    ) {
      navigator.vibrate(40);
    }
    prevState.current = state;
  }, [reading?.state, settings.vibrateOnTune]);

  const preset = instrumentPresets[settings.lastInstrument];
  const needleColor = stateColorHex(reading);

  return (
    <div className="flex flex-col gap-5 lg:grid lg:grid-cols-2 lg:items-start lg:gap-10">
      {/* Columna de medición */}
      <section className="flex flex-col items-center gap-4 rounded-3xl bg-brand-navy-soft p-6">
        <NoteDisplay reading={reading} notation={settings.notation} />
        <CentsGauge centsRef={centsRef} needleColor={needleColor} />
        <SignalHint reading={reading} />
        {reading?.cents !== null && reading?.cents !== undefined && (
          <p className="text-sm text-brand-muted tabular-nums">
            {reading.cents > 0 ? '+' : ''}
            {reading.cents.toFixed(1)} cents
          </p>
        )}
      </section>

      {/* Columna de controles */}
      <section className="flex flex-col items-center gap-4">
        <InstrumentPicker
          value={settings.lastInstrument}
          onChange={(id) =>
            updateSettings({ lastInstrument: id, lastString: null })
          }
        />
        <StringSelector
          preset={preset}
          selected={settings.lastString}
          detected={reading?.stringIndex ?? null}
          notation={settings.notation}
          onSelect={(i) => updateSettings({ lastString: i })}
        />
      </section>

      {DEBUG && <DebugPanel />}
    </div>
  );
}

/** Panel de calibración (?debug=1): crudo vs. mostrado, claridad, RMS, piso. */
function DebugPanel() {
  const { reading, level } = useTuner();
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 200);
    return () => clearInterval(id);
  }, []);
  return (
    <pre className="w-full rounded-xl bg-black/40 p-3 text-xs text-brand-muted lg:col-span-2">
      {JSON.stringify(
        {
          state: reading?.state,
          cents: reading?.cents,
          rawCents: reading?.rawCents,
          clarity: reading?.clarity?.toFixed(3),
          rmsDb: level?.rmsDb.toFixed(1),
          noiseFloorDb: level?.noiseFloorDb.toFixed(1),
          gateOpen: level?.gateOpen,
          reject: reading?.rejectReason,
        },
        null,
        1,
      )}
    </pre>
  );
}
