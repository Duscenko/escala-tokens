import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { useDesignStore } from '../../store/useDesignStore'
import { useLibraryStatus, useUnsavedBrands } from '../../lib/libraryStatus'
import { myThemeKeys } from '../../lib/themeLibrary'
import { redoEdit, undoEdit, useEditHistory } from '../../lib/editHistory'
import { goToLogin, useAccess } from '../../lib/access'
import { useI18n } from '../../lib/i18n'
import { SELECT_FOCUS, SELECT_LIST, SELECT_OPTION, SELECT_OPTION_OFF, SELECT_OPTION_ON, SELECT_SHELL, WORKSPACE_CHROME } from './themeWorkspaceLayout'
import { PALETTE_LEVELS, getPaletteLevel, subscribePaletteLevel, writePaletteLevel, type PaletteLevel } from '../../lib/radixPalettes'
import { SETUP_STEPS, advanceThemeSetup, finishThemeSetup, forgetUnsavedBrand, retreatThemeSetup, useSetupStep } from '../../lib/themeSetup'
import { showToast } from '../ui/Toast'
import { burstConfetti } from '../../lib/celebrate'
import { announceBrandSaved } from '../../lib/brandSaved'
import { resolvePreviewTokens } from '../../lib/previewTokens'
import { requestOpenGithub } from '../../lib/guestSave'
import { flushAccountCloud } from '../../lib/accountCloudSync'
import { AccountCloudStatus } from './AccountCloudStatus'
import { FigmaGlyph } from '../ui/icons'
import { HintTip } from '../ui/HintTip'
import { useCloseOnAnchorScroll } from '../ui/useCloseOnAnchorScroll'

/**
 * The three places a system ships to — the whole product's promise, in the
 * footer of every editing inspector (design-plans/entry-flow-set-see-ship.md).
 * One vocabulary everywhere: CSS · Figma · Agent. "Get code" is no longer a
 * label: it opened the Code tab on Agent context, which is not the file most
 * people came for.
 */
export interface ShipActions {
  /** The Code tab on CSS (variables.css). */
  css: () => void
  /** The Figma page: copy the context, paste it in the plugin. */
  figma: () => void
  /** The Code tab on Agent context. */
  agent: () => void
}

export const SHIP_BUTTON = 'flex h-8 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg border border-line bg-surface px-2 text-caption font-semibold text-fg transition-colors hover:border-line-strong hover:bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50'

export function CodeGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="flex-shrink-0">
      <path d="m5.5 4.5-3.5 3.5 3.5 3.5" />
      <path d="m10.5 4.5 3.5 3.5-3.5 3.5" />
    </svg>
  )
}

export function AgentGlyph() {
  // Same asset `FormatGlyph` paints on the Code rail (a mask, so it follows
  // the button's ink). Not imported from there: that rail imports this file.
  const mask = "url('/icons/settings/mcp.svg') center / contain no-repeat"
  return <span aria-hidden className="h-3.5 w-3.5 flex-shrink-0 bg-current" style={{ WebkitMask: mask, mask }} />
}

/** Three equal doors. Each opens ONE page; none is the primary, because which
 *  one you came for is yours to say. */
export function ShipRow({ ship }: { ship: ShipActions }) {
  const { t } = useI18n()
  return (
    // No "Ship to" eyebrow: three named doors in a row say it themselves, and
    // the caption only added a line between Save and them. The group keeps the
    // name for screen readers.
    <div className="flex flex-col gap-2">
      <div role="group" aria-label={t('Ship to')} className="flex items-center gap-1.5">
        <button type="button" onClick={ship.css} className={SHIP_BUTTON} title={t('Copy or download variables.css')}>
          <CodeGlyph /><span className="truncate">{t('CSS')}</span>
        </button>
        <button type="button" onClick={ship.figma} className={SHIP_BUTTON} title={t('Copy the context and paste it in the plugin.')}>
          <FigmaGlyph size={13} /><span className="truncate">{t('Figma')}</span>
        </button>
        <button type="button" onClick={ship.agent} className={SHIP_BUTTON} title={t('One message your AI agent reads as the source of truth.')}>
          <AgentGlyph /><span className="truncate">{t('Agent')}</span>
        </button>
      </div>
    </div>
  )
}

/** One segment of the history pill: a 28px square inside the 36px shell. */
// 32px squares (WCAG 2.5.8 asks 24): the bar is the board's main tool row.
// An unavailable Undo / Redo stays focusable (`aria-disabled`, not
// `disabled`) so its tooltip still says what it would do; it reads in the
// faint ink, never at 35% opacity, where it all but vanished. The focus ring
// is full strength: at 50% it measured under 3:1 on the bar.
const HISTORY_SEGMENT = 'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-fg-muted transition-[color,background-color,transform] duration-150 ease-[var(--ease-out-quint)] hover:bg-elevated hover:text-fg active:scale-95 motion-reduce:active:scale-100 aria-disabled:cursor-not-allowed aria-disabled:text-fg-faint aria-disabled:hover:bg-transparent aria-disabled:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui'

/**
 * Undo · Redo · Random, on the BOARD's header — the surface they act on.
 * They used to sit in the inspector footer, stacked with the save status and
 * the Ship doors: three jobs in one 288px band, and Undo read as part of
 * shipping (reported as "too dense"). Here they sit beside Inspector, in the
 * same 36px pill shell, so history and "roll a new look" are things you do
 * TO the board you are looking at. ⌘Z / ⇧⌘Z walk the same history.
 */
