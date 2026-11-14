// Escala components: Sidebar · SidebarBrand · SidebarGroup · SidebarGroupLabel · SidebarMenuButton — the Figma
// sets of the same names (page Sidebar), 1:1. Static: an app shell owns the provider and the Cmd/Ctrl+B shortcut;
// `collapsed` is the Figma Collapsed axis and cascades to every part through context (the file drives
// SidebarMenuButton's Collapsed from the Sidebar, not from its own prop).
//  · Sidebar (Collapsed): an `aside` landmark with header (SidebarBrand + SidebarTrigger), content and footer.
//  · SidebarGroup (Size): a labelled section; Size cascades to its SidebarMenu and every SidebarMenuButton.
//  · SidebarGroupLabel (Size): the heading of a group; hidden while collapsed.
//  · SidebarMenuButton (Size · State · Collapsed): a navigation row — leading icon, label, trailing count, trend
//    Badge and trailing icon. `State` Default · Hover · Focused · Current · Disabled; `Current` is the page you are
//    on (`aria-current`; `isActive` is its older name).
//  · SidebarBrand (Collapsed): the Logo slot with a title and an optional subtitle.
// Appearance: recipes Sidebar, SidebarBrand, SidebarGroup, SidebarGroupLabel, SidebarMenuButton
// (lib/componentRecipes.ts; the row is `listItemRecipe`, the twin of DropdownMenuItem and ComboboxItem).
import * as React from 'react'
import { Slot } from 'radix-ui'
import { cn } from '../../lib/utils'
import { glyph } from '../../lib/icons'
import { Badge } from './badge'
import { IconButton } from './icon-button'

export const SIDEBAR_SIZES = ['default', 'sm', 'lg'] as const
export type SidebarSize = (typeof SIDEBAR_SIZES)[number]
/** Figma State order: Default · Hover · Focused · Current · Disabled. */
export const SIDEBAR_MENU_BUTTON_STATES = ['Default', 'Hover', 'Focused', 'Current', 'Disabled'] as const
export type SidebarMenuButtonState = (typeof SIDEBAR_MENU_BUTTON_STATES)[number]

/** What the Sidebar tells its parts: whether it is the 48 px icon rail, and the Size of the group being drawn. */
const SidebarContext = React.createContext<{ collapsed: boolean; size: SidebarSize }>({ collapsed: false, size: 'default' })

export interface SidebarProps extends React.ComponentProps<'aside'> {
  /** Figma Collapsed: the 48 px icon rail. */
  collapsed?: boolean
}

function Sidebar({ collapsed = false, className, children, 'aria-label': ariaLabel = 'Sidebar', ...props }: SidebarProps) {
  return (
    <SidebarContext.Provider value={{ collapsed, size: 'default' }}>
      <aside
        aria-label={ariaLabel}
        data-slot="sidebar"
        data-escala="Sidebar"
        data-collapsed={collapsed ? 'true' : 'false'}
        data-state={collapsed ? 'collapsed' : 'expanded'}
        className={cn('group/sidebar flex h-full shrink-0 flex-col', className)}
        {...props}
      >
        {children}
      </aside>
    </SidebarContext.Provider>
  )
}

/** The header: SidebarBrand and SidebarTrigger side by side, stacked when collapsed. */
function SidebarHeader({ className, ...props }: React.ComponentProps<'div'>) {
  const { collapsed } = React.useContext(SidebarContext)
  return (
    <div
      data-slot="sidebar-header"
      data-part="Sidebar.header"
      className={cn('flex shrink-0', collapsed ? 'flex-col items-center' : 'flex-row items-center', className)}
      {...props}
    />
  )
}

function SidebarContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sidebar-content" data-part="Sidebar.content" className={cn('flex min-h-0 flex-1 flex-col overflow-auto', className)} {...props} />
}

function SidebarFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sidebar-footer" data-part="Sidebar.footer" className={cn('flex shrink-0 flex-col', className)} {...props} />
}

function SidebarSeparator({ className, ...props }: React.ComponentProps<'div'>) {
  return <div role="none" data-slot="sidebar-separator" data-part="Sidebar.separator" className={cn('shrink-0', className)} {...props} />
}

