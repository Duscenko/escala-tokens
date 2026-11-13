import type { Meta, StoryObj } from '@storybook/react-vite'
import { ScrollArea, SCROLL_AREA_SIZES, SCROLL_APPEARANCES, SCROLL_BAR_ORIENTATIONS, type ScrollAppearance, type ScrollAreaSize, type ScrollBarOrientation } from '../../../src/components/escala-ui/scroll-area'

/** Story args = the Figma `ScrollBar` set (design-plans/scroll-area-contract.md): Size · Orientation · Appearance. The bar lives in a ScrollArea
 *  (it places itself); this frame shows it on a 160px track. */
interface BarStoryArgs {
  size: ScrollAreaSize
  orientation: ScrollBarOrientation
  appearance: ScrollAppearance
}

function Bar({ size, orientation, appearance, label }: BarStoryArgs & { label?: string }) {
  const vertical = orientation === 'vertical'
  return (
    <ScrollArea aria-label={label ?? 'Scroll bar'} size={size} orientation={orientation} appearance={appearance} style={vertical ? { width: 40, height: 160, border: 0 } : { width: 160, height: 40, border: 0 }}>
      <div style={vertical ? { height: 400 } : { width: 400, height: 8 }} />
    </ScrollArea>
  )
}

const meta: Meta<BarStoryArgs> = {
  title: 'Content & Surfaces/ScrollBar',
  render: (a) => <Bar {...a} />,
  args: { size: 'default', orientation: 'vertical', appearance: 'filled' },
  argTypes: {
    size: { name: 'Size', control: 'select', options: [...SCROLL_AREA_SIZES] },
    orientation: { name: 'Orientation', control: 'select', options: [...SCROLL_BAR_ORIENTATIONS] },
    appearance: { name: 'Appearance', control: 'select', options: [...SCROLL_APPEARANCES] },
  },
}
export default meta
type Story = StoryObj<BarStoryArgs>

export const Playground: Story = {}

export const AllCombinations: Story = {
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
      {SCROLL_BAR_ORIENTATIONS.flatMap((orientation) => SCROLL_APPEARANCES.flatMap((appearance) => SCROLL_AREA_SIZES.map((size) => <Bar key={orientation + appearance + size} size={size} orientation={orientation} appearance={appearance} label={`${orientation} ${appearance} ${size}`} />)))}
    </div>
  ),
}