export function BoardHistoryControls({ onRandom, children, trailing, appearance, leading, history = true }: {
  /** A whole new theme — only while the brand is a draft (see callers). The
   *  die carries a chevron for how daring it is (Safe · Free · Bold). */
  onRandom?: () => void
  /** Board tools that join the pill after a divider (the Inspector). */
  children?: ReactNode
  /** A group of its own at the pill's end (the Theme · Components switch),
   *  set off by a full-height rule — Figma's tools | modes split. */
  trailing?: ReactNode
  /** Light · Dark, last, after its own rule. */
  appearance?: ReactNode
  /** First group, before Undo · Redo (the colour map's Map · Board switch). */
  leading?: ReactNode
  /** Undo · Redo. Off on the colour map's graph, which edits nothing. */
  history?: boolean
}) {
  const { t } = useI18n()
  const lastUndo = useEditHistory((h) => h.past[h.past.length - 1]?.label)
  const lastRedo = useEditHistory((h) => h.future[h.future.length - 1]?.label)
  const undoLabel = lastUndo ? `${t('Undo')} — ${lastUndo}` : t('Undo')
  const redoLabel = lastRedo ? `${t('Redo')} — ${lastRedo}` : t('Redo')
  const toolbar = (
    // The whole bar is one named group of three: history, the board tools
    // (Random, Inspector) and the view tabs. It used to be ONE group named
    // "History" around all of it, so a screen reader announced Inspector and
    // the Theme · Components tabs as history.
    // A dark island with its own near-black, whatever the board beneath is
    // painted in: the bar floats over a busy board and has to separate from it
    // (Mesurer's "inverse" bar). `dark` re-points the chrome tokens inside, so
    // the buttons, hints and tabs keep their contrast on the black.
    <div role="group" aria-label={t('Board tools')} className="dark flex h-10 items-center gap-0.5 rounded-xl border border-white/[0.12] bg-[#050506] p-1">
      {leading}
      {leading && history && <span aria-hidden className="mx-0.5 h-5 w-px bg-line" />}
      {history && (
      <div role="group" aria-label={t('History')} className="flex items-center gap-0.5">
        <HintTip label={undoLabel} shortcut="⌘Z">
        <button type="button" onClick={() => { if (lastUndo) undoEdit() }} aria-disabled={!lastUndo || undefined} aria-label={undoLabel} aria-keyshortcuts="Meta+Z" className={HISTORY_SEGMENT}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M5.5 3.5 2.5 6.5l3 3" />
            <path d="M2.5 6.5h7a4 4 0 0 1 0 8H7" />
          </svg>
        </button>
        </HintTip>
        <HintTip label={redoLabel} shortcut="⇧⌘Z">
        <button type="button" onClick={() => { if (lastRedo) redoEdit() }} aria-disabled={!lastRedo || undefined} aria-label={redoLabel} aria-keyshortcuts="Shift+Meta+Z" className={HISTORY_SEGMENT}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M10.5 3.5l3 3-3 3" />
            <path d="M13.5 6.5h-7a4 4 0 0 0 0 8H9" />
          </svg>
        </button>
        </HintTip>
      </div>
      )}
      {onRandom && (
        <>
          <span aria-hidden className="mx-0.5 h-5 w-px bg-line" />
          {/* Figma's tool + chevron: the die rolls, the chevron picks how. */}
          <div className="flex items-center">
            <RandomWholeThemeButton bare onClick={onRandom} label={t('Random theme')} />
            <RandomLevelPicker chevron />
          </div>
        </>
      )}
      {children && (
        <>
          <span aria-hidden className="mx-0.5 h-5 w-px bg-line" />
          {children}
        </>
      )}
      {trailing && (
        <>
          <span aria-hidden className="-my-1 mx-1 w-px self-stretch bg-line" />
          {trailing}
        </>
      )}
      {appearance && (
        <>
          <span aria-hidden className="-my-1 mx-1 w-px self-stretch bg-line" />
          {appearance}
        </>
      )}
    </div>
  )
  return toolbar
}

/** The footer's last line: where the work lives. Status reads after the
 *  action, like a document's "Saved" under its toolbar, never above it. */
function FooterStatus({ guest, divided = true }: { guest: boolean; divided?: boolean }) {
  return (
    // `empty:hidden`: with no status to report (accounts off, nothing
    // synced yet) the line would be a bare divider under the Ship row.
    <div className={`empty:hidden ${divided ? 'border-t border-line pt-2.5' : ''}`}>
      {guest ? <UnsavedNotice /> : <AccountCloudStatus />}
    </div>
  )
}

/** Two crossing arrows — the shuffle mark every "surprise me" control uses. */
function ShuffleGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="relative z-[1] flex-shrink-0">
      <path d="M2 4.5h2.3a3 3 0 0 1 2.5 1.3l2.4 3.4a3 3 0 0 0 2.5 1.3H14" />
      <path d="M12.2 8.4 14 10.5l-1.8 2.1" />
      <path d="M2 11.5h2.3a3 3 0 0 0 2.2-1" />
      <path d="M9.5 5.7a3 3 0 0 1 2.5-.7H14" />
      <path d="M12.2 2.9 14 5l-1.8 2.1" />
    </svg>
  )
}

/** Pip positions per face, on the 16-unit glyph grid. */
const L = 5.5, C = 8, R = 10.5
const DIE_FACES: [number, number][][] = [
  [[C, C]],
  [[L, L], [R, R]],
  [[L, L], [C, C], [R, R]],
  [[L, L], [R, L], [L, R], [R, R]],
  [[L, L], [R, L], [C, C], [L, R], [R, R]],
  [[L, L], [R, L], [L, C], [R, C], [L, R], [R, R]],
]

/** A die — "a whole new theme", distinct from Shuffle (colours only). */
function DiceGlyph({ face, size = 15 }: { face: number; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" aria-hidden className="flex-shrink-0">
      <rect x="2.5" y="2.5" width="11" height="11" rx="2.5" />
      {DIE_FACES[face - 1].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r=".9" fill="currentColor" stroke="none" />
      ))}
    </svg>
  )
}

/** The die that ROLLS: each new `rolls` count hops it, turns it a full
 *  circle and lands it on a new face mid-air. Hover tips it (the parent is a
 *  `group`). Shared by the desktop's Random and the phone's Shuffle, so the
 *  dice reads as chance the same way everywhere. */
