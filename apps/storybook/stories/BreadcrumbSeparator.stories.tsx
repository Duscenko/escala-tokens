import type { Meta, StoryObj } from '@storybook/react-vite'
import { BreadcrumbSeparator, BREADCRUMB_SEPARATORS, BREADCRUMB_SIZES, type BreadcrumbSeparatorKind, type BreadcrumbSize } from '../../../src/components/escala-ui/breadcrumb'

/** Story args = the Figma `BreadcrumbSeparator` set (design-plans/breadcrumb-contract.md): Variant · Size. */
interface SeparatorStoryArgs {
  variant: BreadcrumbSeparatorKind
  size: BreadcrumbSize
}

const list = { margin: 0, padding: 0, listStyle: 'none', display: 'flex', alignItems: 'center', gap: 16 } as const

const meta: Meta<SeparatorStoryArgs> = {
  title: 'Navigation/BreadcrumbSeparator',
  render: ({ variant, size }) => <ol style={list}><BreadcrumbSeparator variant={variant} size={size} /></ol>,
  args: { variant: 'chevron', size: 'default' },
  argTypes: {
    variant: { name: 'Variant', control: 'select', options: [...BREADCRUMB_SEPARATORS] },
    size: { name: 'Size', control: 'select', options: [...BREADCRUMB_SIZES] },
  },
}
export default meta
type Story = StoryObj<SeparatorStoryArgs>

export const Playground: Story = {}

export const AllCombinations: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {BREADCRUMB_SEPARATORS.map((variant) => (
        <ol key={variant} style={list}>{BREADCRUMB_SIZES.map((size) => <BreadcrumbSeparator key={size} variant={variant} size={size} />)}</ol>
      ))}
    </div>
  ),
}
