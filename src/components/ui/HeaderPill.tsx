import { type ComponentType, type Ref } from 'react'

// ── The header action pill ───────────────────────────────────────────────────
// Every action that lives in a section header uses THIS — the Generator's
// New · Import JSON · Share · Kits row and Variables' Export alike — so an
// action reads the same wherever it sits. `ghost` drops the surface for
// secondary/destructive entries (Reset).
export default function HeaderPill({
  Icon, label, onClick, ghost, buttonRef, title, ...aria
}: {
  Icon: ComponentType
  label: string
  onClick: () => void
  ghost?: boolean
  buttonRef?: Ref<HTMLButtonElement>
  title?: string
  'aria-haspopup'?: boolean
  'aria-expanded'?: boolean
}) {
  return (
    <button
      ref={buttonRef}
      onClick={onClick}
      title={title}
      {...aria}
      className={`flex-shrink-0 flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[12px] font-medium text-fg whitespace-nowrap transition-colors ${
        ghost
          ? 'hover:bg-elevated'
          : 'bg-surface border border-line hover:border-line-strong hover:bg-elevated/60'
      }`}
    >
      <span className="text-fg-muted flex-shrink-0"><Icon /></span>
      {label}
    </button>
  )
}
