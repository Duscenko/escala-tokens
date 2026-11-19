import type { Meta, StoryObj } from '@storybook/react-vite'
import { NowPlaying } from '../../../../src/components/escala-ui/blocks/media'

/** Figma `NowPlaying` (2402:102, page MediaPlayer & NowPlaying (PRO)): `Playing` false · true. */
interface Args { playing: boolean }
const meta: Meta<Args> = {
  title: 'Blocks/Media/NowPlaying',
  tags: ['stage:storybook'],
  parameters: { layout: 'padded' },
  render: (a) => <NowPlaying key={String(a.playing)} defaultPlaying={a.playing} />,
  args: { playing: true },
  argTypes: {
    playing: { name: 'Playing', control: 'boolean', description: 'The equalizer moves while true. The Play / Pause button flips it.' },
  },
}
export default meta
type Story = StoryObj<Args>
export const Playground: Story = {}
export const Paused: Story = { args: { playing: false } }
