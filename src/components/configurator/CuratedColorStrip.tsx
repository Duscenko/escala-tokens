import { useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { useI18n } from '../../lib/i18n'
import { inspectorFoldMotion } from '../../lib/inspectorMotion'
import { CURATED_COLORS, curatedPalette, type CuratedColor } from '../../lib/curatedColors'
import { HintTip } from '../ui/HintTip'

/** Dots per row; the folded strip is the first row. */
const COLS = 8

/**
 * "Suggested colours" at the head of the Color row. The curated deck as DOTS
 * (round, so they read apart from the square role swatches below), in the
 * deck's own order — one vivid Create UI accent, two softer HeroUI ones
 * (`CURATED_COLORS`) — so even the first row shows how different two picks can
 * be. Folded it is that one row; "Show all" unfolds the rest in place (the
 * inspector's own fold, `inspectorFoldMotion`). The full tiles live in the
 * Random menu's Curated deck; here they would cost the row its colours.
 *
 * Each dot is drawn in the appearance on screen — the colour the board will
 * get. One click applies a whole palette (accent, neutral, severities). The dot
 * matching the accent on screen is ringed; when it sits in the folded part, the
 * list opens on it.
 */
export function CuratedColorStrip({ appearance, currentAccent, onPick, label, hint }: {
  appearance: 'light' | 'dark'
  /** The accent on screen, to ring the matching dot. */
  currentAccent: string
  onPick: (color: CuratedColor) => void
  label: string
  /** Optional info control beside the label. */
  hint?: React.ReactNode
}) {
  const { t } = useI18n()
  const reduce = useReducedMotion()
  const dotsRef = useRef<(HTMLButtonElement | null)[]>([])
  const dots = useMemo(() => CURATED_COLORS.map((color) => {
    const p = curatedPalette(color)
    return { color, hex: appearance === 'dark' ? p.accent : p.accentLight, palette: p }
  }), [appearance])
  const current = currentAccent.toLowerCase()
  const pickedIndex = dots.findIndex(({ palette }) => palette.accent === current || palette.accentLight === current)
  const [open, setOpen] = useState(pickedIndex >= COLS)
  const shown = open ? dots.length : COLS
  const focusIndex = pickedIndex >= 0 && pickedIndex < shown ? pickedIndex : 0

  const onKey = (event: React.KeyboardEvent) => {
    const i = dotsRef.current.findIndex((el) => el === document.activeElement)
    if (i < 0) return
    const go = (to: number) => { event.preventDefault(); dotsRef.current[Math.max(0, Math.min(shown - 1, to))]?.focus() }
    if (event.key === 'ArrowRight') go(i + 1)
    else if (event.key === 'ArrowLeft') go(i - 1)
    else if (event.key === 'ArrowDown') go(i + COLS)
    else if (event.key === 'ArrowUp') go(i - COLS)
    else if (event.key === 'Home') go(0)
    else if (event.key === 'End') go(shown - 1)
  }

  const dot = ({ color, hex }: (typeof dots)[number], i: number) => {
    const on = i === pickedIndex
    return (
      <HintTip key={color.id} label={`${t(color.name)} · ${hex.toUpperCase()}`}>
        <button
          ref={(el) => { dotsRef.current[i] = el }}
          type="button"
          role="radio"
          aria-checked={on}
          aria-label={`${t(color.name)}, ${hex.toUpperCase()}`}
          tabIndex={i === focusIndex ? 0 : -1}
          onClick={() => onPick(color)}
          className={`h-5 w-5 justify-self-center rounded-full transition-transform duration-150 ease-[var(--ease-out-quint)] hover:scale-110 active:scale-95 motion-reduce:hover:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui focus-visible:ring-offset-2 focus-visible:ring-offset-side-panel ${
            on ? 'ring-2 ring-fg ring-offset-2 ring-offset-side-panel' : 'ring-1 ring-inset ring-fg/15'
          }`}
          style={{ background: hex }}
        />
      </HintTip>
    )
  }

  const rest = dots.length - COLS
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-0.5">
        <span className="min-w-0 truncate text-caption font-medium text-fg-muted">{label}</span>
        {hint}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="ml-auto inline-flex h-6 flex-shrink-0 items-center gap-1 rounded-md px-1.5 text-caption text-fg-muted transition-colors duration-150 hover:bg-elevated hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/55"
        >
          {open ? t('Show less') : `${t('Show all')} · ${dots.length}`}
          <svg
            width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden
            className={`transition-transform duration-150 ease-[var(--ease-out-quint)] motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
          >
            <path d="M4 6l4 4 4-4" />
          </svg>
        </button>
      </div>
      <div role="radiogroup" aria-label={label} onKeyDown={onKey}>
        {/* `justify-items-center`: each grid item is the HintTip wrapper, not the dot, so the
            dot's own `justify-self-center` never applied and the first column's picked ring
            (4px outside the dot) was clipped by the panel edge. */}
        <div className="grid grid-cols-8 justify-items-center gap-y-2 pt-1.5">{dots.slice(0, COLS).map(dot)}</div>
        <AnimatePresence initial={false}>
          {open && rest > 0 && (
            <motion.div key="rest" {...inspectorFoldMotion(reduce)} className="overflow-hidden">
              {/* The fold clips (`overflow-hidden`, for its height animation), so its first row
                  needs the room for a picked ring INSIDE it: 8px on top = the rows' gap. */}
              <div className="grid grid-cols-8 justify-items-center gap-y-2 pb-1.5 pt-2">{dots.slice(COLS).map((d, i) => dot(d, i + COLS))}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
