import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  BreadcrumbEllipsis, BREADCRUMB_APPEARANCES, BREADCRUMB_ELLIPSIS_STATES, BREADCRUMB_SIZES, BREADCRUMB_VARIANTS,
  type BreadcrumbAppearance, type BreadcrumbEllipsisState, type BreadcrumbSize, type BreadcrumbVariant,
} from '../../../src/components/escala-ui/breadcrumb'

/** Story args = the Figma `BreadcrumbEllipsis` set (design-plans/breadcrumb-contract.md): Variant · Appearance · Size · State. */
interface EllipsisStoryArgs {
  variant: BreadcrumbVariant
  appearance: BreadcrumbAppearance
  size: BreadcrumbSize
  forceState: BreadcrumbEllipsisState
}

const list = { margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexWrap: 'wrap', gap: 12 } as const

const meta: Meta<EllipsisStoryArgs> = {
  title: 'Navigation/BreadcrumbEllipsis',
  render: ({ variant, appearance, size, forceState }) => (
    <ol style={list}><BreadcrumbEllipsis variant={variant} appearance={appearance} size={size} forceState={forceState} disabled={forceState === 'Disabled'} /></ol>
  ),
  args: { variant: 'default', appearance: 'ghost', size: 'default', forceState: 'Default' },
  argTypes: {
    variant: { name: 'Variant', control: 'select', options: [...BREADCRUMB_VARIANTS] },
    appearance: { name: 'Appearance', control: 'select', options: [...BREADCRUMB_APPEARANCES] },
    size: { name: 'Size', control: 'select', options: [...BREADCRUMB_SIZES] },
    forceState: { name: 'State', control: 'select', options: [...BREADCRUMB_ELLIPSIS_STATES] },
  },
}
export default meta
type Story = StoryObj<EllipsisStoryArgs>

export const Playground: Story = {}

export const AllCombinations: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {BREADCRUMB_VARIANTS.flatMap((variant) => BREADCRUMB_APPEARANCES.map((appearance) => (
        <ol key={variant + appearance} style={list}>
          {BREADCRUMB_ELLIPSIS_STATES.map((state) => (
            <BreadcrumbEllipsis key={state} variant={variant} appearance={appearance} size={args.size} forceState={state} disabled={state === 'Disabled'} />
          ))}
        </ol>
      )))}
    </div>
  ),
}

export const Sizes: Story = {
  render: (args) => (
    <ol style={{ ...list, alignItems: 'center' }}>
      {BREADCRUMB_SIZES.map((size) => <BreadcrumbEllipsis key={size} variant={args.variant} appearance={args.appearance} size={size} />)}
    </ol>
  ),
}

export const States: Story = {
  render: (args) => (
    <ol style={list}>
      {BREADCRUMB_ELLIPSIS_STATES.map((state) => <BreadcrumbEllipsis key={state} variant={args.variant} appearance={args.appearance} size={args.size} forceState={state} disabled={state === 'Disabled'} />)}
    </ol>
  ),
}
