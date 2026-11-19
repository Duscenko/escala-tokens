import type { Meta, StoryObj } from '@storybook/react-vite'
import { MediaPlayer } from '../../../../src/components/escala-ui/blocks/media'

/** Figma `MediaPlayer` (2402:277, page MediaPlayer & NowPlaying (PRO)): `Playing` false · true. A clock plays the 24 s sample. */
interface Args { playing: boolean }
const meta: Meta<Args> = {
  title: 'Blocks/Media/MediaPlayer',
  tags: ['stage:storybook'],
  parameters: { layout: 'padded' },
  render: (a) => <MediaPlayer key={String(a.playing)} defaultPlaying={a.playing} />,
  args: { playing: true },
  argTypes: {
    playing: { name: 'Playing', control: 'boolean', description: 'Whether the clock runs. The Play / Pause button flips it.' },
  },
}
export default meta
type Story = StoryObj<Args>
export const Playground: Story = {}
export const Paused: Story = { args: { playing: false } }
