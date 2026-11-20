import type { Meta, StoryObj } from '@storybook/react-vite'
import { MediaPlayer, MEDIA_TINTS, type MediaTint } from '../../../../src/components/escala-ui/blocks/media'

/** Figma `MediaPlayer` (2402:277, page MediaPlayer & NowPlaying (PRO)): `Playing` false · true. A clock plays the 24 s sample. */
interface Args { playing: boolean; tint: MediaTint }
const meta: Meta<Args> = {
  title: 'Blocks/Media/MediaPlayer',
  tags: ['stage:storybook'],
  parameters: { layout: 'padded' },
  render: (a) => <MediaPlayer key={String(a.playing)} defaultPlaying={a.playing} tint={a.tint} />,
  args: { playing: true, tint: 'accent' },
  argTypes: {
    tint: { name: 'Tint (code)', control: 'inline-radio', options: [...MEDIA_TINTS], description: '`none` is the photo as the Figma file draws it; `accent` lays the brand\'s Action/primary/default over it (mix-blend-mode: color), so the picture follows every accent.' },
    playing: { name: 'Playing', control: 'boolean', description: 'Whether the clock runs. The Play / Pause button flips it.' },
  },
}
export default meta
type Story = StoryObj<Args>
export const Playground: Story = {}
export const Paused: Story = { args: { playing: false } }
