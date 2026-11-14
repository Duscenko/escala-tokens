import type { Meta, StoryObj } from '@storybook/react-vite'
import { Avatar } from '../../../src/components/escala-ui/avatar'
import { Switch } from '../../../src/components/escala-ui/switch'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DROPDOWN_MENU_ITEM_STATES, DROPDOWN_MENU_ITEM_VARIANTS, DROPDOWN_MENU_SIZES,
  type DropdownMenuItemState, type DropdownMenuItemVariant, type DropdownMenuSize,
} from '../../../src/components/escala-ui/dropdown-menu'
import { PreviewIcon } from '../../../src/components/configurator/docs/specimens'
import type { ComponentIconName } from '../../../src/lib/iconLibraries'
import { iconSwapArg } from './iconSwap'

/** Story args = the Figma `DropdownMenuItem` set (design-plans/dropdown-menu-contract.md), in the panel's order and with its
 *  defaults: Size · State · Variant (variant axes), Label · DescriptionVisible · Description · IconLeadingVisible · TrailingVisible ·
 *  Trailing · IndicatorVisible · MediaVisible · ControlVisible · IconTrailingVisible, then the two icon swaps. */
interface ItemStoryArgs {
  size: DropdownMenuSize
  forceState: DropdownMenuItemState
  variant: DropdownMenuItemVariant
  label: string
  descriptionVisible: boolean
  description: string
  iconLeadingVisible: boolean
  trailingVisible: boolean
  trailing: string
  indicatorVisible: boolean
  mediaVisible: boolean
  controlVisible: boolean
  iconTrailingVisible: boolean
  iconLeadingIcon: ComponentIconName
  iconTrailingIcon: ComponentIconName
}

function item(a: ItemStoryArgs) {
  const px = a.size === 'lg' ? 20 : 16
  return (
    <div style={{ width: 256 }}>
      <DropdownMenu>
        <DropdownMenuContent inline size={a.size} className="[&>[data-part='DropdownMenu.content']]:!p-0" style={{ border: 0, boxShadow: 'none', background: 'transparent' }}>
          <DropdownMenuItem
            variant={a.variant}
            forceState={a.forceState}
            checked={a.forceState === 'Selected' ? true : undefined}
            disabled={a.forceState === 'Disabled'}
            indicatorVisible={a.indicatorVisible}
            description={a.descriptionVisible ? a.description : undefined}
            iconLeading={a.iconLeadingVisible ? <PreviewIcon concept={a.iconLeadingIcon} size={px} /> : undefined}
            media={a.mediaVisible ? <Avatar type="image" size={a.size === 'lg' ? 'xs' : '2xs'} variant="secondary" appearance="soft" /> : undefined}
            trailing={a.trailingVisible ? a.trailing : undefined}
            control={a.controlVisible ? <Switch size={a.size === 'lg' ? 'sm' : 'xs'} aria-label={a.label} /> : undefined}
            iconTrailing={a.iconTrailingVisible ? <PreviewIcon concept={a.iconTrailingIcon} size={px} /> : undefined}
          >
            {a.label}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

const meta: Meta<ItemStoryArgs> = {
  title: 'Navigation/DropdownMenuItem',
  render: item,
  args: {
    size: 'default', forceState: 'Default', variant: 'default', label: 'Option', descriptionVisible: false, description: 'Secondary text', iconLeadingVisible: false,
    trailingVisible: false, trailing: '⌘K', indicatorVisible: true, mediaVisible: false, controlVisible: false, iconTrailingVisible: false,
    iconLeadingIcon: 'home', iconTrailingIcon: 'chevron-right',
  },
  argTypes: {
    size: { name: 'Size', control: 'select', options: [...DROPDOWN_MENU_SIZES] },
    forceState: { name: 'State', control: 'select', options: [...DROPDOWN_MENU_ITEM_STATES] },
    variant: { name: 'Variant', control: 'select', options: [...DROPDOWN_MENU_ITEM_VARIANTS] },
    label: { name: 'Label', control: 'text' },
    descriptionVisible: { name: 'DescriptionVisible', control: 'boolean' },
    description: { name: 'Description', control: 'text' },
    iconLeadingVisible: { name: 'IconLeadingVisible', control: 'boolean' },
    trailingVisible: { name: 'TrailingVisible', control: 'boolean' },
    trailing: { name: 'Trailing', control: 'text' },
    indicatorVisible: { name: 'IndicatorVisible', control: 'boolean' },
    mediaVisible: { name: 'MediaVisible', control: 'boolean' },
    controlVisible: { name: 'ControlVisible', control: 'boolean' },
    iconTrailingVisible: { name: 'IconTrailingVisible', control: 'boolean' },
    iconLeadingIcon: iconSwapArg('IconLeadingIcon'),
    iconTrailingIcon: iconSwapArg('IconTrailingIcon'),
  },
}
export default meta
type Story = StoryObj<ItemStoryArgs>

export const Playground: Story = {}

export const AllCombinations: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
      {DROPDOWN_MENU_ITEM_VARIANTS.flatMap((variant) => DROPDOWN_MENU_ITEM_STATES.map((forceState) => (
        <div key={variant + forceState}>{item({ ...args, variant, forceState, label: `${variant} · ${forceState}`, iconLeadingVisible: true, trailingVisible: true })}</div>
      )))}
    </div>
  ),
}

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
      {DROPDOWN_MENU_SIZES.map((size) => <div key={size}>{item({ ...args, size, iconLeadingVisible: true, trailingVisible: true, descriptionVisible: true })}</div>)}
    </div>
  ),
}

/** A row under the pointer or the arrow keys (`highlighted`) takes the fill only; the ring is keyboard focus, shown by the pinned Focused row beside it. */
export const HighlightedHasNoRing: Story = {
  render: (args) => (
    <div style={{ width: 256 }}>
      <DropdownMenu>
        <DropdownMenuContent inline size={args.size}>
          <DropdownMenuItem highlighted>Highlighted: fill, no ring</DropdownMenuItem>
          <DropdownMenuItem forceState="Focused">Focused: fill + ring</DropdownMenuItem>
          <DropdownMenuItem>Default</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  ),
}
