// Escala component: Separator — the Figma set of the same name (design-plans/separator-contract.md; 402:9063), 1:1.
// A thin rule that divides content, horizontal or vertical, solid or dashed (4 · 4), with an optional label at its start, centre or end.
// Decorative by default; `decorative={false}` exposes `role="separator"` with `aria-orientation`. Tone picks the line colour.
// Appearance: recipe Separator (lib/componentRecipes.ts).
import * as React from 'react'
import { Separator as SeparatorPrimitive } from 'radix-ui'
import { cn } from '../../lib/utils'

export const SEPARATOR_ALIGNS = ['none', 'start', 'center', 'end'] as const
export type SeparatorAlign = (typeof SEPARATOR_ALIGNS)[number]
export const SEPARATOR_ORIENTATIONS = ['horizontal', 'vertical'] as const
export type SeparatorOrientation = (typeof SEPARATOR_ORIENTATIONS)[number]
export const SEPARATOR_TONES = ['default', 'subtle', 'strong'] as const
export type SeparatorTone = (typeof SEPARATOR_TONES)[number]
export const SEPARATOR_VARIANTS = ['dashed', 'default'] as const
export type SeparatorVariant = (typeof SEPARATOR_VARIANTS)[number]

export interface SeparatorProps extends Omit<React.ComponentProps<typeof SeparatorPrimitive.Root>, 'children'> {
  /** Figma Align: where the label sits. none (default) draws the bare line; with a label and no Align it is `center`. */
  align?: SeparatorAlign
  orientation?: SeparatorOrientation
  /** Figma Tone: default · subtle · strong. */
  tone?: SeparatorTone
  /** Figma Variant: default (solid) · dashed. */
  variant?: SeparatorVariant
  /** Figma Label (the file's «OR»); shown when Align is not none. */
  children?: React.ReactNode
}

function Line({ horizontal, dashed }: { horizontal: boolean; dashed: boolean }) {
  return (
    <span
      aria-hidden
      data-part="Separator.line"
      className={cn(
        'min-h-0 min-w-0',
        horizontal ? 'w-full flex-1' : 'h-full flex-1',
        dashed
          ? horizontal
            ? 'bg-[repeating-linear-gradient(90deg,var(--escala-paint)_0_4px,transparent_4px_8px)]'
            : 'bg-[repeating-linear-gradient(180deg,var(--escala-paint)_0_4px,transparent_4px_8px)]'
          : 'bg-[var(--escala-paint)]',
      )}
      style={{ flexBasis: 0 }}
    />
  )
}

function Separator({ align, orientation = 'horizontal', tone = 'default', variant = 'default', decorative = true, children, className, ...props }: SeparatorProps) {
  const horizontal = orientation === 'horizontal'
  const dashed = variant === 'dashed'
  const placement: SeparatorAlign = align ?? (children != null ? 'center' : 'none')
  const labelled = placement !== 'none' && children != null
  const line = <Line horizontal={horizontal} dashed={dashed} />
  return (
    <SeparatorPrimitive.Root
      data-slot="separator"
      data-escala="Separator"
      data-align={placement}
      data-orientation={orientation}
      data-tone={tone}
      data-variant={variant}
      decorative={decorative}
      orientation={orientation}
      className={cn(
        'flex shrink-0 items-center',
        horizontal ? 'w-full flex-row' : 'flex-col self-stretch',
        className,
      )}
      {...props}
    >
      {labelled ? (
        <>
          {(placement === 'center' || placement === 'end') && line}
          <span data-part="Separator.label" className="shrink-0">{children}</span>
          {(placement === 'center' || placement === 'start') && line}
        </>
      ) : line}
    </SeparatorPrimitive.Root>
  )
}

export { Separator }
