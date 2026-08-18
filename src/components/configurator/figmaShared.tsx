import { type ReactNode } from 'react'

// ── Shared between FigmaSyncView and FigmaDownloadView ──────────────────────
// The two used to be one linear page (`FigmaConnectView`, retired — see
// CLAUDE.md's Navigation model note on why it split): download-and-install is
// a one-time procedure, checking sync status is a recurring one, and welding
// them into one screen meant a returning user re-scrolled past install steps
// they finished weeks ago just to reach the sync URL. `Step`/`FigmaLogo` are
// the two bits of chrome both screens still need.

// ─── Figma brand mark (full color) ────────────────────────────────────────────
export function FigmaLogo({ size = 40 }: { size?: number }) {
  return (
    <svg width={(size * 38) / 57} height={size} viewBox="0 0 38 57" fill="none" aria-hidden>
      <path d="M9.5 57C14.7467 57 19 52.7467 19 47.5V38H9.5C4.25329 38 0 42.2533 0 47.5C0 52.7467 4.25329 57 9.5 57Z" fill="#0ACF83" />
      <path d="M0 28.5C0 23.2533 4.25329 19 9.5 19H19V38H9.5C4.25329 38 0 33.7467 0 28.5Z" fill="#A259FF" />
      <path d="M0 9.5C0 4.25329 4.25329 0 9.5 0H19V19H9.5C4.25329 19 0 14.7467 0 9.5Z" fill="#F24E1E" />
      <path d="M19 0H28.5C33.7467 0 38 4.25329 38 9.5C38 14.7467 33.7467 19 28.5 19H19V0Z" fill="#FF7262" />
      <path d="M38 28.5C38 33.7467 33.7467 38 28.5 38C23.2533 38 19 33.7467 19 28.5C19 23.2533 23.2533 19 28.5 19C33.7467 19 38 23.2533 38 28.5Z" fill="#1ABCFE" />
    </svg>
  )
}

// ─── Numbered step card — for a genuine multi-step PROCEDURE only. Sync isn't
// one any more (it's a status screen), so it doesn't use this. ────────────────
export function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <div className="flex gap-3 rounded-xl border border-line bg-surface/50 p-5">
      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-fg/10 text-fg text-xs font-semibold flex items-center justify-center">
        {n}
      </span>
      <div className="flex flex-col gap-2 min-w-0 flex-1">
        <p className="text-sm font-semibold text-fg">{title}</p>
        {children}
      </div>
    </div>
  )
}

// ─── Back-to-editor affordance both screens use ───────────────────────────────
export function BackToEditor({ onClose }: { onClose: () => void }) {
  return (
    <button
      onClick={onClose}
      className="self-start flex items-center gap-1.5 text-xs text-fg-faint hover:text-fg transition-colors"
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7.5 2.5 4 6l3.5 3.5" />
      </svg>
      Back to editor
    </button>
  )
}

// "just now" / "3m ago" / "2h ago" — compact last-published label.
export function relativeTime(iso: string | null): string {
  if (!iso) return 'never'
  const diff = Date.now() - new Date(iso).getTime()
  if (diff < 60_000) return 'just now'
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}
