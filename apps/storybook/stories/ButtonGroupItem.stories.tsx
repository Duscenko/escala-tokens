import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  ButtonGroup,
  ButtonGroupItem,
  BUTTON_GROUP_VARIANTS,
  type ButtonGroupItemState,
} from '../../../src/components/escala-ui/button-group'
import { PreviewIcon } from '../../../src/components/configurator/docs/specimens'
import type { ComponentIconName } from '../../../src/lib/iconLibraries'
import { iconSwapArg } from './iconSwap'

const SIZES = ['xs', 'sm', 'default', 'lg', 'xl'] as const
const STATES: ButtonGroupItemState[] = ['Default', 'Hover', 'Pressed', 'Focused', 'Disabled']
/** Icon px per item Size (Size/icon-sm · md · lg). */
const ICON: Record<string, number> = { xs: 16, sm: 16, default: 20, lg: 24, xl: 24 }

/** Story args = the Figma `ButtonGroupItem` set: Size · State · Variant · IconOnly · Active,
 *  then Label, IconLeadingVisible, IconLeadingIcon, IconTrailingVisible, IconTrailingIcon,
 *  LoadingVisible, in the file's order. Shown inside a one-item ButtonGroup (its clip). */
interface ItemArgs {
  size: (typeof SIZES)[number]
  forceState: ButtonGroupItemState
  variant: (typeof BUTTON_GROUP_VARIANTS)[number]
  iconOnly: boolean
  active: boolean
  label: string
  iconLeadingVisible: boolean
  iconLeadingIcon: ComponentIconName
  iconTrailingVisible: boolean
  iconTrailingIcon: ComponentIconName
  loadingVisible: boolean
}

function item(a: ItemArgs) {
  const px = ICON[a.size]
  return (
    <ButtonGroupItem
      forceState={a.forceState}
      disabled={a.forceState === 'Disabled'}
      active={a.active}
      iconOnly={a.iconOnly}
      loading={a.loadingVisible}
      aria-label={a.iconOnly ? a.label : undefined}
      leading={a.iconOnly || a.iconLeadingVisible ? <PreviewIcon concept={a.iconLeadingIcon} size={px} /> : undefined}
      trailing={a.iconTrailingVisible ? <PreviewIcon concept={a.iconTrailingIcon} size={px} /> : undefined}
    >
      {a.label}
    </ButtonGroupItem>
  )
}
function render(a: ItemArgs) {
  return <ButtonGroup variant={a.variant} size={a.size} shape="square" aria-label="Item">{item(a)}</ButtonGroup>
}

const meta: Meta<ItemArgs> = {
  title: 'Buttons/ButtonGroupItem',
  render,
  args: {
    size: 'default', forceState: 'Default', variant: 'default', iconOnly: false, active: false, label: 'Label',
    iconLeadingVisible: false, iconLeadingIcon: 'plus', iconTrailingVisible: false, iconTrailingIcon: 'chevron-down', loadingVisible: false,
  },
  argTypes: {
    size: { name: 'Size', control: 'select', options: [...SIZES] },
    forceState: { name: 'State', control: 'select', options: STATES, description: 'Pins a state; in an app it comes from the pointer and keyboard.' },
    variant: { name: 'Variant', control: 'select', options: [...BUTTON_GROUP_VARIANTS] },
    iconOnly: { name: 'IconOnly', control: 'boolean' },
    active: { name: 'Active', control: 'boolean', description: 'The selected segment (aria-pressed).' },
    label: { name: 'Label', control: 'text' },
    iconLeadingVisible: { name: 'IconLeadingVisible', control: 'boolean' },
    iconLeadingIcon: iconSwapArg('IconLeadingIcon'),
    iconTrailingVisible: { name: 'IconTrailingVisible', control: 'boolean' },
    iconTrailingIcon: iconSwapArg('IconTrailingIcon'),
    loadingVisible: { name: 'LoadingVisible', control: 'boolean' },
  },
}
export default meta
type Story = StoryObj<ItemArgs>

export const Playground: Story = {}

/** Every Variant × State, inactive then active. */
export const States: Story = {
  render: (args) => (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${STATES.length}, max-content)`, gap: 16 }}>
      {BUTTON_GROUP_VARIANTS.flatMap((variant) =>
        [false, true].flatMap((active) =>
          STATES.map((forceState) => (
            <div key={`${variant}-${active}-${forceState}`}>{render({ ...args, variant, active, forceState, label: forceState })}</div>
          )),
        ),
      )}
    </div>
  ),
}

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 16, alignItems: 'start' }}>
      {SIZES.flatMap((size) => [false, true].map((iconOnly) => <div key={`${size}-${iconOnly}`}>{render({ ...args, size, iconOnly })}</div>))}
    </div>
  ),
}
