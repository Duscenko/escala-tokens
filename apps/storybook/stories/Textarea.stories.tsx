import type { Meta, StoryObj } from '@storybook/react-vite'
import { Textarea, type TextareaSize, type TextareaState } from '../../../src/components/escala-ui/textarea'

const SIZES: TextareaSize[] = ['sm', 'default', 'lg']
const STATES: TextareaState[] = ['Default', 'Hover', 'Focused', 'Invalid', 'Loading', 'Disabled']
const VALUES = ['placeholder', 'filled'] as const
type TextareaValue = (typeof VALUES)[number]

/** Story args = the Figma `Textarea` set (design-plans/textarea-contract.md), in the
 *  panel's order and with its defaults: Size · State · Value, then Placeholder · Text ·
 *  ResizeGlyphVisible. */
interface TextareaStoryArgs {
  size: TextareaSize
  forceState: TextareaState
  value: TextareaValue
  placeholder: string
  text: string
  resizeGlyph: boolean
}

function render({ size, forceState, value, placeholder, text, resizeGlyph }: TextareaStoryArgs) {
  return (
    <Textarea
      key={`${value}-${text}`}
      aria-label="Message"
      size={size}
      forceState={forceState === 'Default' ? undefined : forceState}
      placeholder={placeholder}
      defaultValue={value === 'filled' ? text : undefined}
      resizeGlyph={resizeGlyph}
      style={{ width: 360 }}
    />
  )
}

const meta: Meta<TextareaStoryArgs> = {
  title: 'Forms/Textarea',
  render,
  args: {
    size: 'default',
    forceState: 'Default',
    value: 'placeholder',
    placeholder: 'Write a message…',
    text: 'Tell us about the project: goals, timeline and any constraints we should know about before the kickoff.',
    resizeGlyph: false,
  },
  argTypes: {
    size: { name: 'Size', control: 'select', options: SIZES, description: 'Box 72 · 96 · 128; Type/body-sm · md · lg.' },
    forceState: { name: 'State', control: 'select', options: STATES, description: 'Pins a state; in an app Hover and Focused come from the pointer and keyboard.' },
    value: { name: 'Value', control: 'select', options: [...VALUES] },
    placeholder: { name: 'Placeholder', control: 'text' },
    text: { name: 'Text', control: 'text' },
    resizeGlyph: { name: 'ResizeGlyphVisible', control: 'boolean' },
  },
}
export default meta
type Story = StoryObj<TextareaStoryArgs>

export const Playground: Story = {}

/** Every Size × State × Value, as the file's 36 variants. */
export const AllCombinations: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
      {VALUES.flatMap((value) => SIZES.flatMap((size) => STATES.map((forceState) => (
        <div key={`${value}-${size}-${forceState}`}>{render({ ...args, value, size, forceState })}</div>
      ))))}
    </div>
  ),
}

/** The three sizes, with the resize glyph. Drag it to make the box taller. */
export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
      {SIZES.map((size) => <div key={size}>{render({ ...args, size, resizeGlyph: true })}</div>)}
    </div>
  ),
}

const caption = { font: '12px sans-serif', color: 'var(--color-content-secondary)', margin: '0 0 12px' }

/** The file's own prototype page. RESTING (hover to try): an empty field ("Describe the
 *  issue…") over a filled one. FOCUSED: a filled field with the focus ring, then "Hi"
 *  Invalid — Error recolours the boundary and the ring. */
export const RestingFocused: Story = {
  name: 'Resting · Focused',
  render: () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 48 }}>
      <div>
        <p style={caption}>RESTING · hover to try</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Textarea aria-label="Issue" placeholder="Describe the issue…" style={{ width: 360 }} />
          <Textarea aria-label="Issue, filled" defaultValue="The checkout button stays disabled after I enter a valid promo code on mobile." style={{ width: 360 }} />
        </div>
      </div>
      <div>
        <p style={caption}>FOCUSED · Error recolours the boundary and ring</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Textarea aria-label="Delivery note" forceState="Focused" defaultValue="Please ship the samples to our Marseille office before Friday." style={{ width: 360 }} />
          <Textarea aria-label="Message" aria-invalid defaultValue="Hi" style={{ width: 360 }} />
        </div>
      </div>
    </div>
  ),
}
