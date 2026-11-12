import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  Avatar, AvatarGroup, AVATAR_SIZES, AVATAR_SHAPES, type AvatarSize, type AvatarShape, type AvatarVariant,
} from '../../../src/components/escala-ui/avatar'

/** Story args = the Figma `AvatarGroup` set (design-plans/avatar-group-contract.md): Size · Shape. */
interface GroupStoryArgs { size: AvatarSize; shape: AvatarShape }

const VARIANTS: AvatarVariant[] = ['default', 'success', 'warning', 'info']

function render({ size, shape }: GroupStoryArgs) {
  return (
    <AvatarGroup aria-label="Team" size={size} shape={shape} count={3} countLabel="3 more people">
      {['AB', 'CD', 'EF', 'GH'].map((initials, i) => (
        <Avatar key={initials} type="initials" variant={VARIANTS[i]} aria-label={initials}>{size === '2xs' ? initials[0] : initials}</Avatar>
      ))}
    </AvatarGroup>
  )
}

const meta: Meta<GroupStoryArgs> = {
  title: 'Content & Surfaces/AvatarGroup',
  render,
  args: { size: 'default', shape: 'circle' },
  argTypes: {
    size: { name: 'Size', control: 'select', options: [...AVATAR_SIZES] },
    shape: { name: 'Shape', control: 'select', options: [...AVATAR_SHAPES] },
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
