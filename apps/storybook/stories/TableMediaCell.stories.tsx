import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  TableMediaCell, type TableSize,
} from '../../../src/components/escala-ui/table'
function Frame({ children, width = 200 }: { children: React.ReactNode; width?: number }) {
  return (
    <table role="table" aria-label="Sample" style={{ display: 'block', width, flexShrink: 0 }}>
      <tbody role="rowgroup" style={{ display: 'block' }}><tr role="row" style={{ display: 'flex' }}>{children}</tr></tbody>
    </table>
  )
}

/** Story args = the Figma `TableMediaCell` set: Label · LabelVisible · Description · DescriptionVisible · Image · Size · Ratio · State. */
interface Args { label: string; labelVisible: boolean; description: string; descriptionVisible: boolean; size: TableSize; ratio: 'square' | 'wide'; state: 'Default' | 'Disabled' }
const Photo = () => <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, var(--color-action-primary-default), var(--color-surface-muted))' }} />
const meta: Meta<Args> = {
  title: 'Content & Surfaces/TableMediaCell',
  render: (a) => <Frame><TableMediaCell {...a} image={<Photo />} /></Frame>,
  args: { label: 'Studio portrait', labelVisible: true, description: 'media/photo-11', descriptionVisible: false, size: 'default', ratio: 'square', state: 'Default' },
  argTypes: {
    label: { name: 'Label', control: 'text' }, labelVisible: { name: 'LabelVisible', control: 'boolean' },
    description: { name: 'Description', control: 'text' }, descriptionVisible: { name: 'DescriptionVisible', control: 'boolean' },
    size: { name: 'Size', control: 'select', options: ['default', 'xs', 'sm', 'lg'] },
    ratio: { name: 'Ratio', control: 'select', options: ['square', 'wide'] },
    state: { name: 'State', control: 'select', options: ['Default', 'Disabled'] },
  },
}
export default meta
type Story = StoryObj<Args>
export const Playground: Story = {}
export const Sizes: Story = {
  render: (a) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
      {(['default', 'xs', 'sm', 'lg'] as TableSize[]).flatMap((size) => (['square', 'wide'] as const).map((ratio) => <Frame key={size + ratio}><TableMediaCell {...a} size={size} ratio={ratio} image={<Photo />} /></Frame>))}
    </div>
  ),
}
