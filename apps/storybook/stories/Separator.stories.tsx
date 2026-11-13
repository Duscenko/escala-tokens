import type { Meta, StoryObj } from '@storybook/react-vite'
import { Separator, SEPARATOR_ALIGNS, SEPARATOR_ORIENTATIONS, SEPARATOR_TONES, SEPARATOR_VARIANTS, type SeparatorAlign, type SeparatorOrientation, type SeparatorTone, type SeparatorVariant } from '../../../src/components/escala-ui/separator'

/** Story args = the Figma `Separator` set (design-plans/separator-contract.md), in the panel's order and with its defaults:
 *  Align · Orientation · Tone · Variant (variant axes), then Label. */
interface SeparatorStoryArgs {
  align: SeparatorAlign
  orientation: SeparatorOrientation
  tone: SeparatorTone
  variant: SeparatorVariant
  label: string
}

const rule = (a: SeparatorStoryArgs, key?: string) => (
  <div key={key} style={a.orientation === 'horizontal' ? { width: 320 } : { height: 112, display: 'flex' }}>
    <Separator align={a.align} orientation={a.orientation} tone={a.tone} variant={a.variant}>{a.align === 'none' ? undefined : a.label}</Separator>
  </div>
)

const meta: Meta<SeparatorStoryArgs> = {
  title: 'Content & Surfaces/Separator',
  render: (a) => rule(a),
  args: { align: 'none', orientation: 'horizontal', tone: 'default', variant: 'default', label: 'OR' },
  argTypes: {
    align: { name: 'Align', control: 'select', options: [...SEPARATOR_ALIGNS] },
    orientation: { name: 'Orientation', control: 'select', options: [...SEPARATOR_ORIENTATIONS] },
    tone: { name: 'Tone', control: 'select', options: [...SEPARATOR_TONES] },
    variant: { name: 'Variant', control: 'select', options: [...SEPARATOR_VARIANTS] },
    label: { name: 'Label', control: 'text' },
  },
}
export default meta
type Story = StoryObj<SeparatorStoryArgs>

export const Playground: Story = {}

export const AllCombinations: Story = {
  render: (a) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 32, alignItems: 'flex-start' }}>
      {SEPARATOR_VARIANTS.flatMap((variant) => SEPARATOR_TONES.map((tone) => (
        <div key={variant + tone} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {SEPARATOR_ALIGNS.map((align) => rule({ ...a, orientation: 'horizontal', variant, tone, align }, align))}
        </div>
      )))}
    </div>
  ),
}

export const Vertical: Story = {
  render: (a) => (
    <div style={{ display: 'flex', gap: 32 }}>
      {SEPARATOR_ALIGNS.map((align) => rule({ ...a, orientation: 'vertical', align }, align))}
    </div>
  ),
}
