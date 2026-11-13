// Escala component: Field — the Figma `Field` set (design-plans/field-contract.md):
// a label row (label · required `*` · trailing link), ONE form control, and a
// description or an error. `size` default · sm · lg is the control's Size (and the
// trailing link's: xs, sm at lg); `state` Default · Invalid · Disabled reaches the
// control (aria-invalid / disabled) and paints the texts. Field never draws a
// control: `children` is the Input (or Textarea, Combobox, NumberInput…), wired by
// id, aria-describedby, aria-invalid and disabled. Colour and type: the Field recipe.
//
// MIGRATION ONLY — shadcn's skeleton parts below the Figma Field (FieldSet ·
// FieldLegend · FieldGroup · FieldContent · FieldLabel · FieldTitle ·
// FieldDescription · FieldSeparator · FieldError, and Field without `label` +
// `orientation`) still lay out the checkbox / switch rows that have not been
// rebuilt from their own Figma sets yet (CheckboxItem, SwitchGroup…). Not in the
// catalogue's axes.
import * as React from 'react'
import { cn } from '../../lib/utils'
import { Label } from './label'

export const FIELD_SIZES = ['default', 'sm', 'lg'] as const
export const FIELD_STATES = ['Default', 'Invalid', 'Disabled'] as const
export type FieldSize = (typeof FIELD_SIZES)[number]
export type FieldState = (typeof FIELD_STATES)[number]

/** MIGRATION ONLY: shadcn's layouts, for the legacy composition. */
export const FIELD_ORIENTATIONS = ['vertical', 'horizontal', 'responsive'] as const
export type FieldOrientation = (typeof FIELD_ORIENTATIONS)[number]

const ORIENTATION: Record<FieldOrientation, string> = {
  vertical: 'flex-col *:w-full [&>.sr-only]:w-auto',
  horizontal: 'flex-row items-center has-[>[data-slot=field-content]]:items-start *:data-[slot=field-label]:flex-auto',
  responsive: 'flex-col *:w-full @md/field-group:flex-row @md/field-group:items-center @md/field-group:*:w-auto [&>.sr-only]:w-auto',
}

/** The trailing TextLink's Size per Field Size (the file: xs, sm at lg). */
const TRAILING_SIZE: Record<FieldSize, 'xs' | 'sm'> = { sm: 'xs', default: 'xs', lg: 'sm' }

export interface FieldProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  /** Figma Label — the control's accessible name. Without it, Field is the legacy layout. */
  label?: React.ReactNode
  /** Figma RequiredVisible: the `*` after the label. */
  required?: boolean
  /** Figma TrailingVisible: a link at the end of the label row (a TextLink). */
  trailing?: React.ReactNode
  /** Figma DescriptionVisible + Description. */
  description?: React.ReactNode
  /** Figma Error: shown with state="Invalid". */
  error?: React.ReactNode
  size?: FieldSize
  state?: FieldState
  /** MIGRATION ONLY — the legacy layout's direction. */
  orientation?: FieldOrientation
  children?: React.ReactNode
}

