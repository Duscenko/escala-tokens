// The rail's dropdown — the control a foundation puts in its Groups section
// (Gradients' type · Radius' preset · Shadow's preset · Spacing's base unit),
// so the railed sections share one silhouette instead of each hand-rolling a
// trigger. Wrap it in `RailControl` (VariableCollectionRail) rather than
// hand-inserting a caption: that is what lands it on the group rows' own
// footprint.
//
// It exists because that shape was written three times in a row. Its trigger
// and listbox are THE workspace dropdown (`SELECT_*` in themeWorkspaceLayout) —
// the same shell Theme preview's menus and the colour selects use, so a preset
// select and a font menu in one card read as one kind of control.

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { SELECT_LIST, SELECT_OPTION, SELECT_OPTION_OFF, SELECT_OPTION_ON, SELECT_TRIGGER } from '../configurator/themeWorkspaceLayout'

export interface RailOption<T> {
  value: T
  label: string
  /** Tooltip — the "why you'd pick this" line, when there is one. */
  description?: string
  /** A quiet readout on the option's right edge — the value it applies
   *  (Radius' preset shows its corner and `lg` px), so picking is not blind. */
  trailing?: ReactNode
}

export default function RailSelect<T extends string | number>({
  value,
  options,
  onChange,
  ariaLabel,
  /** Shown when `value` matches no option — e.g. a hand-edited ramp. Without
   *  it a non-matching value renders an empty trigger, which reads as "nothing
   *  applied yet" rather than "this is yours". */
  fallbackLabel = 'Custom',
  icon,
}: {
  value: T | null
  options: RailOption<T>[]
  onChange: (value: T) => void
  ariaLabel: string
  fallbackLabel?: string
  icon?: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const selected = options.find((o) => o.value === value)

  return (
    <div ref={ref} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        className={SELECT_TRIGGER}
      >
        {icon && <span className="flex-shrink-0 text-fg-muted">{icon}</span>}
        <span className="flex-1 min-w-0 truncate text-body text-fg">
          {selected?.label ?? fallbackLabel}
        </span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={`flex-shrink-0 text-fg-faint transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div role="listbox" className={`absolute left-0 top-full mt-1.5 z-30 w-full min-w-[11rem] flex flex-col ${SELECT_LIST}`}>
          {options.map((o) => (
            <button
              key={String(o.value)}
              type="button"
              role="option"
              aria-selected={o.value === value}
              title={o.description}
              onClick={() => { onChange(o.value); setOpen(false) }}
              className={`${SELECT_OPTION} text-body flex items-center gap-2 ${o.value === value ? SELECT_OPTION_ON : SELECT_OPTION_OFF}`}
            >
              <span className="flex-1 min-w-0 truncate">{o.label}</span>
              {o.trailing != null && <span className="flex-shrink-0 flex items-center gap-1.5 text-caption font-normal text-fg-faint tabular-nums">{o.trailing}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
