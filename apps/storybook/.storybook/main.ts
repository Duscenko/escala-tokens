import { fileURLToPath } from 'node:url'
import type { StorybookConfig } from '@storybook/react-vite'

// The vitrine of the Escala components (manual "de Figma a React", F5): every
// story's args and argTypes are the Figma component's properties, 1:1.
const config: StorybookConfig = {
  stories: ['../stories/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-docs', '@storybook/addon-a11y'],
  // No usage data leaves the machine.
  core: { disableTelemetry: true },
  framework: {
    name: '@storybook/react-vite',
    options: { builder: { viteConfigPath: fileURLToPath(new URL('../vite.config.ts', import.meta.url)) } },
  },
}
export default config
