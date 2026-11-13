import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  TableTrendCell, type TableSize,
} from '../../../src/components/escala-ui/table'
function Frame({ children, width = 200 }: { children: React.ReactNode; width?: number }) {
  return (
    <table role="table" aria-label="Sample" style={{ display: 'block', width, flexShrink: 0 }}>
      <tbody role="rowgroup" style={{ display: 'block' }}><tr role="row" style={{ display: 'flex' }}>{children}</tr></tbody>
    </table>
  )
}

/** Story args = the Figma `TableTrendCell` set: Value · Delta · DeltaVisible · Size · Trend · State. */
interface Args { value: string; delta: string; deltaVisible: boolean; size: TableSize; trend: 'up' | 'down' | 'neutral'; state: 'Default' | 'Disabled' }
const meta: Meta<Args> = {
  title: 'Content & Surfaces/TableTrendCell',
  render: (a) => <Frame><TableTrendCell {...a} /></Frame>,
  args: { value: '4,335.50', delta: '12.4%', deltaVisible: true, size: 'default', trend: 'up', state: 'Default' },
  argTypes: {
    value: { name: 'Value', control: 'text' }, delta: { name: 'Delta', control: 'text' }, deltaVisible: { name: 'DeltaVisible', control: 'boolean' },
    size: { name: 'Size', control: 'select', options: ['default', 'xs', 'sm', 'lg'] },
    trend: { name: 'Trend', control: 'select', options: ['up', 'down', 'neutral'] },
    state: { name: 'State', control: 'select', options: ['Default', 'Disabled'] },
  },
}
export default meta
type Story = StoryObj<Args>
export const Playground: Story = {}
export const Trends: Story = {
  render: (a) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
      {(['up', 'down', 'neutral'] as const).flatMap((trend) => (['Default', 'Disabled'] as const).map((state) => <Frame key={trend + state}><TableTrendCell {...a} trend={trend} state={state} /></Frame>))}
    </div>
  ),
}
