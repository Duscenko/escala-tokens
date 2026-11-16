import type { Meta, StoryObj } from '@storybook/react-vite'
import { Spinner } from '../../../src/components/escala-ui/spinner'

/** Spinner has no Figma set: it is the Loading glyph that Button, Switch, Textarea, InputTag and DatePicker draw
 *  in their `State=Loading` (DEC-2026-11-16-008). It takes the ink of the text around it; the size is the caller's. */
interface SpinnerStoryArgs { label: string }

const meta: Meta<SpinnerStoryArgs> = {
  title: 'Feedback/Spinner',
  render: ({ label }) => <Spinner aria-label={label} />,
  args: { label: 'Loading' },
  argTypes: {
    label: { name: 'Label', control: 'text', description: 'The accessible name (role="status").' },
  },
}
export default meta
type Story = StoryObj<SpinnerStoryArgs>

export const Playground: Story = {}

/** In its hosts: the Loading state of the components that use it. */
export const InText: Story = {
  render: ({ label }) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--spacing-gap-control)', font: 'var(--type-body-sm)', color: 'var(--color-content-secondary)' }}>
      <Spinner aria-label={label} />
      {label}…
    </span>
  ),
}
