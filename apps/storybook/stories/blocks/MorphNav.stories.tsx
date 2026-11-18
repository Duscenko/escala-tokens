import type { Meta, StoryObj } from '@storybook/react-vite'
import { MorphNav, MORPH_NAV_CONTENTS, type MorphNavContent } from '../../../../src/components/escala-ui/blocks/siteNavigation'

/** The Figma `MorphNav` block (2259:594): Content bar · product · search, Compact on the bar. */
interface Args { content: MorphNavContent; compact: string }
const meta: Meta<Args> = {
  title: 'Blocks/Navigation/MorphNav',
  tags: ['stage:storybook'],
  parameters: { layout: 'padded' },
  render: (a) => <div style={{ minHeight: 480 }}><MorphNav key={a.content} defaultContent={a.content} compact={a.compact === 'true'} /></div>,
  args: { content: 'bar', compact: 'false' },
  argTypes: {
    content: { name: 'Content', control: 'select', options: [...MORPH_NAV_CONTENTS] },
    compact: { name: 'Compact', control: 'select', options: ['false', 'true'] },
  },
}
export default meta
type Story = StoryObj<Args>
export const Playground: Story = {}
/** Hover Product, click search or press Cmd K; Escape returns to the bar. Open `use-overlay-in`, close `use-overlay-out`; reduced motion keeps the fade only. */
export const Motion: Story = {}
