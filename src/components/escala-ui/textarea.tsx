// Skeleton: shadcn/ui `bases/radix/ui/textarea.tsx` (MIT, see LICENSE-shadcn.md),
// composed with a label, hint and counter like Escala's Textarea. Appearance: recipe.
import * as React from 'react'
import { cn } from '../../lib/utils'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      data-part="Textarea.field"
      className={cn('block w-full resize-y outline-none', className)}
      {...props}
    />
  )
}

export interface TextareaFieldProps extends React.ComponentProps<'textarea'> {
  label?: React.ReactNode
  hint?: React.ReactNode
  invalid?: boolean
  forceState?: 'Default' | 'Focused' | 'Error' | 'Disabled'
  /** Shows `n/max` when set. */
  maxLength?: number
  width?: number | string
}

function TextareaField({
  label, hint, invalid, forceState, maxLength, width, className, id, disabled, value, defaultValue, onChange, ...props
}: TextareaFieldProps) {
  const auto = React.useId()
  const fieldId = id ?? auto
  const [inner, setInner] = React.useState(String(defaultValue ?? ''))
  const text = String(value ?? inner)
  const isDisabled = disabled || forceState === 'Disabled'
  const isInvalid = invalid || forceState === 'Error'
  return (
    <div
      data-slot="field"
      data-escala="Textarea"
      data-force-state={forceState && forceState !== 'Default' ? forceState : undefined}
      aria-disabled={isDisabled || undefined}
      aria-invalid={isInvalid || undefined}
      className={cn('flex flex-col', className)}
      style={{ width }}
    >
      {label != null && <label data-part="Textarea.label" htmlFor={fieldId}>{label}</label>}
      <Textarea
        id={fieldId}
        disabled={isDisabled}
        aria-invalid={isInvalid || undefined}
        maxLength={maxLength}
        value={value}
        defaultValue={defaultValue}
        onChange={(e) => { setInner(e.target.value); onChange?.(e) }}
        {...props}
      />
      {(hint != null || maxLength != null) && (
        <div className="flex justify-between">
          <span data-part="Textarea.hint">{hint}</span>
          {maxLength != null && <span data-part="Textarea.count">{text.length}/{maxLength}</span>}
        </div>
      )}
    </div>
  )
}

export { Textarea, TextareaField }
