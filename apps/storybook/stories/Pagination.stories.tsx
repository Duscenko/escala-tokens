import type { Meta, StoryObj } from '@storybook/react-vite'
import { useState } from 'react'
import { Pagination, PaginationEllipsis, PaginationLink, PAGINATION_SIZES, PAGINATION_VARIANTS, type PaginationSize, type PaginationVariant } from '../../../src/components/escala-ui/pagination'

/** Story args = the Figma `Pagination` set (design-plans/pagination-contract.md), in the panel's order and with its defaults:
 *  Size · Variant (variant axes), then Content (the links) and JumpButtonsVisible. */
interface PaginationStoryArgs {
  size: PaginationSize
  variant: PaginationVariant
  jumpButtonsVisible: boolean
}

function Demo({ size, variant, jumpButtonsVisible, label }: PaginationStoryArgs & { label?: string }) {
  const [page, setPage] = useState(2)
  return (
    <Pagination aria-label={label ?? 'pagination'} size={size} variant={variant} jumpButtons={jumpButtonsVisible} atStart={page === 1} atEnd={page === 10} onFirst={() => setPage(1)} onPrevious={() => setPage((p) => Math.max(1, p - 1))} onNext={() => setPage((p) => Math.min(10, p + 1))} onLast={() => setPage(10)}>
      {[1, 2, 3].map((n) => <PaginationLink key={n} active={page === n} onClick={() => setPage(n)}>{n}</PaginationLink>)}
      <PaginationEllipsis />
      <PaginationLink active={page === 10} onClick={() => setPage(10)}>10</PaginationLink>
    </Pagination>
  )
}

const meta: Meta<PaginationStoryArgs> = {
  title: 'Navigation/Pagination',
  render: (args) => <Demo {...args} />,
  args: { size: 'default', variant: 'compact-grouped', jumpButtonsVisible: false },
  argTypes: {
    size: { name: 'Size', control: 'select', options: [...PAGINATION_SIZES] },
    variant: { name: 'Variant', control: 'select', options: [...PAGINATION_VARIANTS] },
    jumpButtonsVisible: { name: 'JumpButtonsVisible', control: 'boolean' },
  },
}
export default meta
type Story = StoryObj<PaginationStoryArgs>

export const Playground: Story = {}

export const AllCombinations: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'flex-start' }}>
      {PAGINATION_VARIANTS.flatMap((variant) => PAGINATION_SIZES.map((size) => <Demo key={variant + size} {...args} size={size} variant={variant} label={`${variant} ${size}`} />))}
    </div>
  ),
}

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'flex-start' }}>
      {PAGINATION_SIZES.map((size) => <Demo key={size} {...args} size={size} label={`Size ${size}`} />)}
    </div>
  ),
}
