import type { Meta, StoryObj } from '@storybook/react-vite'
import { SettingsRow } from '../../../src/components/escala-ui/settings-row'
import { SettingsSection } from '../../../src/components/escala-ui/settings-section'
import { Switch } from '../../../src/components/escala-ui/switch'

/** Story args = the Figma `SettingsSection` (2224:123): Title, Description, DescriptionVisible and the Content slot. Motion: none. */
interface Args { title: string; description: string; descriptionVisible: boolean }
const meta: Meta<Args> = {
  title: 'Screens/SettingsPage',
  tags: ['!autodocs', 'part'],
  render: (a) => (
    <div style={{ maxWidth: 720 }}>
      <SettingsSection title={a.title} description={a.description} descriptionVisible={a.descriptionVisible}>
        <SettingsRow title="Email notifications" description="Send a summary of activity every morning." control={<Switch defaultChecked />} />
        <SettingsRow title="Product updates" description="Tell me when a new feature ships." control={<Switch />} />
      </SettingsSection>
    </div>
  ),
  args: { title: 'Notifications', description: 'What this group of settings controls.', descriptionVisible: true },
  argTypes: {
    title: { name: 'Title', control: 'text' },
    description: { name: 'Description', control: 'text' },
    descriptionVisible: { name: 'DescriptionVisible', control: 'boolean' },
  },
}
export default meta
type Story = StoryObj<Args>
export const SettingsSectionPlayground: Story = { name: 'SettingsSection · Playground' }
