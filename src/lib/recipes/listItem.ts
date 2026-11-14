/**
 * `listItemRecipe`: ONE paint for a row of a list that you point at and pick —
 * DropdownMenuItem, ComboboxItem and SidebarMenuButton. Refactor B1.
 *
 * The rule it holds for all three:
 *  · the FILL follows the pointer or the arrow keys (`[data-highlighted]`, the
 *    row Radix / the listbox marks) — hovering a row never draws a ring;
 *  · the RING (`border.focus` + `border.ring.default`) belongs to keyboard focus
 *    alone (`:focus-visible`) and to the pinned Figma state `Focused`;
 *  · Selected is `surface.selected`; Disabled turns every ink `content.disabled`;
 *  · the trailing text (a shortcut, a count) is `content.secondary`.
 *
 * What stays per component is GEOMETRY (`ListItemMetrics`): the Figma file draws
 * the Dropdown rows 24 · 32 · 40 and the Combobox rows 28 · 32 · 36, and the
 * file wins, so a component passes its own metrics. Paint is never a metric.
 */
import { c, NONE, type SlotMap, type SlotProps } from './helpers.js'

export const LIST_ITEM_SIZES = ['sm', 'default', 'lg'] as const
export const LIST_ITEM_STATES = ['Default', 'Hover', 'Focused', 'Selected', 'Disabled'] as const
export const LIST_ITEM_VARIANTS = ['default', 'destructive'] as const

export interface ListItemMetrics {
  minHeight: string
  paddingX: string
  paddingY: string
  gap: string
  /** The glyph box of the leading icon and the indicator. */
  icon: string
  label: string
  /** Radius of the row (defaults to `radius.control`). */
  radius?: string
  /** A focus edge the file LAYS OUT (Combobox: a 1px edge that pushes the content in).
   *  Without it the edge is the 2px inset ring of Button (`focus` + `ring`). */
  edge?: string
}

/** The geometry the Dropdown file draws; a component with other numbers passes its own. */
export const LIST_ITEM_METRICS: Record<string, ListItemMetrics> = {
  sm: { minHeight: 'size.xs', paddingX: 'spacing.gap-control', paddingY: 'spacing.gap-tight', gap: 'spacing.gap-tight', icon: 'icon.small', label: 'type.caption' },
  default: { minHeight: 'size.sm', paddingX: 'spacing.gap-control', paddingY: 'spacing.gap-tight', gap: 'spacing.gap-control', icon: 'icon.small', label: 'type.body-sm' },
  lg: { minHeight: 'size.md', paddingX: 'spacing.inset-control', paddingY: 'spacing.gap-tight', gap: 'spacing.gap-control', icon: 'icon.medium', label: 'type.body-md' },
}

/** The fill a highlighted row takes and the ring a focused one adds. */
function highlight(variant: string): { fill: string; focus: string; ring: string } {
  return variant === 'destructive'
    ? { fill: c('status.critical.surface'), focus: c('status.critical.border-strong'), ring: c('status.critical.border') }
    : { fill: c('surface.muted'), focus: c('border.focus'), ring: c('border.ring.default') }
}

/** The fill alone: a row under the pointer or the arrow keys. */
export function listItemHighlightFill(variant: string = 'default'): SlotProps {
  return { fill: highlight(variant).fill }
}

/** The root paint of one state: the fill, and the ring only for `Focused`. */
export function listItemRootPaint(state: string, variant: string = 'default', metrics?: ListItemMetrics): SlotProps {
  const h = highlight(variant)
  switch (state) {
    case 'Hover':
      // The fill alone: a pointer over a row never draws the ring.
      return { fill: h.fill }
    case 'Focused':
      return metrics?.edge
        ? { fill: h.fill, stroke: h.focus, halo: h.ring }
        : { fill: h.fill, focus: h.focus, ring: h.ring }
    case 'Selected':
      return { fill: c('surface.selected') }
    default:
      return { fill: NONE }
  }
}

/** The ink of a row: the label and the leading glyph take the variant's, the rest the quiet text. */
export function listItemInk(variant: string, disabled: boolean): { label: string; quiet: string } {
  const label = disabled ? c('content.disabled') : variant === 'destructive' ? c('status.critical.content') : c('content.primary')
  return { label, quiet: disabled ? c('content.disabled') : c('content.secondary') }
}

/**
 * The slots of one row: `root`, the leading icon slot (`iconSlot`, `icon` by default),
 * `label`, `description`, `trailing`, `indicator`. A recipe merges them with the slots
 * only it has (a Dropdown's media, control, trailing icon).
 */
export function listItemRecipe(
  size: string,
  state: string,
  variant: string = 'default',
  opts: { metrics?: Record<string, ListItemMetrics>; iconSlot?: string } = {},
): SlotMap {
  const metrics = (opts.metrics ?? LIST_ITEM_METRICS)[size]
  const iconSlot = opts.iconSlot ?? 'icon'
  const edge = state === 'Focused' && metrics.edge
  const disabled = state === 'Disabled'
  const ink = listItemInk(variant, disabled)

  const root: SlotProps = {
    minHeight: metrics.minHeight, radius: metrics.radius ?? 'radius.control', gap: metrics.gap,
    paddingX: edge ? `${metrics.paddingX}+${metrics.edge}` : metrics.paddingX,
    paddingY: edge ? `${metrics.paddingY}+${metrics.edge}` : metrics.paddingY,
    ...listItemRootPaint(state, variant, metrics),
  }
  if (metrics.edge) root.strokeWidth = edge ? metrics.edge : 'stroke.none'

  return {
    root,
    [iconSlot]: { text: ink.label, width: metrics.icon, height: metrics.icon },
    label: { text: ink.label, font: metrics.label },
    description: { text: ink.quiet, font: 'type.caption' },
    trailing: { text: ink.quiet, font: 'type.caption' },
    indicator: { text: c('content.accent'), width: metrics.icon, height: metrics.icon },
    // The Default row also takes the fill while it is the highlighted one: a live
    // menu / listbox marks it, and no ring comes with it.
    ...(state === 'Default' ? { 'root[data-highlighted]': listItemHighlightFill(variant) } : {}),
  }
}