export function RollingDie({ rolls, size = 15 }: { rolls: number; size?: number }) {
  const reduce = useReducedMotion()
  const [face, setFace] = useState(5)
  const swap = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(swap.current), [])
  useEffect(() => {
    if (!rolls) return
    const next = (current: number) => {
      const n = 1 + Math.floor(Math.random() * 5)
      return n >= current ? n + 1 : n
    }
    window.clearTimeout(swap.current)
    // Change faces at the top of the hop, while the die is mid-turn (at once
    // when motion is reduced: there is no hop to wait for).
    swap.current = window.setTimeout(() => setFace(next), reduce ? 0 : 170)
  }, [rolls, reduce])
  return (
    <span className="flex transition-transform duration-200 ease-[var(--ease-out-quint)] motion-safe:group-hover:-translate-y-px motion-safe:group-hover:-rotate-12">
      <motion.span
        className="flex"
        initial={false}
        animate={reduce ? undefined : { rotate: rolls * 360, y: rolls ? [0, -5, 0] : 0, scale: rolls ? [1, 0.88, 1] : 1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1], y: { duration: 0.42, times: [0, 0.4, 1] }, scale: { duration: 0.42, times: [0, 0.4, 1] } }}
      >
        <DiceGlyph face={face} size={size} />
      </motion.span>
    </span>
  )
}

/** The save bar's Random: a whole new theme. Plain like Undo beside it and
 *  drawn as a die, so it never reads as the colour Shuffle (gradient border,
 *  crossing arrows) in the Color section above. Hover tips the die; a click
 *  ROLLS it — a hop and a turn, landing on a new face mid-air — so the action
 *  reads as chance before the board repaints. */
export function RandomWholeThemeButton({ onClick, label, compact = false, bare = false }: {
  onClick: () => void
  label: string
  /** 32px, for footers whose buttons are `h-8` (the create studio). */
  compact?: boolean
  /** A segment of `BoardHistoryControls`: 28px, no edge of its own. */
  bare?: boolean
}) {
  const [rolls, setRolls] = useState(0)
  const roll = () => {
    onClick()
    setRolls((r) => r + 1)
  }

  const button = (
    <button
      type="button"
      onClick={roll}
      aria-label={label}
      // The toolbar's segment gets the dark hint; the footers keep the native one.
      title={bare ? undefined : label}
      className={bare
        ? `group ${HISTORY_SEGMENT}`
        : `group flex ${compact ? 'h-8 w-8' : 'h-9 w-9'} flex-shrink-0 items-center justify-center rounded-lg border border-line text-fg-muted transition-[color,border-color,transform] duration-150 ease-[var(--ease-out-quint)] hover:border-line-strong hover:text-fg active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50`}
    >
      <RollingDie rolls={rolls} />
    </button>
  )
  return bare ? <HintTip label={label}>{button}</HintTip> : button
}

/** Random, in one shape everywhere: the shuffle mark inside the animated
 *  conic border. `icon` is the icon-only square (next to a Style select or in
 *  the save bar); `tweak` keeps its label for the guest previewer card. */
const LEVEL_COPY: Record<PaletteLevel, { label: string; hint: string }> = {
  conservative: { label: 'Safe (random level)', hint: 'Product accents, natural grey, classic states' },
  liberal: { label: 'Free (random level)', hint: 'Any Radix family, any grey, light or dark' },
  bold: { label: 'Bold (random level)', hint: 'Page in the colour opposite the accent' },
}

/** The level Random draws its colours at (`radixPalettes`), shared by every
 *  Random in this browser. */
function usePaletteLevel(): PaletteLevel {
  return useSyncExternalStore(subscribePaletteLevel, getPaletteLevel, getPaletteLevel)
}

/** Menu width, px: the names and their meter; the hint reads at the foot. */
const LEVEL_MENU_W = 220

/** How daring a level is, drawn: one, two or three rising bars. The three
 *  options read as one scale before their names are read. */
function LevelMeter({ level }: { level: PaletteLevel }) {
  const on = PALETTE_LEVELS.indexOf(level) + 1
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden className="flex-shrink-0">
      {[5, 8, 11].map((h, i) => (
        <rect key={h} x={1 + i * 4.5} y={12.5 - h} width="3" height={h} rx="1" fill="currentColor" opacity={i < on ? 1 : 0.22} />
      ))}
    </svg>
  )
}
/** Gap between the trigger and the menu, and the menu and the window edge. */
const LEVEL_MENU_GAP = 6

/** How daring Random's colours are: Safe · Free · Bold. One choice, remembered
 *  per browser; the Color edition shuffle and the board's Random both read it.
 *
 *  The menu is PORTALED to <body> and positioned `fixed` off the trigger: the
 *  trigger sits in the inspector's scroll column, which clipped an absolute
 *  menu (its left half was cut off). Right edges align, clamped to the window,
 *  and it opens upward when there is no room below. */
