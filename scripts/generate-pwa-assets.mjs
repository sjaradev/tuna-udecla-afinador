/**
 * Genera los assets PWA desde src/assets/brand/icon-source.svg:
 * - icons/pwa-192x192.png, pwa-512x512.png
 * - icons/maskable-512x512.png (con zona segura)
 * - icons/apple-touch-icon-180x180.png
 * - splash/apple-splash-*.png (pantallas de inicio de iOS)
 *
 * Uso: npm run pwa-assets
 */
import sharp from 'sharp';
import { Resvg } from '@resvg/resvg-js';
import { mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(root, 'src/assets/brand/icon-source.svg');
const ICONS = join(root, 'public/icons');
const SPLASH = join(root, 'public/splash');

const NAVY = '#0a1628';

/** Dispositivos iOS referenciados en index.html (width × height @ pixels). */
const SPLASH_SIZES = [
  [1170, 2532], // iPhone 12/13/14
  [1179, 2556], // iPhone 14 Pro/15
  [1284, 2778], // iPhone Plus/Max
  [1290, 2796], // iPhone 14 Pro Max/15 Pro Max
  [750, 1334], // iPhone SE/8
];

/** Rasteriza el SVG fuente a PNG del tamaño dado (resvg: soporte SVG completo). */
function renderSvg(svg, size) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: size },
    background: 'rgba(0,0,0,0)',
  });
  return resvg.render().asPng();
}

async function main() {
  await mkdir(ICONS, { recursive: true });
  await mkdir(SPLASH, { recursive: true });
  const svg = await readFile(SRC, 'utf8');

  // Iconos estándar
  for (const size of [192, 512]) {
    await sharp(renderSvg(svg, size))
      .png()
      .toFile(join(ICONS, `pwa-${size}x${size}.png`));
  }

  // Maskable: icono al 65 % sobre fondo navy (zona segura)
  {
    const size = 512;
    const inner = Math.round(size * 0.65);
    await sharp({
      create: { width: size, height: size, channels: 4, background: NAVY },
    })
      .composite([{ input: renderSvg(svg, inner), gravity: 'center' }])
      .png()
      .toFile(join(ICONS, `maskable-${size}x${size}.png`));
  }

  // apple-touch-icon (sin transparencia)
  await sharp(renderSvg(svg, 180))
    .flatten({ background: NAVY })
    .png()
    .toFile(join(ICONS, 'apple-touch-icon-180x180.png'));

  // Splash screens iOS: fondo navy + icono centrado
  for (const [w, h] of SPLASH_SIZES) {
    const iconSize = Math.round(Math.min(w, h) * 0.28);
    await sharp({
      create: { width: w, height: h, channels: 4, background: NAVY },
    })
      .composite([{ input: renderSvg(svg, iconSize), gravity: 'center' }])
      .png()
      .toFile(join(SPLASH, `apple-splash-${w}-${h}.png`));
  }

  console.log('Assets PWA generados en public/icons y public/splash');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
