// Storybook's own Vite config: React + Tailwind and the app's `@` alias — not the
// app's vite.config.ts, whose dev middlewares (licence, registry, API fallback)
// belong to the configurator, not to the component vitrine.
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('../../src', import.meta.url)) },
  },
})
