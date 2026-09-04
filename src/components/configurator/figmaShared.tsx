import { type ReactNode } from 'react'

// ── Shared between FigmaSyncView and FigmaDownloadView ──────────────────────

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

/** Install affordance inside the Sync hero — one Figma mark on the page, not a
 *  second card that reads as a duplicate screen.
 *
 *  It rides on the hero's TITLE row (right-aligned), not on a full-width row
 *  of its own under a `border-t`: the hero's own subject is the file below it,
 *  and a banded row spent the same vertical weight on "here is a download
 *  link" as on the identity it sits under. Named "Escala DS Plugin" rather
 *  than "Plugin" because on a right-aligned cluster there's no heading above
 *  it to say whose plugin it is. The update case swaps both the badge AND the
 *  button label, so the row still states it without a second line of copy. */
export function PluginInstallPromo({
  version,
  updateAvailable,
  onOpenInstall,
}: {
  version: string
  updateAvailable: boolean
  onOpenInstall: () => void
}) {
  return (
    <div
      className="flex flex-shrink-0 items-center gap-2.5"
      title={updateAvailable ? `v${version} — download and re-import in Figma desktop.` : undefined}
    >
      <span className="flex items-center gap-2">
        <span className="text-caption font-semibold text-fg">Escala DS Plugin</span>
        {/* At rest the version is plain quiet TEXT, not a bordered pill — the
            resting version isn't a state anyone has to act on, and a pill for
            it put a second outlined box beside the Download button for no
            reason. Only the update case earns a badge, because that one IS a
            state (and it's the accent, so it reads at a glance). */}
        {updateAvailable ? (
          <span className="inline-flex items-center rounded-full bg-accent-ui/10 px-2 py-0.5 text-micro font-semibold uppercase tracking-wide text-accent-ui">
            Update available
          </span>
        ) : (
          <span className="text-micro font-medium text-fg-faint">v{version}</span>
        )}
      </span>
      <button
        type="button"
        onClick={onOpenInstall}
        aria-label={updateAvailable ? 'Download plugin update and open install steps' : 'Download plugin and open install steps'}
        className="inline-flex h-8 flex-shrink-0 items-center gap-1.5 rounded-lg bg-fg px-3 text-caption font-semibold text-app shadow-sm transition-[opacity,transform] hover:opacity-90 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
      >
        <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M7 1.5v8M3.5 6.5 7 10l3.5-3.5" />
          <path d="M1.5 10.5v1.5a.5.5 0 0 0 .5.5h10a.5.5 0 0 0 .5-.5v-1.5" />
        </svg>
        {updateAvailable ? 'Download update' : 'Download'}
      </button>
    </div>
  )
}
