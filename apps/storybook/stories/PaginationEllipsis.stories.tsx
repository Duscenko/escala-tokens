import type { Meta, StoryObj } from '@storybook/react-vite'
import { PaginationScope, PaginationEllipsis, PAGINATION_SIZES, type PaginationSize } from '../../../src/components/escala-ui/pagination'

/** Story args = the Figma `PaginationEllipsis` set (design-plans/pagination-contract.md): Size. */
interface EllipsisStoryArgs {
  size: PaginationSize
}

const meta: Meta<EllipsisStoryArgs> = {
  title: 'Navigation/PaginationEllipsis',
  render: ({ size }) => <div role="group" aria-label="Ellipsis" style={{ display: 'flex', gap: 4 }}><PaginationScope size={size}><PaginationEllipsis /></PaginationScope></div>,
  args: { size: 'default' },
  argTypes: { size: { name: 'Size', control: 'select', options: [...PAGINATION_SIZES] } },
}
export default meta
type Story = StoryObj<EllipsisStoryArgs>

export const Playground: Story = {}

export const Sizes: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
      {PAGINATION_SIZES.map((size) => <div key={size} role="group" aria-label={`Size ${size}`}><PaginationScope size={size}><PaginationEllipsis /></PaginationScope></div>)}
    </div>
  ),
}
