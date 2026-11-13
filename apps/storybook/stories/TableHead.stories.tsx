import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  TableHead, type TableSize, type TableAlign, type TablePinned, type TableSort,
} from '../../../src/components/escala-ui/table'
function Frame({ children, width = 200 }: { children: React.ReactNode; width?: number }) {
  return (
    <table role="table" aria-label="Sample" style={{ display: 'block', width, flexShrink: 0 }}>
      <tbody role="rowgroup" style={{ display: 'block' }}><tr role="row" style={{ display: 'flex' }}>{children}</tr></tbody>
    </table>
  )
}

/** Story args = the Figma `TableHead` set (design-plans/table-contract.md): Size · Align · Pinned · Sort · State, then
 *  Label · LabelVisible · LeadingVisible · ResizerVisible. */
interface Args {
  size: TableSize; align: TableAlign; pinned: TablePinned; sort: TableSort; state: 'Default' | 'Hover'
  label: string; labelVisible: boolean; leadingVisible: boolean; resizerVisible: boolean
}

const meta: Meta<Args> = {
  title: 'Content & Surfaces/TableHead',
  render: ({ state, ...a }) => <Frame><TableHead {...a} forceState={state} /></Frame>,
  args: { size: 'default', align: 'start', pinned: 'none', sort: 'none', state: 'Default', label: 'Column', labelVisible: true, leadingVisible: false, resizerVisible: false },
  argTypes: {
    size: { name: 'Size', control: 'select', options: ['default', 'xs', 'sm', 'lg'] },
    align: { name: 'Align', control: 'select', options: ['start', 'end'] },
    pinned: { name: 'Pinned', control: 'select', options: ['start', 'end', 'none'] },
    sort: { name: 'Sort', control: 'select', options: ['none', 'ascending', 'descending'] },
    state: { name: 'State', control: 'select', options: ['Default', 'Hover'] },
    label: { name: 'Label', control: 'text' },
    labelVisible: { name: 'LabelVisible', control: 'boolean' },
    leadingVisible: { name: 'LeadingVisible', control: 'boolean' },
    resizerVisible: { name: 'ResizerVisible', control: 'boolean' },
  },
}
export default meta
type Story = StoryObj<Args>
export const Playground: Story = {}
export const Sorts: Story = {
  render: ({ state, ...a }) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
      {(['none', 'ascending', 'descending'] as const).flatMap((sort) => (['Default', 'Hover'] as const).map((st) => <Frame key={sort + st}><TableHead {...a} sort={sort} forceState={st} /></Frame>))}
    </div>
  ),
}
