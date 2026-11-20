import type { Meta, StoryObj } from '@storybook/react-vite'
import { CardStack, CARD_STACK_STATES, type CardStackState } from '../../../../src/components/escala-ui/blocks/cardStack'

/** Figma `CardStack` (2403:312, page CardStack (PRO)): `State` Default · Dragging · Empty. The live deck: drag the top card, ← → decide, Backspace undoes. */
interface Args { state: CardStackState }
const meta: Meta<Args> = {
  title: 'Blocks/CardStack/CardStack',
  tags: ['stage:storybook'],
  parameters: { layout: 'padded' },
  render: (a) => <CardStack key={a.state} forceState={a.state === 'Default' ? undefined : a.state} />,
  args: { state: 'Default' },
  argTypes: {
    state: { name: 'State', control: 'select', options: [...CARD_STACK_STATES], description: 'Dragging pins the top card mid-throw; Empty is the finished deck. The live deck needs neither.' },
  },
}
export default meta
type Story = StoryObj<Args>
export const Playground: Story = {}
export const Dragging: Story = { args: { state: 'Dragging' } }
export const Empty: Story = { args: { state: 'Empty' } }
