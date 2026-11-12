import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  TableResizer,
} from '../../../src/components/escala-ui/table'
/** Story args = the Figma `TableResizer` set: State. */
interface Args { state: 'Default' | 'Hover' | 'Resizing' }
const meta: Meta<Args> = {
  title: 'Content & Surfaces/TableResizer',
  render: ({ state }) => <div style={{ height: 48, display: 'flex' }}><TableResizer forceState={state} aria-label="Resize column" /></div>,
  args: { state: 'Default' },
  argTypes: { state: { name: 'State', control: 'select', options: ['Default', 'Hover', 'Resizing'] } },
}
export default meta
type Story = StoryObj<Args>
export const Playground: Story = {}
export const States: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 24, height: 48 }}>
      {(['Default', 'Hover', 'Resizing'] as const).map((s) => <TableResizer key={s} forceState={s} aria-label={`Resize column ${s}`} />)}
    </div>
  ),
}
