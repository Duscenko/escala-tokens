import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  Table, TableCell, TableHead, TableHeader, type TableDividers, type TableSize,
} from '../../../src/components/escala-ui/table'
const CELLS = [['Olivia Martin', 'Design', 'Active', '1,280.00']]
function Cells({ row = CELLS[0] }: { row?: string[] }) {
  return (<><TableCell label={row[0]} /><TableCell label={row[1]} /><TableCell label={row[2]} /><TableCell label={row[3]} align="end" /></>)
}
function Heads() {
  return (<>{['Name', 'Role', 'Status', 'Amount'].map((h, i) => <TableHead key={h} label={h} align={i === 3 ? 'end' : 'start'} />)}</>)
}

/** Story args = the Figma `TableHeader` set: Content (heads) · Size · Dividers · Scrolled. */
interface Args { size: TableSize; dividers: TableDividers; scrolled: boolean }
const meta: Meta<Args> = {
  title: 'Content & Surfaces/TableHeader',
  render: ({ size, dividers, scrolled }) => (
    <div style={{ width: 800 }}>
      <Table appearance="ghost" size={size} dividers={dividers}><TableHeader scrolled={scrolled}><Heads /></TableHeader></Table>
    </div>
  ),
  args: { size: 'default', dividers: 'rows', scrolled: false },
  argTypes: {
    size: { name: 'Size', control: 'select', options: ['default', 'xs', 'sm', 'lg'] },
    dividers: { name: 'Dividers', control: 'select', options: ['grid', 'rows'] },
    scrolled: { name: 'Scrolled', control: 'boolean' },
  },
}
export default meta
type Story = StoryObj<Args>
export const Playground: Story = {}
