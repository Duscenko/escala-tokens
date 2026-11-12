import type { Meta, StoryObj } from '@storybook/react-vite'
import { FABGroup, FAB_GROUP_LAYOUTS, type FABGroupItem, type FABGroupLayout } from '../../../src/components/escala-ui/fab-group'
import { PreviewIcon } from '../../../src/components/configurator/docs/specimens'
import { ICON_PX } from './iconSwap'

/** Story args = the Figma `FABGroup` set's properties (design-plans/fab-group-contract.md):
 *  `Layout` and `Open` are its only variant axes — the trigger and every item are fixed
 *  FABButton instances, no axis of their own. `open` here maps to `defaultOpen`, so toggling
 *  it sets the starting state while the real trigger still opens and closes it by click. */
interface FABGroupStoryArgs {
  layout: FABGroupLayout
  open: boolean
  triggerLabel: string
}

const ICON_PX_DEFAULT = ICON_PX.default

/** The exact demo items measured in the file, per Layout (fab-group-contract.md §
 *  Geometría): `fan-center` fans out all five; every other Layout uses the first three. */
function itemsFor(layout: FABGroupLayout): FABGroupItem[] {
  const all: FABGroupItem[] = [
    { icon: <PreviewIcon concept="edit" size={ICON_PX_DEFAULT} />, label: 'Edit' },
    { icon: <PreviewIcon concept="image" size={ICON_PX_DEFAULT} />, label: 'Photo' },
    { icon: <PreviewIcon concept="share" size={ICON_PX_DEFAULT} />, label: 'Share' },
    { icon: <PreviewIcon concept="mail" size={ICON_PX_DEFAULT} />, label: 'Mail' },
    { icon: <PreviewIcon concept="upload" size={ICON_PX_DEFAULT} />, label: 'Upload' },
  ]
  return layout === 'fan-center' ? all : all.slice(0, 3)
}

function render({ layout, open, triggerLabel }: FABGroupStoryArgs) {
  return (
    <FABGroup
      key={`${layout}-${open}`}
      layout={layout}
      defaultOpen={open}
      items={itemsFor(layout)}
      triggerLabel={triggerLabel}
    />
  )
}

const meta: Meta<FABGroupStoryArgs> = {
  title: 'Buttons/FABGroup',
  render,
  args: { layout: 'stack', open: true, triggerLabel: 'Create' },
  argTypes: {
    layout: { name: 'Layout', control: 'select', options: [...FAB_GROUP_LAYOUTS], description: 'Vertical and labelled (stack), or an icon-only arc centered, left or right of the trigger.' },
    open: { name: 'Open', control: 'boolean', description: 'Starting state (the trigger still opens/closes it by click).' },
    triggerLabel: { name: 'Label', control: 'text', description: "The trigger's accessible name — it is icon-only (LabelVisible off)." },
  },
}
export default meta
type Story = StoryObj<FABGroupStoryArgs>

export const Playground: Story = {}

/** The four Layouts, each opened, side by side — stack is labelled, the three fans are
 *  icon-only (measured `LabelVisible` per layout, fab-group-contract.md § API). */
export const AllLayouts: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 96, alignItems: 'flex-end', flexWrap: 'wrap', padding: '0 0 160px' }}>
      {FAB_GROUP_LAYOUTS.map((layout) => (
        <div key={layout} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div>{render({ ...args, layout, open: true })}</div>
          <span style={{ font: '12px sans-serif', color: 'var(--color-content-secondary)' }}>{layout}</span>
        </div>
      ))}
    </div>
  ),
}

/** Closed vs. open, at the default `stack` layout — click the trigger to toggle either. */
export const OpenClosed: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 96, alignItems: 'flex-end', padding: '0 0 160px' }}>
      <div>{render({ ...args, open: false })}</div>
      <div>{render({ ...args, open: true })}</div>
    </div>
  ),
}
