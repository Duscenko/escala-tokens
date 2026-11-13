import type { Meta, StoryObj } from '@storybook/react-vite'
import { PreviewIcon } from '../../../src/components/configurator/docs/specimens'
import type { ComponentIconName } from '../../../src/lib/iconLibraries'
import {
  FeaturedIcon, FEATURED_ICON_SIZES, FEATURED_ICON_VARIANTS, FEATURED_ICON_APPEARANCES, FEATURED_ICON_SHAPES,
  type FeaturedIconSize, type FeaturedIconVariant, type FeaturedIconAppearance, type FeaturedIconShape,
} from '../../../src/components/escala-ui/featured-icon'
import { iconSwapArg } from './iconSwap'

/** Story args = the Figma `FeaturedIcon` set (design-plans/featured-icon-contract.md), in the panel's order and
 *  with its defaults: Icon swap, then Size · Variant · Appearance · Shape. */
interface FeaturedIconStoryArgs {
  /** Figma Icon (the swap); the file's default is a lightning bolt: unset = the built-in one. */
  icon?: ComponentIconName
  size: FeaturedIconSize
  variant: FeaturedIconVariant
  appearance: FeaturedIconAppearance
  shape: FeaturedIconShape
}

function render({ icon, size, variant, appearance, shape }: FeaturedIconStoryArgs) {
  return (
    <FeaturedIcon
      size={size}
      variant={variant}
      appearance={appearance}
      shape={shape}
      icon={icon ? <PreviewIcon concept={icon} size={size === 'sm' ? 20 : 24} /> : undefined}
    />
  )
}

const meta: Meta<FeaturedIconStoryArgs> = {
  title: 'Indicators/FeaturedIcon',
  render,
  args: { icon: undefined, size: 'default', variant: 'default', appearance: 'soft', shape: 'circle' },
  argTypes: {
    icon: iconSwapArg('Icon'),
    size: { name: 'Size', control: 'select', options: [...FEATURED_ICON_SIZES], description: '32 · 40 · 48 · 56.' },
    variant: { name: 'Variant', control: 'select', options: [...FEATURED_ICON_VARIANTS] },
    appearance: { name: 'Appearance', control: 'select', options: [...FEATURED_ICON_APPEARANCES] },
    shape: { name: 'Shape', control: 'select', options: [...FEATURED_ICON_SHAPES] },
  },
}
export default meta
type Story = StoryObj<FeaturedIconStoryArgs>

export const Playground: Story = {}

export const AllCombinations: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {FEATURED_ICON_APPEARANCES.flatMap((appearance) => FEATURED_ICON_SHAPES.map((shape) => (
        <div key={`${appearance}-${shape}`} style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          {FEATURED_ICON_VARIANTS.map((variant) => <span key={variant}>{render({ ...args, variant, appearance, shape })}</span>)}
        </div>
      )))}
    </div>
  ),
}

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
      {FEATURED_ICON_SIZES.map((size) => <span key={size}>{render({ ...args, size })}</span>)}
    </div>
  ),
}
