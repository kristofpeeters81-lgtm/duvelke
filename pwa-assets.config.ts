import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

export default defineConfig({
  preset: {
    ...minimal2023Preset,
    maskable: { ...minimal2023Preset.maskable, resizeOptions: { background: '#2a1454' } },
    apple: { ...minimal2023Preset.apple, resizeOptions: { background: '#2a1454' } },
  },
  images: ['public/logo.svg'],
});
