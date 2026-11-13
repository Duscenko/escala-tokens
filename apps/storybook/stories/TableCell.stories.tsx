import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  TableCell, type TableSize, type TableAlign, type TablePinned,
} from '../../../src/components/escala-ui/table'
function Frame({ children, width = 200 }: { children: React.ReactNode; width?: number }) {
  return (
    <table role="table" aria-label="Sample" style={{ display: 'block', width, flexShrink: 0 }}>
      <tbody role="rowgroup" style={{ display: 'block' }}><tr role="row" style={{ display: 'flex' }}>{children}</tr></tbody>
    </table>
  )
}

/** Story args = the Figma `TableCell` set (design-plans/table-contract.md), in the panel's order and with its defaults:
 *  Size · Align · Pinned · State, then Label · LabelVisible · Description · DescriptionVisible · LeadingVisible · TrailingVisible. */
interface Args {
  size: TableSize; align: TableAlign; pinned: TablePinned; state: 'Default' | 'Disabled'
  label: string; labelVisible: boolean; description: string; descriptionVisible: boolean; leadingVisible: boolean; trailingVisible: boolean
}

const meta: Meta<Args> = {
  title: 'Content & Surfaces/TableCell',
  render: (a) => <Frame><TableCell {...a} /></Frame>,
  args: { size: 'default', align: 'start', pinned: 'none', state: 'Default', label: 'Cell text', labelVisible: true, description: 'Supporting text', descriptionVisible: false, leadingVisible: false, trailingVisible: false },
  argTypes: {
    size: { name: 'Size', control: 'select', options: ['default', 'xs', 'sm', 'lg'] },
    align: { name: 'Align', control: 'select', options: ['start', 'end'] },
    pinned: { name: 'Pinned', control: 'select', options: ['start', 'end', 'none'] },
    state: { name: 'State', control: 'select', options: ['Default', 'Disabled'] },
    label: { name: 'Label', control: 'text' },
    labelVisible: { name: 'LabelVisible', control: 'boolean' },
    description: { name: 'Description', control: 'text' },
    descriptionVisible: { name: 'DescriptionVisible', control: 'boolean' },
    leadingVisible: { name: 'LeadingVisible', control: 'boolean' },
    trailingVisible: { name: 'TrailingVisible', control: 'boolean' },
  },
}
export default meta
type Story = StoryObj<Args>
export const Playground: Story = {}
export const Sizes: Story = {
  render: (a) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
      {(['default', 'xs', 'sm', 'lg'] as TableSize[]).map((size) => <Frame key={size}><TableCell {...a} size={size} leadingVisible trailingVisible descriptionVisible /></Frame>)}
    </div>
  ),
}
export const States: Story = {
  render: (a) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
      {(['Default', 'Disabled'] as const).map((state) => <Frame key={state}><TableCell {...a} state={state} leadingVisible trailingVisible /></Frame>)}
    </div>
  ),
}