export function RandomLevelPicker({ chevron = false }: {
  /** Beside the board toolbar's die, Figma-style: a bare chevron, and the
   *  menu opens ABOVE it, dark like the bar, with the check on the left. */
  chevron?: boolean
} = {}) {
  const { t } = useI18n()
  const level = usePaletteLevel()
  const reduce = useReducedMotion()
  const [open, setOpen] = useState(false)
  const [place, setPlace] = useState<{ top?: number; bottom?: number; left: number } | null>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const options = useRef<(HTMLButtonElement | null)[]>([])
  // The level under the pointer or focus; the foot reads out its hint (the
  // chosen level's when neither is on a row).
  const [active, setActive] = useState<PaletteLevel | null>(null)

  const close = (refocus = true) => {
    setOpen(false)
    setActive(null)
    if (refocus) trigger.current?.focus()
  }

  // Measure on open and keep in step with resize. Scrolling the column under
  // the trigger closes it.
  useCloseOnAnchorScroll(open, trigger, () => close(false))
  useLayoutEffect(() => {
    if (!open) return
    const measure = () => {
      const r = trigger.current?.getBoundingClientRect()
      if (!r) return
      const height = menu.current?.offsetHeight ?? 180
      if (chevron) {
        // Above the toolbar, starting at the die (one 32px segment left).
        const left = Math.max(LEVEL_MENU_GAP, Math.min(r.left - 32, window.innerWidth - LEVEL_MENU_W - LEVEL_MENU_GAP))
        setPlace({ bottom: window.innerHeight - r.top + LEVEL_MENU_GAP + 4, left })
        return
      }
      const left = Math.max(LEVEL_MENU_GAP, Math.min(r.right - LEVEL_MENU_W, window.innerWidth - LEVEL_MENU_W - LEVEL_MENU_GAP))
      const below = window.innerHeight - r.bottom - LEVEL_MENU_GAP
      setPlace(below >= height || below >= r.top
        ? { top: r.bottom + LEVEL_MENU_GAP, left }
        : { bottom: window.innerHeight - r.top + LEVEL_MENU_GAP, left })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [open, chevron])

  // Focus the selected level when the menu opens; outside click closes it.
  useEffect(() => {
    if (!open) return
    options.current[PALETTE_LEVELS.indexOf(level)]?.focus()
    const outside = (event: PointerEvent) => {
      const target = event.target as Node
      if (menu.current?.contains(target) || trigger.current?.contains(target)) return
      close(false)
    }
    document.addEventListener('pointerdown', outside)
    return () => document.removeEventListener('pointerdown', outside)
    // `level` is read once, on open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const onMenuKey = (event: React.KeyboardEvent) => {
    const i = options.current.findIndex((el) => el === document.activeElement)
    const n = PALETTE_LEVELS.length
    const go = (to: number) => { event.preventDefault(); options.current[(to + n) % n]?.focus() }
    if (event.key === 'ArrowDown') go(i + 1)
    else if (event.key === 'ArrowUp') go(i - 1)
    else if (event.key === 'Home') go(0)
    else if (event.key === 'End') go(n - 1)
    else if (event.key === 'Escape' || event.key === 'Tab') { event.preventDefault(); close() }
  }

  const chevronTrigger = (
    <button
      ref={trigger}
      type="button"
      onClick={() => setOpen((v) => !v)}
      onKeyDown={(event) => { if ((event.key === 'ArrowUp' || event.key === 'ArrowDown') && !open) { event.preventDefault(); setOpen(true) } }}
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-label={`${t('Random colours')}: ${t(LEVEL_COPY[level].label)}`}
      className={`flex h-8 w-4 flex-shrink-0 items-center justify-center rounded-md transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui ${
        open ? 'bg-elevated text-fg' : 'text-fg-faint hover:bg-elevated hover:text-fg'
      }`}
    >
      <svg
        width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden
        className={`transition-transform duration-150 ease-[var(--ease-out-quint)] motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
      >
        <path d="M4 6l4 4 4-4" />
      </svg>
    </button>
  )

  return (
    <>
      {chevron ? (open ? chevronTrigger : <HintTip label={t('How daring Random is')}>{chevronTrigger}</HintTip>) : (
      <button
        ref={trigger}
        type="button"
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(event) => { if (event.key === 'ArrowDown' && !open) { event.preventDefault(); setOpen(true) } }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`${t('Random colours')}: ${t(LEVEL_COPY[level].label)}`}
        title={t('How daring Random is')}
        className={`flex h-8 flex-shrink-0 items-center gap-1 px-2 text-caption ${open ? 'text-fg' : 'text-fg-muted hover:text-fg'} ${SELECT_SHELL} ${SELECT_FOCUS}`}
      >
        {t(LEVEL_COPY[level].label)}
        <svg
          width="10" height="10" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden
          className={`transition-transform duration-150 ease-[var(--ease-out-quint)] motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
        >
          <path d="M4 6l4 4 4-4" />
        </svg>
      </button>
      )}
      {open && createPortal(
        <motion.div
          ref={menu}
          role="listbox"
          aria-label={t('Random colours')}
          onKeyDown={onMenuKey}
          initial={reduce ? false : { opacity: 0, y: place?.bottom != null ? 4 : -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: 'fixed',
            width: LEVEL_MENU_W,
            left: place?.left ?? -9999,
            top: place?.top,
            bottom: place?.bottom,
            visibility: place ? 'visible' : 'hidden',
          }}
          onPointerLeave={() => setActive(null)}
          className={`z-[70] flex flex-col gap-0.5 ${SELECT_LIST} ${chevron ? 'dark' : ''}`}
        >
          {PALETTE_LEVELS.map((id, i) => {
            const on = id === level
            return (
              <button
                key={id}
                ref={(el) => { options.current[i] = el }}
                type="button"
                role="option"
                aria-selected={on}
                aria-describedby={`random-level-hint-${id}`}
                onClick={() => { writePaletteLevel(id); close() }}
                onPointerEnter={() => setActive(id)}
                onFocus={() => setActive(id)}
                className={`${SELECT_OPTION} grid ${chevron ? 'grid-cols-[auto_auto_1fr]' : 'grid-cols-[auto_1fr_auto]'} items-center gap-x-2 focus-visible:outline-none focus-visible:bg-surface focus-visible:text-fg ${on ? SELECT_OPTION_ON : SELECT_OPTION_OFF}`}
              >
                {chevron && (
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={`text-accent-ui ${on ? '' : 'invisible'}`}>
                    <path d="M3.5 8.5l3 3 6-7" />
                  </svg>
                )}
                <span className={on ? 'text-accent-ui' : 'text-fg-faint'}><LevelMeter level={id} /></span>
                <span className="min-w-0 truncate text-ui">{t(LEVEL_COPY[id].label)}</span>
                <span id={`random-level-hint-${id}`} className="sr-only">{t(LEVEL_COPY[id].hint)}</span>
                {!chevron && (
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden className={`text-accent-ui ${on ? '' : 'invisible'}`}>
                    <path d="M3.5 8.5l3 3 6-7" />
                  </svg>
                )}
              </button>
            )
          })}
          {/* One line of WHAT a level does, for the row in reach — the list
              itself stays three words long. Fixed at two lines' height so the
              menu never resizes under the pointer. */}
          <p aria-hidden className="mt-0.5 min-h-[calc(2lh+1rem)] border-t border-line px-2.5 py-2 text-caption leading-snug text-fg-muted">
            {t(LEVEL_COPY[active ?? level].hint)}
          </p>
        </motion.div>,
        document.body,
      )}
    </>
  )
}

export function RandomThemeButton({
  onClick,
  label,
  variant = 'tweak',
  className = '',
  visibleLabel,
}: {
  onClick: () => void
  /** Shorter on-screen text for the `labeled` variant; `label` stays the
   *  accessible name. */
  visibleLabel?: string
  /** Accessible name; also the visible text in the `tweak` variant. */
  label?: string
  /** `labeled`: glyph + visible text at the size `className` gives it. */
  variant?: 'tweak' | 'icon' | 'labeled'
  /** Size override for the `icon` and `labeled` variants. */
  className?: string
}) {
  const { t } = useI18n()
  const text = label ?? t('Random tweak')
  const icon = variant === 'icon'
  // Each press re-keys the glyph so its half-turn replays — the shuffle reads
  // as a throw, not a dead click, even when the new palette looks alike.
  const [throws, setThrows] = useState(0)
  return (
    <button
      type="button"
      onClick={() => { setThrows((n) => n + 1); onClick() }}
      aria-label={text}
      title={text}
      className={`relative flex items-center justify-center gap-1.5 rounded-lg bg-line text-fg-muted transition-[color,background-color,transform] duration-150 ease-[var(--ease-out-quint)] hover:bg-elevated hover:text-fg active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 ${
        icon ? `h-8 w-8 flex-shrink-0 ${className}` : variant === 'labeled' ? `flex-shrink-0 ${className}` : 'h-8 w-full text-mini font-normal'
      }`}
    >
      <span key={throws} className={`relative z-[1] flex ${throws ? 'shuffle-throw' : ''}`}><ShuffleGlyph /></span>
      {!icon && <span className="relative z-[1] truncate">{variant === 'labeled' && visibleLabel ? visibleLabel : text}</span>}
      <span aria-hidden className="random-theme-border pointer-events-none absolute inset-0 rounded-lg" />
    </button>
  )
}

/**
 * The inspector's pinned footer on every EDITING tab (Theme and Variables):
 * Undo beside Save brand (a draft) or Get code (a kept brand, whose edits
 * save on their own). Persistence and the way back are not a property of one
 * edition, so they sit under whichever panel is open. Undo
 * walks the same edit history as the canvas header's Undo and ⌘Z, so the
 * doors can't disagree about where you are.
 *
 * Home → Random lands here in explore mode: Random is the primary action
 * (spin another look on this theme) and Save theme is how you keep one.
 */
export default function ThemeSaveBar({
  inactive = false,
  exploringRandom = false,
  onSaved,
  onDiscard,
  onGetCode,
  ship,
  themeKey,
}: {
  /** The three doors out (CSS · Figma · Agent). When given they replace the
   *  Get code primary: a kept brand (or a guest's) ships from here. */
  ship?: ShipActions
  /** Variables: greyed out, both controls. Theme keeps Save live — it is also
   *  the door that leads a guest to create an account. */
  inactive?: boolean
  /** A theme minted from Home → Random, not yet saved. */
  exploringRandom?: boolean
  /** After a successful save while exploring — the shell leaves this mode. */
  onSaved?: () => void
  /** While exploring: throw the draft away and go back to Home to start from
   *  Blank, code or a style. */
  onDiscard?: () => void
  /** Opens Code on this brand. Once the brand is kept this IS the primary
   *  action; without it the kept state shows a quiet "Saved". */
  onGetCode?: () => void
  /** The brand on screen, so a draft inside an already-saved system still
   *  says Save brand. */
  themeKey?: string
}) {
  const { t } = useI18n()
  const access = useAccess()
  const status = useLibraryStatus()
  const unsavedBrands = useUnsavedBrands()
  const [justSaved, setJustSaved] = useState(false)
  const saveRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!justSaved) return
    const id = window.setTimeout(() => setJustSaved(false), 2000)
    return () => window.clearTimeout(id)
  }, [justSaved])

  // A guest gets everything without an account; what it does NOT get is the
  // work kept on Escala. The primary action is the value (Get code), and the
  // notice above offers the two ways to keep it — never a wall.
  const guestPrimary = access.guest && !exploringRandom
  const guestGetCode = guestPrimary && Boolean(onGetCode) && !inactive
  // Two states, not five. A DRAFT (never saved, or a brand the saved system
  // does not hold yet) says Save brand: joining the system is a real decision.
  // Once kept, every edit is filed on its own (`useAutosaveLibrary`), so the
  // primary action is the way out — Get code, the header's own door.
  const draft = status === 'none' || unsavedBrands.has(themeKey ?? '') || exploringRandom
  const kept = !draft && !access.guest
  const use = (kept && Boolean(onGetCode) && !inactive && !justSaved) || guestGetCode
  // The Ship row stands in for the Get code primary wherever that primary
  // would have shown: the brand is kept (or a guest's), so the next move is
  // the way out, and there are three of them, not one.
  // A signed-in DRAFT keeps Save brand as the primary, full width, with the
  // Ship row under it. It used to be the other way round — doors first,
  // Save as a small button on the status line — and people shipped (or
  // left) thinking the brand was already in the system. Keeping it is THE
  // decision on a draft, so it takes the primary's place.
  const draftShip = Boolean(ship) && !inactive && draft && !access.guest && !exploringRandom
  const shipOut = Boolean(ship) && use
  const showAction = !(guestPrimary && inactive)
  const saveBrand = (anchor: HTMLElement | null) => {
    const s = useDesignStore.getState()
    s.saveCurrentSystem()
    if (themeKey) forgetUnsavedBrand(themeKey)
    // To the account now, not after the metering gap: the person just chose
    // to keep it, and the status line under the button says when it landed.
    void flushAccountCloud({ force: true })
    setJustSaved(true)
    // The kept theme throws its OWN colours: accent first, then states.
    const accent = anchor
      ? getComputedStyle(anchor).getPropertyValue('--accent-solid').trim()
      : ''
    burstConfetti(anchor, [
      accent || s.primaryColor, accent || s.primaryColor,
      s.successColor, s.warningColor, s.infoColor, s.errorColor,
    ])
    announceBrandSaved(t, themeKey)
    if (exploringRandom) onSaved?.()
  }
  const label = use
    ? t('Get code')
    : justSaved || kept
    ? t('Saved')
    : guestPrimary
      ? t('Save with an account')
      : t('Save brand')
  return (
    // `[&&]:!flex-none` beats the inspector slot's `[&>*]:!flex-1` (which
    // stretches a portaled panel): as a direct slot child (Variables) the bar
    // must stay its own height, pinned under the scrolling nav.
    <div className={`flex flex-shrink-0 [&&]:!flex-none flex-col gap-2.5 border-t border-line p-[var(--inspector-inset)] ${WORKSPACE_CHROME}`}>
      {exploringRandom && onDiscard && (
        // The way out of a draft: Random mints a real theme the moment it is
        // pressed, and Save is the only other door. Discard removes it and
        // returns to Home, where Blank and From code live.
        <div className="flex items-center gap-2">
          <p className="min-w-0 flex-1 truncate text-caption text-fg-muted">{t('Random draft · not saved')}</p>
          <button
            type="button"
            onClick={onDiscard}
            className="h-7 flex-shrink-0 rounded-lg px-2.5 text-caption font-medium text-fg-muted transition-colors hover:bg-elevated hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
          >
            {t('Discard')}
          </button>
        </div>
      )}
      {/* Undo and Random live on the board's header now
          (`BoardHistoryControls`): this footer is the way OUT, then where the
          work lives. Variables greys the row out; a guest there already has
          the status line's two actions, so a dead grey "Save with an account"
          would only repeat it. */}
      {showAction && (shipOut && ship ? (
        <ShipRow ship={ship} />
      ) : (
      <div className="flex items-center gap-2">
      <button
        ref={saveRef}
        type="button"
        onClick={() => {
          // Already kept (or a guest, for whom code needs no account):
          // straight to Code.
          if (use) { onGetCode?.(); return }
          // A guest signs up first; the shell finishes the save on return.
          if (access.guest) { goToLogin('save-library'); return }
          if (kept) return
          saveBrand(saveRef.current)
        }}
        disabled={inactive || (kept && !use && !justSaved)}
        className={`flex h-8 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg text-caption font-semibold transition-[opacity,box-shadow] duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50 ${
          justSaved ? 'shadow-[0_0_0_4px_color-mix(in_srgb,var(--accent-solid)_35%,transparent)]' : ''
        } ${
          inactive ? 'cursor-not-allowed bg-chip-rest text-fg-faint' : 'bg-cta text-cta-ink disabled:opacity-50'
        }`}
      >
        {/* Saved → a check beside the label, so the dimmed button reads as
            "done", not "unavailable". */}
        {!use && (kept || justSaved) && (
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M2.5 6.5 5 9l4.5-5.5" />
          </svg>
        )}
        {/* Same <> glyph as GetCodeButton elsewhere — one mark for "open Code". */}
        {use && (
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="flex-shrink-0">
            <path d="m5.5 4.5-3.5 3.5 3.5 3.5" />
            <path d="m10.5 4.5 3.5 3.5-3.5 3.5" />
          </svg>
        )}
        <span className="truncate">{label}</span>
      </button>
      </div>
      ))}
      {/* A draft still ships: the three doors sit under Save, not instead of it. */}
      {draftShip && ship && <ShipRow ship={ship} />}
      {/* Last line: where the work lives — "Not saved" for a guest, "Saved to
          your account" (or why not) signed in. Status reads after the action. */}
      {draftShip ? (
        <div className="border-t border-line pt-2.5">
          <UnsavedNotice onSave={saveBrand} quiet />
        </div>
      ) : (guestPrimary || !access.guest) && <FooterStatus guest={guestPrimary} divided={showAction || (exploringRandom && Boolean(onDiscard))} />}
    </div>
  )
}

