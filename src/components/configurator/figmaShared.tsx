import { type ReactNode, useCallback, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

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
function InfoIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
      <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.2" />
      <path d="M8 7.1v4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="8" cy="4.9" r=".8" fill="currentColor" />
    </svg>
  )
}

function ClickInfo({ label, children }: { label: string; children: ReactNode }) {
  const tooltipId = useId()
  const anchor = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null)
  const updatePosition = useCallback(() => {
    const rect = anchor.current?.getBoundingClientRect()
    if (!rect) return
    const width = 220
    setPosition({
      left: Math.max(8, Math.min(window.innerWidth - width - 8, rect.left)),
      top: rect.bottom + 6,
    })
  }, [])

  useEffect(() => {
    if (!open) return
    updatePosition()
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (anchor.current?.contains(target) || panel.current?.contains(target)) return
      setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open, updatePosition])

  return (
    <>
      <button
        ref={anchor}
        type="button"
        aria-expanded={open}
        aria-controls={tooltipId}
        aria-label={label}
        onClick={() => setOpen((next) => !next)}
        className="grid h-5 w-5 flex-shrink-0 place-items-center rounded-md text-fg-faint transition-colors hover:bg-fg/8 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg/40"
      >
        <InfoIcon />
      </button>
      {open && position && createPortal(
        <div
          ref={panel}
          id={tooltipId}
          role="tooltip"
          className="fixed z-[70] w-[220px] rounded-lg border border-line-strong bg-app px-3 py-2.5 text-caption leading-relaxed text-fg-muted shadow-lg"
          style={position}
        >
          {children}
        </div>,
        document.body,
      )}
    </>
  )
}

export function PluginInstallPromo({
  version,
  updateAvailable,
  onOpenInstall,
  layout = 'inline',
  info,
}: {
  version: string
  updateAvailable: boolean
  onOpenInstall: () => void
  /** `stacked` fits the integration rail; `inline` stays in wide hero rows. */
  layout?: 'inline' | 'stacked'
  /** Click-info copy for the mark on the name/version row. */
  info?: string
}) {
  const rootClass = layout === 'stacked'
    ? 'mt-3 flex w-full flex-col gap-2.5'
    : 'flex flex-shrink-0 items-center gap-2.5'
  // Stroke, not a filled slab. Sync now is the payoff on this screen; a
  // solid `bg-fg` Download sat at the same weight and stole the eye from
  // it. Border + label use `--fg` so they invert with the chrome page
  // (near-white in dark, near-black in light) instead of a hardcoded white
  // that would vanish on a light rail.
  const buttonClass = layout === 'stacked'
    ? 'inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-fg bg-transparent px-3 text-caption font-semibold text-fg transition-[background-color,transform] hover:bg-fg/8 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg/40'
    : 'inline-flex h-8 flex-shrink-0 items-center gap-1.5 rounded-lg border border-fg bg-transparent px-3 text-caption font-semibold text-fg transition-[background-color,transform] hover:bg-fg/8 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg/40'

  return (
    <div
      className={rootClass}
      title={updateAvailable ? `v${version} — download and re-import in Figma desktop.` : undefined}
    >
      <span className={`flex min-w-0 items-center gap-2 ${layout === 'stacked' ? 'w-full' : ''}`}>
        <img
          src="/sync-figma/favicon-escalatokens.svg"
          alt=""
          aria-hidden
          className="h-5 w-5 flex-shrink-0 rounded-[5px]"
        />
        <span className="min-w-0 truncate text-caption font-semibold text-fg">Escala DS Plugin</span>
        {/* At rest the version is plain quiet TEXT, not a bordered pill — the
            resting version isn't a state anyone has to act on, and a pill for
            it put a second outlined box beside the Download button for no
            reason. Only the update case earns a badge. Ink is `--fg`, same
            as every other chrome control on this screen — `--accent-ui`
            tracks the previewed theme and would paint this gold/red. */}
        {updateAvailable ? (
          <span className="inline-flex flex-shrink-0 items-center rounded-full bg-fg/10 px-2 py-0.5 text-micro font-semibold uppercase tracking-wide text-fg">
            Update available
          </span>
        ) : (
          <span className="flex-shrink-0 text-micro font-medium text-fg-faint">v{version}</span>
        )}
        {info ? (
          <span className={layout === 'stacked' ? 'ml-auto' : undefined}>
            <ClickInfo label="About the Escala DS plugin">{info}</ClickInfo>
          </span>
        ) : null}
      </span>
      <button
        type="button"
        onClick={onOpenInstall}
        aria-label={updateAvailable ? 'Download plugin update and open install steps' : 'Download plugin and open install steps'}
        className={buttonClass}
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
