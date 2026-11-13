import type { Meta, StoryObj } from '@storybook/react-vite'
import { TextLink, TEXT_LINK_SIZES, TEXT_LINK_VARIANTS, type TextLinkState } from '../../../src/components/escala-ui/text-link'
import { PreviewIcon } from '../../../src/components/configurator/docs/specimens'
import type { ComponentIconName } from '../../../src/lib/iconLibraries'
import { iconSwapArg } from './iconSwap'

/** Story args = the Figma `TextLink` set's properties (design-plans/text-link-contract.md):
 *  Size · State · Variant are its variant axes, then Label (TEXT), IconLeadingVisible /
 *  IconTrailingVisible (BOOLEAN), IconLeadingIcon / IconTrailingIcon (INSTANCE_SWAP) and
 *  UnderlineVisible (BOOLEAN), in the order the file's API lists them. */
interface TextLinkStoryArgs {
  size: (typeof TEXT_LINK_SIZES)[number]
  forceState: TextLinkState
  variant: (typeof TEXT_LINK_VARIANTS)[number]
  label: string
  iconLeadingVisible: boolean
  iconTrailingVisible: boolean
  iconLeadingIcon: ComponentIconName
  iconTrailingIcon: ComponentIconName
  underlineVisible: boolean
}

const STATES: TextLinkState[] = ['Default', 'Hover', 'Pressed', 'Visited', 'Focused', 'Disabled']
/** Icon px per Size: `icon.small` at xs / sm, `icon.medium` at default and lg. */
const ICON_PX: Record<string, number> = { xs: 16, sm: 16, default: 20, lg: 20 }

function render({ size, forceState, variant, label, iconLeadingVisible, iconTrailingVisible, iconLeadingIcon, iconTrailingIcon, underlineVisible }: TextLinkStoryArgs) {
  const px = ICON_PX[size]
  return (
    <TextLink
      href="#"
      onClick={(e) => e.preventDefault()}
      size={size}
      variant={variant}
      forceState={forceState}
      disabled={forceState === 'Disabled'}
      underline={underlineVisible}
      leading={iconLeadingVisible ? <PreviewIcon concept={iconLeadingIcon} size={px} /> : undefined}
      trailing={iconTrailingVisible ? <PreviewIcon concept={iconTrailingIcon} size={px} /> : undefined}
    >
      {label}
    </TextLink>
  )
}

/** The inverse variant is for an inverse surface (a tooltip, a snackbar). */
function Inverse({ children }: { children: React.ReactNode }) {
  return <div style={{ background: 'var(--color-surface-inverse)', padding: 24, borderRadius: 12, display: 'inline-flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>{children}</div>
}

const meta: Meta<TextLinkStoryArgs> = {
  title: 'Buttons/TextLink',
  render,
  args: {
    size: 'default',
    forceState: 'Default',
    variant: 'default',
    label: 'Inline Text Link',
    iconLeadingVisible: true,
    iconTrailingVisible: true,
    iconLeadingIcon: 'plus',
    iconTrailingIcon: 'arrow-right',
    underlineVisible: true,
  },
  argTypes: {
    size: { name: 'Size', control: 'select', options: [...TEXT_LINK_SIZES], description: 'Label body-sm · md · lg · text-xl, with icon 16 / 16 / 20 / 20.' },
    forceState: { name: 'State', control: 'select', options: STATES, description: 'Pins a state; in an app Hover · Pressed · Focused come from the pointer and keyboard. Visited paints as Default in the file.' },
    variant: { name: 'Variant', control: 'select', options: [...TEXT_LINK_VARIANTS], description: 'Brand link (default), neutral, inverse, or a status.' },
    label: { name: 'Label', control: 'text' },
    iconLeadingVisible: { name: 'IconLeadingVisible', control: 'boolean' },
    iconTrailingVisible: { name: 'IconTrailingVisible', control: 'boolean' },
    iconLeadingIcon: { ...iconSwapArg('IconLeadingIcon'), if: { arg: 'iconLeadingVisible' } },
    iconTrailingIcon: { ...iconSwapArg('IconTrailingIcon'), if: { arg: 'iconTrailingVisible' } },
    underlineVisible: { name: 'UnderlineVisible', control: 'boolean', description: 'Hover and Pressed always show the underline.' },
  },
}
export default meta
type Story = StoryObj<TextLinkStoryArgs>

export const Playground: Story = {}

/** Every Variant at the default Size and State. */
export const Variants: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'flex-start' }}>
      {TEXT_LINK_VARIANTS.map((variant) => {
        const one = render({ ...args, variant, label: variant })
        return variant === 'inverse' ? <Inverse key={variant}>{one}</Inverse> : <div key={variant}>{one}</div>
      })}
    </div>
  ),
}

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
      {TEXT_LINK_SIZES.map((size) => <div key={size}>{render({ ...args, size, label: `Size ${size}` })}</div>)}
    </div>
  ),
}

/** Every State (default variant). */
export const States: Story = {
  render: (args) => (
    <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
      {STATES.map((forceState) => <div key={forceState}>{render({ ...args, forceState, label: forceState })}</div>)}
    </div>
  ),
}

/** Every Variant in every State — the file's 36 colour combinations at one Size. */
export const AllCombinations: Story = {
  render: (args) => (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${STATES.length}, max-content)`, gap: 20, alignItems: 'center' }}>
      {TEXT_LINK_VARIANTS.flatMap((variant) =>
        STATES.map((forceState) => {
          const one = render({ ...args, variant, forceState, label: forceState })
          return variant === 'inverse'
            ? <div key={`${variant}-${forceState}`} style={{ background: 'var(--color-surface-inverse)', padding: 8, borderRadius: 8 }}>{one}</div>
            : <div key={`${variant}-${forceState}`}>{one}</div>
        }),
      )}
    </div>
  ),
}

/** UnderlineVisible off: the bar is gone at rest, back on Hover and Pressed. */
export const NoUnderline: Story = {
  args: { underlineVisible: false },
  render: (args) => (
    <div style={{ display: 'flex', gap: 24, alignItems: 'center', flexWrap: 'wrap' }}>
      {(['Default', 'Hover', 'Pressed', 'Focused', 'Disabled'] as const).map((forceState) => <div key={forceState}>{render({ ...args, forceState, label: forceState })}</div>)}
    </div>
  ),
}
