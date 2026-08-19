import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // The colour layer is pure TypeScript — no DOM needed, and keeping it that
    // way is a design constraint worth enforcing: anything that needs jsdom to
    // compute a colour has a dependency it should not have.
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts', 'src/**/*.test.ts'],
    server: {
      deps: {
        // `@material/material-color-utilities` ships ESM with extensionless
        // relative imports, which Node's own resolver rejects. Vite resolves
        // them fine when it transforms the package, so inline it rather than
        // letting vitest externalise it to Node. The app build is unaffected —
        // Vite pre-bundles dependencies there anyway.
        inline: ['@material/material-color-utilities'],
      },
    },
  },
})
