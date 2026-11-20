import type { Meta, StoryObj } from '@storybook/react-vite'
import { NowPlaying, MEDIA_TINTS, type MediaTint } from '../../../../src/components/escala-ui/blocks/media'

/** Figma `NowPlaying` (2402:102, page MediaPlayer & NowPlaying (PRO)): `Playing` false · true. */
interface Args { playing: boolean; tint: MediaTint }
const meta: Meta<Args> = {
  title: 'Blocks/Media/NowPlaying',
  tags: ['stage:storybook'],
  parameters: { layout: 'padded' },
  render: (a) => <NowPlaying key={String(a.playing)} defaultPlaying={a.playing} tint={a.tint} />,
  args: { playing: true, tint: 'accent' },
  argTypes: {
    tint: { name: 'Tint (code)', control: 'inline-radio', options: [...MEDIA_TINTS], description: '`none` is the photo as the Figma file draws it; `accent` lays the brand\'s Action/primary/default over it (mix-blend-mode: color), so the picture follows every accent.' },
    playing: { name: 'Playing', control: 'boolean', description: 'The equalizer moves while true. The Play / Pause button flips it.' },
  },
}
export default meta
type Story = StoryObj<Args>
export const Playground: Story = {}
export const Paused: Story = { args: { playing: false } }
