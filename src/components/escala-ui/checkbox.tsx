// Skeleton: shadcn/ui `bases/radix/ui/checkbox.tsx` (MIT, see LICENSE-shadcn.md):
// the bare control (Root + Indicator), no label — label it with `Label` or a
// horizontal `Field`, as in shadcn. Appearance: recipe (Checkbox), which reads
// `data-checked` (True | False) and the State axis.
import * as React from 'react'
import { Checkbox as CheckboxPrimitive } from 'radix-ui'
import { cn } from '../../lib/utils'

export interface CheckboxProps extends React.ComponentProps<typeof CheckboxPrimitive.Root> {
  /** Escala: pin a state without a pointer (docs playground, Figma parity). */
  forceState?: 'Default' | 'Hover' | 'Focused' | 'Disabled'
  /** Escala: the check glyph (shadcn's is lucide's CheckIcon). */
  icon?: React.ReactNode
}

function Checkbox({
  className, forceState, icon, checked, defaultChecked, disabled, onCheckedChange, ...props
}: CheckboxProps) {
  const [inner, setInner] = React.useState<boolean | 'indeterminate'>(defaultChecked ?? false)
  const on = checked ?? inner
  const isDisabled = disabled || forceState === 'Disabled'
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      data-escala="Checkbox"
      data-checked={on ? 'True' : 'False'}
      data-force-state={forceState && forceState !== 'Default' ? forceState : undefined}
      aria-disabled={isDisabled || undefined}
      checked={checked}
      defaultChecked={defaultChecked}
      disabled={isDisabled}
      onCheckedChange={(v) => { setInner(v); onCheckedChange?.(v) }}
      className={cn(
        'peer relative inline-flex shrink-0 items-center justify-center p-0 outline-none',
        'transition-[background-color,border-color,box-shadow] duration-150 disabled:cursor-not-allowed',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator data-slot="checkbox-indicator" data-part="Checkbox.indicator" className="grid place-content-center text-current transition-none">
        {icon ?? (
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M20 6 9 17l-5-5" />
          </svg>
        )}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
