import type { Meta, StoryObj } from '@storybook/react-vite'
import { AvatarStatus, AVATAR_STATUSES, AVATAR_STATUS_SIZES, type AvatarStatusValue, type AvatarStatusSize } from '../../../src/components/escala-ui/avatar'

/** Story args = the Figma `AvatarStatus` set (design-plans/avatar-status-contract.md): Status · Size. */
interface StatusStoryArgs { status: AvatarStatusValue; size: AvatarStatusSize }

const meta: Meta<StatusStoryArgs> = {
  title: 'Content & Surfaces/AvatarStatus',
  render: ({ status, size }) => <AvatarStatus status={status} size={size} />,
  args: { status: 'online', size: 'default' },
  argTypes: {
    status: { name: 'Status', control: 'select', options: [...AVATAR_STATUSES] },
    size: { name: 'Size', control: 'select', options: [...AVATAR_STATUS_SIZES], description: '6 · 8 · 10 · 12px.' },
  },
}
export default meta
type Story = StoryObj<StatusStoryArgs>

export const Playground: Story = {}

export const AllCombinations: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {AVATAR_STATUS_SIZES.map((size) => (
        <div key={size} style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          {AVATAR_STATUSES.map((status) => <AvatarStatus key={status} status={status} size={size} />)}
        </div>
      ))}
    </div>
  ),
}
