import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow, type TableDividers, type TableSize,
} from '../../../src/components/escala-ui/table'
import { TablePrototype } from '../../../src/components/configurator/docs/skeleton/tablePrototype'
const CELLS = [['Olivia Martin', 'Design', 'Active', '1,280.00']]
function Cells({ row = CELLS[0] }: { row?: string[] }) {
  return (<><TableCell label={row[0]} /><TableCell label={row[1]} /><TableCell label={row[2]} /><TableCell label={row[3]} align="end" /></>)
}
function Heads() {
  return (<>{['Name', 'Role', 'Status', 'Amount'].map((h, i) => <TableHead key={h} label={h} align={i === 3 ? 'end' : 'start'} />)}</>)
}

/** Story args = the Figma `Table` set: Content · Size · Appearance · Dividers. */
interface Args { size: TableSize; appearance: 'filled' | 'ghost'; dividers: TableDividers; footer: boolean }
const ROWS = [['Olivia Martin', 'Design', 'Active', '1,280.00'], ['Liam Chen', 'Engineering', 'Active', '940.50'], ['Sofia Rossi', 'Product', 'Invited', '2,115.00'], ['Noah Kim', 'Support', 'Paused', '310.25']]
function render({ size, appearance, dividers, footer }: Args) {
  return (
    <div style={{ width: 800 }}>
      <Table size={size} appearance={appearance} dividers={dividers} aria-label="Team members">
        <TableHeader><Heads /></TableHeader>
        <TableBody>
          <TableRow><Cells row={ROWS[0]} /></TableRow>
          <TableRow selected><Cells row={ROWS[1]} /></TableRow>
          <TableRow><Cells row={ROWS[2]} /></TableRow>
          <TableRow disabled><Cells row={ROWS[3]} /></TableRow>
        </TableBody>
        {footer && <TableFooter><TableCell label="Total" /><TableCell label="" /><TableCell label="" /><TableCell label="4,645.75" align="end" /></TableFooter>}
      </Table>
    </div>
  )
}
const meta: Meta<Args> = {
  title: 'Content & Surfaces/Table',
  render,
  args: { size: 'default', appearance: 'filled', dividers: 'rows', footer: false },
  argTypes: {
    size: { name: 'Size', control: 'select', options: ['default', 'xs', 'sm', 'lg'] },
    appearance: { name: 'Appearance', control: 'select', options: ['filled', 'ghost'] },
    dividers: { name: 'Dividers', control: 'select', options: ['grid', 'rows'] },
    footer: { name: 'Footer', control: 'boolean' },
  },
}
export default meta
type Story = StoryObj<Args>
export const Playground: Story = {}
export const AllCombinations: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {(['filled', 'ghost'] as const).flatMap((appearance) => (['rows', 'grid'] as const).map((dividers) => <div key={appearance + dividers}>{render({ ...args, appearance, dividers })}</div>))}
    </div>
  ),
}
export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {(['default', 'xs', 'sm', 'lg'] as TableSize[]).map((size) => <div key={size}>{render({ ...args, size })}</div>)}
    </div>
  ),
}

// ── The file's «Table Prototype» (1025:2250), design-plans/table-prototype-contract.md ──────────────────
// Two examples on a 1440 board: «Example Light» (rows) and «Example Dark» (grid · pinned · sorted · resizing).
// Switch the toolbar theme for the dark look; the stories differ in the props the file differs in.
interface ProtoArgs { size: TableSize; appearance: 'filled' | 'ghost'; dividers: TableDividers; pinned: boolean; resizing: boolean; scrolled: boolean }
const protoMeta = {
  args: { size: 'default', appearance: 'filled', dividers: 'rows', pinned: false, resizing: false, scrolled: false } as ProtoArgs,
  argTypes: {
    size: { name: 'Size', control: 'select', options: ['default', 'xs', 'sm', 'lg'] },
    appearance: { name: 'Appearance', control: 'select', options: ['filled', 'ghost'] },
    dividers: { name: 'Dividers', control: 'select', options: ['grid', 'rows'] },
    pinned: { name: 'Pinned (Name)', control: 'boolean' },
    resizing: { name: 'Resizer (Role)', control: 'boolean' },
    scrolled: { name: 'Scrolled', control: 'boolean' },
  } as const,
}
/** Resting · hover · selected · disabled; Name sorted ascending; select-all indeterminate. Click the heads, the boxes. */
export const PrototypeLight: StoryObj<ProtoArgs> = {
  ...protoMeta,
  render: (a) => <TablePrototype {...a} />,
}
/** Grid dividers, pinned Name, Join date sorted descending, Role being resized, scrolled header. */
export const PrototypeDark: StoryObj<ProtoArgs> = {
  ...protoMeta,
  args: { ...protoMeta.args, dividers: 'grid', pinned: true, resizing: true, scrolled: true },
  render: (a) => <TablePrototype {...a} defaultSort={{ key: 'joined', dir: 'descending' }} />,
}
