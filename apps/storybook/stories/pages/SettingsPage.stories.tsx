import type { Meta, StoryObj } from '@storybook/react-vite'
import { Input } from '../../../../src/components/escala-ui/input'
import { SettingsRow } from '../../../../src/components/escala-ui/settings-row'
import { SettingsSection } from '../../../../src/components/escala-ui/settings-section'
import { Switch } from '../../../../src/components/escala-ui/switch'

/** The Figma `SettingsPage` (2223:838): a screen composed from components only. Motion: none beyond the components. */
function SettingsPage({ mobile }: { mobile: boolean }) {
  const layout = mobile ? 'stacked' : 'inline'
  return (
    <main style={{ background: 'var(--color-surface-page)', padding: 'var(--spacing-inset-page)', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-gap-section)' }}>
        <SettingsSection title="Profile" description="How you appear across Ohmewn.">
          <SettingsRow layout="stacked" title="Display name" description="Shown on your issues and comments." control={<Input defaultValue="Inès Moreau" />} />
          <SettingsRow layout="stacked" title="Email" control={<Input type="email" defaultValue="ines@ohmewn.app" />} />
        </SettingsSection>
        <SettingsSection title="Notifications" description="Choose what reaches your inbox.">
          <SettingsRow layout={layout} title="Email notifications" description="Send a summary of activity every morning." control={<Switch defaultChecked />} />
          <SettingsRow layout={layout} title="Product updates" description="Tell me when a new feature ships." control={<Switch />} />
        </SettingsSection>
      </div>
    </main>
  )
}
const meta: Meta = { title: 'Pages/SettingsPage', tags: ['stage:storybook'], parameters: { layout: 'fullscreen' }, render: (_args, ctx) => <SettingsPage mobile={ctx.globals.dimensions === 'mobile'} /> }
export default meta
type Story = StoryObj
export const Playground: Story = {}
export const Dark: Story = { globals: { theme: 'dark' } }
export const Mobile: Story = { globals: { dimensions: 'mobile' } }
