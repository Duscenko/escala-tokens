import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  ButtonGroup,
  ButtonGroupItem,
  BUTTON_GROUP_ORIENTATIONS,
  BUTTON_GROUP_SHAPES,
  BUTTON_GROUP_SIZES,
  BUTTON_GROUP_VARIANTS,
} from '../../../src/components/escala-ui/button-group'

/** Story args = the Figma `ButtonGroup` set's properties (design-plans/button-group-contract.md):
 *  Size · Variant · Shape · Orientation (variant axes, the file's option order), then
 *  Item1Visible … Item5Visible. The items carry the file's own labels. */
interface ButtonGroupStoryArgs {
  size: (typeof BUTTON_GROUP_SIZES)[number]
  variant: (typeof BUTTON_GROUP_VARIANTS)[number]
  shape: (typeof BUTTON_GROUP_SHAPES)[number]
  orientation: (typeof BUTTON_GROUP_ORIENTATIONS)[number]
  item1Visible: boolean
  item2Visible: boolean
  item3Visible: boolean
  item4Visible: boolean
  item5Visible: boolean
}

const LABELS = ['Previous', 'Today', 'Next', 'Year', 'All']

function render(a: ButtonGroupStoryArgs) {
  const visible = [a.item1Visible, a.item2Visible, a.item3Visible, a.item4Visible, a.item5Visible]
  return (
    <ButtonGroup size={a.size} variant={a.variant} shape={a.shape} orientation={a.orientation} aria-label="Range">
      {LABELS.map((label, i) => (visible[i] ? <ButtonGroupItem key={label}>{label}</ButtonGroupItem> : null))}
    </ButtonGroup>
  )
}

const meta: Meta<ButtonGroupStoryArgs> = {
  title: 'Buttons/ButtonGroup',
  render,
  args: {
    size: 'default', variant: 'default', shape: 'rounded', orientation: 'horizontal',
    item1Visible: true, item2Visible: true, item3Visible: true, item4Visible: false, item5Visible: false,
  },
  argTypes: {
    size: { name: 'Size', control: 'select', options: [...BUTTON_GROUP_SIZES], description: 'Segment height: Size/control-xs 24 · sm 32 · lg 48 · xl 56 · default 40.' },
    variant: { name: 'Variant', control: 'select', options: [...BUTTON_GROUP_VARIANTS], description: 'Every segment\'s fill and the dividers.' },
    shape: { name: 'Shape', control: 'select', options: [...BUTTON_GROUP_SHAPES], description: 'Radius/action · Radius/full · none. pill is horizontal only.' },
    orientation: { name: 'Orientation', control: 'select', options: [...BUTTON_GROUP_ORIENTATIONS] },
    item1Visible: { name: 'Item1Visible', control: 'boolean' },
    item2Visible: { name: 'Item2Visible', control: 'boolean' },
    item3Visible: { name: 'Item3Visible', control: 'boolean' },
    item4Visible: { name: 'Item4Visible', control: 'boolean' },
    item5Visible: { name: 'Item5Visible', control: 'boolean' },
  },
}
export default meta
type Story = StoryObj<ButtonGroupStoryArgs>

export const Playground: Story = {}

const grid = { display: 'grid', gap: 24, justifyItems: 'start' } as const

/** Every Variant × Shape, horizontal. */
export const AllCombinations: Story = {
  render: (args) => (
    <div style={{ ...grid, gridTemplateColumns: 'repeat(3, max-content)' }}>
      {BUTTON_GROUP_VARIANTS.flatMap((variant) =>
        BUTTON_GROUP_SHAPES.map((shape) => <div key={`${variant}-${shape}`}>{render({ ...args, variant, shape })}</div>),
      )}
    </div>
  ),
}

export const Sizes: Story = {
  render: (args) => <div style={grid}>{BUTTON_GROUP_SIZES.map((size) => <div key={size}>{render({ ...args, size })}</div>)}</div>,
}

/** Vertical: segments fill the column. The file draws no vertical pill. */
export const Vertical: Story = {
  render: (args) => (
    <div style={{ ...grid, gridTemplateColumns: 'repeat(4, max-content)' }}>
      {BUTTON_GROUP_VARIANTS.map((variant) => <div key={variant}>{render({ ...args, variant, orientation: 'vertical' })}</div>)}
    </div>
  ),
}
