import type { Meta, StoryObj } from '@storybook/react-vite'
import { PreviewIcon } from '../../../src/components/configurator/docs/specimens'
import type { ComponentIconName } from '../../../src/lib/iconLibraries'
import {
  Avatar, AVATAR_TYPES, AVATAR_SIZES, AVATAR_SHAPES, AVATAR_VARIANTS, AVATAR_APPEARANCES, AVATAR_STATUSES,
  type AvatarType, type AvatarSize, type AvatarShape, type AvatarVariant, type AvatarAppearance, type AvatarStatusValue,
} from '../../../src/components/escala-ui/avatar'
import { iconSwapArg } from './iconSwap'

/** The file's `_AvatarPhoto` is a stock image; this stands in for it (a soft gradient bust). */
const PHOTO =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6d1b8"/><stop offset="1" stop-color="#d9a5b3"/></linearGradient></defs><rect width="64" height="64" fill="url(#g)"/><circle cx="32" cy="26" r="11" fill="#7b4a3a"/><path d="M10 64c2-16 12-22 22-22s20 6 22 22z" fill="#4a5a8a"/></svg>',
  )

/** Story args = the Figma `Avatar` set (design-plans/avatar-contract.md), in the panel's order and with its
 *  defaults: Type · Size · Shape · Variant · Appearance, then RingVisible · StatusVisible and the swaps. */
interface AvatarStoryArgs {
  type: AvatarType
  size: AvatarSize
  shape: AvatarShape
  variant: AvatarVariant
  appearance: AvatarAppearance
  ringVisible: boolean
  statusVisible: boolean
  status: AvatarStatusValue
  /** Figma Icon (the swap); the file's default is `user`, which the shared icon set lacks: unset = the built-in user. */
  icon?: ComponentIconName
}

const ICON_PX: Record<AvatarSize, number> = { '2xs': 10, xs: 14, sm: 18, default: 20, lg: 24, xl: 28, '2xl': 32 }

function render({ type, size, shape, variant, appearance, ringVisible, statusVisible, status, icon }: AvatarStoryArgs) {
  return (
    <Avatar
      aria-label="Ana Beltrán"
      type={type}
      size={size}
      shape={shape}
      variant={variant}
      appearance={appearance}
      ringVisible={ringVisible}
      statusVisible={statusVisible}
      status={status}
      src={PHOTO}
      icon={icon ? <PreviewIcon concept={icon} size={ICON_PX[size]} /> : undefined}
    >
      {size === '2xs' ? 'A' : 'AB'}
    </Avatar>
  )
}

const meta: Meta<AvatarStoryArgs> = {
  title: 'Content & Surfaces/Avatar',
  render,
  args: {
    type: 'image', size: 'default', shape: 'circle', variant: 'secondary', appearance: 'soft',
    ringVisible: false, statusVisible: false, status: 'online', icon: undefined,
  },
  argTypes: {
    type: { name: 'Type', control: 'select', options: [...AVATAR_TYPES] },
    size: { name: 'Size', control: 'select', options: [...AVATAR_SIZES], description: '16 · 24 · 32 · 40 · 48 · 56 · 64.' },
    shape: { name: 'Shape', control: 'select', options: [...AVATAR_SHAPES] },
    variant: { name: 'Variant', control: 'select', options: [...AVATAR_VARIANTS], description: 'Initials and icon only; a photo is secondary.' },
    appearance: { name: 'Appearance', control: 'select', options: [...AVATAR_APPEARANCES] },
    ringVisible: { name: 'RingVisible', control: 'boolean' },
    statusVisible: { name: 'StatusVisible', control: 'boolean' },
    status: { name: 'Status (AvatarStatus)', control: 'select', options: [...AVATAR_STATUSES] },
    icon: iconSwapArg('Icon'),
  },
}
export default meta
type Story = StoryObj<AvatarStoryArgs>

export const Playground: Story = {}

export const AllCombinations: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {(['soft', 'solid'] as const).flatMap((appearance) => AVATAR_VARIANTS.map((variant) => (
        <div key={`${appearance}-${variant}`} style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          <span key="i">{render({ ...args, type: 'initials', variant, appearance })}</span>
          <span key="c">{render({ ...args, type: 'icon', variant, appearance })}</span>
        </div>
      )))}
    </div>
  ),
}

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
      {AVATAR_SIZES.map((size) => <span key={size}>{render({ ...args, size, type: 'initials', variant: 'default', ringVisible: true, statusVisible: true })}</span>)}
    </div>
  ),
}

export const Types: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
      {AVATAR_TYPES.flatMap((type) => AVATAR_SHAPES.map((shape) => <span key={`${type}-${shape}`}>{render({ ...args, type, shape })}</span>))}
    </div>
  ),
}
