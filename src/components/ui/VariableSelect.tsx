import type { ReactNode } from 'react'
import { VariablesIcon } from '../configurator/VariableCollectionRail'

/**
 * The dropdown for a SEMANTIC dimension token — a Scale step picking a Dimension
 * primitive, a role picking a step. A native `<select>` (keyboard, screen reader
 * and type-to-jump stay free) with the app's variable mark leading and an
 * explicit chevron.
 *
 * Why not the bare native control: its arrow sits on the field's own padding,
 * `px-1.5` here (6.75px at the 18px root), i.e. against the border. Turning the
 * native arrow off (`appearance-none`) and drawing the chevron lets it sit at
 * `right-2.5`, mirroring the icon's `left-2.5`. Icon and chevron are
 * `pointer-events-none`, so a click on either still opens the select.
 *
 * `VariablesIcon` is the same mark Color semantics rows and the workspace tab
 * use for a variable layer; the chevron is `RailSelect`'s glyph.
 */
export default function VariableSelect({
  value,
  onChange,
  ariaLabel,
  children,
  className = '',
}: {
  value: string
  onChange: (value: string) => void
  ariaLabel: string
  /** The `<option>`s. */
  children: ReactNode
  className?: string
}) {
  return (
    <div className="relative w-full min-w-0">
      <span aria-hidden className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-faint">
        <VariablesIcon size={12} />
      </span>
      <select
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full min-w-0 h-7 pl-7 pr-7 appearance-none rounded-md border border-line bg-app text-caption font-mono text-fg-muted text-ellipsis cursor-pointer hover:border-line-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-fg ${className}`}
      >
        {children}
      </select>
      <svg
        width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
        strokeLinecap="round" strokeLinejoin="round" aria-hidden
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-fg-faint"
      >
        <path d="M6 9l6 6 6-6" />
      </svg>
    </div>
  )
}
