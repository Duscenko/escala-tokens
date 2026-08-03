import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { useDesignStore } from '../../store/useDesignStore'
import { checkContrast, accessibleSolidTone } from '../../lib/colorUtils'
import { usePopoverPlacement } from './colorControls'
import {
  ARCHITECTURE_OPTIONS, architectureLabel, tonalPalettes, compositeOver,
  type SemanticArchitecture,
} from '../../lib/semanticArchitectures'

// ─── Architecture picker — Alias/Semantics ──────────────────────────────────
// Radio cards for the semantic token architectures. The matrix below stays the
// editing surface for every choice; the selection changes which PROJECTION the
// export emits (lib/semanticArchitectures.ts). Each card carries an educational
// tooltip, and `ArchContrastStrip` is a live accessibility preview: real WCAG
// ratios computed from the system's current ramps.
//
// This ships as TWO exports, not one card, because Semantics mirrors
// Primitives' three-row layout: the trigger sits in the 198px left cell (the
// slot Primitives gives "<Family> color" + its hex dropdown) and the contrast
// strip fills the flex-1 cell beside it (where Primitives puts the ScaleRow).
// They're separate grid cells, so a single component can't span both.

function ArchGlyph({ kind }: { kind: SemanticArchitecture }) {
  const a = 'var(--accent-ui)'
  switch (kind) {
    case 'flat':
      return (
        <svg width="44" height="26" viewBox="0 0 52 30" fill="none" aria-hidden>
          <rect x="1" y="2" width="34" height="5" rx="2.5" fill={a} opacity=".9" />
          <rect x="1" y="12" width="44" height="5" rx="2.5" fill={a} opacity=".55" />
          <rect x="1" y="22" width="26" height="5" rx="2.5" fill={a} opacity=".3" />
        </svg>
      )
    case 'astryx':
      return (
        <svg width="44" height="26" viewBox="0 0 52 30" fill="none" aria-hidden>
          <circle cx="9" cy="15" r="8" fill={a} opacity=".9" />
          <rect x="22" y="4" width="28" height="6" rx="3" fill={a} opacity=".7" />
          <rect x="22" y="14" width="20" height="6" rx="3" fill={a} opacity=".4" />
          <rect x="22" y="24" width="14" height="4" rx="2" fill={a} opacity=".22" />
        </svg>
      )
    case 'shadcn':
      return (
        <svg width="44" height="26" viewBox="0 0 52 30" fill="none" aria-hidden>
          <rect x="1" y="1" width="50" height="28" rx="6" fill={a} opacity=".1" stroke={a} strokeOpacity=".4" strokeWidth="1.2" />
          <rect x="6" y="18" width="16" height="6" rx="3" fill={a} opacity=".85" />
          <rect x="26" y="6" width="20" height="4" rx="2" fill={a} opacity=".5" />
          <rect x="26" y="14" width="14" height="4" rx="2" fill={a} opacity=".3" />
        </svg>
      )
    case 'categorical':
      return (
        <svg width="44" height="26" viewBox="0 0 52 30" fill="none" aria-hidden>
          <path d="M6 5h8M6 5v20h8M6 15h8" stroke={a} strokeWidth="1.6" strokeLinecap="round" />
          <rect x="20" y="1.5" width="24" height="7" rx="2.5" fill={a} opacity=".85" />
          <rect x="20" y="11.5" width="24" height="7" rx="2.5" fill={a} opacity=".5" />
          <rect x="20" y="21.5" width="24" height="7" rx="2.5" fill={a} opacity=".25" />
        </svg>
      )
    case 'vibrancy':
      return (
        <svg width="44" height="26" viewBox="0 0 52 30" fill="none" aria-hidden>
          <rect x="2" y="4" width="22" height="22" rx="5" fill={a} opacity=".9" />
          <rect x="14" y="1" width="22" height="22" rx="5" fill={a} opacity=".45" />
          <rect x="27" y="6" width="22" height="22" rx="5" fill={a} opacity=".2" />
        </svg>
      )
    case 'tonal':
      return (
        <svg width="44" height="26" viewBox="0 0 52 30" fill="none" aria-hidden>
          {[0.95, 0.72, 0.5, 0.28, 0.1].map((o, i) => (
            <rect key={i} x={1 + i * 10} y="8" width="10" height="14" rx="2" fill={a} opacity={1 - o + 0.05} />
          ))}
        </svg>
      )
  }
}

