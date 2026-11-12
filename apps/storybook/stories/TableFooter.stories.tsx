import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  Table, TableCell, TableFooter, type TableDividers, type TableSize,
} from '../../../src/components/escala-ui/table'
/** Story args = the Figma `TableFooter` set: Content (cells) · Size · Dividers. */
interface Args { size: TableSize; dividers: TableDividers }
const meta: Meta<Args> = {
  title: 'Content & Surfaces/TableFooter',
  render: ({ size, dividers }) => (
    <div style={{ width: 800 }}>
      <Table appearance="ghost" size={size} dividers={dividers}>
        <TableFooter><TableCell label="Total" /><TableCell label="" /><TableCell label="" /><TableCell label="4,645.75" align="end" /></TableFooter>
      </Table>
    </div>
  ),
  args: { size: 'default', dividers: 'rows' },
  argTypes: {
    size: { name: 'Size', control: 'select', options: ['default', 'xs', 'sm', 'lg'] },
    dividers: { name: 'Dividers', control: 'select', options: ['rows', 'grid'] },
  },
}
export default meta
type Story = StoryObj<Args>
export const Playground: Story = {}
