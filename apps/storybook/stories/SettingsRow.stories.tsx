import type { Meta, StoryObj } from '@storybook/react-vite'
import { SettingsRow, SETTINGS_ROW_LAYOUTS, type SettingsRowLayout } from '../../../src/components/escala-ui/settings-row'
import { Switch } from '../../../src/components/escala-ui/switch'

/** Story args = the Figma `SettingsRow` set (2225:89): Layout, Title, Description, DescriptionVisible. Motion: none. */
interface Args { layout: SettingsRowLayout; title: string; description: string; descriptionVisible: boolean }
const meta: Meta<Args> = {
  title: 'Screens/SettingsPage',
  tags: ['!autodocs', 'part'],
  render: (a) => <div style={{ maxWidth: 720 }}><SettingsRow layout={a.layout} title={a.title} description={a.description} descriptionVisible={a.descriptionVisible} control={<Switch defaultChecked />} /></div>,
  args: { layout: 'inline', title: 'Setting name', description: 'One line that explains what this setting changes.', descriptionVisible: true },
  argTypes: {
    layout: { name: 'Layout', control: 'select', options: [...SETTINGS_ROW_LAYOUTS] },
    title: { name: 'Title', control: 'text' },
    description: { name: 'Description', control: 'text' },
    descriptionVisible: { name: 'DescriptionVisible', control: 'boolean' },
  },
}
export default meta
type Story = StoryObj<Args>
export const SettingsRowPlayground: Story = { name: 'SettingsRow · Playground' }
/** Both Layout values. */
export const SettingsRowLayouts: Story = {
  name: 'SettingsRow · Layouts',
  render: (a) => <div style={{ maxWidth: 720 }}>{SETTINGS_ROW_LAYOUTS.map((layout) => <SettingsRow key={layout} layout={layout} title={a.title} description={a.description} control={<Switch defaultChecked />} />)}</div>,
}
