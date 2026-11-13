// Escala component: Accordion + AccordionItem — the Figma sets of the same names (design-plans/accordion-contract.md,
// 451:375 and 451:188), 1:1. An item is a trigger (optional icon, label, a chevron that flips when open) and
// collapsible content; the Accordion stacks items that share one Variant and open and close independently
// (type multiple). Radix gives the behaviour (keyboard, aria, the content height the motion reads).
// Appearance: recipes (Accordion, AccordionItem).
import * as React from 'react'
import { Accordion as AccordionPrimitive } from 'radix-ui'
import { cn } from '../../lib/utils'

export const ACCORDION_VARIANTS = ['ghost-default', 'ghost-underline', 'ghost-rounded', 'outline-rounded', 'outline-sharp', 'filled-rounded'] as const
export type AccordionVariant = (typeof ACCORDION_VARIANTS)[number]
export const ACCORDION_ITEM_STATES = ['Closed', 'Open', 'Disabled'] as const
export type AccordionItemState = (typeof ACCORDION_ITEM_STATES)[number]

// Phosphor regular glyphs: the file's defaults (House icon, CaretDown chevron).
const HOUSE = 'M219.31,108.68l-80-80a16,16,0,0,0-22.62,0l-80,80A15.87,15.87,0,0,0,32,120v96a8,8,0,0,0,8,8h64a8,8,0,0,0,8-8V160h32v56a8,8,0,0,0,8,8h64a8,8,0,0,0,8-8V120A15.87,15.87,0,0,0,219.31,108.68ZM208,208H160V152a8,8,0,0,0-8-8H104a8,8,0,0,0-8,8v56H48V120l80-80,80,80Z'
const CARET = 'M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z'
const glyph = (d: string) => <svg viewBox="0 0 256 256" fill="currentColor" aria-hidden focusable="false"><path d={d} /></svg>

const Context = React.createContext<{ variant: AccordionVariant; open: string[] } | null>(null)

// ── Accordion ────────────────────────────────────────────────────────────────

export interface AccordionProps extends Omit<React.ComponentProps<'div'>, 'defaultValue' | 'dir'> {
  /** Figma Variant: shared by every item. */
  variant?: AccordionVariant
  /** The open items (values). Items open and close independently. */
  value?: string[]
  defaultValue?: string[]
  onValueChange?: (value: string[]) => void
}

function Accordion({ variant = 'ghost-default', value, defaultValue = [], onValueChange, className, children, ...props }: AccordionProps) {
  const [inner, setInner] = React.useState<string[]>(defaultValue)
  const open = value ?? inner
  return (
    <Context.Provider value={{ variant, open }}>
      <AccordionPrimitive.Root
        type="multiple"
        value={open}
        onValueChange={(v) => { setInner(v); onValueChange?.(v) }}
        data-slot="accordion"
        data-escala="Accordion"
        data-variant={variant}
        className={cn('flex w-full flex-col', className)}
        {...props}
      >
        {children}
      </AccordionPrimitive.Root>
    </Context.Provider>
  )
}

// ── AccordionItem ────────────────────────────────────────────────────────────

export interface AccordionItemProps extends Omit<React.ComponentProps<typeof AccordionPrimitive.Item>, 'value' | 'children'> {
  /** Identifies the item inside its Accordion. */
  value?: string
  /** Figma Variant (taken from the Accordion when inside one). */
  variant?: AccordionVariant
  /** Figma Label. */
  label?: React.ReactNode
  /** Figma IconVisible (default true) and Icon (the swap): the leading glyph. */
  iconVisible?: boolean
  icon?: React.ReactNode
  /** Figma Content. */
  children?: React.ReactNode
}

function AccordionItem({
  value, variant: variantProp, label = 'Accordion title', iconVisible = true, icon, disabled, className, children, ...props
}: AccordionItemProps) {
  const ctx = React.useContext(Context)
  const auto = React.useId()
  const id = value ?? auto
  const variant = variantProp ?? ctx?.variant ?? 'ghost-default'
  const open = ctx?.open.includes(id) ?? false
  const state: AccordionItemState = disabled ? 'Disabled' : open ? 'Open' : 'Closed'
  const body = (
    <AccordionPrimitive.Item
      value={id}
      disabled={disabled}
      data-slot="accordion-item"
      data-escala="AccordionItem"
      data-variant={variant}
      // Always set: the recipe's State axis has no pointer state, so each value is `[data-force-state]`.
      data-force-state={state}
      className={cn('flex w-full flex-col', className)}
      {...props}
    >
      <AccordionPrimitive.Header className="m-0 flex">
        <AccordionPrimitive.Trigger
          data-part="AccordionItem.trigger"
          className={cn(
            'flex w-full cursor-pointer items-center border-0 bg-transparent text-left outline-none disabled:cursor-not-allowed',
            '[&[data-state=open]_[data-part="AccordionItem.chevron"]]:rotate-180',
          )}
        >
          {iconVisible && <span data-part="AccordionItem.icon" aria-hidden className="inline-flex shrink-0 items-center justify-center [&>svg]:size-full">{icon ?? glyph(HOUSE)}</span>}
          <span data-part="AccordionItem.label" className="min-w-0 flex-1">{label}</span>
          <span data-part="AccordionItem.chevron" aria-hidden className="inline-flex shrink-0 items-center justify-center [&>svg]:size-full">{glyph(CARET)}</span>
        </AccordionPrimitive.Trigger>
      </AccordionPrimitive.Header>
      <AccordionPrimitive.Content data-part="AccordionItem.content" className="overflow-hidden">
        {children ?? 'Accordion content goes here. Add supporting detail for this section.'}
      </AccordionPrimitive.Content>
    </AccordionPrimitive.Item>
  )
  // Alone (docs, a story), an item needs its own Radix root.
  return ctx ? body : (
    <Accordion variant={variant} defaultValue={[]}>
      {body}
    </Accordion>
  )
}

export { Accordion, AccordionItem }
