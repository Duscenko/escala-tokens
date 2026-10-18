// Skeleton: shadcn/ui `bases/radix/ui/label.tsx` (MIT, see LICENSE-shadcn.md) and
// its Field composition (field.tsx). Appearance: recipe.
import * as React from 'react'
import { Label as LabelPrimitive } from 'radix-ui'
import { cn } from '../../lib/utils'

export interface LabelProps extends React.ComponentProps<typeof LabelPrimitive.Root> {
  required?: boolean
}

function Label({ required = false, className, children, ...props }: LabelProps) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      data-escala="Label"
      data-required={required ? 'True' : 'False'}
      className={cn('inline-flex items-center gap-1 select-none', className)}
      {...props}
    >
      {children}
      {required && <span data-part="Label.asterisk" aria-hidden>*</span>}
    </LabelPrimitive.Root>
  )
}

export interface FieldProps extends React.ComponentProps<'div'> {
  label?: React.ReactNode
  required?: boolean
  description?: React.ReactNode
  error?: React.ReactNode
  htmlFor?: string
}

/** A control with its label, description and error — shadcn's Field. */
function Field({ label, required, description, error, htmlFor, className, children, ...props }: FieldProps) {
  const id = React.useId()
  const controlId = htmlFor ?? id
  return (
    <div data-slot="field" data-escala="Field" className={cn('flex flex-col', className)} {...props}>
      {label != null && (
        <label data-part="Field.label" htmlFor={controlId} className="inline-flex items-center gap-1">
          {label}
          {required && <span data-part="Field.asterisk" aria-hidden>*</span>}
        </label>
      )}
      {React.isValidElement(children) && htmlFor == null
        ? React.cloneElement(children as React.ReactElement<{ id?: string }>, { id: controlId })
        : children}
      {description != null && !error && <span data-part="Field.description">{description}</span>}
      {error != null && <span data-part="Field.error" role="alert">{error}</span>}
    </div>
  )
}

export { Label, Field }
