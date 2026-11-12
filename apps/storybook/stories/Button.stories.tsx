import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button, BUTTON_APPEARANCES, BUTTON_SIZES, BUTTON_VARIANTS, type ButtonState } from '../../../src/components/escala-ui/button'
import { PreviewIcon } from '../../../src/components/configurator/docs/specimens'

/** Story args = the Figma `Button` set's properties (design-plans/button-contract.md):
 *  Variant · Appearance · Size · State are its variant axes, Label its TEXT
 *  property, IconLeadingVisible / IconTrailingVisible its booleans. */
interface ButtonStoryArgs {
  variant: (typeof BUTTON_VARIANTS)[number]
  appearance: (typeof BUTTON_APPEARANCES)[number]
  size: (typeof BUTTON_SIZES)[number]
  forceState: ButtonState
  label: string
  iconLeadingVisible: boolean
  iconTrailingVisible: boolean
}

const STATES: ButtonState[] = ['Default', 'Hover', 'Pressed', 'Focused', 'Loading', 'Disabled']
const ICON_PX: Record<string, number> = { xs: 16, sm: 16, default: 20, lg: 24 }

function render({ variant, appearance, size, forceState, label, iconLeadingVisible, iconTrailingVisible }: ButtonStoryArgs) {
  const px = ICON_PX[size]
  return (
    <Button
      variant={variant}
      appearance={appearance}
      size={size}
      forceState={forceState}
      loading={forceState === 'Loading'}
      disabled={forceState === 'Disabled'}
      leading={iconLeadingVisible ? <PreviewIcon concept="home" size={px} /> : undefined}
      trailing={iconTrailingVisible ? <PreviewIcon concept="home" size={px} /> : undefined}
    >
      {label}
    </Button>
  )
}

const meta: Meta<ButtonStoryArgs> = {
  title: 'Buttons/Button',
  render,
  args: {
    variant: 'default',
    appearance: 'solid',
    size: 'default',
    forceState: 'Default',
    label: 'Button',
    iconLeadingVisible: true,
    iconTrailingVisible: false,
  },
  argTypes: {
    variant: { name: 'Variant', control: 'inline-radio', options: [...BUTTON_VARIANTS], description: 'Intent: default (brand) · secondary (neutral) · critical (destructive).' },
    appearance: { name: 'Appearance', control: 'inline-radio', options: [...BUTTON_APPEARANCES], description: 'Style: solid · outline · ghost · link.' },
    size: { name: 'Size', control: 'inline-radio', options: [...BUTTON_SIZES], description: 'Size/control-xs · sm · md · lg.' },
    forceState: { name: 'State', control: 'select', options: STATES, description: 'Pins a state; in an app Hover · Pressed · Focused come from the pointer and keyboard.' },
    label: { name: 'Label', control: 'text' },
    iconLeadingVisible: { name: 'IconLeadingVisible', control: 'boolean' },
    iconTrailingVisible: { name: 'IconTrailingVisible', control: 'boolean' },
  },
}
export default meta
type Story = StoryObj<ButtonStoryArgs>

export const Playground: Story = {}

/** The 12 combinations, as the Figma DocMatrix draws them. */
export const AllCombinations: Story = {
  render: (args) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, max-content)', gap: 16, alignItems: 'center' }}>
      {BUTTON_VARIANTS.flatMap((variant) =>
        BUTTON_APPEARANCES.map((appearance) => (
          <div key={`${variant}-${appearance}`}>{render({ ...args, variant, appearance, label: `${variant} · ${appearance}` })}</div>
        )),
      )}
    </div>
  ),
}

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
      {BUTTON_SIZES.map((size) => <div key={size}>{render({ ...args, size, label: `Size ${size}` })}</div>)}
    </div>
  ),
}

export const States: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
      {STATES.map((forceState) => <div key={forceState}>{render({ ...args, forceState, label: forceState })}</div>)}
    </div>
  ),
}
