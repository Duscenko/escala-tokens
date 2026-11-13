import type { Meta, StoryObj } from '@storybook/react-vite'
import { ProgressCircle, PROGRESS_SIZES, PROGRESS_APPEARANCES, PROGRESS_CAPS, type ProgressSize, type ProgressAppearance, type ProgressCap } from '../../../src/components/escala-ui/progress-line'

/** Story args = the Figma `ProgressCircle` set: Size · Cap · Appearance · Value. */
interface Args { size: ProgressSize; cap: ProgressCap; appearance: ProgressAppearance; value: number }

const meta: Meta<Args> = {
  title: 'Indicators/ProgressCircle',
  render: ({ size, cap, appearance, value }) => <ProgressCircle aria-label="Progress" size={size} cap={cap} appearance={appearance} value={value} />,
  args: { size: 'default', cap: 'round', appearance: 'solid', value: 0 },
  argTypes: {
    size: { name: 'Size', control: 'select', options: [...PROGRESS_SIZES] },
    cap: { name: 'Cap', control: 'select', options: [...PROGRESS_CAPS] },
    appearance: { name: 'Appearance', control: 'select', options: [...PROGRESS_APPEARANCES] },
    value: { name: 'Value', control: { type: 'range', min: 0, max: 100, step: 25 } },
  },
}
export default meta
type Story = StoryObj<Args>
export const Playground: Story = {}
export const AllCombinations: Story = {
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center' }}>
      {PROGRESS_APPEARANCES.flatMap((a) => PROGRESS_CAPS.flatMap((c) => PROGRESS_SIZES.map((s) => <ProgressCircle key={a + c + s} aria-label={`${a} ${c} ${s}`} size={s} cap={c} appearance={a} value={75} />)))}
    </div>
  ),
}