function Field({
  label, required = false, trailing, description, error, size = 'default', state = 'Default',
  orientation = 'vertical', className, id, children, ...props
}: FieldProps) {
  const auto = React.useId()
  if (label === undefined) {
    return (
      <div
        role="group"
        data-slot="field"
        data-escala="Field"
        data-orientation={orientation}
        className={cn('group/field flex w-full', ORIENTATION[orientation], className)}
        id={id}
        {...props}
      >
        {children}
      </div>
    )
  }
  const disabled = state === 'Disabled'
  const invalid = state === 'Invalid'
  const control = React.Children.toArray(children).find(React.isValidElement) as React.ReactElement<Record<string, unknown>> | undefined
  const controlId = (control?.props.id as string | undefined) ?? `${auto}-control`
  const descId = description != null ? `${auto}-description` : undefined
  const errorId = invalid && error != null ? `${auto}-error` : undefined
  const describedBy = [control?.props['aria-describedby'] as string | undefined, descId, errorId].filter(Boolean).join(' ') || undefined
  const wired = control
    ? React.cloneElement(control, {
        id: controlId,
        'aria-describedby': describedBy,
        ...(required ? { 'aria-required': true } : {}),
        ...(invalid ? { 'aria-invalid': true } : {}),
        ...(disabled ? { disabled: true } : {}),
        ...(control.props.size === undefined ? { size } : {}),
      })
    : null
  const link = React.isValidElement<Record<string, unknown>>(trailing)
    ? React.cloneElement(trailing, {
        ...(trailing.props.size === undefined ? { size: TRAILING_SIZE[size] } : {}),
        ...(disabled ? { disabled: true } : {}),
      })
    : trailing
  return (
    <div
      role="group"
      data-slot="field"
      data-escala="Field"
      data-size={size}
      data-force-state={state !== 'Default' ? state : undefined}
      aria-disabled={disabled || undefined}
      className={cn('flex w-full flex-col', className)}
      id={id}
      {...props}
    >
      <div data-part="Field.labelRow" className="flex w-full items-center">
        <label data-part="Field.label" htmlFor={controlId}>{label}</label>
        {required ? <span data-part="Field.required" aria-hidden>*</span> : null}
        {trailing != null ? <span className="ml-auto inline-flex">{link}</span> : null}
      </div>
      {wired}
      {description != null ? <p data-part="Field.description" id={descId} className="m-0">{description}</p> : null}
      {errorId ? <p data-part="Field.error" id={errorId} className="m-0">{error}</p> : null}
    </div>
  )
}

function FieldSet({ className, ...props }: React.ComponentProps<'fieldset'>) {
  return <fieldset data-slot="field-set" data-escala="Field" data-part="Field.set" className={cn('m-0 flex min-w-0 flex-col border-0 p-0', className)} {...props} />
}

function FieldLegend({ className, variant = 'legend', ...props }: React.ComponentProps<'legend'> & { variant?: 'legend' | 'label' }) {
  return <legend data-slot="field-legend" data-part="Field.legend" data-variant={variant} className={cn('p-0', className)} {...props} />
}

function FieldGroup({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="field-group" data-part="Field.group" className={cn('group/field-group @container/field-group flex w-full flex-col', className)} {...props} />
}

function FieldContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="field-content" data-part="Field.content" className={cn('group/field-content flex flex-1 flex-col', className)} {...props} />
}

function FieldLabel({ className, ...props }: React.ComponentProps<typeof Label>) {
  return <Label data-slot="field-label" data-part="Field.label" className={cn('group/field-label peer/field-label flex w-fit', className)} {...props} />
}

function FieldTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="field-label" data-part="Field.label" className={cn('flex w-fit items-center', className)} {...props} />
}

function FieldDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return <p data-slot="field-description" data-part="Field.description" className={cn('m-0 text-left [&>a]:underline [&>a]:underline-offset-4', className)} {...props} />
}

function FieldSeparator({ children, className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div data-slot="field-separator" data-part="Field.separator" data-content={!!children} className={cn('relative flex items-center', className)} {...props}>
      {children != null && <span data-slot="field-separator-content" className="relative mx-auto block w-fit">{children}</span>}
    </div>
  )
}

function FieldError({
  className, children, errors, ...props
}: React.ComponentProps<'div'> & { errors?: Array<{ message?: string } | undefined> }) {
  const messages = [...new Set((errors ?? []).map((e) => e?.message).filter((m): m is string => !!m))]
  const content = children ?? (messages.length === 1 ? messages[0] : messages.length
    ? <ul className="ml-4 flex list-disc flex-col gap-1">{messages.map((m) => <li key={m}>{m}</li>)}</ul>
    : null)
  if (!content) return null
  return <div role="alert" data-slot="field-error" data-part="Field.error" className={className} {...props}>{content}</div>
}

export {
  Field, FieldContent, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldLegend,
  FieldSeparator, FieldSet, FieldTitle,
}
