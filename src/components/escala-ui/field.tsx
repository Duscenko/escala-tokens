// Skeleton: shadcn/ui `bases/radix/ui/field.tsx` (MIT, see LICENSE-shadcn.md):
// FieldSet · FieldLegend · FieldGroup · Field (`orientation` vertical |
// horizontal | responsive) · FieldContent · FieldLabel · FieldTitle ·
// FieldDescription · FieldSeparator · FieldError. Appearance: recipe (Field).
import * as React from 'react'
import { cn } from '../../lib/utils'
import { Label } from './label'

export const FIELD_ORIENTATIONS = ['vertical', 'horizontal', 'responsive'] as const
export type FieldOrientation = (typeof FIELD_ORIENTATIONS)[number]

const ORIENTATION: Record<FieldOrientation, string> = {
  vertical: 'flex-col *:w-full [&>.sr-only]:w-auto',
  horizontal: 'flex-row items-center has-[>[data-slot=field-content]]:items-start *:data-[slot=field-label]:flex-auto',
  responsive: 'flex-col *:w-full @md/field-group:flex-row @md/field-group:items-center @md/field-group:*:w-auto [&>.sr-only]:w-auto',
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

function Field({ className, orientation = 'vertical', ...props }: React.ComponentProps<'div'> & { orientation?: FieldOrientation }) {
  return (
    <div
      role="group"
      data-slot="field"
      data-escala="Field"
      data-orientation={orientation}
      className={cn('group/field flex w-full', ORIENTATION[orientation], className)}
      {...props}
    />
  )
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
