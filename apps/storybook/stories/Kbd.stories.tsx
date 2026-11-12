import type { Meta, StoryObj } from '@storybook/react-vite'
import { Kbd, KbdGroup, KBD_SIZES, type KbdSize } from '../../../src/components/escala-ui/kbd'

/** Story args = the Figma `Kbd` set (design-plans/kbd-contract.md), in the panel's order and with its defaults:
 *  Size, then the Label text. */
interface KbdStoryArgs { size: KbdSize; label: string }

const meta: Meta<KbdStoryArgs> = {
  title: 'Indicators/Kbd',
  render: ({ size, label }) => <Kbd size={size}>{label}</Kbd>,
  args: { size: 'default', label: '⌘' },
  argTypes: {
    size: { name: 'Size', control: 'select', options: [...KBD_SIZES], description: '16 · 20 · 24 high: the icon of the control it sits in.' },
    label: { name: 'Label', control: 'text' },
  },
}
export default meta
type Story = StoryObj<KbdStoryArgs>

export const Playground: Story = {}

export const Sizes: Story = {
  render: ({ label }) => (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
      {KBD_SIZES.map((size) => <Kbd key={size} size={size}>{label}</Kbd>)}
    </div>
  ),
}

export const Shortcut: Story = {
  render: ({ size }) => (
    <KbdGroup>
      <Kbd size={size}>⌘</Kbd>
      <Kbd size={size}>K</Kbd>
    </KbdGroup>
  ),
}
