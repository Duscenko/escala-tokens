// The phone generator (plans: `design-plans/mobile-theme-sheet.md`, and
// `mobile-bento-action-bar.md` for the bento preview): a live
// preview painted by a system, and a Theme sheet docked at the bottom that
// changes it. PHONE ONLY — `AboutHome` mounts it below `md` (`useIsPhone`);
// desktop never renders it.
//
// A bar of three buttons floats at the bottom while the preview is on screen
// (plan `mobile-bento-action-bar.md`, phase 2): SHUFFLE (painted by the system
// on screen), COPY PROMPT (the system as an agent brief, `systemBrief`) and
// CONTROLS, which opens the sheet: the quick brand colours and four tabs —
// Color · Type · Shape · Export. Closed, the sheet is off screen. Every control is a PICK from a list the desktop ships (rule 9: no
// hex box, no free px), see `lib/mobileTheme.ts`. The system is a try-on
// (`stylePreviewStore`): nothing is written to the store.
//
// State in the URL: `?sheet=<tab>` while open, nothing while folded
// (`readThemeSheet` / `writeThemeSheet`), replaced — never pushed.
//
// NOT A DIALOG. The sheet is a docked region that sits OVER the page while
// the preview is on screen: the page behind must keep scrolling and taking
// taps. Vaul was tried and dropped — it is a Radix Dialog underneath, always
// modal, so it set `pointer-events: none` on <body> and trapped focus in the
// sheet (the rest of About could not be scrolled on a phone). `ThemeDock` is
// a framer-motion drag (open, or dragged down to close), like `InspectorSheet`.
// `prefers-reduced-motion`: the sheet and the bar jump, no slide.

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore, type KeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { animate, motion, useDragControls, useMotionValue, useReducedMotion } from 'framer-motion'
import { useI18n } from '../../lib/i18n'
import { useTheme } from '../../lib/theme'
import { useDesignStore } from '../../store/useDesignStore'
import { resolvePreviewTokens } from '../../lib/previewTokens'
import { stylePreviewStore } from '../../lib/stylePreviewOverlay'
import { THEME_STYLE_PRESETS, type ThemeStylePreset } from '../../lib/themePresets'
import { resolveThemeFoundations } from '../../lib/themeFoundations'
import { createShuffleDeck, nextShuffle, stylePreviewFromRecipe, RANDOM_THEME_LABEL } from '../../lib/randomTheme'
import { inferTypeScaleMode } from '../../lib/typographyStandard'
import { loadGoogleFont } from '../../lib/fonts'
import { trackEvent } from '../../lib/analytics'
import { haptic, hapticEngine, hapticsEnabled, setHapticsEnabled, subscribeHaptics } from '../../lib/haptics'
import { BRAND_SPECTRUM, type ColorPreset } from '../../lib/brandPalette'
import { radiusPresetPx } from '../../lib/layoutTokens'
import { decodeRemix, encodeRemix, remixPreset, remixUrl, takeIncomingRemix } from '../../lib/remixLink'
import { displayHex } from '../../lib/tokenInspector'
import { readableInk } from '../../lib/colorUtils'
import {
  RADIUS_ROLE_PRESETS, SECTION_LOCKS, SHEET_FONTS, SHEET_SPACING, SHEET_TYPE_SCALES, SPACING_MODES,
  applyLocks, basePx, cssVariables, readLocks, readPreviewView, readThemeSheet, writePreviewView, roleContrast, sameHex, sheetChoices,
  chromeFromRoles, shuffleSection, systemBrief, withAccent, withFont, withRadiusPreset, withSpacingMode, withTypeScale, writeLocks, writeThemeSheet,
  type LockKey, type PreviewView, type SheetSection, type ThemeSheetState, type ThemeSheetTab,
} from '../../lib/mobileTheme'
import { showToast } from '../ui/Toast'
import { MobilePreview } from './MobilePreviewViews'
import { FoundationGlyph } from './FoundationIconRail'
import { DotSlider } from './ThemeQuickSettingsRail'
import { AgentGlyph, CodeGlyph, RollingDie, SHIP_BUTTON } from './ThemeSaveBar'
import { FigmaGlyph } from '../ui/icons'
import { cn } from '../../lib/utils'

/** Cupertino / Glass — the system a visitor starts on (Core is one Shuffle away). */
const START = THEME_STYLE_PRESETS.find((p) => p.id === 'cupertino-glass') ?? THEME_STYLE_PRESETS[0]

/** How long "Copied" stays on the Copy prompt button (ms). */
const COPIED_MS = 1600

/** Each page of the Controls panel, by title. */
const PAGE_TITLE: Record<ThemeSheetTab, string> = {
  edit: 'Edit', color: 'Color', type: 'Font', radius: 'Radius', spacing: 'Spacing', style: 'Style', export: 'Export',
}
const LOCK_LABEL: Record<LockKey, string> = { accent: 'brand color', font: 'font', scale: 'base size', radius: 'radius', spacing: 'spacing' }

/** `styleId`: a System Style dealt whole (it names the sheet). `baseName`:
 *  the name a picked-over system keeps — Core stays Core after a new colour. */
interface DemoSystem { preset: ThemeStylePreset; styleId?: string; scaffoldId?: string; moodId?: string; baseName?: string }
const START_SYSTEM: DemoSystem = { preset: START, styleId: START.id }

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50'
const FOCUS_INSET = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-ui/50'
/** The rail's row inset (`--inspector-inset`), so phone and desktop line up alike. */
const INSET = 'px-[var(--inspector-inset)]'

/** Arrow keys inside a radio group: move AND pick, focus follows (WAI-ARIA
 *  radio pattern). Returns true when the key was handled. */
function radioKeys(e: KeyboardEvent, index: number, count: number, pick: (i: number) => void): boolean {
  const next = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? (index + 1) % count
    : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? (index - 1 + count) % count
      : e.key === 'Home' ? 0 : e.key === 'End' ? count - 1 : null
  if (next == null) return false
  e.preventDefault()
  pick(next)
  const group = (e.currentTarget as HTMLElement).closest('[role="radiogroup"]')
  requestAnimationFrame(() => group?.querySelectorAll<HTMLElement>('[role="radio"]')[next]?.focus())
  return true
}

/** The share sheet where there is one, the clipboard where there is not. */
async function handOff(url: string, t: (s: string) => string) {
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Escala Tokens', text: t('A design system I shuffled on Escala Tokens'), url })
      trackEvent({ name: 'mobile_handoff', props: { via: 'share' } })
      return
    } catch (error) {
      if ((error as DOMException)?.name === 'AbortError') return
    }
  }
  try {
    await navigator.clipboard.writeText(url)
    trackEvent({ name: 'mobile_handoff', props: { via: 'copy' } })
    showToast(t('Link copied. Open it on your laptop.'))
  } catch {
    showToast(t('Could not copy the link.'), undefined, true)
  }
}

// ── Glyphs ──────────────────────────────────────────────────────────────────

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round', strokeLinejoin: 'round' } as const

function PaletteGlyph({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path d="M12 3a9 9 0 1 0 0 18c1.2 0 1.8-.8 1.8-1.7 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-1 .8-1.7 1.7-1.7H16a5 5 0 0 0 5-5C21 6.4 17 3 12 3Z" {...stroke} />
      <circle cx="7.5" cy="11" r="1.2" fill="currentColor" />
      <circle cx="10" cy="7" r="1.2" fill="currentColor" />
      <circle cx="14.5" cy="7" r="1.2" fill="currentColor" />
    </svg>
  )
}

function CopyGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <rect x="8.5" y="8.5" width="11" height="11" rx="2" {...stroke} />
      <path d="M15.5 8.5V6a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5" {...stroke} />
    </svg>
  )
}

function SlidersGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <path d="M4 7h9M17 7h3M4 17h3M11 17h9" {...stroke} />
      <circle cx="15" cy="7" r="2" {...stroke} />
      <circle cx="9" cy="17" r="2" {...stroke} />
    </svg>
  )
}

function LockGlyph({ on }: { on: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <rect x="5" y="10.5" width="14" height="10" rx="2.5" {...stroke} fill={on ? 'currentColor' : 'none'} />
      <path d={on ? 'M8 10.5V7.5a4 4 0 0 1 8 0v3' : 'M8 10.5V7.5a4 4 0 0 1 7.5-1.9'} {...stroke} />
    </svg>
  )
}

function CheckGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden>
      <path d="m5 12 5 5 9-10" {...stroke} strokeWidth={2.4} />
    </svg>
  )
}

function VibrateGlyph({ on }: { on: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <rect x="8" y="4" width="8" height="16" rx="2" {...stroke} />
      {on
        ? <path d="M4.5 9v6M19.5 9v6M2 10.5v3M22 10.5v3" {...stroke} />
        : <path d="M3 3l18 18" {...stroke} />}
    </svg>
  )
}

function LaptopGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
      <rect x="3" y="3.5" width="10" height="7" rx="1" {...stroke} />
      <path d="M1.5 12.5h13" {...stroke} />
    </svg>
  )
}

/** A corner drawn at a radius (capped to the mark), for the Radius cards. */
function CornerMark({ px, on }: { px: number; on: boolean }) {
  return (
    <span
      className={cn('h-5 w-5 border-l-2 border-t-2', on ? 'border-accent-ui' : 'border-fg-muted')}
      style={{ borderTopLeftRadius: Math.min(px, 18) }}
      aria-hidden
    />
  )
}

// ── The panel, in the desktop rail's language ───────────────────────────────
// Rows, headers, settings and the dot stepper are the ones the desktop Theme
// panel draws (`ThemeQuickSettingsRail`: `EditList`, `PanelHeader`,
// `SettingItem`, `DotSlider`), at phone touch sizes.

/** A lock: what survives a shuffle. Filled and in ink when on. 44px target
 *  that overhangs its label line instead of making it taller. */
function LockButton({ on, name, onToggle, t }: { on: boolean; name: string; onToggle: () => void; t: (s: string, v?: Record<string, string>) => string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={t('Lock {name}', { name: t(name) })}
      title={t(on ? 'Locked: shuffles keep it' : 'Lock it to keep it through shuffles')}
      onClick={onToggle}
      className={cn('-my-3.5 -mr-2.5 grid h-11 w-11 flex-shrink-0 place-items-center rounded-lg transition-[color,background-color,transform] hover:bg-fg/[0.06] active:scale-90', on ? 'text-fg' : 'text-fg-faint hover:text-fg', FOCUS)}
    >
      <LockGlyph on={on} />
    </button>
  )
}

/** One setting on a page (the rail's `SettingItem`): a quiet label, its
 *  trailing bits (a value, a lock), then the control. */
function SettingBlock({ label, trailing, children }: { label: string; trailing?: ReactNode; children: ReactNode }) {
  const id = useId()
  return (
    <section aria-labelledby={id} className="min-w-0 py-[var(--inspector-inset)]">
      <div className="mb-2 flex min-h-4 items-center justify-between gap-2">
        <h4 id={id} className="m-0 min-w-0 truncate text-caption font-medium text-fg-muted">{label}</h4>
        {trailing && <span className="flex flex-shrink-0 items-center gap-2">{trailing}</span>}
      </div>
      {children}
    </section>
  )
}

/** A page's band (the rail's `PanelHeader`): back, title, one action. */
function PageHeader({ title, titleRef, onBack, trailing, t }: {
  title: string
  titleRef?: React.Ref<HTMLHeadingElement>
  onBack?: () => void
  trailing?: ReactNode
  t: (s: string) => string
}) {
  return (
    <div className={cn('flex min-h-[52px] flex-shrink-0 items-center gap-1 border-b border-line', INSET)}>
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          aria-label={t('Back')}
          className={cn('-ml-2.5 grid h-11 w-11 flex-shrink-0 place-items-center rounded-lg text-fg transition-colors hover:bg-fg/[0.06] active:scale-95', FOCUS)}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M13 8H3M7 4 3 8l4 4" />
          </svg>
        </button>
      )}
      <h3 ref={titleRef} tabIndex={-1} className="m-0 min-w-0 flex-1 truncate text-title font-normal text-fg outline-none">{title}</h3>
      {trailing}
    </div>
  )
}

/** A row of the Edit list (the rail's `EditList`): glyph · name · what it is
 *  now · chevron. */
function EditRow({ glyph, label, summary, onClick }: { glyph: ReactNode; label: string; summary?: ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('group flex h-[52px] w-full items-center gap-3 border-b border-line text-left transition-colors last:border-b-0 active:bg-fg/[0.04]', FOCUS_INSET)}
    >
      <span className="grid h-[18px] w-[18px] flex-shrink-0 place-items-center text-fg-muted group-hover:text-fg">{glyph}</span>
      <span className="min-w-0 flex-1 truncate text-strong text-fg">{label}</span>
      {summary != null && <span className="flex min-w-0 max-w-[48%] items-center gap-1.5 truncate text-caption text-fg-muted">{summary}</span>}
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden className="flex-shrink-0 text-fg-faint group-hover:text-fg">
        <path d="m4.5 2.5 3.5 3.5-3.5 3.5" />
      </svg>
    </button>
  )
}

/** A choice as a list row (fonts, styles): the rail's row, a check on the
 *  picked one. Lives in a `radiogroup`; arrows move and pick. */
function OptionRow({ on, tabbable, label, detail, lead, onPick, onKeyDown }: {
  on: boolean
  tabbable: boolean
  label: string
  detail?: string
  lead?: ReactNode
  onPick: () => void
  onKeyDown: (e: KeyboardEvent) => void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      tabIndex={tabbable ? 0 : -1}
      onClick={() => { if (!on) onPick() }}
      onKeyDown={onKeyDown}
      className={cn('group flex min-h-[52px] w-full items-center gap-3 border-b border-line py-2 text-left transition-colors last:border-b-0 active:bg-fg/[0.04]', FOCUS_INSET)}
    >
      {lead}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className={cn('truncate text-strong', on ? 'text-fg' : 'text-fg-muted group-hover:text-fg')}>{label}</span>
        {detail && <span className="truncate text-caption text-fg-faint">{detail}</span>}
      </span>
      <span className={cn('grid h-5 w-5 flex-shrink-0 place-items-center text-accent-ui transition-opacity', on ? 'opacity-100' : 'opacity-0')} aria-hidden><CheckGlyph /></span>
    </button>
  )
}

