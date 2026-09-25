/**
 * Fachada entre React y el motor de audio (plan §4, F5).
 * Expone estado discreto vía stores y acciones que requieren gesto del usuario.
 */
import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import { audioEngine } from '../audio/AudioEngine';
import { tunerStore } from '../state/tunerStore';
import { settingsStore } from '../state/settings';
import type { TunerConfig } from '../types';

export function buildTunerConfig(): TunerConfig {
  const s = settingsStore.getSnapshot();
  return {
    mode: s.noiseMode,
    sensitivity: s.sensitivity,
    a4: s.a4Reference,
    instrument: s.lastInstrument,
    stringIndex: s.lastInstrument === 'cromatico' ? null : s.lastString,
  };
}

let wired = false;

/** Conecta el engine con los stores una sola vez por sesión. */
function wireEngine(): void {
  if (wired) return;
  wired = true;
  audioEngine.onState((state, error) => tunerStore.setMicState(state, error));
  audioEngine.onReading((msg) => {
    if (msg.type === 'reading') tunerStore.setReading(msg.reading);
    else if (msg.type === 'level') tunerStore.setLevel(msg.level);
    else tunerStore.setWorkerConfig(msg.config);
  });
}

export function useTuner() {
  wireEngine();
  const ui = useSyncExternalStore(tunerStore.subscribe, tunerStore.getSnapshot);

  // Propagar cambios de ajustes al worker sin reiniciar el micrófono
  const settings = useSyncExternalStore(
    settingsStore.subscribe,
    settingsStore.getSnapshot,
  );
  useEffect(() => {
    if (audioEngine.getState() === 'running') {
      audioEngine.setConfig(buildTunerConfig());
    }
  }, [settings]);

  /** Gesto del usuario: "Activar afinador". */
  const activate = useCallback(async (): Promise<boolean> => {
    const ok = await audioEngine.start(buildTunerConfig());
    if (ok && !settingsStore.getSnapshot().onboardingDone) {
      settingsStore.update({ onboardingDone: true });
    }
    return ok;
  }, []);

  const resumeFromGesture = useCallback(async (): Promise<void> => {
    await audioEngine.resumeFromGesture();
  }, []);

  const stop = useCallback(async (): Promise<void> => {
    await audioEngine.stop();
  }, []);

  return useMemo(
    () => ({
      micState: ui.micState,
      micError: ui.micError,
      reading: ui.reading,
      level: ui.level,
      workerConfig: ui.workerConfig,
      activate,
      resumeFromGesture,
      stop,
    }),
    [ui, activate, resumeFromGesture, stop],
  );
}
