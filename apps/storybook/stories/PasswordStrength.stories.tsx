import { useState } from 'react'
import type { Meta, StoryObj } from '@storybook/react-vite'
import { PasswordStrength, PASSWORD_STRENGTH_SIZES, type PasswordStrengthSize, type Strength } from '../../../src/components/escala-ui/password-strength'
import { Input } from '../../../src/components/escala-ui/input'

const STRENGTHS = ['0', '1', '2', '3', '4', '5'] as const

/** Story args = the Figma `PasswordStrength` set (design-plans/password-strength-contract.md):
 *  Size · Strength, then RulesVisible. */
interface PasswordStrengthStoryArgs {
  size: PasswordStrengthSize
  strength: (typeof STRENGTHS)[number]
  rulesVisible: boolean
}

const render = ({ size, strength, rulesVisible }: PasswordStrengthStoryArgs) => (
  <PasswordStrength size={size} strength={Number(strength) as Strength} rulesVisible={rulesVisible} style={{ width: 350 }} />
)

const meta: Meta<PasswordStrengthStoryArgs> = {
  title: 'Forms/PasswordStrength',
  render,
  args: { size: 'default', strength: '0', rulesVisible: true },
  argTypes: {
    size: { name: 'Size', control: 'select', options: [...PASSWORD_STRENGTH_SIZES] },
    strength: { name: 'Strength', control: 'select', options: [...STRENGTHS], description: 'The first n rules met; 0 hides the level label.' },
    rulesVisible: { name: 'RulesVisible', control: 'boolean' },
  },
}
export default meta
type Story = StoryObj<PasswordStrengthStoryArgs>

export const Playground: Story = {}

/** Every Size × Strength, as the file's 18 variants. */
export const AllCombinations: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
      {PASSWORD_STRENGTH_SIZES.flatMap((size) => STRENGTHS.map((strength) => <div key={`${size}-${strength}`}>{render({ ...args, size, strength })}</div>))}
    </div>
  ),
}

/** Live: the card scores what you type (Strength = rules met). */
export const Live: Story = {
  render: function Live() {
    const [password, setPassword] = useState('')
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: 350 }}>
        <Input type="password" aria-label="Password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <PasswordStrength value={password} />
      </div>
    )
  },
}

const caption = { font: '12px sans-serif', color: 'var(--color-content-secondary)', margin: '0 0 12px' }

/** The file's own prototype page: weak and fair strength with the rules checklist;
 *  strong strength, and a compact card without rules. */
export const Prototype: Story = {
  name: 'Weak · Fair · Strong',
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 48 }}>
      <div>
        <p style={caption}>Weak and fair strength with the rules checklist.</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
          <PasswordStrength strength={1} style={{ width: 350 }} />
          <PasswordStrength strength={3} style={{ width: 350 }} />
        </div>
      </div>
      <div>
        <p style={caption}>Strong strength, and a compact card without rules.</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
          <PasswordStrength strength={5} style={{ width: 350 }} />
          <PasswordStrength size="sm" strength={4} rulesVisible={false} style={{ width: 350 }} />
        </div>
      </div>
    </div>
  ),
}
