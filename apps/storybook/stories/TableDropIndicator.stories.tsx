import type { Meta, StoryObj } from '@storybook/react-vite'
import { TableDropIndicator } from '../../../src/components/escala-ui/table'

/** The Figma `TableDropIndicator` set (one variant, no properties): the line a dragged row drops on, at 800px. */
type Args = Record<string, never>
const meta: Meta<Args> = {
  title: 'Content & Surfaces/Table',
  tags: ['!autodocs', 'part'],
  render: () => <div style={{ width: 800 }}><TableDropIndicator /></div>,
}
export default meta
type Story = StoryObj<Args>

export const TableDropIndicatorPlayground: Story = { name: 'TableDropIndicator · Playground' }
