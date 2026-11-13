import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  Avatar, AvatarGroup, AVATAR_SIZES, AVATAR_SHAPES, type AvatarSize, type AvatarShape, type AvatarVariant,
} from '../../../src/components/escala-ui/avatar'
import { AVATAR_GRADIENT_HUES } from '../../../src/lib/avatarGradient'

/** Story args = the Figma `AvatarGroup` set (design-plans/avatar-group-contract.md): Size · Shape. `fill` picks what the avatars
 *  hold: the file's people are photos, code has none, so by default each is an image avatar with an OPAQUE gradient
 *  (a translucent soft tint shows the avatar below when they overlap). */
type Fill = 'gradient' | 'soft' | 'solid'
interface GroupStoryArgs { size: AvatarSize; shape: AvatarShape; fill: Fill }

const VARIANTS: AvatarVariant[] = ['default', 'success', 'warning', 'info']
const NAMES = ['AB', 'CD', 'EF', 'GH']

function render({ size, shape, fill }: GroupStoryArgs) {
  return (
    <AvatarGroup aria-label="Team" size={size} shape={shape} count={3} countLabel="3 more people">
      {NAMES.map((initials, i) =>
        fill === 'gradient' ? (
          <Avatar key={initials} type="image" hue={AVATAR_GRADIENT_HUES[i]} alt={initials} />
        ) : (
          <Avatar key={initials} type="initials" variant={VARIANTS[i]} appearance={fill === 'solid' ? 'solid' : 'soft'} aria-label={initials}>
            {size === '2xs' ? initials[0] : initials}
          </Avatar>
        ))}
    </AvatarGroup>
  )
}

const meta: Meta<GroupStoryArgs> = {
  title: 'Content & Surfaces/AvatarGroup',
  render,
  args: { size: 'default', shape: 'circle', fill: 'gradient' },
  argTypes: {
    size: { name: 'Size', control: 'select', options: [...AVATAR_SIZES] },
    shape: { name: 'Shape', control: 'select', options: [...AVATAR_SHAPES] },
    fill: { name: 'Fill (docs)', control: 'select', options: ['gradient', 'soft', 'solid'] },
  },
}
export default meta
type Story = StoryObj<GroupStoryArgs>

export const Playground: Story = {}

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {AVATAR_SIZES.map((size) => <div key={size}>{render({ ...args, size })}</div>)}
    </div>
  ),
}

export const Shapes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {AVATAR_SHAPES.map((shape) => <div key={shape}>{render({ ...args, shape })}</div>)}
    </div>
  ),
}

/** Every Size × Shape, for each fill: gradient (the default), soft and solid initials, all overlapped. */
export const AllCombinations: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {(['gradient', 'soft', 'solid'] as Fill[]).map((fill) => (
        <div key={fill} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ font: '500 11px/1 system-ui', opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{fill}</div>
          {AVATAR_SIZES.map((size) => (
            <div key={size} style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
              {AVATAR_SHAPES.map((shape) => <div key={shape}>{render({ size, shape, fill })}</div>)}
            </div>
          ))}
        </div>
      ))}
    </div>
  ),
}
