import type { Meta, StoryObj } from '@storybook/react-vite'
import { ButtonGroupDivider, BUTTON_GROUP_ORIENTATIONS, BUTTON_GROUP_VARIANTS } from '../../../src/components/escala-ui/button-group'

/** The Figma `ButtonGroupDivider` set: Variant · Orientation. Private to ButtonGroup, which
 *  inserts it; drawn here at the file's frame (1 × 40, or 68 × 1). */
interface DividerArgs {
  variant: (typeof BUTTON_GROUP_VARIANTS)[number]
  orientation: (typeof BUTTON_GROUP_ORIENTATIONS)[number]
}

function render({ variant, orientation }: DividerArgs) {
  const vertical = orientation === 'vertical'
  return (
    <div style={{ display: 'flex', flexDirection: vertical ? 'column' : 'row', width: vertical ? 68 : 'auto', height: vertical ? 'auto' : 40 }}>
      <ButtonGroupDivider variant={variant} orientation={orientation} />
    </div>
  )
}

const meta: Meta<DividerArgs> = {
  title: 'Buttons/ButtonGroupDivider',
  render,
  args: { variant: 'default', orientation: 'horizontal' },
  argTypes: {
    variant: { name: 'Variant', control: 'select', options: [...BUTTON_GROUP_VARIANTS] },
    orientation: { name: 'Orientation', control: 'select', options: [...BUTTON_GROUP_ORIENTATIONS], description: 'horizontal = the vertical line between side-by-side items.' },
  },
}
export default meta
type Story = StoryObj<DividerArgs>

export const Playground: Story = {}

export const AllCombinations: Story = {
  render: () => (
    <div style={{ display: 'flex', gap: 24, alignItems: 'start' }}>
      {BUTTON_GROUP_ORIENTATIONS.flatMap((orientation) => BUTTON_GROUP_VARIANTS.map((variant) => <div key={`${variant}-${orientation}`}>{render({ variant, orientation })}</div>))}
    </div>
  ),
}
