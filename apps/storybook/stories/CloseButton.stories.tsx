import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  CloseButton,
  CLOSE_BUTTON_APPEARANCES,
  CLOSE_BUTTON_SHAPES,
  CLOSE_BUTTON_SIZES,
  CLOSE_BUTTON_VARIANTS,
  type CloseButtonState,
} from '../../../src/components/escala-ui/close-button'

/** Story args = the Figma `CloseButton` set's properties, in the order and with
 *  the defaults of Figma's component playground (design-plans/close-button-contract.md):
 *  Appearance · Shape · Size · State · Variant are its five variant axes. The set
 *  has no boolean, text or swap property: the glyph is fixed (`icon/X`). */
interface CloseButtonStoryArgs {
  appearance: (typeof CLOSE_BUTTON_APPEARANCES)[number]
  shape: (typeof CLOSE_BUTTON_SHAPES)[number]
  size: (typeof CLOSE_BUTTON_SIZES)[number]
  forceState: CloseButtonState
  variant: (typeof CLOSE_BUTTON_VARIANTS)[number]
  ariaLabel: string
}

const STATES: CloseButtonState[] = ['Default', 'Hover', 'Pressed', 'Focused', 'Disabled']
/** The sizes smallest first, for the Sizes story (Figma lists them sm · lg · xl · xs · default). */
const SIZES_ASCENDING = ['xs', 'sm', 'default', 'lg', 'xl'] as const

function render({ appearance, shape, size, forceState, variant, ariaLabel }: CloseButtonStoryArgs) {
  return (
    <CloseButton
      appearance={appearance}
      shape={shape}
      size={size}
      variant={variant}
      forceState={forceState}
      disabled={forceState === 'Disabled'}
      aria-label={ariaLabel}
    />
  )
}

/** The inverse variant is for an inverse surface (a tooltip, a snackbar): its
 *  stories sit on `Surface/inverse`, as it is used. */
function Inverse({ children }: { children: React.ReactNode }) {
  return <div style={{ background: 'var(--color-surface-inverse)', padding: 24, borderRadius: 12, display: 'inline-flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>{children}</div>
}

const meta: Meta<CloseButtonStoryArgs> = {
  title: 'Buttons/CloseButton',
  render,
  args: { appearance: 'soft', shape: 'pill', size: 'default', forceState: 'Default', variant: 'default', ariaLabel: 'Close' },
  argTypes: {
    appearance: { name: 'Appearance', control: 'select', options: [...CLOSE_BUTTON_APPEARANCES], description: 'Style: solid · outline · soft (default) · ghost.' },
    shape: { name: 'Shape', control: 'select', options: [...CLOSE_BUTTON_SHAPES], description: 'Corner: rounded (Radius/action) · pill (Radius/full) · square (Radius/none).' },
    size: { name: 'Size', control: 'select', options: [...CLOSE_BUTTON_SIZES], description: 'Size/control-xs 24 · sm 32 · md 40 · lg 48 · xl 56.' },
    forceState: { name: 'State', control: 'select', options: STATES, description: 'Pins a state; in an app Hover · Pressed · Focused come from the pointer and keyboard.' },
    variant: { name: 'Variant', control: 'select', options: [...CLOSE_BUTTON_VARIANTS], description: 'Inverse is for a control on an inverse surface.' },
    ariaLabel: { name: 'aria-label', control: 'text', description: 'The accessible name (there is no visible text).' },
  },
}
export default meta
type Story = StoryObj<CloseButtonStoryArgs>

export const Playground: Story = {}

/** Appearance × Variant at the default Shape and Size. */
export const AllCombinations: Story = {
  render: (args) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, max-content)', gap: 24, alignItems: 'center' }}>
      {CLOSE_BUTTON_VARIANTS.flatMap((variant) =>
        CLOSE_BUTTON_APPEARANCES.map((appearance) => {
          const one = render({ ...args, variant, appearance, ariaLabel: `${variant} ${appearance}` })
          return variant === 'inverse' ? <Inverse key={`${variant}-${appearance}`}>{one}</Inverse> : <div key={`${variant}-${appearance}`}>{one}</div>
        }),
      )}
    </div>
  ),
}

export const Shapes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
      {CLOSE_BUTTON_SHAPES.map((shape) => <div key={shape}>{render({ ...args, shape, ariaLabel: `Close ${shape}` })}</div>)}
    </div>
  ),
}

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
      {SIZES_ASCENDING.map((size) => <div key={size}>{render({ ...args, size, ariaLabel: `Close ${size}` })}</div>)}
    </div>
  ),
}

/** Every Appearance in every State (default variant). */
export const States: Story = {
  render: (args) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, max-content)', gap: 24, alignItems: 'center' }}>
      {CLOSE_BUTTON_APPEARANCES.flatMap((appearance) =>
        STATES.map((forceState) => <div key={`${appearance}-${forceState}`}>{render({ ...args, appearance, forceState, ariaLabel: `${appearance} ${forceState}` })}</div>),
      )}
    </div>
  ),
}

/** The inverse variant, every Appearance in every State, on an inverse surface. */
export const InverseStates: Story = {
  render: (args) => (
    <Inverse>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, max-content)', gap: 24, alignItems: 'center' }}>
        {CLOSE_BUTTON_APPEARANCES.flatMap((appearance) =>
          STATES.map((forceState) => <div key={`${appearance}-${forceState}`}>{render({ ...args, variant: 'inverse', appearance, forceState, ariaLabel: `inverse ${appearance} ${forceState}` })}</div>),
        )}
      </div>
    </Inverse>
  ),
}
