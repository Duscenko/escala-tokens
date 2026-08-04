// The 198px rail cell's dropdown — the control every foundation's left cell
// holds (Gradients' type · Radius' preset · Spacing's base unit), so the four
// railed sections share one silhouette instead of each hand-rolling a trigger.
//
// It exists because that shape was written three times in a row: same h-9
// `rounded-[13px] border-line-strong bg-surface` trigger, same chevron, same
// outside-click/Escape listbox. Matching ColorPrimitives' hex field, which is
// the original of the shape.

import { useEffect, useRef, useState, type ReactNode } from 'react'

export interface RailOption<T> {
  value: T
  label: string
  /** Tooltip — the "why you'd pick this" line, when there is one. */
  description?: string
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
        className="w-full h-9 pl-2.5 pr-1.5 rounded-[13px] border border-line-strong bg-surface flex items-center gap-2 text-left hover:border-fg-faint transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg"
      >
        {icon && <span className="flex-shrink-0 text-fg-muted">{icon}</span>}
        <span className="flex-1 min-w-0 truncate text-[13px] font-medium text-fg">
          {selected?.label ?? fallbackLabel}
        </span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={`flex-shrink-0 text-fg-faint transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div role="listbox" className="absolute left-0 top-full mt-2 z-30 w-full min-w-[11rem] rounded-xl border border-line bg-app shadow-xl p-1 flex flex-col">
          {options.map((o) => (
            <button
              key={String(o.value)}
              type="button"
              role="option"
              aria-selected={o.value === value}
              title={o.description}
              onClick={() => { onChange(o.value); setOpen(false) }}
              className={`px-2.5 py-1.5 rounded-lg text-left text-[13px] transition-colors ${
                o.value === value ? 'bg-elevated text-fg font-semibold' : 'text-fg-muted hover:text-fg hover:bg-elevated/60'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
