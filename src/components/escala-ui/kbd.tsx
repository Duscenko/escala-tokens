// Escala component: Kbd — the Figma set of the same name (design-plans/kbd-contract.md, 1091:6), 1:1: one key
// cap per <kbd> (never a whole shortcut string), Size xs · sm · default following the icon of the control it
// sits in. KbdGroup only spaces several keys. Appearance: recipe (Kbd).
import * as React from 'react'
import { cn } from '../../lib/utils'

export const KBD_SIZES = ['xs', 'sm', 'default'] as const
export type KbdSize = (typeof KBD_SIZES)[number]

export interface KbdProps extends React.ComponentProps<'kbd'> {
  /** Figma Size: 16 · 20 · 24 high. */
  size?: KbdSize
}

function Kbd({ size = 'default', className, ...props }: KbdProps) {
  return (
    <kbd
      data-slot="kbd"
      data-escala="Kbd"
      data-size={size}
      className={cn('pointer-events-none inline-flex w-fit shrink-0 select-none items-center justify-center', className)}
      {...props}
    />
  )
}

/** Several keys, one shortcut (`⌘` `K`). Spacing only: each key paints itself. */
function KbdGroup({ className, ...props }: React.ComponentProps<'kbd'>) {
  return <kbd data-slot="kbd-group" className={cn('inline-flex items-center gap-1', className)} {...props} />
}

export { Kbd, KbdGroup }
