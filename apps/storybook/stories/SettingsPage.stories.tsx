import type { Meta, StoryObj } from '@storybook/react-vite'
import { SettingsPage } from '../../../src/components/escala-ui/screens/screens'

/** The Figma `SettingsPage` (2223:838): a screen composed from components only. Its pieces, SettingsSection and
 *  SettingsRow, are parts of this entry, never loose components. Motion: none beyond the components. */
const meta: Meta = {
  title: 'Screens/SettingsPage',
  tags: ['stage:storybook'],
  parameters: { layout: 'fullscreen' },
  render: (_args, ctx) => <SettingsPage layout={ctx.globals.dimensions === 'mobile' ? 'mobile' : 'desktop'} />,
}
export default meta
type Story = StoryObj
export const Playground: Story = {}
export const Dark: Story = { globals: { theme: 'dark' } }
export const Mobile: Story = { globals: { dimensions: 'mobile' } }
