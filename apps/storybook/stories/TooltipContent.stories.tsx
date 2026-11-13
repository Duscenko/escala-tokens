import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from '../../../src/components/escala-ui/button'
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, TOOLTIP_ALIGNS, TOOLTIP_SIDES, TOOLTIP_SIZES, TOOLTIP_VARIANTS,
  type TooltipAlign, type TooltipSide, type TooltipSize, type TooltipVariant,
} from '../../../src/components/escala-ui/tooltip'

/** Story args = the Figma `TooltipContent` set (design-plans/tooltip-contract.md), in the panel's order and with its defaults:
 *  Size · Side · Align · Variant (variant axes), Text · Title · TitleVisible · ArrowVisible. */
interface TooltipContentStoryArgs {
  size: TooltipSize
  side: TooltipSide
  align: TooltipAlign
  variant: TooltipVariant
  text: string
  title: string
  titleVisible: boolean
  arrowVisible: boolean
}

function bubble({ size, side, align, variant, text, title, titleVisible, arrowVisible }: TooltipContentStoryArgs) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipContent inline size={size} side={side} align={align} variant={variant} title={titleVisible ? title : undefined} arrow={arrowVisible}>
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

const meta: Meta<TooltipContentStoryArgs> = {
  title: 'Content & Surfaces/TooltipContent',
  render: bubble,
  args: { size: 'default', side: 'top', align: 'start', variant: 'default', text: 'Used on invoices and receipts. Format: 12-3456789.', title: 'Tax ID', titleVisible: false, arrowVisible: true },
  argTypes: {
    size: { name: 'Size', control: 'select', options: [...TOOLTIP_SIZES] },
    side: { name: 'Side', control: 'select', options: [...TOOLTIP_SIDES] },
    align: { name: 'Align', control: 'select', options: [...TOOLTIP_ALIGNS] },
    variant: { name: 'Variant', control: 'select', options: [...TOOLTIP_VARIANTS] },
    text: { name: 'Text', control: 'text' },
    title: { name: 'Title', control: 'text' },
    titleVisible: { name: 'TitleVisible', control: 'boolean' },
    arrowVisible: { name: 'ArrowVisible', control: 'boolean' },
  },
}
export default meta
type Story = StoryObj<TooltipContentStoryArgs>

export const Playground: Story = {}

export const Variants: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
      {TOOLTIP_VARIANTS.map((variant) => <div key={variant}>{bubble({ ...args, variant })}</div>)}
    </div>
  ),
}

export const SidesAndAligns: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
      {TOOLTIP_SIDES.flatMap((side) => TOOLTIP_ALIGNS.map((align) => <div key={side + align}>{bubble({ ...args, side, align })}</div>))}
    </div>
  ),
}

export const Sizes: Story = {
  render: (args) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'flex-start' }}>
      {TOOLTIP_SIZES.map((size) => <div key={size}>{bubble({ ...args, size, titleVisible: true })}</div>)}
    </div>
  ),
}

/** The real thing: hover or focus the button. */
export const WithTrigger: Story = {
  render: (args) => (
    <TooltipProvider>
      <div style={{ padding: 80 }}>
        <Tooltip>
          <TooltipTrigger asChild><Button variant="secondary">Hover me</Button></TooltipTrigger>
          <TooltipContent size={args.size} variant={args.variant} title={args.titleVisible ? args.title : undefined} align="center" sideOffset={6}>{args.text}</TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  ),
}
