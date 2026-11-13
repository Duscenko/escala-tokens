import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  Table, TableBody, TableCell, TableHead, TableRow, type TableDividers, type TableRowState, type TableSize,
} from '../../../src/components/escala-ui/table'
const CELLS = [['Olivia Martin', 'Design', 'Active', '1,280.00']]
function Cells({ row = CELLS[0] }: { row?: string[] }) {
  return (<><TableCell label={row[0]} /><TableCell label={row[1]} /><TableCell label={row[2]} /><TableCell label={row[3]} align="end" /></>)
}
function Heads() {
  return (<>{['Name', 'Role', 'Status', 'Amount'].map((h, i) => <TableHead key={h} label={h} align={i === 3 ? 'end' : 'start'} />)}</>)
}

/** Story args = the Figma `TableRow` set: Content (cells) · Size · State · Dividers. */
interface Args { size: TableSize; state: TableRowState; dividers: TableDividers }
const meta: Meta<Args> = {
  title: 'Content & Surfaces/TableRow',
  render: ({ size, state, dividers }) => (
    <div style={{ width: 800 }}>
      <Table appearance="ghost" size={size} dividers={dividers}>
        <TableBody><TableRow forceState={state}><Cells /></TableRow></TableBody>
      </Table>
    </div>
  ),
  args: { size: 'default', state: 'Default', dividers: 'rows' },
  argTypes: {
    size: { name: 'Size', control: 'select', options: ['default', 'xs', 'sm', 'lg'] },
    state: { name: 'State', control: 'select', options: ['Default', 'Hover', 'Selected', 'Focused', 'Disabled', 'Dragging'] },
    dividers: { name: 'Dividers', control: 'select', options: ['grid', 'rows'] },
  },
}
export default meta
type Story = StoryObj<Args>
export const Playground: Story = {}
export const States: Story = {
  render: ({ size, dividers }) => (
    <div style={{ width: 800 }}>
      <Table appearance="ghost" size={size} dividers={dividers}>
        <TableBody>
          {(['Default', 'Hover', 'Selected', 'Focused', 'Disabled', 'Dragging'] as const).map((s) => <TableRow key={s} forceState={s}><Cells /></TableRow>)}
        </TableBody>
      </Table>
    </div>
  ),
}
