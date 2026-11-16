import type { Meta, StoryObj } from '@storybook/react-vite'
import { PaginationScope, PaginationLink, PAGINATION_LINK_STATES, PAGINATION_SIZES, type PaginationLinkState, type PaginationSize } from '../../../src/components/escala-ui/pagination'

/** Story args = the Figma `PaginationLink` set (design-plans/pagination-contract.md): Size · State · Active, then Label. */
interface LinkStoryArgs {
  size: PaginationSize
  forceState: PaginationLinkState
  active: boolean
  label: string
}

const link = (a: LinkStoryArgs, key?: string) => (
  <PaginationLink key={key} size={a.size} forceState={a.forceState} active={a.active} disabled={a.forceState === 'Disabled'}>{a.label}</PaginationLink>
)

const meta: Meta<LinkStoryArgs> = {
  title: 'Navigation/Pagination',
  tags: ['!autodocs', 'part'],
  render: (args) => <div role="group" style={{ display: 'flex', gap: 4 }}><PaginationScope size={args.size}>{link(args)}</PaginationScope></div>,
  args: { size: 'default', forceState: 'Default', active: false, label: '1' },
  argTypes: {
    size: { name: 'Size', control: 'select', options: [...PAGINATION_SIZES] },
    forceState: { name: 'State', control: 'select', options: [...PAGINATION_LINK_STATES] },
    active: { name: 'Active', control: 'boolean' },
    label: { name: 'Label', control: 'text' },
  },
}
export default meta
type Story = StoryObj<LinkStoryArgs>

export const PaginationLinkPlayground: Story = { name: 'PaginationLink · Playground' }

export const PaginationLinkStates: Story = {
  name: 'PaginationLink · States',
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {[false, true].map((active) => (
        <div key={String(active)} role="group" aria-label={active ? 'Active' : 'Inactive'} style={{ display: 'flex', gap: 4 }}><PaginationScope size={args.size}>
          {PAGINATION_LINK_STATES.map((s) => link({ ...args, forceState: s, active, label: s[0] }, s))}
        </PaginationScope></div>
      ))}
    </div>
  ),
}

export const PaginationLinkSizes: Story = {
  name: 'PaginationLink · Sizes',
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'flex-start' }}>
      {PAGINATION_SIZES.map((size) => <div key={size} role="group" aria-label={`Size ${size}`} style={{ display: 'flex', gap: 4 }}><PaginationScope size={size}>{link({ ...args, size }, size)}</PaginationScope></div>)}
    </div>
  ),
}

export const PaginationLinkAllCombinations: Story = {
  name: 'PaginationLink · All Combinations',
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {PAGINATION_SIZES.flatMap((size) => [false, true].map((active) => (
        <div key={size + active} role="group" aria-label={`${size} ${active}`} style={{ display: 'flex', gap: 4 }}><PaginationScope size={size}>
          {PAGINATION_LINK_STATES.map((s) => link({ ...args, size, forceState: s, active, label: s[0] }, s))}
        </PaginationScope></div>
      )))}
    </div>
  ),
}
