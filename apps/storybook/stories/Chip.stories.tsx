import type { Meta, StoryObj } from '@storybook/react-vite'
import { PreviewIcon } from '../../../src/components/configurator/docs/specimens'
import type { ComponentIconName } from '../../../src/lib/iconLibraries'
import {
  Chip, CHIP_VARIANTS, CHIP_APPEARANCES, CHIP_SIZES, CHIP_STATES, CHIP_SHAPES,
  type ChipVariant, type ChipAppearance, type ChipSize, type ChipState, type ChipShape,
} from '../../../src/components/escala-ui/chip'
import { iconSwapArg } from './iconSwap'

/** Story args = the Figma `Chip` set (design-plans/chip-contract.md), in the panel's order and with its defaults:
 *  Label · CloseVisible · IconLeadingVisible · IconLeadingIcon, then Variant · Appearance · Size · State · Shape. */
interface ChipStoryArgs {
  label: string
  closeVisible: boolean
  iconLeadingVisible: boolean
  iconLeadingIcon?: ComponentIconName
  variant: ChipVariant
  appearance: ChipAppearance
  size: ChipSize
  state: ChipState
  shape: ChipShape
}

const ICON_PX: Record<ChipSize, number> = { xs: 16, sm: 16, default: 20, lg: 20, xl: 24 }

function render(a: ChipStoryArgs) {
  return (
    <Chip
      variant={a.variant}
      appearance={a.appearance}
      size={a.size}
      shape={a.shape}
      forceState={a.state === 'Default' ? undefined : a.state}
      closeVisible={a.closeVisible}
      iconLeading={a.iconLeadingVisible ? (a.iconLeadingIcon ? <PreviewIcon concept={a.iconLeadingIcon} size={ICON_PX[a.size]} /> : true) : undefined}
    >
      {a.label}
    </Chip>
  )
}

const meta: Meta<ChipStoryArgs> = {
  title: 'Indicators/Chip',
  render,
  args: {
    label: 'Chip', closeVisible: false, iconLeadingVisible: false,
    variant: 'default', appearance: 'outline', size: 'default', state: 'Default', shape: 'rounded',
  },
  argTypes: {
    label: { name: 'Label', control: 'text' },
    closeVisible: { name: 'CloseVisible', control: 'boolean' },
    iconLeadingVisible: { name: 'IconLeadingVisible', control: 'boolean' },
    iconLeadingIcon: iconSwapArg('IconLeadingIcon'),
    variant: { name: 'Variant', control: 'select', options: [...CHIP_VARIANTS] },
    appearance: { name: 'Appearance', control: 'select', options: [...CHIP_APPEARANCES] },
    size: { name: 'Size', control: 'select', options: [...CHIP_SIZES], description: '24 · 32 · 40 · 48 · 56 high.' },
    state: { name: 'State', control: 'select', options: [...CHIP_STATES], description: 'Pins a state; in an app Hover and Focused come from the pointer and keyboard.' },
    shape: { name: 'Shape', control: 'select', options: [...CHIP_SHAPES] },
  },
}
export default meta
type Story = StoryObj<ChipStoryArgs>

export const Playground: Story = {}

export const AllCombinations: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {CHIP_APPEARANCES.flatMap((appearance) => CHIP_VARIANTS.map((variant) => (
        <div key={`${appearance}-${variant}`} style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
          {CHIP_STATES.map((state) => <span key={state}>{render({ ...args, appearance, variant, state })}</span>)}
        </div>
      )))}
    </div>
  ),
}

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
      {CHIP_SIZES.map((size) => <span key={size}>{render({ ...args, size, closeVisible: true, iconLeadingVisible: true })}</span>)}
      {CHIP_SIZES.map((size) => <span key={`p${size}`}>{render({ ...args, size, shape: 'pill' })}</span>)}
    </div>
  ),
}
