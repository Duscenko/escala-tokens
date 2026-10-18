// Skeleton: shadcn/ui `bases/radix/ui/input.tsx` (MIT, see LICENSE-shadcn.md),
// composed the way shadcn's Field + InputGroup compose it. Appearance:
// lib/componentRecipes.ts → lib/recipeStyles.ts. No colour here.
import * as React from 'react'
import { cn } from '../../lib/utils'

export type InputSize = 'MD' | 'SM' | 'XS'
export type InputState = 'Default' | 'Hover' | 'Focused' | 'Filled' | 'Error' | 'Loading' | 'Disabled'

/** The bare control — shadcn's `Input`. */
function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      data-part="Input.value"
      className={cn(
        'w-full min-w-0 flex-1 border-0 bg-transparent p-0 outline-none [font:inherit] [color:inherit]',
        'disabled:cursor-not-allowed',
        className,
      )}
      {...props}
    />
  )
}

export interface InputFieldProps extends Omit<React.ComponentProps<'input'>, 'size'> {
  label?: React.ReactNode
  hint?: React.ReactNode
  size?: InputSize
  forceState?: InputState
  invalid?: boolean
  leading?: React.ReactNode
  trailing?: React.ReactNode
  /** Rendered inside the field after the control (a prefix, a kbd chip…). */
  addon?: React.ReactNode
  loading?: React.ReactNode
  width?: number | string
}

/** Escala's Input anatomy: label · field (icons + control) · hint. */
function InputField({
  label, hint, size = 'MD', forceState, invalid, leading, trailing, addon, loading,
  width, className, disabled, id, ...props
}: InputFieldProps) {
  const autoId = React.useId()
  const inputId = id ?? autoId
  const hintId = hint ? `${inputId}-hint` : undefined
  const isDisabled = disabled || forceState === 'Disabled'
  const isInvalid = invalid || forceState === 'Error'
  const state = forceState && forceState !== 'Default' ? forceState : undefined
  return (
    <div
      data-slot="field"
      data-escala="Input"
      data-size={size}
      data-force-state={state}
      aria-disabled={isDisabled || undefined}
      aria-invalid={isInvalid || undefined}
      className={cn('flex flex-col', className)}
      style={{ width }}
    >
      {label != null && (
        <label data-part="Input.label" htmlFor={inputId}>{label}</label>
      )}
      <div
        data-slot="input-group"
        data-part="Input.field"
        className="flex items-center transition-[border-color,box-shadow] duration-150"
        style={{ cursor: isDisabled ? 'not-allowed' : 'text' }}
      >
        {leading != null && <span data-part="Input.icon" className="inline-flex">{leading}</span>}
        <Input
          id={inputId}
          disabled={isDisabled}
          aria-invalid={isInvalid || undefined}
          aria-describedby={hintId}
          {...props}
        />
        {addon}
        {trailing != null && <span data-part="Input.icon" className="inline-flex">{trailing}</span>}
        {loading != null && <span data-part="Input.spinner" className="inline-flex">{loading}</span>}
      </div>
      {hint != null && <span data-part="Input.hint" id={hintId}>{hint}</span>}
    </div>
  )
}

export { Input, InputField }
