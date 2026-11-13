// Escala component: TabMenu, TabMenuItem and TabMenuLineItem — the Figma sets of the same names
// (design-plans/tab-menu-contract.md; 984:1830 · 984:939 · 984:1156), 1:1.
// A group of real buttons (`role="group"`, `aria-pressed`, each its own tab stop) that switches between sibling views or routes.
// Variant picks the layout: `*-line` draws a hairline track and a 2px accent bar under (or beside) the selected LineItem,
// `*-button` fills the selected Item. Size cascades to every item.
// Appearance: recipes TabMenu, TabMenuItem, TabMenuLineItem (lib/componentRecipes.ts).
import * as React from 'react'
import { cn } from '../../lib/utils'

export const TAB_MENU_SIZES = ['default', 'sm', 'lg'] as const
export type TabMenuSize = (typeof TAB_MENU_SIZES)[number]
export const TAB_MENU_VARIANTS = ['horizontal-line', 'horizontal-button', 'vertical-line', 'vertical-button'] as const
export type TabMenuVariant = (typeof TAB_MENU_VARIANTS)[number]
export const TAB_MENU_ITEM_STATES = ['Default', 'Hover', 'Selected', 'Focused', 'Disabled'] as const
export type TabMenuItemState = (typeof TAB_MENU_ITEM_STATES)[number]
export const TAB_MENU_INDICATORS = ['bottom', 'left'] as const
export type TabMenuIndicator = (typeof TAB_MENU_INDICATORS)[number]

const TabMenuContext = React.createContext<{
  size: TabMenuSize
  variant: TabMenuVariant
  value: string | undefined
  select: (value: string) => void
}>({ size: 'default', variant: 'horizontal-line', value: undefined, select: () => {} })

export interface TabMenuProps extends Omit<React.ComponentProps<'div'>, 'onChange' | 'defaultValue'> {
  /** Figma Size: item height 32 · 40 · 48 (cascades). */
  size?: TabMenuSize
  /** Figma Variant: horizontal-line · horizontal-button · vertical-line · vertical-button. */
  variant?: TabMenuVariant
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  /** Shortcut for plain items (each label is its own value); they match the Variant. */
  items?: string[]
  /** Items share the width equally. */
  fill?: boolean
  /** Figma Content slot: TabMenuItem (button variants) or TabMenuLineItem (line variants). */
  children?: React.ReactNode
}

function TabMenu({ size = 'default', variant = 'horizontal-line', value, defaultValue, onValueChange, items, fill, children, className, ...props }: TabMenuProps) {
  const [inner, setInner] = React.useState(defaultValue ?? items?.[0])
  const active = value ?? inner
  const select = React.useCallback((v: string) => { setInner(v); onValueChange?.(v) }, [onValueChange])
  const ctx = React.useMemo(() => ({ size, variant, value: active, select }), [size, variant, active, select])
  const vertical = variant.startsWith('vertical')
  const line = variant.endsWith('line')
  const Item = line ? TabMenuLineItem : TabMenuItem
  const content = children ?? items?.map((label) => <Item key={label} value={label}>{label}</Item>)
  return (
    <TabMenuContext.Provider value={ctx}>
      <div
        role="group"
        data-slot="tab-menu"
        data-escala="TabMenu"
        data-variant={variant}
        data-size={size}
        className={cn('relative max-w-full min-w-0', vertical || fill ? 'flex w-full' : 'inline-flex', className)}
        {...props}
      >
        {line && (
          <span
            aria-hidden
            data-part="TabMenu.track"
            className={cn('pointer-events-none absolute', vertical ? 'inset-y-0 left-0' : 'inset-x-0 bottom-0')}
          />
        )}
        <div data-part="TabMenu.content" className={cn('flex min-w-0', vertical ? 'w-full flex-col' : 'flex-row', fill && !vertical && 'w-full [&>*]:flex-1')}>{content}</div>
      </div>
    </TabMenuContext.Provider>
  )
}

interface ItemCommon extends Omit<React.ComponentProps<'button'>, 'value'> {
  /** The item's value (defaults to its text). */
  value?: string
  size?: TabMenuSize
  /** Pins a state for docs and previews. */
  forceState?: TabMenuItemState
  /** Figma IconLeadingVisible / IconLeadingIcon. */
  iconLeading?: React.ReactNode
  /** Figma TrailingVisible: a count Badge (xs · soft · pill · number · secondary). */
  trailing?: React.ReactNode
  /** Figma IconTrailingVisible / IconTrailingIcon. */
  iconTrailing?: React.ReactNode
}

