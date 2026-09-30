import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';

// BASE_PATH wordt bij het publiceren op GitHub Pages gezet (bv. "/DeMol/").
const base = process.env.BASE_PATH ?? './';

export default defineConfig({
  base,
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'logo.svg'],
      manifest: {
        name: "Wie is 't Duvelke?",
        short_name: "'t Duvelke",
        description: 'Een spannend speurspel voor op de tablet, ook zonder internet.',
        lang: 'nl-BE',
        theme_color: '#2a1454',
        background_color: '#2a1454',
        display: 'fullscreen',
        orientation: 'any',
        start_url: '.',
        scope: '.',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Alles (ook lettertypes en geluiden) wordt vooraf in de cache gezet: zo werkt het spel offline.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2,mp3,ogg,webp}'],
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
