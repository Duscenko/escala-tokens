import type { Meta, StoryObj } from '@storybook/react-vite'
import {
  Tooltip, TooltipContent, TooltipInfoTrigger, TooltipProvider, TooltipTrigger, TOOLTIP_ALIGNS, TOOLTIP_SIDES, TOOLTIP_SIZES, TOOLTIP_VARIANTS,
  type TooltipAlign, type TooltipSide, type TooltipSize, type TooltipVariant,
} from '../../../src/components/escala-ui/tooltip'

/** The Tooltip family's root. The Figma page has no `Tooltip` set: it is two parts, TooltipInfoTrigger (the ⓘ button)
 *  and TooltipContent (the bubble). This is the two together as a designer places them, open, with the controls both
 *  parts share. Each part keeps its own playground (the `part` tag in the sidebar filter, or the Anatomy section). */
interface TooltipStoryArgs {
  size: TooltipSize
  side: TooltipSide
  align: TooltipAlign
  variant: TooltipVariant
  text: string
  title: string
  titleVisible: boolean
  arrowVisible: boolean
}

function render({ size, side, align, variant, text, title, titleVisible, arrowVisible }: TooltipStoryArgs) {
  return (
    <TooltipProvider>
      <div style={{ padding: 112, display: 'flex', justifyContent: 'center' }}>
        <Tooltip defaultOpen>
          <TooltipTrigger asChild><TooltipInfoTrigger size={size} variant={variant} aria-label="More information" /></TooltipTrigger>
          <TooltipContent size={size} side={side} align={align} variant={variant} title={titleVisible ? title : undefined} arrow={arrowVisible} sideOffset={6}>
            {text}
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}

const meta: Meta<TooltipStoryArgs> = {
  title: 'Content & Surfaces/Tooltip',
  render,
  args: { size: 'default', side: 'top', align: 'center', variant: 'default', text: 'Used on invoices and receipts. Format: 12-3456789.', title: 'Tax ID', titleVisible: false, arrowVisible: true },
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
type Story = StoryObj<TooltipStoryArgs>

export const Playground: Story = {}
