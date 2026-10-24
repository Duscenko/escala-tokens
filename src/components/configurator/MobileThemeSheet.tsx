// The phone generator (plan: `design-plans/mobile-theme-sheet.md`): a live
// preview painted by a system, and a Theme sheet docked at the bottom that
// changes it. PHONE ONLY — `AboutHome` mounts it below `md` (`useIsPhone`);
// desktop never renders it.
//
// The sheet has two stops: FOLDED shows the six quick
// brand colours and Shuffle, OPEN adds four tabs — Color · Type · Shape ·
// Export. Every control is a PICK from a list the desktop ships (rule 9: no
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
// a framer-motion drag between two stops instead, like `InspectorSheet`.
// `prefers-reduced-motion`: the sheet jumps between stops, no slide.

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
  QUICK_ACCENTS, RADIUS_ROLE_PRESETS, SHEET_FONTS, SHEET_SPACING, SHEET_TYPE_SCALES, SPACING_MODES, THEME_SHEET_TABS,
  basePx, cssVariables, readPreviewView, readThemeSheet, writePreviewView, roleContrast, sameHex, sheetChoices, stepTab,
  withAccent, withFont, withRadiusPreset, withSpacingMode, withTypeScale, writeThemeSheet,
  type PreviewView, type ThemeSheetState, type ThemeSheetTab,
} from '../../lib/mobileTheme'
import { showToast } from '../ui/Toast'
import { MobilePreview } from './MobilePreviewViews'
import { cn } from '../../lib/utils'

/** Core / Minimalist — the system a visitor starts on. */
const CORE = THEME_STYLE_PRESETS.find((p) => p.id === 'core-minimal') ?? THEME_STYLE_PRESETS[0]

/** The folded stop (px): handle + header + the colour row, nothing cut. */
const PEEK = 164

const TAB_LABEL: Record<ThemeSheetTab, string> = { color: 'Color', type: 'Type', shape: 'Shape', export: 'Export' }

/** `styleId`: a System Style dealt whole (it names the sheet). `baseName`:
 *  the name a picked-over system keeps — Core stays Core after a new colour. */
interface DemoSystem { preset: ThemeStylePreset; styleId?: string; scaffoldId?: string; moodId?: string; baseName?: string }
const CORE_SYSTEM: DemoSystem = { preset: CORE, styleId: CORE.id }

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ui/50'
const LABEL = 'text-mini font-semibold uppercase tracking-widest text-fg-faint'
const CHOICE = 'border transition-[color,background-color,border-color,transform] duration-150 ease-[var(--ease-out-quint)] active:scale-[0.98]'
const choiceState = (on: boolean) => (on ? 'border-accent-ui bg-accent-ui/10 text-fg' : 'border-line text-fg-muted hover:text-fg')

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

function PaletteGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden>
      <path d="M12 3a9 9 0 1 0 0 18c1.2 0 1.8-.8 1.8-1.7 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-1 .8-1.7 1.7-1.7H16a5 5 0 0 0 5-5C21 6.4 17 3 12 3Z" {...stroke} />
      <circle cx="7.5" cy="11" r="1.2" fill="currentColor" />
      <circle cx="10" cy="7" r="1.2" fill="currentColor" />
      <circle cx="14.5" cy="7" r="1.2" fill="currentColor" />
    </svg>
  )
}

function ShuffleGlyph() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path d="M3 7h3.5c2 0 3.2 1 4.3 2.6L13 13c1.1 1.6 2.3 2.6 4.3 2.6H21M3 17h3.5c1.4 0 2.4-.5 3.3-1.3M21 7h-3.7c-1.4 0-2.4.5-3.3 1.3M18 4l3 3-3 3M18 13l3 3-3 3" {...stroke} />
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

function ResetGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
      <path d="M2.75 8a5.25 5.25 0 1 0 1.6-3.78M2.75 2.5v2.75H5.5" {...stroke} />
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

// ── The tabs ────────────────────────────────────────────────────────────────

