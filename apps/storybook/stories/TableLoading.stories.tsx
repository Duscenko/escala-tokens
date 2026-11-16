import type { Meta, StoryObj } from '@storybook/react-vite'
import { TableLoading } from '../../../src/components/escala-ui/table'

/** Story args = the Figma `TableLoading` set: Label, at 800px. */
interface Args { label: string }
const meta: Meta<Args> = {
  title: 'Content & Surfaces/Table',
  tags: ['!autodocs', 'part'],
  render: ({ label }) => <div style={{ width: 800 }}><TableLoading label={label} /></div>,
  args: { label: 'Loading data…' },
  argTypes: { label: { name: 'Label', control: 'text' } },
}
export default meta
type Story = StoryObj<Args>

export const TableLoadingPlayground: Story = { name: 'TableLoading · Playground' }
