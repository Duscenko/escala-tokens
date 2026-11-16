/**
 * `groupLabelRecipe`: the heading over a group of rows — DropdownMenuLabel,
 * ComboboxGroupLabel and SidebarGroupLabel. Refactor B2.
 *
 * One shape: a 24px row (`size.xs`) in `type.caption`, `content.secondary`,
 * `spacing.gap-tight` above and below, and the same side inset as the rows it
 * heads (`spacing.gap-control`; `spacing.inset-control` at `lg`, as the rows).
 */
import { c, type SlotProps } from './helpers.js'

export const GROUP_LABEL_SIZES = ['sm', 'default', 'lg'] as const

export function groupLabelRecipe(size: string): SlotProps {
  return {
    minHeight: 'size.xs',
    paddingX: size === 'lg' ? 'spacing.inset-control' : 'spacing.gap-control',
    paddingY: 'spacing.gap-tight',
    font: 'type.caption',
    text: c('content.secondary'),
  }
}