function Section({ label, aside, children }: { label: string; aside?: ReactNode; children: ReactNode }) {
  const id = useId()
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 id={id} className={cn('m-0', LABEL)}>{label}</h3>
        {aside}
      </div>
      {children}
    </section>
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

/** A text choice as a radio (font, size, radius, spacing, export target). */
function ChoiceRadios<T extends string>({ options, value, onPick, label, className, render }: {
  options: { value: T; label: string }[]
  value: T | null
  onPick: (v: T) => void
  label: string
  className?: string
  render: (o: { value: T; label: string }, on: boolean) => ReactNode
}) {
  const picked = options.findIndex((o) => o.value === value)
  return (
    <div role="radiogroup" aria-label={label} className={className}>
      {options.map((o, i) => {
        const on = i === picked
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={i === (picked < 0 ? 0 : picked) ? 0 : -1}
            // The choice already made is a no-op: no repaint, no haptic.
            onClick={() => { if (!on) onPick(o.value) }}
            onKeyDown={(e) => radioKeys(e, i, options.length, (n) => { if (n !== picked) onPick(options[n].value) })}
            className={cn('min-h-11 rounded-xl', CHOICE, choiceState(on), FOCUS)}
          >
            {render(o, on)}
          </button>
        )
      })}
    </div>
  )
}

// ── The dock ────────────────────────────────────────────────────────────────

/** Velocity (px/s) past which a flick picks its direction's stop. */
const FLICK = 400
const EASE = [0.32, 0.72, 0, 1] as const

/** The sheet's frame: fixed to the bottom, portaled to <body> (no transformed
 *  ancestor can trap its `fixed`), 86% of the screen tall, slid down so only
 *  `PEEK` shows while folded and fully off screen while hidden. */
function ThemeDock({ visible, open, onOpenChange, labelledBy, describedBy, children }: {
  visible: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  labelledBy: string
  describedBy: string
  children: (startDrag: (e: ReactPointerEvent) => void) => ReactNode
}) {
  const reduceMotion = useReducedMotion() ?? false
  const ref = useRef<HTMLElement>(null)
  const [height, setHeight] = useState(0)
  const controls = useDragControls()
  const y = useMotionValue(typeof window === 'undefined' ? 0 : window.innerHeight)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => setHeight(el.offsetHeight)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const folded = Math.max(0, height - PEEK)
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

  // Esc folds an open sheet, wherever focus is inside it.
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && open) { e.preventDefault(); onOpenChange(false) }
  }

  return createPortal(
    <>
      {/* Open, the page dims and a tap outside folds the sheet. Folded,
          nothing covers the page but the sheet's own 164px. */}
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
        {children((e) => controls.start(e))}
      </motion.section>
    </>,
    document.body,
  )
}

// ── The generator ───────────────────────────────────────────────────────────

