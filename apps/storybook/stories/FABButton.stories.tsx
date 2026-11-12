import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  FABButton,
  FAB_APPEARANCES,
  FAB_SHAPES,
  FAB_SIZES,
  FAB_VARIANTS,
  type FABButtonState,
} from '../../../src/components/escala-ui/fab-button'
import { PreviewIcon } from '../../../src/components/configurator/docs/specimens'
import type { ComponentIconName } from '../../../src/lib/iconLibraries'
import { ICON_PX, iconSwapArg } from './iconSwap'

/** Story args = the Figma `FABButton` set's properties (design-plans/fab-button-contract.md):
 *  Appearance · Shape · Size · State · Variant are its variant axes, then Label (TEXT),
 *  LabelVisible (BOOLEAN) and IconLeadingIcon (INSTANCE_SWAP), in the order the file's API lists them. */
interface FABButtonStoryArgs {
  appearance: (typeof FAB_APPEARANCES)[number]
  shape: (typeof FAB_SHAPES)[number]
  size: (typeof FAB_SIZES)[number]
  forceState: FABButtonState
  variant: (typeof FAB_VARIANTS)[number]
  label: string
  labelVisible: boolean
  iconLeadingIcon: ComponentIconName
}

const STATES: FABButtonState[] = ['Default', 'Hover', 'Pressed', 'Focused', 'Disabled']

function render({ appearance, shape, size, forceState, variant, label, labelVisible, iconLeadingIcon }: FABButtonStoryArgs) {
  return (
    <FABButton
      appearance={appearance}
      shape={shape}
      size={size}
      variant={variant}
      forceState={forceState}
      disabled={forceState === 'Disabled'}
      aria-label={labelVisible ? undefined : label}
      icon={<PreviewIcon concept={iconLeadingIcon} size={ICON_PX[size]} />}
    >
      {labelVisible ? label : undefined}
    </FABButton>
  )
}

const meta: Meta<FABButtonStoryArgs> = {
  title: 'Buttons/FABButton',
  render,
  args: { appearance: 'solid', shape: 'rounded', size: 'default', forceState: 'Default', variant: 'default', label: 'Create', labelVisible: true, iconLeadingIcon: 'plus' },
  argTypes: {
    appearance: { name: 'Appearance', control: 'select', options: [...FAB_APPEARANCES], description: 'Style: solid · soft.' },
    shape: { name: 'Shape', control: 'select', options: [...FAB_SHAPES], description: 'Corner: rounded (Radius/action) · pill (Radius/full).' },
    size: { name: 'Size', control: 'select', options: [...FAB_SIZES], description: 'Size/control-lg 48 · control-xl 56 (the FAB size).' },
    forceState: { name: 'State', control: 'select', options: STATES, description: 'Pins a state; in an app Hover · Pressed · Focused come from the pointer and keyboard.' },
    variant: { name: 'Variant', control: 'select', options: [...FAB_VARIANTS], description: 'Brand (default), neutral, or an inverse chip (solid only).' },
    label: { name: 'Label', control: 'text' },
    labelVisible: { name: 'LabelVisible', control: 'boolean', description: 'Off: an icon-only FAB, square at the size role.' },
    iconLeadingIcon: iconSwapArg('IconLeadingIcon'),
  },
}
export default meta
type Story = StoryObj<FABButtonStoryArgs>

export const Playground: Story = {}

/** Every Variant × Appearance at the default Shape and Size (inverse is solid only in the file). */
export const AllCombinations: Story = {
  render: (args) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, max-content)', gap: 24, alignItems: 'center', justifyItems: 'start' }}>
      {FAB_VARIANTS.flatMap((variant) =>
        FAB_APPEARANCES.filter((appearance) => variant !== 'inverse' || appearance === 'solid').map((appearance) => (
          <div key={`${variant}-${appearance}`}>{render({ ...args, variant, appearance, label: `${variant} ${appearance}` })}</div>
        )),
      )}
    </div>
  ),
}

export const Shapes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
      {FAB_SHAPES.map((shape) => <div key={shape}>{render({ ...args, shape, label: shape })}</div>)}
    </div>
  ),
}

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
      {FAB_SIZES.map((size) => <div key={size}>{render({ ...args, size, label: `Size ${size}` })}</div>)}
    </div>
  ),
}

/** Every State of the default variant. The elevation rises on Hover and settles on Pressed. */
export const States: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 40, alignItems: 'center', flexWrap: 'wrap', padding: '16px 0 48px' }}>
      {STATES.map((forceState) => <div key={forceState}>{render({ ...args, forceState, label: forceState })}</div>)}
    </div>
  ),
}

/** LabelVisible off: a square at the size role, named by its aria-label. */
export const IconOnly: Story = {
  args: { labelVisible: false, label: 'Create' },
  render: (args) => (
    <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
      {FAB_SIZES.flatMap((size) => FAB_SHAPES.map((shape) => <div key={`${size}-${shape}`}>{render({ ...args, size, shape })}</div>))}
    </div>
  ),
}
