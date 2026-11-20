import type { Meta, StoryObj } from '@storybook/react-vite'
import { MediaPlayerTrack, MEDIA_PLAYER_TRACK_STATES, type MediaPlayerTrackState } from '../../../../src/components/escala-ui/blocks/media'

/** Figma `MediaPlayerTrack` (2402:56, page MediaPlayer & NowPlaying (PRO)): `State` Default · Hover · Focused · Current. A part of MediaPlayer. */
interface Args { state: MediaPlayerTrackState }
const meta: Meta<Args> = {
  title: 'Blocks/Media/MediaPlayerTrack',
  tags: ['stage:storybook'],
  parameters: { layout: 'padded' },
  render: (a) => <div style={{ width: 'calc(var(--spacing-32) * 4.375)' }}><MediaPlayerTrack forceState={a.state === 'Default' ? undefined : a.state} /></div>,
  args: { state: 'Default' },
  argTypes: {
    state: { name: 'State', control: 'select', options: [...MEDIA_PLAYER_TRACK_STATES], description: 'The current row carries aria-current; Hover and Focused come from the pointer and keyboard.' },
  },
}
export default meta
type Story = StoryObj<Args>
export const Playground: Story = {}
export const AllStates: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-gap-group)', width: 'calc(var(--spacing-32) * 4.375)' }}>
      {MEDIA_PLAYER_TRACK_STATES.map((s) => <MediaPlayerTrack key={s} forceState={s === 'Default' ? undefined : s} />)}
    </div>
  ),
}
