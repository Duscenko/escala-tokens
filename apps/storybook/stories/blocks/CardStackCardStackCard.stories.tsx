import type { Meta, StoryObj } from '@storybook/react-vite'
import { CardStackCard, CARD_STACK_CARD_STATES, type CardStackCardState } from '../../../../src/components/escala-ui/blocks/cardStack'

/** Figma `CardStackCard` (2403:104, page CardStack (PRO)): `State` Default · Dragging. A part of CardStack. */
interface Args { state: CardStackCardState }
const meta: Meta<Args> = {
  title: 'Blocks/CardStack/CardStackCard',
  tags: ['stage:storybook'],
  parameters: { layout: 'padded' },
  render: (a) => <CardStackCard state={a.state} />,
  args: { state: 'Default' },
  argTypes: {
    state: { name: 'State', control: 'select', options: [...CARD_STACK_CARD_STATES], description: 'Dragging lifts the card (Shadow/md) and shows the Shortlist stamp.' },
  },
}
export default meta
type Story = StoryObj<Args>
export const Playground: Story = {}
export const Dragging: Story = { args: { state: 'Dragging' } }
