import type { Meta, StoryObj } from '@storybook/react-vite'
import { PasswordStrengthMeter, PASSWORD_STRENGTH_SIZES, type PasswordStrengthSize, type Strength } from '../../../src/components/escala-ui/password-strength'

const STRENGTHS = ['0', '1', '2', '3', '4', '5'] as const

/** Story args = the Figma `PasswordStrengthMeter` set: Size · Strength. */
interface MeterArgs { size: PasswordStrengthSize; strength: (typeof STRENGTHS)[number] }

const render = ({ size, strength }: MeterArgs) => (
  <div style={{ width: 280 }}><PasswordStrengthMeter size={size} strength={Number(strength) as Strength} /></div>
)

const meta: Meta<MeterArgs> = {
  title: 'Forms/PasswordStrengthMeter',
  render,
  args: { size: 'default', strength: '0' },
  argTypes: {
    size: { name: 'Size', control: 'select', options: [...PASSWORD_STRENGTH_SIZES] },
    strength: { name: 'Strength', control: 'select', options: [...STRENGTHS] },
  },
}
export default meta
type Story = StoryObj<MeterArgs>

export const Playground: Story = {}

/** Every Size × Strength, as the file's 18 variants. */
export const AllCombinations: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
      {PASSWORD_STRENGTH_SIZES.map((size) => (
        <div key={size} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {STRENGTHS.map((strength) => <div key={strength}>{render({ ...args, size, strength })}</div>)}
        </div>
      ))}
    </div>
  ),
}
