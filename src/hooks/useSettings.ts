import { useSyncExternalStore } from 'react';
import { settingsStore, type Settings } from '../state/settings';

export function useSettings() {
  const settings = useSyncExternalStore(
    settingsStore.subscribe,
    settingsStore.getSnapshot,
  );
  return {
    settings,
    updateSettings: (patch: Partial<Settings>) => settingsStore.update(patch),
    resetSettings: () => settingsStore.reset(),
  };
}
