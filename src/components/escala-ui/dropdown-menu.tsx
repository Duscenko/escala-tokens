// Escala component: DropdownMenu, DropdownMenuLabel, DropdownMenuItem and DropdownMenuFooter — the Figma sets of the same names
// (design-plans/dropdown-menu-contract.md; 947:299, 947:169, 947:161, 949:3290), 1:1. Radix DropdownMenu gives the behaviour (roles,
// arrow keys, typeahead, Escape, focus return). A 256 wide panel: an optional header (a search Input), the Content (labels, items,
// separators) and an optional footer. Size cascades from the panel to every label and item. The panel portals into the theme scope;
// `inline` draws it in place, open, with no Radix state (docs, previews).
// Appearance: recipes DropdownMenu, DropdownMenuLabel, DropdownMenuItem, DropdownMenuFooter (lib/componentRecipes.ts).
import * as React from 'react'
import { DropdownMenu as DropdownMenuPrimitive } from 'radix-ui'
import { cn } from '../../lib/utils'
import { glyph } from '../../lib/icons'
import { usePortalContainer } from './portal-scope'

export const DROPDOWN_MENU_SIZES = ['default', 'sm', 'lg'] as const
export type DropdownMenuSize = (typeof DROPDOWN_MENU_SIZES)[number]
export const DROPDOWN_MENU_ITEM_STATES = ['Default', 'Focused', 'Selected', 'Disabled'] as const
export type DropdownMenuItemState = (typeof DROPDOWN_MENU_ITEM_STATES)[number]
export const DROPDOWN_MENU_ITEM_VARIANTS = ['default', 'destructive'] as const
export type DropdownMenuItemVariant = (typeof DROPDOWN_MENU_ITEM_VARIANTS)[number]
export const DROPDOWN_MENU_FOOTER_LAYOUTS = ['inline', 'stacked'] as const
export type DropdownMenuFooterLayout = (typeof DROPDOWN_MENU_FOOTER_LAYOUTS)[number]

const DropdownMenu = DropdownMenuPrimitive.Root
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger
const DropdownMenuGroup = DropdownMenuPrimitive.Group

/** What the panel tells its parts: whether it is drawn in place (plain elements, not Radix items) and its Size. */
const MenuContext = React.createContext<{ inline: boolean; size: DropdownMenuSize }>({ inline: false, size: 'default' })

export interface DropdownMenuContentProps extends React.ComponentProps<typeof DropdownMenuPrimitive.Content> {
  /** Figma Size: it cascades to every label and item. */
  size?: DropdownMenuSize
  /** Figma HeaderVisible / Header: a search Input, as the file draws it. */
  header?: React.ReactNode
  /** Figma FooterVisible / the DropdownMenuFooter. */
  footer?: React.ReactNode
  /** Draw it in place, open, with no portal and no Radix state. */
  inline?: boolean
}

function DropdownMenuContent({ size = 'default', header, footer, inline = false, sideOffset = 6, className, children, ...props }: DropdownMenuContentProps) {
  const container = usePortalContainer()
  const inner = (
    <>
      {header != null && <div data-part="DropdownMenu.header" className="flex flex-col">{header}</div>}
      <div data-part="DropdownMenu.content" className="flex min-h-0 flex-col overflow-y-auto">{children}</div>
      {footer}
    </>
  )
  if (inline) {
    return (
      <MenuContext.Provider value={{ inline: true, size }}>
        <div role="menu" data-slot="dropdown-menu-content" data-escala="DropdownMenu" data-size={size} className={cn('flex max-w-full flex-col overflow-hidden outline-none', className)} style={props.style}>
          {inner}
        </div>
      </MenuContext.Provider>
    )
  }
  return (
    <DropdownMenuPrimitive.Portal container={container}>
      <MenuContext.Provider value={{ inline: false, size }}>
        <DropdownMenuPrimitive.Content
          data-slot="dropdown-menu-content"
          data-escala="DropdownMenu"
          data-size={size}
          sideOffset={sideOffset}
          className={cn('z-50 flex max-w-full flex-col overflow-hidden outline-none', className)}
          {...props}
        >
          {inner}
        </DropdownMenuPrimitive.Content>
      </MenuContext.Provider>
    </DropdownMenuPrimitive.Portal>
  )
}