export function MobileGenerator() {
  const { t } = useI18n()
  const chrome = useTheme()
  const titleId = useId()
  const descId = useId()
  const tabsId = useId()

  // ── The system: Core, or whatever the visitor picked / shuffled to ──
  const [system, setSystem] = useState<DemoSystem>(CORE_SYSTEM)
  const deck = useRef(createShuffleDeck())
  const shuffles = useRef(0)
  const preset = system.preset

  const overlayFor = (mode: 'light' | 'dark') => ({
    ...stylePreviewStore(useDesignStore.getState(), { preset, appearance: mode }, mode),
    semanticArchitecture: 'categorical' as const,
  })
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
  // By the preset, not the wrapper object: any path back to Core counts.
  const isCore = system.preset === CORE
  const systemName = system.styleId
    ? THEME_STYLE_PRESETS.find((p) => p.id === system.styleId)?.label ?? preset.label
    : system.baseName ?? t(RANDOM_THEME_LABEL)

  // A pick re-paints the system: no longer that style whole, still its name.
  const edit = (next: ThemeStylePreset) => {
    haptic('tick')
    setSystem({ preset: next, scaffoldId: system.scaffoldId, moodId: system.moodId, baseName: systemName })
  }

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
      deck: deck.current,
    })
    loadGoogleFont(recipe.bodyFont)
    loadGoogleFont(recipe.headingFont)
    const style = recipe.styleId ? THEME_STYLE_PRESETS.find((p) => p.id === recipe.styleId) : undefined
    setSystem({
      preset: style ?? stylePreviewFromRecipe({ preset, appearance: chrome }, recipe, chrome).preset,
      styleId: style?.id,
      scaffoldId: recipe.scaffoldId,
      moodId: recipe.moodId,
    })
    shuffles.current += 1
    if (shuffles.current === 1 || shuffles.current === 2 || shuffles.current === 6) {
      trackEvent({ name: 'mobile_shuffle', props: { reached: String(shuffles.current) as '1' | '2' | '6', locked: 'none' } })
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
  const [view, setView] = useState<PreviewView>(() => readPreviewView(window.location.search))
  useEffect(() => {
    const search = writePreviewView(writeThemeSheet(window.location.search, sheet), view)
    if (search === window.location.search) return
    window.history.replaceState(window.history.state, '', `${window.location.pathname}${search}${window.location.hash}`)
  }, [sheet, view])
  // Every press the visitor makes lands with a haptic; the dock's own
  // folding when the preview scrolls away (below) stays silent.
  const setOpen = (open: boolean) => {
    if (open !== sheet.open) haptic('tap')
    setSheet((s) => ({ ...s, open }))
  }
  const setTab = (tab: ThemeSheetTab) => {
    if (tab !== sheet.tab) haptic('tick')
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

  // The sheet docks only while the preview is on screen: scrolled on to the
  // rest of About, it slides away (and folds, so it never returns half open).
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = sectionRef.current
    if (!el) return
    const io = new IntersectionObserver(([entry]) => {
      setInView(entry.isIntersecting)
      if (!entry.isIntersecting) setSheet((s) => (s.open ? { ...s, open: false } : s))
    }, { threshold: 0.15 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  // The fonts the Type tab draws its "Aa" in.
  useEffect(() => {
    if (sheet.open && sheet.tab === 'type') SHEET_FONTS.forEach((f) => loadGoogleFont(f.family))
  }, [sheet])

  const tabRefs = useRef<Partial<Record<ThemeSheetTab, HTMLButtonElement | null>>>({})
  const onTabKey = (e: KeyboardEvent) => {
    const next = stepTab(sheet.tab, e.key)
    if (!next) return
    e.preventDefault()
    setTab(next)
    tabRefs.current[next]?.focus()
  }

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

  return (
    <div ref={sectionRef} className="flex scroll-mt-4 flex-col gap-3">
      {tokens.archTokens && (
        <MobilePreview
          tokens={tokens}
          view={view}
          onViewChange={setView}
          t={t}
          caption={<>{t(chrome === 'dark' ? 'Dark' : 'Light')} · <span className="font-mono tabular-nums">{displayHex(accentHex)}</span></>}
        />
      )}

      <ThemeDock
        visible={inView}
        open={sheet.open}
        onOpenChange={setOpen}
        labelledBy={titleId}
        describedBy={descId}
      >
        {(startDrag) => (
          <>
            {/* Handle + header: the drag zone (the tab body keeps its own
                scroll). `touch-none` so a drag here never scrolls the page. */}
            <div onPointerDown={startDrag} className="flex-shrink-0 touch-none">
              {/* Handle — also a button, so folding never needs a drag. */}
              <button
                type="button"
                onClick={() => setOpen(!sheet.open)}
                aria-label={t(sheet.open ? 'Fold the theme panel' : 'Open the theme panel')}
                aria-expanded={sheet.open}
                className={cn('mx-auto -mb-2 flex h-11 w-20 flex-shrink-0 items-center justify-center rounded-full', FOCUS)}
              >
                <span className="h-1 w-10 rounded-full bg-line-strong" aria-hidden />
              </button>

              <div className="flex flex-shrink-0 items-center justify-between gap-2 px-4 pb-1">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="text-fg-muted"><PaletteGlyph /></span>
                  <div className="flex min-w-0 flex-col leading-tight">
                    <h2 id={titleId} className="m-0 text-strong font-semibold text-fg">{t('Theme')}</h2>
                    <span className="truncate text-caption text-fg-faint" aria-live="polite">{systemName}</span>
                  </div>
                </div>
                <p id={descId} className="sr-only">
                  {t('Pick a brand colour, a font and a shape. The preview follows every change.')}
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
                  {!isCore && (
                    <button
                      type="button"
                      onClick={() => { haptic('tap'); setSystem(CORE_SYSTEM) }}
                      aria-label={t('Reset')}
                      title={t('Reset')}
                      className={cn('flex h-11 w-11 items-center justify-center rounded-xl text-fg-muted transition-[color,background-color,transform] hover:bg-elevated hover:text-fg active:scale-90', FOCUS)}
                    >
                      <ResetGlyph />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setOpen(!sheet.open)}
                    aria-expanded={sheet.open}
                    className={cn('min-h-11 rounded-xl border border-line px-4 text-body font-medium text-fg transition-[background-color,transform] hover:bg-elevated active:scale-[0.97]', FOCUS)}
                  >
                    {t(sheet.open ? 'Done' : 'Customize')}
                  </button>
                </div>
              </div>

            </div>

              {/* The folded stop: six brand colours and the dice. */}
              <div className="flex flex-shrink-0 items-center justify-between gap-1 px-3 pb-3 pt-1">
                <ColorRadios
                  colors={QUICK_ACCENTS}
                  current={preset.accent}
                  onPick={(c) => edit(withAccent(preset, c.hex))}
                  label={t('Brand color')}
                  size="lg"
                  className="flex flex-1 items-center justify-between"
                />
                <button
                  type="button"
                  onClick={shuffle}
                  aria-label={t('Shuffle system')}
                  title={t('Shuffle system')}
                  className={cn('flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-dashed border-line-strong text-fg-muted transition-[color,transform] hover:text-fg active:scale-90', FOCUS)}
                >
                  <ShuffleGlyph />
                </button>
              </div>

              {/* The open stop: four tabs. Mounted only while open, so a folded
                  sheet carries no hidden focusable content. */}
              {sheet.open && (
                <>
                  <div
                    role="tablist"
                    aria-label={t('Theme')}
                    onKeyDown={onTabKey}
                    className="mx-4 grid flex-shrink-0 grid-cols-4 gap-1 rounded-xl border border-line bg-surface/40 p-1"
                  >
                    {THEME_SHEET_TABS.map((tab) => {
                      const on = sheet.tab === tab
                      return (
                        <button
                          key={tab}
                          ref={(el) => { tabRefs.current[tab] = el }}
                          type="button"
                          role="tab"
                          id={`${tabsId}-${tab}`}
                          aria-selected={on}
                          aria-controls={`${tabsId}-${tab}-panel`}
                          tabIndex={on ? 0 : -1}
                          onClick={() => setTab(tab)}
                          className={cn(
                            'min-h-11 rounded-lg text-body font-medium transition-[color,background-color,transform] active:scale-[0.97]',
                            FOCUS,
                            on ? 'bg-elevated text-fg shadow-sm' : 'text-fg-muted hover:text-fg',
                          )}
                        >
                          {t(TAB_LABEL[tab])}
                        </button>
                      )
                    })}
                  </div>

                  <div
                    role="tabpanel"
                    id={`${tabsId}-${sheet.tab}-panel`}
                    aria-labelledby={`${tabsId}-${sheet.tab}`}
                    tabIndex={0}
                    className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto overscroll-contain px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent-ui/50"
                  >
                    {sheet.tab === 'color' && (
                      <>
                        <Section
                          label={t('Brand color')}
                          aside={<span className="font-mono text-caption tabular-nums text-fg-muted">{displayHex(preset.accent)}</span>}
                        >
                          <ColorRadios
                            colors={BRAND_SPECTRUM}
                            current={preset.accent}
                            onPick={(c) => edit(withAccent(preset, c.hex))}
                            label={t('Brand color')}
                            className="grid grid-cols-6 justify-items-center gap-y-1"
                          />
                        </Section>

                        <Section
                          label={`${t('Ramp')} · ${t(chrome === 'dark' ? 'Dark' : 'Light')}`}
                          aside={<span className="text-caption text-fg-faint">{t('Step 9 is your brand')}</span>}
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
                        </Section>

                        <Section label={t('Roles solved for contrast')}>
                          <ul className="m-0 flex list-none flex-col p-0">
                            {contrast.map((row) => (
                              <li key={row.id} className="flex min-h-12 items-center gap-3 border-b border-line/70 last:border-b-0">
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
                        </Section>
                      </>
                    )}

                    {sheet.tab === 'type' && (
                      <>
                        <Section label={t('Font')}>
                          <ChoiceRadios
                            label={t('Font')}
                            value={choices.font}
                            onPick={(family) => { loadGoogleFont(family); edit(withFont(preset, base, family)) }}
                            options={SHEET_FONTS.map((f) => ({ value: f.family, label: f.family }))}
                            className="flex flex-col gap-2"
                            render={(o, on) => (
                              <span className="flex items-center gap-4 px-4 py-2.5">
                                <span className={cn('w-9 text-[22px] font-semibold leading-none', on ? 'text-fg' : 'text-fg-muted')} style={{ fontFamily: `'${o.value}', system-ui` }} aria-hidden>Aa</span>
                                <span className="flex-1 text-left text-ui text-fg">{o.label}</span>
                                <span className="text-caption text-fg-faint">{t(SHEET_FONTS.find((f) => f.family === o.value)?.voice ?? '')}</span>
                              </span>
                            )}
                          />
                        </Section>
                        <Section label={t('Base size')}>
                          <ChoiceRadios
                            label={t('Base size')}
                            value={choices.typeScale}
                            onPick={(mode) => edit(withTypeScale(preset, base, mode))}
                            options={SHEET_TYPE_SCALES.map((m) => ({ value: m, label: `${basePx(m)} px` }))}
                            className="grid grid-cols-3 gap-2"
                            render={(o) => <span className="font-mono text-ui tabular-nums">{o.label}</span>}
                          />
                        </Section>
                      </>
                    )}

                    {sheet.tab === 'shape' && (
                      <>
                        <Section label={t('Radius')}>
                          <ChoiceRadios
                            label={t('Radius')}
                            value={choices.radius}
                            onPick={(label) => edit(withRadiusPreset(preset, base, label))}
                            options={RADIUS_ROLE_PRESETS.map((p) => ({ value: p.label, label: p.label }))}
                            className="grid grid-cols-4 gap-2"
                            render={(o, on) => {
                              const p = RADIUS_ROLE_PRESETS.find((r) => r.label === o.value)!
                              return (
                                <span className="flex flex-col items-center gap-1.5 py-2.5">
                                  <CornerMark px={radiusPresetPx(p)[0]} on={on} />
                                  <span className="text-caption font-medium">{t(o.label)}</span>
                                  <span className="font-mono text-mini tabular-nums text-fg-faint">{radiusPresetPx(p)[0]}</span>
                                </span>
                              )
                            }}
                          />
                        </Section>
                        <Section label={t('Spacing')}>
                          <ChoiceRadios
                            label={t('Spacing')}
                            value={choices.spacing}
                            onPick={(id) => edit(withSpacingMode(preset, base, id))}
                            options={SHEET_SPACING.map((id) => ({ value: id, label: SPACING_MODES.find((m) => m.id === id)!.label }))}
                            className="grid grid-cols-2 gap-2"
                            render={(o) => {
                              const m = SPACING_MODES.find((s) => s.id === o.value)!
                              return (
                                <span className="flex flex-col items-start gap-0.5 px-3 py-2.5 text-left">
                                  <span className="text-ui font-medium">{t(o.label)}</span>
                                  <span className="text-caption text-fg-faint">{t(m.description)}</span>
                                </span>
                              )
                            }}
                          />
                        </Section>
                      </>
                    )}

                    {sheet.tab === 'export' && (
                      <>
                        <ChoiceRadios
                          label={t('Export to')}
                          value={target}
                          onPick={pickTarget}
                          options={[{ value: 'css', label: 'CSS' }, { value: 'figma', label: 'Figma' }, { value: 'agent', label: t('Agent') }]}
                          className="grid grid-cols-3 gap-2"
                          render={(o) => <span className="text-ui font-medium">{o.label}</span>}
                        />
                        {target === 'css' ? (
                          <>
                            <pre className="m-0 overflow-x-auto rounded-xl border border-line bg-surface/60 p-4 font-mono text-caption leading-relaxed text-fg">
                              {cssLines.slice(0, CSS_PREVIEW_LINES).join('\n')}
                              {cssLines.length > CSS_PREVIEW_LINES && <span className="text-fg-faint">{'\n  '}{t('+{count} more lines', { count: cssLines.length - CSS_PREVIEW_LINES })}</span>}
                            </pre>
                            <button
                              type="button"
                              onClick={copyCss}
                              className={cn('flex min-h-12 w-full items-center justify-center rounded-xl bg-fg px-4 text-ui font-semibold text-app transition-[opacity,transform] active:scale-[0.98]', FOCUS)}
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
                      </>
                    )}
                  </div>
                </>
              )}
          </>
        )}
      </ThemeDock>
    </div>
  )
}