/** Figma SidebarTrigger: a ghost IconButton that folds and unfolds the rail. Give it `aria-expanded` and `aria-controls`. */
function SidebarTrigger({ className, 'aria-label': ariaLabel, ...props }: Omit<React.ComponentProps<typeof IconButton>, 'icon' | 'aria-label'> & { 'aria-label'?: string }) {
  const { collapsed } = React.useContext(SidebarContext)
  return (
    <IconButton
      variant="secondary"
      appearance="ghost"
      size="sm"
      data-slot="sidebar-trigger"
      aria-label={ariaLabel ?? (collapsed ? 'Expand sidebar' : 'Collapse sidebar')}
      aria-expanded={!collapsed}
      icon={glyph(collapsed ? 'caret-double-right' : 'caret-double-left')}
      className={className}
      {...props}
    />
  )
}

export interface SidebarBrandProps extends Omit<React.ComponentProps<'div'>, 'title'> {
  /** Figma Logo (the slot): an Avatar or the product mark. */
  logo?: React.ReactNode
  /** Figma Title. */
  title?: React.ReactNode
  /** Figma Subtitle (with SubtitleVisible: omit it to hide). */
  subtitle?: React.ReactNode
}

/** Figma SidebarBrand: collapses to the logo only. */
function SidebarBrand({ logo, title = 'Escala', subtitle, className, ...props }: SidebarBrandProps) {
  const { collapsed } = React.useContext(SidebarContext)
  return (
    <div
      data-slot="sidebar-brand"
      data-escala="SidebarBrand"
      data-collapsed={collapsed ? 'true' : 'false'}
      className={cn('flex min-w-0 flex-1 items-center', collapsed && 'flex-none', className)}
      {...props}
    >
      <span data-part="SidebarBrand.logo" className="inline-flex shrink-0 items-center justify-center">{logo}</span>
      {!collapsed && (
        <span data-part="SidebarBrand.text" className="flex min-w-0 flex-col">
          <span data-part="SidebarBrand.title" className="truncate">{title}</span>
          {subtitle != null && <span data-part="SidebarBrand.subtitle" className="truncate">{subtitle}</span>}
        </span>
      )}
    </div>
  )
}

export interface SidebarGroupProps extends React.ComponentProps<'div'> {
  /** Figma Size: it cascades to the group's SidebarMenu and every SidebarMenuButton. */
  size?: SidebarSize
}

/** Figma SidebarGroup: a SidebarGroupLabel and a SidebarMenu. Name the group with `aria-labelledby` pointing at the label. */
function SidebarGroup({ size = 'default', className, ...props }: SidebarGroupProps) {
  const ctx = React.useContext(SidebarContext)
  return (
    <SidebarContext.Provider value={{ collapsed: ctx.collapsed, size }}>
      <div
        role="group"
        data-slot="sidebar-group"
        data-escala="SidebarGroup"
        data-size={size}
        data-collapsed={ctx.collapsed ? 'true' : 'false'}
        className={cn('relative flex w-full min-w-0 flex-col', className)}
        {...props}
      />
    </SidebarContext.Provider>
  )
}

export interface SidebarGroupLabelProps extends React.ComponentProps<'div'> {
  /** Figma Size (it follows the group). */
  size?: SidebarSize
  asChild?: boolean
}

/** Figma SidebarGroupLabel: hidden while the Sidebar is collapsed. */
function SidebarGroupLabel({ size, asChild = false, className, ...props }: SidebarGroupLabelProps) {
  const ctx = React.useContext(SidebarContext)
  if (ctx.collapsed) return null
  const Comp = asChild ? Slot.Root : 'div'
  return (
    <Comp
      data-slot="sidebar-group-label"
      data-escala="SidebarGroupLabel"
      data-size={size ?? ctx.size}
      className={cn('flex w-full shrink-0 items-center outline-none', className)}
      {...props}
    />
  )
}

function SidebarGroupContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="sidebar-group-content" className={cn('w-full', className)} {...props} />
}

/** The group's Content slot: the rows, `gap-tight` apart. */
function SidebarMenu({ size, className, ...props }: React.ComponentProps<'ul'> & { size?: SidebarSize }) {
  const ctx = React.useContext(SidebarContext)
  const list = (
    <ul data-slot="sidebar-menu" data-part="SidebarGroup.content" className={cn('m-0 flex w-full min-w-0 list-none flex-col p-0', className)} {...props} />
  )
  if (!size || size === ctx.size) return list
  return <SidebarContext.Provider value={{ collapsed: ctx.collapsed, size }}>{list}</SidebarContext.Provider>
}

