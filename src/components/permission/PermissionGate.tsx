import type { ReactNode } from 'react';
import { useTuner } from '../../hooks/useTuner';
import { Onboarding } from '../onboarding/Onboarding';
import { PermissionHelp } from './PermissionHelp';
import { Button } from '../ui/Button';

/** Decide qué mostrar según el estado del micrófono (máquina de estados, plan §4). */
export function PermissionGate({ children }: { children: ReactNode }) {
  const { micState, micError, activate, resumeFromGesture } = useTuner();

  switch (micState) {
    case 'running':
      return <>{children}</>;

    case 'idle':
      return <Onboarding loading={false} onActivate={() => void activate()} />;

    case 'requesting':
      return <Onboarding loading onActivate={() => {}} />;

    case 'denied':
    case 'unavailable':
    case 'error':
      return (
        <PermissionHelp error={micError} onRetry={() => void activate()} />
      );

    case 'suspended':
      return (
        <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 text-center">
          <p className="text-brand-muted">Reanudando el micrófono…</p>
        </div>
      );

    case 'awaitingGesture':
      return (
        <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 text-center">
          <p className="max-w-xs text-brand-muted">
            El audio se pausó mientras la app estaba en segundo plano.
          </p>
          <Button onClick={() => void resumeFromGesture()}>
            Toca para reanudar
          </Button>
        </div>
      );
  }
}
