import type { Meta, StoryObj } from '@storybook/react-vite'
import { TableLoadMore } from '../../../src/components/escala-ui/table'

/** Story args = the Figma `TableLoadMore` set: State (Default · Loading), at 800px. */
interface Args { state: 'Default' | 'Loading' }
const meta: Meta<Args> = {
  title: 'Content & Surfaces/Table',
  tags: ['!autodocs', 'part'],
  render: ({ state }) => <div style={{ width: 800 }}><TableLoadMore state={state} /></div>,
  args: { state: 'Default' },
  argTypes: { state: { name: 'State', control: 'select', options: ['Default', 'Loading'] } },
}
export default meta
type Story = StoryObj<Args>

export const TableLoadMorePlayground: Story = { name: 'TableLoadMore · Playground' }

export const TableLoadMoreStates: Story = {
  name: 'TableLoadMore · States',
  render: () => (
    <div style={{ width: 800, display: 'flex', flexDirection: 'column', gap: 16 }}>
      <TableLoadMore state="Default" />
      <TableLoadMore state="Loading" />
    </div>
  ),
}
