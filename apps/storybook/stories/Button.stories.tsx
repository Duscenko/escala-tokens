import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button, BUTTON_APPEARANCES, BUTTON_SIZES, BUTTON_VARIANTS, type ButtonState } from '../../../src/components/escala-ui/button'
import { PreviewIcon } from '../../../src/components/configurator/docs/specimens'
import type { ComponentIconName } from '../../../src/lib/iconLibraries'
import { ICON_PX, iconSwapArg } from './iconSwap'

/** Story args = the Figma `Button` set's properties, in the order and with the
 *  defaults of Figma's component playground (design-plans/button-contract.md):
 *  Variant · Appearance · Size · State are its variant axes, Label its TEXT
 *  property, IconLeadingVisible / IconTrailingVisible its booleans,
 *  IconLeadingIcon / IconTrailingIcon its instance swaps. */
interface ButtonStoryArgs {
  variant: (typeof BUTTON_VARIANTS)[number]
  appearance: (typeof BUTTON_APPEARANCES)[number]
  size: (typeof BUTTON_SIZES)[number]
  forceState: ButtonState
  iconLeadingVisible: boolean
  label: string
  iconTrailingVisible: boolean
  iconLeadingIcon: ComponentIconName
  iconTrailingIcon: ComponentIconName
}

const STATES: ButtonState[] = ['Default', 'Hover', 'Pressed', 'Focused', 'Loading', 'Disabled']

function render({ variant, appearance, size, forceState, label, iconLeadingVisible, iconTrailingVisible, iconLeadingIcon, iconTrailingIcon }: ButtonStoryArgs) {
  const px = ICON_PX[size]
  return (
    <Button
      variant={variant}
      appearance={appearance}
      size={size}
      forceState={forceState}
      loading={forceState === 'Loading'}
      disabled={forceState === 'Disabled'}
      leading={iconLeadingVisible ? <PreviewIcon concept={iconLeadingIcon} size={px} /> : undefined}
      trailing={iconTrailingVisible ? <PreviewIcon concept={iconTrailingIcon} size={px} /> : undefined}
    >
      {label}
    </Button>
  )
}

const meta: Meta<ButtonStoryArgs> = {
  title: 'Buttons/Button',
  render,
  parameters: {
    docs: {
      description: {
        component:
          'Solid buttons (default · secondary · critical) have no outside stroke: the fill is the control, with a top highlight, a `0 1px 0` label shadow, and ONE 2px focus ring outside, in the colour of the intent (`border.ring.default` · `border.strong` · `status.critical.ring`). Outline, ghost and link keep their inside edge + halo.\n\n' +
          '**Contrast is intentional.** In Dark the brand label is light on the violet fill and is judged by perceived contrast (APCA Lc ≥ 60, intent `action-label-perceived`), not WCAG 4.5:1. The a11y panel therefore reports WCAG 4.1:1 (Default) and 3.4:1 (Hover) on the default solid: that is the owner\'s decision, not a bug. Strict WCAG is reserved for a future High contrast mode.',
      },
    },
    // The default solid is the one pair the owner pins below WCAG 4.5:1 in Dark (see the description above).
    a11y: { context: { exclude: ['[data-variant="default"][data-appearance="solid"]'] } },
  },
  args: {
    variant: 'default',
    appearance: 'solid',
    size: 'default',
    forceState: 'Default',
    iconLeadingVisible: true,
    label: 'Button',
    iconTrailingVisible: true,
    iconLeadingIcon: 'home',
    iconTrailingIcon: 'home',
  },
  argTypes: {
    variant: { name: 'Variant', control: 'select', options: [...BUTTON_VARIANTS], description: 'Intent: default (brand) · secondary (neutral) · critical (destructive).' },
    appearance: { name: 'Appearance', control: 'select', options: [...BUTTON_APPEARANCES], description: 'Style: solid · outline · ghost · link.' },
    size: { name: 'Size', control: 'select', options: [...BUTTON_SIZES], description: 'Size/control-xs · sm · md · lg.' },
    forceState: { name: 'State', control: 'select', options: STATES, description: 'Pins a state; in an app Hover · Pressed · Focused come from the pointer and keyboard.' },
    iconLeadingVisible: { name: 'IconLeadingVisible', control: 'boolean' },
    label: { name: 'Label', control: 'text' },
    iconTrailingVisible: { name: 'IconTrailingVisible', control: 'boolean' },
    iconLeadingIcon: { ...iconSwapArg('IconLeadingIcon'), if: { arg: 'iconLeadingVisible' } },
    iconTrailingIcon: { ...iconSwapArg('IconTrailingIcon'), if: { arg: 'iconTrailingVisible' } },
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
