import type { Meta, StoryObj } from '@storybook/react-vite'
import { ProgressLine, PROGRESS_SIZES, PROGRESS_APPEARANCES, type ProgressSize, type ProgressAppearance } from '../../../src/components/escala-ui/progress-line'

/** Story args = the Figma `ProgressLine` set (design-plans/progress-contract.md), in the panel's order and with its
 *  defaults: Size · Appearance · Value. */
interface Args { size: ProgressSize; appearance: ProgressAppearance; value: number }

const meta: Meta<Args> = {
  title: 'Indicators/ProgressLine',
  render: ({ size, appearance, value }) => <div style={{ width: 240 }}><ProgressLine aria-label="Progress" size={size} appearance={appearance} value={value} /></div>,
  args: { size: 'default', appearance: 'solid', value: 0 },
  argTypes: {
    size: { name: 'Size', control: 'select', options: [...PROGRESS_SIZES] },
    appearance: { name: 'Appearance', control: 'select', options: [...PROGRESS_APPEARANCES] },
    value: { name: 'Value', control: { type: 'range', min: 0, max: 100, step: 25 } },
  },
}
export default meta
type Story = StoryObj<Args>
export const Playground: Story = {}
export const AllCombinations: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: 240 }}>
      {PROGRESS_APPEARANCES.flatMap((a) => PROGRESS_SIZES.flatMap((s) => [0, 25, 50, 75, 100].map((v) => <ProgressLine key={a + s + v} aria-label={`${a} ${s} ${v}`} size={s} appearance={a} value={v} />)))}
    </div>
  ),
}
