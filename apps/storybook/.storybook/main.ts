import { fileURLToPath } from 'node:url'
import type { StorybookConfig } from '@storybook/react-vite'

// The vitrine of the Escala components (manual "de Figma a React", F5): every
// story's args and argTypes are the Figma component's properties, 1:1.
const config: StorybookConfig = {
  stories: ['../stories/**/*.mdx', '../stories/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-docs', '@storybook/addon-a11y'],
  // The autodocs page of every component is its "Documentation" (drawn by docs/ComponentDocPage.tsx).
  docs: { defaultName: 'Documentation' },
  // One sidebar entry per family (design-plans/storybook-families.md): a part's stories live inside its family's
  // entry, hidden by default. The sidebar's tag filter shows them; the family's Documentation links each one.
  tags: { part: { defaultFilterSelection: 'exclude' } },
  // The logo (manager and Introduction). escala-logo-dark.svg is the one drawn FOR a dark background (white wordmark).
  staticDirs: [{ from: '../../../public/escala-ds-logo', to: '/brand' }],
  // No usage data leaves the machine.
  core: { disableTelemetry: true },
  framework: {
    name: '@storybook/react-vite',
    options: { builder: { viteConfigPath: fileURLToPath(new URL('../vite.config.ts', import.meta.url)) } },
  },
}
export default config
