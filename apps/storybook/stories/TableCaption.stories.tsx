import type { Meta, StoryObj } from '@storybook/react-vite'
import { Table, TableBody, TableCaption, TableCell, TableRow } from '../../../src/components/escala-ui/table'

/** Story args = the Figma `TableCaption` set: Title · Description, at the file's 800px. A part of Table (it was in TableParts). */
interface Args { title: string; description: string }
const meta: Meta<Args> = {
  title: 'Content & Surfaces/Table',
  tags: ['!autodocs', 'part'],
  render: ({ title, description }) => (
    <div style={{ width: 800 }}>
      <Table aria-label={title}>
        <TableCaption title={title} description={description} />
        <TableBody><TableRow><TableCell>INV-0042</TableCell><TableCell>€1,280.00</TableCell></TableRow></TableBody>
      </Table>
    </div>
  ),
  args: { title: 'Team billing', description: 'Invoices for the current billing period, in EUR.' },
  argTypes: { title: { name: 'Title', control: 'text' }, description: { name: 'Description', control: 'text' } },
}
export default meta
type Story = StoryObj<Args>

export const TableCaptionPlayground: Story = { name: 'TableCaption · Playground' }
