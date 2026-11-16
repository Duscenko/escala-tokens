import type { Meta, StoryObj } from '@storybook/react-vite'
import { Label } from '../../../src/components/escala-ui/label'
import { Input } from '../../../src/components/escala-ui/input'

/** Label has no Figma set: it is the label part of Field (the Figma `Field` set's `Label` text property),
 *  kept as its own component so any control can be named (DEC-2026-11-16-008). */
interface LabelStoryArgs { text: string; disabled: boolean }

const meta: Meta<LabelStoryArgs> = {
  title: 'Forms/Label',
  render: ({ text, disabled }) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-gap-tight)' }}>
      <Label htmlFor="story-label-input">{text}</Label>
      <Input id="story-label-input" disabled={disabled} placeholder="name@company.com" style={{ width: 260 }} />
    </div>
  ),
  args: { text: 'Email', disabled: false },
  argTypes: {
    text: { name: 'Label', control: 'text' },
    disabled: { name: 'Disabled', control: 'boolean', description: 'The control it names is disabled.' },
  },
}
export default meta
type Story = StoryObj<LabelStoryArgs>

export const Playground: Story = {}
