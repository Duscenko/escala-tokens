import type { Meta, StoryObj } from '@storybook/react-vite'
import { PasswordStrengthRule, PASSWORD_STRENGTH_SIZES, type PasswordStrengthSize } from '../../../src/components/escala-ui/password-strength'

/** Story args = the Figma `PasswordStrengthRule` set: Met · Size, then Label. */
interface RuleArgs { met: boolean; size: PasswordStrengthSize; label: string }

const render = ({ met, size, label }: RuleArgs) => <PasswordStrengthRule met={met} size={size} label={label} />

const meta: Meta<RuleArgs> = {
  title: 'Forms/PasswordStrengthRule',
  render,
  args: { met: true, size: 'default', label: 'At least 8 characters' },
  argTypes: {
    met: { name: 'Met', control: 'boolean' },
    size: { name: 'Size', control: 'select', options: [...PASSWORD_STRENGTH_SIZES] },
    label: { name: 'Label', control: 'text' },
  },
}
export default meta
type Story = StoryObj<RuleArgs>

export const Playground: Story = {}

/** Every Met × Size, as the file's 6 variants. */
export const AllCombinations: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32 }}>
      {[true, false].map((met) => (
        <div key={String(met)} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {PASSWORD_STRENGTH_SIZES.map((size) => <div key={size}>{render({ ...args, met, size })}</div>)}
        </div>
      ))}
    </div>
  ),
}
