import type { Meta, StoryObj } from '@storybook/react-vite'
import { Table, TableEmpty } from '../../../src/components/escala-ui/table'

/** Story args = the Figma `TableEmpty` set: Title · Description, inside an 800px Table. */
interface Args { title: string; description: string }
const meta: Meta<Args> = {
  title: 'Content & Surfaces/Table',
  tags: ['!autodocs', 'part'],
  render: ({ title, description }) => (
    <div style={{ width: 800 }}>
      <Table aria-label="Invoices"><TableEmpty title={title} description={description} /></Table>
    </div>
  ),
  args: { title: 'No invoices yet', description: 'Invoices appear here once a billing period closes.' },
  argTypes: { title: { name: 'Title', control: 'text' }, description: { name: 'Description', control: 'text' } },
}
export default meta
type Story = StoryObj<Args>

export const TableEmptyPlayground: Story = { name: 'TableEmpty · Playground' }
