import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  Tooltip, TooltipContent, TooltipInfoTrigger, TooltipProvider, TooltipTrigger, TOOLTIP_SIZES, TOOLTIP_TRIGGER_STATES, TOOLTIP_VARIANTS,
  type TooltipSize, type TooltipTriggerState, type TooltipVariant,
} from '../../../src/components/escala-ui/tooltip'

/** Story args = the Figma `TooltipInfoTrigger` set (design-plans/tooltip-contract.md), in the panel's order and with its defaults:
 *  Size · State · Variant (all variant axes). */
interface TriggerStoryArgs {
  size: TooltipSize
  forceState: TooltipTriggerState
  variant: TooltipVariant
}

const meta: Meta<TriggerStoryArgs> = {
  title: 'Content & Surfaces/TooltipInfoTrigger',
  render: ({ size, forceState, variant }) => <TooltipInfoTrigger size={size} forceState={forceState} variant={variant} aria-label="More information" />,
  args: { size: 'default', forceState: 'Default', variant: 'default' },
  argTypes: {
    size: { name: 'Size', control: 'select', options: [...TOOLTIP_SIZES] },
    forceState: { name: 'State', control: 'select', options: [...TOOLTIP_TRIGGER_STATES] },
    variant: { name: 'Variant', control: 'select', options: [...TOOLTIP_VARIANTS] },
  },
}
export default meta
type Story = StoryObj<TriggerStoryArgs>

export const Playground: Story = {}

export const AllCombinations: Story = {
  render: (args) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, auto)', gap: 16, justifyContent: 'start' }}>
      {TOOLTIP_VARIANTS.flatMap((variant) => TOOLTIP_TRIGGER_STATES.map((forceState) => (
        <TooltipInfoTrigger key={variant + forceState} size={args.size} variant={variant} forceState={forceState} aria-label={`${variant} ${forceState}`} />
      )))}
    </div>
  ),
}

/** The real pair: hover or focus the trigger; the bubble keeps the same Variant. */
export const WithTooltip: Story = {
  render: (args) => (
    <TooltipProvider>
      <div style={{ padding: 80 }}>
        <Tooltip>
          <TooltipTrigger asChild><TooltipInfoTrigger size={args.size} variant={args.variant} aria-label="Tax ID help" /></TooltipTrigger>
          <TooltipContent variant={args.variant} align="center" sideOffset={6}>Used on invoices and receipts. Format: 12-3456789.</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  ),
}