/** WCAG badge — AA/AAA for text pairs, LG when only large text passes. */
function RatioBadge({ fg, bg }: { fg: string; bg: string }) {
  const r = checkContrast(fg, bg)
  const label = `${r.toFixed(2)}:1`
  const cls =
    r >= 4.5
      ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
      : r >= 3
      ? 'text-amber-600 dark:text-amber-400 bg-amber-500/10'
      : 'text-red-600 dark:text-red-400 bg-red-500/10'
  const tag = r >= 7 ? 'AAA' : r >= 4.5 ? 'AA' : r >= 3 ? 'LG' : '✕'
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md font-mono text-[10px] font-semibold tabular-nums ${cls}`}>
      {label} {tag}
    </span>
  )
}

/** One live contrast specimen: "Aa" in fg over bg + the measured ratio. */
function PairChip({ label, fg, bg, note }: { label: string; fg: string; bg: string; note?: string }) {
  return (
    <div className="flex items-center gap-2.5 min-w-0 flex-shrink-0">
      <span
        className="w-9 h-7 rounded-md flex items-center justify-center text-[12px] font-semibold flex-shrink-0 ring-1 ring-black/10 dark:ring-white/10"
        style={{ backgroundColor: bg, color: fg }}
        aria-hidden
      >
        Aa
      </span>
      <span className="flex flex-col min-w-0">
        <span className="font-mono text-[10.5px] text-fg-muted truncate" title={label}>{label}</span>
        <span className="flex items-center gap-1.5">
          <RatioBadge fg={fg} bg={bg} />
          {note && <span className="text-[10px] text-fg-faint truncate">{note}</span>}
        </span>
      </span>
    </div>
  )
}

/** The accessibility preview — swaps per selected architecture. */
export function ArchPreview({ kind }: { kind: SemanticArchitecture }) {
  const { primaryScale, primaryColor, errorColor, grayLightScale, grayDarkScale } = useDesignStore()
  const g = grayLightScale
  const gd = grayDarkScale
  const solid = primaryScale[accessibleSolidTone(primaryScale)] ?? primaryColor

  if (kind === 'flat') {
    return (
      <>
        <PairChip label="text-primary / surface-1 · light" fg={g[12]} bg={g[2]} />
        <PairChip label="text-primary / surface-1 · dark" fg={gd[1]} bg={gd[11]} />
        <PairChip label="text-on-brand / action-primary" fg={g[1]} bg={solid} />
      </>
    )
  }
  if (kind === 'astryx') {
    return (
      <>
        <PairChip label="text.primary / background.body · light" fg={g[12]} bg={g[1]} />
        <PairChip label="text.primary / background.body · dark" fg={gd[1]} bg={gd[12]} />
        <PairChip label="accent.on-solid / accent.solid" fg={g[1]} bg={solid} />
      </>
    )
  }
  if (kind === 'shadcn') {
    return (
      <>
        <PairChip label="foreground / background · light" fg={g[12]} bg={g[1]} />
        <PairChip label="foreground / background · dark" fg={gd[1]} bg={gd[12]} />
        <PairChip label="primary-foreground / primary" fg={g[1]} bg={solid} />
      </>
    )
  }
  if (kind === 'categorical') {
    return (
      <>
        <PairChip label="content.primary · light → {neutral.12}" fg={g[12]} bg={g[1]} />
        <PairChip label="content.primary · dark → {neutral-dark.1}" fg={gd[1]} bg={gd[12]} />
        <PairChip label="content.on-action / action.primary" fg={g[1]} bg={solid} />
      </>
    )
  }
  if (kind === 'vibrancy') {
    const secLight = compositeOver(g[12], 0.6, g[1])
    const secDark = compositeOver(gd[1], 0.6, gd[12])
    return (
      <>
        <PairChip label="label-secondary (60%) · light" fg={secLight} bg={g[1]} note="composited" />
        <PairChip label="label-secondary (60%) · dark" fg={secDark} bg={gd[12]} note="composited" />
        <PairChip label="opaque fallback → {neutral.8}" fg={g[8]} bg={g[1]} note="no backdrop-filter" />
      </>
    )
  }
  const pal = tonalPalettes(primaryColor, errorColor)
  return (
    <>
      <PairChip label="on-primary(100) / primary(40)" fg={pal.primary[100]} bg={pal.primary[40]} />
      <PairChip label="on-primary-container(10) / container(90)" fg={pal.primary[10]} bg={pal.primary[90]} />
      <PairChip label="dark · on-primary(20) / primary(80)" fg={pal.primary[20]} bg={pal.primary[80]} />
    </>
  )
}

/**
 * The contrast strip on its own — lives in the flex-1 cell of Semantics' first
 * row, the slot Primitives fills with the active family's ScaleRow. Same idea
 * in both: the row's right side shows what the left side's selection produces.
 */
export function ArchContrastStrip({ kind }: { kind: SemanticArchitecture }) {
  // Scrolls sideways instead of wrapping: wrapping grew this row taller than
  // ColorPrimitives' matching row, so the table below shifted down when you
  // switched tabs — the exact "same structure across tabs" break this layout
  // exists to fix. Height stays pinned to the label + dropdown beside it.
  return (
    <div className="flex items-center gap-5 min-w-0 overflow-x-auto">
      <ArchPreview kind={kind} />
    </div>
  )
}

/**
 * The architecture trigger — a ColorSelect-shaped dropdown sized to match the
 * hex field Primitives puts in this same 198px cell (w-40 h-9 rounded-[13px]),
 * so switching tabs doesn't move the control. The radio cards that used to be
 * an always-expandable accordion row now live inside its popover.
 */
export function ArchitectureSelect() {
  const { semanticArchitecture, setSemanticArchitecture } = useDesignStore()
  const [open, setOpen] = useState(false)
  const reduce = useReducedMotion() ?? false
  const groupRef = useRef<HTMLDivElement>(null)
  const anchorRef = useRef<HTMLDivElement>(null)
  const place = usePopoverPlacement(anchorRef, open, { prefer: 380, max: 560 })

  // Click-outside / Escape to dismiss, same as the other field popovers.
  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (!anchorRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // Roving-tabindex radiogroup: arrows move AND select (native radio behavior).
  function onKeyDown(e: React.KeyboardEvent) {
    const dir =
      e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 :
      e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!dir) return
    e.preventDefault()
    const idx = ARCHITECTURE_OPTIONS.findIndex((o) => o.key === semanticArchitecture)
    const next = ARCHITECTURE_OPTIONS[(idx + dir + ARCHITECTURE_OPTIONS.length) % ARCHITECTURE_OPTIONS.length]
    setSemanticArchitecture(next.key)
    const radios = groupRef.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]')
    radios?.[ARCHITECTURE_OPTIONS.findIndex((o) => o.key === next.key)]?.focus()
  }

  return (
    <div ref={anchorRef} className="relative w-full">
      {/* Trigger — mirrors the hex field Primitives renders in this same cell */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Change token architecture"
        title="Change token architecture"
        className="w-full h-9 pl-2.5 pr-1.5 rounded-[13px] border border-line-strong bg-surface flex items-center gap-1.5 text-left hover:border-fg-faint transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg"
      >
        <ArchGlyph kind={semanticArchitecture} />
        <span className="flex-1 min-w-0 truncate text-[13px] font-medium text-accent-ui">
          {architectureLabel(semanticArchitecture)}
        </span>
        <svg
          width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
          strokeLinecap="round" strokeLinejoin="round"
          className={`flex-shrink-0 text-fg-faint transition-transform ${open ? 'rotate-180' : ''}`}
          aria-hidden
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: reduce ? 0 : 0.14, ease: 'easeOut' }}
            role="dialog"
            aria-label="Token architecture"
            style={{ maxHeight: place.max }}
            className={`absolute left-0 z-30 w-[34rem] max-w-[80vw] rounded-2xl border border-line bg-app shadow-xl flex flex-col overflow-hidden ${
              place.up ? 'bottom-full mb-2' : 'top-full mt-2'
            }`}
          >
            <div className="overflow-y-auto p-4 flex flex-col gap-3">
              <div
                ref={groupRef}
                role="radiogroup"
                aria-label="Semantic token architecture"
                onKeyDown={onKeyDown}
                className="grid grid-cols-2 gap-2.5"
              >
                {ARCHITECTURE_OPTIONS.map((o) => {
                  const checked = semanticArchitecture === o.key
                  return (
                    <button
                      key={o.key}
                      role="radio"
                      aria-checked={checked}
                      tabIndex={checked ? 0 : -1}
                      onClick={() => { setSemanticArchitecture(o.key); setOpen(false) }}
                      className={`relative flex flex-col gap-1.5 rounded-xl border p-3 text-left transition-colors ${
                        checked
                          ? 'border-accent-ui ring-1 ring-accent-ui bg-elevated shadow-sm'
                          : 'border-line hover:border-line-strong'
                      }`}
                    >
                      <span
                        className={`absolute top-2.5 right-2.5 w-3.5 h-3.5 rounded-full border ${
                          checked ? 'border-[4.5px] border-accent-ui' : 'border-line-strong'
                        }`}
                        aria-hidden
                      />
                      <ArchGlyph kind={o.key} />
                      <span className="flex items-center gap-1.5 text-[12.5px] font-semibold text-fg">
                        {o.label}
                        {/* Educational tooltip — same hover pattern as the category rail */}
                        <span className="relative group inline-flex" tabIndex={0} aria-label={o.tip} role="note">
                          <span className="w-[15px] h-[15px] rounded-full border border-line-strong text-fg-faint text-[9px] font-mono flex items-center justify-center cursor-help">
                            i
                          </span>
                          <span
                            role="tooltip"
                            className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-60 rounded-lg bg-fg text-app text-[11px] leading-snug px-2.5 py-1.5 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity z-40 shadow-lg font-normal"
                          >
                            {o.tip}
                          </span>
                        </span>
                      </span>
                      <span className="text-[11px] text-fg-muted leading-snug">{o.desc}</span>
                    </button>
                  )
                })}
              </div>

              {/* No contrast strip in here — it lives in the row beside this
                  trigger now (ArchContrastStrip), always visible instead of
                  hidden behind the popover it used to be nested in. */}
              <p className="text-[11px] text-fg-faint leading-snug">
                The matrix stays the editing surface for every architecture — the choice changes the
                <span className="font-mono text-fg-muted"> colors.architecture </span>
                projection in tokens.json. Astryx is the default, one-hop export shape.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
