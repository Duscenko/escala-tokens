import type { Meta, StoryObj } from '@storybook/react-vite'
import { Image, IMAGE_RATIOS, IMAGE_SHAPES, type ImageRatio, type ImageShape } from '../../../src/components/escala-ui/image'

/** The file's `media/photo-11` is a stock photo; this stands in for it. */
const PHOTO =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 240"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#9bb6e8"/><stop offset="1" stop-color="#e8b6c6"/></linearGradient></defs><rect width="320" height="240" fill="url(#g)"/><circle cx="240" cy="70" r="28" fill="#fff6d6"/><path d="M0 240V170l80-60 70 50 60-40 110 80v40z" fill="#4a5a8a"/></svg>',
  )

/** Story args = the Figma `Image` set (design-plans/image-contract.md), in the panel's order and with its
 *  defaults: the Media swap (`src`), then Ratio · Shape. */
interface ImageStoryArgs { src: string; ratio: ImageRatio; shape: ImageShape }

function render({ src, ratio, shape }: ImageStoryArgs) {
  // `auto` fills its parent, so it needs one: the file's 240 × 160 sample.
  return (
    <div style={{ width: 240, height: ratio === 'auto' ? 160 : undefined }}>
      <Image src={src} alt="Mountains at dusk" ratio={ratio} shape={shape} />
    </div>
  )
}

const meta: Meta<ImageStoryArgs> = {
  title: 'Content & Surfaces/Image',
  render,
  args: { src: PHOTO, ratio: 'auto', shape: 'square' },
  argTypes: {
    src: { name: 'Media', control: 'text', description: 'The picture (Figma instance swap).' },
    ratio: { name: 'Ratio', control: 'select', options: [...IMAGE_RATIOS] },
    shape: { name: 'Shape', control: 'select', options: [...IMAGE_SHAPES] },
  },
}
export default meta
type Story = StoryObj<ImageStoryArgs>

export const Playground: Story = {}

export const AllCombinations: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
      {IMAGE_SHAPES.flatMap((shape) => IMAGE_RATIOS.map((ratio) => <span key={`${shape}-${ratio}`}>{render({ ...args, ratio, shape })}</span>))}
    </div>
  ),
}
