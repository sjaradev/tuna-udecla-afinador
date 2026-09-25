# Tuna UdeC — Afinador

Afinador web/PWA para la Tuna de la Universidad de Concepción, Campus Los
Ángeles. Guitarra, bandurria, laúd, guitarrón y modo cromático.

**Privacidad:** el audio se analiza en tiempo real en tu dispositivo. No se
graba ni se envía a ningún servidor. Sin analytics ni trackers.

## Uso

Abre la app desde el navegador del teléfono y toca **ACTIVAR AFINADOR**. El
permiso de micrófono se solicita solo en ese momento.

### Instalar como aplicación

**Android (Chrome):**

1. Abre el sitio en Chrome.
2. Menú ⋮ → **Agregar a pantalla de inicio** / **Instalar aplicación**.

**iPhone (Safari):**

1. Abre el sitio en **Safari** (no Chrome).
2. Botón **Compartir** → **Agregar a pantalla de inicio**.

La app se abre en modo independiente (standalone) y funciona sin conexión una
vez cargada.

### Consejos de afinación

- Selecciona la cuerda que vas a afinar: el detector restringe su búsqueda a
  ±600 cents alrededor de esa nota y es mucho más estable.
- En **bandurria y laúd**, cada orden tiene 2 cuerdas: afina una por una,
  tapando suavemente la otra.
- En **guitarrón**, selecciona la cuerda manualmente: sus notas graves (A1/A2)
  pueden confundirse entre sí en modo automático.
- En ambientes ruidosos, activa **Ajustes → Modo → Ambiente ruidoso**.

## Desarrollo

```bash
npm install
npm run dev        # desarrollo local
npm run dev:https  # HTTPS en la LAN (para probar el micrófono en el teléfono)
npm run test       # tests del DSP (señales sintéticas, sin micrófono)
npm run build      # build de producción en dist/
npm run pwa-assets # regenera iconos y splash screens desde src/assets/brand/
```

Para probar en el teléfono dentro de la misma red: `npm run dev:https` y abre
`https://<ip-del-pc>:5173` (acepta el certificado autofirmado). El micrófono
exige contexto seguro (HTTPS o localhost).

Panel de calibración: agrega `?debug=1` a la URL para ver lectura cruda vs.
mostrada, claridad, RMS y piso de ruido.

## Despliegue (GitHub Pages)

Cada push a `main` ejecuta `.github/workflows/deploy.yml`: tests → build con
`VITE_BASE=/<repo>/` → deploy a Pages. Requiere que el repositorio tenga
**Settings → Pages → Source: GitHub Actions**.

## Documentación técnica

- [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md): arquitectura, fases y
  criterios de aceptación.
- [TUNER_TECHNICAL_SPEC.md](TUNER_TECHNICAL_SPEC.md): matemáticas y DSP en
  detalle (MPM, estabilizador, anti-ruido).

### Cambiar la afinación del guitarrón

Edita **solo** `GUITARRON_TUNING` en
[src/config/tunings.ts](src/config/tunings.ts) (grave → agudo). El resto de la
aplicación se adapta automáticamente.

## Assets de marca

`src/assets/brand/escudo-udec.svg` es un **placeholder**: reemplazarlo por el
escudo oficial de la Universidad de Concepción (verificar permiso de uso
institucional) manteniendo el nombre de archivo.
