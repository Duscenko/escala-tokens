import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  BreadcrumbItem, BREADCRUMB_APPEARANCES, BREADCRUMB_ITEM_STATES, BREADCRUMB_SIZES, BREADCRUMB_VARIANTS,
  type BreadcrumbAppearance, type BreadcrumbItemState, type BreadcrumbSize, type BreadcrumbVariant,
} from '../../../src/components/escala-ui/breadcrumb'
import { PreviewIcon } from '../../../src/components/configurator/docs/specimens'
import type { ComponentIconName } from '../../../src/lib/iconLibraries'
import { ICON_PX, iconSwapArg } from './iconSwap'

/** Story args = the Figma `BreadcrumbItem` set (design-plans/breadcrumb-contract.md), in the panel's order and with its defaults:
 *  Variant · Appearance · Size · State, then Label, IconLeadingVisible / Icon, IconTrailingVisible / Icon. */
interface ItemStoryArgs {
  variant: BreadcrumbVariant
  appearance: BreadcrumbAppearance
  size: BreadcrumbSize
  forceState: BreadcrumbItemState
  label: string
  iconLeadingVisible: boolean
  iconLeadingIcon: ComponentIconName
  iconTrailingVisible: boolean
  iconTrailingIcon: ComponentIconName
}

const px = (size: BreadcrumbSize) => (size === 'default' ? ICON_PX.default : ICON_PX.sm)

const meta: Meta<ItemStoryArgs> = {
  title: 'Navigation/BreadcrumbItem',
  render: ({ variant, appearance, size, forceState, label, iconLeadingVisible, iconLeadingIcon, iconTrailingVisible, iconTrailingIcon }) => (
    <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex' }}>
      <BreadcrumbItem
        href="#"
        onClick={(e) => e.preventDefault()}
        variant={variant}
        appearance={appearance}
        size={size}
        forceState={forceState}
        disabled={forceState === 'Disabled'}
        iconLeading={iconLeadingVisible ? <PreviewIcon concept={iconLeadingIcon} size={px(size)} /> : undefined}
        iconTrailing={iconTrailingVisible ? <PreviewIcon concept={iconTrailingIcon} size={px(size)} /> : undefined}
      >
        {label}
      </BreadcrumbItem>
    </ol>
  ),
  args: {
    variant: 'default', appearance: 'ghost', size: 'default', forceState: 'Default', label: 'Label',
    iconLeadingVisible: false, iconLeadingIcon: 'home', iconTrailingVisible: false, iconTrailingIcon: 'chevron-down',
  },
  argTypes: {
    variant: { name: 'Variant', control: 'select', options: [...BREADCRUMB_VARIANTS] },
    appearance: { name: 'Appearance', control: 'select', options: [...BREADCRUMB_APPEARANCES] },
    size: { name: 'Size', control: 'select', options: [...BREADCRUMB_SIZES] },
    forceState: { name: 'State', control: 'select', options: [...BREADCRUMB_ITEM_STATES] },
    label: { name: 'Label', control: 'text' },
    iconLeadingVisible: { name: 'IconLeadingVisible', control: 'boolean' },
    iconLeadingIcon: { ...iconSwapArg('IconLeadingIcon'), if: { arg: 'iconLeadingVisible' } },
    iconTrailingVisible: { name: 'IconTrailingVisible', control: 'boolean' },
    iconTrailingIcon: { ...iconSwapArg('IconTrailingIcon'), if: { arg: 'iconTrailingVisible' } },
  },
}
export default meta
type Story = StoryObj<ItemStoryArgs>

export const Playground: Story = {}

export const AllCombinations: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {BREADCRUMB_VARIANTS.flatMap((variant) => BREADCRUMB_APPEARANCES.map((appearance) => (
        <ol key={variant + appearance} style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexWrap: 'wrap', gap: 12 }}>
          {BREADCRUMB_ITEM_STATES.map((state) => (
            <BreadcrumbItem key={state} href="#" onClick={(e) => e.preventDefault()} variant={variant} appearance={appearance} size={args.size} forceState={state} disabled={state === 'Disabled'}>{state}</BreadcrumbItem>
          ))}
        </ol>
      )))}
    </div>
  ),
}

export const Sizes: Story = {
  render: (args) => (
    <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
      {BREADCRUMB_SIZES.map((size) => (
        <BreadcrumbItem key={size} href="#" onClick={(e) => e.preventDefault()} variant={args.variant} appearance={args.appearance} size={size} iconLeading={<PreviewIcon concept="home" size={px(size)} />}>{size}</BreadcrumbItem>
      ))}
    </ol>
  ),
}

export const States: Story = {
  render: (args) => (
    <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexWrap: 'wrap', gap: 12 }}>
      {BREADCRUMB_ITEM_STATES.map((state) => (
        <BreadcrumbItem key={state} href="#" onClick={(e) => e.preventDefault()} variant={args.variant} appearance={args.appearance} size={args.size} forceState={state} disabled={state === 'Disabled'}>{state}</BreadcrumbItem>
      ))}
    </ol>
  ),
}
