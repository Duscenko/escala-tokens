// Skeleton: shadcn/ui `bases/radix/ui/native-select.tsx` (MIT, see LICENSE-shadcn.md):
// a styled <select> with a chevron, `size` default | sm (`data-size`). The
// wrapper carries the recipe root so the State axis (hover, focus, disabled)
// reads off it. Appearance: recipe (NativeSelect).
import * as React from 'react'
import { cn } from '../../lib/utils'

export type NativeSelectSize = 'default' | 'sm'

type NativeSelectProps = Omit<React.ComponentProps<'select'>, 'size'> & {
  size?: NativeSelectSize
  /** The chevron. */
  icon?: React.ReactNode
  forceState?: 'Default' | 'Hover' | 'Focused' | 'Disabled'
}

function NativeSelect({ className, size = 'default', icon, forceState, disabled, style, ...props }: NativeSelectProps) {
  const isDisabled = disabled || forceState === 'Disabled'
  return (
    <div
      data-slot="native-select-wrapper"
      data-escala="NativeSelect"
      data-size={size}
      data-force-state={forceState && forceState !== 'Default' ? forceState : undefined}
      aria-disabled={isDisabled || undefined}
      className={cn('relative w-fit', className)}
    >
      <select
        data-slot="native-select"
        data-part="NativeSelect.select"
        data-size={size}
        disabled={disabled}
        // Room for the chevron on the trailing side.
        style={{ paddingInlineEnd: 'calc(var(--spacing-inset-control) + 1.25rem)', ...style }}
        className="w-full min-w-0 cursor-pointer appearance-none outline-none disabled:cursor-not-allowed"
        {...props}
      />
      <span
        aria-hidden
        data-slot="native-select-icon"
        data-part="NativeSelect.icon"
        className="pointer-events-none absolute top-1/2 inline-flex -translate-y-1/2 select-none"
        style={{ insetInlineEnd: 'var(--spacing-inset-control)' }}
      >
        {icon ?? '⌄'}
      </span>
    </div>
  )
}

function NativeSelectOption(props: React.ComponentProps<'option'>) {
  return <option data-slot="native-select-option" {...props} />
}

function NativeSelectOptGroup(props: React.ComponentProps<'optgroup'>) {
  return <optgroup data-slot="native-select-optgroup" {...props} />
}

export { NativeSelect, NativeSelectOptGroup, NativeSelectOption }
