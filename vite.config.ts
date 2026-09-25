/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

// VITE_BASE lo inyecta el workflow de GitHub Actions como `/<repo>/`.
// En desarrollo local el base es '/'.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.1.0'),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'icons/*.png', 'splash/*.png'],
      manifest: {
        name: 'Tuna UdeC — Afinador',
        short_name: 'Afinador UdeC',
        description:
          'Afinador de instrumentos para la Tuna de la Universidad de Concepción, Campus Los Ángeles. El audio se procesa solo en tu dispositivo.',
        lang: 'es',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'portrait',
        theme_color: '#0a1628',
        background_color: '#0a1628',
        icons: [
          { src: 'icons/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        navigateFallback: 'index.html',
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
    }),
  ],
  worker: {
    format: 'es',
  },
  test: {
    environment: 'node',
    include: ['src/test/**/*.test.ts'],
  },
});
