import { useState } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { Header } from '../components/layout/Header';
import { PermissionGate } from '../components/permission/PermissionGate';
import { TunerScreen } from '../components/tuner/TunerScreen';
import { SettingsSheet } from '../components/settings/SettingsSheet';
import { UpdatePrompt } from '../components/pwa/UpdatePrompt';

/** Composición de vistas por estado; sin router (plan §2.1). */
export function RootScreen() {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <AppShell>
      <Header onOpenSettings={() => setSettingsOpen(true)} />
      <main className="mt-2">
        <PermissionGate>
          <TunerScreen />
        </PermissionGate>
      </main>
      <SettingsSheet open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <UpdatePrompt />
    </AppShell>
  );
}
