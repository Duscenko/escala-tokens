import type { Meta, StoryObj } from '@storybook/react-vite'
import { PreviewIcon } from '../../../src/components/configurator/docs/specimens'
import type { ComponentIconName } from '../../../src/lib/iconLibraries'
import {
  Badge, BADGE_APPEARANCES, BADGE_SHAPES, BADGE_SIZES, BADGE_TYPES, BADGE_VARIANTS,
  type BadgeAppearance, type BadgeShape, type BadgeSize, type BadgeType, type BadgeVariant,
} from '../../../src/components/escala-ui/badge'
import { iconSwapArg } from './iconSwap'

/** Story args = the Figma `Badge` set (design-plans/badge-contract.md), in the panel's order and with its defaults:
 *  Label · the two icon booleans and swaps · Icon · Count, then the variant axes. */
interface BadgeStoryArgs {
  label: string
  iconLeadingVisible: boolean
  iconTrailingVisible: boolean
  iconLeadingIcon?: ComponentIconName
  iconTrailingIcon?: ComponentIconName
  icon?: ComponentIconName
  count: string
  appearance: BadgeAppearance
  shape: BadgeShape
  size: BadgeSize
  type: BadgeType
  variant: BadgeVariant
}

const GLYPH_PX: Record<BadgeSize, number> = { xs: 10, sm: 12, default: 14 }

function render(a: BadgeStoryArgs) {
  const px = GLYPH_PX[a.size]
  const swap = (concept?: ComponentIconName) => (concept ? <PreviewIcon concept={concept} size={px} /> : true as const)
  return (
    <Badge
      appearance={a.appearance}
      shape={a.shape}
      size={a.size}
      type={a.type}
      variant={a.variant}
      iconLeading={a.iconLeadingVisible ? swap(a.iconLeadingIcon) : undefined}
      iconTrailing={a.iconTrailingVisible ? swap(a.iconTrailingIcon) : undefined}
      icon={a.icon ? <PreviewIcon concept={a.icon} size={px} /> : undefined}
      count={a.count}
      aria-label={a.type === 'icon' ? 'Verified' : a.type === 'dot' ? 'Online' : undefined}
    >
      {a.label}
    </Badge>
  )
}

const meta: Meta<BadgeStoryArgs> = {
  title: 'Indicators/Badge',
  render,
  args: {
    label: 'Badge', iconLeadingVisible: false, iconTrailingVisible: false, count: '8',
    appearance: 'soft', shape: 'rounded', size: 'default', type: 'default', variant: 'default',
  },
  argTypes: {
    label: { name: 'Label', control: 'text' },
    iconLeadingVisible: { name: 'IconLeadingVisible', control: 'boolean' },
    iconTrailingVisible: { name: 'IconTrailingVisible', control: 'boolean' },
    iconLeadingIcon: iconSwapArg('IconLeadingIcon'),
    iconTrailingIcon: iconSwapArg('IconTrailingIcon'),
    icon: iconSwapArg('Icon'),
    count: { name: 'Count', control: 'text' },
    appearance: { name: 'Appearance', control: 'select', options: [...BADGE_APPEARANCES] },
    shape: { name: 'Shape', control: 'select', options: [...BADGE_SHAPES] },
    size: { name: 'Size', control: 'select', options: [...BADGE_SIZES], description: '16 · 20 · 24 high.' },
    type: { name: 'Type', control: 'select', options: [...BADGE_TYPES], description: 'A dot exists only solid + pill.' },
    variant: { name: 'Variant', control: 'select', options: [...BADGE_VARIANTS] },
  },
}
export default meta
type Story = StoryObj<BadgeStoryArgs>

export const Playground: Story = {}

export const AllCombinations: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {BADGE_APPEARANCES.map((appearance) => (
        <div key={appearance} style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          {BADGE_VARIANTS.map((variant) => (
            // `inverse` is drawn for an inverse surface (Content/inverse ink): give it one.
            <span key={variant} style={variant === 'inverse' ? { background: 'var(--color-surface-inverse)', padding: 6, borderRadius: 8 } : undefined}>
              {render({ ...args, appearance, variant })}
            </span>
          ))}
        </div>
      ))}
    </div>
  ),
}

export const Types: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {BADGE_SIZES.map((size) => (
        <div key={size} style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          {BADGE_TYPES.map((type) => <span key={type}>{render({ ...args, size, type, appearance: 'solid', shape: type === 'dot' ? 'pill' : args.shape })}</span>)}
          <span>{render({ ...args, size, iconLeadingVisible: true, iconTrailingVisible: true })}</span>
          <span>{render({ ...args, size, appearance: 'outline', shape: 'pill' })}</span>
        </div>
      ))}
    </div>
  ),
}