function useItem(props: ItemCommon) {
  const ctx = React.useContext(TabMenuContext)
  const label = typeof props.children === 'string' ? props.children : undefined
  const value = props.value ?? label ?? ''
  const selected = props.forceState ? props.forceState === 'Selected' : ctx.value !== undefined && ctx.value === value
  const state: TabMenuItemState | undefined = props.disabled ? 'Disabled' : props.forceState && props.forceState !== 'Default' ? props.forceState : selected ? 'Selected' : undefined
  return { ctx, value, selected, state }
}

function ItemBody({ part, iconLeading, trailing, iconTrailing, children }: Pick<ItemCommon, 'iconLeading' | 'trailing' | 'iconTrailing' | 'children'> & { part: string }) {
  return (
    <>
      {iconLeading != null && <span data-part={`${part}.iconLeading`} aria-hidden className="inline-flex shrink-0 items-center justify-center [&>svg]:size-full">{iconLeading}</span>}
      <span data-part={`${part}.label`}>{children}</span>
      {trailing != null && <span data-part={`${part}.badge`} className="inline-flex shrink-0 items-center">{trailing}</span>}
      {iconTrailing != null && <span data-part={`${part}.iconTrailing`} aria-hidden className="inline-flex shrink-0 items-center justify-center [&>svg]:size-full">{iconTrailing}</span>}
    </>
  )
}

const ITEM_CLASS = 'relative inline-flex shrink-0 cursor-pointer items-center whitespace-nowrap outline-none disabled:cursor-not-allowed'

export type TabMenuItemProps = ItemCommon

/** Figma TabMenuItem: the button tab (the selected one is filled). */
function TabMenuItem({ value: _v, size, forceState: _f, iconLeading, trailing, iconTrailing, children, className, onClick, ...props }: TabMenuItemProps) {
  const { ctx, value, selected, state } = useItem({ value: _v, forceState: _f, children, ...props })
  return (
    <button
      type="button"
      aria-pressed={selected}
      data-escala="TabMenuItem"
      data-size={size ?? ctx.size}
      data-force-state={state}
      className={cn(ITEM_CLASS, ctx.variant.startsWith('vertical') && 'w-full', className)}
      onClick={(e) => { onClick?.(e); if (!e.defaultPrevented) ctx.select(value) }}
      {...props}
    >
      <ItemBody part="TabMenuItem" iconLeading={iconLeading} trailing={trailing} iconTrailing={iconTrailing}>{children}</ItemBody>
    </button>
  )
}

export interface TabMenuLineItemProps extends ItemCommon {
  /** Figma Indicator: the bar's edge. Defaults to `left` in a vertical TabMenu, `bottom` otherwise. */
  indicator?: TabMenuIndicator
}

/** Figma TabMenuLineItem: the line tab (the selected one carries a 2px accent bar). */
function TabMenuLineItem({ value: _v, size, forceState: _f, indicator, iconLeading, trailing, iconTrailing, children, className, onClick, ...props }: TabMenuLineItemProps) {
  const { ctx, value, selected, state } = useItem({ value: _v, forceState: _f, children, ...props })
  const edge = indicator ?? (ctx.variant.startsWith('vertical') ? 'left' : 'bottom')
  return (
    <button
      type="button"
      aria-pressed={selected}
      data-escala="TabMenuLineItem"
      data-size={size ?? ctx.size}
      data-indicator={edge}
      data-force-state={state}
      className={cn(ITEM_CLASS, ctx.variant.startsWith('vertical') && 'w-full', className)}
      onClick={(e) => { onClick?.(e); if (!e.defaultPrevented) ctx.select(value) }}
      {...props}
    >
      <ItemBody part="TabMenuLineItem" iconLeading={iconLeading} trailing={trailing} iconTrailing={iconTrailing}>{children}</ItemBody>
      {state === 'Selected' && <span aria-hidden data-part="TabMenuLineItem.indicator" className={cn('pointer-events-none absolute', edge === 'bottom' ? 'inset-x-0 bottom-0' : 'inset-y-0 left-0')} />}
    </button>
  )
}

export { TabMenu, TabMenuItem, TabMenuLineItem }