function SidebarMenuItem({ className, ...props }: React.ComponentProps<'li'>) {
  return <li data-slot="sidebar-menu-item" className={cn('group/menu-item relative', className)} {...props} />
}

export interface SidebarMenuButtonProps extends Omit<React.ComponentProps<'button'>, 'children'> {
  asChild?: boolean
  /** Figma Size (it follows the group). */
  size?: SidebarSize
  /** Pin a state without a pointer (docs, Figma parity): Hover · Focused · Current · Disabled. */
  state?: SidebarMenuButtonState
  /** @deprecated Use `state="Current"`. */
  isActive?: boolean
  /** Figma IconLeadingVisible + IconLeadingIcon. */
  icon?: React.ReactNode
  /** Figma Label. With `asChild` the child is the whole row and none of the parts render. */
  children?: React.ReactNode
  /** Figma TrailingVisible + Trailing (a count). */
  trailing?: React.ReactNode
  /** Figma TrendVisible: an exposed Badge, soft, success for `up`, critical for `down`. */
  trend?: 'up' | 'down'
  /** The text of the trend Badge (an icon-only Badge when omitted). */
  trendLabel?: React.ReactNode
  /** Figma IconTrailingVisible + IconTrailingIcon. */
  iconTrailing?: React.ReactNode
}

const iconBox = 'inline-flex shrink-0 items-center justify-center [&>svg]:size-full'

/** Figma SidebarMenuButton. */
function SidebarMenuButton({
  asChild = false, size, state: pinned, isActive: isActiveProp = false, icon, children, trailing, trend, trendLabel, iconTrailing,
  disabled, className, ...props
}: SidebarMenuButtonProps) {
  const ctx = React.useContext(SidebarContext)
  const isCurrent = isActiveProp || pinned === 'Current'
  const state: SidebarMenuButtonState | undefined = disabled || pinned === 'Disabled'
    ? 'Disabled'
    : pinned && pinned !== 'Default' ? pinned : isCurrent ? 'Current' : undefined
  const common = {
    'data-slot': 'sidebar-menu-button',
    'data-size': size ?? ctx.size,
    'data-collapsed': ctx.collapsed ? 'true' : 'false',
    'data-force-state': state,
    // Kept for older callers that style the active row.
    'data-active': isCurrent ? 'true' : undefined,
    'aria-current': isCurrent ? ('page' as const) : undefined,
    'aria-disabled': state === 'Disabled' || undefined,
    className: cn(
      'peer/menu-button flex w-full cursor-pointer items-center overflow-hidden border-0 bg-transparent text-left outline-none',
      'aria-disabled:cursor-not-allowed [&_svg]:shrink-0',
      ctx.collapsed && 'justify-center',
      className,
    ),
  }
  if (asChild) return <Slot.Root data-escala="SidebarMenuButton" {...common} {...props}>{children}</Slot.Root>
  return (
    <button type="button" data-escala="SidebarMenuButton" disabled={disabled} {...common} {...props}>
      {icon != null && <span data-part="SidebarMenuButton.icon" aria-hidden className={iconBox}>{icon}</span>}
      <span data-part="SidebarMenuButton.text" className={cn('flex min-w-0 flex-1 flex-col items-start', ctx.collapsed && 'sr-only')}>
        <span data-part="SidebarMenuButton.label" className="max-w-full truncate">{children}</span>
      </span>
      {!ctx.collapsed && trailing != null && <span data-part="SidebarMenuButton.trailing" className="shrink-0 whitespace-nowrap">{trailing}</span>}
      {!ctx.collapsed && trend && (
        <span data-part="SidebarMenuButton.trend" className="inline-flex shrink-0">
          <Badge
            appearance="soft"
            shape="pill"
            size="xs"
            variant={trend === 'up' ? 'success' : 'critical'}
            {...(trendLabel != null
              ? { iconLeading: glyph(trend === 'up' ? 'trend-up' : 'trend-down'), children: trendLabel }
              : { type: 'icon' as const, icon: glyph(trend === 'up' ? 'trend-up' : 'trend-down'), 'aria-label': trend === 'up' ? 'Trending up' : 'Trending down' })}
          />
        </span>
      )}
      {!ctx.collapsed && iconTrailing != null && <span data-part="SidebarMenuButton.iconTrailing" aria-hidden className={iconBox}>{iconTrailing}</span>}
    </button>
  )
}

export {
  Sidebar, SidebarBrand, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarSeparator, SidebarTrigger,
}