/** Two crossing arrows — the desktop's "Random tweak" mark. */
function ShuffleMark() {
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

/** A page's own shuffle, drawn as the desktop's Random tweak (the animated
 *  conic border, `random-theme-border`). A 44px target around a 32px pill. */
function SectionShuffle({ label, disabled, onClick, t }: { label: string; disabled: boolean; onClick: () => void; t: (s: string) => string }) {
  const [throws, setThrows] = useState(0)
  return (
    <button
      type="button"
      onClick={() => { setThrows((n) => n + 1); onClick() }}
      disabled={disabled}
      aria-label={label}
      title={disabled ? t('Everything here is locked') : label}
      className={cn('group -mr-1 flex h-11 flex-shrink-0 items-center px-1 disabled:opacity-40', FOCUS)}
    >
      <span className="relative flex h-8 items-center gap-1.5 rounded-lg bg-line px-3 text-caption text-fg-muted transition-[color,background-color,transform] duration-150 ease-[var(--ease-out-quint)] group-hover:bg-elevated group-hover:text-fg group-active:scale-[0.97]">
        <span key={throws} className={cn('relative z-[1] flex', throws ? 'shuffle-throw' : '')}><ShuffleMark /></span>
        <span className="relative z-[1]">{t('Shuffle')}</span>
        {!disabled && <span aria-hidden className="random-theme-border pointer-events-none absolute inset-0 rounded-lg" />}
      </span>
    </button>
  )
}

/** A colour swatch as a radio: 44px target, the colour inside, a check on
 *  the picked one in ink that reads on it. */
function Swatch({ color, on, tabbable, onPick, onKeyDown, size = 'md' }: {
  color: ColorPreset
  on: boolean
  tabbable: boolean
  onPick: () => void
  onKeyDown: (e: KeyboardEvent) => void
  size?: 'md' | 'lg'
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      aria-label={color.label}
      title={color.label}
      tabIndex={tabbable ? 0 : -1}
      onClick={onPick}
      onKeyDown={onKeyDown}
      className={cn('flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full', FOCUS)}
    >
      <span
        className={cn(
          'flex items-center justify-center rounded-full ring-1 ring-black/10 transition-transform duration-150 ease-[var(--ease-out-quint)] active:scale-90 dark:ring-white/15',
          size === 'lg' ? 'h-10 w-10' : 'h-8 w-8',
          on && 'ring-2 ring-fg ring-offset-2 ring-offset-app dark:ring-fg',
        )}
        style={{ background: color.hex, color: readableInk(color.hex) }}
      >
        {on && <CheckGlyph />}
      </span>
    </button>
  )
}

function ColorRadios({ colors, current, onPick, label, size, className }: {
  colors: ColorPreset[]
  current: string
  onPick: (c: ColorPreset) => void
  label: string
  size?: 'md' | 'lg'
  className?: string
}) {
  const picked = colors.findIndex((c) => sameHex(c.hex, current))
  return (
    <div role="radiogroup" aria-label={label} className={className}>
      {colors.map((c, i) => (
        <Swatch
          key={c.hex}
          color={c}
          size={size}
          on={i === picked}
          tabbable={i === (picked < 0 ? 0 : picked)}
          onPick={() => { if (i !== picked) onPick(c) }}
          onKeyDown={(e) => radioKeys(e, i, colors.length, (n) => { if (n !== picked) onPick(colors[n]) })}
        />
      ))}
    </div>
  )
}

// ── The dock ────────────────────────────────────────────────────────────────

/** Velocity (px/s) past which a flick picks its direction's stop. */
const FLICK = 400
const EASE = [0.32, 0.72, 0, 1] as const

/** The dock's frame: fixed to the bottom, portaled to <body> (no transformed
 *  ancestor can trap its `fixed`), 86% of the screen tall. Folded, only its
 *  pinned top shows — Theme, Shuffle, Copy prompt, Controls — measured, not
 *  guessed (`peekRef`); open, the Controls panel shows under it. */
function ThemeDock({ id, visible, open, onOpenChange, onPeek, labelledBy, describedBy, children }: {
  id: string
  visible: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The folded height in px, for the page to keep its end clear of it. */
  onPeek: (px: number) => void
  labelledBy: string
  describedBy: string
  children: (startDrag: (e: ReactPointerEvent) => void, peekRef: React.Ref<HTMLDivElement>) => ReactNode
}) {
  const reduceMotion = useReducedMotion() ?? false
  const ref = useRef<HTMLElement>(null)
  const [height, setHeight] = useState(0)
  const [peek, setPeek] = useState(0)
  const peekRef = useRef<HTMLDivElement>(null)
  const controls = useDragControls()
  const y = useMotionValue(typeof window === 'undefined' ? 0 : window.innerHeight)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      setHeight(el.offsetHeight)
      const top = peekRef.current?.offsetHeight ?? 0
      setPeek(top)
      onPeek(top)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    if (peekRef.current) ro.observe(peekRef.current)
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const folded = Math.max(0, height - peek)
  const target = !visible ? height + 24 : open ? 0 : folded
  const settle = (to: number) => {
    if (reduceMotion) y.set(to)
    else animate(y, to, { duration: 0.32, ease: EASE })
  }
  // Re-run on every target change; a drag that lets go on the SAME stop
  // settles in `onDragEnd`, since the target did not change.
  useEffect(() => {
    if (height) settle(target)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, height])

  // Esc closes an open sheet, wherever focus is inside it.
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && open) { e.preventDefault(); onOpenChange(false) }
  }

  return createPortal(
    <>
      {/* Open, the page dims and a tap outside folds the dock. Folded,
          nothing covers the page but the dock's own pinned top. */}
      <div
        aria-hidden
        onClick={() => onOpenChange(false)}
        className={cn(
          'fixed inset-0 z-[60] bg-black/40 transition-opacity duration-300 ease-[var(--ease-out-quint)] motion-reduce:transition-none',
          open && visible ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      />
      <motion.section
        ref={ref}
        id={id}
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        // Off screen it is out of the tab order and the accessibility tree.
        inert={!visible}
        onKeyDown={onKeyDown}
        drag="y"
        dragListener={false}
        dragControls={controls}
        dragConstraints={{ top: 0, bottom: folded }}
        dragElastic={{ top: 0.04, bottom: 0.04 }}
        dragMomentum={false}
        onDragEnd={(_, info) => {
          const next = info.velocity.y < -FLICK ? true
            : info.velocity.y > FLICK ? false
              : y.get() < folded / 2
          onOpenChange(next)
          settle(next ? 0 : folded)
        }}
        style={{ y, visibility: height ? undefined : 'hidden' }}
        className="fixed inset-x-0 bottom-0 z-[61] flex h-[86dvh] touch-manipulation flex-col rounded-t-2xl border-t border-line bg-app text-fg shadow-2xl outline-none [-webkit-tap-highlight-color:transparent]"
      >
        {children((e) => controls.start(e), peekRef)}
      </motion.section>
    </>,
    document.body,
  )
}

type CopyState = 'idle' | 'copied' | 'failed'

// ── The generator ───────────────────────────────────────────────────────────

export function MobileGenerator() {
  const { t } = useI18n()
  const chrome = useTheme()
  const reduceMotion = useReducedMotion() ?? false
  const titleId = useId()
  const descId = useId()
  const sheetId = useId()

  // ── The system: Core, or whatever the visitor picked / shuffled to ──
  const [system, setSystem] = useState<DemoSystem>(START_SYSTEM)
  // Off until the visitor's first shuffle or pick; from then on the whole
  // phone home wears the system (see the effect under `roles`).
  const [painted, setPainted] = useState(false)
  // The starting style's own fonts, so the first paint is already in them.
  useEffect(() => {
    const type = START.foundations.typography
    loadGoogleFont(type?.fontFamily ?? '')
    loadGoogleFont(type?.headingFontFamily ?? '')
  }, [])
  // The style picker: null = any style; an id keeps every Shuffle inside it.
  const [styleFilter, setStyleFilter] = useState<string | null>(null)
  const deck = useRef(createShuffleDeck())
  const shuffles = useRef(0)
  const [spins, setSpins] = useState(0)
  const preset = system.preset

  const overlayFor = (mode: 'light' | 'dark', p: ThemeStylePreset = preset) => ({
    ...stylePreviewStore(useDesignStore.getState(), { preset: p, appearance: mode }, mode),
    semanticArchitecture: 'categorical' as const,
  })
  /** What a preset resolves to on screen — the base a lock reads from. */
  const resolveBase = (p: ThemeStylePreset) => resolveThemeFoundations(overlayFor(chrome, p), chrome)
  const overlay = useMemo(() => overlayFor(chrome), [preset, chrome]) // eslint-disable-line react-hooks/exhaustive-deps
  const tokens = useMemo(() => resolvePreviewTokens(overlay, chrome, chrome, 'mobile'), [overlay, chrome])
  const base = useMemo(() => resolveThemeFoundations(overlay, chrome), [overlay, chrome])
  const choices = sheetChoices(base)
  // Both appearances' roles: the Color tab measures the one on screen, the
  // CSS export ships both.
  const roles = useMemo(() => {
    const rolesIn = (mode: 'light' | 'dark') => resolvePreviewTokens(overlayFor(mode), mode, mode, 'mobile').archTokens ?? {}
    return { light: rolesIn('light'), dark: rolesIn('dark') }
  }, [preset]) // eslint-disable-line react-hooks/exhaustive-deps
  const contrast = useMemo(() => roleContrast(roles[chrome]), [roles, chrome])

  // ── The home in the system ──
  // Once painted, the chrome's own variables on <html> take the system's
  // roles (`chromeFromRoles`): the page, the hero's CTA, the dock, the type —
  // everything the visitor sees becomes the system they just shuffled. The
  // appearance toggle still works: it re-resolves the roles for that mode.
  // Leaving the page (unmount) hands the chrome back untouched.
  const chromeVars = useMemo(
    () => chromeFromRoles(roles[chrome], base.typography.fontFamily),
    [roles, chrome, base.typography.fontFamily],
  )
  useEffect(() => {
    if (!painted) return
    const root = document.documentElement.style
    for (const [name, value] of Object.entries(chromeVars)) root.setProperty(name, value)
    return () => { for (const name of Object.keys(chromeVars)) root.removeProperty(name) }
  }, [painted, chromeVars])
  const css = useMemo(() => cssVariables({
    light: roles.light,
    dark: roles.dark,
    fontFamily: base.typography.fontFamily,
    textBase: base.typography.sizes['text-md'],
    radiusRoles: base.radiusRoles,
    radius: base.radius,
  }), [roles, base])

  const accentHex = tokens.archTokens?.['action.primary.default'] ?? preset.accent
  const ramp = tokens.brandRamp
  const systemName = system.styleId
    ? THEME_STYLE_PRESETS.find((p) => p.id === system.styleId)?.label ?? preset.label
    : system.baseName ?? t(RANDOM_THEME_LABEL)

  // A pick re-paints the system: no longer that style whole, still its name.
  const edit = (next: ThemeStylePreset) => {
    haptic('tick')
    setPainted(true)
    setSystem({ preset: next, scaffoldId: system.scaffoldId, moodId: system.moodId, baseName: systemName })
  }

  // ── Locks: what a shuffle keeps, mirrored to `?lock=` ──
  const [locks, setLocks] = useState<ReadonlySet<LockKey>>(() => readLocks(window.location.search))
  const toggleLock = (key: LockKey) => {
    haptic('tick')
    setLocks((now) => {
      const next = new Set(now)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }
  const lockFor = (key: LockKey) => (
    <LockButton on={locks.has(key)} name={LOCK_LABEL[key]} onToggle={() => toggleLock(key)} t={t} />
  )

  // A section's own dice: only its unlocked choices move (`shuffleSection`).
  const shuffleOnly = (section: SheetSection) => {
    const next = shuffleSection(section, preset, base, locks)
    if (next === preset) return
    loadGoogleFont(next.foundations.typography?.fontFamily ?? '')
    edit(next)
  }

  // A style picked from the list lands whole (locks still hold), and from then
  // on Shuffle stays inside it. "Any style" only lifts that limit.
  const pickStyle = (id: string | null) => {
    haptic('tick')
    setStyleFilter(id)
    const style = id ? THEME_STYLE_PRESETS.find((p) => p.id === id) : undefined
    if (!style) return
    const type = style.foundations.typography
    loadGoogleFont(type?.fontFamily ?? '')
    loadGoogleFont(type?.headingFontFamily ?? '')
    const kept = applyLocks(style, resolveBase(style), preset, base, locks)
    const whole = kept === style
    setPainted(true)
    setSystem({ preset: kept, styleId: whole ? style.id : undefined, baseName: whole ? undefined : style.label, scaffoldId: style.id })
  }
  const filterStyle = styleFilter ? THEME_STYLE_PRESETS.find((p) => p.id === styleFilter) : undefined

  const shuffle = () => {
    haptic('tap')
    const type = preset.foundations.typography
    const recipe = nextShuffle({
      currentStyle: system.styleId,
      accent: preset.accent,
      bodyFont: type?.fontFamily,
      headingFont: type?.headingFontFamily ?? type?.fontFamily,
      typeScale: inferTypeScaleMode(type?.sizes),
      avoidScaffold: system.scaffoldId,
      avoidMood: system.moodId,
      scaffold: filterStyle?.id,
      deck: deck.current,
    })
    loadGoogleFont(recipe.bodyFont)
    loadGoogleFont(recipe.headingFont)
    const style = recipe.styleId ? THEME_STYLE_PRESETS.find((p) => p.id === recipe.styleId) : undefined
    const dealt = style ?? stylePreviewFromRecipe({ preset, appearance: chrome }, recipe, chrome).preset
    // Locked picks go back on top. A style with a lock on it is no longer that
    // style whole: it keeps its name, not its id.
    const kept = applyLocks(dealt, resolveBase(dealt), preset, base, locks)
    const whole = kept === dealt
    setSystem({
      preset: kept,
      styleId: whole ? style?.id : undefined,
      // Inside a picked style, a variation is named after it ("Glass").
      baseName: style && whole ? undefined : (style ?? filterStyle)?.label ?? t(RANDOM_THEME_LABEL),
      scaffoldId: recipe.scaffoldId,
      moodId: recipe.moodId,
    })
    shuffles.current += 1
    setSpins((n) => n + 1)
    setPainted(true)
    if (shuffles.current === 1 || shuffles.current === 2 || shuffles.current === 6) {
      trackEvent({ name: 'mobile_shuffle', props: { reached: String(shuffles.current) as '1' | '2' | '6', locked: locks.size ? 'some' : 'none' } })
    }
  }

  // ── Hand-off: encoded ahead of the tap (Safari refuses a share sheet that
  // waits on a promise). ──
  const [encoded, setEncoded] = useState<{ preset: ThemeStylePreset; url: string } | null>(null)
  const link = encoded?.preset === preset ? encoded.url : null
  useEffect(() => {
    let live = true
    encodeRemix(preset).then((code) => { if (live) setEncoded({ preset, url: remixUrl(code) }) }, () => {})
    return () => { live = false }
  }, [preset])

  // A `?remix=` opened on a phone starts the generator on it.
  const sectionRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const code = takeIncomingRemix()
    if (!code) return
    let live = true
    decodeRemix(code).then((decoded) => {
      if (!live) return
      if (!decoded) { showToast(t('This link could not be opened.'), undefined, true); return }
      const next = remixPreset(decoded, code, t(RANDOM_THEME_LABEL))
      loadGoogleFont(next.foundations.typography?.fontFamily ?? '')
      loadGoogleFont(next.foundations.typography?.headingFontFamily ?? '')
      setSystem({ preset: next, styleId: decoded.whole ? next.id : undefined })
      sectionRef.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
    })
    return () => { live = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Sheet state, mirrored to `?sheet=` ──
  const [sheet, setSheet] = useState<ThemeSheetState>(() => readThemeSheet(window.location.search))
  // The preview page on screen, mirrored to `?view=`.
  const [view, setView] = useState<PreviewView>(() => readPreviewView(window.location.search))
  useEffect(() => {
    const search = writePreviewView(writeLocks(writeThemeSheet(window.location.search, sheet), locks), view)
    if (search === window.location.search) return
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${search}${window.location.hash}`)
  }, [sheet, locks, view])
  // Every press the visitor makes lands with a haptic; the dock's own
  // folding when the preview scrolls away (below) stays silent.
  // Opening lands on the Edit list; a closed dock forgets its page.
  const setOpen = (open: boolean) => {
    if (open !== sheet.open) haptic('tap')
    setSheet({ open, tab: 'edit' })
  }
  // Moving between the panel's pages. `back` slides the other way.
  const travel = useRef<1 | -1>(1)
  const go = (tab: ThemeSheetTab) => {
    haptic('tick')
    travel.current = tab === 'edit' ? -1 : 1
    setSheet({ open: true, tab })
  }
  const pickTarget = (next: 'css' | 'figma' | 'agent') => { haptic('tick'); setTarget(next) }

  // Haptics: offered only where the phone can play them.
  const hapticsOn = useSyncExternalStore(subscribeHaptics, hapticsEnabled, () => true)
  const canBuzz = useMemo(() => hapticEngine() !== null, [])

  // A link to an open tab lands on the generator, not at the top of About.
  useEffect(() => {
    if (sheet.open || view !== 'account') sectionRef.current?.scrollIntoView({ block: 'start' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // The bar shows only while the preview is on screen: scrolled on to the
  // rest of About, it slides away and an open sheet closes.
  const [inView, setInView] = useState(false)
  // The folded dock's height: the page keeps its end clear of it.
  const [peek, setPeek] = useState(160)
  const peekRef = useRef(160)
  const onPeek = (px: number) => { peekRef.current = px; setPeek(px) }
  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    // A band of the screen, not a share of the section: the board is ~4000px
    // tall, so a ratio would show the bar late and hide it early. On while
    // the preview covers the middle of the screen (40%–60%). Measured on
    // scroll, not with an IntersectionObserver `rootMargin`, which browsers
    // ignore inside an iframe. Capture: the page may scroll in an inner box.
    let frame = 0
    const check = () => {
      frame = 0
      const r = el.getBoundingClientRect()
      const vh = window.innerHeight
      const on = r.top < vh * 0.6 && r.bottom - peekRef.current > vh * 0.4
      setInView(on)
      if (!on) setSheet((s) => (s.open ? { ...s, open: false } : s))
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(check) }
    check()
    window.addEventListener('scroll', schedule, { capture: true, passive: true })
    window.addEventListener('resize', schedule)
    // The board's own size, and the page around it: content loading above
    // (the hero) moves the board without a scroll event.
    const ro = new ResizeObserver(schedule)
    ro.observe(el)
    if (el.parentElement) ro.observe(el.parentElement)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule, { capture: true })
      window.removeEventListener('resize', schedule)
      ro.disconnect()
    }
  }, [])

  // The fonts the Type group draws its "Aa" in.
  useEffect(() => {
    if (sheet.open) SHEET_FONTS.forEach((f) => loadGoogleFont(f.family))
  }, [sheet.open])

  // A new page takes focus on its title (not on the first open: that would
  // pull the keyboard up on a phone).
  const titleRef = useRef<HTMLHeadingElement>(null)
  const lastTab = useRef(sheet.tab)
  useEffect(() => {
    if (sheet.open && lastTab.current !== sheet.tab) titleRef.current?.focus({ preventScroll: true })
    lastTab.current = sheet.tab
  }, [sheet])

  const [target, setTarget] = useState<'css' | 'figma' | 'agent'>('css')
  const copyCss = async () => {
    try {
      await navigator.clipboard.writeText(css)
      haptic('success')
      showToast(t('CSS variables copied.'))
    } catch {
      haptic('warning')
      showToast(t('Could not copy the CSS.'), undefined, true)
    }
  }
  const cssLines = css.split('\n')
  const CSS_PREVIEW_LINES = 10

  // ── Copy prompt: the system as an agent brief (`systemBrief`) ──
  const [copyState, setCopyState] = useState<CopyState>('idle')
  const copyTimer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(copyTimer.current), [])
  const copyPrompt = async () => {
    haptic('tap')
    const radius = choices.radius
    const spacing = SPACING_MODES.find((m) => m.id === choices.spacing)?.label ?? null
    const brief = systemBrief({
      name: systemName,
      light: roles.light,
      dark: roles.dark,
      headingFont: base.typography.headingFontFamily ?? base.typography.fontFamily,
      bodyFont: base.typography.fontFamily,
      basePx: choices.typeScale ? basePx(choices.typeScale) : undefined,
      radius,
      spacing,
      css,
      link,
    })
    let ok = true
    try {
      await navigator.clipboard.writeText(brief)
      haptic('success')
    } catch {
      ok = false
      haptic('warning')
    }
    setCopyState(ok ? 'copied' : 'failed')
    trackEvent({ name: 'mobile_copy_prompt', props: { ok: ok ? 'yes' : 'no' } })
    window.clearTimeout(copyTimer.current)
    copyTimer.current = window.setTimeout(() => setCopyState('idle'), COPIED_MS)
  }

  const handoffButton = (
    <button
      type="button"
      disabled={!link}
      onClick={() => { if (!link) return; haptic('tap'); handOff(link, t) }}
      className={cn('flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-line-strong px-4 text-ui font-semibold text-fg transition-[opacity,transform] active:scale-[0.98] disabled:opacity-60', FOCUS)}
    >
      <LaptopGlyph />
      {t('Continue on my laptop')}
    </button>
  )

  // ── What each Edit row says it is now ──
  const radiusPreset = RADIUS_ROLE_PRESETS.find((p) => p.label === choices.radius)
  // A system on no preset (Core's own corners) seats the stepper on the
  // NEAREST one by its box corner, never on the first stop by default.
  const boxPx = parseFloat(base.radius?.[base.radiusRoles?.container ?? ''] ?? '') || 0
  const radiusAt = radiusPreset
    ? RADIUS_ROLE_PRESETS.indexOf(radiusPreset)
    : RADIUS_ROLE_PRESETS.reduce((best, p, i) => (Math.abs(radiusPresetPx(p)[0] - boxPx) < Math.abs(radiusPresetPx(RADIUS_ROLE_PRESETS[best])[0] - boxPx) ? i : best), 0)
  const spacingMode = SPACING_MODES.find((m) => m.id === choices.spacing)
  const lockFirst = (key: LockKey) => (locks.has(key) ? <span className="text-fg-faint" title={t('Locked')}><LockGlyph on /></span> : null)
  const sectionShuffle = (section: SheetSection) => (
    <SectionShuffle
      label={t('Shuffle {section}', { section: t(PAGE_TITLE[section]) })}
      disabled={SECTION_LOCKS[section].every((k) => locks.has(k))}
      onClick={() => shuffleOnly(section)}
      t={t}
    />
  )
  const ship = (next: 'css' | 'figma' | 'agent') => { setTarget(next); go('export') }

  const pages: Record<ThemeSheetTab, ReactNode> = {
    edit: (
      <>
        <PageHeader title={t('Edit {name}', { name: systemName })} titleRef={titleRef} t={t} />
        <div className={INSET}>
          <nav aria-label={t('Editions')}>
            <EditRow
              glyph={<FoundationGlyph id="color" className="h-[18px] w-[18px]" />}
              label={t('Color')}
              summary={<>{lockFirst('accent')}<span aria-hidden className="h-3 w-3 flex-shrink-0 rounded-full border border-line" style={{ background: preset.accent }} /><span className="font-mono tabular-nums">{displayHex(preset.accent)}</span></>}
              onClick={() => go('color')}
            />
            <EditRow
              glyph={<FoundationGlyph id="typography" className="h-[18px] w-[18px]" />}
              label={t('Font')}
              summary={<>{lockFirst('font')}<span className="truncate">{choices.font ?? base.typography.fontFamily}</span></>}
              onClick={() => go('type')}
            />
            <EditRow
              glyph={<FoundationGlyph id="radius" className="h-[18px] w-[18px]" />}
              label={t('Radius')}
              summary={<>{lockFirst('radius')}<span>{radiusPreset ? t(radiusPreset.label) : t('Custom')}</span></>}
              onClick={() => go('radius')}
            />
            <EditRow
              glyph={<FoundationGlyph id="sizes" className="h-[18px] w-[18px]" />}
              label={t('Spacing')}
              summary={<>{lockFirst('spacing')}<span>{spacingMode ? t(spacingMode.label) : t('Custom')}</span></>}
              onClick={() => go('spacing')}
            />
            <EditRow
              glyph={<PaletteGlyph size={18} />}
              label={t('Style')}
              summary={<span className="truncate">{filterStyle ? filterStyle.label : t('Any style')}</span>}
              onClick={() => go('style')}
            />
          </nav>
        </div>
        {/* The three doors out, as on desktop: CSS · Figma · Agent. */}
        <div className={cn('mt-auto border-t border-line py-3', INSET)}>
          <div role="group" aria-label={t('Ship to')} className="flex items-center gap-1.5">
            <button type="button" onClick={() => ship('css')} className={cn(SHIP_BUTTON, 'h-11!')}><CodeGlyph /><span className="truncate">{t('CSS')}</span></button>
            <button type="button" onClick={() => ship('figma')} className={cn(SHIP_BUTTON, 'h-11!')}><FigmaGlyph size={13} /><span className="truncate">{t('Figma')}</span></button>
            <button type="button" onClick={() => ship('agent')} className={cn(SHIP_BUTTON, 'h-11!')}><AgentGlyph /><span className="truncate">{t('Agent')}</span></button>
          </div>
        </div>
      </>
    ),
    color: (
      <>
        <PageHeader title={t('Color')} titleRef={titleRef} onBack={() => go('edit')} trailing={sectionShuffle('color')} t={t} />
        <div className={cn('divide-y divide-line', INSET)}>
          <SettingBlock
            label={t('Brand color')}
            trailing={<><span className="font-mono text-caption tabular-nums text-fg-muted">{displayHex(preset.accent)}</span>{lockFor('accent')}</>}
          >
            <ColorRadios
              colors={BRAND_SPECTRUM}
              current={preset.accent}
              onPick={(c) => edit(withAccent(preset, c.hex))}
              label={t('Brand color')}
              className="grid grid-cols-6 justify-items-center gap-y-1"
            />
          </SettingBlock>
          <SettingBlock
            label={`${t('Ramp')} · ${t(chrome === 'dark' ? 'Dark' : 'Light')}`}
            trailing={<span className="text-caption text-fg-faint">{t('Step 9 is your brand')}</span>}
          >
            <ol className="m-0 grid list-none grid-cols-12 gap-1 p-0">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((step) => (
                <li key={step} className="flex flex-col items-center gap-1">
                  <span
                    className={cn('h-9 w-full rounded-md ring-1 ring-black/10 dark:ring-white/10', step === 9 && 'ring-2 ring-fg dark:ring-fg')}
                    style={{ background: ramp?.[step] }}
                    title={`accent.${step} · ${displayHex(ramp?.[step] ?? '')}`}
                  />
                  <span className={cn('font-mono text-mini tabular-nums', step === 9 ? 'font-semibold text-fg' : 'text-fg-faint')}>{step}</span>
                </li>
              ))}
            </ol>
          </SettingBlock>
          <SettingBlock label={t('Roles solved for contrast')}>
            <ul className="m-0 flex list-none flex-col p-0">
              {contrast.map((row) => (
                <li key={row.id} className="flex min-h-11 items-center gap-3 border-b border-line last:border-b-0">
                  <span className="h-5 w-5 flex-shrink-0 rounded-md ring-1 ring-black/10 dark:ring-white/15" style={{ background: row.hex }} aria-hidden />
                  <span className="flex-1 text-ui text-fg">{t(row.label)}</span>
                  <span className="font-mono text-caption tabular-nums text-fg-muted">{displayHex(row.hex)}</span>
                  <span
                    className={cn(
                      'min-w-[4.25rem] rounded-md px-1.5 py-0.5 text-center font-mono text-mini font-semibold tabular-nums',
                      row.verdict.pass ? 'bg-status-success/10 text-status-success' : 'bg-status-danger/10 text-status-danger',
                    )}
                    title={`WCAG ${row.verdict.wcag.toFixed(2)}:1 · APCA Lc ${Math.abs(row.verdict.apcaLc).toFixed(0)}`}
                  >
                    {row.verdict.pass ? 'AA' : t('Fail')} {row.verdict.wcag.toFixed(1)}
                  </span>
                </li>
              ))}
            </ul>
          </SettingBlock>
        </div>
      </>
    ),
    type: (
      <>
        <PageHeader title={t('Font')} titleRef={titleRef} onBack={() => go('edit')} trailing={sectionShuffle('type')} t={t} />
        <div className={cn('divide-y divide-line', INSET)}>
          <SettingBlock label={t('Family')} trailing={lockFor('font')}>
            <div role="radiogroup" aria-label={t('Font')} className="-mb-2">
              {SHEET_FONTS.map((f, i) => {
                const picked = SHEET_FONTS.findIndex((x) => x.family === choices.font)
                const pick = (family: string) => { loadGoogleFont(family); edit(withFont(preset, base, family)) }
                return (
                  <OptionRow
                    key={f.family}
                    on={i === picked}
                    tabbable={i === (picked < 0 ? 0 : picked)}
                    label={f.family}
                    detail={t(f.voice)}
                    lead={<span className="w-8 flex-shrink-0 text-[22px] font-semibold leading-none text-fg" style={{ fontFamily: `'${f.family}', system-ui` }} aria-hidden>Aa</span>}
                    onPick={() => pick(f.family)}
                    onKeyDown={(e) => radioKeys(e, i, SHEET_FONTS.length, (n) => { if (n !== picked) pick(SHEET_FONTS[n].family) })}
                  />
                )
              })}
            </div>
          </SettingBlock>
          <SettingBlock label={t('Base size')} trailing={lockFor('scale')}>
            <DotSlider
              stops={SHEET_TYPE_SCALES.map(basePx)}
              value={basePx(choices.typeScale ?? 'default')}
              onChange={(px) => {
                const mode = SHEET_TYPE_SCALES.find((m) => basePx(m) === px)
                if (mode) edit(withTypeScale(preset, base, mode))
              }}
              format={(px) => `${px}px`}
              ariaLabel={t('Base size')}
              className="h-11!"
            />
          </SettingBlock>
        </div>
      </>
    ),
    radius: (
      <>
        <PageHeader title={t('Radius')} titleRef={titleRef} onBack={() => go('edit')} trailing={sectionShuffle('radius')} t={t} />
        <div className={cn('divide-y divide-line', INSET)}>
          <SettingBlock label={t('Corners')} trailing={lockFor('radius')}>
            <DotSlider
              stops={RADIUS_ROLE_PRESETS.map((_, i) => i)}
              value={radiusAt}
              onChange={(i) => edit(withRadiusPreset(preset, base, RADIUS_ROLE_PRESETS[i].label))}
              format={(i) => t(RADIUS_ROLE_PRESETS[i].label)}
              ariaLabel={t('Radius')}
              className="h-11!"
            />
            {!radiusPreset && <p className="m-0 mt-2 text-caption text-fg-faint">{t('This style has its own corners. Pick one to replace them.')}</p>}
            {radiusPreset && (() => {
              const [boxes, fields, selectors] = radiusPresetPx(radiusPreset)
              return (
                <dl className="m-0 mt-3 grid grid-cols-3 gap-2">
                  {([[t('Boxes'), boxes], [t('Fields'), fields], [t('Selectors'), selectors]] as const).map(([name, px]) => (
                    <div key={name} className="flex items-center gap-2">
                      <CornerMark px={px} on={false} />
                      <span className="flex min-w-0 flex-col">
                        <dt className="truncate text-caption text-fg-muted">{name}</dt>
                        <dd className="m-0 font-mono text-caption tabular-nums text-fg">{px}px</dd>
                      </span>
                    </div>
                  ))}
                </dl>
              )
            })()}
          </SettingBlock>
        </div>
      </>
    ),
    spacing: (
      <>
        <PageHeader title={t('Spacing')} titleRef={titleRef} onBack={() => go('edit')} trailing={sectionShuffle('spacing')} t={t} />
        <div className={cn('divide-y divide-line', INSET)}>
          <SettingBlock label={t('Density')} trailing={lockFor('spacing')}>
            <DotSlider
              stops={SHEET_SPACING.map((_, i) => i)}
              value={Math.max(0, SHEET_SPACING.indexOf(choices.spacing ?? 'quiet'))}
              onChange={(i) => edit(withSpacingMode(preset, base, SHEET_SPACING[i]))}
              format={(i) => t(SPACING_MODES.find((m) => m.id === SHEET_SPACING[i])?.label ?? '')}
              ariaLabel={t('Spacing')}
              className="h-11!"
            />
            {spacingMode && <p className="m-0 mt-3 text-caption leading-relaxed text-fg-muted">{t(spacingMode.description)}</p>}
          </SettingBlock>
        </div>
      </>
    ),
    style: (
      <>
        <PageHeader title={t('Style')} titleRef={titleRef} onBack={() => go('edit')} t={t} />
        <div className={INSET}>
          <p className="m-0 border-b border-line py-3 text-caption leading-relaxed text-fg-muted">
            {t('Pick a style to keep Shuffle inside it.')}
          </p>
          {(() => {
            const options = [{ id: null as string | null, label: t('Any style (surprise me)'), detail: t('Shuffle deals every style') }, ...THEME_STYLE_PRESETS.map((p) => ({ id: p.id as string | null, label: p.label, detail: t(p.description) }))]
            const picked = options.findIndex((o) => o.id === styleFilter)
            return (
              <div role="radiogroup" aria-label={t('Style')}>
                {options.map((o, i) => (
                  <OptionRow
                    key={o.id ?? 'any'}
                    on={i === picked}
                    tabbable={i === (picked < 0 ? 0 : picked)}
                    label={o.label}
                    detail={o.detail}
                    onPick={() => pickStyle(o.id)}
                    onKeyDown={(e) => radioKeys(e, i, options.length, (n) => { if (n !== picked) pickStyle(options[n].id) })}
                  />
                ))}
              </div>
            )
          })()}
        </div>
      </>
    ),
    export: (
      <>
        <PageHeader title={t('Export')} titleRef={titleRef} onBack={() => go('edit')} t={t} />
        <div className={cn('flex flex-col gap-3 py-3', INSET)}>
          <div role="group" aria-label={t('Export to')} className="flex items-center gap-1.5">
            {([['css', <CodeGlyph key="g" />, t('CSS')], ['figma', <FigmaGlyph key="g" size={13} />, t('Figma')], ['agent', <AgentGlyph key="g" />, t('Agent')]] as const).map(([key, glyph, label]) => (
              <button
                key={key}
                type="button"
                aria-pressed={target === key}
                onClick={() => pickTarget(key)}
                className={cn(SHIP_BUTTON, 'h-11!', target === key && 'border-line-strong! bg-elevated!')}
              >
                {glyph}<span className="truncate">{label}</span>
              </button>
            ))}
          </div>
          {target === 'css' ? (
            <>
              <pre className="m-0 overflow-x-auto rounded-lg border border-line bg-surface p-3 font-mono text-caption leading-relaxed text-fg">
                {cssLines.slice(0, CSS_PREVIEW_LINES).join('\n')}
                {cssLines.length > CSS_PREVIEW_LINES && <span className="text-fg-faint">{'\n  '}{t('+{count} more lines', { count: cssLines.length - CSS_PREVIEW_LINES })}</span>}
              </pre>
              <button
                type="button"
                onClick={copyCss}
                className={cn('flex h-11 w-full items-center justify-center rounded-lg bg-fg px-4 text-ui font-semibold text-app transition-[opacity,transform] active:scale-[0.98]', FOCUS)}
              >
                {t('Copy CSS variables')}
              </button>
              {handoffButton}
            </>
          ) : (
            <>
              <p className="m-0 text-body leading-relaxed text-fg-muted">
                {target === 'figma'
                  ? t('The Figma plugin turns this system into variables and components. It runs on a laptop: send yourself the link and open it there.')
                  : t('Your agent reads this system as one contract: tokens.json and a Skill. Both download from the editor on a laptop.')}
              </p>
              {handoffButton}
            </>
          )}
        </div>
      </>
    ),
  }

  const shufflePaint = {
    background: roles[chrome]['action.primary.default'],
    color: roles[chrome]['content.on-action'],
    fontFamily: `"${base.typography.headingFontFamily ?? base.typography.fontFamily}", system-ui, sans-serif`,
  }

  return (
    // The bottom padding keeps the last tile clear of the folded dock.
    <div ref={sectionRef} className="flex scroll-mt-4 flex-col gap-3" style={{ paddingBottom: peek + 16 }}>
      {tokens.archTokens && (
        <MobilePreview
          tokens={tokens}
          name={systemName}
          view={view}
          onViewChange={setView}
          t={t}
          caption={<>{t(chrome === 'dark' ? 'Dark' : 'Light')} · <span className="font-mono tabular-nums">{displayHex(accentHex)}</span></>}
        />
      )}

      <ThemeDock
        id={sheetId}
        visible={inView}
        open={sheet.open}
        onOpenChange={setOpen}
        onPeek={onPeek}
        labelledBy={titleId}
        describedBy={descId}
      >
        {(startDrag, dockTopRef) => (
          <>
            {/* The pinned top — the whole folded dock: Theme, then Shuffle,
                Copy prompt and Controls. A drag zone (`touch-none`: a drag
                here never scrolls the page); open, it stays above the panel
                so Shuffle answers while you edit. */}
            <div
              ref={dockTopRef}
              onPointerDown={startDrag}
              className={cn('flex-shrink-0 touch-none', !sheet.open && 'pb-[env(safe-area-inset-bottom)]')}
            >
              {/* Handle — also a button, so opening never needs a drag. */}
              <button
                type="button"
                onClick={() => setOpen(!sheet.open)}
                aria-label={t(sheet.open ? 'Close the controls' : 'Open the controls')}
                aria-expanded={sheet.open}
                aria-controls={sheetId}
                className={cn('mx-auto -mb-2 flex h-8 w-20 flex-shrink-0 items-center justify-center rounded-full', FOCUS)}
              >
                <span className="h-1 w-10 rounded-full bg-line-strong" aria-hidden />
              </button>

              <div className="flex items-center justify-between gap-2 px-4 pb-3 pt-1">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="text-fg-muted"><PaletteGlyph /></span>
                  <div className="flex min-w-0 flex-col leading-tight">
                    <h2 id={titleId} className="m-0 text-strong font-semibold text-fg">{t('Theme')}</h2>
                    <span className="truncate text-caption text-fg-faint" aria-live="polite">{systemName}</span>
                  </div>
                </div>
                <p id={descId} className="sr-only">
                  {t('Shuffle a whole system, copy it as a prompt, or open Controls to pick colour, font, radius and spacing.')}
                </p>
                <div className="flex flex-shrink-0 items-center gap-1">
                  {sheet.open && canBuzz && (
                    <button
                      type="button"
                      aria-pressed={hapticsOn}
                      aria-label={t('Vibration')}
                      title={t(hapticsOn ? 'Vibration on' : 'Vibration off')}
                      onClick={() => {
                        setHapticsEnabled(!hapticsOn)
                        // Turning it ON confirms with the feel it turns on.
                        if (!hapticsOn) haptic('tap')
                      }}
                      className={cn('flex h-11 w-11 items-center justify-center rounded-xl transition-[color,background-color,transform] hover:bg-elevated active:scale-90', hapticsOn ? 'text-fg' : 'text-fg-faint', FOCUS)}
                    >
                      <VibrateGlyph on={hapticsOn} />
                    </button>
                  )}
                  {/* The desktop panel's "Edit" door, named for what it opens. */}
                  <button
                    type="button"
                    onClick={() => setOpen(!sheet.open)}
                    aria-expanded={sheet.open}
                    aria-controls={sheetId}
                    // No fill: a text button (label + glyph), so the one filled
                    // pill in the dock is Shuffle. `-mr-2` keeps the 44px
                    // target while the label lines up with the edge.
                    className={cn('-mr-2 flex min-h-11 items-center gap-2 rounded-full px-2 text-body font-medium text-fg transition-[color,opacity,transform] duration-150 ease-[var(--ease-out-quint)] hover:opacity-80 active:scale-[0.96]', FOCUS)}
                  >
                    {sheet.open ? t('Done') : t('Controls')}
                    {!sheet.open && <SlidersGlyph />}
                  </button>
                </div>
              </div>

              {/* Shuffle (painted by the system on screen, so the button is
                  part of the demo) and Copy prompt: inside the dock, never
                  floating over the board. */}
              <div className="flex gap-2 px-4 pb-4">
                <button
                  type="button"
                  onClick={shuffle}
                  className={cn('group flex h-12 min-w-0 flex-1 items-center justify-center gap-2.5 rounded-full px-5 transition-[transform,filter] duration-150 ease-[var(--ease-out-quint)] hover:brightness-105 active:scale-[0.97]', FOCUS)}
                  style={shufflePaint}
                >
                  {/* The website's die: hop, full turn, a new face mid-air. */}
                  <RollingDie rolls={spins} size={20} />
                  <span className="truncate text-strong font-semibold">{t('Shuffle')}</span>
                </button>
                <button
                  type="button"
                  onClick={copyPrompt}
                  aria-label={t('Copy prompt for AI agents')}
                  className={cn(
                    'flex h-12 flex-none items-center justify-center gap-2 rounded-full px-4 text-ui font-semibold transition-[background-color,color,transform] duration-150 ease-[var(--ease-out-quint)] active:scale-[0.96]',
                    copyState === 'copied' ? 'bg-status-success/15 text-status-success'
                      : copyState === 'failed' ? 'bg-status-danger/15 text-status-danger'
                        : 'bg-fg/[0.08] text-fg hover:bg-fg/[0.12]',
                    FOCUS,
                  )}
                >
                  {copyState === 'copied' ? <CheckGlyph /> : <CopyGlyph />}
                  <span>{copyState === 'copied' ? t('Copied') : copyState === 'failed' ? t('Could not copy') : t('Copy prompt')}</span>
                </button>
                <span className="sr-only" aria-live="polite">{copyState === 'copied' ? t('Prompt copied') : copyState === 'failed' ? t('Could not copy') : ''}</span>
              </div>
            </div>

            {/* Open: the Controls panel, one page at a time (the desktop
                rail's Edit list and its pages). Mounted only while open, so
                a folded dock carries no hidden focusable content. */}
            {sheet.open && (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden border-t border-line">
                <motion.div
                  key={sheet.tab}
                  initial={reduceMotion ? false : { opacity: 0, x: travel.current * 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                  className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain pb-[max(1rem,env(safe-area-inset-bottom))]"
                >
                  {pages[sheet.tab]}
                </motion.div>
              </div>
            )}
          </>
        )}
      </ThemeDock>
    </div>
  )
}
