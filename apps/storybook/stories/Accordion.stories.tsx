import type { Meta, StoryObj } from '@storybook/react-vite'
import { Accordion, AccordionItem, ACCORDION_VARIANTS, type AccordionVariant } from '../../../src/components/escala-ui/accordion'

/** Story args = the Figma `Accordion` set (design-plans/accordion-contract.md): Variant. Three items, the first open. */
interface AccordionStoryArgs { variant: AccordionVariant }

const ROWS: [string, string][] = [
  ['What is Escala?', 'Escala is a design system with tokens, components and docs that stay in sync between Figma and code.'],
  ['How do design tokens sync?', 'Variables map to CSS custom properties through a token pipeline.'],
  ['Can I customize the theme?', 'Yes. Swap variable modes for color, shape and density.'],
]

function view({ variant }: AccordionStoryArgs, suffix = '') {
  return (
    <div style={{ width: 480 }}>
      <Accordion variant={variant} defaultValue={['item-0']}>
        {ROWS.map(([q, a], i) => <AccordionItem key={q} value={`item-${i}`} label={q + suffix}>{a}</AccordionItem>)}
      </Accordion>
    </div>
  )
}

const meta: Meta<AccordionStoryArgs> = {
  title: 'Content & Surfaces/Accordion',
  render: (args) => view(args),
  args: { variant: 'ghost-default' },
  argTypes: { variant: { name: 'Variant', control: 'select', options: [...ACCORDION_VARIANTS] } },
}
export default meta
type Story = StoryObj<AccordionStoryArgs>

export const Playground: Story = {}

export const AllVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {ACCORDION_VARIANTS.map((variant) => <div key={variant}>{view({ variant }, ` (${variant})`)}</div>)}
    </div>
  ),
}