export interface DropdownMenuLabelProps extends React.ComponentProps<'div'> {
  /** Figma Size (it follows the menu). */
  size?: DropdownMenuSize
}

/** Figma DropdownMenuLabel: the heading of a group; `children` is the Label text. */
function DropdownMenuLabel({ size, className, ...props }: DropdownMenuLabelProps) {
  const ctx = React.useContext(MenuContext)
  return (
    <div
      data-slot="dropdown-menu-label"
      data-escala="DropdownMenuLabel"
      data-size={size ?? ctx.size}
      className={cn('flex w-full items-center', className)}
      {...props}
    />
  )
}

export interface DropdownMenuItemProps extends Omit<React.ComponentProps<typeof DropdownMenuPrimitive.Item>, 'children'> {
  /** Figma Size (it follows the menu). */
  size?: DropdownMenuSize
  /** Figma Variant. */
  variant?: DropdownMenuItemVariant
  /** Pin a state without a pointer (docs, Figma parity): Focused, Selected, Disabled. */
  forceState?: DropdownMenuItemState
  /** Selected (a checked row): shows the indicator. Makes the row a menuitemcheckbox. */
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  /** Figma Label. */
  children?: React.ReactNode
  /** Figma DescriptionVisible / Description. */
  description?: React.ReactNode
  /** Figma IconLeadingVisible + IconLeadingIcon. */
  iconLeading?: React.ReactNode
  /** Figma MediaVisible / Media (an Avatar). */
  media?: React.ReactNode
  /** Figma TrailingVisible / Trailing (a shortcut). */
  trailing?: React.ReactNode
  /** Figma ControlVisible / Control (a Switch). */
  control?: React.ReactNode
  /** Figma IconTrailingVisible + IconTrailingIcon (a caret for a submenu). */
  iconTrailing?: React.ReactNode
  /** Figma IndicatorVisible: the check of a Selected row (default true). */
  indicatorVisible?: boolean
  /** The check glyph (Phosphor Check by default). */
  indicator?: React.ReactNode
  /** Inline only: draw the row as Focused (a live menu gets it from hover and the arrow keys). */
  highlighted?: boolean
}


/** Figma DropdownMenuItem. */
function DropdownMenuItem({
  size, variant = 'default', forceState, checked, children, description, iconLeading, media, trailing, control, iconTrailing, indicatorVisible = true, indicator,
  highlighted, disabled, onCheckedChange, className, ...props
}: DropdownMenuItemProps) {
  const ctx = React.useContext(MenuContext)
  const state: DropdownMenuItemState | undefined = disabled ? 'Disabled' : forceState && forceState !== 'Default' ? forceState : checked ? 'Selected' : highlighted ? 'Focused' : undefined
  const selected = checked || state === 'Selected'
  const body = (
    <>
      {iconLeading != null && <span data-part="DropdownMenuItem.iconLeading" aria-hidden className="inline-flex shrink-0 items-center justify-center [&>svg]:size-full">{iconLeading}</span>}
      {media != null && <span data-part="DropdownMenuItem.media" className="inline-flex shrink-0 items-center">{media}</span>}
      <span data-part="DropdownMenuItem.text" className="flex min-w-0 flex-1 flex-col">
        <span data-part="DropdownMenuItem.label">{children}</span>
        {description != null && <span data-part="DropdownMenuItem.description">{description}</span>}
      </span>
      {trailing != null && <span data-part="DropdownMenuItem.trailing" className="shrink-0">{trailing}</span>}
      {control != null && <span data-part="DropdownMenuItem.control" className="inline-flex shrink-0 items-center">{control}</span>}
      {iconTrailing != null && <span data-part="DropdownMenuItem.iconTrailing" aria-hidden className="inline-flex shrink-0 items-center justify-center [&>svg]:size-full">{iconTrailing}</span>}
      {selected && indicatorVisible && (
        <span data-part="DropdownMenuItem.indicator" aria-hidden className="inline-flex shrink-0 items-center justify-center [&>svg]:size-full">
          {indicator ?? glyph('check', { decorative: false })}
        </span>
      )}
    </>
  )
  const cls = cn('flex w-full cursor-pointer items-center outline-none select-none data-[disabled]:cursor-not-allowed', className)
  if (ctx.inline) {
    const { asChild: _a, onSelect: _s, textValue: _t, ...rest } = props
    return (
      <div
        role={checked !== undefined ? 'menuitemcheckbox' : 'menuitem'}
        aria-checked={checked}
        aria-disabled={disabled || undefined}
        data-slot="dropdown-menu-item"
        data-escala="DropdownMenuItem"
        data-size={size ?? ctx.size}
        data-variant={variant}
        data-force-state={state}
        data-highlighted={highlighted ? '' : undefined}
        data-disabled={disabled ? '' : undefined}
        className={cls}
        {...(rest as React.ComponentProps<'div'>)}
      >
        {body}
      </div>
    )
  }
  const common = {
    'data-slot': 'dropdown-menu-item',
    'data-size': size ?? ctx.size,
    'data-variant': variant,
    'data-force-state': state,
    disabled,
    className: cls,
  }
  if (checked !== undefined) {
    return <DropdownMenuPrimitive.CheckboxItem data-escala="DropdownMenuItem" checked={checked} onCheckedChange={onCheckedChange} {...common} {...props}>{body}</DropdownMenuPrimitive.CheckboxItem>
  }
  return <DropdownMenuPrimitive.Item data-escala="DropdownMenuItem" {...common} {...props}>{body}</DropdownMenuPrimitive.Item>
}

