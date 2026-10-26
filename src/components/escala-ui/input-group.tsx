// Skeleton: shadcn/ui `bases/radix/ui/input-group.tsx` (MIT, see LICENSE-shadcn.md):
// InputGroup, InputGroupAddon (`align`), InputGroupText, InputGroupInput,
// InputGroupButton. Appearance: recipe. Icons live in an Addon, as in shadcn.
import * as React from 'react'
import { cn } from '../../lib/utils'

export type InputGroupState = 'Default' | 'Hover' | 'Focused' | 'Error' | 'Disabled'

function InputGroup({
  className, forceState, ...props
}: React.ComponentProps<'div'> & {
  /** Escala: pin a state without a pointer (docs playground, Figma parity). */
  forceState?: InputGroupState
}) {
  return (
    <div
      role="group"
      data-slot="input-group"
      data-escala="InputGroup"
      data-force-state={forceState && forceState !== 'Default' ? forceState : undefined}
      // shadcn reads `data-disabled` on the group; the recipe reads aria-disabled.
      data-disabled={forceState === 'Disabled' || undefined}
      aria-disabled={forceState === 'Disabled' || undefined}
      className={cn(
        'flex min-w-0 items-stretch overflow-hidden',
        'has-[[data-slot=input-group-control]:disabled]:cursor-not-allowed',
        // shadcn: the addon carries the inset toward the edge, the input keeps
        // only the gap toward the addon. `!` beats the unlayered recipe sheet.
        'has-[>[data-align=inline-start]]:[&>input]:pl-[var(--spacing-gap-control)]!',
        'has-[>[data-align=inline-end]]:[&>input]:pr-[var(--spacing-gap-control)]!',
        className,
      )}
      {...props}
    />
  )
}

export type InputGroupAddonAlign = 'inline-start' | 'inline-end' | 'block-start' | 'block-end'

function InputGroupAddon({
  className, align = 'inline-start', onClick, ...props
}: React.ComponentProps<'div'> & { align?: InputGroupAddonAlign }) {
  return (
    <div
      role="group"
      data-slot="input-group-addon"
      data-part="InputGroup.addon"
      data-align={align}
      className={cn(
        'inline-flex cursor-text select-none items-center justify-center whitespace-nowrap',
        // shadcn dims the addon with the group; here it takes the disabled ink.
        'in-[[data-escala=InputGroup]:has(:disabled)]:text-[var(--color-content-disabled)]!',
        'in-[[data-escala=InputGroup][aria-disabled=true]]:text-[var(--color-content-disabled)]!',
        align === 'inline-start' && 'order-first pr-0!',
        align === 'inline-end' && 'order-last pl-0!',
        className,
      )}
      onClick={(e) => {
        onClick?.(e)
        if ((e.target as HTMLElement).closest('button')) return
        e.currentTarget.parentElement?.querySelector('input')?.focus()
      }}
      {...props}
    />
  )
}

function InputGroupText({ className, ...props }: React.ComponentProps<'span'>) {
  return <span className={cn('inline-flex items-center', className)} {...props} />
}

function InputGroupInput({ className, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      data-slot="input-group-control"
      data-part="InputGroup.input"
      className={cn('min-w-0 flex-1 border-0 bg-transparent outline-none disabled:cursor-not-allowed', className)}
      {...props}
    />
  )
}

function InputGroupButton({ className, type = 'button', ...props }: React.ComponentProps<'button'>) {
  return (
    <button
      type={type}
      data-slot="input-group-button"
      data-part="InputGroup.button"
      className={cn('inline-flex cursor-pointer items-center border-0 bg-transparent outline-none', className)}
      {...props}
    />
  )
}

function InputGroupSeparator({ className, ...props }: React.ComponentProps<'span'>) {
  return <span role="separator" aria-orientation="vertical" data-part="InputGroup.separator" className={cn('self-stretch', className)} {...props} />
}

export { InputGroup, InputGroupAddon, InputGroupText, InputGroupInput, InputGroupButton, InputGroupSeparator }