/** For a visitor with no account: the design system is NOT saved, and here
 *  are the two ways to keep it. Information, not a gate — everything else on
 *  the page works without an account. A system already pushed to GitHub says
 *  where it is, and only offers the account. */
export function UnsavedNotice({ onSave, onDiscard, quiet = false }: {
  /** Signed in, a brand not kept yet: the line's action saves it here
   *  instead of sending to sign-up. Gets the link as the confetti anchor. */
  onSave?: (anchor: HTMLElement | null) => void
  /** A draft that can be thrown away (the create studio's Cancel). */
  onDiscard?: () => void
  /** The Save brand button already sits above this line as the primary:
   *  say "Not saved" without repeating it beside. The ⓘ still offers it. */
  quiet?: boolean
} = {}) {
  const { t } = useI18n()
  const saveLinkRef = useRef<HTMLButtonElement>(null)
  const { guest } = useAccess()
  // First run says "your tokens": "design system" and "brand" wait until
  // there is a second one to tell apart (phase 3 of the entry-flow plan).
  const oneBrand = useDesignStore((s) => myThemeKeys(s.themeOrder, s.themes).length <= 1)
  const githubRepo = useDesignStore((s) => s.githubRepo)
  const githubLastPushAt = useDesignStore((s) => s.githubLastPushAt)
  const onGithub = Boolean(githubRepo && githubLastPushAt)
  const link = 'rounded text-caption font-semibold text-fg underline-offset-2 transition-colors hover:text-accent-ui hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50'
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey) }
  }, [open])
  return (
    <div ref={ref} className="relative flex items-center gap-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="flex items-center gap-1.5 rounded text-caption font-medium text-status-warning transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
      >
        <span aria-hidden className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-status-warning-solid" />
        <span>{t('Not saved')}</span>
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
          <circle cx="8" cy="8" r="6.25" />
          <path d="M8 7.25v3.5" />
          <circle cx="8" cy="5" r="0.5" fill="currentColor" />
        </svg>
      </button>
      {/* The warning carries its own way out, not only behind the ⓘ. */}
      {onDiscard && (
        <button type="button" onClick={onDiscard} className={`ml-auto rounded text-caption font-medium text-fg-muted transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50`}>
          {t('Discard')}
        </button>
      )}
      {onSave && !quiet ? (
        // A real button, not a link: keeping the brand is THE decision on a
        // draft, and as underlined text beside "Not saved" it was missed —
        // people shipped (or left) thinking the brand was already in the system.
        <button ref={saveLinkRef} type="button" onClick={() => onSave(saveLinkRef.current)} className={`${onDiscard ? '' : 'ml-auto '}flex h-7 flex-shrink-0 items-center gap-1.5 rounded-lg bg-cta px-2.5 text-caption font-semibold text-cta-ink transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50`}>
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M2.5 6.5 5 9l4.5-5.5" />
          </svg>
          {t('Save brand')}
        </button>
      ) : guest && !onSave ? (
        // A button, like Save brand above: for a visitor this IS the one way
        // to keep the work, and as an underlined line it read as a footnote.
        <button type="button" onClick={() => goToLogin('save-library')} className={`${onDiscard ? '' : 'ml-auto '}flex h-7 flex-shrink-0 items-center rounded-lg bg-cta px-2.5 text-caption font-semibold text-cta-ink transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50`}>
          {t('Save with an account')}
        </button>
      ) : null}
      {open && (
        <div role="dialog" aria-label={t('Not saved')} className="absolute bottom-full left-0 z-20 mb-2 flex w-full min-w-[220px] flex-col gap-2 rounded-lg border border-line-strong bg-elevated px-3 py-2.5 shadow-lg">
          <p className="m-0 text-caption leading-snug text-fg-muted">
            {onSave
              ? t('Not saved. This brand is not in your design system yet.')
              : onGithub
              ? t('On GitHub ({repo}), not saved on Escala. It stays in this browser.', { repo: githubRepo ?? '' })
              : oneBrand
                ? t('Not saved. Your tokens live only in this browser.')
                : t('Not saved. This design system lives only in this browser.')}
          </p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {onSave ? (
              <button type="button" onClick={() => { setOpen(false); onSave(saveLinkRef.current) }} className={link}>
                {t('Save brand')}
              </button>
            ) : (
              <button type="button" onClick={() => { setOpen(false); goToLogin('save-library') }} className={link}>
                {t('Save with an account')}
              </button>
            )}
            {/* GitHub needs an account, so a visitor's only way to keep the
                system is saving with one. */}
            {!onSave && !onGithub && !guest && (
              <button type="button" onClick={() => { setOpen(false); requestOpenGithub() }} className={link}>
                {t('Push to GitHub')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/** Previous step — an icon square so it never competes with the primary
 *  action for the footer's width. Named for assistive tech and hover. */
function BackButton({ onClick }: { onClick: () => void }) {
  const { t } = useI18n()
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={t('Back')}
      title={t('Back')}
      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-line text-fg-muted transition-[color,border-color,transform] duration-150 ease-[var(--ease-out-quint)] hover:border-line-strong hover:text-fg active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M13 8H3M7 4 3 8l4 4" />
      </svg>
    </button>
  )
}

/**
 * The footer while a theme is in GUIDED SETUP (`lib/themeSetup`): which step
 * this is, the step's action and the way out. The action names what really
 * happens: Continue on every step, Finish on the last. "Skip setup" ends the
 * guide at once, leaving every remaining edition at its default.
 */
export function ThemeSetupBar({ themeKey }: { themeKey: string }) {
  const { t } = useI18n()
  const step = useSetupStep(themeKey) ?? 0
  const last = step === SETUP_STEPS.length - 1
  // Same predictable CTA as the create studio: Continue, then Finish.
  const label = last ? t('Finish') : t('Continue')

  const finishRef = useRef<HTMLButtonElement>(null)
  const done = () => showToast(t('Your brand is ready — every edition is open now.'))
  // The finished theme throws its OWN colours: accent first, then the states.
  const celebrate = () => {
    const s = useDesignStore.getState()
    const tk = resolvePreviewTokens(s, themeKey, s.themeKinds[themeKey] ?? 'light')
    burstConfetti(finishRef.current, [tk.brandSolid, tk.brandSolid, tk.successColor ?? '', tk.warningColor ?? '', tk.infoColor ?? '', tk.errorColor])
  }
  return (
    <div className={`flex flex-shrink-0 flex-col gap-2.5 border-t border-line p-[var(--inspector-inset)] ${WORKSPACE_CHROME}`}>
      <div className="flex items-center gap-2">
        <span className="text-caption font-semibold text-fg">{t('Step {n} of {total}', { n: step + 1, total: SETUP_STEPS.length })}</span>
        <span className="flex flex-1 gap-1" aria-hidden>
          {SETUP_STEPS.map((s, i) => (
            <span key={s} className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-accent-solid' : 'bg-fg/10'}`} />
          ))}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {step > 0 && <BackButton onClick={() => retreatThemeSetup(themeKey)} />}
        <button
          type="button"
          onClick={() => { finishThemeSetup(themeKey); done() }}
          className="h-8 flex-shrink-0 rounded-lg px-2.5 text-caption font-medium text-fg-muted transition-colors hover:bg-elevated hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
        >
          {t('Skip setup')}
        </button>
        <button
          ref={finishRef}
          type="button"
          onClick={() => { if (advanceThemeSetup(themeKey)) { celebrate(); done() } }}
          className="flex h-8 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg bg-cta text-caption font-semibold text-cta-ink transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
        >
          <span className="truncate">{label}</span>
          {!last && (
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M3 8h10M9 4l4 4-4 4" />
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}

/**
 * Home's create studio footer. No step count, no Continue: the brand is minted
 * the moment the studio opens and every foundation is a row of the accordion
 * above, edited in any order. "Create brand" shows only when that mint failed
 * (the brand cap) and retries it. The ways out are the Ship row (a guest) or
 * Save + the Ship row (signed in).
 */
export function CreateStudioFooter({
  error, committed, guest, onCancel, onCreate, onSave, onGetCode, ship,
}: {
  /** The three doors out once the brand exists. Replaces the Get code button. */
  ship?: ShipActions
  error?: string | null
  /** The brand exists (its colours were set). */
  committed: boolean
  guest: boolean
  onCancel?: () => void
  onCreate: () => void
  /** Gets the pressed control, so the save can celebrate from it. */
  onSave: (anchor?: HTMLElement | null) => void
  onGetCode: () => void
}) {
  const { t } = useI18n()
  const primary = 'flex h-8 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg bg-cta px-3 text-caption font-semibold text-cta-ink transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50'
  const secondary = 'h-8 flex-shrink-0 rounded-lg border border-line bg-surface px-2.5 text-caption font-medium text-fg transition-colors hover:bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50'
  const codeGlyph = (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="flex-shrink-0">
      <path d="m5.5 4.5-3.5 3.5 3.5 3.5" />
      <path d="m10.5 4.5 3.5 3.5-3.5 3.5" />
    </svg>
  )
  const cancelButton = onCancel ? (
    <button
      type="button"
      onClick={onCancel}
      className="h-8 flex-shrink-0 rounded-lg px-1 text-caption font-medium text-fg-muted transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
    >
      {t('Cancel')}
    </button>
  ) : null
  return (
    // Same chrome as a saved brand's footer (ThemeSaveBar), not `bg-app`.
    <div className={`flex flex-shrink-0 flex-col gap-2.5 border-t border-line p-[var(--inspector-inset)] ${WORKSPACE_CHROME}`}>
      {error && <p role="alert" className="text-caption text-status-danger">{error}</p>}
      {committed && ship ? (
        // The SAME layout as a draft's footer in the editor (ThemeSaveBar):
        // Save brand as the primary, the three doors under it, then the
        // status line with Discard. A guest has no save here, so the doors
        // lead and the line offers the account.
        <>
          {!guest && (
            <div className="flex items-center gap-2">
              <button type="button" onClick={(e) => onSave(e.currentTarget)} className={primary}>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M2.5 6.5 5 9l4.5-5.5" />
                </svg>
                <span className="truncate">{t('Save brand')}</span>
              </button>
            </div>
          )}
          <ShipRow ship={ship} />
          <div className="border-t border-line pt-2.5">
            <UnsavedNotice onSave={guest ? undefined : (anchor) => onSave(anchor)} onDiscard={onCancel} quiet={!guest} />
          </div>
        </>
      ) : (
      <div className="flex items-center gap-2">
        {cancelButton}
        {!committed ? (
          <button type="button" onClick={onCreate} className={primary}>
            <span className="truncate">{t('Create brand')}</span>
          </button>
        ) : guest ? (
          // One way out: the code. "Open in editor" sat beside it and read as a
          // second editor, while the visitor is already in one.
          <button type="button" onClick={onGetCode} className={primary}>{codeGlyph}<span className="truncate">{t('Get code')}</span></button>
        ) : (
          <>
            <button type="button" onClick={onGetCode} className={`${secondary} flex items-center gap-1.5`}>{codeGlyph}{t('Get code')}</button>
            <button type="button" onClick={(e) => onSave(e.currentTarget)} className={primary}><span className="truncate">{t('Save brand')}</span></button>
          </>
        )}
      </div>
      )}
      {committed && !ship && <FooterStatus guest={guest} />}
    </div>
  )
}

/** Create-studio footer on the canvas card — same language as the plugin
 *  setup bar: which step this is, Cancel (discard the theme being made),
 *  Skip setup, and a Continue that names what it keeps ("Use Inter →"). */
export function CreateStudioBar({
  stepIndex,
  total,
  continueLabel,
  last,
  onCancel,
  onBack,
  onSkip,
  onContinue,
  error,
}: {
  /** Why the last action did nothing (a plan limit, a taken name). */
  error?: string | null
  stepIndex: number
  total: number
  continueLabel: string
  last: boolean
  /** Leave without keeping the theme. The caller deletes it if it was already
   *  minted. Omitted when there is nowhere to go back to (a first visit). */
  onCancel?: () => void
  /** Previous step. When given it replaces Cancel: past the first step the
   *  way out is Skip setup, and the way BACK is this — one door per intent. */
  onBack?: () => void
  onSkip: () => void
  onContinue: () => void
}) {
  const { t } = useI18n()
  return (
    <div className="flex flex-shrink-0 flex-col gap-2.5 border-t border-line bg-app px-3 py-3">
      {error && <p role="alert" className="text-caption text-status-danger">{error}</p>}
      <div className="flex items-center gap-2">
        <span className="text-caption font-semibold text-fg">{t('Step {n} of {total}', { n: stepIndex + 1, total })}</span>
        <span className="flex flex-1 gap-1" aria-hidden>
          {Array.from({ length: total }, (_, i) => (
            <span key={i} className={`h-1 flex-1 rounded-full ${i <= stepIndex ? 'bg-accent-solid' : 'bg-fg/10'}`} />
          ))}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {onBack ? (
          <BackButton onClick={onBack} />
        ) : onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="h-8 flex-shrink-0 rounded-lg px-1 text-caption font-medium text-fg-muted transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
          >
            {t('Cancel')}
          </button>
        )}
        <button
          type="button"
          onClick={onSkip}
          className="h-8 flex-shrink-0 rounded-lg border border-line bg-surface px-2.5 text-caption font-medium text-fg transition-colors hover:bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
        >
          {t('Skip setup')}
        </button>
        <button
          type="button"
          onClick={onContinue}
          className="flex h-8 min-w-[7rem] flex-1 items-center justify-center gap-1.5 rounded-lg bg-cta px-3 text-caption font-semibold text-cta-ink transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50"
        >
          <span className="truncate">{continueLabel}</span>
          {!last && (
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M3 8h10M9 4l4 4-4 4" />
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}