/** The rule between groups: 4px above and below a 1px Border/subtle line (the file's 9px row). */
function DropdownMenuSeparator({ className, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  const { inline } = React.useContext(MenuContext)
  const attrs = { 'data-slot': 'dropdown-menu-separator', 'data-part': 'DropdownMenu.separator', className: cn('my-[var(--spacing-gap-tight)]', className) }
  if (inline) return <div role="separator" {...attrs} />
  return <DropdownMenuPrimitive.Separator {...attrs} {...props} />
}

export interface DropdownMenuFooterProps extends React.ComponentProps<'div'> {
  /** Figma Size (it follows the menu). */
  size?: DropdownMenuSize
  /** Figma Layout. */
  layout?: DropdownMenuFooterLayout
  /** Figma LeadingVisible / Leading. */
  leadingVisible?: boolean
  leading?: React.ReactNode
}

/** Figma DropdownMenuFooter. `children` is the Actions slot (Clear · Apply). Keep it outside role menu. */
function DropdownMenuFooter({ size, layout = 'inline', leadingVisible = true, leading, className, children, ...props }: DropdownMenuFooterProps) {
  const ctx = React.useContext(MenuContext)
  const stacked = layout === 'stacked'
  return (
    <div
      data-slot="dropdown-menu-footer"
      data-escala="DropdownMenuFooter"
      data-size={size ?? ctx.size}
      data-layout={layout}
      // The top hairline is drawn inside the 8px padding (the footer is 48 = 8 + 32 + 8).
      className={cn('flex w-full !pt-[calc(var(--spacing-gap-control)-var(--stroke-divider,1px))]', stacked ? 'flex-col' : 'flex-row items-center', className)}
      {...props}
    >
      {leadingVisible && <div data-part="DropdownMenuFooter.leading" className={cn('flex min-w-0 items-center', !stacked && 'flex-1')}>{leading}</div>}
      <div data-part="DropdownMenuFooter.actions" className={cn('flex', stacked ? 'w-full flex-col [&>*]:w-full' : 'shrink-0 flex-row items-center')}>{children}</div>
    </div>
  )
}

function DropdownMenuShortcut({ className, ...props }: React.ComponentProps<'span'>) {
  return <span data-slot="dropdown-menu-shortcut" data-part="DropdownMenuItem.trailing" className={className} {...props} />
}

export {
  DropdownMenu, DropdownMenuContent, DropdownMenuFooter, DropdownMenuGroup, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator,
  DropdownMenuShortcut, DropdownMenuTrigger,
}
