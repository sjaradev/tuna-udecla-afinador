import type { MicError } from '../../types';
import { Button } from '../ui/Button';

interface Props {
  error: MicError | null;
  onRetry: () => void;
}

const isIOS =
  typeof navigator !== 'undefined' &&
  /iP(hone|ad|od)/.test(navigator.userAgent);
const isAndroid =
  typeof navigator !== 'undefined' && /Android/.test(navigator.userAgent);

/** Instrucciones de desbloqueo por navegador (plan §4). */
function blockedInstructions(): string[] {
  if (isIOS) {
    return [
      'Abre Ajustes → Apps → Safari → Micrófono y elige "Permitir".',
      'O toca el icono "aA"/⋮ en la barra de Safari → Ajustes del sitio web → Micrófono → Permitir.',
      'Si la app está instalada en pantalla de inicio, revisa Ajustes → la app → Micrófono.',
    ];
  }
  if (isAndroid) {
    return [
      'Toca el candado (o icono de ajustes) en la barra de direcciones de Chrome.',
      'Entra en Permisos → Micrófono → Permitir.',
      'Vuelve aquí y toca Reintentar.',
    ];
  }
  return [
    'Toca el candado en la barra de direcciones del navegador.',
    'Permite el acceso al micrófono para este sitio.',
    'Recarga la página o toca Reintentar.',
  ];
}

export function PermissionHelp({ error, onRetry }: Props) {
  const kind = error?.kind ?? 'unknown';

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-5 rounded-3xl bg-brand-navy-soft p-6 text-center">
      {kind === 'blocked' && (
        <>
          <h2 className="text-xl font-bold">Micrófono bloqueado</h2>
          <p className="text-sm text-brand-muted">
            El navegador tiene bloqueado el micrófono para este sitio. Para
            activarlo:
          </p>
          <ol className="list-decimal space-y-2 text-left text-sm text-brand-white">
            {blockedInstructions().map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <Button variant="secondary" onClick={onRetry}>
            Ya lo permití — Reintentar
          </Button>
        </>
      )}

      {kind === 'denied' && (
        <>
          <h2 className="text-xl font-bold">Permiso denegado</h2>
          <p className="text-sm text-brand-muted">
            Necesitamos el micrófono para escuchar tu instrumento. El audio se
            procesa solo en tu dispositivo: no se graba ni se envía a ningún
            servidor.
          </p>
          <Button onClick={onRetry}>Reintentar</Button>
        </>
      )}

      {kind === 'notfound' && (
        <>
          <h2 className="text-xl font-bold">Sin micrófono</h2>
          <p className="text-sm text-brand-muted">
            No se encontró ningún micrófono en este dispositivo. Conecta uno e
            inténtalo de nuevo.
          </p>
          <Button onClick={onRetry}>Reintentar</Button>
        </>
      )}

      {kind === 'busy' && (
        <>
          <h2 className="text-xl font-bold">Micrófono ocupado</h2>
          <p className="text-sm text-brand-muted">
            Otra aplicación está usando el micrófono. Ciérrala y vuelve a
            intentarlo.
          </p>
          <Button onClick={onRetry}>Reintentar</Button>
        </>
      )}

      {kind === 'insecure' && (
        <>
          <h2 className="text-xl font-bold">Conexión no segura</h2>
          <p className="text-sm text-brand-muted">
            El afinador requiere HTTPS para usar el micrófono. Accede mediante
            la dirección https:// del sitio.
          </p>
        </>
      )}

      {kind === 'unknown' && (
        <>
          <h2 className="text-xl font-bold">Error de audio</h2>
          <p className="text-sm text-brand-muted">
            {error?.message ?? 'Ocurrió un error inesperado al iniciar el audio.'}
          </p>
          <Button onClick={onRetry}>Reintentar</Button>
        </>
      )}
    </div>
  );
}
