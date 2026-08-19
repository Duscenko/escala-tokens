import { type ComponentType, type Ref } from 'react'

// ── The header action pill ───────────────────────────────────────────────────
// Every action that lives in a section header uses THIS — the Generator's
// New · Import JSON · Share · Kits row and Variables' Export alike — so an
// action reads the same wherever it sits. `ghost` drops the surface for
// secondary/destructive entries (Reset).
export default function HeaderPill({
  Icon, label, onClick, ghost, danger, buttonRef, title, ...aria
}: {
  Icon: ComponentType
  label: string
  onClick: () => void
  ghost?: boolean
  /** Armed state for a destructive two-click action (Reset). Recolors in
   *  place — the pill keeps its geometry so the row doesn't reflow when the
   *  label changes to "Click to confirm". */
  danger?: boolean
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
      // `rounded-[10px]`, not `rounded-full`: the app's chrome buttons use a
      // proportional squircle (~size/3), not a pill — same ratio as the 9-size
      // icon buttons' `rounded-[13px]` (ColorPrimitives' gear, ThemeToggle) and
      // the 40.5px foundation-rail buttons' `rounded-[13.5px]`, scaled to this
      // pill's own h-7 (28px). A full-radius pill next to those squircle
      // buttons read as two different corner languages in the same header row.
      className={`flex-shrink-0 flex items-center gap-1.5 h-7 px-2.5 rounded-[10px] text-[12px] font-medium whitespace-nowrap transition-colors ${
        danger
          ? 'bg-red-500/10 border border-red-500/40 text-red-600 dark:text-red-400'
          : ghost
            ? 'text-fg hover:bg-elevated'
            : 'text-fg bg-surface border border-line hover:border-line-strong hover:bg-elevated/60'
      }`}
    >
      <span className={`flex-shrink-0 ${danger ? '' : 'text-fg-muted'}`}><Icon /></span>
      {label}
    </button>
  )
}
