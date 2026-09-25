import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from '../ui/Button';

/** Aviso discreto cuando hay una nueva versión del service worker. */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div className="safe-bottom fixed inset-x-0 bottom-0 z-40 flex justify-center p-4">
      <div className="glass flex w-full max-w-md items-center justify-between gap-3 rounded-2xl !bg-[#0d1830]/90 p-4 shadow-2xl">
        <p className="text-sm">Nueva versión disponible</p>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setNeedRefresh(false)}>
            Después
          </Button>
          <Button onClick={() => void updateServiceWorker(true)}>
            Actualizar
          </Button>
        </div>
      </div>
    </div>
  );
}
