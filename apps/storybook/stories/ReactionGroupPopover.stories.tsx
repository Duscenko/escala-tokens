import type { Meta, StoryObj } from '@storybook/react-vite'
import { ReactionGroupPopover, REACTION_OPTIONS } from '../../../src/components/escala-ui/reaction-group'

/** Story args = the Figma `ReactionGroupPopover` component (design-plans/reaction-group-contract.md): its one property is
 *  the Content slot (six ghost IconButtons). `Highlighted` pins one option's Hover, as the prototype's "picker open" frame. */
interface PopoverStoryArgs {
  highlighted: string
}

const meta: Meta<PopoverStoryArgs> = {
  title: 'Buttons/ReactionGroup',
  tags: ['!autodocs', 'part'],
  render: (a) => <ReactionGroupPopover inline highlighted={a.highlighted === 'none' ? undefined : a.highlighted} />,
  args: { highlighted: 'none' },
  argTypes: {
    highlighted: { name: 'ReactionGroupPopover · Highlighted', control: 'select', options: ['none', ...REACTION_OPTIONS.map((o) => o.id)], description: 'Docs only: pins one option\'s Hover. In an app the highlight follows the pointer and the keys.' },
  },
}
export default meta
type Story = StoryObj<PopoverStoryArgs>

export const ReactionGroupPopoverPlayground: Story = { name: 'ReactionGroupPopover · Playground' }

/** Love highlighted, as the prototype's "picker open" frame. */
export const ReactionGroupPopoverHighlighted: Story = { name: 'ReactionGroupPopover · Highlighted', args: { highlighted: 'love' } }
